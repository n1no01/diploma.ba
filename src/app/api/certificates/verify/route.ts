import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ethers } from 'ethers';
import { computeCertHash } from '../../../lib/certHash';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CONTRACT_ABI = [
  "function verifyCertificate(string memory certHash) public view returns (bool isValid, bool isRevoked)"
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

    const certHash = query.trim().toLowerCase();
    const hashRegex = /^[0-9a-f]{64}$/;

    if (!hashRegex.test(certHash)) {
      return NextResponse.json(
        { success: false, message: 'Nevažeći format hash-a.' },
        { status: 400 }
      );
    }

    // 1. Provera na blockchainu
    try {
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
      const contractAddress = process.env.CONTRACT_ADDRESS;

      if (!rpcUrl || !contractAddress) {
        return NextResponse.json(
          { success: false, message: 'Sistemska greška konfiguracije.' },
          { status: 500 }
        );
      }

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);

      const [isValid, isRevoked] = await contract.verifyCertificate(certHash);

      if (!isValid && !isRevoked) {
        return NextResponse.json(
          { success: false, message: 'Dokument nije pronađen na blockchain mreži.' },
          { status: 404 }
        );
      }

      if (isRevoked) {
        return NextResponse.json({
          success: false,
          isRevoked: true,
          message: 'UPOZORENJE: Ovaj certifikat je trajno opozvan na blockchain mreži.',
        }, { status: 200 });
      }

    } catch (bcError) {
      console.error('Blockchain RPC greška:', bcError);
      return NextResponse.json(
        { success: false, message: 'Greška pri komunikaciji sa blockchain mrežom.' },
        { status: 500 }
      );
    }

    // 2. Dohvaćanje iz baze
    const result = await pool.query(
      `SELECT 
         c.id, c.student_name, c.student_email, c.identifier, c.institution_id,
         i.name AS institution_name, c.certificate_type, c.metadata, 
         c.certificate_hash, c.tx_hash, c.status, c.created_at 
       FROM certificates c
       JOIN institutions i ON c.institution_id = i.id
       WHERE LOWER(c.certificate_hash) = LOWER($1)
       LIMIT 1;`,
      [certHash]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Zapis postoji na blockchainu, ali nedostaju detalji u bazi.' },
        { status: 404 }
      );
    }

    const certificate = result.rows[0];

    // 3. ZERO-TRUST REKREACIJA HASHA PREKO CENTRALNE FUNKCIJE
    const recomputedHash = computeCertHash({
      institutionId: certificate.institution_id,
      studentName: certificate.student_name,
      studentEmail: certificate.student_email,
      certificateType: certificate.certificate_type,
      identifier: certificate.identifier,
      metadata: certificate.metadata,
    });

    if (recomputedHash.toLowerCase() !== certHash.toLowerCase()) {
      console.error(`KRITIČNO: Hash neslaganje za ID ${certificate.id}.`);
      return NextResponse.json(
        { success: false, message: 'Integritet podataka narušen: Zapis u bazi ne odgovara kriptografskom dokazu.' },
        { status: 500 }
      );
    }

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

    const safeCertificate = {
      id: certificate.id,
      student_name: certificate.student_name,
      identifier: certificate.identifier,
      institution_name: certificate.institution_name,
      certificate_type: certificate.certificate_type,
      metadata: certificate.metadata,
      certificate_hash: certificate.certificate_hash,
      tx_hash: certificate.tx_hash,
      status: certificate.status,
      created_at: certificate.created_at,
    };

    return NextResponse.json({
      success: true,
      message: 'Certifikat je uspješno verifikovan i integritet je dokazan!',
      certificate: safeCertificate,
    });

  } catch (error: any) {
    console.error('Greška pri verifikaciji:', error);
    return NextResponse.json({ success: false, message: 'Interna greška na serveru.' }, { status: 500 });
  }
}