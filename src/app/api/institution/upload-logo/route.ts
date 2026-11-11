import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Pool } from 'pg';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Neautorizovan pristup. Molimo prijavite se.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Fajl nije pronađen.' }, { status: 400 });
    }

    // Za PDF certifikate podržani su samo PNG i JPG
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      return NextResponse.json(
        { error: 'Dozvoljeni formati su PNG i JPG.' },
        { status: 400 }
      );
    }

    // Limit na 1MB za logo da ne opterećujemo bazu
    if (file.size > 1024 * 1024) {
      return NextResponse.json(
        { error: 'Slika je prevelika. Maksimalna veličina je 1MB.' },
        { status: 400 }
      );
    }

    // Pretvaranje fajla u Base64 Data URL
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64String = `data:${file.type};base64,${buffer.toString('base64')}`;

    const client = await pool.connect();
    
    // Pronalazimo ID i ažuriramo logo isključivo za prijavljenu instituciju preko emaila
    const query = `
      UPDATE institutions 
      SET logo_url = $1 
      WHERE LOWER(email) = LOWER($2)
      RETURNING id, name, logo_url;
    `;

    const result = await client.query(query, [base64String, session.user.email]);
    client.release();

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Institucija nije pronađena u bazi.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Logotip uspješno sačuvan!',
      institution: result.rows[0],
      logo_url: result.rows[0].logo_url,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Greška na serveru';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Neautorizovan pristup. Molimo prijavite se.' },
        { status: 401 }
      );
    }

    const client = await pool.connect();
    const query = `
      UPDATE institutions 
      SET logo_url = NULL 
      WHERE LOWER(email) = LOWER($1)
      RETURNING id, name, logo_url;
    `;

    const result = await client.query(query, [session.user.email]);
    client.release();

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Institucija nije pronađena u bazi.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Logotip je uspješno uklonjen!',
      institution: result.rows[0],
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Greška na serveru';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}