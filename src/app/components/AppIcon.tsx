import React from 'react';

interface AppIconProps {
  className?: string;
}

export default function AppIcon({ className = "h-9 w-9" }: AppIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="diploma.ba">
    <title>diploma.ba</title>
    <rect width="64" height="64" rx="14" fill="#0F2A5C"/>
    <polygon points="32,8 52.8,20 52.8,44 32,56 11.2,44 11.2,20"
            fill="none" stroke="#38BDF8" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M23 30.5v7c0 2.5 4 4.5 9 4.5s9-2 9-4.5v-7L32 34z" fill="#7DD3FC"/>
    <polygon points="32,19 46,26.5 32,34 18,26.5" fill="#FFFFFF"/>
    <line x1="46" y1="26.5" x2="46" y2="36" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
    <circle cx="46" cy="38" r="1.8" fill="#FFFFFF"/>
    </svg>
  );
}