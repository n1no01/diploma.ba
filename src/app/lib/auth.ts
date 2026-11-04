import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Ovdje pohranjujemo rezultat poziva u varijablu, pa ga onda izvozimo
const authConfig = NextAuth({
  providers: [
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
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

// Eksplicitno izvozimo SVE potrebne objekte, uključujući handlers
export const { handlers, auth, signIn, signOut } = authConfig;