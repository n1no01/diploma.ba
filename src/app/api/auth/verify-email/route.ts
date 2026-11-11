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
      'SELECT id, verification_token, email_verified, verification_locked_until FROM institutions WHERE email = $1',
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

    // Zaključano nakon previše pogrešnih pokušaja
    if (institution.verification_locked_until && new Date(institution.verification_locked_until) > new Date()) {
      client.release();
      return NextResponse.json(
        { error: 'Previše pogrešnih pokušaja. Pokušajte ponovo za 15 minuta.' },
        { status: 429 }
      );
    }

    // Provjera da li se kod poklapa
    if (institution.verification_token !== String(code).trim()) {
      // Brojimo pogrešne pokušaje; nakon 5 zaključavamo na 15 minuta
      await client.query(
        `UPDATE institutions
         SET verification_locked_until = CASE WHEN verification_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE verification_locked_until END,
             verification_attempts = CASE WHEN verification_attempts + 1 >= 5 THEN 0 ELSE verification_attempts + 1 END
         WHERE id = $1`,
        [institution.id]
      );
      client.release();
      return NextResponse.json(
        { error: 'Neispravan verifikacioni kod. Pokušajte ponovo.' },
        { status: 400 }
      );
    }

    // Ažuriramo bazu: email_verified postaje TRUE, a brišemo token da se ne može ponovo iskoristiti
    await client.query(
      'UPDATE institutions SET email_verified = TRUE, verification_token = NULL, verification_attempts = 0, verification_locked_until = NULL WHERE email = $1',
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