import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Pool } from 'pg';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function PUT(request: Request) {
  try {
    // 1. Provjera autentičnosti sesije
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Neautorizovan pristup. Molimo prijavite se.' },
        { status: 401 }
      );
    }

    const { name } = await request.json();

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Naziv institucije mora imati najmanje 2 znaka.' },
        { status: 400 }
      );
    }

    // 2. Ažuriranje naziva u bazi za prijavljeni email
    const client = await pool.connect();
    const query = `
      UPDATE institutions 
      SET name = $1 
      WHERE email = $2
      RETURNING id, name, email;
    `;

    const result = await client.query(query, [name.trim(), session.user.email]);
    client.release();

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Institucija nije pronađena u bazi.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Naziv institucije uspješno ažuriran!',
      institution: result.rows[0],
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Greška na serveru';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}