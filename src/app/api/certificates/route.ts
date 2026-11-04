import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Neautorizovan pristup.' }, { status: 401 });
    }

    const institutionEmail = session.user.email;
    const client = await pool.connect();

    // Dohvatamo certifikate spojene sa ulogovanom institucijom preko ID-ja
   const result = await client.query(
      `SELECT c.*, i.name AS institution_name 
       FROM certificates c
       JOIN institutions i ON c.institution_id = i.id
       WHERE i.email = $1
       ORDER BY c.created_at DESC`,
      [institutionEmail]
    );

    client.release();

    return NextResponse.json({
      success: true,
      certificates: result.rows,
    });

  } catch (error: any) {
    console.error('Greška pri dohvatu certifikata:', error);
    return NextResponse.json(
      { error: 'Greška na serveru pri učitavanju certifikata.' },
      { status: 500 }
    );
  }
}