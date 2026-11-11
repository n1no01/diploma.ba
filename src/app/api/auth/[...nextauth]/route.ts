import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_SECONDS,
  OTP_TTL_MIN,
  generateOtp,
  hashOtp,
  safeEqual,
  sendOtpEmail,
} from "@/app/lib/otp";

// Proširenje NextAuth tipova da TypeScript prepoznaje role i isApproved
declare module "next-auth" {
  interface User {
    role?: string;
    isApproved?: boolean;
  }
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      isApproved?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    isApproved?: boolean;
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "select_account", // Uvijek prikazuje prozor za izbor Gmail naloga
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: "Admin Prijava",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Lozinka", type: "password" },
        otp: { label: "Kod", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        let client;
        try {
          client = await pool.connect();
          const result = await client.query(
            'SELECT * FROM institutions WHERE email = $1',
            [credentials.email]
          );

          if (result.rows.length === 0) return null;

          const institution = result.rows[0];
          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            institution.password_hash
          );

          if (!isValidPassword) return null;

          // ---- 2FA (kod na email) ----
          if (institution.two_factor_enabled) {
            const otp = (credentials.otp || '').trim();

            if (!otp) {
              // Lozinka je tačna, ali kod još nije unesen -> pošalji kod (ne češće od jednom u 30 s)
              const recentlySent =
                institution.otp_sent_at &&
                Date.now() - new Date(institution.otp_sent_at).getTime() < OTP_RESEND_SECONDS * 1000;

              if (!recentlySent) {
                const code = generateOtp();
                await client.query(
                  `UPDATE institutions
                   SET otp_hash = $1,
                       otp_expires = NOW() + INTERVAL '${OTP_TTL_MIN} minutes',
                       otp_attempts = 0,
                       otp_sent_at = NOW()
                   WHERE id = $2`,
                  [hashOtp(institution.email, code), institution.id]
                );
                await sendOtpEmail(institution.email, code);
              }
              throw new Error('OTP_REQUIRED');
            }

            // Kod je unesen -> provjeri (atomski povećaj broj pokušaja)
            const attempt = await client.query(
              `UPDATE institutions
               SET otp_attempts = otp_attempts + 1
               WHERE id = $1
                 AND otp_hash IS NOT NULL
                 AND otp_expires > NOW()
                 AND otp_attempts < $2
               RETURNING otp_hash`,
              [institution.id, OTP_MAX_ATTEMPTS]
            );

            if (attempt.rowCount === 0) throw new Error('OTP_EXPIRED');

            if (!safeEqual(attempt.rows[0].otp_hash, hashOtp(institution.email, otp))) {
              throw new Error('OTP_INVALID');
            }

            // Uspjeh -> kod je jednokratan
            await client.query(
              `UPDATE institutions SET otp_hash = NULL, otp_expires = NULL, otp_attempts = 0 WHERE id = $1`,
              [institution.id]
            );
          }

          return {
            id: institution.id.toString(),
            name: institution.name,
            email: institution.email,
            role: institution.role || 'USER',
            isApproved: institution.is_approved ?? false,
          };
        } catch (error) {
          // OTP_* greške moraju stići do login stranice
          if (error instanceof Error && error.message.startsWith('OTP_')) throw error;
          console.error("Greška pri autentifikaciji:", error);
          return null;
        } finally {
          client?.release();
        }
      }
    })
  ],
callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        if (!user.email) {
          console.error("Google login greška: Korisnik nema email adresu.");
          return false;
        }

        let client;
        try {
          client = await pool.connect();
          
          const existing = await client.query(
            'SELECT * FROM institutions WHERE email = $1',
            [user.email]
          );

          if (existing.rows.length === 0) {
            // Kreiramo novu ustanovu preko Google-a
            await client.query(
              'INSERT INTO institutions (name, email, password_hash, is_approved, role, created_at) VALUES ($1, $2, $3, FALSE, $4, NOW())',
              [user.name || user.email, user.email, 'GOOGLE_OAUTH_ACCOUNT', 'USER']
            );
            console.log(`Uspješno kreirana nova ustanova za email: ${user.email}`);
          }
          
          client.release();
          return true;
        } catch (dbError: any) {
          if (client) client.release();
          console.error("KRITIČNA DB GREŠKA pri Google registraciji:", dbError.message, dbError.detail);
          return false; // OVO JE TAČKA GDJE SE VRAĆA AccessDenied AKO BAZA PUKNE!
        }
      }
      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user?.email) {
        token.email = user.email;
      }

      if (token.email || trigger === "update") {
        let client;
        try {
          client = await pool.connect();
          const result = await client.query(
            'SELECT role, is_approved, name FROM institutions WHERE email = $1',
            [token.email]
          );
          client.release();

          if (result.rows.length > 0) {
            token.role = result.rows[0].role || 'USER';
            token.isApproved = result.rows[0].is_approved ?? false;
            token.name = result.rows[0].name;
          }
        } catch (err) {
          if (client) client.release();
          console.error("Greška pri osvežavanju JWT-a iz baze:", err);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name;
        session.user.role = token.role as string;
        session.user.isApproved = token.isApproved as boolean;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };