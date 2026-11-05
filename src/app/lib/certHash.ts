import crypto from 'crypto';

// Rekurzivno sortiranje JSON ključeva za stabilan kanonski string (rješava problem sa jsonb/text)
export function canonicalizeJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return '[' + v.map(canonicalizeJson).join(',') + ']';
  const o = v as Record<string, unknown>;
  return '{' + Object.keys(o).sort()
    .map(k => JSON.stringify(k) + ':' + canonicalizeJson(o[k])).join(',') + '}';
}

export interface CertificateHashParams {
  institutionId: number | string;
  studentName: string;
  studentEmail: string;
  certificateType: string;
  identifier?: string | null;
  metadata?: unknown;
}

// Jedinstvena funkcija za izračunavanje kriptografskog hasha (koristi se i u issue, bulk i verify)
export function computeCertHash(params: CertificateHashParams): string {
  const institutionId = String(params.institutionId);
  const studentName = params.studentName ? params.studentName.trim().toLowerCase() : '';
  const studentEmail = params.studentEmail ? params.studentEmail.trim().toLowerCase() : '';
  const certificateType = params.certificateType ? params.certificateType.trim().toLowerCase() : 'diploma o završenom studiju';
  const identifier = params.identifier ? params.identifier.trim() : '';

  let parsedMetadata = params.metadata;
  if (typeof parsedMetadata === 'string') {
    try {
      parsedMetadata = JSON.parse(parsedMetadata);
    } catch {
      parsedMetadata = {};
    }
  }
  const metadataString = canonicalizeJson(parsedMetadata || {});

  const canonicalString = `${institutionId}|${studentName}|${studentEmail}|${certificateType}|${identifier}|${metadataString}`;
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}