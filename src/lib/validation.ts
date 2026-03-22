import { createServerClient } from './supabase';
import type { QualityStatus, ValidationResult } from './types';

/**
 * Determines quality status based on configurable thresholds
 */
export function determineQualityStatus(
  deviationEur: number,
  deviationPercent: number
): QualityStatus {
  const absEur = Math.abs(deviationEur);
  const absPercent = Math.abs(deviationPercent);

  if (absPercent < 5 && absEur < 2) return 'sehr_gut';
  if (absPercent <= 8 || absEur <= 5) return 'brauchbar';
  if (absPercent <= 12 || absEur <= 8) return 'kritisch';
  return 'nicht_tragfaehig';
}

/**
 * Creates a validation by comparing prediction vs reality
 */
export async function createValidation(
  calculationRunId: string,
  receiptId: string
): Promise<ValidationResult> {
  const db = createServerClient();

  // 1. Get the recommended market's total from calculation
  const { data: calcResults, error: calcErr } = await db
    .from('calculation_results')
    .select('*')
    .eq('calculation_run_id', calculationRunId)
    .order('rank_position');

  if (calcErr || !calcResults || calcResults.length === 0) {
    throw new Error('Berechnungsergebnisse nicht gefunden.');
  }

  // 2. Get receipt OCR data
  const { data: receipt, error: receiptErr } = await db
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single();

  if (receiptErr || !receipt) {
    throw new Error('Bon nicht gefunden.');
  }

  if (receipt.extracted_total == null) {
    throw new Error('Bon hat keine erkannte Gesamtsumme. Bitte zuerst OCR durchführen oder manuell korrigieren.');
  }

  // Find the matching market result (by receipt market_id or by recommended)
  let predictedTotal: number;
  if (receipt.market_id) {
    const matchingResult = calcResults.find((r: any) => r.market_id === receipt.market_id);
    if (matchingResult) {
      predictedTotal = Number(matchingResult.total_sum);
    } else {
      // Fallback to best market
      predictedTotal = Number(calcResults[0].total_sum);
    }
  } else {
    predictedTotal = Number(calcResults[0].total_sum);
  }

  const actualTotal = Number(receipt.extracted_total);
  const deviationEur = Math.round((actualTotal - predictedTotal) * 100) / 100;
  const deviationPercent = predictedTotal > 0
    ? Math.round(((actualTotal - predictedTotal) / predictedTotal) * 10000) / 100
    : 0;

  const qualityStatus = determineQualityStatus(deviationEur, deviationPercent);

  // 3. Save validation result
  const { data: validation, error: valErr } = await db
    .from('validation_results')
    .insert({
      calculation_run_id: calculationRunId,
      receipt_id: receiptId,
      predicted_total: predictedTotal,
      actual_total: actualTotal,
      deviation_eur: deviationEur,
      deviation_percent: deviationPercent,
      quality_status: qualityStatus,
    })
    .select()
    .single();

  if (valErr) throw new Error(`Validierung speichern fehlgeschlagen: ${valErr.message}`);

  return validation;
}
