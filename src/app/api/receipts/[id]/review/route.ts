import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const db = createServerClient();
  const body = await request.json();

  const updates: any = {};
  if (body.extracted_market_name !== undefined) updates.extracted_market_name = body.extracted_market_name;
  if (body.extracted_date !== undefined) updates.extracted_date = body.extracted_date;
  if (body.extracted_total !== undefined) updates.extracted_total = body.extracted_total;
  if (body.market_id !== undefined) updates.market_id = body.market_id;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Keine Änderungen übergeben' }, { status: 400 });
  }

  const { data, error } = await db
    .from('receipts')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
