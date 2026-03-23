'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function AuthNav() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!user) {
    return (
      <a
        href="/auth"
        className="text-xs px-3 py-1.5 rounded-md font-medium border transition-colors"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        Anmelden
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
        {user.email}
      </span>
      <button
        onClick={() => supabase.auth.signOut().then(() => setUser(null))}
        className="text-xs px-3 py-1.5 rounded-md font-medium border transition-colors"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        Abmelden
      </button>
    </div>
  );
}
