import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const client = await pool.connect();

    // Jedan optimizovani upit koji dohvata oba broja u jednoj konekciji
    const statsResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM certificates) AS total_certificates,
        (SELECT COUNT(*) FROM institutions WHERE role != 'ADMIN' AND is_approved = true) AS total_institutions
    `);

    client.release();

    const totalCertificates = parseInt(statsResult.rows[0].total_certificates, 10);
    const totalInstitutions = parseInt(statsResult.rows[0].total_institutions, 10);

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