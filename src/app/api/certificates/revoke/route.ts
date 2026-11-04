import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Neautorizovan pristup. Prijavite se.' }, { status: 401 });
    }

    const institutionEmail = session.user.email;
    const body = await request.json();
    const { certificateId } = body;

    if (!certificateId) {
      return NextResponse.json({ error: 'ID certifikata je obavezan.' }, { status: 400 });
    }

    const client = await pool.connect();

    // 1. Provjeravamo naziv ulogovane institucije
    const instCheck = await client.query(
      'SELECT name FROM institutions WHERE email = $1 AND is_approved = true',
      [institutionEmail]
    );

    if (instCheck.rows.length === 0) {
      client.release();
      return NextResponse.json({ error: 'Institucija nije pronađena ili nije odobrena.' }, { status: 403 });
    }

    const institutionName = instCheck.rows[0].name;

    // 2. Provjeravamo da li certifikat pripada ovoj instituciji
    const certCheck = await client.query(
      'SELECT id, institution_name, status FROM certificates WHERE id = $1',
      [certificateId]
    );

    if (certCheck.rows.length === 0) {
      client.release();
      return NextResponse.json({ error: 'Certifikat nije pronađen.' }, { status: 404 });
    }

    const cert = certCheck.rows[0];

    // Sigurnosna provjera: samo institucija koja je izdala certifikat može ga poništiti
    if (cert.institution_name !== institutionName) {
      client.release();
      return NextResponse.json({ error: 'Nemate dozvolu da poništite tuđi certifikat.' }, { status: 403 });
    }

    if (cert.status === 'revoked') {
      client.release();
      return NextResponse.json({ error: 'Ovaj certifikat je već ranije poništen.' }, { status: 400 });
    }

    // 3. Ažuriramo status na 'revoked'
    await client.query(
      'UPDATE certificates SET status = $1 WHERE id = $2',
      ['revoked', certificateId]
    );

    client.release();

    return NextResponse.json({
      success: true,
      message: 'Certifikat je uspješno poništen (opozvan).',
    });

  } catch (error: any) {
    console.error('Greška pri opozivu certifikata:', error);
    return NextResponse.json({ error: 'Greška na serveru pri opozivu certifikata.' }, { status: 500 });
  }
}