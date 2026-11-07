import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Provjeri putanju do authOptions ako je koristiš i drugdje

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Neautorizovan pristup.' },
        { status: 401 }
      );
    }

    const email = session.user.email;
    const client = await pool.connect();

    // Dodali smo logo_url u SELECT upit
    const result = await client.query(
      'SELECT is_approved, logo_url FROM institutions WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ustanova nije pronađena u bazi.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      is_approved: result.rows[0].is_approved ?? false,
      logo_url: result.rows[0].logo_url || null, // Vraćamo logo_url (ili null ako ga nema)
    });

  } catch (error: any) {
    console.error('Greška pri provjeri statusa ustanove:', error);
    return NextResponse.json(
      { error: 'Greška na serveru: ' + error.message },
      { status: 500 }
    );
  }
}