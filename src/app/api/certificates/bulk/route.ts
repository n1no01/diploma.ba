import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { sendCertificateEmail } from '../../../lib/email';
import { getServerSession } from 'next-auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CONTRACT_ABI = [
  "function registerBatch(string[] memory certHashes) public",
  "function registerCertificate(string memory certHash) public"
];

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

    const validMetadata = metadata && typeof metadata === 'object' ? metadata : {};
    const metadataString = JSON.stringify(validMetadata);

    // 1. KANONSKI HASH ZA SVAKOG STUDENTA (Bez Date.now() i Math.random())
    const processedRecipients = recipients
      .filter((r: any) => r.name && r.email)
      .map((r: any) => {
        const studentName = r.name.trim();
        const studentEmail = r.email.trim();
        const identifier = r.identifier ? r.identifier.trim() : '';
        
        const canonicalString = `${institutionId}|${studentName.toLowerCase()}|${studentEmail.toLowerCase()}|${identifier}|${metadataString}`;
        const certificateHash = crypto
          .createHash('sha256')
          .update(canonicalString)
          .digest('hex');

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

    // 2. OBAVEZNA PROVERA BLOKČEJN VARIJABLI (Nema tihog preskakanja)
    const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.BLOCKCHAIN_RPC_URL;
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;

    if (!rpcUrl || !contractAddress || !adminPrivateKey) {
      client.release();
      return NextResponse.json(
        { error: 'Sistemska greška: Nedostaju konfiguracioni parametri za blockchain.' },
        { status: 500 }
      );
    }

    let txHash: string;
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(adminPrivateKey, provider);
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);

      const allHashes = processedRecipients.map((r) => r.certificateHash);

      // Batch transakcija (Sve u jednoj transakciji na blockchainu)
      const tx = await contract.registerBatch(allHashes);
      const receipt = await tx.wait();
      txHash = receipt?.hash || tx.hash;
    } catch (bcErr: any) {
      client.release();
      console.error('Blockchain greška pri batch izdavanju:', bcErr);
      return NextResponse.json({ error: 'Blockchain greška (Smart Contract): ' + bcErr.message }, { status: 500 });
    }

    // 3. Upis u bazu unutar transakcije
    try {
      await client.query('BEGIN');
      const insertedCertificates = [];

      for (const recipient of processedRecipients) {
        const query = `
          INSERT INTO certificates (
            institution_id, 
            certificate_type, 
            student_name, 
            student_email, 
            identifier,
            metadata,
            certificate_hash, 
            tx_hash,
            status,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW())
          RETURNING id, student_name, student_email, identifier, metadata, certificate_hash, tx_hash;
        `;

        const values = [
          institutionId, 
          certificateType, 
          recipient.name, 
          recipient.email, 
          recipient.identifier, 
          recipient.metadata,
          recipient.certificateHash, 
          txHash,
        ];
        
        const res = await client.query(query, values);
        insertedCertificates.push(res.rows[0]);

        // Slanje emaila studentu
        try {
          await sendCertificateEmail({
            studentEmail: recipient.email,
            studentName: recipient.name,
            institutionName: verifiedInstitutionName,
            certificateTitle: certificateType,
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
      client.release();
      throw dbError;
    }

  } catch (error: unknown) {
    if (client) client.release();
    const errorMessage = error instanceof Error ? error.message : 'Greška pri masovnom izdavanju';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}