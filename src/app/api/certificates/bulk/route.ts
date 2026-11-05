import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ethers } from 'ethers';
import { sendCertificateEmail } from '../../../lib/email';
import { getServerSession } from 'next-auth';
import { computeCertHash } from '../../../lib/certHash';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CONTRACT_ABI = [
  "function registerBatch(string[] memory certHashes) public"
];

const MAX_BATCH_SIZE = 100; // Ograničenje zbog gas limita na mreži

export async function POST(request: Request) {
  let client;
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Neautorizovan pristup. Prijavite se.' }, { status: 401 });
    }

    const institutionEmail = session.user.email;
    client = await pool.connect();

    const instCheck = await client.query(
      'SELECT id, is_approved, name FROM institutions WHERE email = $1',
      [institutionEmail]
    );

    if (instCheck.rows.length === 0 || !instCheck.rows[0].is_approved) {
      client.release();
      return NextResponse.json(
        { error: 'Vaš nalog još uvijek nije odobren od strane administratora.' },
        { status: 403 }
      );
    }

    const institutionId = instCheck.rows[0].id;
    const verifiedInstitutionName = instCheck.rows[0].name;

    const body = await request.json();
    const { certificateType, recipients, metadata } = body;

    if (!certificateType || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      client.release();
      return NextResponse.json(
        { error: 'Nedostaju obavezni podaci ili je lista primatelja prazna.' },
        { status: 400 }
      );
    }

    if (recipients.length > MAX_BATCH_SIZE) {
      client.release();
      return NextResponse.json(
        { error: `Maksimalan broj certifikata po jednom batch-u je ${MAX_BATCH_SIZE}.` },
        { status: 400 }
      );
    }

    const finalCertType = certificateType || 'Diploma o završenom studiju';
    const validMetadata = metadata && typeof metadata === 'object' ? metadata : {};
    const metadataString = JSON.stringify(validMetadata);

    const processedRecipients = recipients
      .filter((r: any) => r.name && r.email)
      .map((r: any) => {
        const studentName = r.name.trim();
        const studentEmail = r.email.trim();
        const identifier = r.identifier ? r.identifier.trim() : '';

        const certificateHash = computeCertHash({
          institutionId,
          studentName,
          studentEmail,
          certificateType: finalCertType,
          identifier,
          metadata: validMetadata,
        });

        return {
          name: studentName,
          email: studentEmail,
          identifier: identifier || null,
          metadata: metadataString,
          certificateHash: certificateHash,
        };
      });

    if (processedRecipients.length === 0) {
      client.release();
      return NextResponse.json({ error: 'Nema validnih primatelja sa imenom i emailom.' }, { status: 400 });
    }

    // 1. PROVJERA DUPLIKATA U BAZI (Prije upisa na blockchain)
    const hashesToCheck = processedRecipients.map(r => r.certificateHash);
    const existingCheck = await client.query(
      'SELECT certificate_hash FROM certificates WHERE certificate_hash = ANY($1)',
      [hashesToCheck]
    );

    if (existingCheck.rows.length > 0) {
      client.release();
      return NextResponse.json(
        { error: `Greška: Jedan ili više certifikata iz ove liste već postoji u bazi podataka.` },
        { status: 409 }
      );
    }

    // 2. PROVERA BLOKČEJN VARIJABLI
    const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.BLOCKCHAIN_RPC_URL;
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;

    if (!rpcUrl || !contractAddress || !adminPrivateKey) {
      client.release();
      return NextResponse.json(
        { error: 'Sistemska greška: Nedostaju blockchain parametri.' },
        { status: 500 }
      );
    }

    let txHash: string;
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(adminPrivateKey, provider);
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);

      const allHashes = processedRecipients.map((r) => r.certificateHash);
      const tx = await contract.registerBatch(allHashes);
      const receipt = await tx.wait();
      txHash = receipt?.hash || tx.hash;
    } catch (bcErr: any) {
      client.release();
      console.error('Blockchain greška pri batch izdavanju:', bcErr);
      return NextResponse.json({ error: 'Blockchain greška pri izdavanju.' }, { status: 500 });
    }

    // 3. UPIS U BAZU (Ispravljen catch - nema duplog release()!)
    try {
      await client.query('BEGIN');
      const insertedCertificates = [];

      for (const recipient of processedRecipients) {
        const query = `
          INSERT INTO certificates (
            institution_id, certificate_type, student_name, student_email, 
            identifier, metadata, certificate_hash, tx_hash, status, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW())
          RETURNING id, student_name, student_email, identifier, metadata, certificate_hash, tx_hash;
        `;

        const values = [
          institutionId, finalCertType, recipient.name, recipient.email, 
          recipient.identifier, recipient.metadata, recipient.certificateHash, txHash,
        ];
        
        const res = await client.query(query, values);
        insertedCertificates.push(res.rows[0]);

        try {
          await sendCertificateEmail({
            studentEmail: recipient.email,
            studentName: recipient.name,
            institutionName: verifiedInstitutionName,
            certificateTitle: finalCertType,
            verifyToken: recipient.certificateHash,
          });
        } catch (mailErr) {
          console.error(`Greška pri slanju maila za ${recipient.email}:`, mailErr);
        }
      }

      await client.query('COMMIT');
      client.release();

      return NextResponse.json({
        success: true,
        message: `Uspješno batch izdano ${insertedCertificates.length} certifikata kroz 1 transakciju!`,
        certificates: insertedCertificates,
        txHash,
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      // UKLONJEN client.release() OVDJE — vanjski catch će odraditi release jednom!
      throw dbError;
    }

  } catch (error: unknown) {
    if (client) client.release();
    console.error('Greška pri masovnom izdavanju:', error);
    return NextResponse.json({ error: 'Interna greška na serveru.' }, { status: 500 });
  }
}