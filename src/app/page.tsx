'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface FAQItem {
  question: string;
  answer: string;
}

export default function Home() {
  const [stats, setStats] = useState({ totalCertificates: 0, totalInstitutions: 0 });
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const DONATION_ADDRESS = "0xECfD49F28c2437023ED9A1978Eb58D878942f2De";

  const handleCopy = () => {
    navigator.clipboard.writeText(DONATION_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.success) {
          setStats({
            totalCertificates: data.totalCertificates,
            totalInstitutions: data.totalInstitutions,
          });
        }
      } catch (err) {
        console.error('Neuspješno učitavanje statistike');
      }
    }
    fetchStats();
  }, []);

  const faqData: FAQItem[] = [
    {
      question: 'Ko može izdavati certifikate?',
      answer: 'Samo registrovane i od strane administratora odobrene ustanove, škole i centri za obuku mogu kreirati naloge i izdavati dokumente.',
    },
    {
      question: 'Da li je potrebna kriptovaluta za korištenje?',
      answer: 'Ne. Institucije koriste platformu jednostavno kroz web formu, dok sistem automatski upravlja blockchain transakcijama u pozadini.',
    },
    {
      question: 'Šta ako polaznik izgubi link?',
      answer: 'Na stranici Provjera polaznik može unijeti svoj e-mail i dobiti sve svoje verifikacijske linkove.',
    },
    {
      question: 'Može li se certifikat opozvati?',
      answer: 'Da. Institucija može opozvati certifikat u bilo kojem trenutku, a provjera tada trenutno prikazuje da više nije važeći i na blockchainu i u bazi.',
    },
    {
      question: 'Koliko košta korištenje aplikacije?',
      answer: 'Platforma je besplatna za sve korisnike. Troškove transakcija na blockchainu pokrivamo mi, a donacije su dobrodošle.',
    },
    {
      question: 'Koji se podaci čuvaju?',
      answer: 'Ime, e-mail, naziv certifikata i identifikator čuvamo u bazi, a na blockchain ide samo kriptografski otisak. Detalji su u Politici privatnosti.',
    },
  ];

  return (
    <main className="max-w-6xl mx-auto px-6 py-20 flex flex-col items-center text-center">
      
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-8 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
        Provjerljivi certifikati za škole i centre za obuku
      </div>

      {/* Glavni naslov */}
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl leading-tight">
        Verifikacija diploma i certifikata u jednoj sekundi.
      </h1>

      {/* Opis */}
      <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
        diploma.ba pomaže akademijama, centrima za obuku i školama stranih jezika da izdaju digitalne certifikate. Poslodavac ih provjeri jednim klikom, a svaka izmjena podataka se odmah otkriva.
      </p>

      {/* Akcijska dugmad */}
      <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link
          href="/verifikuj"
          className="px-8 py-4 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] text-center"
        >
          Provjeri certifikat
        </Link>
        <Link
          href="/izdavanje"
          className="px-8 py-4 rounded-xl font-semibold bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 transition-all hover:scale-[1.02] text-center shadow-2xs"
        >
          Za institucije: počni izdavati
        </Link>
      </div>

      {/* Dinamička Statistika iz Baze */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full mt-24 py-10 px-8 rounded-3xl bg-white border border-slate-200 backdrop-blur-md text-center shadow-xl">
        <div>
          <p className="text-3xl font-extrabold text-blue-600">{stats.totalCertificates}</p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Izdatih certifikata</p>
        </div>
        <div>
          <p className="text-3xl font-extrabold text-blue-600">{stats.totalInstitutions}</p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Registrovanih ustanova</p>
        </div>
        <div>
          <p className="text-3xl font-extrabold text-blue-600">100%</p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Blockchain sigurnost</p>
        </div>
        <div>
          <p className="text-3xl font-extrabold text-blue-600">&lt; 1s</p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Brzina provjere</p>
        </div>
      </section>

      {/* Kratki vodič za korisnike */}
      <section id="kako-radi" className="w-full mt-24 text-left scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Kako provjeriti certifikat u 3 koraka</h2>
          <p className="text-slate-600 text-sm mt-2">Svaki certifikat ima jedinstveni kod. Nema pretrage po imenu, podaci se vide samo uz taj kod.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <article className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-blue-600 font-bold text-lg">01. Otvori link iz maila</span>
            <p className="text-sm text-slate-600 mt-2">Polaznik dobija verifikacijski link u e-mailu i može ga proslijediti poslodavcu.</p>
          </article>
          <article className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-blue-600 font-bold text-lg">02. Ili zalijepi kod</span>
            <p className="text-sm text-slate-600 mt-2">Ako nemaš link, upiši kod certifikata na stranici Provjera. Registracija nije potrebna.</p>
          </article>
          <article className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-blue-600 font-bold text-lg">03. Odmah vidiš rezultat</span>
            <p className="text-sm text-slate-600 mt-2">Vidiš ko je izdao certifikat, kome, kada i da li je još važeći. Podaci se uparuju s javnim zapisom na blockchainu.</p>
          </article>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="prednosti" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left w-full scroll-mt-24">
        <article className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold mb-5">
            01
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Izmjene se otkrivaju</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Svaki certifikat ima kriptografski otisak. Ako se podaci promijene, provjera to odmah pokaže.
          </p>
        </article>

        <article className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-200 flex items-center justify-center font-bold mb-5">
            02
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Provjera u nekoliko sekundi</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bez mailova i telefoniranja školi. Poslodavac provjeri certifikat za nekoliko sekundi.
          </p>
        </article>

        <article className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold mb-5">
            03
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Privatnost po dizajnu</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nema pretrage po imenu. Certifikat se otvara samo uz jedinstveni kod koji dijeli polaznik.
          </p>
        </article>
      </section>

      {/* SEKCIJA ZA DONACIJE */}
      <section className="w-full mt-24 bg-slate-900 text-white py-12 px-8 rounded-3xl border border-slate-800 shadow-xl text-left">
        <div className="max-w-xl mx-auto text-center mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-3.5 py-1 rounded-full border border-blue-800/40">
            Podržite Projekat
          </span>
          <h2 className="text-2xl md:text-3xl font-bold mt-4">Pomozite pokrivanje troškova korištenja mreže</h2>
          <p className="text-slate-400 text-sm mt-2">
            Platforma je u potpunosti besplatna. Ukoliko želite podržati rad i održavanje sistema na Base mreži, možete donirati sredstva.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 bg-slate-950/50 p-6 rounded-2xl border border-slate-800/80 max-w-2xl mx-auto">
          {/* QR Kod */}
          <div className="bg-white p-2 rounded-xl shadow-md shrink-0">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${DONATION_ADDRESS}`}
              alt="Donacija QR Kod"
              className="w-28 h-28"
            />
          </div>

          {/* Adresa i Copy dugme */}
          <div className="flex flex-col items-center sm:items-start w-full">
          <span className="text-xs text-slate-400 font-medium mb-1">
            Mreža: <strong className="text-emerald-400">Base Mainnet</strong> (Samo <span className="text-white">ETH</span>)
          </span>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-2.5 rounded-xl w-full">
            <code className="text-xs font-mono text-blue-300 truncate w-full">
              {DONATION_ADDRESS}
            </code>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              {copied ? 'Kopirano! ✓' : 'Kopiraj'}
            </button>
          </div>
        </div>
        </div>
      </section>

      {/* KOLAPSIBILNA (ACCORDION) FAQ SEKCIJA */}
      <section id="faq" className="w-full mt-24 text-left scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Često postavljana pitanja</h2>
          <p className="text-slate-600 text-sm mt-2">Sve što trebate znati o digitalnom izdavanju i verifikaciji.</p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqData.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <article
                key={index}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs transition-all duration-200"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-6 text-left font-bold text-slate-900 flex justify-between items-center gap-4 hover:bg-slate-50/80 transition cursor-pointer"
                >
                  <span className="text-base leading-snug">{faq.question}</span>
                  <span
                    className={`text-xl text-blue-600 font-mono transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    ↓
                  </span>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4 bg-slate-50/40">
                    {faq.answer}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* JSON-LD Schema.org FAQPage za AEO/SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            'mainEntity': faqData.map((faq) => ({
              '@type': 'Question',
              'name': faq.question,
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': faq.answer,
              },
            })),
          }),
        }}
      />

    </main>
  );
}