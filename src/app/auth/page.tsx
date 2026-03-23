'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

function AuthPageInner() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [email, setEmail]       = useState('');
  const [sent, setSent]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [user, setUser]         = useState<any>(null);

  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  if (user) {
    return (
      <div className="auth-card card">
        <div className="text-center">
          <div className="text-3xl mb-4">✅</div>
          <h1 className="font-display font-bold text-xl mb-2">Du bist angemeldet</h1>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>{user.email}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href={next} className="btn-primary no-underline">Weiter zu {next === '/' ? 'Dashboard' : next}</a>
            <button className="btn-secondary" onClick={() => { supabase.auth.signOut().then(() => setUser(null)); }}>
              Abmelden
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="auth-card card">
        <div className="text-center">
          <div className="text-4xl mb-4">📬</div>
          <h1 className="font-display font-bold text-xl mb-2">E-Mail gesendet!</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Wir haben einen Anmeldelink an <strong>{email}</strong> gesendet.<br />
            Bitte klicke auf den Link in der E-Mail – er ist 1 Stunde gültig.
          </p>
          <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
            Kein E-Mail erhalten? Prüfe den Spam-Ordner oder{' '}
            <button className="underline" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)' }} onClick={() => setSent(false)}>
              versuche es erneut
            </button>.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error: authErr } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (authErr) {
      setError(authErr.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="auth-card card">
      <div className="text-center mb-6">
        <div className="text-3xl mb-3">🧺</div>
        <h1 className="font-display font-bold text-xl mb-1">Anmelden</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Wir senden dir einen Anmeldelink per E-Mail. Kein Passwort nötig.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
            E-Mail-Adresse
          </label>
          <input
            type="email"
            required
            placeholder="deine@email.de"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
          />
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 rounded-lg p-3">⚠️ {error}</div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading && <span className="spinner" />}
          {loading ? 'Sende Link…' : '✉️ Anmeldelink senden'}
        </button>
      </form>

      <p className="text-xs mt-6 text-center" style={{ color: 'var(--color-text-muted)' }}>
        Mit der Anmeldung stimmst du unserer{' '}
        <a href="/datenschutz" style={{ color: 'var(--color-accent)' }}>Datenschutzerklärung</a> zu.
        Der Spar-Assistent ist ein privates, nicht-kommerzielles Pilotprojekt.
      </p>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="flex items-center justify-center py-12">
      <div style={{ width: '100%', maxWidth: 420 }}>
        <Suspense fallback={<div className="card text-center py-8"><div className="spinner mx-auto" /></div>}>
          <AuthPageInner />
        </Suspense>
      </div>
    </div>
  );
}
