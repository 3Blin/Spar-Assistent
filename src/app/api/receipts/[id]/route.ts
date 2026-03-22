import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const db = createServerClient();

  const { data, error } = await db
    .from('receipts')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: 'Bon nicht gefunden' }, { status: 404 });
  return NextResponse.json(data);
}
