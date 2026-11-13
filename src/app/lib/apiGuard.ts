import { NextResponse } from 'next/server';
import { ApiInstitution, authenticateApiKey } from '@/app/lib/apiKey';
import { consumeRateLimit, getClientIp, hitRateLimit, isRateLimited } from '@/app/lib/rateLimit';

export function apiError(message: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers });
}

/**
 * Zajednička zaštita za /api/v1 rute: ograničenje neuspjelih pokušaja po IP adresi,
 * provjera API ključa, provjera odobrenja naloga i ograničenje zahtjeva po instituciji.
 * Vraća instituciju ili gotov odgovor s greškom.
 */
export async function guardApiRequest(
  req: Request,
  bucket: string,
  maxPerMinute: number
): Promise<{ institution: ApiInstitution } | { response: NextResponse }> {
  const ip = getClientIp(req.headers);

  if (await isRateLimited(`api-fail-ip:${ip}`, 30, 900)) {
    return { response: apiError('Previše neuspjelih pokušaja. Pokušajte ponovo kasnije.', 429, { 'Retry-After': '900' }) };
  }

  const institution = await authenticateApiKey(req.headers);
  if (!institution) {
    await hitRateLimit(`api-fail-ip:${ip}`, 900);
    return { response: apiError('Nevažeći ili nedostajući API ključ.', 401) };
  }
  if (!institution.isApproved) {
    return { response: apiError('Nalog ustanove još nije odobren od strane administratora.', 403) };
  }
  if (!(await consumeRateLimit(`${bucket}:${institution.id}`, maxPerMinute, 60))) {
    return {
      response: apiError(`Previše zahtjeva. Dozvoljeno je ${maxPerMinute} zahtjeva u minuti.`, 429, { 'Retry-After': '60' }),
    };
  }
  return { institution };
}

export function effectiveStatus(status: string, expiresAt: Date | string | null): 'active' | 'revoked' | 'expired' {
  if (status === 'revoked') return 'revoked';
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return 'expired';
  return 'active';
}

export function formatCertificate(row: Record<string, any>, baseUrl: string) {
  return {
    certificateId: row.id,
    certificateHash: row.certificate_hash,
    studentName: row.student_name,
    studentEmail: row.student_email,
    certificateType: row.certificate_type,
    identifier: row.identifier || null,
    metadata: row.metadata ?? {},
    status: effectiveStatus(row.status, row.expires_at),
    issuedAt: row.created_at,
    expiresAt: row.expires_at || null,
    txHash: row.tx_hash,
    verifyUrl: `${baseUrl}/verifikuj?hash=${row.certificate_hash}`,
  };
}

export const CERT_COLUMNS =
  'id, certificate_hash, student_name, student_email, certificate_type, identifier, metadata, status, created_at, expires_at, tx_hash';

export const HASH_RE = /^[0-9a-fA-F]{64}$/;

// Ako klijent pošalje tekst koji nije UTF-8 (npr. Windows terminal u kodnoj strani 1250),
// č, ć, š, ž, đ stignu kao zamjenski znak U+FFFD i izgube se. Takav zahtjev odbijamo
// umjesto da spremimo pokvareno ime u certifikat.
export function containsInvalidText(value: unknown): boolean {
  if (typeof value === 'string') return value.includes('\uFFFD');
  if (Array.isArray(value)) return value.some(containsInvalidText);
  if (value && typeof value === 'object') return Object.values(value).some(containsInvalidText);
  return false;
}

export const INVALID_TEXT_MESSAGE =
  'Zahtjev sadrži neispravne znakove (npr. č, ć, š, ž ili đ prikazani kao �). Pošaljite JSON kodiran kao UTF-8.';
