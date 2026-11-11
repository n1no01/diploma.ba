import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Neautorizovan pristup.' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Sva polja su obavezna.' }, { status: 400 });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'Nova lozinka mora imati najmanje 8 znakova.' }, { status: 400 });
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: 'Nova lozinka mora biti različita od trenutne.' }, { status: 400 });
    }

    const result = await pool.query(
      'SELECT id, password_hash FROM institutions WHERE LOWER(email) = LOWER($1)',
      [session.user.email]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Institucija nije pronađena.' }, { status: 404 });
    }

    const { id, password_hash } = result.rows[0];
    if (password_hash === 'GOOGLE_OAUTH_ACCOUNT') {
      return NextResponse.json({ error: 'Nalog je povezan s Google računom i nema lozinku.' }, { status: 400 });
    }

    const ok = await bcrypt.compare(currentPassword, password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Trenutna lozinka nije tačna.' }, { status: 403 });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE institutions SET password_hash = $1 WHERE id = $2', [newHash, id]);

    return NextResponse.json({ success: true, message: 'Lozinka je uspješno promijenjena.' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Greška na serveru';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
