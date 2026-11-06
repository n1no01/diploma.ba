import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nemate dozvolu pristupa.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get('id');

    const client = await pool.connect();

    // Ako je proslijeđen ID, vraćamo certifikate te specifične ustanove (Audit Log)
    if (institutionId) {
      const certsResult = await client.query(
        'SELECT id, student_name, course_name, tx_hash, created_at FROM certificates WHERE institution_id = $1 ORDER BY created_at DESC',
        [institutionId]
      );
      client.release();
      return NextResponse.json({ certificates: certsResult.rows });
    }

    // Inače vraćamo sve institucije i opštu statistiku
    const instResult = await client.query(
      'SELECT id, name, email, website, is_approved, role, created_at FROM institutions WHERE role != \'ADMIN\' ORDER BY created_at DESC'
    );

    const statsResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM institutions WHERE role != 'ADMIN') as total_institutions,
        (SELECT COUNT(*) FROM institutions WHERE is_approved = false AND role != 'ADMIN') as pending_institutions,
        (SELECT COUNT(*) FROM institutions WHERE is_approved = true AND role != 'ADMIN') as approved_institutions,
        (SELECT COUNT(*) FROM certificates) as total_certificates
    `);

    client.release();

    return NextResponse.json({
      institutions: instResult.rows,
      stats: statsResult.rows[0],
    });
  } catch (error) {
    console.error("Greška pri dohvatanju admin podataka:", error);
    return NextResponse.json({ error: 'Greška na serveru.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nemate dozvolu pristupa.' }, { status: 403 });
    }

    const { institutionId, isApproved } = await req.json();
    const client = await pool.connect();
    await client.query('UPDATE institutions SET is_approved = $1 WHERE id = $2', [isApproved, institutionId]);
    client.release();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Greška pri ažuriranju.' }, { status: 500 });
  }
}