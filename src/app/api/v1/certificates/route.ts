import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ethers } from 'ethers';
import { authenticateApiKey } from '@/app/lib/apiKey';
import { computeCertHash } from '@/app/lib/certHash';
import { sendCertificateEmail } from '@/app/lib/email';
import { apiError, CERT_COLUMNS, containsInvalidText, formatCertificate, guardApiRequest, INVALID_TEXT_MESSAGE } from '@/app/lib/apiGuard';
import { consumeRateLimit, getClientIp, hitRateLimit, isRateLimited } from '@/app/lib/rateLimit';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CONTRACT_ABI = ['function registerCertificate(string memory certHash) public'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function err(message: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers });
}

/**
 * POST /api/v1/certificates
 * Authorization: Bearer dpl_...
 * Body: { studentName, studentEmail, certificateType?, identifier?, metadata?, expiresAt?, sendEmail? }
 * Idempotentno: isti podaci vraćaju postojeći certifikat (200) umjesto novog.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  let client;
  let lockKey: string | null = null;

  try {
    if (await isRateLimited(`api-fail-ip:${ip}`, 30, 900)) {
      return err('Previše neuspjelih pokušaja. Pokušajte ponovo kasnije.', 429, { 'Retry-After': '900' });
    }

    const institution = await authenticateApiKey(req.headers);
    if (!institution) {
      await hitRateLimit(`api-fail-ip:${ip}`, 900);
      return err('Nevažeći ili nedostajući API ključ.', 401);
    }
    if (!institution.isApproved) {
      return err('Nalog ustanove još nije odobren od strane administratora.', 403);
    }
    if (!(await consumeRateLimit(`api-issue:${institution.id}`, 60, 60))) {
      return err('Previše zahtjeva. Dozvoljeno je 60 zahtjeva u minuti.', 429, { 'Retry-After': '60' });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return err('Tijelo zahtjeva mora biti ispravan JSON.', 400);
    }
    if (containsInvalidText(body)) return err(INVALID_TEXT_MESSAGE, 400);

    const studentName = typeof body.studentName === 'string' ? body.studentName.trim() : '';
    const studentEmail = typeof body.studentEmail === 'string' ? body.studentEmail.trim() : '';
    const certificateType =
      typeof body.certificateType === 'string' && body.certificateType.trim()
        ? body.certificateType.trim()
        : 'Diploma o završenom studiju';
    const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
    const sendEmail = body.sendEmail !== false;

    if (!studentName || studentName.length > 200) {
      return err('studentName je obavezan (najviše 200 znakova).', 400);
    }
    if (!EMAIL_RE.test(studentEmail) || studentEmail.length > 200) {
      return err('studentEmail je obavezan i mora biti ispravna email adresa.', 400);
    }
    if (certificateType.length > 200) return err('certificateType je predugačak (najviše 200 znakova).', 400);
    if (identifier.length > 100) return err('identifier je predugačak (najviše 100 znakova).', 400);

    let metadata: Record<string, unknown> = {};
    if (body.metadata !== undefined && body.metadata !== null) {
      if (typeof body.metadata !== 'object' || Array.isArray(body.metadata)) {
        return err('metadata mora biti JSON objekat.', 400);
      }
      metadata = body.metadata as Record<string, unknown>;
      if (JSON.stringify(metadata).length > 4000) return err('metadata je prevelik (najviše 4000 znakova).', 400);
    }

    let expiresAt: Date | null = null;
    if (body.expiresAt !== undefined && body.expiresAt !== null && body.expiresAt !== '') {
      expiresAt = new Date(String(body.expiresAt));
      if (isNaN(expiresAt.getTime())) return err('expiresAt nije ispravan datum (npr. 2030-12-31).', 400);
    }

    const certificateHash = computeCertHash({
      institutionId: institution.id,
      studentName,
      studentEmail,
      certificateType,
      identifier,
      metadata,
    });
    const baseUrl = process.env.APP_URL || 'https://diploma.ba';
    const verifyUrl = `${baseUrl}/verifikuj?hash=${certificateHash}`;

    client = await pool.connect();

    // Isti zahtjev poslan istovremeno dvaput: serijalizujemo ga po hashu
    lockKey = certificateHash;
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [lockKey]);

    // Idempotentnost: certifikat već postoji -> vrati ga, bez novog upisa na blockchain i bez maila
    const existing = await client.query(
      'SELECT id, tx_hash, status FROM certificates WHERE certificate_hash = $1',
      [certificateHash]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({
        success: true,
        alreadyIssued: true,
        certificateId: existing.rows[0].id,
        certificateHash,
        txHash: existing.rows[0].tx_hash,
        status: existing.rows[0].status,
        verifyUrl,
      });
    }

    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!rpcUrl || !contractAddress || !adminPrivateKey) {
      console.error('Nedostaju blockchain varijable okruženja.');
      return err('Sistemska greška. Pokušajte ponovo kasnije.', 500);
    }

    let txHash: string;
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(adminPrivateKey, provider);
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);
      const tx = await contract.registerCertificate(certificateHash);
      const receipt = await tx.wait();
      txHash = receipt?.hash || tx.hash;
    } catch (bcError) {
      console.error('Blockchain greška:', bcError);
      return err('Greška pri upisu na blockchain.', 502);
    }

    const inserted = await client.query(
      `INSERT INTO certificates (
         student_name, student_email, identifier, certificate_type,
         institution_id, metadata, certificate_hash, tx_hash, expires_at, status, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW())
       RETURNING id`,
      [
        studentName,
        studentEmail,
        identifier || null,
        certificateType,
        institution.id,
        JSON.stringify(metadata),
        certificateHash,
        txHash,
        expiresAt,
      ]
    );
    const certificateId = inserted.rows[0].id;

    if (sendEmail) {
      try {
        await sendCertificateEmail({
          studentEmail,
          studentName,
          institutionName: institution.name,
          certificateTitle: certificateType,
          verifyToken: certificateHash,
          certificateId,
        });
      } catch (emailErr) {
        console.error('Greška pri slanju emaila:', emailErr);
      }
    }

    return NextResponse.json(
      { success: true, alreadyIssued: false, certificateId, certificateHash, txHash, status: 'active', verifyUrl },
      { status: 201 }
    );
  } catch (error) {
    console.error('Greška API izdavanja:', error);
    return err('Interna greška na serveru.', 500);
  } finally {
    if (client) {
      if (lockKey) {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [lockKey]).catch(() => {});
      }
      client.release();
    }
  }
}


/**
 * GET /api/v1/certificates?limit=50&cursor=123&status=active&email=...&identifier=...
 * Lista certifikata vaše ustanove, najnoviji prvi. Za sljedeću stranicu proslijedite nextCursor.
 */
export async function GET(req: Request) {
  try {
    const guard = await guardApiRequest(req, 'api-read', 120);
    if ('response' in guard) return guard.response;

    const url = new URL(req.url);
    const limitRaw = parseInt(url.searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

    const conditions = ['institution_id = $1'];
    const values: unknown[] = [guard.institution.id];

    const cursor = url.searchParams.get('cursor');
    if (cursor) {
      if (!/^\d{1,15}$/.test(cursor)) return apiError('cursor nije ispravan.', 400);
      values.push(parseInt(cursor, 10));
      conditions.push(`id < $${values.length}`);
    }

    const status = url.searchParams.get('status');
    if (status) {
      if (status === 'revoked') {
        conditions.push("status = 'revoked'");
      } else if (status === 'active') {
        conditions.push("status <> 'revoked' AND (expires_at IS NULL OR expires_at >= NOW())");
      } else if (status === 'expired') {
        conditions.push("status <> 'revoked' AND expires_at IS NOT NULL AND expires_at < NOW()");
      } else {
        return apiError('status mora biti active, revoked ili expired.', 400);
      }
    }

    const email = url.searchParams.get('email');
    if (email) {
      values.push(email.trim().toLowerCase().slice(0, 200));
      conditions.push(`LOWER(student_email) = $${values.length}`);
    }

    const identifier = url.searchParams.get('identifier');
    if (identifier) {
      values.push(identifier.trim().slice(0, 100));
      conditions.push(`identifier = $${values.length}`);
    }

    values.push(limit + 1);
    const result = await pool.query(
      `SELECT ${CERT_COLUMNS} FROM certificates
       WHERE ${conditions.join(' AND ')}
       ORDER BY id DESC
       LIMIT $${values.length}`,
      values
    );

    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
    const baseUrl = process.env.APP_URL || 'https://diploma.ba';

    return NextResponse.json({
      success: true,
      certificates: rows.map((r) => formatCertificate(r, baseUrl)),
      nextCursor: hasMore ? String(rows[rows.length - 1].id) : null,
    });
  } catch (error) {
    console.error('Greška API liste certifikata:', error);
    return apiError('Interna greška na serveru.', 500);
  }
}
