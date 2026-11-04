import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white/80 backdrop-blur-md py-8 mt-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>© 2026 diploma.ba. Sva prava zadržana.</p>
        <div className="flex items-center gap-6">
          <Link href="/verifikuj" className="hover:text-slate-900 transition">
            Javni registar
          </Link>
          <Link href="/privacy" className="hover:text-slate-900 transition">
            Politika privatnosti
          </Link>
        </div>
      </div>
    </footer>
  );
}