import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import crypto from 'crypto';
import { Resend } from 'resend';
import { consumeRateLimit, getClientIp } from '@/app/lib/rateLimit';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const resend = new Resend(process.env.RESEND_API_KEY);

const RESET_TTL_MIN = 30;
const GENERIC = {
  success: true,
  message: 'Ako nalog s ovim emailom postoji, poslali smo link za postavljanje nove lozinke.',
};

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email adresa je obavezna.' }, { status: 400 });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Ograničenje: po IP adresi (10/h) i po emailu (3/h); broji se bez obzira postoji li nalog
    const ip = getClientIp(request.headers);
    const okIp = await consumeRateLimit(`forgot-ip:${ip}`, 10, 3600);
    const okEmail = await consumeRateLimit(`forgot-email:${cleanEmail}`, 3, 3600);
    if (!okIp || !okEmail) {
      return NextResponse.json(
        { error: 'Previše zahtjeva. Pokušajte ponovo za sat vremena.' },
        { status: 429 }
      );
    }

    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM institutions WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    // Uvijek isti odgovor, da se ne otkriva koji emailovi postoje.
    // Google nalozi nemaju lozinku, pa im se ne šalje link.
    if (result.rows.length === 0 || result.rows[0].password_hash === 'GOOGLE_OAUTH_ACCOUNT') {
      return NextResponse.json(GENERIC);
    }

    const inst = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await pool.query(
      `UPDATE institutions
       SET reset_token_hash = $1, reset_token_expires = NOW() + INTERVAL '${RESET_TTL_MIN} minutes'
       WHERE id = $2`,
      [tokenHash, inst.id]
    );

    const baseUrl = process.env.APP_URL || 'https://diploma.ba';
    const link = `${baseUrl}/reset-lozinke?token=${token}`;

    try {
      await resend.emails.send({
        from: 'Diploma.ba <noreply@diploma.ba>',
        to: inst.email,
        subject: 'Postavljanje nove lozinke - Diploma.ba',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9fafb; border-radius: 8px;">
            <h2 style="color: #111827;">Postavljanje nove lozinke</h2>
            <p style="color: #374151; font-size: 16px;">Primili smo zahtjev za postavljanje nove lozinke za vaš nalog na Diploma.ba.</p>
            <div style="margin: 25px 0;">
              <a href="${link}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Postavi novu lozinku</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Link važi ${RESET_TTL_MIN} minuta i može se iskoristiti samo jednom. Ako niste tražili promjenu lozinke, ignorišite ovaj mail.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error('Greška pri slanju maila za reset lozinke:', mailErr);
    }

    return NextResponse.json(GENERIC);
  } catch (error) {
    console.error('Greška forgot-password:', error);
    return NextResponse.json({ error: 'Greška na serveru.' }, { status: 500 });
  }
}
