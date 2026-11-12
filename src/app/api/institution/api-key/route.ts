import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { generateApiKey } from '@/app/lib/apiKey';
import { consumeRateLimit } from '@/app/lib/rateLimit';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Zajednička provjera: prijava + (za naloge s lozinkom) potvrda lozinke
async function authorize(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'Neautorizovan pristup.' }, { status: 401 }) };
  }

  if (!(await consumeRateLimit(`apikey-mgmt:${session.user.email.toLowerCase()}`, 10, 3600))) {
    return { error: NextResponse.json({ error: 'Previše pokušaja. Pokušajte ponovo za sat vremena.' }, { status: 429 }) };
  }

  let body: { password?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* tijelo je opcionalno za Google naloge */
  }

  const result = await pool.query(
    'SELECT id, password_hash, is_approved FROM institutions WHERE LOWER(email) = LOWER($1)',
    [session.user.email]
  );
  if (result.rows.length === 0) {
    return { error: NextResponse.json({ error: 'Institucija nije pronađena.' }, { status: 404 }) };
  }
  const inst = result.rows[0];

  if (inst.password_hash !== 'GOOGLE_OAUTH_ACCOUNT') {
    if (!body.password) {
      return { error: NextResponse.json({ error: 'Unesite lozinku za potvrdu.' }, { status: 400 }) };
    }
    const ok = await bcrypt.compare(body.password, inst.password_hash);
    if (!ok) {
      return { error: NextResponse.json({ error: 'Pogrešna lozinka.' }, { status: 403 }) };
    }
  }
  return { inst };
}

// POST: generiši novi ključ (zamjenjuje stari). Ključ se vraća samo jednom.
export async function POST(request: Request) {
  try {
    const a = await authorize(request);
    if (a.error) return a.error;
    if (!a.inst.is_approved) {
      return NextResponse.json(
        { error: 'Nalog mora biti odobren od strane administratora prije izrade API ključa.' },
        { status: 403 }
      );
    }

    const { key, hash, prefix } = generateApiKey();
    await pool.query(
      `UPDATE institutions
       SET api_key_hash = $1, api_key_prefix = $2, api_key_created_at = NOW(), api_key_last_used_at = NULL
       WHERE id = $3`,
      [hash, prefix, a.inst.id]
    );

    return NextResponse.json({ success: true, apiKey: key, prefix });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Greška na serveru';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: opozovi ključ
export async function DELETE(request: Request) {
  try {
    const a = await authorize(request);
    if (a.error) return a.error;

    await pool.query(
      `UPDATE institutions
       SET api_key_hash = NULL, api_key_prefix = NULL, api_key_created_at = NULL, api_key_last_used_at = NULL
       WHERE id = $1`,
      [a.inst.id]
    );
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Greška na serveru';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
