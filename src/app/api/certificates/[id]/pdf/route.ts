import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import jsPDF from 'jspdf';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // <-- Ispravljeno za Next.js App Router (Promise)
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const client = await pool.connect();
    const result = await client.query('SELECT * FROM certificates WHERE id = $1', [id]);
    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Certifikat nije pronađen.' }, { status: 404 });
    }

    const cert = result.rows[0];

    // Generiramo PDF pomoću jspdf
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 297, 210, 'F');
    
    doc.setLineWidth(1.5);
    doc.setFillColor(30, 58, 138);
    doc.rect(15, 15, 267, 180);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(30, 41, 59);
    doc.text(cert.institution_name, 148.5, 45, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('ovlaštena ustanova izdaje', 148.5, 55, { align: 'center' });

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text(cert.certificate_type.toUpperCase(), 148.5, 75, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Ovaj certifikat se dodjeljuje ponosno za:', 148.5, 95, { align: 'center' });

    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(cert.student_name, 148.5, 115, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`ID / Registracijski broj: ${cert.identifier}`, 148.5, 125, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('monospace');
    doc.setTextColor(148, 163, 184);
    doc.text(`Verifikacijski Hash: ${cert.certificate_hash}`, 148.5, 165, { align: 'center' });
    doc.text(`Datum izdavanja: ${new Date(cert.created_at).toLocaleDateString('bs-BA')}`, 148.5, 172, { align: 'center' });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sertifikat-${cert.id}.pdf"`,
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Greška pri generiranju PDF-a';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}