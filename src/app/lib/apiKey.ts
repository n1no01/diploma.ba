import crypto from 'crypto';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const API_KEY_PREFIX = 'dpl_';

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Ključ ima 192 bita slučajnosti, pa je običan SHA-256 hash dovoljan za pohranu.
// U bazi se čuva samo hash; ključ se prikaže korisniku jednom, pri kreiranju.
export function generateApiKey() {
  const key = API_KEY_PREFIX + crypto.randomBytes(24).toString('hex');
  return { key, hash: hashApiKey(key), prefix: key.slice(0, 12) };
}

export interface ApiInstitution {
  id: number;
  name: string;
  isApproved: boolean;
}

// Čita "Authorization: Bearer dpl_..." i vraća instituciju kojoj ključ pripada (ili null)
export async function authenticateApiKey(headers: Headers): Promise<ApiInstitution | null> {
  const auth = headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(\S+)$/i);
  if (!match) return null;

  const key = match[1];
  if (!key.startsWith(API_KEY_PREFIX) || key.length > 100) return null;

  const result = await pool.query(
    'SELECT id, name, is_approved FROM institutions WHERE api_key_hash = $1',
    [hashApiKey(key)]
  );
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  pool.query('UPDATE institutions SET api_key_last_used_at = NOW() WHERE id = $1', [row.id]).catch(() => {});
  return { id: row.id, name: row.name, isApproved: !!row.is_approved };
}
