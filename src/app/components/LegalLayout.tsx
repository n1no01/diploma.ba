import Link from 'next/link';
import type { ReactNode } from 'react';
import PrintButton from './PrintButton';
import { TERMS_VERSION } from '@/app/lib/legal';

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="space-y-4 scroll-mt-24">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-slate-600">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="list-disc list-outside ml-5 text-sm space-y-2 text-slate-600 leading-relaxed">{children}</ul>;
}

export function B({ children }: { children: ReactNode }) {
  return <strong className="text-slate-900">{children}</strong>;
}

// Vrijednosti koje još nisu popunjene u lib/legal.ts vidno se označe žutom bojom.
export function Val({ value }: { value: string }) {
  if (value.startsWith('[POPUNITI')) {
    return <mark className="bg-amber-100 text-amber-900 px-1 rounded">{value}</mark>;
  }
  return <>{value}</>;
}

const DOCS = [
  { href: '/politika-privatnosti', label: 'Politika privatnosti' },
  { href: '/uslovi-koristenja', label: 'Uslovi korištenja' },
  { href: '/ugovor-o-obradi-podataka', label: 'Ugovor o obradi podataka' },
  { href: '/povjerenje', label: 'Povjerenje i kontinuitet' },
];

interface LegalLayoutProps {
  title: string;
  badge?: string;
  updated: string;
  showVersion?: boolean;
  summary?: string[];
  toc: { id: string; title: string }[];
  currentHref: string;
  children: ReactNode;
}

export default function LegalLayout({
  title,
  badge = 'Pravni dokument',
  updated,
  showVersion = true,
  summary,
  toc,
  currentHref,
  children,
}: LegalLayoutProps) {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-slate-700">
      <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-3xl shadow-xl space-y-8 print:shadow-none print:border-0 print:p-0">
        {/* Zaglavlje */}
        <div className="border-b border-slate-100 pb-6">
          <div className="flex items-start justify-between gap-4">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              {badge}
            </span>
            <PrintButton />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-4">{title}</h1>
          <p className="text-slate-500 text-sm mt-2">
            Zadnja izmjena: {updated}
            {showVersion && <span className="text-slate-400"> · verzija {TERMS_VERSION}</span>}
          </p>
        </div>

        {/* Ukratko */}
        {summary && summary.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Ukratko</p>
            <ul className="mt-3 list-disc list-outside ml-5 text-sm text-slate-700 space-y-1.5 leading-relaxed">
              {summary.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="text-xs text-blue-700/80 mt-3">
              Ovaj sažetak služi lakšem razumijevanju i ne zamjenjuje tekst dokumenta ispod.
            </p>
          </div>
        )}

        {/* Sadržaj */}
        <nav aria-label="Sadržaj" className="print:hidden">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Sadržaj</p>
          <ol className="mt-3 grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            {toc.map((t, i) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="text-slate-600 hover:text-blue-600 transition">
                  {i + 1}. {t.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {children}

        {/* Povezani dokumenti */}
        <div className="border-t border-slate-100 pt-6 print:hidden">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Povezani dokumenti</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {DOCS.filter((d) => d.href !== currentHref).map((d) => (
              <Link key={d.href} href={d.href} className="text-blue-600 hover:underline font-medium">
                {d.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
