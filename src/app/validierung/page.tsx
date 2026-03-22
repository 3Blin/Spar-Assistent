'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { QUALITY_STATUS_CONFIG } from '@/lib/types';
import type { ValidationResult, CalculationResponse, Receipt } from '@/lib/types';

export default function ValidierungPage() {
  const searchParams = useSearchParams();
  const calcRunId = searchParams.get('calc');
  const receiptId = searchParams.get('receipt');

  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [currentValidation, setCurrentValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For manual validation
  const [calcRuns, setCalcRuns] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selCalc, setSelCalc] = useState(calcRunId || '');
  const [selReceipt, setSelReceipt] = useState(receiptId || '');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Auto-run validation if both params are present
    if (calcRunId && receiptId) {
      runValidation(calcRunId, receiptId);
    }
  }, [calcRunId, receiptId]);

  const loadData = async () => {
    setLoading(true);
    const [valRes, receiptsRes] = await Promise.all([
      fetch('/api/validations').then(r => r.json()),
      fetch('/api/receipts').then(r => r.json()),
    ]);
    setValidations(valRes.items || []);
    setReceipts((receiptsRes.items || []).filter((r: Receipt) => r.ocr_status === 'processed'));
    setLoading(false);
  };

  const runValidation = async (cId: string, rId: string) => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/validations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calculation_run_id: cId, receipt_id: rId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrentValidation(data);
      loadData(); // refresh list
    } catch (err: any) {
      setError(err.message);
    }
    setRunning(false);
  };

  const euro = (v: number | null) => v != null ? `${v.toFixed(2).replace('.', ',')} €` : '–';
  const pct = (v: number | null) => v != null ? `${v > 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')} %` : '–';

  const StatusCard = ({ v }: { v: ValidationResult }) => {
    const config = QUALITY_STATUS_CONFIG[v.quality_status];
    return (
      <div className={`card border ${config.bgColor} animate-slide-up`}>
        <div className="text-center space-y-4">
          <div>
            <span className={`badge text-sm ${
              v.quality_status === 'sehr_gut' ? 'badge-green' :
              v.quality_status === 'brauchbar' ? 'badge-amber' :
              v.quality_status === 'kritisch' ? 'badge-orange' : 'badge-red'
            }`}>
              {config.label}
            </span>
          </div>
          <p className={`text-sm ${config.color}`}>{config.description}</p>

          <div className="grid grid-cols-2 gap-6 pt-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Prognose
              </div>
              <div className="font-display font-bold text-2xl">{euro(v.predicted_total)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Realität (Bon)
              </div>
              <div className="font-display font-bold text-2xl">{euro(v.actual_total)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Abweichung</div>
              <div className={`font-mono font-bold text-lg ${config.color}`}>
                {Number(v.deviation_eur) > 0 ? '+' : ''}{euro(v.deviation_eur)}
              </div>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Relativ</div>
              <div className={`font-mono font-bold text-lg ${config.color}`}>
                {pct(v.deviation_percent)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
        <h1 className="font-display text-2xl font-bold tracking-tight mb-1">Validierung</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Vergleiche die Prognose mit dem tatsächlichen Einkauf
        </p>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 text-red-800 text-sm">⚠️ {error}</div>
      )}

      {/* Current validation result */}
      {currentValidation && <StatusCard v={currentValidation} />}

      {/* Manual validation form */}
      {!calcRunId && (
        <div className="card animate-in" style={{ animationDelay: '0.05s' }}>
          <h3 className="font-display font-bold mb-4">Neue Validierung</h3>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Berechnungs-ID
              </label>
              <input
                type="text"
                placeholder="Berechnungslauf-ID"
                value={selCalc}
                onChange={e => setSelCalc(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Bon
              </label>
              <select value={selReceipt} onChange={e => setSelReceipt(e.target.value)}>
                <option value="">– Bon wählen –</option>
                {receipts.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.extracted_market_name || 'Unbekannt'} – {r.extracted_date || 'kein Datum'} – {euro(r.extracted_total)}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => runValidation(selCalc, selReceipt)}
              disabled={running || !selCalc || !selReceipt}
              className="btn-primary flex items-center gap-2"
            >
              {running && <span className="spinner" />}
              Validieren
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {validations.length > 0 && (
        <div className="animate-in" style={{ animationDelay: '0.1s' }}>
          <h3 className="font-display font-bold text-lg mb-3">Bisherige Validierungen</h3>
          <div className="card p-0 overflow-auto">
            <table className="price-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th className="text-right">Prognose</th>
                  <th className="text-right">Realität</th>
                  <th className="text-right">Abweichung</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {validations.map(v => {
                  const config = QUALITY_STATUS_CONFIG[v.quality_status];
                  return (
                    <tr key={v.id}>
                      <td className="text-sm">
                        {new Date(v.created_at).toLocaleDateString('de-DE')}
                      </td>
                      <td className="text-right font-mono">{euro(v.predicted_total)}</td>
                      <td className="text-right font-mono">{euro(v.actual_total)}</td>
                      <td className={`text-right font-mono font-medium ${config.color}`}>
                        {Number(v.deviation_eur) > 0 ? '+' : ''}{euro(v.deviation_eur)} ({pct(v.deviation_percent)})
                      </td>
                      <td className="text-center">
                        <span className={`badge ${
                          v.quality_status === 'sehr_gut' ? 'badge-green' :
                          v.quality_status === 'brauchbar' ? 'badge-amber' :
                          v.quality_status === 'kritisch' ? 'badge-orange' : 'badge-red'
                        }`}>
                          {config.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
