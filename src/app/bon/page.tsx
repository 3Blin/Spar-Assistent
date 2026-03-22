'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Receipt, Market } from '@/lib/types';

type Step = 'upload' | 'processing' | 'review';

function BonPageInner() {
  const searchParams = useSearchParams();
  const calcRunId = searchParams.get('calc');

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Review fields (editable)
  const [editMarket, setEditMarket] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTotal, setEditTotal] = useState('');
  const [selectedMarketId, setSelectedMarketId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/markets').then(r => r.json()).then(d => setMarkets(d.items || []));
  }, []);

  const handleFile = (f: File) => {
    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const uploadAndProcess = async () => {
    if (!file) return;
    setError(null);
    setStep('processing');

    try {
      // 1. Upload
      const formData = new FormData();
      formData.append('file', file);
      if (calcRunId) formData.append('calculation_run_id', calcRunId);

      const uploadRes = await fetch('/api/receipts', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      // 2. Process OCR
      const processRes = await fetch(`/api/receipts/${uploadData.receipt_id}/process`, { method: 'POST' });
      const processData = await processRes.json();
      if (!processRes.ok) throw new Error(processData.error);

      setReceipt(processData);
      setEditMarket(processData.extracted_market_name || '');
      setEditDate(processData.extracted_date || '');
      setEditTotal(processData.extracted_total != null ? String(processData.extracted_total) : '');

      // Auto-match market
      if (processData.extracted_market_name) {
        const match = markets.find(m =>
          m.name.toLowerCase().includes(processData.extracted_market_name.toLowerCase()) ||
          processData.extracted_market_name.toLowerCase().includes(m.name.toLowerCase())
        );
        if (match) setSelectedMarketId(match.id);
      }

      setStep('review');
    } catch (err: any) {
      setError(err.message);
      setStep('upload');
    }
  };

  const saveReview = async () => {
    if (!receipt) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/receipts/${receipt.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extracted_market_name: editMarket,
          extracted_date: editDate || null,
          extracted_total: editTotal ? parseFloat(editTotal) : null,
          market_id: selectedMarketId || null,
        }),
      });
      if (!res.ok) throw new Error('Speichern fehlgeschlagen');

      const updated = await res.json();
      setReceipt(updated);

      // Redirect to validation if we have a calc run
      if (calcRunId) {
        window.location.href = `/validierung?calc=${calcRunId}&receipt=${receipt.id}`;
      }
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  const confidenceLabel = (c: number | null) => {
    if (c == null) return { text: 'unbekannt', cls: 'confidence-low' };
    if (c >= 0.8) return { text: `${Math.round(c * 100)}% sicher`, cls: 'confidence-high' };
    if (c >= 0.5) return { text: `${Math.round(c * 100)}% – prüfen`, cls: 'confidence-medium' };
    return { text: `${Math.round(c * 100)}% – unsicher`, cls: 'confidence-low' };
  };

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="font-display text-2xl font-bold tracking-tight mb-1">Bon hochladen</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Lade ein Foto deines Kassenbons hoch zur Auswertung
          {calcRunId && <span className="ml-1 badge badge-green">Verknüpft mit Berechnung</span>}
        </p>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 text-red-800 text-sm">⚠️ {error}</div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="animate-in" style={{ animationDelay: '0.05s' }}>
          <div
            className={`dropzone ${file ? 'active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {preview ? (
              <div className="space-y-3">
                <img src={preview} alt="Bon-Vorschau" className="max-h-60 mx-auto rounded-lg shadow" />
                <p className="text-sm font-medium">{file?.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Klicke, um ein anderes Bild zu wählen
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-4xl">📸</div>
                <p className="font-medium">Bon-Bild hierher ziehen oder klicken</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  JPG oder PNG · max. 10 MB · möglichst scharf und gerade
                </p>
              </div>
            )}
          </div>

          {file && (
            <div className="flex justify-end mt-4">
              <button onClick={uploadAndProcess} className="btn-primary">
                📤 Hochladen &amp; analysieren
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Processing */}
      {step === 'processing' && (
        <div className="card text-center py-12 animate-in">
          <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40 }} />
          <p className="font-medium text-lg">Bon wird analysiert…</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            OCR-Erkennung läuft – das dauert wenige Sekunden
          </p>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && receipt && (
        <div className="grid md:grid-cols-2 gap-6 animate-slide-up">
          {/* Left: Image */}
          <div className="card">
            <h3 className="font-display font-bold text-lg mb-3">Bon-Bild</h3>
            {preview && (
              <img src={preview} alt="Kassenbon" className="w-full rounded-lg" />
            )}
          </div>

          {/* Right: OCR Results */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-display font-bold text-lg mb-4">Erkannte Daten</h3>

              <div className="space-y-4">
                {/* Market Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                      Marktname
                    </label>
                    <span className={`text-xs font-medium ${confidenceLabel(receipt.confidence_market).cls}`}>
                      {confidenceLabel(receipt.confidence_market).text}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={editMarket}
                    onChange={e => setEditMarket(e.target.value)}
                  />
                </div>

                {/* Market Assignment */}
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Zuordnung zu Markt
                  </label>
                  <select value={selectedMarketId} onChange={e => setSelectedMarketId(e.target.value)}>
                    <option value="">– Bitte zuordnen –</option>
                    {markets.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                      Datum
                    </label>
                    <span className={`text-xs font-medium ${confidenceLabel(receipt.confidence_date).cls}`}>
                      {confidenceLabel(receipt.confidence_date).text}
                    </span>
                  </div>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                  />
                </div>

                {/* Total */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                      Gesamtsumme (€)
                    </label>
                    <span className={`text-xs font-medium ${confidenceLabel(receipt.confidence_total).cls}`}>
                      {confidenceLabel(receipt.confidence_total).text}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editTotal}
                    onChange={e => setEditTotal(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setStep('upload'); setFile(null); setPreview(null); setReceipt(null); }}
                className="btn-secondary flex-1"
              >
                🔄 Neuer Bon
              </button>
              <button
                onClick={saveReview}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving && <span className="spinner" />}
                {calcRunId ? '✅ Speichern & Validieren' : '✅ Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BonPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="spinner" style={{ width: 32, height: 32 }} /></div>}>
      <BonPageInner />
    </Suspense>
  );
}
