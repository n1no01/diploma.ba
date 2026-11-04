import React from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "h-9 w-auto" }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* SVG Ikona - Providna pozadina, samo heksagon i kapica */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto aspect-square shrink-0"
      >
        <defs>
          <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>

        {/* Spoljni heksagon (Svijetlo/Tamno plavi obris visokog kontrasta) */}
        <path
          d="M32 6L54 18.7846V44.2154L32 57L10 44.2154V18.7846L32 6Z"
          stroke="url(#hexGradient)"
          strokeWidth="4.5"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Akademska kapica - Gornji dio (Tijelo/Kvadrat) */}
        <path
          d="M32 21L50 28L32 35L14 28L32 21Z"
          fill="#0284c7"
        />

        {/* Akademska kapica - Donja baza (Kruna/Obod) */}
        <path
          d="M21 33.5V40C21 43 25.5 45 32 45C38.5 45 43 43 43 33.5"
          stroke="#0284c7"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Kukičasta trakica/kićanka (Tassel desno) */}
        <path
          d="M45 29V38C45 39.5 43 40.5 41.5 41"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      {/* Tipografija / Brend Ime */}
      <div className="flex flex-col justify-center leading-none">
        <span className="text-xl font-extrabold tracking-tight text-slate-900">
          diploma<span className="text-cyan-600">.ba</span>
        </span>
        <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-1">
          Verifikovani Registar
        </span>
      </div>
    </div>
  );
}