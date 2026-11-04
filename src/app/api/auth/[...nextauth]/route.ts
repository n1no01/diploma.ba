import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
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
          
          // Provjeravamo da li institucija već postoji u bazi
          const existing = await client.query(
            'SELECT * FROM institutions WHERE email = $1',
            [user.email]
          );

          if (existing.rows.length === 0) {
            // Ako ne postoji, automatski upisujemo novu instituciju u bazu
            await client.query(
              'INSERT INTO institutions (name, email, password_hash, created_at) VALUES ($1, $2, $3, NOW())',
              [user.name || user.email, user.email, 'GOOGLE_OAUTH_ACCOUNT']
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
    async session({ session }) {
      if (session.user?.email) {
        try {
          const client = await pool.connect();
          const result = await client.query(
            'SELECT id, name FROM institutions WHERE email = $1',
            [session.user.email]
          );
          client.release();

          if (result.rows.length > 0) {
            session.user.name = result.rows[0].name;
          }
        } catch (err) {
          console.error("Greška pri dohvaćanju naziva institucije za sesiju:", err);
        }
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