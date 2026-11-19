import type { Metadata } from 'next';
import Link from 'next/link';
import LegalLayout, { Section, P, UL, B, Val } from '@/app/components/LegalLayout';
import { COMPANY, LEGAL_UPDATED_TEXT } from '@/app/lib/legal';

export const metadata: Metadata = {
  title: 'Uslovi korištenja',
  description:
    'Uslovi korištenja platforme diploma.ba za izdavanje i provjeru digitalnih certifikata: obaveze ustanova, šta provjera potvrđuje, opoziv i odgovornost.',
};

const TOC = [
  { id: 'o-nama', title: 'Ko pruža uslugu' },
  { id: 'korisnici', title: 'Ko može koristiti platformu' },
  { id: 'nalog', title: 'Nalog ustanove' },
  { id: 'obaveze', title: 'Obaveze ustanove' },
  { id: 'sta-potvrdjujemo', title: 'Šta provjera potvrđuje, a šta ne' },
  { id: 'blockchain', title: 'Blockchain zapis, opoziv i ispravke' },
  { id: 'koristenje', title: 'Dozvoljena upotreba i API' },
  { id: 'cijena', title: 'Cijena' },
  { id: 'dostupnost', title: 'Dostupnost i kontinuitet' },
  { id: 'odgovornost', title: 'Odgovornost' },
  { id: 'prestanak', title: 'Prestanak korištenja i suspenzija' },
  { id: 'izmjene', title: 'Izmjene uslova' },
  { id: 'pravo', title: 'Mjerodavno pravo' },
  { id: 'kontakt', title: 'Kontakt' },
];

export default function UsloviKoristenjaPage() {
  return (
    <LegalLayout
      title="Uslovi korištenja"
      updated={LEGAL_UPDATED_TEXT}
      currentHref="/uslovi-koristenja"
      toc={TOC}
      summary={[
        'diploma.ba je alat za izdavanje i provjeru digitalnih certifikata. Ne zamjenjuje službene dokumente i ne garantuje tačnost podataka koje unese ustanova.',
        'Ustanova odgovara za tačnost podataka i za pravni osnov da podatke svojih polaznika obrađuje putem platforme.',
        'Na blockchain se upisuje samo kriptografski otisak (hash). Upisani zapis i opoziv su trajni.',
        'Izdavanje i provjera certifikata su besplatni.',
        'Ako se uslovi bitno promijene, obavijestit ćemo vas unaprijed.',
      ]}
    >
      <Section id="o-nama" title="1. Ko pruža uslugu">
        <P>
          Platformu diploma.ba (u daljem tekstu: <B>platforma</B>) pruža <B><Val value={COMPANY.name} /></B> (<Val value={COMPANY.registration} />), s kontakt adresom u mjestu <Val value={COMPANY.address} /> (u daljem tekstu:{' '}
          <B>pružalac</B>, <B>mi</B>). Platforma omogućava ustanovama (školama, akademijama, centrima za obuku, fakultetima i
          sličnim izdavaocima) da izdaju digitalne certifikate, a svakome da provjeri njihovu autentičnost.
        </P>
        <P>
          Korištenjem platforme, odnosno registracijom ustanove, prihvatate ove Uslove, <Link href="/ugovor-o-obradi-podataka" className="text-blue-600 hover:underline">Ugovor o obradi podataka</Link> i{' '}
          <Link href="/politika-privatnosti" className="text-blue-600 hover:underline">Politiku privatnosti</Link>.
        </P>
      </Section>

      <Section id="korisnici" title="2. Ko može koristiti platformu">
        <UL>
          <li>
            <B>Ustanove</B> koje izdaju certifikate. Potreban je nalog koji naš administrator odobri. Odobrenje ne znači da smo
            pravno provjerili ustanovu niti jamčimo za nju.
          </li>
          <li>
            <B>Poslodavci, polaznici i javnost</B> mogu provjeriti certifikat bez naloga, pomoću linka ili koda certifikata.
          </li>
        </UL>
      </Section>

      <Section id="nalog" title="3. Nalog ustanove">
        <UL>
          <li>Podaci pri registraciji moraju biti tačni, a osoba koja registruje ustanovu mora biti ovlaštena da to učini.</li>
          <li>
            Ustanova čuva lozinku, pristup e-mail adresi, API ključ i (ako je uključena) dvostepenu provjeru te odgovara za sve radnje
            izvršene preko svog naloga. Ako posumnjate u zloupotrebu, odmah nas obavijestite i promijenite lozinku ili opozovite API ključ.
          </li>
          <li>
            Zadržavamo pravo da odbijemo registraciju ili zatražimo dodatnu potvrdu identiteta ustanove prije odobrenja.
          </li>
        </UL>
      </Section>

      <Section id="obaveze" title="4. Obaveze ustanove">
        <UL>
          <li>Izdavati certifikate samo osobama koje su ih stvarno stekle i samo u ime ustanove koju zastupate.</li>
          <li>Unositi tačne podatke (ime i prezime, e-mail, naziv i identifikator certifikata, datum isteka).</li>
          <li>
            Imati pravni osnov za obradu podataka svojih polaznika, obavijestiti ih da se njihovi podaci obrađuju putem platforme i
            odgovarati na njihove zahtjeve. U odnosu na te podatke ustanova je voditelj obrade, a mi smo izvršilac (vidi{' '}
            <Link href="/ugovor-o-obradi-podataka" className="text-blue-600 hover:underline">Ugovor o obradi podataka</Link>).
          </li>
          <li>Ne unositi posebne kategorije ličnih podataka (npr. zdravstvene ili vjerske podatke) u polja certifikata.</li>
          <li>Ne izdavati lažne, obmanjujuće ili protivpravne dokumente.</li>
        </UL>
      </Section>

      <Section id="sta-potvrdjujemo" title="5. Šta provjera potvrđuje, a šta ne">
        <P>
          Kad se certifikat provjeri, platforma potvrđuje da za njega postoji zapis (kriptografski otisak) na blockchainu, da se
          podaci u našoj bazi poklapaju s tim otiskom i da certifikat nije opozvan ni istekao.
        </P>
        <P>
          Provjera <B>ne potvrđuje</B> da je ustanova akreditovana ili ovlaštena za izdavanje određene vrste dokumenta, da je
          sadržaj certifikata istinit, niti da certifikat zamjenjuje službenu diplomu ili drugi dokument propisan zakonom. Za to
          odgovara ustanova koja certifikat izdaje.
        </P>
      </Section>

      <Section id="blockchain" title="6. Blockchain zapis, opoziv i ispravke">
        <UL>
          <li>
            Na javni blockchain (Base) upisuje se isključivo kriptografski hash certifikata, bez čitljivih ličnih podataka. Taj zapis
            se tehnički ne može izmijeniti ni obrisati.
          </li>
          <li>
            <B>Opoziv je trajan.</B> Opozvani certifikat je na lancu označen kao opozvan i ne može se ponovo aktivirati. Opoziv ne
            briše podatke iz baze.
          </li>
          <li>
            <B>Ispravke.</B> Ako je pri izdavanju napravljena greška, certifikat se opoziva i izdaje novi s ispravnim podacima.
          </li>
          <li>
            Na zahtjev ustanove ili polaznika podatke u našoj bazi možemo obrisati ili anonimizirati u skladu s važećim propisima.
            Nakon brisanja, detalji certifikata se više ne mogu prikazati pri provjeri, a hash na blockchainu ostaje.
          </li>
          <li>Transakcijske naknade (gas) za upis na blockchain snosi pružalac.</li>
        </UL>
      </Section>

      <Section id="koristenje" title="7. Dozvoljena upotreba i API">
        <UL>
          <li>
            API pristup namijenjen je automatskom izdavanju certifikata ustanove. Ključ se čuva samo na serveru ustanove i ne dijeli se
            s trećim stranama.
          </li>
          <li>Primjenjuju se ograničenja broja zahtjeva navedena u dokumentaciji (/docs). Zloupotreba može dovesti do blokade.</li>
          <li>
            Zabranjeno je: pokušaj neovlaštenog pristupa, ometanje rada platforme, masovno prikupljanje podataka, lažno predstavljanje i
            korištenje platforme u protivpravne svrhe.
          </li>
        </UL>
      </Section>

      <Section id="cijena" title="8. Cijena">
        <P>
          Izdavanje i provjera certifikata na platformi su besplatni. Ako u budućnosti uvedemo plaćene dodatne funkcije, postojeće
          besplatne funkcije i već izdati certifikati ostaju dostupni, a o novim uslovima obavijestit ćemo vas unaprijed.
        </P>
      </Section>

      <Section id="dostupnost" title="9. Dostupnost i kontinuitet">
        <P>
          Platformu pružamo „kako jeste“, bez garancije neprekidnog rada. Možemo privremeno obustaviti rad zbog održavanja ili
          sigurnosnih razloga. Šta se dešava s vašim podacima ako se projekat obustavi (izvoz podataka, rok obavještenja, nezavisna
          provjera) opisano je na stranici{' '}
          <Link href="/povjerenje" className="text-blue-600 hover:underline">Povjerenje i kontinuitet</Link>.
        </P>
      </Section>

      <Section id="odgovornost" title="10. Odgovornost">
        <UL>
          <li>Ne odgovaramo za sadržaj i tačnost certifikata koje izdaju ustanove niti za odluke koje treće strane donesu na osnovu njih.</li>
          <li>
            U granicama koje dozvoljava zakon, naša odgovornost za štetu nastalu korištenjem besplatne usluge ograničena je na
            direktnu štetu, osim u slučaju namjere ili grube nepažnje. Ovo ograničenje ne isključuje odgovornost koja se po zakonu
            ne može isključiti.
          </li>
          <li>Ne odgovaramo za prekide ili greške javnih blockchain mreža i usluga trećih strana na koje ne možemo utjecati.</li>
        </UL>
      </Section>

      <Section id="prestanak" title="11. Prestanak korištenja i suspenzija">
        <UL>
          <li>
            Ustanova može u svakom trenutku prestati koristiti platformu. Prije zatvaranja naloga može izvesti sve svoje podatke iz
            sekcije Profil.
          </li>
          <li>
            Možemo suspendovati ili zatvoriti nalog koji krši ove Uslove, ugrožava sigurnost ili se koristi za izdavanje lažnih dokumenata,
            uz obavijest ustanovi kad je to moguće.
          </li>
          <li>Već izdati certifikati ostaju zabilježeni na blockchainu i nakon prestanka korištenja.</li>
        </UL>
      </Section>

      <Section id="izmjene" title="12. Izmjene uslova">
        <P>
          Uslove možemo mijenjati. O bitnim izmjenama obavijestit ćemo ustanove e-mailom najmanje 30 dana unaprijed, a pri prvoj
          prijavi nakon izmjene tražit ćemo ponovno prihvatanje. Datum i verzija dokumenta navedeni su na vrhu stranice.
        </P>
      </Section>

      <Section id="pravo" title="13. Mjerodavno pravo">
        <P>
          Na ove Uslove primjenjuje se pravo Bosne i Hercegovine. Sporove nastojimo riješiti sporazumno; ako to nije moguće, nadležan je
          sud u <Val value={COMPANY.court} />.
        </P>
      </Section>

      <Section id="kontakt" title="14. Kontakt">
        <P>
          Pitanja, zahtjevi i prijave zloupotrebe:{' '}
          <a href={`mailto:${COMPANY.email}`} className="text-blue-600 hover:underline">{COMPANY.email}</a>.
        </P>
      </Section>
    </LegalLayout>
  );
}
