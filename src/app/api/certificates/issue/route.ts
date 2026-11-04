import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { sendCertificateEmail } from '../../../lib/email';
import { getServerSession } from 'next-auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ABI tačno za naš deployani CertificateRegistry ugovor
const CONTRACT_ABI = [
  "function registerCertificate(string memory certHash) public"
];

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Neautorizovan pristup. Prijavite se.' }, { status: 401 });
    }

    const institutionEmail = session.user.email;
    const client = await pool.connect();

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
    const institutionName = instCheck.rows[0].name;

    const body = await req.json();
    const { studentName, studentEmail, certificateType, identifier, metadata } = body;

    if (!studentEmail || !studentName) {
      client.release();
      return NextResponse.json(
        { error: 'Email studenta i ime su obavezni.' },
        { status: 400 }
      );
    }

    const validMetadata = metadata && typeof metadata === 'object' ? metadata : {};
    const metadataString = JSON.stringify(validMetadata);

    const certificateHash = crypto
      .createHash('sha256')
      .update(`${institutionId}-${studentName}-${studentEmail}-${identifier || 'no-id'}-${metadataString}-${Date.now()}`)
      .digest('hex');

    // Upis na Sepoliju preko CertificateRegistry ugovora
    let txHash: string | null = null;
    try {
      const rpcUrl = process.env.SEPOLIA_RPC_URL;
      const contractAddress = process.env.CONTRACT_ADDRESS;

      if (rpcUrl && process.env.ADMIN_PRIVATE_KEY && contractAddress) {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

        const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);

        // Pozivamo tačno funkciju iz tvog deployanog ugovora
        const tx = await contract.registerCertificate(certificateHash);
        const receipt = await tx.wait();
        
        txHash = receipt?.hash || tx.hash;
      }
    } catch (bcError) {
      client.release();
      console.error('Blockchain greška:', bcError);
      return NextResponse.json(
        { error: 'Greška pri upisu na blockchain: ' + (bcError as any).message },
        { status: 500 }
      );
    }

    const queryText = `
      INSERT INTO certificates (
        student_name, student_email, identifier, certificate_type, 
        institution_id, metadata, certificate_hash, tx_hash, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW())
      RETURNING id;
    `;
    
    const values = [
      studentName, studentEmail, identifier ? identifier.trim() : null,
      certificateType || 'Diploma o završenom studiju', institutionId, 
      metadataString, certificateHash, txHash
    ];

    const result = await client.query(queryText, values);
    client.release();

    try {
      await sendCertificateEmail({
        studentEmail, studentName, institutionName,
        certificateTitle: certificateType || 'Diploma / Certifikat',
        verifyToken: certificateHash,
      });
    } catch (emailErr) {
      console.error('Greška pri slanju emaila:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Certifikat uspješno izdan i zaveden na Sepoliju!',
      certificateId: result.rows[0].id,
      txHash,
    });

  } catch (error: any) {
    console.error('Greška:', error);
    return NextResponse.json({ error: 'Greška: ' + error.message }, { status: 500 });
  }
}