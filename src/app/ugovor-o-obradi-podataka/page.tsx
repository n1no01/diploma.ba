import type { Metadata } from 'next';
import Link from 'next/link';
import LegalLayout, { Section, P, UL, B, Val } from '@/app/components/LegalLayout';
import { COMPANY, LEGAL_UPDATED_TEXT, SUBPROCESSORS } from '@/app/lib/legal';

export const metadata: Metadata = {
  title: 'Ugovor o obradi podataka',
  description:
    'Ugovor o obradi ličnih podataka između ustanove (voditelj obrade) i diploma.ba (izvršilac obrade): vrste podataka, mjere zaštite, podobrađivači i prava polaznika.',
};

const TOC = [
  { id: 'strane', title: 'Strane i uloge' },
  { id: 'predmet', title: 'Predmet, svrha i trajanje' },
  { id: 'uputstva', title: 'Uputstva voditelja obrade' },
  { id: 'povjerljivost', title: 'Povjerljivost' },
  { id: 'mjere', title: 'Mjere zaštite' },
  { id: 'podobradjivaci', title: 'Podobrađivači' },
  { id: 'prenos', title: 'Prenos podataka van BiH i EU' },
  { id: 'prava', title: 'Prava polaznika' },
  { id: 'povrede', title: 'Povreda podataka' },
  { id: 'prestanak', title: 'Prestanak saradnje i brisanje' },
  { id: 'odgovornost', title: 'Odgovornost i prednost dokumenata' },
  { id: 'prilog-1', title: 'Prilog 1: podaci i kategorije osoba' },
  { id: 'prilog-2', title: 'Prilog 2: podobrađivači' },
  { id: 'prilog-3', title: 'Prilog 3: tehničke i organizacione mjere' },
];

const th = 'text-left text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 px-3 py-2 border border-slate-200';
const td = 'align-top text-sm text-slate-600 px-3 py-2 border border-slate-200';

export default function UgovorOObradiPage() {
  return (
    <LegalLayout
      title="Ugovor o obradi podataka"
      updated={LEGAL_UPDATED_TEXT}
      currentHref="/ugovor-o-obradi-podataka"
      toc={TOC}
      summary={[
        'Ustanova je voditelj obrade podataka svojih polaznika, a diploma.ba je izvršilac koji ih obrađuje samo za izdavanje, slanje i provjeru certifikata.',
        'Podatke obrađujemo samo po uputama ustanove (forma, CSV, API) i ne koristimo ih u druge svrhe.',
        'Na blockchain ide samo kriptografski otisak, ne čitljivi lični podaci.',
        'Navodimo koje treće strane koristimo (podobrađivači) i obavještavamo o promjenama.',
        'O povredi podataka obavještavamo bez nepotrebnog odlaganja, a najkasnije u roku od 72 sata od saznanja.',
        'Ustanova u svakom trenutku može izvesti sve svoje podatke iz profila.',
      ]}
    >
      <Section id="strane" title="1. Strane i uloge">
        <P>
          Ovaj ugovor zaključuju <B>ustanova</B> koja se registrovala na platformi diploma.ba (u daljem tekstu: <B>voditelj obrade</B>)
          i <B><Val value={COMPANY.name} /></B> (<Val value={COMPANY.registration} />), s kontakt adresom u mjestu{' '}
          <Val value={COMPANY.address} /> (u daljem tekstu: <B>izvršilac obrade</B>).
        </P>
        <P>
          Ugovor se zaključuje elektronskim prihvatanjem pri registraciji (ili pri prvoj prijavi nakon objave nove verzije) i važi dok
          ustanova koristi platformu. U odnosu na lične podatke polaznika koje ustanova unosi na platformu, ustanova je voditelj
          obrade, a mi smo izvršilac. U odnosu na podatke o samoj ustanovi i njenim korisničkim nalozima mi smo samostalni voditelj
          obrade, kako je opisano u{' '}
          <Link href="/politika-privatnosti" className="text-blue-600 hover:underline">Politici privatnosti</Link>.
        </P>
      </Section>

      <Section id="predmet" title="2. Predmet, svrha i trajanje">
        <P>
          Izvršilac obrađuje podatke polaznika isključivo u svrhu: izdavanja digitalnih certifikata u ime ustanove, slanja certifikata
          i obavještenja polaznicima, omogućavanja provjere autentičnosti certifikata te oporavka linka certifikata na zahtjev
          polaznika. Obrada traje dok je nalog ustanove aktivan, a nakon toga do brisanja u skladu s tačkom 10.
        </P>
        <P>
          Vrste podataka i kategorije osoba navedene su u <a href="#prilog-1" className="text-blue-600 hover:underline">Prilogu 1</a>.
        </P>
      </Section>

      <Section id="uputstva" title="3. Uputstva voditelja obrade">
        <UL>
          <li>
            Izvršilac obrađuje podatke samo na osnovu dokumentovanih uputstava voditelja. Uputstvom se smatraju radnje koje ustanova
            izvrši putem forme za izdavanje, CSV uvoza, API-ja, opoziva i izvoza podataka, te ovaj ugovor.
          </li>
          <li>
            Ako izvršilac smatra da neko uputstvo krši propise o zaštiti podataka, obavijestit će voditelja prije izvršenja.
          </li>
          <li>Voditelj odgovara da ima pravni osnov za obradu i da je obavijestio polaznike o obradi putem platforme.</li>
        </UL>
      </Section>

      <Section id="povjerljivost" title="4. Povjerljivost">
        <P>
          Izvršilac osigurava da su osobe koje imaju pristup podacima obavezane na povjerljivost i da im pristupaju samo koliko je
          potrebno za pružanje usluge.
        </P>
      </Section>

      <Section id="mjere" title="5. Mjere zaštite">
        <P>
          Izvršilac primjenjuje tehničke i organizacione mjere navedene u{' '}
          <a href="#prilog-3" className="text-blue-600 hover:underline">Prilogu 3</a> i održava ih primjerenim riziku. Mjere se mogu
          mijenjati, ali se razina zaštite ne smije smanjiti.
        </P>
      </Section>

      <Section id="podobradjivaci" title="6. Podobrađivači">
        <UL>
          <li>
            Voditelj daje opće odobrenje za angažovanje podobrađivača navedenih u{' '}
            <a href="#prilog-2" className="text-blue-600 hover:underline">Prilogu 2</a>.
          </li>
          <li>
            O dodavanju ili zamjeni podobrađivača izvršilac obavještava voditelja e-mailom najmanje 30 dana unaprijed. Voditelj može
            uložiti prigovor; ako se ne mogu usaglasiti, voditelj može prestati koristiti platformu i izvesti podatke.
          </li>
          <li>Izvršilac s podobrađivačima ugovara obaveze zaštite podataka koje su u suštini jednake ovima.</li>
        </UL>
      </Section>

      <Section id="prenos" title="7. Prenos podataka van BiH i EU">
        <P>
          Ako se podaci obrađuju kod podobrađivača izvan Bosne i Hercegovine i Evropskog ekonomskog prostora, izvršilac osigurava
          primjerene zaštitne mjere u skladu s važećim propisima (npr. standardne ugovorne klauzule). Lokacije obrade navedene su u
          Prilogu 2.
        </P>
      </Section>

      <Section id="prava" title="8. Prava polaznika">
        <UL>
          <li>
            Izvršilac pomaže voditelju da odgovori na zahtjeve polaznika (uvid, ispravka, brisanje, prigovor). Ako polaznik izvršiocu
            direktno uputi zahtjev, izvršilac će ga proslijediti voditelju, osim ako zakon nalaže drugačije.
          </li>
          <li>
            Ispravka podataka vrši se opozivom i novim izdavanjem certifikata. Na zahtjev voditelja podaci u bazi se brišu ili
            anonimiziraju.
          </li>
          <li>
            Kriptografski otisak (hash) upisan na blockchain ne može se izmijeniti ni obrisati. Iz njega se ne mogu direktno pročitati
            lični podaci, ali ga je moguće ponovo izračunati ko god zna tačne ulazne podatke. Voditelj je upoznat s tom činjenicom.
          </li>
        </UL>
      </Section>

      <Section id="povrede" title="9. Povreda podataka">
        <P>
          Izvršilac obavještava voditelja bez nepotrebnog odlaganja, a najkasnije u roku od 72 sata od saznanja o povredi ličnih
          podataka, i dostavlja informacije potrebne da voditelj ispuni svoje obaveze (priroda povrede, kategorije podataka,
          vjerovatne posljedice, poduzete mjere).
        </P>
      </Section>

      <Section id="prestanak" title="10. Prestanak saradnje i brisanje">
        <UL>
          <li>
            Voditelj u svakom trenutku može izvesti sve svoje podatke (CSV ili JSON) iz sekcije Profil, i to prije zatvaranja naloga.
          </li>
          <li>
            Nakon zatvaranja naloga ili na pisani zahtjev izvršilac briše podatke polaznika iz baze u roku od 90 dana, osim ako zakon
            zahtijeva drugačije. Sigurnosne kopije se brišu u okviru redovnog ciklusa.
          </li>
          <li>
            Ako se projekat obustavi, primjenjuje se postupak opisan na stranici{' '}
            <Link href="/povjerenje" className="text-blue-600 hover:underline">Povjerenje i kontinuitet</Link>.
          </li>
        </UL>
      </Section>

      <Section id="odgovornost" title="11. Odgovornost i prednost dokumenata">
        <P>
          Za pitanja obrade ličnih podataka ovaj ugovor ima prednost nad{' '}
          <Link href="/uslovi-koristenja" className="text-blue-600 hover:underline">Uslovima korištenja</Link>. Odgovornost strana
          određuje se prema važećim propisima i Uslovima korištenja. Voditelj obrade može na obrazložen zahtjev dobiti informacije
          potrebne da provjeri poštovanje ovog ugovora.
        </P>
      </Section>

      <Section id="prilog-1" title="Prilog 1: podaci i kategorije osoba">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Kategorija osoba</th>
                <th className={th}>Vrste podataka</th>
                <th className={th}>Svrha</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={td}>Polaznici / nosioci certifikata</td>
                <td className={td}>
                  Ime i prezime, e-mail adresa, naziv i vrsta certifikata, identifikator (npr. broj indeksa), datum izdavanja i isteka,
                  dodatna polja koja ustanova unese (metapodaci)
                </td>
                <td className={td}>Izdavanje, slanje i provjera certifikata, oporavak linka</td>
              </tr>
              <tr>
                <td className={td}>Korisnici naloga ustanove</td>
                <td className={td}>E-mail adresa, naziv ustanove, tehnički podaci o prijavi</td>
                <td className={td}>Pristup nalogu i sigurnost (opisano u Politici privatnosti)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <P>
          Posebne kategorije ličnih podataka (npr. zdravstveni podaci) ne smiju se unositi u polja certifikata.
        </P>
      </Section>

      <Section id="prilog-2" title="Prilog 2: podobrađivači">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Podobrađivač</th>
                <th className={th}>Svrha</th>
                <th className={th}>Podaci</th>
                <th className={th}>Lokacija</th>
              </tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.map((s) => (
                <tr key={s.name}>
                  <td className={td}><Val value={s.name} /></td>
                  <td className={td}>{s.purpose}</td>
                  <td className={td}>{s.data}</td>
                  <td className={td}><Val value={s.location} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="prilog-3" title="Prilog 3: tehničke i organizacione mjere">
        <UL>
          <li>Na javni blockchain upisuje se samo kriptografski hash, bez čitljivih ličnih podataka.</li>
          <li>Lozinke se čuvaju kao kriptografski hash, a API ključevi se u bazi čuvaju samo kao hash i prikazuju se jednom.</li>
          <li>Dvostepena provjera prijave (kod na e-mail) dostupna je svakoj ustanovi.</li>
          <li>Ograničenje broja pokušaja prijave i zahtjeva (rate limiting) za prijavu, oporavak linkova i API.</li>
          <li>Pristup podacima ograničen je po ustanovi: ustanova vidi i izvozi samo vlastite certifikate.</li>
          <li>Javna provjera ne prikazuje e-mail adresu polaznika ni interne identifikatore.</li>
          <li>Pristup administraciji platforme ograničen je na ovlaštene osobe.</li>
        </UL>
      </Section>
    </LegalLayout>
  );
}
