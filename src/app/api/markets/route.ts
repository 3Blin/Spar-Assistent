import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  const db = createServerClient();
  const { data, error } = await db
    .from('markets')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function POST(request: NextRequest) {
  const db = createServerClient();
  const body = await request.json();

  const { name, region_code, distance_km, fixed_travel_cost, is_active } = body;
  if (!name) return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });

  const { data, error } = await db
    .from('markets')
    .insert({
      name,
      region_code: region_code || 'neustadt',
      distance_km: distance_km ?? null,
      fixed_travel_cost: fixed_travel_cost ?? null,
      is_active: is_active ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
