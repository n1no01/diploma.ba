import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ethers } from 'ethers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ABI za verifikaciju u tvom CertificateRegistry ugovoru
const CONTRACT_ABI = [
  "function verifyCertificate(string memory certHash) public view returns (bool)"
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || !query.trim()) {
      return NextResponse.json(
        { success: false, message: 'Nedostaje pojam za pretragu.' },
        { status: 400 }
      );
    }

    const certHash = query.trim();

    // 1. Zero-Trust provera direktno sa Sepolije
    try {
      const rpcUrl = process.env.SEPOLIA_RPC_URL;
      const contractAddress = process.env.CONTRACT_ADDRESS;

      if (rpcUrl && contractAddress) {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);

        const isOnChainValid = await contract.verifyCertificate(certHash);

        if (!isOnChainValid) {
          return NextResponse.json(
            { success: false, message: 'Dokument nije pronađen ili nema validan zapis na blockchain mreži.' },
            { status: 404 }
          );
        }
      }
    } catch (bcError) {
      console.error('Greška pri proveri na blockchainu:', bcError);
      return NextResponse.json(
        { success: false, message: 'Greška pri proveri na blockchain mreži.' },
        { status: 500 }
      );
    }

    // 2. Ako je blockchain potvrdio, uzimamo detalje iz baze
    const client = await pool.connect();
    const result = await client.query(
      `SELECT 
         c.id, c.student_name, c.student_email, c.identifier, 
         i.name AS institution_name, c.certificate_type, c.metadata, 
         c.certificate_hash, c.tx_hash, c.status, c.created_at 
       FROM certificates c
       JOIN institutions i ON c.institution_id = i.id
       WHERE LOWER(c.certificate_hash) = LOWER($1)
       LIMIT 1;`,
      [certHash]
    );
    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Zapis postoji na blockchainu, ali nedostaju detalji u bazi.' },
        { status: 404 }
      );
    }

    const certificate = result.rows[0];

    if (certificate.status === 'revoked') {
      return NextResponse.json({
        success: false,
        isRevoked: true,
        certificate: {
          institution_name: certificate.institution_name || 'Nepoznata institucija',
          student_name: certificate.student_name,
          certificate_type: certificate.certificate_type,
          identifier: certificate.identifier,
          certificate_hash: certificate.certificate_hash,
          created_at: certificate.created_at,
        },
        message: 'UPOZORENJE: Ovaj dokument je službeno poništen.',
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      message: 'Certifikat je uspješno verifikovan i potvrđen na Sepoliji!',
      certificate,
    });

  } catch (error: any) {
    console.error('Greška pri verifikaciji:', error);
    return NextResponse.json({ success: false, message: 'Greška na serveru.' }, { status: 500 });
  }
}