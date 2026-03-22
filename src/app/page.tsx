'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Market, Category, PriceEntry, CalculationResponse } from '@/lib/types';

type TravelMode = 'none' | 'fixed' | 'factor';

export default function Dashboard() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, Record<string, PriceEntry | null>>>({});
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [travelMode, setTravelMode] = useState<TravelMode>('none');
  const [travelFactor, setTravelFactor] = useState(0.30);
  const [excludeIncomplete, setExcludeIncomplete] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [marketsRes, catsRes, pricesRes] = await Promise.all([
        fetch('/api/markets').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/prices').then(r => r.json()),
      ]);

      const mkts = marketsRes.items || [];
      const cats = catsRes.items || [];
      const prices = pricesRes.items || [];

      setMarkets(mkts);
      setCategories(cats);

      // Build price matrix: latest price per category+market
      const matrix: Record<string, Record<string, PriceEntry | null>> = {};
      for (const cat of cats) {
        matrix[cat.id] = {};
        for (const mkt of mkts) {
          const matching = prices
            .filter((p: PriceEntry) => p.category_id === cat.id && p.market_id === mkt.id)
            .sort((a: PriceEntry, b: PriceEntry) => b.valid_from.localeCompare(a.valid_from));
          matrix[cat.id][mkt.id] = matching[0] || null;
        }
      }
      setPriceMap(matrix);
    } catch (err: any) {
      setError('Daten konnten nicht geladen werden');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const runCalculation = async () => {
    setCalculating(true);
    setError(null);
    try {
      const res = await fetch('/api/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region_code: 'neustadt',
          travel_mode: travelMode,
          travel_factor: travelMode === 'factor' ? travelFactor : undefined,
          exclude_incomplete: excludeIncomplete,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Berechnung fehlgeschlagen');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
    setCalculating(false);
  };

  const euro = (v: number | null | undefined) =>
    v != null ? `${v.toFixed(2).replace('.', ',')} €` : '–';

  const getCheapest = (catId: string): string | null => {
    const row = priceMap[catId];
    if (!row) return null;
    let minPrice = Infinity;
    let minMarket: string | null = null;
    for (const [mktId, entry] of Object.entries(row)) {
      if (entry && Number(entry.price_value) < minPrice) {
        minPrice = Number(entry.price_value);
        minMarket = mktId;
      }
    }
    return minMarket;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="animate-in">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1">
          Wo kaufst du heute günstiger ein?
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }} className="text-base">
          Referenz-Warenkorb mit {categories.length} Kategorien · {markets.length} Märkte in deinem Marktset
        </p>
      </div>

      {/* Settings */}
      <div className="card animate-in" style={{ animationDelay: '0.05s' }}>
        <div className="flex flex-wrap items-end gap-5">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Fahrtkosten
            </label>
            <select
              value={travelMode}
              onChange={(e) => setTravelMode(e.target.value as TravelMode)}
            >
              <option value="none">Ohne Fahrtkosten</option>
              <option value="factor">Distanzbasiert (€/km)</option>
              <option value="fixed">Fixkosten pro Markt</option>
            </select>
          </div>

          {travelMode === 'factor' && (
            <div className="w-40">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                €/km
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={travelFactor}
                onChange={(e) => setTravelFactor(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm cursor-pointer pb-1">
            <input
              type="checkbox"
              checked={excludeIncomplete}
              onChange={(e) => setExcludeIncomplete(e.target.checked)}
              className="w-4 h-4 accent-[var(--color-accent)]"
            />
            Nur vollständige Märkte
          </label>

          <button
            onClick={runCalculation}
            disabled={calculating}
            className="btn-primary flex items-center gap-2"
          >
            {calculating && <span className="spinner" />}
            {calculating ? 'Berechne…' : '🔍 Preisvergleich berechnen'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 text-red-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Result Cards */}
      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Winner Banner */}
          {result.recommended_market_name && (
            <div className="card" style={{ background: 'var(--color-accent-light)', borderColor: 'var(--color-accent)' }}>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-accent)' }}>
                    Empfehlung
                  </div>
                  <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--color-accent-dark)' }}>
                    Heute ist {result.recommended_market_name} am günstigsten
                  </h2>
                  <p className="mt-1" style={{ color: 'var(--color-accent)' }}>
                    Geschätzte Gesamtkosten: <strong>{euro(result.results[0]?.total_sum)}</strong>
                    {result.saving_vs_second_best != null && result.saving_vs_second_best > 0 && (
                      <> · Ersparnis gegenüber Platz 2: <strong>{euro(result.saving_vs_second_best)}</strong></>
                    )}
                  </p>
                </div>
                <a href={`/bon?calc=${result.calculation_run_id}`} className="btn-primary no-underline">
                  📸 Bon hochladen &amp; prüfen
                </a>
              </div>
            </div>
          )}

          {/* Market Cards */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(result.results.length, 3)}, 1fr)` }}>
            {result.results.map((r, i) => (
              <div
                key={r.market_id}
                className="card"
                style={i === 0 ? { borderColor: 'var(--color-accent)', borderWidth: 2 } : {}}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
                      style={i === 0
                        ? { background: 'var(--color-accent)', color: 'white' }
                        : { background: '#f0f0ea', color: 'var(--color-text-muted)' }
                      }
                    >
                      {r.rank_position}
                    </span>
                    <h3 className="font-display font-bold text-lg">{r.market_name}</h3>
                  </div>
                  <span className={`badge ${r.is_complete ? 'badge-green' : 'badge-amber'}`}>
                    {r.is_complete ? 'Vollständig' : `${r.missing_categories_count} fehlen`}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-muted)' }}>Warenkorb</span>
                    <span className="font-mono font-medium">{euro(r.basket_sum)}</span>
                  </div>
                  {Number(r.travel_cost) > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--color-text-muted)' }}>Fahrtkosten</span>
                      <span className="font-mono font-medium">{euro(r.travel_cost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="font-semibold">Gesamt</span>
                    <span className="font-mono font-bold text-base">{euro(r.total_sum)}</span>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {r.complete_categories_count}/{categories.length} Kategorien bepreist
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price Matrix Table */}
      <div className="animate-in" style={{ animationDelay: '0.1s' }}>
        <h2 className="font-display text-xl font-bold mb-3">Preisübersicht</h2>
        <div className="card p-0 overflow-auto" style={{ maxHeight: '70vh' }}>
          <table className="price-table">
            <thead>
              <tr>
                <th style={{ minWidth: 160 }}>Kategorie</th>
                <th style={{ minWidth: 80, color: 'var(--color-text-muted)' }} className="text-center text-xs">Menge</th>
                {markets.map(m => (
                  <th key={m.id} className="text-right" style={{ minWidth: 100 }}>{m.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => {
                const cheapestId = getCheapest(cat.id);
                return (
                  <tr key={cat.id}>
                    <td className="font-medium">{cat.name}</td>
                    <td className="text-center text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      {cat.target_quantity} {cat.target_unit}
                    </td>
                    {markets.map(m => {
                      const entry = priceMap[cat.id]?.[m.id];
                      const isCheapest = m.id === cheapestId;
                      return (
                        <td
                          key={m.id}
                          className={`text-right font-mono text-sm ${isCheapest ? 'price-cheapest' : ''} ${!entry ? 'price-missing' : ''}`}
                        >
                          {entry ? (
                            <>
                              {euro(Number(entry.price_value))}
                              {entry.is_promo && <span className="ml-1 text-xs" title="Aktionspreis">🏷️</span>}
                            </>
                          ) : (
                            'fehlt'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                <td className="font-bold">Summe</td>
                <td></td>
                {markets.map(m => {
                  let sum = 0;
                  let complete = true;
                  for (const cat of categories) {
                    const entry = priceMap[cat.id]?.[m.id];
                    if (entry) {
                      sum += Number(entry.price_value);
                    } else {
                      complete = false;
                    }
                  }
                  return (
                    <td key={m.id} className="text-right font-mono font-bold">
                      {euro(sum)}
                      {!complete && <span className="text-xs block font-normal" style={{ color: 'var(--color-warning)' }}>unvollständig</span>}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
