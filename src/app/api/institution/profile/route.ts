import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { logo_url, institution_id } = body; // Ili uzmi institution_id iz sesije/kolačića

    if (!institution_id) {
      return NextResponse.json({ error: 'Neautorizovan pristup ili nedostaje ID institucije.' }, { status: 401 });
    }

    const client = await pool.connect();
    await client.query(
      `UPDATE institutions SET logo_url = $1 WHERE id = $2`,
      [logo_url || null, institution_id]
    );
    client.release();

    return NextResponse.json({
      success: true,
      message: 'Logotip institucije je uspješno ažuriran.',
    });

  } catch (error: any) {
    console.error('Greška pri ažuriranju profila:', error);
    return NextResponse.json({ error: 'Greška na serveru: ' + error.message }, { status: 500 });
  }
}