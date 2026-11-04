import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ethers } from 'ethers';
import { getServerSession } from 'next-auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ABI ugovora da možemo dekodirati podatke iz transakcije
const CONTRACT_INTERFACE = new ethers.Interface([
  "function registerCertificate(string memory certHash)"
]);

export async function POST(req: Request) {
  try {
    // 1. Samo admin može pokrenuti oporavak
    const session = await getServerSession();
    if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Neautorizovan pristup.' }, { status: 401 });
    }

    const client = await pool.connect();
    const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.BLOCKCHAIN_RPC_URL;
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // 2. Uzimamo sve certifikate iz baze koji imaju tx_hash
    const result = await client.query('SELECT id, certificate_hash, tx_hash FROM certificates WHERE tx_hash IS NOT NULL');
    const certificates = result.rows;

    let repairedCount = 0;
    let errorsCount = 0;

    for (const cert of certificates) {
      try {
        // 3. Uzimamo transakciju sa Sepolije preko tx_hash-a
        const tx = await provider.getTransaction(cert.tx_hash);
        if (!tx || !tx.data) continue;

        // 4. Dekodiramo originalni hash iz input data transakcije
        const decodedData = CONTRACT_INTERFACE.parseTransaction({ data: tx.data });
        const originalBlockchainHash = decodedData?.args[0];

        if (originalBlockchainHash && originalBlockchainHash !== cert.certificate_hash) {
          // 5. Ako se razlikuju, haker ih je mijenjao! Vraćamo originalni hash u bazu.
          await client.query(
            'UPDATE certificates SET certificate_hash = $1 WHERE id = $2',
            [originalBlockchainHash, cert.id]
          );
          repairedCount++;
          console.log(`Popravljen certifikat ID ${cert.id}: vraćen originalni hash ${originalBlockchainHash}`);
        }
      } catch (err) {
        console.error(`Greška pri obradi certifikata ID ${cert.id}:`, err);
        errorsCount++;
      }
    }

    client.release();

    return NextResponse.json({
      success: true,
      message: `Oporavak završen! Uspješno popravljeno ${repairedCount} izmijenjenih hash-ova.`,
      errors: errorsCount,
    });

  } catch (error: any) {
    console.error('Greška pri oporavku baze:', error);
    return NextResponse.json({ error: 'Greška na serveru: ' + error.message }, { status: 500 });
  }
}