import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Pool } from 'pg';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { TERMS_VERSION } from '@/app/lib/legal';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// POST: prijavljena ustanova prihvata Uslove korištenja i Ugovor o obradi podataka (trenutna verzija)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Neautorizovan pristup.' }, { status: 401 });
    }

    let body: { accept?: unknown; version?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    if (body.accept !== true) {
      return NextResponse.json(
        { error: 'Morate prihvatiti Uslove korištenja i Ugovor o obradi podataka.' },
        { status: 400 }
      );
    }

    // Ako su se dokumenti u međuvremenu promijenili, korisnik mora vidjeti novu verziju prije prihvatanja
    if (typeof body.version === 'string' && body.version !== TERMS_VERSION) {
      return NextResponse.json(
        { error: 'Dokumenti su ažurirani. Osvježite stranicu i pročitajte novu verziju.' },
        { status: 409 }
      );
    }

    const result = await pool.query(
      `UPDATE institutions
          SET terms_accepted_at = NOW(), terms_version = $1
        WHERE LOWER(email) = LOWER($2)
        RETURNING terms_version`,
      [TERMS_VERSION, session.user.email]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Institucija nije pronađena.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, termsVersion: result.rows[0].terms_version });
  } catch (error: unknown) {
    console.error('Greška pri prihvatanju uslova:', error);
    return NextResponse.json({ error: 'Greška na serveru.' }, { status: 500 });
  }
}
