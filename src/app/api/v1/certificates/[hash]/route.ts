import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { apiError, CERT_COLUMNS, formatCertificate, guardApiRequest, HASH_RE } from '@/app/lib/apiGuard';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/v1/certificates/{hash}
 * Vraća status i podatke jednog certifikata. Radi samo za certifikate vaše ustanove.
 */
export async function GET(req: Request, { params }: { params: Promise<{ hash: string }> }) {
  try {
    const guard = await guardApiRequest(req, 'api-read', 120);
    if ('response' in guard) return guard.response;

    const { hash } = await params;
    if (!HASH_RE.test(hash)) return apiError('Neispravan hash certifikata.', 400);

    const result = await pool.query(
      `SELECT ${CERT_COLUMNS} FROM certificates
       WHERE LOWER(certificate_hash) = LOWER($1) AND institution_id = $2`,
      [hash, guard.institution.id]
    );
    if (result.rows.length === 0) return apiError('Certifikat nije pronađen.', 404);

    const baseUrl = process.env.APP_URL || 'https://diploma.ba';
    return NextResponse.json({ success: true, certificate: formatCertificate(result.rows[0], baseUrl) });
  } catch (error) {
    console.error('Greška API čitanja certifikata:', error);
    return apiError('Interna greška na serveru.', 500);
  }
}
