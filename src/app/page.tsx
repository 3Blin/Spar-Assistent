'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Settings, Info, Table2, Trophy, MapPin, Check } from 'lucide-react';
import type { Market, Category, PriceEntry, CalculationResponse } from '@/lib/types';

type TravelMode = 'none' | 'fixed' | 'factor';

const STORAGE_KEY = 'spar_active_markets';

// ── Reference product descriptions ──────────────────────────────────────────
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Milch':       '1 Liter Vollmilch 3,5% Fett (Eigenmarke)',
  'Eier':        '10 Stück Freilandeier, Größe M',
  'Brot':        '500 g Roggenmischbrot oder Toastbrot (Eigenmarke)',
  'Butter':      '250 g Deutsche Markenbutter, 82% Fett',
  'Käse':        '400 g Gouda am Stück, 48% Fett i. Tr.',
  'Joghurt':     '500 g Naturjoghurt, 3,5% Fett (Eigenmarke)',
  'Kartoffeln':  '1,5 kg festkochende Kartoffeln',
  'Nudeln':      '500 g Spaghetti oder Penne (Eigenmarke)',
  'Reis':        '1 kg Langkornreis (Eigenmarke)',
  'Mehl':        '1 kg Weizenmehl Type 405',
  'Zucker':      '1 kg Kristallzucker',
  'Öl':          '1 Liter Sonnenblumen- oder Rapsöl',
  'Zwiebeln':    '1 kg Haushaltszwiebeln, gelb',
  'Knoblauch':   '1 Knolle Knoblauch (ca. 50 g)',
  'Tomaten':     '500 g Rispentomaten',
  'Paprika':     '3 Paprikaschoten (rot/gelb/grün, gemischt)',
  'Gurke':       '1 Salatgurke (ca. 400 g)',
  'Äpfel':       '1 kg Äpfel (Sorte je nach Saison)',
  'Bananen':     '1 kg Bananen',
  'Wurst':       '200 g Aufschnitt (Fleischwurst oder Lyoner, Eigenmarke)',
};

// ── Price source labels ──────────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  seed:      { icon: '🔰', label: 'Schätzwert',   color: '#c87820' },
  prospekt:  { icon: '📋', label: 'Prospekt',      color: '#3b5fc0' },
  bon:       { icon: '📄', label: 'Bon-Scan',      color: '#1a7a4c' },
  manual:    { icon: '✏️', label: 'Manuell',       color: '#6b6b60' },
};
const defaultSource = { icon: '📝', label: 'Eingetragen', color: '#6b6b60' };

function sourceInfo(source: string | null) {
  return SOURCE_LABELS[source ?? ''] ?? defaultSource;
}

function formatShortDate(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
}

function isStale(dateStr: string | null | undefined, days = 60): boolean {
  if (!dateStr) return false;
  return (Date.now() - new Date(dateStr).getTime()) > days * 86400 * 1000;
}

function trustClass(source: string | null, validFrom: string | null | undefined): string {
  if (isStale(validFrom)) return 'trust-stale';
  switch (source) {
    case 'bon':      return 'trust-bon';
    case 'prospekt': return 'trust-prospekt';
    case 'manual':   return 'trust-manual';
    default:         return 'trust-seed';
  }
}

function trustChipClass(source: string | null, validFrom: string | null | undefined): string {
  if (isStale(validFrom)) return 'trust-chip trust-chip-stale';
  switch (source) {
    case 'bon':      return 'trust-chip trust-chip-bon';
    case 'prospekt': return 'trust-chip trust-chip-prospekt';
    case 'manual':   return 'trust-chip trust-chip-manual';
    default:         return 'trust-chip trust-chip-seed';
  }
}

// ── Portal tooltip ────────────────────────────────────────────────────────────
// AUDIT-FIX: tabIndex={0} + onFocus/onBlur damit Tooltip auch per Tastatur erreichbar ist
function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleShow = (e: React.SyntheticEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top - 6 });
    setShow(true);
  };

  return (
    <>
      <button
        className="info-icon"
        onMouseEnter={handleShow}
        onFocus={handleShow}
        onMouseLeave={() => setShow(false)}
        onBlur={() => setShow(false)}
        tabIndex={0}
        aria-label={`Produktinfo: ${text}`}
        aria-describedby={undefined}
      >
        {/* AUDIT-FIX: Lucide Info-Icon statt ⓘ-Zeichen für konsistentes Rendering */}
        <Info size={12} aria-hidden="true" />
      </button>
      {mounted && show && createPortal(
        <div className="tooltip-popup" style={{ left: pos.x, top: pos.y }} role="tooltip">
          {text}
        </div>,
        document.body
      )}
    </>
  );
}

// AUDIT-FIX: Initials-Avatare mit Brandfarben statt farbige Emoji-Kreise
// (Emoji-Kreise rendern plattformabhängig unterschiedlich)
const MARKET_COLORS: Record<string, { bg: string; text: string; initials: string }> = {
  'Aldi Süd':          { bg: '#1a3c8f', text: '#fff', initials: 'AL' },
  'Lidl':              { bg: '#f5c800', text: '#003087', initials: 'LI' },
  'Penny':             { bg: '#cc0000', text: '#fff', initials: 'PE' },
  'Globus':            { bg: '#e87722', text: '#fff', initials: 'GL' },
  'Mixmarkt':          { bg: '#2e7d32', text: '#fff', initials: 'MX' },
  'Kaufland Haßloch':  { bg: '#d50000', text: '#fff', initials: 'KA' },
};

function MarketAvatar({ name, size = 22 }: { name: string; size?: number }) {
  const config = MARKET_COLORS[name] ?? { bg: 'var(--color-accent)', text: '#fff', initials: name.slice(0, 2).toUpperCase() };
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: config.bg,
        color: config.text,
        fontSize: size * 0.38,
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        flexShrink: 0,
        letterSpacing: '-0.03em',
      }}
    >
      {config.initials}
    </span>
  );
}

const marketIcon = (name: string) => <MarketAvatar name={name} />;

// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [markets, setMarkets]     = useState<Market[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceMap, setPriceMap]   = useState<Record<string, Record<string, PriceEntry | null>>>({});
  const [loading, setLoading]     = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult]       = useState<CalculationResponse | null>(null);
  const [error, setError]         = useState<string | null>(null);

  // Market toggles
  const [activeMarketIds, setActiveMarketIds] = useState<Set<string>>(new Set());
  const [marketsLoaded, setMarketsLoaded]     = useState(false);

  // Settings
  const [travelMode, setTravelMode]         = useState<TravelMode>('none');
  const [travelFactor, setTravelFactor]     = useState(0.30);
  const [excludeIncomplete, setExcludeIncomplete] = useState(false);

  // UI toggles
  const [showInfo, setShowInfo]         = useState(false);
  const [showMatrix, setShowMatrix]     = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [marketsRes, catsRes, pricesRes] = await Promise.all([
        fetch('/api/markets').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/prices').then(r => r.json()),
      ]);

      const mkts: Market[]      = marketsRes.items || [];
      const cats: Category[]    = catsRes.items    || [];
      const prices: PriceEntry[] = pricesRes.items || [];

      setMarkets(mkts);
      setCategories(cats);

      const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (saved) {
        try {
          const savedIds: string[] = JSON.parse(saved);
          const validIds = savedIds.filter(id => mkts.some(m => m.id === id));
          setActiveMarketIds(new Set(validIds.length > 0 ? validIds : mkts.map(m => m.id)));
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
            .filter(p => p.category_id === cat.id && p.market_id === mkt.id)
            .sort((a, b) => b.valid_from.localeCompare(a.valid_from));
          matrix[cat.id][mkt.id] = matching[0] ?? null;
        }
      }
      setPriceMap(matrix);
    } catch {
      setError('Daten konnten nicht geladen werden');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (marketsLoaded && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(activeMarketIds)));
    }
  }, [activeMarketIds, marketsLoaded]);

  const toggleMarket = (id: string) => {
    setActiveMarketIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setResult(null);
  };

  const activeMarkets = useMemo(
    () => markets.filter(m => activeMarketIds.has(m.id)),
    [markets, activeMarketIds]
  );

  // ── Auto-ranking: computed client-side from priceMap ──────────────────────
  const quickRanking = useMemo(() => {
    if (!activeMarkets.length || !categories.length || !Object.keys(priceMap).length) return [];
    return activeMarkets
      .map(m => {
        let sum = 0; let complete = 0;
        for (const cat of categories) {
          const entry = priceMap[cat.id]?.[m.id];
          if (entry) { sum += Number(entry.price_value); complete++; }
        }
        return {
          market: m,
          sum: Math.round(sum * 100) / 100,
          complete,
          total: categories.length,
          isComplete: complete === categories.length,
        };
      })
      .sort((a, b) => {
        if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
        return a.sum - b.sum;
      });
  }, [activeMarkets, categories, priceMap]);

  const saving = useMemo(() => {
    const complete = quickRanking.filter(r => r.isComplete);
    if (complete.length >= 2) return Math.round((complete[1].sum - complete[0].sum) * 100) / 100;
    return null;
  }, [quickRanking]);

  // ── Full calculation (with travel costs) ──────────────────────────────────
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
    let minPrice = Infinity; let minMarket: string | null = null;
    for (const mktId of Array.from(activeMarketIds)) {
      const entry = row[mktId];
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

  const winner = quickRanking[0];

  return (
    <div className="space-y-5">

      {/* ── Hero ── */}
      <div className="animate-in">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-1">
          Wo kaufst du heute günstiger ein?
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }} className="text-sm">
          {categories.length} Kategorien · {activeMarkets.length} von {markets.length} Märkten aktiv
        </p>
      </div>


      {/* ── Quick Ranking (always visible, no button needed) ── */}
      {quickRanking.length > 0 && (
        <div className="animate-in" style={{ animationDelay: '0.06s' }}>
          {/* Winner headline */}
          {winner && (
            <div className="savings-banner card mb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  {/* AUDIT-FIX: Lucide Trophy statt 🏆 Emoji */}
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1 savings-banner-label flex items-center gap-1.5">
                    <Trophy size={13} aria-hidden="true" />
                    Heute am günstigsten
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold savings-banner-title flex items-center gap-2">
                    <span aria-hidden="true">{marketIcon(winner.market.name)}</span>
                    {winner.market.name}
                    <span className="font-mono text-lg">{euro(winner.sum)}</span>
                  </h2>
                  {saving != null && saving > 0 && (
                    <p className="mt-1 savings-banner-body text-sm">
                      Du sparst <span className="savings-tag">{euro(saving)}</span> gegenüber dem nächstteuren Markt
                    </p>
                  )}
                </div>
                {/* AUDIT-FIX: Lucide Camera statt 📸 Emoji */}
                <a href={`/bon`} className="btn-primary no-underline text-sm flex items-center gap-1.5">
                  <Camera size={14} aria-hidden="true" />
                  Bon hochladen
                </a>
              </div>
            </div>
          )}

          {/* Ranking cards */}
          <div className="results-grid">
            {quickRanking.map((r, i) => (
              <div
                key={r.market.id}
                className="card result-card"
                data-winner={i === 0 ? 'true' : 'false'}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="font-mono text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                    style={i === 0
                      ? { background: 'var(--color-accent)', color: 'white' }
                      : { background: 'var(--color-border-row)', color: 'var(--color-text-muted)' }
                    }
                  >
                    {i + 1}
                  </span>
                  <span aria-hidden="true">{marketIcon(r.market.name)}</span>
                  <span className="font-display font-bold text-base">{r.market.name}</span>
                  {r.market.distance_km != null && (
                    <span className="text-xs font-mono ml-auto flex items-center gap-0.5" style={{ color: 'var(--color-text-muted)' }} aria-label={`${r.market.distance_km} Kilometer Entfernung`}>
                      <MapPin size={9} aria-hidden="true" />
                      {r.market.distance_km} km
                    </span>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <span className="font-mono font-bold text-xl">{euro(r.sum)}</span>
                  <span className={`badge ${r.isComplete ? 'badge-green' : 'badge-amber'}`}>
                    {r.isComplete ? '✓ Vollständig' : `${r.total - r.complete} fehlen`}
                  </span>
                </div>
                {i > 0 && quickRanking[0] && (
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    +{euro(r.sum - quickRanking[0].sum)} gegenüber Platz 1
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Market Toggles (nach Ranking, damit das Ergebnis zuerst sichtbar ist) ── */}
      <div className="card animate-in" style={{ animationDelay: '0.08s' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Meine Märkte
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Auswahl wird gespeichert</span>
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
                aria-label={`${m.name}${m.distance_km != null ? `, ${m.distance_km} km` : ''} ${active ? '(aktiv)' : '(inaktiv)'}`}
              >
                <span className="market-toggle-icon" aria-hidden="true">{marketIcon(m.name)}</span>
                <span className="market-toggle-name">{m.name}</span>
                {m.distance_km != null && (
                  <span className="market-toggle-dist" aria-hidden="true">
                    <MapPin size={9} style={{ display: 'inline', verticalAlign: 'middle' }} aria-hidden="true" />
                    {' '}{m.distance_km} km
                  </span>
                )}
                {active && (
                  <span className="market-toggle-check" aria-hidden="true">
                    <Check size={11} strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Settings (collapsible) ── */}
      <div className="animate-in" style={{ animationDelay: '0.08s' }}>
        {/* AUDIT-FIX: Lucide Settings + aria-expanded */}
        <button className="info-toggle" onClick={() => setShowSettings(v => !v)} aria-expanded={showSettings}>
          <span className="flex items-center gap-2">
            <Settings size={15} aria-hidden="true" />
            Fahrtkosten einrechnen
          </span>
          <span className="info-toggle-arrow" style={{ transform: showSettings ? 'rotate(180deg)' : 'none' }} aria-hidden="true">▾</span>
        </button>
        {showSettings && (
          <div className="card animate-in" style={{ marginTop: '0.5rem' }}>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Fahrtkosten
                </label>
                <select value={travelMode} onChange={e => setTravelMode(e.target.value as TravelMode)}>
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
                    type="number" step="0.05" min="0"
                    value={travelFactor}
                    onChange={e => setTravelFactor(parseFloat(e.target.value) || 0)}
                  />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer pb-1.5">
                <input type="checkbox" checked={excludeIncomplete} onChange={e => setExcludeIncomplete(e.target.checked)} className="w-4 h-4 accent-[var(--color-accent)]" />
                Nur vollständige
              </label>
              <button onClick={runCalculation} disabled={calculating} className="btn-primary flex items-center gap-2">
                {calculating && <span className="spinner" />}
                {calculating ? 'Berechne…' : '🔍 Mit Fahrtkosten vergleichen'}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 text-red-800 text-sm">⚠️ {error}</div>
      )}

      {/* Full calculation results (only shown when travel costs are used) */}
      {result && (
        <div className="space-y-3 animate-slide-up">
          <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Ergebnis inkl. Fahrtkosten
          </h3>
          <div className="results-grid">
            {result.results.map((r, i) => (
              <div key={r.market_id} className="card result-card" data-winner={i === 0 ? 'true' : 'false'}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
                      style={i === 0 ? { background: 'var(--color-accent)', color: 'white' } : { background: '#f0f0ea', color: 'var(--color-text-muted)' }}>
                      {r.rank_position}
                    </span>
                    <h3 className="font-display font-bold">{r.market_name}</h3>
                  </div>
                  <span className={`badge ${r.is_complete ? 'badge-green' : 'badge-amber'}`}>
                    {r.is_complete ? 'Vollständig' : `${r.missing_categories_count} fehlen`}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-muted)' }}>Warenkorb</span>
                    <span className="font-mono">{euro(r.basket_sum)}</span>
                  </div>
                  {Number(r.travel_cost) > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--color-text-muted)' }}>Fahrt</span>
                      <span className="font-mono">{euro(r.travel_cost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t font-bold" style={{ borderColor: 'var(--color-border)' }}>
                    <span>Gesamt</span>
                    <span className="font-mono">{euro(r.total_sum)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Price Matrix (collapsible) ── */}
      <div className="animate-in" style={{ animationDelay: '0.1s' }}>
        {/* AUDIT-FIX: Lucide Table2 + aria-expanded */}
        <button className="info-toggle" onClick={() => setShowMatrix(v => !v)} aria-expanded={showMatrix}>
          <span className="flex items-center gap-2">
            <Table2 size={15} aria-hidden="true" />
            Preisübersicht – alle {categories.length} Kategorien
          </span>
          <span className="info-toggle-arrow" style={{ transform: showMatrix ? 'rotate(180deg)' : 'none' }} aria-hidden="true">▾</span>
        </button>

        {showMatrix && (
          <div className="animate-in" style={{ marginTop: '0.5rem' }}>
            <div className="card p-0 overflow-auto" style={{ maxHeight: '75vh' }}>
              <table className="price-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 130 }}>Kategorie</th>
                    <th style={{ minWidth: 72, color: 'var(--color-text-muted)' }} className="text-center text-xs">Menge</th>
                    {activeMarkets.map(m => (
                      <th key={m.id} className="text-right" style={{ minWidth: 110 }}>{m.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => {
                    const cheapestId = getCheapest(cat.id);
                    const desc = CATEGORY_DESCRIPTIONS[cat.name];
                    return (
                      <tr key={cat.id}>
                        <td className="font-medium">
                          <span className="flex items-center gap-1">
                            {cat.name}
                            {desc && <InfoTooltip text={desc} />}
                          </span>
                        </td>
                        <td className="text-center text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                          {cat.target_quantity} {cat.target_unit}
                        </td>
                        {activeMarkets.map(m => {
                          const entry = priceMap[cat.id]?.[m.id];
                          const isCheapest = m.id === cheapestId;
                          const stale = entry ? isStale(entry.valid_from) : false;
                          const tClass = entry ? trustClass(entry.source, entry.valid_from) : '';
                          const chipClass = entry ? trustChipClass(entry.source, entry.valid_from) : '';
                          const src = entry ? sourceInfo(entry.source) : null;
                          return (
                            <td
                              key={m.id}
                              className={`text-right ${tClass} ${isCheapest ? 'price-cheapest' : ''} ${!entry ? 'price-missing' : ''}`}
                            >
                              {entry ? (
                                <>
                                  <span className="font-mono font-medium text-sm">
                                    {euro(Number(entry.price_value))}
                                    {entry.is_promo && <span className="ml-1 text-xs" title="Aktionspreis">🏷️</span>}
                                  </span>
                                  <span className={chipClass} style={{ display: 'inline-flex', marginTop: 3 }}>
                                    {stale ? '⚠️ veraltet' : <>{src?.icon} {src?.label}</>}
                                    {' · '}{formatShortDate(entry.valid_from)}
                                  </span>
                                </>
                              ) : (
                                <span className="font-mono text-sm">fehlt</span>
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
                    {activeMarkets.map(m => {
                      let sum = 0; let complete = true;
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
        )}
      </div>

      {/* ── How it works ── */}
      <div className="animate-in" style={{ animationDelay: '0.12s' }}>
        {/* AUDIT-FIX: Lucide Info */}
        <button className="info-toggle" onClick={() => setShowInfo(v => !v)} aria-expanded={showInfo}>
          <span className="flex items-center gap-2">
            <Info size={15} aria-hidden="true" />
            Wie funktioniert Marktfuchs?
          </span>
          <span className="info-toggle-arrow" style={{ transform: showInfo ? 'rotate(180deg)' : 'none' }} aria-hidden="true">▾</span>
        </button>

        {showInfo && (
          <div className="card info-panel animate-in">
            <h3 className="font-display font-bold text-lg mb-4">So funktioniert Marktfuchs</h3>
            <div className="info-grid">
              <div className="info-step">
                <div className="info-step-number">1</div>
                <div>
                  <strong>Referenz-Warenkorb</strong>
                  <p>Marktfuchs vergleicht {categories.length} feste Grundnahrungsmittel-Kategorien. Jede steht für ein konkretes Referenzprodukt (Eigenmarke/Standardgröße). Hover über das ⓘ-Symbol in der Preisübersicht, um zu sehen, was genau verglichen wird.</p>
                </div>
              </div>
              <div className="info-step">
                <div className="info-step-number">2</div>
                <div>
                  <strong>Herkunft der Preisdaten</strong>
                  <p>Jeder Preis hat eine Quelle: <strong style={{ color: '#c87820' }}>🔰 Schätzwert</strong> bedeutet fiktiver Startpreis, <strong style={{ color: '#3b5fc0' }}>📋 Prospekt</strong> kommt aus Angeboten, <strong style={{ color: '#1a7a4c' }}>📄 Bon-Scan</strong> wurde per KI aus einem echten Kassenbon verifiziert. Das Datum zeigt, wann der Preis zuletzt aktualisiert wurde.</p>
                </div>
              </div>
              <div className="info-step">
                <div className="info-step-number">3</div>
                <div>
                  <strong>Märkte auswählen</strong>
                  <p>Wähle oben, welche Märkte für dich relevant sind. Die Auswahl wird gespeichert. Kaufland Haßloch (8 km) lohnt sich nur, wenn der Preisunterschied die Fahrt rechtfertigt – nutze dafür die Fahrtkostenberechnung.</p>
                </div>
              </div>
              <div className="info-step">
                <div className="info-step-number">4</div>
                <div>
                  <strong>Fahrtkosten</strong>
                  <p>Optional kannst du Fahrtkosten einrechnen – entweder pauschal oder distanzbasiert (z. B. 0,30 €/km). Das ändert das Ranking, wenn weiter entfernte Märkte günstiger sind.</p>
                </div>
              </div>
              <div className="info-step">
                <div className="info-step-number">5</div>
                <div>
                  <strong>Bon-Validierung</strong>
                  <p>Nach dem Einkauf kannst du deinen Bon hochladen. Die KI liest den Betrag aus und vergleicht ihn mit der Prognose – so verbessern sich die Preisdaten über Zeit und Schätzwerte werden durch echte Preise ersetzt.</p>
                </div>
              </div>
              <div className="info-step">
                <div className="info-step-number">6</div>
                <div>
                  <strong>Transparenz</strong>
                  <p>Alle Preise basieren auf Daten aus Neustadt an der Weinstraße und Haßloch. Keine Werbung, keine gesponserten Empfehlungen. Der günstigste Gesamtwarenkorb gewinnt – schlicht und einfach.</p>
                </div>
              </div>
            </div>
            <div className="info-note">
              {/* AUDIT-FIX: aria-hidden auf dekorative Emoji */}
              <span aria-hidden="true">💡 </span>
              <strong>Tipp:</strong> Schätzwerte (<span aria-hidden="true">🔰</span>) sind ungenau – lade nach dem Einkauf deinen Bon hoch, um echte Preise zu hinterlegen und das Ranking präziser zu machen.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
