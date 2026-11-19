import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Pool } from 'pg';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { computeCertHash } from '@/app/lib/certHash';
import { consumeRateLimit } from '@/app/lib/rateLimit';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const MAX_ROWS = 100000;

const HASH_FORMULA =
  'sha256(institution_id|ime|e-mail|vrsta|identifikator|metapodaci): ime, e-mail i vrsta se skrate i pišu malim slovima, ' +
  'identifikator se samo skrati, metapodaci su JSON s abecedno sortiranim ključevima na svim nivoima ({} ako su prazni)';

interface CertRow {
  id: number;
  student_name: string;
  student_email: string;
  certificate_type: string;
  identifier: string | null;
  metadata: unknown;
  certificate_hash: string | null;
  tx_hash: string | null;
  status: string | null;
  expires_at: Date | string | null;
  created_at: Date | string;
}

function toIso(v: Date | string | null): string {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

// Zaštita od "CSV injection" u Excelu: ćelije koje počinju s = + - @ tretiraju se kao tekst.
// Napomena: za nezavisnu provjeru hasha koristite JSON izvoz, koji ne mijenja vrijednosti.
function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Neautorizovan pristup.' }, { status: 401 });
    }

    // Izvoz je skup za bazu, pa ga ograničavamo (5 po satu po ustanovi)
    if (!(await consumeRateLimit(`export:${session.user.email.toLowerCase()}`, 5, 3600))) {
      return NextResponse.json({ error: 'Previše zahtjeva za izvoz. Pokušajte ponovo kasnije.' }, { status: 429 });
    }

    const format = new URL(request.url).searchParams.get('format') === 'json' ? 'json' : 'csv';

    const inst = await pool.query(
      'SELECT id, name FROM institutions WHERE LOWER(email) = LOWER($1)',
      [session.user.email]
    );
    if (inst.rows.length === 0) {
      return NextResponse.json({ error: 'Institucija nije pronađena.' }, { status: 404 });
    }
    const institution = inst.rows[0] as { id: number; name: string };

    const result = await pool.query(
      `SELECT id, student_name, student_email, certificate_type, identifier, metadata,
              certificate_hash, tx_hash, status, expires_at, created_at
         FROM certificates
        WHERE institution_id = $1
        ORDER BY id ASC
        LIMIT ${MAX_ROWS}`,
      [institution.id]
    );

    const rows = (result.rows as CertRow[]).map((r) => {
      let hashMatches = false;
      try {
        const recomputed = computeCertHash({
          institutionId: institution.id,
          studentName: r.student_name,
          studentEmail: r.student_email,
          certificateType: r.certificate_type,
          identifier: r.identifier,
          metadata: r.metadata,
        });
        hashMatches = !!r.certificate_hash && recomputed.toLowerCase() === r.certificate_hash.toLowerCase();
      } catch {
        hashMatches = false;
      }

      return {
        id: r.id,
        institution_id: institution.id,
        student_name: r.student_name,
        student_email: r.student_email,
        certificate_type: r.certificate_type,
        identifier: r.identifier ?? '',
        metadata: r.metadata ?? {},
        certificate_hash: r.certificate_hash ?? '',
        tx_hash: r.tx_hash ?? '',
        status: r.status ?? '',
        issued_at: toIso(r.created_at),
        expires_at: toIso(r.expires_at),
        hash_matches: hashMatches,
      };
    });

    const day = new Date().toISOString().slice(0, 10);
    const headers = { 'Cache-Control': 'no-store' };

    if (format === 'json') {
      const body = {
        exported_at: new Date().toISOString(),
        institution: { id: institution.id, name: institution.name },
        network: 'Base Mainnet',
        contract_address: process.env.CONTRACT_ADDRESS || null,
        hash_formula: HASH_FORMULA,
        count: rows.length,
        certificates: rows,
      };
      return new NextResponse(JSON.stringify(body, null, 2), {
        status: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="diploma-ba-izvoz-${day}.json"`,
        },
      });
    }

    const columns = [
      'id', 'institution_id', 'student_name', 'student_email', 'certificate_type', 'identifier',
      'metadata', 'certificate_hash', 'tx_hash', 'status', 'issued_at', 'expires_at', 'hash_matches',
    ] as const;

    const lines = [columns.map(csvCell).join(',')];
    for (const r of rows) {
      lines.push(
        columns
          .map((c) => csvCell(c === 'metadata' ? JSON.stringify(r.metadata) : r[c]))
          .join(',')
      );
    }

    // BOM na početku da Excel ispravno prikaže č, ć, š, ž, đ
    return new NextResponse('﻿' + lines.join('\r\n'), {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="diploma-ba-izvoz-${day}.csv"`,
      },
    });
  } catch (error: unknown) {
    console.error('Greška pri izvozu podataka:', error);
    return NextResponse.json({ error: 'Greška na serveru pri izvozu podataka.' }, { status: 500 });
  }
}
