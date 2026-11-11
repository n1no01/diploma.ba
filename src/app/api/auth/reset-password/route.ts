import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { consumeRateLimit, getClientIp, resetRateLimit } from '@/app/lib/rateLimit';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || typeof token !== 'string' || !newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'Nedostaju podaci.' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Nova lozinka mora imati najmanje 8 znakova.' }, { status: 400 });
    }

    // Ograničenje pokušaja po IP adresi (10/h)
    const ip = getClientIp(request.headers);
    if (!(await consumeRateLimit(`reset-ip:${ip}`, 10, 3600))) {
      return NextResponse.json({ error: 'Previše pokušaja. Pokušajte ponovo za sat vremena.' }, { status: 429 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await pool.query(
      `SELECT id, email FROM institutions
       WHERE reset_token_hash = $1 AND reset_token_expires > NOW() AND password_hash <> 'GOOGLE_OAUTH_ACCOUNT'`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Link je nevažeći ili je istekao. Zatražite novi.' }, { status: 400 });
    }

    const { id, email } = result.rows[0];
    const newHash = await bcrypt.hash(newPassword, 10);

    // Link je jednokratan: brišemo token; poništavamo i eventualni aktivni 2FA kod
    await pool.query(
      `UPDATE institutions
       SET password_hash = $1,
           reset_token_hash = NULL, reset_token_expires = NULL,
           otp_hash = NULL, otp_expires = NULL, otp_attempts = 0
       WHERE id = $2`,
      [newHash, id]
    );
    await resetRateLimit(`login-email:${String(email).toLowerCase()}`);

    return NextResponse.json({ success: true, message: 'Lozinka je uspješno promijenjena. Sada se možete prijaviti.' });
  } catch (error) {
    console.error('Greška reset-password:', error);
    return NextResponse.json({ error: 'Greška na serveru.' }, { status: 500 });
  }
}
