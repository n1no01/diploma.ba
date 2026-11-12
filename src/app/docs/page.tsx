import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API dokumentacija | diploma.ba',
  description:
    'Kako povezati vašu platformu s diploma.ba: automatsko izdavanje, pregled i poništavanje certifikata putem API-ja.',
};

const BASE = 'https://diploma.ba';

/* ---------- primjeri koda ---------- */

const quickstart = `curl -X POST ${BASE}/api/v1/certificates \\
  -H "Authorization: Bearer dpl_VAS_KLJUC" \\
  -H "Content-Type: application/json" \\
  -d '{
    "studentName": "Ime Prezime",
    "studentEmail": "student@example.com",
    "certificateType": "Napredni kurs programiranja",
    "identifier": "kurs-12-korisnik-345"
  }'`;

const issueResponse = `{
  "success": true,
  "alreadyIssued": false,
  "certificateId": 123,
  "certificateHash": "3f2a…",
  "txHash": "0x9b1c…",
  "status": "active",
  "verifyUrl": "${BASE}/verifikuj?hash=3f2a…"
}`;

const certObject = `{
  "certificateId": 123,
  "certificateHash": "3f2a…",
  "studentName": "Ime Prezime",
  "studentEmail": "student@example.com",
  "certificateType": "Napredni kurs programiranja",
  "identifier": "kurs-12-korisnik-345",
  "metadata": {},
  "status": "active",
  "issuedAt": "2026-11-12T13:10:48.553Z",
  "expiresAt": null,
  "txHash": "0x9b1c…",
  "verifyUrl": "${BASE}/verifikuj?hash=3f2a…"
}`;

const statusRequest = `curl ${BASE}/api/v1/certificates/HASH_CERTIFIKATA \\
  -H "Authorization: Bearer dpl_VAS_KLJUC"`;

const statusResponse = `{
  "success": true,
  "certificate": { … }   // objekat certifikata, vidi iznad
}`;

const listRequest = `curl "${BASE}/api/v1/certificates?limit=50&status=active" \\
  -H "Authorization: Bearer dpl_VAS_KLJUC"`;

const listResponse = `{
  "success": true,
  "certificates": [ { … }, { … } ],
  "nextCursor": "98"      // null kada nema više stranica
}`;

const revokeRequest = `curl -X POST ${BASE}/api/v1/certificates/HASH_CERTIFIKATA/revoke \\
  -H "Authorization: Bearer dpl_VAS_KLJUC"`;

const revokeResponse = `{
  "success": true,
  "alreadyRevoked": false,
  "certificateHash": "3f2a…",
  "status": "revoked"
}`;

const errorExample = `{ "error": "Nevažeći ili nedostajući API ključ." }`;

const nodeIssue = `// Pozovite sa SERVERA vaše platforme, nikada iz browsera
async function izdajCertifikat(korisnik, kurs) {
  const res = await fetch('${BASE}/api/v1/certificates', {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${process.env.DIPLOMA_API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      studentName: korisnik.punoIme,
      studentEmail: korisnik.email,
      certificateType: kurs.naziv,
      identifier: \`kurs-\${kurs.id}-korisnik-\${korisnik.id}\`,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error);   // 400, 401, 403, 429, 502, 500

  // Sačuvajte ova dva podatka uz zapis "položio kurs" u vašoj bazi
  return { hash: data.certificateHash, verifyUrl: data.verifyUrl };
}`;

const nodeList = `// Dohvaća SVE certifikate vaše ustanove, stranicu po stranicu
async function sviCertifikati() {
  const svi = [];
  let cursor = null;

  do {
    const url = new URL('${BASE}/api/v1/certificates');
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url, {
      headers: { Authorization: \`Bearer \${process.env.DIPLOMA_API_KEY}\` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    svi.push(...data.certificates);
    cursor = data.nextCursor;      // null na zadnjoj stranici
  } while (cursor);

  return svi;
}`;

const nodeRevoke = `async function ponistiCertifikat(hash) {
  const res = await fetch(\`${BASE}/api/v1/certificates/\${hash}/revoke\`, {
    method: 'POST',
    headers: { Authorization: \`Bearer \${process.env.DIPLOMA_API_KEY}\` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;   // { success: true, alreadyRevoked: false|true, status: 'revoked' }
}`;

const pythonIssue = `import os, requests

res = requests.post(
    "${BASE}/api/v1/certificates",
    headers={"Authorization": f"Bearer {os.environ['DIPLOMA_API_KEY']}"},
    json={
        "studentName": "Ime Prezime",
        "studentEmail": "student@example.com",
        "certificateType": "Napredni kurs programiranja",
        "identifier": "kurs-12-korisnik-345",
    },
    timeout=60,   # upis na blockchain može potrajati nekoliko sekundi
)
data = res.json()
res.raise_for_status()
print(data["verifyUrl"])`;

/* ---------- tabele ---------- */

const endpoints: [string, string, string, string][] = [
  ['POST', '/api/v1/certificates', 'Izdaj certifikat', '#izdavanje'],
  ['GET', '/api/v1/certificates', 'Lista izdatih certifikata', '#lista'],
  ['GET', '/api/v1/certificates/{hash}', 'Status jednog certifikata', '#status'],
  ['POST', '/api/v1/certificates/{hash}/revoke', 'Poništi certifikat', '#ponistavanje'],
];

const issueFields: [string, string, string, string][] = [
  ['studentName', 'string', 'da', 'Ime i prezime primaoca, najviše 200 znakova.'],
  ['studentEmail', 'string', 'da', 'Email primaoca. Na njega stiže obavijest s linkom za provjeru.'],
  ['certificateType', 'string', 'ne (preporučeno)', 'Naziv certifikata ili kursa (najviše 200 znakova). Zadano: „Diploma o završenom studiju“.'],
  ['identifier', 'string', 'ne (preporučeno)', 'Vaš interni ID, npr. broj indeksa ili ID kursa i korisnika (najviše 100 znakova). Vidi napomenu ispod.'],
  ['metadata', 'objekat', 'ne', 'Dodatni podaci u JSON obliku, npr. ocjena ili broj sati (najviše 4000 znakova).'],
  ['expiresAt', 'string', 'ne', 'Datum isteka, npr. 2030-12-31. Bez ovog polja certifikat ne ističe.'],
  ['sendEmail', 'boolean', 'ne', 'false ako ne želite da šaljemo email primaocu. Zadano: true.'],
];

const certFields: [string, string][] = [
  ['certificateId', 'Interni broj certifikata.'],
  ['certificateHash', 'Jedinstveni otisak certifikata. Koristi se za status i poništavanje.'],
  ['status', 'active (važi), revoked (poništen) ili expired (istekao).'],
  ['issuedAt / expiresAt', 'Datum izdavanja i isteka (expiresAt je null ako ne ističe).'],
  ['txHash', 'Oznaka transakcije na Base blockchainu.'],
  ['verifyUrl', 'Javni link na kojem svako može provjeriti certifikat i preuzeti PDF.'],
];

const errors: [string, string, string][] = [
  ['400', 'Neispravni podaci', 'Provjerite polja u zahtjevu. Poruka u polju error kaže šta je pogrešno.'],
  ['401', 'Nevažeći ili nedostajući API ključ', 'Zaglavlje mora biti Authorization: Bearer dpl_... (sa razmakom iza „Bearer“). Ako ste ključ zamijenili novim, stari više ne važi.'],
  ['403', 'Nalog nije odobren', 'Administrator još nije odobrio vašu ustanovu.'],
  ['404', 'Certifikat nije pronađen', 'Hash ne postoji ili pripada drugoj ustanovi.'],
  ['429', 'Previše zahtjeva', 'Sačekajte koliko piše u zaglavlju Retry-After (sekunde) i pokušajte ponovo.'],
  ['502', 'Greška upisa na blockchain', 'Privremeno. Ponovite isti zahtjev; zbog idempotentnosti se neće napraviti duplikat.'],
  ['500', 'Greška na serveru', 'Pokušajte ponovo kasnije. Ako se ponavlja, javite nam se.'],
];

const faq: [string, string][] = [
  [
    'Šta ako isti zahtjev pošaljem dvaput?',
    'Ništa loše: ne pravi se duplikat. Drugi put dobijete status 200 i alreadyIssued: true, bez novog upisa na blockchain i bez novog emaila. Zato je sigurno ponoviti zahtjev nakon greške mreže ili isteka vremena.',
  ],
  [
    'Zašto je identifier preporučen, a nije obavezan?',
    'Certifikat se prepoznaje po hashu izračunatom iz ustanove, imena, emaila, naziva certifikata, identifikatora i metadata. Ako se sve to poklopi, riječ je o istom certifikatu. Ako ista osoba treba dva certifikata s istim nazivom (npr. isti kurs u dva ciklusa), pošaljite različit identifier ili metadata. Dvije osobe s istim imenom, a različitim emailom, uvijek dobijaju različite certifikate.',
  ],
  [
    'Kako da izdam certifikat bez da primalac dobije email?',
    'Pošaljite sendEmail: false. Link za provjeru svejedno dobijate u odgovoru (verifyUrl), pa ga možete sami poslati ili prikazati u svojoj aplikaciji.',
  ],
  [
    'Dobija li primalac PDF u emailu?',
    'Ne. Email sadrži link za provjeru. PDF se preuzima tek kada osoba na stranici za provjeru klikne „Preuzmi PDF Certifikat“.',
  ],
  [
    'Imam hiljade certifikata. Mogu li ih sve dohvatiti?',
    'Da. Jedan odgovor ima najviše 100 certifikata, ali možete čitati stranicu po stranicu preko nextCursor (vidi primjer iznad). Ograničenje je 120 zahtjeva u minuti.',
  ],
  [
    'Mogu li poništen certifikat ponovo aktivirati?',
    'Ne. Poništavanje je trajno jer se upisuje i na blockchain. Ako je greška, izdajte novi certifikat (uz drugačiji identifier, jer će isti podaci dati isti hash).',
  ],
  [
    'Kako da testiram a da ne pravim prave certifikate?',
    'Za sada ne postoji poseban testni način: svaki uspješan poziv izdavanja pravi stvaran certifikat i upis na blockchain. Za probu koristite svoj email i sendEmail: false, pa po potrebi poništite probni certifikat. Pozive za čitanje (lista i status) možete slobodno testirati.',
  ],
  [
    'Izgubio sam ili otkrio API ključ. Šta da radim?',
    'U profilu, u sekciji API pristup, generišite novi ključ ili opozovite postojeći. Stari ključ odmah prestaje važiti.',
  ],
];

/* ---------- komponente ---------- */

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 text-slate-100 text-xs sm:text-sm rounded-2xl p-5 overflow-x-auto leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function C({ children }: { children: React.ReactNode }) {
  return <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-900 text-[0.85em]">{children}</code>;
}

function Method({ m }: { m: string }) {
  const color = m === 'GET' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200';
  return <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded border ${color}`}>{m}</span>;
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-900">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-2 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-xl font-bold text-slate-900 scroll-mt-24">
      {children}
    </h2>
  );
}

function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
      <Method m={method} />
      <code className="text-sm text-slate-900 break-all">{path}</code>
    </div>
  );
}

const toc: [string, string][] = [
  ['#pregled', 'Pregled'],
  ['#brzi-pocetak', 'Brzi početak'],
  ['#autentikacija', 'Autentikacija'],
  ['#izdavanje', 'Izdavanje'],
  ['#lista', 'Lista'],
  ['#status', 'Status'],
  ['#ponistavanje', 'Poništavanje'],
  ['#greske', 'Greške i ograničenja'],
  ['#primjeri', 'Primjeri koda'],
  ['#faq', 'Česta pitanja'],
];

export default function DocsPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-slate-700">
      <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-3xl shadow-xl space-y-12">
        {/* Zaglavlje */}
        <div className="border-b border-slate-100 pb-6">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            API dokumentacija
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-4">
            Povežite vašu platformu s diploma.ba
          </h1>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">
            Kada korisnik završi kurs, vaš server pošalje jedan zahtjev, a certifikat se automatski upiše na blockchain i stiže primaocu na email. Ne morate se prijavljivati na diploma.ba za svaki certifikat.
          </p>
          <nav className="flex flex-wrap gap-2 mt-5" aria-label="Sadržaj">
            {toc.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 px-3 py-1.5 rounded-full transition"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        {/* Pregled */}
        <section className="space-y-4">
          <H2 id="pregled">Pregled</H2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Osnovna adresa je <C>{BASE}</C>. Zahtjevi i odgovori su u JSON formatu. Svaki poziv se potpisuje vašim API ključem i radi samo s certifikatima vaše ustanove.
          </p>
          <Table head={['Metoda', 'Putanja', 'Šta radi']}>
            {endpoints.map(([m, path, desc, href]) => (
              <tr key={m + path}>
                <td className="px-4 py-2"><Method m={m} /></td>
                <td className="px-4 py-2"><a href={href} className="text-slate-900 hover:text-blue-600 font-mono text-xs sm:text-sm break-all">{path}</a></td>
                <td className="px-4 py-2 text-slate-600">{desc}</td>
              </tr>
            ))}
          </Table>
        </section>

        {/* Brzi početak */}
        <section className="space-y-4">
          <H2 id="brzi-pocetak">Brzi početak</H2>
          <ol className="list-decimal list-inside text-sm space-y-2 text-slate-600 pl-2 leading-relaxed">
            <li>Registrujte ustanovu i sačekajte da administrator odobri nalog.</li>
            <li>
              Otvorite <Link href="/profil" className="text-blue-600 hover:underline">Profil</Link>, sekcija <strong className="text-slate-900">API pristup</strong>, i kliknite na generisanje ključa. Ključ se prikaže <strong className="text-slate-900">samo jednom</strong>, pa ga odmah kopirajte.
            </li>
            <li>Spremite ključ na serveru vaše platforme, npr. u varijablu okruženja <C>DIPLOMA_API_KEY</C>.</li>
            <li>Pošaljite probni zahtjev (ispod). U odgovoru dobijete <C>verifyUrl</C>: otvorite ga da vidite certifikat.</li>
          </ol>
          <Code>{quickstart}</Code>
          <p className="text-xs text-slate-500 leading-relaxed">
            Napomena za Windows: u PowerShellu pišite <C>curl.exe</C> umjesto <C>curl</C>, i sve zahtjeve stavite u jednu liniju (bez znaka <C>\</C> za novi red). Za lokalno testiranje koristite <C>http://localhost:3000</C>, ne <C>https</C>.
          </p>
        </section>

        {/* Autentikacija */}
        <section className="space-y-4">
          <H2 id="autentikacija">Autentikacija</H2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Svaki zahtjev mora imati zaglavlje <C>Authorization</C> s vašim ključem. Ključ počinje s <C>dpl_</C>, a ispred njega mora stajati riječ <C>Bearer</C> i razmak.
          </p>
          <Code>{`Authorization: Bearer dpl_VAS_KLJUC`}</Code>
          <ul className="list-disc list-inside text-sm space-y-2 text-slate-600 pl-2 leading-relaxed">
            <li>Ključ držite samo na serveru. Nikada ga ne stavljajte u kod koji se izvršava u browseru ili mobilnoj aplikaciji.</li>
            <li>Mi čuvamo samo hash ključa, pa ga ne možemo ponovo prikazati. Ako ga izgubite, generišite novi (stari odmah prestaje važiti).</li>
            <li>Ako sumnjate da je ključ procurio, opozovite ga ili zamijenite novim u profilu.</li>
          </ul>
        </section>

        {/* Izdavanje */}
        <section className="space-y-4">
          <H2 id="izdavanje">Izdavanje certifikata</H2>
          <Endpoint method="POST" path="/api/v1/certificates" />
          <p className="text-sm text-slate-600">Zaglavlja: <C>Authorization</C> i <C>Content-Type: application/json</C>. Tijelo zahtjeva:</p>
          <Table head={['Polje', 'Tip', 'Obavezno', 'Opis']}>
            {issueFields.map(([name, type, req, desc]) => (
              <tr key={name}>
                <td className="px-4 py-2"><C>{name}</C></td>
                <td className="px-4 py-2 text-slate-500">{type}</td>
                <td className="px-4 py-2 whitespace-nowrap">{req}</td>
                <td className="px-4 py-2 text-slate-600">{desc}</td>
              </tr>
            ))}
          </Table>
          <p className="text-sm text-slate-600 leading-relaxed">
            Odgovor je <strong className="text-slate-900">201</strong> za novi certifikat, ili <strong className="text-slate-900">200</strong> s <C>alreadyIssued: true</C> ako taj certifikat već postoji:
          </p>
          <Code>{issueResponse}</Code>
          <p className="text-sm text-slate-600 leading-relaxed">
            Upis na blockchain traje nekoliko sekundi, pa postavite vremensko ograničenje zahtjeva na barem 60 sekundi. <strong className="text-slate-900">Sačuvajte</strong> <C>certificateHash</C> i <C>verifyUrl</C> uz zapis u vašoj bazi: hash vam treba za status i poništavanje.
          </p>
        </section>

        {/* Lista */}
        <section className="space-y-4">
          <H2 id="lista">Lista izdatih certifikata</H2>
          <Endpoint method="GET" path="/api/v1/certificates" />
          <p className="text-sm text-slate-600">Najnoviji certifikati su prvi. Svi parametri su opcioni i pišu se u adresu (query string):</p>
          <Table head={['Parametar', 'Opis']}>
            <tr><td className="px-4 py-2"><C>limit</C></td><td className="px-4 py-2 text-slate-600">Broj rezultata po stranici, od 1 do 100. Zadano 50.</td></tr>
            <tr><td className="px-4 py-2"><C>cursor</C></td><td className="px-4 py-2 text-slate-600">Vrijednost <C>nextCursor</C> iz prethodnog odgovora, za sljedeću stranicu.</td></tr>
            <tr><td className="px-4 py-2"><C>status</C></td><td className="px-4 py-2 text-slate-600"><C>active</C>, <C>revoked</C> ili <C>expired</C>.</td></tr>
            <tr><td className="px-4 py-2"><C>email</C></td><td className="px-4 py-2 text-slate-600">Samo certifikati s tim emailom primaoca.</td></tr>
            <tr><td className="px-4 py-2"><C>identifier</C></td><td className="px-4 py-2 text-slate-600">Samo certifikati s tim identifikatorom.</td></tr>
          </Table>
          <Code>{listRequest}</Code>
          <Code>{listResponse}</Code>
          <p className="text-sm text-slate-600 leading-relaxed">
            Jedan odgovor sadrži najviše 100 certifikata, ali možete dohvatiti sve: ponavljajte zahtjev s <C>cursor</C> sve dok <C>nextCursor</C> ne bude <C>null</C> (cijeli primjer petlje je u poglavlju „Primjeri koda“).
          </p>
        </section>

        {/* Status */}
        <section className="space-y-4">
          <H2 id="status">Status jednog certifikata</H2>
          <Endpoint method="GET" path="/api/v1/certificates/{certificateHash}" />
          <p className="text-sm text-slate-600">
            Umjesto <C>{'{certificateHash}'}</C> upišite hash koji ste dobili pri izdavanju (64 znaka).
          </p>
          <Code>{statusRequest}</Code>
          <Code>{statusResponse}</Code>
          <p className="text-sm text-slate-600">Objekat certifikata (isti je i u listi):</p>
          <Code>{certObject}</Code>
          <Table head={['Polje', 'Značenje']}>
            {certFields.map(([f, d]) => (
              <tr key={f}>
                <td className="px-4 py-2"><C>{f}</C></td>
                <td className="px-4 py-2 text-slate-600">{d}</td>
              </tr>
            ))}
          </Table>
        </section>

        {/* Poništavanje */}
        <section className="space-y-4">
          <H2 id="ponistavanje">Poništavanje certifikata</H2>
          <Endpoint method="POST" path="/api/v1/certificates/{certificateHash}/revoke" />
          <p className="text-sm text-slate-600">Tijelo zahtjeva nije potrebno.</p>
          <Code>{revokeRequest}</Code>
          <Code>{revokeResponse}</Code>
          <ul className="list-disc list-inside text-sm space-y-2 text-slate-600 pl-2 leading-relaxed">
            <li>Certifikat se poništava na blockchainu i u našoj bazi, a stranica za provjeru ga odmah prikazuje kao poništenog.</li>
            <li><strong className="text-slate-900">Poništavanje je trajno</strong> i ne može se poništiti.</li>
            <li>Ako je certifikat već poništen, dobijete status 200 s <C>alreadyRevoked: true</C>.</li>
          </ul>
        </section>

        {/* Greške */}
        <section className="space-y-4">
          <H2 id="greske">Greške i ograničenja</H2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Kada nešto nije u redu, odgovor ima odgovarajući HTTP status i poruku u polju <C>error</C>:
          </p>
          <Code>{errorExample}</Code>
          <Table head={['Status', 'Značenje', 'Šta učiniti']}>
            {errors.map(([code, meaning, action]) => (
              <tr key={code}>
                <td className="px-4 py-2"><C>{code}</C></td>
                <td className="px-4 py-2 text-slate-900">{meaning}</td>
                <td className="px-4 py-2 text-slate-600">{action}</td>
              </tr>
            ))}
          </Table>
          <p className="text-sm text-slate-600">Ograničenja po ustanovi:</p>
          <ul className="list-disc list-inside text-sm space-y-1 text-slate-600 pl-2">
            <li>Izdavanje: 60 zahtjeva u minuti</li>
            <li>Lista i status: 120 zahtjeva u minuti</li>
            <li>Poništavanje: 30 zahtjeva u minuti</li>
          </ul>
          <p className="text-xs text-slate-500 leading-relaxed">
            Veći broj pogrešnih ključeva s iste IP adrese privremeno blokira daljnje pokušaje (status 429).
          </p>
        </section>

        {/* Primjeri */}
        <section className="space-y-4">
          <H2 id="primjeri">Primjeri koda</H2>
          <p className="text-sm text-slate-600">Node.js, izdavanje:</p>
          <Code>{nodeIssue}</Code>
          <p className="text-sm text-slate-600">Node.js, dohvat svih certifikata:</p>
          <Code>{nodeList}</Code>
          <p className="text-sm text-slate-600">Node.js, poništavanje:</p>
          <Code>{nodeRevoke}</Code>
          <p className="text-sm text-slate-600">Python, izdavanje:</p>
          <Code>{pythonIssue}</Code>
        </section>

        {/* FAQ */}
        <section className="space-y-4">
          <H2 id="faq">Česta pitanja</H2>
          <div className="space-y-3">
            {faq.map(([q, a]) => (
              <details key={q} className="group border border-slate-200 rounded-2xl px-5 py-4 open:bg-slate-50">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900 list-none flex items-center justify-between gap-4">
                  {q}
                  <span className="text-slate-400 group-open:rotate-45 transition text-lg leading-none">+</span>
                </summary>
                <p className="text-sm text-slate-600 leading-relaxed mt-3">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="text-sm text-slate-600 border-t border-slate-100 pt-6">
          Treba vam pomoć s integracijom? Pišite nam na{' '}
          <a href="mailto:info@diploma.ba" className="text-blue-600 hover:underline">info@diploma.ba</a>.
        </p>
      </div>
    </main>
  );
}