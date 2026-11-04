'use client';

import Link from 'next/link';
import Logo from './Logo';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const isActive = (path: string) => pathname === path;

  return (
    <header className="w-full border-b border-slate-200 bg-white/85 backdrop-blur-md sticky top-0 z-50 shadow-2xs">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo / Brend */}
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-9" />
        </Link>

        {/* Glavni navigacijski linkovi */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="/verifikuj"
            className={`transition ${isActive('/verifikuj') ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Provjera Certifikata
          </Link>

          {/* Javni registar institucija - dostupan svima */}
          <Link
            href="/institucije"
            className={`transition ${isActive('/institucije') ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Institucije
          </Link>

          {/* Prikazuj dodatne informativne linkove SAMO ako KORISNIK NIJE PRIJAVLJEN */}
          {!isAuthenticated && (
            <>
              <Link
                href="/#kako-radi"
                className="text-slate-600 hover:text-slate-900 transition"
              >
                Kako radi
              </Link>
              <Link
                href="/#prednosti"
                className="text-slate-600 hover:text-slate-900 transition"
              >
                Za institucije
              </Link>
              <Link
                href="/#faq"
                className="text-slate-600 hover:text-slate-900 transition"
              >
                FAQ
              </Link>
            </>
          )}

          {/* Prikazuj Portal i Izdaj samo ako JE prijavljen */}
          {isAuthenticated && (
            <>
              <Link
                href="/portal"
                className={`transition ${isActive('/portal') ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Izdati Certifikati
              </Link>
              <Link
                href="/izdavanje"
                className={`transition ${isActive('/izdavanje') ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Izdaj Certifikat
              </Link>
            </>
          )}
        </nav>

        {/* Dinamička akcija (Prijava/Registracija vs Odjava) */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500 hidden sm:inline text-right leading-tight">
                Prijavljeni ste kao <br />
                <strong className="text-slate-800">{session?.user?.name || session?.user?.email}</strong>
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition border border-rose-200 cursor-pointer shadow-2xs"
              >
                Odjavi se
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200"
              >
                Prijavi se
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-md shadow-blue-600/20"
              >
                Registruj instituciju
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}