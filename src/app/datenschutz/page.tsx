import { createServerClient } from '@/lib/supabase';

async function getConfig(): Promise<Record<string, string>> {
  const db = createServerClient();
  const { data } = await db.from('app_config').select('key, value');
  const cfg: Record<string, string> = {};
  for (const row of data ?? []) cfg[row.key] = row.value ?? '';
  return cfg;
}

export default async function DatenschutzPage() {
  const cfg = await getConfig();

  const name    = cfg['betreiber_name']    || '[Name]';
  const strasse = cfg['betreiber_strasse'] || '[Straße Nr.]';
  const plz     = cfg['betreiber_plz']     || '[PLZ]';
  const ort     = cfg['betreiber_ort']     || '[Ort]';
  const email   = cfg['betreiber_email']   || '[E-Mail]';

  return (
    <div className="legal-page">
      <div className="legal-card card">
        <a href="/" className="legal-back">← Zurück zum Dashboard</a>
        <h1 className="font-display font-bold text-2xl mb-2">Datenschutzerklärung</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Stand: März 2026 · Gemäß DSGVO und BDSG
        </p>

        <section className="legal-section">
          <h2>1. Verantwortlicher</h2>
          <p>
            Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:<br /><br />
            {name}<br />
            {strasse}<br />
            {plz} {ort}<br />
            E-Mail: <a href={`mailto:${email}`}>{email}</a>
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Grundsätze der Datenverarbeitung</h2>
          <p>
            Wir verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung
            einer funktionsfähigen App sowie unserer Inhalte und Leistungen erforderlich
            ist. Eine Verarbeitung personenbezogener Daten erfolgt regelmäßig nur nach
            Einwilligung der betroffenen Person. Eine Ausnahme gilt, wenn eine vorherige
            Einholung einer Einwilligung aus tatsächlichen Gründen nicht möglich ist und
            die Verarbeitung der Daten durch gesetzliche Vorschriften gestattet ist.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Welche Daten wir verarbeiten</h2>
          <h3>3.1 Nutzerkonto (Anmeldung)</h3>
          <p>
            Für den Zugang zum Bon-Upload ist eine Anmeldung per E-Mail-Magic-Link
            erforderlich. Dabei speichern wir:
          </p>
          <ul>
            <li>E-Mail-Adresse</li>
            <li>Zeitpunkt der Anmeldung und letzten Anmeldung</li>
            <li>Technische Sitzungsdaten (verschlüsselt im Cookie)</li>
          </ul>
          <p className="mt-2">
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
            (Vertragserfüllung / vorvertragliche Maßnahmen).
          </p>

          <h3 className="mt-4">3.2 Kassenbon-Uploads</h3>
          <p>
            Wenn du einen Kassenbon hochlädst, verarbeiten wir:
          </p>
          <ul>
            <li>Das Bild/die Bilddatei des Kassenbons</li>
            <li>Aus dem Bon extrahierte Daten: Marktname, Datum, Gesamtbetrag, Einzelpreise</li>
            <li>Deine E-Mail-Adresse (als Nachweis wer den Bon hochgeladen hat)</li>
            <li>IP-Adresse (anonymisiert als Hash, für Missbrauchsschutz / Rate Limiting)</li>
          </ul>
          <p className="mt-2">
            Bon-Bilder werden nach der OCR-Verarbeitung automatisch gelöscht oder nach
            spätestens 30 Tagen gelöscht (konfigurierbar). Extrahierte Preisdaten werden
            ohne Personenbezug gespeichert.
          </p>
          <p className="mt-2">
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).
          </p>

          <h3 className="mt-4">3.3 Server-Logs</h3>
          <p>
            Vercel (unser Hosting-Anbieter) speichert automatisch Server-Logs mit IP-Adressen
            für bis zu 30 Tage. Diese Daten werden ausschließlich zur Fehleranalyse genutzt.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Einsatz von Drittdiensten</h2>

          <h3>4.1 Vercel (Hosting)</h3>
          <p>
            Diese App wird über Vercel Inc., 340 Pine Street, Suite 701, San Francisco,
            CA 94104, USA gehostet. Vercel verarbeitet dabei technisch notwendige Daten
            (IP-Adresse, Anfrage-Metadaten). Vercel ist EU-US Data Privacy Framework
            zertifiziert. Weitere Infos:{' '}
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
              vercel.com/legal/privacy-policy
            </a>
          </p>

          <h3 className="mt-4">4.2 Supabase (Datenbank & Authentifizierung)</h3>
          <p>
            Nutzerdaten und Preisdaten werden in einer Datenbank bei Supabase Inc. gespeichert.
            Unser Datenbankserver befindet sich in der EU (Frankfurt, AWS eu-central-1).
            Weitere Infos:{' '}
            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
              supabase.com/privacy
            </a>
          </p>

          <h3 className="mt-4">4.3 Anthropic Claude (KI-Texterkennung)</h3>
          <p>
            Für die automatische Texterkennung auf Kassenbons (OCR) senden wir das
            Bon-Bild an die API von Anthropic, PBC, 548 Market St, PMB 90375,
            San Francisco, CA 94104, USA. Das Bild wird zur Verarbeitung übertragen,
            aber nicht dauerhaft gespeichert. Anthropic ist dem EU-US Data Privacy
            Framework beigetreten. Weitere Infos:{' '}
            <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer">
              anthropic.com/privacy
            </a>
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Speicherdauer</h2>
          <ul>
            <li>Nutzerkonto: solange aktiv genutzt, auf Anfrage sofort löschbar</li>
            <li>Bon-Bilder: automatisch nach 30 Tagen</li>
            <li>Extrahierte Preisdaten: ohne Personenbezug, unbegrenzt gespeichert</li>
            <li>Server-Logs (Vercel): max. 30 Tage</li>
            <li>Rate-Limit-Hashes (anonymisiert): automatisch nach 24 Stunden</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Deine Rechte</h2>
          <p>Gemäß DSGVO hast du folgende Rechte gegenüber dem Verantwortlichen:</p>
          <ul>
            <li><strong>Auskunft</strong> (Art. 15 DSGVO): Welche Daten wir über dich speichern</li>
            <li><strong>Berichtigung</strong> (Art. 16 DSGVO): Unrichtige Daten korrigieren lassen</li>
            <li><strong>Löschung</strong> (Art. 17 DSGVO): Daten löschen lassen</li>
            <li><strong>Einschränkung</strong> (Art. 18 DSGVO): Verarbeitung einschränken</li>
            <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO): Daten in maschinenlesbarem Format erhalten</li>
            <li><strong>Widerspruch</strong> (Art. 21 DSGVO): Gegen Verarbeitung widersprechen</li>
            <li><strong>Widerruf</strong>: Einwilligungen jederzeit für die Zukunft widerrufen</li>
          </ul>
          <p className="mt-3">
            Zur Ausübung deiner Rechte wende dich an:{' '}
            <a href={`mailto:${email}`}>{email}</a>
          </p>
          <p className="mt-3">
            Du hast außerdem das Recht, dich bei der zuständigen Datenschutzbehörde zu
            beschweren. Für Baden-Württemberg:{' '}
            <a href="https://www.baden-wuerttemberg.datenschutz.de" target="_blank" rel="noopener noreferrer">
              Landesbeauftragter für Datenschutz und Informationsfreiheit BW
            </a>
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Cookies</h2>
          <p>
            Diese App setzt ausschließlich technisch notwendige Cookies für die
            Authentifizierungssitzung. Es werden keine Marketing- oder
            Tracking-Cookies gesetzt. Drittanbieter-Cookies werden nicht verwendet.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Datensicherheit</h2>
          <p>
            Alle Datenübertragungen erfolgen verschlüsselt über HTTPS (TLS 1.3).
            Passwörter werden nicht verwendet – stattdessen nutzen wir E-Mail-basierte
            Magic Links. IP-Adressen für Rate Limiting werden als SHA-256-Hash
            gespeichert (nicht zurückrechenbar). Bon-Bilder sind nur über
            zeitlich begrenzte, signierte URLs zugänglich.
          </p>
        </section>

        <p className="text-xs mt-8" style={{ color: 'var(--color-text-muted)' }}>
          <a href="/admin/legal" style={{ color: 'var(--color-accent)' }}>
            Admin: Datenschutzerklärung bearbeiten
          </a>
        </p>
      </div>
    </div>
  );
}
