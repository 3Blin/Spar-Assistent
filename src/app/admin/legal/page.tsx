'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

const FIELDS = [
  { key: 'betreiber_name',    label: 'Betreiber – Vollständiger Name',     type: 'text',     note: 'z.B. Max Mustermann' },
  { key: 'betreiber_strasse', label: 'Straße und Hausnummer',              type: 'text',     note: '' },
  { key: 'betreiber_plz',     label: 'Postleitzahl',                       type: 'text',     note: '' },
  { key: 'betreiber_ort',     label: 'Ort',                                type: 'text',     note: '' },
  { key: 'betreiber_email',   label: 'Kontakt-E-Mail',                     type: 'email',    note: 'Wird im Impressum & Datenschutz angezeigt' },
  { key: 'betreiber_telefon', label: 'Telefon (optional)',                  type: 'text',     note: 'Leer lassen, wenn nicht gewünscht' },
  { key: 'site_name',         label: 'App-Name',                           type: 'text',     note: 'z.B. Spar-Assistent' },
  { key: 'site_url',          label: 'Öffentliche URL der App',            type: 'url',      note: 'Vollständige URL inkl. https://' },
  { key: 'admin_emails',      label: 'Admin-E-Mails (kommagetrennt)',      type: 'text',     note: 'Diese Adressen haben Admin-Zugang' },
];

export default function LegalAdmin() {
  const [values, setValues]     = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    supabase
      .from('app_config')
      .select('key, value')
      .then(({ data }) => {
        const v: Record<string, string> = {};
        for (const row of data ?? []) v[row.key] = row.value ?? '';
        setValues(v);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      for (const field of FIELDS) {
        const val = values[field.key] ?? '';
        const { error: upsertErr } = await supabase
          .from('app_config')
          .upsert({ key: field.key, value: val, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (upsertErr) throw upsertErr;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Speichern fehlgeschlagen');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }} className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl tracking-tight mb-1">
          Rechtliche Angaben bearbeiten
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }} className="text-sm">
          Diese Angaben erscheinen in Impressum und Datenschutzerklärung.
          Änderungen sind sofort auf den öffentlichen Seiten sichtbar.
        </p>
      </div>

      <div className="card space-y-5">
        {FIELDS.map(field => (
          <div key={field.key}>
            <label className="block text-sm font-semibold mb-1">{field.label}</label>
            {field.note && (
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{field.note}</p>
            )}
            <input
              type={field.type}
              value={values[field.key] ?? ''}
              onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.note || field.label}
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 text-red-700 text-sm">⚠️ {error}</div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving && <span className="spinner" />}
          {saving ? 'Speichere…' : '💾 Speichern'}
        </button>

        {saved && (
          <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
            ✓ Gespeichert
          </span>
        )}

        <div className="ml-auto flex gap-3 text-sm">
          <a href="/impressum" style={{ color: 'var(--color-accent)' }}>Impressum ansehen →</a>
          <a href="/datenschutz" style={{ color: 'var(--color-accent)' }}>Datenschutz ansehen →</a>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--color-accent-light)', borderColor: 'var(--color-accent)' }}>
        <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-accent-dark)' }}>
          💡 Hinweis zur Adresse
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-accent)' }}>
          Als Betreiber einer Website bist du nach § 5 TMG verpflichtet, eine vollständige
          Anschrift anzugeben. Ein Postfach reicht nicht aus. Falls du deine Privatadresse
          nicht veröffentlichen möchtest, kannst du einen Dienstleister für eine
          „Impressums-Adresse" nutzen (z.B. beim lokalen Anwalt oder Steuerberater anfragen).
        </p>
      </div>
    </div>
  );
}
