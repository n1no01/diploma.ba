import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email i verifikacioni kod su obavezni.' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    // Pronalazimo korisnika po emailu i provjeravamo kod
    const result = await client.query(
      'SELECT id, verification_token, email_verified FROM institutions WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      client.release();
      return NextResponse.json(
        { error: 'Ustanova s ovim emailom nije pronađena.' },
        { status: 404 }
      );
    }

    const institution = result.rows[0];

    // Provjera da li je već verifikovan
    if (institution.email_verified) {
      client.release();
      return NextResponse.json(
        { error: 'Email je već verifikovan.' },
        { status: 400 }
      );
    }

    // Provjera da li se kod poklapa
    if (institution.verification_token !== code.trim()) {
      client.release();
      return NextResponse.json(
        { error: 'Neispravan verifikacioni kod. Pokušajte ponovo.' },
        { status: 400 }
      );
    }

    // Ažuriramo bazu: email_verified postaje TRUE, a brišemo token da se ne može ponovo iskoristiti
    await client.query(
      'UPDATE institutions SET email_verified = TRUE, verification_token = NULL WHERE email = $1',
      [email]
    );

    client.release();

    return NextResponse.json({
      success: true,
      message: 'Email uspješno verifikovan! Vaš račun sada čeka odobrenje administratora.',
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Greška pri verifikaciji koda';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}