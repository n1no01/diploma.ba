import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const client = await pool.connect();

    // Broj izdatih certifikata
    const certResult = await client.query('SELECT COUNT(*) FROM certificates');
    const totalCertificates = parseInt(certResult.rows[0].count, 10);

    // Broj jedinstvenih ustanova (ili ukupan broj iz tablice institutions)
    const instResult = await client.query('SELECT COUNT(*) FROM institutions');
    const totalInstitutions = parseInt(instResult.rows[0].count, 10);

    client.release();

    return NextResponse.json({
      success: true,
      totalCertificates,
      totalInstitutions,
    });
  } catch (error) {
    console.error('Greška pri dohvaćanju statistike:', error);
    return NextResponse.json(
      { success: false, totalCertificates: 0, totalInstitutions: 0 },
      { status: 500 }
    );
  }
}