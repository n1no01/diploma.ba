import type { Metadata } from 'next';
import './globals.css';
import Navbar from './components/Navbar';
import SessionWrapper from './components/SessionWrapper';
import Footer from './components/Footer';

export const metadata: Metadata = {
  title: 'diploma.ba - Provjera i izdavanje digitalnih certifikata”',
  description: 'Sigurna platforma za izdavanje i provjeru certifikata na Ethereum blockchainu.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bs" className="light">
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