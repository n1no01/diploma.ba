# Diploma.ba — Zero-Trust Decentralized Certificate Issuance Platform

`diploma.ba` je  web platforma za izdavanje, upravljanje i verifikaciju akademskih i profesionalnih certifikata. Sistem kombinuje performanse relacione baze podataka (Neon PostgreSQL) sa neizmjenjivošću i sigurnošću blokčejna (Base Mainnet / Smart Contracts).

## Arhitektura
- **Frontend & Backend:** Next.js (App Router), TypeScript, Tailwind CSS.
- **Baza podataka:** Neon PostgreSQL (upravljanje metapodacima institucija i studenata).
- **Blockchain sloj:** Solidity pametni ugovor (`CertificateRegistry`) sa podrškom za pojedinačni upis i optimizovani `registerBatch` (masovno izdavanje u jednoj transakciji).
- **Kriptografija:** Deterministički kanonski SHA-256 hash algoritam za Zero-Trust verifikaciju integriteta dokumenata.

## Pokretanje projekta
1. Klonirajte repozitorijum.
2. Instalirajte zavisnosti: `npm install`
3. Podesite `.env` fajl na osnovu `.env.example`.
4. Pokrenite razvojni server: `npm run dev`