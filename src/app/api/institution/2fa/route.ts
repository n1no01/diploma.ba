import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// POST: uključi/isključi 2FA (traži trenutnu lozinku)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Neautorizovan pristup.' }, { status: 401 });
    }

    const { enabled, password } = await request.json();
    if (typeof enabled !== 'boolean' || !password) {
      return NextResponse.json({ error: 'Nedostaju podaci.' }, { status: 400 });
    }

    const result = await pool.query(
      'SELECT id, password_hash FROM institutions WHERE email = $1',
      [session.user.email]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Institucija nije pronađena.' }, { status: 404 });
    }

    const { id, password_hash } = result.rows[0];
    if (password_hash === 'GOOGLE_OAUTH_ACCOUNT') {
      return NextResponse.json(
        { error: 'Nalog je povezan s Google računom. Koristite Google dvostepenu provjeru.' },
        { status: 400 }
      );
    }

    const ok = await bcrypt.compare(password, password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Pogrešna lozinka.' }, { status: 403 });
    }

    await pool.query(
      `UPDATE institutions
       SET two_factor_enabled = $1, otp_hash = NULL, otp_expires = NULL, otp_attempts = 0, otp_sent_at = NULL
       WHERE id = $2`,
      [enabled, id]
    );

    return NextResponse.json({
      success: true,
      enabled,
      message: enabled ? 'Dvostepena provjera je uključena.' : 'Dvostepena provjera je isključena.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Greška na serveru';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
