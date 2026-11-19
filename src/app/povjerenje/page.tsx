import type { Metadata } from 'next';
import Link from 'next/link';
import LegalLayout, { Section, P, UL, B, Val } from '@/app/components/LegalLayout';
import { COMPANY, LEGAL_UPDATED_TEXT } from '@/app/lib/legal';

export const metadata: Metadata = {
  title: 'Povjerenje i kontinuitet',
  description:
    'Ko stoji iza diploma.ba, kako se certifikati mogu provjeriti nezavisno od platforme, šta se dešava s podacima ako se projekat obustavi i koja su ograničenja sistema.',
};

const TOC = [
  { id: 'ko-stoji', title: 'Ko stoji iza projekta' },
  { id: 'javno', title: 'Šta je javno provjerljivo' },
  { id: 'nezavisna-provjera', title: 'Nezavisna provjera bez diploma.ba' },
  { id: 'kontinuitet', title: 'Plan ako se projekat obustavi' },
  { id: 'ogranicenja', title: 'Ograničenja sistema' },
  { id: 'sigurnost', title: 'Sigurnosne mjere' },
  { id: 'kontakt', title: 'Kontakt i prijava zloupotrebe' },
];

const VERIFY_SCRIPT = `// verify.mjs  (Node 18+, npm i ethers)
import { createHash } from 'node:crypto';
import { JsonRpcProvider, Contract } from 'ethers';

// Kanonski JSON: ključevi sortirani abecedno na svim nivoima
const canon = (v) =>
  v === null || typeof v !== 'object' ? (JSON.stringify(v) ?? 'null')
  : Array.isArray(v) ? '[' + v.map(canon).join(',') + ']'
  : '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';

// Jedan red iz JSON izvoza (Profil > Izvoz podataka)
const c = {
  institution_id: 12,
  student_name: 'Ime Prezime',
  student_email: 'polaznik@primjer.ba',
  certificate_type: 'Naziv certifikata',
  identifier: '',
  metadata: {},
};

const input = [
  c.institution_id,
  c.student_name.trim().toLowerCase(),
  c.student_email.trim().toLowerCase(),
  c.certificate_type.trim().toLowerCase(),
  (c.identifier || '').trim(),
  canon(c.metadata || {}),
].join('|');

const hash = createHash('sha256').update(input).digest('hex');

const rpc = new JsonRpcProvider('https://mainnet.base.org');
const registry = new Contract(
  'ADRESA_UGOVORA_SA_OVE_STRANICE',
  ['function verifyCertificate(string) view returns (bool isValid, bool isRevoked)'],
  rpc,
);

const [isValid, isRevoked] = await registry.verifyCertificate(hash);
console.log({ hash, isValid, isRevoked });`;

export default function PovjerenjePage() {
  const contract = process.env.CONTRACT_ADDRESS;

  return (
    <LegalLayout
      title="Povjerenje i kontinuitet"
      badge="Transparentnost"
      showVersion={false}
      updated={LEGAL_UPDATED_TEXT}
      currentHref="/povjerenje"
      toc={TOC}
      summary={[
        'Znate ko stoji iza platforme i kako nas kontaktirati.',
        'Zapisi na blockchainu su javni i čitljivi bez diploma.ba.',
        'Ustanove u svakom trenutku mogu izvesti sve svoje podatke i certifikate provjeriti nezavisno od nas.',
        'Ako se projekat obustavi, ustanove dobijaju najmanje 90 dana obavještenja.',
        'Jasno navodimo šta provjera potvrđuje, a šta ne.',
      ]}
    >
      <Section id="ko-stoji" title="1. Ko stoji iza projekta">
        <UL>
          <li><B>Pružalac:</B> <Val value={COMPANY.name} /></li>
          <li><B>Pravni status:</B> <Val value={COMPANY.registration} /></li>
          <li><B>Mjesto:</B> <Val value={COMPANY.address} /></li>
          <li><B>Osnivač:</B> <Val value={COMPANY.founder} /></li>
          <li>
            <B>E-mail:</B>{' '}
            <a href={`mailto:${COMPANY.email}`} className="text-blue-600 hover:underline">{COMPANY.email}</a>
          </li>
        </UL>
      </Section>

      <Section id="javno" title="2. Šta je javno provjerljivo">
        <UL>
          <li><B>Mreža:</B> Base (Ethereum L2), javni blockchain.</li>
          <li>
            <B>Adresa pametnog ugovora:</B>{' '}
            {contract ? (
              <a
                href={`https://basescan.org/address/${contract}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all font-mono text-xs"
              >
                {contract}
              </a>
            ) : (
              <span className="text-slate-500">bit će objavljena</span>
            )}
          </li>
          <li>
            <B>Šta se upisuje:</B> samo kriptografski hash (SHA-256) certifikata. Ugovor bilježi je li hash važeći i je li opozvan.
          </li>
          <li>
            <B>Kako se hash računa:</B> SHA-256 nad nizom{' '}
            <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              ID_ustanove|ime|e-mail|vrsta|identifikator|metapodaci
            </code>
            , gdje se ime, e-mail i vrsta prethodno skrate i pretvore u mala slova, identifikator se samo skrati, a metapodaci su JSON
            s abecedno sortiranim ključevima na svim nivoima (prazni metapodaci su <code className="text-xs bg-slate-100 px-1 rounded">{'{}'}</code>).
            Rezultat je heksadecimalni zapis od 64 znaka.
          </li>
        </UL>
      </Section>

      <Section id="nezavisna-provjera" title="3. Nezavisna provjera bez diploma.ba">
        <P>
          Ustanova može iz sekcije <B>Profil &rarr; Izvoz podataka</B> preuzeti JSON sa svim certifikatima i poljima iz kojih se hash
          računa. S njim se svaki certifikat može provjeriti direktno na blockchainu, bez našeg servera, npr. ovom skriptom:
        </P>
        <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto text-[11px] leading-relaxed">{VERIFY_SCRIPT}</pre>
        <P>
          Izvoz sadrži i polje <code className="text-xs bg-slate-100 px-1 rounded">hash_matches</code> koje pokazuje poklapa li se
          izračunati hash s onim koji je zapisan pri izdavanju.
        </P>
      </Section>

      <Section id="kontinuitet" title="4. Plan ako se projekat obustavi">
        <P>Obavezujemo se na sljedeće:</P>
        <UL>
          <li>
            <B>Zapisi ostaju.</B> Hashevi upisani na Base mrežu ostaju trajno i čitljivi, nezavisno od diploma.ba.
          </li>
          <li>
            <B>Izvoz u svakom trenutku.</B> Svaka ustanova može sama izvesti sve svoje certifikate (CSV ili JSON) iz profila.
          </li>
          <li>
            <B>Javna specifikacija.</B> Algoritam hasha i primjer provjere objavljeni su na ovoj stranici, pa se certifikati mogu provjeriti i
            bez nas.
          </li>
          <li>
            <B>Najava gašenja.</B> Ako odlučimo obustaviti projekat, ustanove obavještavamo e-mailom najmanje 90 dana unaprijed. U tom
            periodu platforma radi i izvoz ostaje dostupan.
          </li>
          <li>
            <B>Moguće preuzimanje.</B> Pametni ugovor ima funkciju prenosa vlasništva, pa se projekat može predati nasljedniku. Ako se
            to desi, ustanove će biti obaviještene o novom pružaocu i uslovima.
          </li>
          <li>
            <B>Brisanje podataka.</B> Nakon završetka perioda obavještenja podaci se brišu iz baze u skladu s{' '}
            <Link href="/ugovor-o-obradi-podataka" className="text-blue-600 hover:underline">Ugovorom o obradi podataka</Link>.
          </li>
        </UL>
        <P>
          Zato preporučujemo ustanovama da izvoz podataka povremeno sačuvaju na svom računaru, jer je to jedini način da certifikate
          mogu provjeriti nezavisno od platforme.
        </P>
      </Section>

      <Section id="ogranicenja" title="5. Ograničenja sistema">
        <UL>
          <li>
            Provjera potvrđuje da zapis nije mijenjan i da ga je izdao nalog ustanove na platformi. <B>Ne potvrđuje</B> da je ustanova
            akreditovana niti da je sadržaj certifikata istinit.
          </li>
          <li>
            Odobravanje ustanova je ručno i zasniva se na dostavljenim podacima. Ne zamjenjuje pravnu provjeru ustanove.
          </li>
          <li>
            Zapis na blockchainu se ne može obrisati. Greške se ispravljaju opozivom i novim izdavanjem, a opoziv je trajan.
          </li>
          <li>Upis na blockchain obavlja servis platforme u ime ustanove, pa rad izdavanja ovisi o dostupnosti naših servera.</li>
        </UL>
      </Section>

      <Section id="sigurnost" title="6. Sigurnosne mjere">
        <UL>
          <li>Dvostepena provjera prijave (kod na e-mail), dostupna svakoj ustanovi.</li>
          <li>Lozinke i API ključevi ne čuvaju se u čitljivom obliku.</li>
          <li>Ograničenje broja pokušaja prijave, oporavka linkova i API zahtjeva.</li>
          <li>Javna provjera ne prikazuje e-mail adresu polaznika.</li>
        </UL>
        <P>
          Detaljniji opis nalazi se u{' '}
          <Link href="/ugovor-o-obradi-podataka#prilog-3" className="text-blue-600 hover:underline">Prilogu 3 Ugovora o obradi podataka</Link>.
        </P>
      </Section>

      <Section id="kontakt" title="7. Kontakt i prijava zloupotrebe">
        <P>
          Pitanja, zahtjevi i prijave lažnih certifikata ili ustanova:{' '}
          <a href={`mailto:${COMPANY.email}`} className="text-blue-600 hover:underline">{COMPANY.email}</a>.
        </P>
      </Section>
    </LegalLayout>
  );
}
