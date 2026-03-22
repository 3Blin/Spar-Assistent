import { createServerClient } from './supabase';
import type { CalculationRequest, CalculationResponse, CalculationResult, Market, Category, PriceEntry } from './types';

/**
 * Führt einen vollständigen Berechnungslauf durch:
 * 1. Lädt aktuelle Preise pro Markt
 * 2. Berechnet Warenkorbsummen
 * 3. Addiert optionale Fahrtkosten
 * 4. Erstellt Ranking
 * 5. Speichert Ergebnisse
 */
export async function executeCalculation(request: CalculationRequest): Promise<CalculationResponse> {
  const db = createServerClient();
  const regionCode = request.region_code || process.env.NEXT_PUBLIC_DEFAULT_REGION || 'neustadt';

  // 1. Load active markets for region
  const { data: markets, error: marketsErr } = await db
    .from('markets')
    .select('*')
    .eq('region_code', regionCode)
    .eq('is_active', true);

  if (marketsErr) throw new Error(`Märkte laden fehlgeschlagen: ${marketsErr.message}`);
  if (!markets || markets.length === 0) throw new Error('Keine aktiven Märkte für diese Region gefunden.');

  // 2. Load active categories
  const { data: categories, error: catErr } = await db
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (catErr) throw new Error(`Kategorien laden fehlgeschlagen: ${catErr.message}`);
  if (!categories || categories.length === 0) throw new Error('Keine aktiven Kategorien gefunden.');

  const totalCategories = categories.length;

  // 3. For each market, get the latest price per category
  const marketResults: {
    market: Market;
    basketSum: number;
    travelCost: number;
    totalSum: number;
    completeCount: number;
    missingCount: number;
    isComplete: boolean;
  }[] = [];

  for (const market of markets as Market[]) {
    let basketSum = 0;
    let completeCount = 0;

    for (const category of categories as Category[]) {
      // Get the most recent valid price for this market+category
      const { data: priceData } = await db
        .from('price_entries')
        .select('price_value')
        .eq('market_id', market.id)
        .eq('category_id', category.id)
        .lte('valid_from', new Date().toISOString().split('T')[0])
        .order('valid_from', { ascending: false })
        .order('captured_at', { ascending: false })
        .limit(1);

      if (priceData && priceData.length > 0) {
        basketSum += Number(priceData[0].price_value);
        completeCount++;
      }
    }

    // Calculate travel costs
    let travelCost = 0;
    if (request.travel_mode === 'fixed' && market.fixed_travel_cost != null) {
      travelCost = Number(market.fixed_travel_cost);
    } else if (request.travel_mode === 'factor' && market.distance_km != null) {
      const factor = request.travel_factor ?? 0.30;
      travelCost = Math.round(Number(market.distance_km) * factor * 100) / 100;
    }

    const missingCount = totalCategories - completeCount;
    const isComplete = missingCount === 0;
    const totalSum = Math.round((basketSum + travelCost) * 100) / 100;

    marketResults.push({
      market,
      basketSum: Math.round(basketSum * 100) / 100,
      travelCost,
      totalSum,
      completeCount,
      missingCount,
      isComplete,
    });
  }

  // 4. Sort by total_sum (incomplete markets last if exclude_incomplete)
  let ranked = [...marketResults];
  if (request.exclude_incomplete) {
    ranked = ranked.filter(r => r.isComplete);
  }
  ranked.sort((a, b) => {
    // Complete markets first
    if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
    return a.totalSum - b.totalSum;
  });

  // 5. Create calculation run
  const { data: run, error: runErr } = await db
    .from('calculation_runs')
    .insert({
      region_code: regionCode,
      travel_mode: request.travel_mode,
      travel_factor: request.travel_factor ?? null,
      exclude_incomplete: request.exclude_incomplete ?? false,
    })
    .select()
    .single();

  if (runErr) throw new Error(`Berechnungslauf speichern fehlgeschlagen: ${runErr.message}`);

  // 6. Save results
  const results: (CalculationResult & { market_name: string })[] = [];
  for (let i = 0; i < ranked.length; i++) {
    const r = ranked[i];
    const { data: saved, error: saveErr } = await db
      .from('calculation_results')
      .insert({
        calculation_run_id: run.id,
        market_id: r.market.id,
        basket_sum: r.basketSum,
        travel_cost: r.travelCost,
        total_sum: r.totalSum,
        complete_categories_count: r.completeCount,
        missing_categories_count: r.missingCount,
        is_complete: r.isComplete,
        rank_position: i + 1,
      })
      .select()
      .single();

    if (saveErr) throw new Error(`Ergebnis speichern fehlgeschlagen: ${saveErr.message}`);

    results.push({
      ...saved,
      market_name: r.market.name,
    });
  }

  // 7. Calculate savings
  const completeResults = results.filter(r => r.is_complete);
  let savingVsSecondBest: number | null = null;
  let recommendedMarketId: string | null = null;
  let recommendedMarketName: string | null = null;

  if (completeResults.length >= 1) {
    recommendedMarketId = completeResults[0].market_id;
    recommendedMarketName = completeResults[0].market_name;
  }
  if (completeResults.length >= 2) {
    savingVsSecondBest = Math.round(
      (Number(completeResults[1].total_sum) - Number(completeResults[0].total_sum)) * 100
    ) / 100;
  }

  return {
    calculation_run_id: run.id,
    recommended_market_id: recommendedMarketId,
    recommended_market_name: recommendedMarketName,
    results,
    saving_vs_second_best: savingVsSecondBest,
  };
}

/**
 * Loads the current price matrix for display
 */
export async function loadPriceMatrix(regionCode: string = 'neustadt') {
  const db = createServerClient();

  const { data: markets } = await db
    .from('markets')
    .select('*')
    .eq('region_code', regionCode)
    .eq('is_active', true)
    .order('name');

  const { data: categories } = await db
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (!markets || !categories) return null;

  const today = new Date().toISOString().split('T')[0];

  // Build price matrix
  const prices: Record<string, Record<string, PriceEntry | null>> = {};

  for (const cat of categories) {
    prices[cat.id] = {};
    for (const market of markets) {
      const { data } = await db
        .from('price_entries')
        .select('*')
        .eq('market_id', market.id)
        .eq('category_id', cat.id)
        .lte('valid_from', today)
        .order('valid_from', { ascending: false })
        .order('captured_at', { ascending: false })
        .limit(1);

      prices[cat.id][market.id] = data && data.length > 0 ? data[0] : null;
    }
  }

  return { markets, categories, prices };
}
