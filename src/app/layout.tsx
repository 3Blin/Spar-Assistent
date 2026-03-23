import { Fraunces, DM_Sans, JetBrains_Mono } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';
import NavMenu from './components/NavMenu';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '600', '700', '800'],
  style: ['normal', 'italic'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Marktfuchs – Lokaler Preisvergleich',
  description: 'Finde den günstigsten Supermarkt für deinen Standard-Warenkorb in Neustadt an der Weinstraße. Schlau einkaufen mit Marktfuchs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>

        <a href="#main-content" className="skip-link">Zum Inhalt springen</a>

        {/* ── Top Nav ── */}
        <nav className="border-b sticky top-0 z-40" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }} aria-label="Hauptnavigation">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">

              {/* Brand */}
              <a href="/" className="flex items-center gap-2 no-underline" style={{ color: 'var(--color-text)' }} aria-label="Marktfuchs – Startseite">
                <span className="text-xl" aria-hidden="true">🦊</span>
                <span className="font-display font-bold text-lg tracking-tight">Marktfuchs</span>
              </a>

              {/* Nav – Desktop inline / Mobile Hamburger */}
              <NavMenu />

            </div>
          </div>
        </nav>

        {/* ── Main ── */}
        <main id="main-content" className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
          {children}
        </main>

        {/* ── Footer ── */}
        <footer className="border-t py-8 mt-8" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">🦊</span>
                <span className="font-display font-semibold text-sm">Marktfuchs</span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>· Neustadt an der Weinstraße</span>
              </div>
              <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm" style={{ color: 'var(--color-text-muted)' }} aria-label="Footer-Navigation">
                <a href="/impressum" className="hover:underline" style={{ color: 'inherit' }}>Impressum</a>
                <a href="/datenschutz" className="hover:underline" style={{ color: 'inherit' }}>Datenschutz</a>
                <a href="/auth" className="hover:underline" style={{ color: 'inherit' }}>Anmelden</a>
                <a href="/bon" className="hover:underline" style={{ color: 'inherit' }}>Bon hochladen</a>
              </nav>
            </div>
            <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
              Privates Pilotprojekt · Alle Preisangaben ohne Gewähr ·{' '}
              Preisdaten basieren auf Community-Uploads und Schätzwerten
            </p>
          </div>
        </footer>

      </body>
    </html>
  );
}
