import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

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
        password: { label: "Lozinka", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const client = await pool.connect();
          const result = await client.query(
            'SELECT * FROM institutions WHERE email = $1',
            [credentials.email]
          );
          client.release();

          if (result.rows.length === 0) return null;

          const institution = result.rows[0];
          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            institution.password_hash
          );

          if (!isValidPassword) return null;

          return {
            id: institution.id.toString(),
            name: institution.name,
            email: institution.email,
            role: institution.role || 'USER',
            isApproved: institution.is_approved ?? false,
          };
        } catch (error) {
          console.error("Greška pri autentifikaciji:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const client = await pool.connect();
          
          const existing = await client.query(
            'SELECT * FROM institutions WHERE email = $1',
            [user.email]
          );

          if (existing.rows.length === 0) {
            // Nova institucija preko Google-a – automatski role='USER' i is_approved=FALSE
            await client.query(
              'INSERT INTO institutions (name, email, password_hash, is_approved, role, created_at) VALUES ($1, $2, $3, FALSE, $4, NOW())',
              [user.name || user.email, user.email, 'GOOGLE_OAUTH_ACCOUNT', 'USER']
            );
          }
          
          client.release();
          return true;
        } catch (dbError) {
          console.error("Greška pri registraciji Google naloga u bazu:", dbError);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, trigger }) {
      // Kada se korisnik prijavi (bilo preko credentials ili google) ili osvježi sesiju
      if (user || trigger === "update" || token.email) {
        try {
          const client = await pool.connect();
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
          console.error("Greška pri osvežavanju JWT-a:", err);
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