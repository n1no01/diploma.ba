import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const client = await pool.connect();
    
    // Vraćamo odobrene institucije, ali isključujemo naloge sa ulogom 'ADMIN'
    const result = await client.query(
      `SELECT name, website, created_at 
       FROM institutions 
       WHERE is_approved = true AND role != 'ADMIN' 
       ORDER BY name ASC`
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