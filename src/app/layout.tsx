import type { Metadata } from 'next';
import './globals.css';
import NavLink from './components/NavLink';
import AuthNav from './components/AuthNav';

export const metadata: Metadata = {
  title: 'Spar-Assistent – Lokaler Preisvergleich',
  description: 'Finde den günstigsten Supermarkt für deinen Standard-Warenkorb in Neustadt an der Weinstraße',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>

        {/* ── Top Nav ── */}
        <nav className="border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              <a href="/" className="flex items-center gap-2.5 no-underline" style={{ color: 'var(--color-text)' }}>
                <span className="text-xl">🧺</span>
                <span className="font-display font-bold text-lg tracking-tight">Spar-Assistent</span>
              </a>
              <div className="flex items-center gap-1">
                <NavLink href="/">Dashboard</NavLink>
                <NavLink href="/bon">Bon</NavLink>
                <NavLink href="/admin/preise">Preise</NavLink>
                <AuthNav />
              </div>
            </div>
          </div>
        </nav>

        {/* ── Main ── */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
          {children}
        </main>

        {/* ── Footer ── */}
        <footer className="border-t py-8 mt-8" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧺</span>
                <span className="font-display font-semibold text-sm">Spar-Assistent</span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  · Neustadt an der Weinstraße
                </span>
              </div>
              <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
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
