import type { Metadata } from 'next';
import './globals.css';
import Navbar from './components/Navbar';
import SessionWrapper from './components/SessionWrapper';
import Footer from './components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://diploma.ba'),
  title: {
    default: 'diploma.ba | Izdavanje i verifikacija digitalnih certifikata',
    template: '%s | diploma.ba',
  },
  description: 'Sigurna B2B/B2G platforma za izdavanje i instant verifikaciju digitalnih certifikata i diploma na Base blockchainu bez lažiranja.',
  keywords: [
    'diploma.ba',
    'verifikacija diploma',
    'digitalni certifikati',
    'blockchain certifikati',
    'izdavanje diploma BiH',
    'spriječavanje falsifikovanja diploma',
    'Base L2 blockchain',
  ],
  authors: [{ name: 'Nino Herenda', url: 'https://ninoherenda.com' }],
  creator: 'Nino Herenda',
  publisher: 'diploma.ba',
  alternates: {
    canonical: 'https://diploma.ba',
  },
  openGraph: {
    title: 'diploma.ba | Izdavanje i verifikacija digitalnih certifikata',
    description: 'Sigurna platforma za izdavanje i instant verifikaciju certifikata na Base blockchainu.',
    url: 'https://diploma.ba',
    siteName: 'diploma.ba',
    locale: 'bs_BA',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'diploma.ba platforma',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'diploma.ba | Digitalni certifikati na blockchainu',
    description: 'Platforma za izdavanje i verifikaciju certifikata bez mogućnosti falsifikovanja.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bs" className="light">
      <head>
        {/* Schema.org Structured Data za SEO i AI crawlere */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              'name': 'Diploma.ba',
              'url': 'https://diploma.ba',
              'applicationCategory': 'BusinessApplication',
              'operatingSystem': 'Web',
              'description': 'Sigurna platforma za izdavanje i brzu provjeru digitalnih certifikata i diploma na Base blockchainu.',
              'offers': {
                '@type': 'Offer',
                'price': '0',
                'priceCurrency': 'BAM'
              }
            })
          }}
        />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans antialiased">
        <SessionWrapper>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
        </SessionWrapper>
        <Footer />
      </body>
    </html>
  );
}