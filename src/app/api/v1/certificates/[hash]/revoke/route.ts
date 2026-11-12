import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ethers } from 'ethers';
import { apiError, guardApiRequest, HASH_RE } from '@/app/lib/apiGuard';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CONTRACT_ABI = ['function revokeCertificate(string memory certHash) public'];

/**
 * POST /api/v1/certificates/{hash}/revoke
 * Poništava certifikat vaše ustanove (na blockchainu i u bazi). Idempotentno:
 * već poništen certifikat vraća 200 s alreadyRevoked: true.
 */
export async function POST(req: Request, { params }: { params: Promise<{ hash: string }> }) {
  let client;
  let lockKey: string | null = null;

  try {
    const guard = await guardApiRequest(req, 'api-revoke', 30);
    if ('response' in guard) return guard.response;

    const { hash: rawHash } = await params;
    if (!HASH_RE.test(rawHash)) return apiError('Neispravan hash certifikata.', 400);
    const hash = rawHash.toLowerCase();

    client = await pool.connect();
    lockKey = `revoke:${hash}`;
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [lockKey]);

    const found = await client.query(
      `SELECT id, certificate_hash, status FROM certificates
       WHERE LOWER(certificate_hash) = $1 AND institution_id = $2`,
      [hash, guard.institution.id]
    );
    if (found.rows.length === 0) return apiError('Certifikat nije pronađen.', 404);

    const cert = found.rows[0];
    if (cert.status === 'revoked') {
      return NextResponse.json({ success: true, alreadyRevoked: true, certificateHash: cert.certificate_hash, status: 'revoked' });
    }

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
      // Isti hash koji je upisan pri izdavanju (kao u ručnom opozivu)
      const tx = await contract.revokeCertificate(cert.certificate_hash);
      await tx.wait();
    } catch (bcError) {
      console.error('Blockchain greška pri opozivu:', bcError);
      return apiError('Greška pri opozivu na blockchain mreži.', 502);
    }

    await client.query("UPDATE certificates SET status = 'revoked' WHERE id = $1", [cert.id]);

    return NextResponse.json({ success: true, alreadyRevoked: false, certificateHash: cert.certificate_hash, status: 'revoked' });
  } catch (error) {
    console.error('Greška API opoziva:', error);
    return apiError('Interna greška na serveru.', 500);
  } finally {
    if (client) {
      if (lockKey) await client.query('SELECT pg_advisory_unlock(hashtext($1))', [lockKey]).catch(() => {});
      client.release();
    }
  }
}
