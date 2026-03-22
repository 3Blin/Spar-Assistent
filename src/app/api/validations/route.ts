import { NextRequest, NextResponse } from 'next/server';
import { createValidation } from '@/lib/validation';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { calculation_run_id, receipt_id } = body;

    if (!calculation_run_id || !receipt_id) {
      return NextResponse.json(
        { error: 'calculation_run_id und receipt_id sind erforderlich' },
        { status: 400 }
      );
    }

    const result = await createValidation(calculation_run_id, receipt_id);
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const db = createServerClient();
  const { data, error } = await db
    .from('validation_results')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}
