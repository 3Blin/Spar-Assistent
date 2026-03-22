import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  const db = createServerClient();
  const { data, error } = await db
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function POST(request: NextRequest) {
  const db = createServerClient();
  const body = await request.json();

  const { name, target_quantity, target_unit, note, sort_order } = body;
  if (!name || !target_quantity || !target_unit) {
    return NextResponse.json({ error: 'Name, Menge und Einheit sind erforderlich' }, { status: 400 });
  }

  const { data, error } = await db
    .from('categories')
    .insert({ name, target_quantity, target_unit, note: note ?? null, sort_order: sort_order ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
