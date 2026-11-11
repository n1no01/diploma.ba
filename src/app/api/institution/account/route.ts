import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Pool } from 'pg';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET: svi podaci za stranicu Profil
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Neautorizovan pristup.' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT i.name, i.email, i.website, i.logo_url, i.is_approved, i.created_at,
              i.two_factor_enabled, i.password_hash,
              (SELECT COUNT(*)::int FROM certificates c WHERE c.institution_id = i.id) AS certificates_total,
              (SELECT COUNT(*)::int FROM certificates c WHERE c.institution_id = i.id AND c.status = 'revoked') AS certificates_revoked
       FROM institutions i
       WHERE LOWER(i.email) = LOWER($1)`,
      [session.user.email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Institucija nije pronađena.' }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      name: row.name,
      email: row.email,
      website: row.website || '',
      logoUrl: row.logo_url || '',
      isApproved: !!row.is_approved,
      createdAt: row.created_at,
      twoFactorEnabled: !!row.two_factor_enabled,
      // Google nalozi nemaju lozinku -> nema promjene lozinke ni 2FA preko maila
      isGoogleAccount: row.password_hash === 'GOOGLE_OAUTH_ACCOUNT',
      certificatesTotal: row.certificates_total,
      certificatesRevoked: row.certificates_revoked,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Greška na serveru';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH: izmjena web stranice (naziv ustanove se NAMJERNO ne može mijenjati)
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Neautorizovan pristup.' }, { status: 401 });
    }

    const body = await request.json();
    let website: string | null = typeof body.website === 'string' ? body.website.trim() : '';

    if (website) {
      if (website.length > 200) {
        return NextResponse.json({ error: 'Adresa web stranice je predugačka.' }, { status: 400 });
      }
      if (!/^https?:\/\//i.test(website)) website = `https://${website}`;
      try {
        const url = new URL(website);
        if (url.protocol !== 'http:' && url.protocol !== 'https:' || !url.hostname.includes('.')) {
          throw new Error('invalid');
        }
        website = url.toString().replace(/\/$/, '');
      } catch {
        return NextResponse.json({ error: 'Unesite ispravnu adresu web stranice (npr. www.ustanova.ba).' }, { status: 400 });
      }
    } else {
      website = null;
    }

    const result = await pool.query(
      'UPDATE institutions SET website = $1 WHERE LOWER(email) = LOWER($2) RETURNING website',
      [website, session.user.email]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Institucija nije pronađena.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      website: result.rows[0].website || '',
      message: 'Web stranica je uspješno sačuvana.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Greška na serveru';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
