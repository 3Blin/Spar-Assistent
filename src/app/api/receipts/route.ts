import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

export async function GET() {
  const db = createServerClient();
  const { data, error } = await db
    .from('receipts')
    .select('*')
    .order('upload_time', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function POST(request: NextRequest) {
  const db = createServerClient();

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const calculationRunId = formData.get('calculation_run_id') as string | null;
  const marketId = formData.get('market_id') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Ungültiges Dateiformat: ${file.type}. Erlaubt: JPG, PNG, PDF` },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Datei zu groß (max. ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
      { status: 400 }
    );
  }

  // Upload to Supabase Storage
  const fileExt = file.name.split('.').pop() || 'jpg';
  const filePath = `bons/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadErr } = await db.storage
    .from('receipts')
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json({ error: `Upload fehlgeschlagen: ${uploadErr.message}` }, { status: 500 });
  }

  // Create receipt record
  const { data: receipt, error: dbErr } = await db
    .from('receipts')
    .insert({
      calculation_run_id: calculationRunId || null,
      market_id: marketId || null,
      file_path: filePath,
      file_name: file.name,
      file_size_bytes: file.size,
      ocr_status: 'pending',
    })
    .select()
    .single();

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ receipt_id: receipt.id, ocr_status: 'pending' }, { status: 201 });
}
