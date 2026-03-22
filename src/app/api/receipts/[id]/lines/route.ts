import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const db = createServerClient();

  const { data, error } = await db
    .from('receipt_line_candidates')
    .select('*, suggested_category:categories!receipt_line_candidates_suggested_category_id_fkey(name), confirmed_category:categories!receipt_line_candidates_confirmed_category_id_fkey(name)')
    .eq('receipt_id', params.id)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}
