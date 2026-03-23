import { createServerClient } from '@/lib/supabase';

async function getConfig(): Promise<Record<string, string>> {
  const db = createServerClient();
  const { data } = await db.from('app_config').select('key, value');
  const cfg: Record<string, string> = {};
  for (const row of data ?? []) cfg[row.key] = row.value ?? '';
  return cfg;
}

export default async function ImpressumPage() {
  const cfg = await getConfig();

  const name     = cfg['betreiber_name']    || '[Name]';
  const strasse  = cfg['betreiber_strasse'] || '[Straße Nr.]';
  const plz      = cfg['betreiber_plz']     || '[PLZ]';
  const ort      = cfg['betreiber_ort']     || '[Ort]';
  const email    = cfg['betreiber_email']   || '[E-Mail]';
  const telefon  = cfg['betreiber_telefon'];
  const siteName = cfg['site_name']         || 'Spar-Assistent';

  return (
    <div className="legal-page">
      <div className="legal-card card">
        <a href="/" className="legal-back">← Zurück zum Dashboard</a>
        <h1 className="font-display font-bold text-2xl mb-6">Impressum</h1>

        <section className="legal-section">
          <h2>Angaben gemäß § 5 TMG</h2>
          <p>
            {name}<br />
            {strasse}<br />
            {plz} {ort}
          </p>
        </section>

        <section className="legal-section">
          <h2>Kontakt</h2>
          <p>
            E-Mail: <a href={`mailto:${email}`}>{email}</a>
            {telefon && <><br />Telefon: {telefon}</>}
          </p>
        </section>

        <section className="legal-section">
          <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <p>
            {name}<br />
            {strasse}<br />
            {plz} {ort}
          </p>
        </section>

        <section className="legal-section">
          <h2>Hinweis zum Angebot</h2>
          <p>
            {siteName} ist ein privates, nicht-kommerzielles Pilotprojekt zum lokalen
            Preisvergleich von Lebensmitteln in Neustadt an der Weinstraße und Umgebung.
            Das Angebot richtet sich ausschließlich an einen eingeschränkten Teilnehmerkreis
            (Bekannte und Verwandte des Betreibers) und erhebt keinen Anspruch auf
            Vollständigkeit oder Richtigkeit der dargestellten Preisdaten.
          </p>
          <p className="mt-3">
            Alle Preisangaben basieren auf Community-Uploads (Kassenbon-Scans) sowie
            manuell eingetragenen Schätzwerten. Es besteht kein Anspruch auf Richtigkeit.
            Die tatsächlichen Marktpreise können abweichen.
          </p>
        </section>

        <section className="legal-section">
          <h2>Haftung für Inhalte</h2>
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte
            auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
            Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet,
            übermittelte oder gespeicherte fremde Informationen zu überwachen.
          </p>
        </section>

        <section className="legal-section">
          <h2>Urheberrecht</h2>
          <p>
            Die durch den Betreiber erstellten Inhalte und Werke auf diesen Seiten
            unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung,
            Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts
            bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
          </p>
        </section>

        <p className="text-xs mt-8" style={{ color: 'var(--color-text-muted)' }}>
          <a href="/admin/legal" style={{ color: 'var(--color-accent)' }}>
            Admin: Impressum bearbeiten
          </a>
        </p>
      </div>
    </div>
  );
}
