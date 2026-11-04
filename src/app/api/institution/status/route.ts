import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Neautorizovan pristup.' },
        { status: 401 }
      );
    }

    const email = session.user.email;
    const client = await pool.connect();

    const result = await client.query(
      'SELECT is_approved FROM institutions WHERE email = $1',
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
    });

  } catch (error: any) {
    console.error('Greška pri provjeri statusa ustanove:', error);
    return NextResponse.json(
      { error: 'Greška na serveru: ' + error.message },
      { status: 500 }
    );
  }
}