import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Pool } from 'pg';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { normalizeWebsite } from '@/app/lib/website';

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
              i.api_key_prefix, i.api_key_created_at, i.api_key_last_used_at,
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
      apiKeyPrefix: row.api_key_prefix || '',
      apiKeyCreatedAt: row.api_key_created_at,
      apiKeyLastUsedAt: row.api_key_last_used_at,
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
    const parsed = normalizeWebsite(body.website);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const website = parsed.value;

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
