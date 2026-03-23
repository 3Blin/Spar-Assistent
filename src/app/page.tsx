'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Market, Category, PriceEntry, CalculationResponse } from '@/lib/types';

type TravelMode = 'none' | 'fixed' | 'factor';

const STORAGE_KEY = 'spar_active_markets';

const MARKET_ICONS: Record<string, string> = {
  'Aldi Süd': '🟦',
  'Lidl': '🟨',
  'Penny': '🟥',
  'Globus': '🟢',
  'Mixmarkt': '🌍',
  'Kaufland Haßloch': '🔴',
};

export default function Dashboard() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, Record<string, PriceEntry | null>>>({});
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Market toggles (set of active market IDs)
  const [activeMarketIds, setActiveMarketIds] = useState<Set<string>>(new Set());
  const [marketsLoaded, setMarketsLoaded] = useState(false);

  // Settings
  const [travelMode, setTravelMode] = useState<TravelMode>('none');
  const [travelFactor, setTravelFactor] = useState(0.30);
  const [excludeIncomplete, setExcludeIncomplete] = useState(false);

  // Info section toggle
  const [showInfo, setShowInfo] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [marketsRes, catsRes, pricesRes] = await Promise.all([
        fetch('/api/markets').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/prices').then(r => r.json()),
      ]);

      const mkts: Market[] = marketsRes.items || [];
      const cats: Category[] = catsRes.items || [];
      const prices: PriceEntry[] = pricesRes.items || [];

      setMarkets(mkts);
      setCategories(cats);

      // Restore saved market preferences from localStorage
      const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (saved) {
        try {
          const savedIds: string[] = JSON.parse(saved);
          // Keep only IDs that still exist in the DB
          const validIds = savedIds.filter(id => mkts.some(m => m.id === id));
          if (validIds.length > 0) {
            setActiveMarketIds(new Set(validIds));
          } else {
            setActiveMarketIds(new Set(mkts.map(m => m.id)));
          }
        } catch {
          setActiveMarketIds(new Set(mkts.map(m => m.id)));
        }
      } else {
        setActiveMarketIds(new Set(mkts.map(m => m.id)));
      }
      setMarketsLoaded(true);

      // Build price matrix
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
    } catch {
      setError('Daten konnten nicht geladen werden');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Persist market selection to localStorage
  useEffect(() => {
    if (marketsLoaded && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(activeMarketIds)));
    }
  }, [activeMarketIds, marketsLoaded]);

  const toggleMarket = (id: string) => {
    setActiveMarketIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev; // keep at least one active
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setResult(null); // clear old results when selection changes
  };

  const activeMarkets = markets.filter(m => activeMarketIds.has(m.id));

  const runCalculation = async () => {
    if (activeMarkets.length === 0) return;
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
          market_ids: Array.from(activeMarketIds),
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
    for (const mktId of Array.from(activeMarketIds)) {
      const entry = row[mktId];
      if (entry && Number(entry.price_value) < minPrice) {
        minPrice = Number(entry.price_value);
        minMarket = mktId;
      }
    }
    return minMarket;
  };

  const marketIcon = (name: string) => MARKET_ICONS[name] || '🏪';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="animate-in">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-1">
          Wo kaufst du heute günstiger ein?
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }} className="text-sm sm:text-base">
          Referenz-Warenkorb mit {categories.length} Kategorien · {activeMarkets.length} von {markets.length} Märkten aktiv
        </p>
      </div>

      {/* ── Market Selector ── */}
      <div className="card animate-in" style={{ animationDelay: '0.04s' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Meine Märkte
          </h2>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Auswahl wird gespeichert
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {markets.map(m => {
            const active = activeMarketIds.has(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleMarket(m.id)}
                className="market-toggle"
                data-active={active ? 'true' : 'false'}
                aria-pressed={active}
              >
                <span className="market-toggle-icon">{marketIcon(m.name)}</span>
                <span className="market-toggle-name">{m.name}</span>
                {m.distance_km != null && (
                  <span className="market-toggle-dist">{m.distance_km} km</span>
                )}
                {active && <span className="market-toggle-check">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Settings + Calculate ── */}
      <div className="card animate-in" style={{ animationDelay: '0.08s' }}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Fahrtkosten
            </label>
            <select value={travelMode} onChange={(e) => setTravelMode(e.target.value as TravelMode)}>
              <option value="none">Ohne Fahrtkosten</option>
              <option value="factor">Distanzbasiert (€/km)</option>
              <option value="fixed">Fixkosten pro Markt</option>
            </select>
          </div>

          {travelMode === 'factor' && (
            <div className="w-32">
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

          <label className="flex items-center gap-2 text-sm cursor-pointer pb-1.5">
            <input
              type="checkbox"
              checked={excludeIncomplete}
              onChange={(e) => setExcludeIncomplete(e.target.checked)}
              className="w-4 h-4 accent-[var(--color-accent)]"
            />
            Nur vollständige
          </label>

          <button
            onClick={runCalculation}
            disabled={calculating || activeMarkets.length === 0}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {calculating && <span className="spinner" />}
            {calculating ? 'Berechne…' : '🔍 Vergleichen'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 text-red-800 text-sm">⚠️ {error}</div>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Winner Banner */}
          {result.recommended_market_name && (
            <div className="card savings-banner">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1 savings-banner-label">
                    🏆 Empfehlung heute
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold savings-banner-title">
                    {result.recommended_market_name} ist am günstigsten
                  </h2>
                  <p className="mt-1 savings-banner-body">
                    Gesamtkosten: <strong>{euro(result.results[0]?.total_sum)}</strong>
                    {result.saving_vs_second_best != null && result.saving_vs_second_best > 0 && (
                      <> · <span className="savings-tag">Du sparst {euro(result.saving_vs_second_best)}</span></>
                    )}
                  </p>
                </div>
                <a href={`/bon?calc=${result.calculation_run_id}`} className="btn-primary no-underline text-sm">
                  📸 Bon prüfen
                </a>
              </div>
            </div>
          )}

          {/* Result Cards Grid */}
          <div className="results-grid">
            {result.results.map((r, i) => (
              <div
                key={r.market_id}
                className="card result-card"
                data-winner={i === 0 ? 'true' : 'false'}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={i === 0
                        ? { background: 'var(--color-accent)', color: 'white' }
                        : { background: '#f0f0ea', color: 'var(--color-text-muted)' }
                      }
                    >
                      {r.rank_position}
                    </span>
                    <h3 className="font-display font-bold text-lg leading-tight">{r.market_name}</h3>
                  </div>
                  <span className={`badge ${r.is_complete ? 'badge-green' : 'badge-amber'}`}>
                    {r.is_complete ? 'Vollständig' : `${r.missing_categories_count} fehlen`}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm">
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
                  <div className="flex justify-between pt-2 border-t font-semibold" style={{ borderColor: 'var(--color-border)' }}>
                    <span>Gesamt</span>
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

      {/* ── Price Matrix ── */}
      <div className="animate-in" style={{ animationDelay: '0.1s' }}>
        <h2 className="font-display text-xl font-bold mb-3">Preisübersicht</h2>
        <div className="card p-0 overflow-auto" style={{ maxHeight: '70vh' }}>
          <table className="price-table">
            <thead>
              <tr>
                <th style={{ minWidth: 130 }}>Kategorie</th>
                <th style={{ minWidth: 72, color: 'var(--color-text-muted)' }} className="text-center text-xs">Menge</th>
                {activeMarkets.map(m => (
                  <th key={m.id} className="text-right" style={{ minWidth: 90 }}>{m.name}</th>
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
                    {activeMarkets.map(m => {
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
                          ) : 'fehlt'}
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
                {activeMarkets.map(m => {
                  let sum = 0;
                  let complete = true;
                  for (const cat of categories) {
                    const entry = priceMap[cat.id]?.[m.id];
                    if (entry) sum += Number(entry.price_value);
                    else complete = false;
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

      {/* ── How it works ── */}
      <div className="animate-in" style={{ animationDelay: '0.15s' }}>
        <button
          onClick={() => setShowInfo(v => !v)}
          className="info-toggle"
          aria-expanded={showInfo}
        >
          <span>ℹ️ Wie funktioniert der Spar-Assistent?</span>
          <span className="info-toggle-arrow" style={{ transform: showInfo ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </button>

        {showInfo && (
          <div className="card info-panel animate-in">
            <h3 className="font-display font-bold text-lg mb-4">So funktioniert der Preisvergleich</h3>

            <div className="info-grid">
              <div className="info-step">
                <div className="info-step-number">1</div>
                <div>
                  <strong>Referenz-Warenkorb</strong>
                  <p>Der Assistent vergleicht {categories.length} feste Grundnahrungsmittel-Kategorien – von Milch über Brot bis zu Obst und Gemüse. Jede Kategorie steht für eine typische Wocheneinkauf-Menge.</p>
                </div>
              </div>

              <div className="info-step">
                <div className="info-step-number">2</div>
                <div>
                  <strong>Preisdaten</strong>
                  <p>Die Preise werden manuell oder per Bon-Scan eingetragen. Für jedes Produkt wird immer der aktuellste Preis verwendet. Aktionspreise sind gesondert markiert (🏷️).</p>
                </div>
              </div>

              <div className="info-step">
                <div className="info-step-number">3</div>
                <div>
                  <strong>Märkte auswählen</strong>
                  <p>Du kannst oben festlegen, welche Märkte für dich relevant sind. Die Auswahl wird gespeichert. Kaufland Haßloch ist 8 km entfernt – aktiviere die Fahrtkosten-Option, um das einzurechnen.</p>
                </div>
              </div>

              <div className="info-step">
                <div className="info-step-number">4</div>
                <div>
                  <strong>Fahrtkosten</strong>
                  <p>Optional kannst du Fahrtkosten einrechnen – entweder pauschal pro Markt oder distanzbasiert (z. B. 0,30 €/km). So siehst du, ob sich der Weg zu weiter entfernten Märkten lohnt.</p>
                </div>
              </div>

              <div className="info-step">
                <div className="info-step-number">5</div>
                <div>
                  <strong>Bon-Validierung</strong>
                  <p>Nach dem Einkauf kannst du deinen Kassenbon hochladen. Die KI liest den Betrag aus und vergleicht ihn mit der Prognose – so verbessern sich die Preisdaten über Zeit.</p>
                </div>
              </div>

              <div className="info-step">
                <div className="info-step-number">6</div>
                <div>
                  <strong>Transparenz</strong>
                  <p>Alle Preisvergleiche basieren auf echten Daten aus Neustadt an der Weinstraße. Es gibt keine Werbung, keine gesponserten Empfehlungen. Der günstigste Markt gewinnt schlicht und einfach.</p>
                </div>
              </div>
            </div>

            <div className="info-note">
              💡 <strong>Tipp:</strong> Je mehr Preise eingetragen sind, desto genauer wird der Vergleich. Fehlende Preise kannst du unter <a href="/admin/preise" style={{ color: 'var(--color-accent)' }}>Preise</a> nachtragen.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
