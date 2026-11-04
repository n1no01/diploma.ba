import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Podržavamo oba naziva (institutionName ili name) sa frontenda
    const institutionName = body.institutionName || body.name;
    const email = body.email;
    const password = body.password;
    const website = body.website || null; // Opcionalna web stranica

    if (!institutionName || !email || !password) {
      return NextResponse.json(
        { error: 'Sva polja su obavezna.' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    // Provjeravamo da li ustanova s tim emailom već postoji
    const existingUser = await client.query(
      'SELECT id FROM institutions WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      client.release();
      return NextResponse.json(
        { error: 'Ustanova s ovim emailom je već registrirana.' },
        { status: 400 }
      );
    }

    // Hashiramo lozinku
    const hashedPassword = await bcrypt.hash(password, 10);

    // Upisujemo u bazu uključujući i web stranicu, uz is_approved = FALSE
    await client.query(
      'INSERT INTO institutions (name, email, password_hash, website, is_approved) VALUES ($1, $2, $3, $4, FALSE)',
      [institutionName, email, hashedPassword, website]
    );

    client.release();

    return NextResponse.json({
      success: true,
      message: 'Ustanova uspješno registrirana! Račun čeka odobrenje administratora.',
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Greška pri registraciji';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}