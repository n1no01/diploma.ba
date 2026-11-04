import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const client = await pool.connect();
    // Vraćamo samo naziv i datum registracije/odobrenja za javni registar
    const result = await client.query(
      'SELECT name, website, created_at FROM institutions WHERE is_approved = true ORDER BY name ASC'
    );
    client.release();

    return NextResponse.json({
      success: true,
      institutions: result.rows,
    });
  } catch (error: any) {
    console.error('Greška pri dohvaćanju institucija:', error);
    return NextResponse.json({ error: 'Greška pri učitavanju registra institucija.' }, { status: 500 });
  }
}