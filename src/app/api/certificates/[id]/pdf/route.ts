import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import PDFDocument from 'pdfkit';
import path from 'path';
import QRCode from 'qrcode';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const resolvedParams = await params; 
    const certHash = resolvedParams.id;   

    // Povlačimo i logo_url iz tabele institutions
    const result = await pool.query(
      `SELECT c.id, c.student_name, c.certificate_type, c.identifier, c.certificate_hash, c.tx_hash, c.status, c.created_at, 
              i.name as institution_name, i.logo_url 
       FROM certificates c
       JOIN institutions i ON c.institution_id = i.id
       WHERE LOWER(c.certificate_hash) = LOWER($1)`,
      [certHash]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Certifikat nije pronađen.' }, { status: 404 });
    }

    const cert = result.rows[0];

    if (cert.status === 'revoked') {
      return NextResponse.json({ error: 'Ovaj certifikat je poništen od strane izdavača.' }, { status: 400 });
    }

    // 1. Preuzimanje logotipa u letu (ako postoji URL)
    let logoBuffer: Buffer | null = null;
    if (cert.logo_url) {
      try {
        const logoRes = await fetch(cert.logo_url);
        if (logoRes.ok) {
          const arrayBuffer = await logoRes.arrayBuffer();
          logoBuffer = Buffer.from(arrayBuffer);
        }
      } catch (logoErr) {
        console.error('Greška pri učitavanju logotipa institucije:', logoErr);
        // Nastavljamo bez logotipa ako dođe do mrežne greške
      }
    }

    // 2. Generisanje QR koda
    const verifyUrl = `${process.env.APP_URL || 'https://diploma.ba'}/verifikuj?hash=${cert.certificate_hash}`;
    const qrCodeBuffer = await QRCode.toBuffer(verifyUrl, {
      type: 'png',
      margin: 1,
      width: 300,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    const fontRegularPath = path.join(process.cwd(), 'public/fonts/Roboto-Regular.ttf');
    const fontBoldPath = path.join(process.cwd(), 'public/fonts/Roboto-Bold.ttf');

    // Inicijalizacija A4 Landscape (širina ~842.28, visina ~595.28)
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 40,
    });

    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));
    });

    doc.registerFont('Roboto-Regular', fontRegularPath);
    doc.registerFont('Roboto-Bold', fontBoldPath);

    const pageWidth = doc.page.width;   // ~842.28
    const pageHeight = doc.page.height; // ~595.28
    const contentWidth = pageWidth - 120; // Margine po 60 sa svake strane

    // --- DIZAJN CERTIFIKATA ---
    doc.rect(20, 20, pageWidth - 40, pageHeight - 40).lineWidth(3).strokeColor('#0f172a').stroke();
    doc.rect(28, 28, pageWidth - 56, pageHeight - 56).lineWidth(1).strokeColor('#2563eb').stroke();

    let currentY = 55;

    // Ako postoji logotip, iscrtavamo ga centrirano na vrhu (visina ~50px)
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, pageWidth / 2 - 30, currentY, { width: 60, height: 60, fit: [60, 60] });
        currentY += 70; // Pomjeramo ostatak sadržaja naniže da napravimo mjesta za logo
      } catch (err) {
        console.error('Neuspješno renderovanje logotipa u PDF-u:', err);
        currentY += 15;
      }
    } else {
      currentY += 25;
    }

    // 1. Naziv institucije (Izdavalac)
    doc
      .font('Roboto-Bold')
      .fontSize(14)
      .fillColor('#2563eb')
      .text(cert.institution_name ? cert.institution_name.toUpperCase() : 'USTANOVA', 60, currentY, { align: 'center', width: contentWidth });

    currentY += 45;

    // 2. Naziv dokumenta (sa automatskim smanjivanjem fonta)
    let certTitleSize = 28;
    const rawCertTitle = cert.certificate_type ? cert.certificate_type.toUpperCase() : 'CERTIFIKAT';
    doc.font('Roboto-Bold').fontSize(certTitleSize);
    while (doc.widthOfString(rawCertTitle) > contentWidth && certTitleSize > 18) {
      certTitleSize -= 1;
      doc.fontSize(certTitleSize);
    }
    doc
      .fillColor('#0f172a')
      .text(rawCertTitle, 60, currentY, { align: 'center', width: contentWidth });

    currentY += 65;

    // 3. Uvodna rečenica
    doc
      .font('Roboto-Regular')
      .fontSize(11)
      .fillColor('#64748b')
      .text('Ovaj dokument je izdat na ime', 60, currentY, { align: 'center', width: contentWidth });

    currentY += 28;

    // 4. Ime i prezime polaznika
    let nameSize = 28;
    const rawStudentName = cert.student_name || '';
    doc.font('Roboto-Bold').fontSize(nameSize);
    while (doc.widthOfString(rawStudentName) > contentWidth && nameSize > 16) {
      nameSize -= 1;
      doc.fontSize(nameSize);
    }
    doc
      .fillColor('#0f172a')
      .text(rawStudentName, 60, currentY, { align: 'center', width: contentWidth });

    // Linija razdvajanja na fiksnoj poziciji
    doc
      .moveTo(221, 350)
      .lineTo(pageWidth - 221, 350)
      .lineWidth(1)
      .strokeColor('#e2e8f0')
      .stroke();

    // --- DONJI DIO (Tehnički podaci lijevo, QR kod desno) ---
    const bottomY = 410;

    doc
      .font('Roboto-Regular')
      .fontSize(9)
      .fillColor('#64748b')
      .text(`Datum izdavanja: ${new Date(cert.created_at).toLocaleDateString('bs-BA')}`, 60, bottomY);

    doc
      .font('Roboto-Regular')
      .fontSize(8)
      .fillColor('#475569')
      .text(`Kod za provjeru: ${cert.certificate_hash || 'N/A'}`, 60, bottomY + 22);

    doc
      .font('Roboto-Regular')
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(`Zapis na mreži (Base TX): ${cert.tx_hash || 'N/A'}`, 60, bottomY + 38);

    doc
      .font('Roboto-Bold')
      .fontSize(10)
      .fillColor('#0f172a')
      .text('diploma.ba', 60, bottomY + 70);

    // Desna strana: QR kod i natpis
    doc.image(qrCodeBuffer, pageWidth - 140, bottomY - 5, { width: 75, height: 75 });
    
    doc
      .font('Roboto-Regular')
      .fontSize(7)
      .fillColor('#94a3b8')
      .text('Skenirajte za provjeru', pageWidth - 170, bottomY + 73, { align: 'center', width: 135 });

    doc.end();

    const pdfBuffer = await pdfPromise;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Certifikat-${certHash.substring(0, 8)}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Greška pri generisanju PDF certifikata:", error);
    return NextResponse.json({ error: 'Greška pri generisanju PDF-a.' }, { status: 500 });
  }
}