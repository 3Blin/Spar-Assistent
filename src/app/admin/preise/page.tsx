'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Market, Category, PriceEntry } from '@/lib/types';

export default function PreisVerwaltung() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [selectedMarket, setSelectedMarket] = useState('');
  const [priceDate, setPriceDate] = useState(new Date().toISOString().split('T')[0]);
  const [prices, setPrices] = useState<Record<string, { value: string; isPromo: boolean }>>({});

  // Existing prices for display
  const [existingPrices, setExistingPrices] = useState<PriceEntry[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [mktsRes, catsRes] = await Promise.all([
      fetch('/api/markets').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]);
    setMarkets(mktsRes.items || []);
    setCategories(catsRes.items || []);
    if ((mktsRes.items || []).length > 0) {
      setSelectedMarket(mktsRes.items[0].id);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load existing prices when market or date changes
  useEffect(() => {
    if (!selectedMarket) return;
    fetch(`/api/prices?market_id=${selectedMarket}&date=${priceDate}`)
      .then(r => r.json())
      .then(data => {
        setExistingPrices(data.items || []);
        // Pre-fill form with existing prices
        const prefill: Record<string, { value: string; isPromo: boolean }> = {};
        for (const cat of categories) {
          const existing = (data.items || []).find(
            (p: PriceEntry) => p.category_id === cat.id
          );
          prefill[cat.id] = {
            value: existing ? String(existing.price_value) : '',
            isPromo: existing?.is_promo || false,
          };
        }
        setPrices(prefill);
      });
  }, [selectedMarket, priceDate, categories]);

  const handlePriceChange = (catId: string, value: string) => {
    setPrices(prev => ({ ...prev, [catId]: { ...prev[catId], value } }));
  };

  const handlePromoToggle = (catId: string) => {
    setPrices(prev => ({
      ...prev,
      [catId]: { ...prev[catId], isPromo: !prev[catId]?.isPromo },
    }));
  };

  const saveAllPrices = async () => {
    setSaving(true);
    setMessage(null);
    let saved = 0;
    let errors = 0;

    for (const [catId, { value, isPromo }] of Object.entries(prices)) {
      if (!value || isNaN(parseFloat(value))) continue;
      const numVal = parseFloat(value);
      if (numVal < 0) continue;

      try {
        const res = await fetch('/api/prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            market_id: selectedMarket,
            category_id: catId,
            price_value: numVal,
            valid_from: priceDate,
            is_promo: isPromo,
            source: 'manual',
          }),
        });
        if (res.ok) saved++;
        else errors++;
      } catch {
        errors++;
      }
    }

    setMessage({
      type: errors > 0 ? 'error' : 'success',
      text: `${saved} Preise gespeichert${errors > 0 ? `, ${errors} Fehler` : ''}`,
    });
    setSaving(false);
  };

  const marketName = markets.find(m => m.id === selectedMarket)?.name || '';
  const filledCount = Object.values(prices).filter(p => p.value && !isNaN(parseFloat(p.value))).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="font-display text-2xl font-bold tracking-tight mb-1">Preispflege</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Erfasse und aktualisiere Preise für den Referenz-Warenkorb
        </p>
      </div>

      {/* Controls */}
      <div className="card animate-in" style={{ animationDelay: '0.05s' }}>
        <div className="flex flex-wrap items-end gap-5">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Markt
            </label>
            <select value={selectedMarket} onChange={e => setSelectedMarket(e.target.value)}>
              {markets.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="w-48">
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Gültig ab
            </label>
            <input type="date" value={priceDate} onChange={e => setPriceDate(e.target.value)} />
          </div>
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {filledCount}/{categories.length} ausgefüllt
          </div>
        </div>
      </div>

      {message && (
        <div className={`card text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      {/* Price Entry Form */}
      <div className="card p-0 overflow-auto animate-in" style={{ animationDelay: '0.1s' }}>
        <table className="price-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Kategorie</th>
              <th style={{ width: 120 }}>Menge</th>
              <th style={{ width: 160 }}>Preis (€)</th>
              <th style={{ width: 80, textAlign: 'center' }}>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, i) => (
              <tr key={cat.id}>
                <td className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                <td>
                  <div className="font-medium">{cat.name}</div>
                  {cat.note && <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{cat.note}</div>}
                </td>
                <td className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {cat.target_quantity} {cat.target_unit}
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={prices[cat.id]?.value || ''}
                    onChange={e => handlePriceChange(cat.id, e.target.value)}
                    className="font-mono"
                    style={{ width: 130 }}
                  />
                </td>
                <td className="text-center">
                  <button
                    onClick={() => handlePromoToggle(cat.id)}
                    className={`text-lg ${prices[cat.id]?.isPromo ? '' : 'opacity-30 grayscale'}`}
                    title={prices[cat.id]?.isPromo ? 'Aktionspreis' : 'Kein Aktionspreis'}
                  >
                    🏷️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save */}
      <div className="flex justify-between items-center">
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Preise für <strong>{marketName}</strong> am {priceDate}
        </span>
        <button onClick={saveAllPrices} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving && <span className="spinner" />}
          {saving ? 'Speichere…' : `💾 ${filledCount} Preise speichern`}
        </button>
      </div>
    </div>
  );
}
