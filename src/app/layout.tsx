import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Spar-Assistent – Lokaler Preisvergleich',
  description: 'Finde den günstigsten Supermarkt für deinen Standard-Warenkorb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
        <nav className="border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              <a href="/" className="flex items-center gap-2.5 no-underline" style={{ color: 'var(--color-text)' }}>
                <span className="text-xl">🧺</span>
                <span className="font-display font-bold text-lg tracking-tight">Spar-Assistent</span>
              </a>
              <div className="flex items-center gap-1">
                <NavLink href="/">Dashboard</NavLink>
                <NavLink href="/admin/preise">Preise</NavLink>
                <NavLink href="/bon">Bon</NavLink>
                <NavLink href="/validierung">Validierung</NavLink>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>

        <footer className="border-t mt-12 py-6 text-center text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          Spar-Assistent MVP · Referenz-Warenkorb mit 20 Kategorien · Neustadt an der Weinstraße
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="px-3 py-1.5 rounded-md text-sm font-medium no-underline transition-colors"
      style={{ color: 'var(--color-text-muted)' }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = 'var(--color-surface-hover)';
        e.currentTarget.style.color = 'var(--color-text)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--color-text-muted)';
      }}
    >
      {children}
    </a>
  );
}
