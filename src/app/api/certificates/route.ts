import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  let client;
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Neautorizovan pristup.' }, { status: 401 });
    }

    const institutionEmail = session.user.email;
    client = await pool.connect();

    // Dohvatamo certifikate i dinamički računamo status (active / expired / revoked)
    const result = await client.query(
      `SELECT 
         c.*, 
         i.name AS institution_name,
         CASE 
           WHEN c.status = 'revoked' THEN 'revoked'
           WHEN c.expires_at IS NOT NULL AND c.expires_at < NOW() THEN 'expired'
           ELSE 'active'
         END AS computed_status
       FROM certificates c
       JOIN institutions i ON c.institution_id = i.id
       WHERE i.email = $1
       ORDER BY c.created_at DESC`,
      [institutionEmail]
    );

    client.release();

    return NextResponse.json({
      success: true,
      certificates: result.rows,
    });

  } catch (error: any) {
    if (client) client.release();
    console.error('Greška pri dohvatu certifikata:', error);
    return NextResponse.json(
      { error: 'Greška na serveru pri učitavanju certifikata.' },
      { status: 500 }
    );
  }
}