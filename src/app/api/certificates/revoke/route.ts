import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ethers } from 'ethers';
import { getServerSession } from 'next-auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CONTRACT_ABI = [
  "function revokeCertificate(string memory certHash) public"
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
      'SELECT id, is_approved FROM institutions WHERE email = $1',
      [institutionEmail]
    );

    if (instCheck.rows.length === 0 || !instCheck.rows[0].is_approved) {
      client.release();
      return NextResponse.json(
        { error: 'Vaš nalog nije odobren.' },
        { status: 403 }
      );
    }

    const institutionId = instCheck.rows[0].id;
    const body = await request.json();
    const { certificateHash } = body;

    if (!certificateHash) {
      client.release();
      return NextResponse.json({ error: 'Nedostaje hash certifikata.' }, { status: 400 });
    }

    // Provjeravamo da li certifikat pripada ovoj instituciji
    const certCheck = await client.query(
      'SELECT id, status FROM certificates WHERE certificate_hash = $1 AND institution_id = $2',
      [certificateHash.trim().toLowerCase(), institutionId]
    );

    if (certCheck.rows.length === 0) {
      client.release();
      return NextResponse.json(
        { error: 'Certifikat nije pronađen ili nemate dozvolu za njegov opoziv.' },
        { status: 404 }
      );
    }

    if (certCheck.rows[0].status === 'revoked') {
      client.release();
      return NextResponse.json(
        { error: 'Certifikat je već opozvan.' },
        { status: 400 }
      );
    }

    // 1. OPOZIV NA BLOCKCHAINU
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;

    if (!rpcUrl || !contractAddress || !adminPrivateKey) {
      client.release();
      return NextResponse.json(
        { error: 'Sistemska greška: Nedostaju blockchain parametri.' },
        { status: 500 }
      );
    }

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(adminPrivateKey, provider);
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);

      const tx = await contract.revokeCertificate(certificateHash.trim().toLowerCase());
      await tx.wait();
    } catch (bcErr: any) {
      client.release();
      console.error('Blockchain greška pri opozivu:', bcErr);
      return NextResponse.json({ error: 'Greška pri opozivu na blockchain mreži.' }, { status: 500 });
    }

    // 2. OPOZIV U BAZI
    await client.query(
      "UPDATE certificates SET status = 'revoked' WHERE certificate_hash = $1",
      [certificateHash.trim().toLowerCase()]
    );
    client.release();

    return NextResponse.json({
      success: true,
      message: 'Certifikat je uspješno opozvan i na blockchain mreži i u bazi podataka.',
    });

  } catch (error: any) {
    if (client) client.release();
    console.error('Greška pri opozivu:', error);
    return NextResponse.json({ error: 'Interna greška na serveru.' }, { status: 500 });
  }
}