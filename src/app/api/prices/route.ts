import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const db = createServerClient();
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get('market_id');
  const categoryId = searchParams.get('category_id');
  const date = searchParams.get('date');

  let query = db.from('price_entries').select('*, market:markets(name), category:categories(name, target_quantity, target_unit)');

  if (marketId) query = query.eq('market_id', marketId);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (date) query = query.lte('valid_from', date);

  query = query.order('valid_from', { ascending: false }).order('captured_at', { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function POST(request: NextRequest) {
  const db = createServerClient();
  const body = await request.json();

  const { market_id, category_id, price_value, currency, valid_from, is_promo, source, note } = body;

  if (!market_id || !category_id || price_value == null || !valid_from) {
    return NextResponse.json({ error: 'market_id, category_id, price_value und valid_from sind erforderlich' }, { status: 400 });
  }

  if (typeof price_value !== 'number' || price_value < 0) {
    return NextResponse.json({ error: 'Preis muss eine positive Zahl sein' }, { status: 400 });
  }

  const { data, error } = await db
    .from('price_entries')
    .insert({
      market_id,
      category_id,
      price_value,
      currency: currency || 'EUR',
      valid_from,
      captured_at: new Date().toISOString(),
      is_promo: is_promo ?? false,
      source: source ?? 'manual',
      note: note ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
