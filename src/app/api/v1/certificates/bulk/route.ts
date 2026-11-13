import { NextResponse, after } from 'next/server';
import { Pool } from 'pg';
import { ethers } from 'ethers';
import { apiError, containsInvalidText, guardApiRequest, INVALID_TEXT_MESSAGE } from '@/app/lib/apiGuard';
import { computeCertHash } from '@/app/lib/certHash';
import { sendCertificateEmail } from '@/app/lib/email';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CONTRACT_ABI = ['function registerBatch(string[] memory certHashes) public'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BATCH_SIZE = 100; // ograničenje zbog gas limita na mreži
const EMAIL_DELAY_MS = 600; // email servis dozvoljava ograničen broj poziva u sekundi

interface Prepared {
  index: number;
  studentName: string;
  studentEmail: string;
  identifier: string;
  metadata: Record<string, unknown>;
  expiresAt: Date | null;
  hash: string;
}

/**
 * POST /api/v1/certificates/bulk
 * Authorization: Bearer dpl_...
 * Body: {
 *   certificateType?, expiresAt?, sendEmail?,
 *   recipients: [{ studentName, studentEmail, identifier?, metadata?, expiresAt? }, ...]   // najviše 100
 * }
 * Idempotentno: već izdati certifikati se preskaču i vraćaju kao alreadyIssued: true,
 * a samo novi se upisuju na blockchain (jednom transakcijom).
 */
export async function POST(req: Request) {
  let client;
  let locked = false;

  try {
    const guard = await guardApiRequest(req, 'api-bulk', 10);
    if ('response' in guard) return guard.response;
    const institution = guard.institution;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError('Tijelo zahtjeva mora biti ispravan JSON.', 400);
    }
    if (containsInvalidText(body)) return apiError(INVALID_TEXT_MESSAGE, 400);

    if (!Array.isArray(body.recipients) || body.recipients.length === 0) {
      return apiError('recipients mora biti neprazna lista.', 400);
    }
    if (body.recipients.length > MAX_BATCH_SIZE) {
      return apiError(`Najviše ${MAX_BATCH_SIZE} primalaca po jednom zahtjevu.`, 400);
    }

    const certificateType =
      typeof body.certificateType === 'string' && body.certificateType.trim()
        ? body.certificateType.trim()
        : 'Diploma o završenom studiju';
    if (certificateType.length > 200) return apiError('certificateType je predugačak (najviše 200 znakova).', 400);
    const sendEmail = body.sendEmail !== false;

    const parseDate = (value: unknown): Date | null | 'invalid' => {
      if (value === undefined || value === null || value === '') return null;
      const d = new Date(String(value));
      return isNaN(d.getTime()) ? 'invalid' : d;
    };

    const defaultExpires = parseDate(body.expiresAt);
    if (defaultExpires === 'invalid') return apiError('expiresAt nije ispravan datum (npr. 2030-12-31).', 400);

    // Provjera svih primalaca prije bilo kakvog upisa: jedna greška odbija cijeli zahtjev
    const prepared: Prepared[] = [];
    for (let i = 0; i < body.recipients.length; i++) {
      const r = body.recipients[i] as Record<string, unknown>;
      const at = `recipients[${i}]`;
      if (!r || typeof r !== 'object' || Array.isArray(r)) return apiError(`${at} mora biti objekat.`, 400);

      const studentName = typeof r.studentName === 'string' ? r.studentName.trim() : '';
      const studentEmail = typeof r.studentEmail === 'string' ? r.studentEmail.trim() : '';
      const identifier = typeof r.identifier === 'string' ? r.identifier.trim() : '';

      if (!studentName || studentName.length > 200) return apiError(`${at}.studentName je obavezan (najviše 200 znakova).`, 400);
      if (!EMAIL_RE.test(studentEmail) || studentEmail.length > 200) {
        return apiError(`${at}.studentEmail je obavezan i mora biti ispravna email adresa.`, 400);
      }
      if (identifier.length > 100) return apiError(`${at}.identifier je predugačak (najviše 100 znakova).`, 400);

      let metadata: Record<string, unknown> = {};
      if (r.metadata !== undefined && r.metadata !== null) {
        if (typeof r.metadata !== 'object' || Array.isArray(r.metadata)) return apiError(`${at}.metadata mora biti JSON objekat.`, 400);
        metadata = r.metadata as Record<string, unknown>;
        if (JSON.stringify(metadata).length > 4000) return apiError(`${at}.metadata je prevelik (najviše 4000 znakova).`, 400);
      }

      const own = parseDate(r.expiresAt);
      if (own === 'invalid') return apiError(`${at}.expiresAt nije ispravan datum.`, 400);

      prepared.push({
        index: i,
        studentName,
        studentEmail,
        identifier,
        metadata,
        expiresAt: own ?? defaultExpires,
        hash: computeCertHash({
          institutionId: institution.id,
          studentName,
          studentEmail,
          certificateType,
          identifier,
          metadata,
        }),
      });
    }

    const baseUrl = process.env.APP_URL || 'https://diploma.ba';
    const verifyUrl = (hash: string) => `${baseUrl}/verifikuj?hash=${hash}`;

    client = await pool.connect();

    // Isti hash istovremeno u drugom zahtjevu (pojedinačnom ili masovnom) se serijalizuje.
    // Ključevi se zaključavaju sortirano da se dva masovna zahtjeva ne zaglave međusobno.
    const uniqueHashes = Array.from(new Set(prepared.map((p) => p.hash))).sort();
    locked = true;
    for (const h of uniqueHashes) {
      await client.query('SELECT pg_advisory_lock(hashtext($1))', [h]);
    }

    const existing = await client.query(
      'SELECT id, certificate_hash, tx_hash, status FROM certificates WHERE certificate_hash = ANY($1)',
      [uniqueHashes]
    );
    const existingByHash = new Map<string, { id: number; tx_hash: string; status: string }>();
    for (const row of existing.rows) existingByHash.set(row.certificate_hash, row);

    // Novi: nema ih u bazi; ako se isti certifikat ponavlja u listi, izdaje se samo prvi
    const toIssue: Prepared[] = [];
    const seen = new Set<string>();
    for (const p of prepared) {
      if (existingByHash.has(p.hash) || seen.has(p.hash)) continue;
      seen.add(p.hash);
      toIssue.push(p);
    }

    let txHash: string | null = null;
    const insertedByHash = new Map<string, number>();

    if (toIssue.length > 0) {
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
      const contractAddress = process.env.CONTRACT_ADDRESS;
      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
      if (!rpcUrl || !contractAddress || !adminPrivateKey) {
        console.error('Nedostaju blockchain varijable okruženja.');
        return apiError('Sistemska greška. Pokušajte ponovo kasnije.', 500);
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(adminPrivateKey, provider);
        const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);
        const tx = await contract.registerBatch(toIssue.map((p) => p.hash));
        const receipt = await tx.wait();
        txHash = receipt?.hash || tx.hash;
      } catch (bcError) {
        console.error('Blockchain greška pri masovnom izdavanju:', bcError);
        return apiError('Greška pri upisu na blockchain. Ništa nije izdato; možete ponoviti isti zahtjev.', 502);
      }

      try {
        await client.query('BEGIN');
        for (const p of toIssue) {
          const inserted = await client.query(
            `INSERT INTO certificates (
               student_name, student_email, identifier, certificate_type,
               institution_id, metadata, certificate_hash, tx_hash, expires_at, status, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW())
             RETURNING id`,
            [
              p.studentName,
              p.studentEmail,
              p.identifier || null,
              certificateType,
              institution.id,
              JSON.stringify(p.metadata),
              p.hash,
              txHash,
              p.expiresAt,
            ]
          );
          insertedByHash.set(p.hash, inserted.rows[0].id);
        }
        await client.query('COMMIT');
      } catch (dbError) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Greška pri upisu u bazu nakon blockchain upisa:', dbError);
        return apiError('Greška pri spremanju u bazu. Ponovite isti zahtjev.', 500);
      }
    }

    const results = prepared.map((p) => {
      const old = existingByHash.get(p.hash);
      const newId = insertedByHash.get(p.hash);
      const issuedNow = newId !== undefined && toIssue.some((t) => t.index === p.index);
      return {
        index: p.index,
        alreadyIssued: !issuedNow,
        certificateId: old ? old.id : newId,
        certificateHash: p.hash,
        txHash: old ? old.tx_hash : txHash,
        status: old ? old.status : 'active',
        verifyUrl: verifyUrl(p.hash),
      };
    });

    // Emailovi se šalju nakon odgovora, jedan po jedan, samo za novoizdate certifikate
    if (sendEmail && toIssue.length > 0) {
      const institutionName = institution.name;
      const queue = toIssue.map((p) => ({
        studentEmail: p.studentEmail,
        studentName: p.studentName,
        certificateTitle: certificateType,
        verifyToken: p.hash,
        certificateId: insertedByHash.get(p.hash)!,
      }));
      after(async () => {
        for (const mail of queue) {
          try {
            await sendCertificateEmail({ ...mail, institutionName });
          } catch (emailErr) {
            console.error(`Greška pri slanju emaila za ${mail.studentEmail}:`, emailErr);
          }
          await new Promise((r) => setTimeout(r, EMAIL_DELAY_MS));
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        issuedCount: toIssue.length,
        alreadyIssuedCount: prepared.length - toIssue.length,
        txHash,
        results,
      },
      { status: toIssue.length > 0 ? 201 : 200 }
    );
  } catch (error) {
    console.error('Greška API masovnog izdavanja:', error);
    return apiError('Interna greška na serveru.', 500);
  } finally {
    if (client) {
      if (locked) await client.query('SELECT pg_advisory_unlock_all()').catch(() => {});
      client.release();
    }
  }
}
