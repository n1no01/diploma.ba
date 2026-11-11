import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { normalizeWebsite } from '@/app/lib/website';
import { Resend } from 'resend';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Podržavamo oba naziva (institutionName ili name) sa frontenda
    const institutionName = body.institutionName || body.name;
    const email = body.email;
    const password = body.password;
    const website = body.website || null;

    if (!institutionName || !email || !password) {
      return NextResponse.json(
        { error: 'Sva polja su obavezna.' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
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

    // Generisanje 6-cifrenog verifikacionog koda
    const verificationCode = crypto.randomInt(100000, 1000000).toString();

    // Hashiramo lozinku
    const hashedPassword = await bcrypt.hash(password, 10);

    // Upisujemo u bazu uključujući i web stranicu, verifikacioni kod, email_verified = FALSE i is_approved = FALSE
    await client.query(
      `INSERT INTO institutions (name, email, password_hash, website, verification_token, email_verified, is_approved) 
       VALUES ($1, $2, $3, $4, $5, FALSE, FALSE)`,
      [institutionName, email, hashedPassword, website, verificationCode]
    );

    client.release();

    // Slanje verifikacionog maila putem Resend-a
    await resend.emails.send({
      from: 'Diploma.ba <noreply@diploma.ba>',
      to: email,
      subject: 'Vaš verifikacioni kod - Diploma.ba',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9fafb; border-radius: 8px;">
          <h2 style="color: #111827;">Dobrodošli na Diploma.ba</h2>
          <p style="color: #374151; font-size: 16px;">Hvala vam na registraciji. Vaš verifikacioni kod za potvrdu email adrese je:</p>
          <div style="background-color: #ffffff; padding: 16px; text-align: center; border-radius: 6px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <h1 style="color: #2563eb; letter-spacing: 4px; margin: 0; font-size: 32px;">${verificationCode}</h1>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Unesite ovaj kod na stranici kako biste potvrdili email. Nakon toga, administrator će pregledati i odobriti vaš nalog.</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      message: 'Uspješno! Poslali smo verifikacioni kod na vaš email.',
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Greška pri registraciji';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}