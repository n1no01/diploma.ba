// Jedino mjesto za pravne podatke i verziju uslova.
// Sve vrijednosti koje počinju s "[POPUNITI" prikazuju se na stranicama žuto istaknute
// i MORAJU se zamijeniti stvarnim podacima prije javnog objavljivanja.
//
// Ova datoteka mora ostati bez uvoza (koristi se i u middleware-u).

// Verzija pravnih dokumenata. Kad se uslovi ili ugovor o obradi bitno promijene:
//   1) promijenite ovu vrijednost (npr. '2027-03-01'),
//   2) sve ustanove će pri sljedećoj prijavi morati ponovo prihvatiti dokumente.
export const TERMS_VERSION = '2026-11-18';
export const LEGAL_UPDATED_TEXT = 'Novembar 2026.';

export const COMPANY = {
  name: 'Nino Herenda, fizičko lice (nosilac projekta diploma.ba)',
  registration: 'projekat nije registrovan kao pravno lice ili obrt',
  address: 'Sarajevo, Bosna i Hercegovina',
  founder: 'Nino Herenda',
  court: 'Sarajevo',
  email: 'info@diploma.ba',
} as const;

export interface Subprocessor {
  name: string;
  purpose: string;
  data: string;
  location: string;
}

// Podobrađivači (treće strane koje obrađuju podatke u naše ime).
// Lokacije provjerite u postavkama svakog servisa i upišite stvarne vrijednosti.
export const SUBPROCESSORS: Subprocessor[] = [
  {
    name: 'Neon (PostgreSQL baza podataka)',
    purpose: 'Pohrana podataka o ustanovama i izdatim certifikatima',
    data: 'Svi podaci iz Priloga 1',
    location: 'AWS Europe Central 1 (Frankfurt)',
  },
  {
    name: 'Vercel',
    purpose: 'Hosting aplikacije',
    data: 'Podaci koji prolaze kroz aplikaciju (tehnički zapisi, IP adrese)',
    location: 'Frankfurt, Germany (West) - eu-central-1 - fra1',
  },
  {
    name: 'Resend',
    purpose: 'Slanje e-mail poruka (certifikati, verifikacija, obavještenja)',
    data: 'E-mail adresa i ime primaoca, sadržaj poruke',
    location: 'Ireland (eu-west-1)',
  },
  {
    name: 'Google (prijava putem Google računa, opcionalno)',
    purpose: 'Prijava ustanova putem Google računa',
    data: 'Ime i e-mail adresa naloga ustanove',
    location: 'Prema uslovima Google-a',
  },
  {
    name: 'Base javni RPC (mainnet.base.org)',
    purpose: 'Slanje transakcija i čitanje zapisa s blockchaina',
    data: 'Samo kriptografski hash (bez ličnih podataka)',
    location: 'Javna infrastruktura, bez ličnih podataka',
  },
];
