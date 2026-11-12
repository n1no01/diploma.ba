import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white/80 backdrop-blur-md py-8 mt-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>© 2026 diploma.ba. Sva prava zadržana.</p>
        <div className="flex items-center gap-6">
         
          <a
            href="https://www.linkedin.com/company/diploma-ba"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition font-medium group"
            aria-label="LinkedIn"
          >
            {/* Zvanični SVG LinkedIn Logo */}
            <svg
              className="w-4 h-4 fill-slate-500 group-hover:fill-blue-600 transition"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
            </svg>
            <span>LinkedIn</span>
          </a>
          <Link href="/docs" className="hover:text-slate-900 transition">
            Dokumentacija
          </Link>
          <Link href="/politika-privatnosti" className="hover:text-slate-900 transition">
            Politika privatnosti
          </Link>
        </div>
      </div>
    </footer>
  );
}