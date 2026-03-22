import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const db = createServerClient();

  const { data: run, error: runErr } = await db
    .from('calculation_runs')
    .select('*')
    .eq('id', params.id)
    .single();

  if (runErr) return NextResponse.json({ error: 'Berechnungslauf nicht gefunden' }, { status: 404 });

  const { data: results, error: resErr } = await db
    .from('calculation_results')
    .select('*, market:markets(name)')
    .eq('calculation_run_id', params.id)
    .order('rank_position');

  if (resErr) return NextResponse.json({ error: resErr.message }, { status: 500 });

  const completeResults = (results || []).filter((r: any) => r.is_complete);
  let savingVsSecondBest = null;
  if (completeResults.length >= 2) {
    savingVsSecondBest = Math.round(
      (Number(completeResults[1].total_sum) - Number(completeResults[0].total_sum)) * 100
    ) / 100;
  }

  return NextResponse.json({
    calculation_run_id: run.id,
    ...run,
    recommended_market_id: completeResults[0]?.market_id || null,
    recommended_market_name: completeResults[0]?.market?.name || null,
    results: (results || []).map((r: any) => ({ ...r, market_name: r.market?.name })),
    saving_vs_second_best: savingVsSecondBest,
  });
}
