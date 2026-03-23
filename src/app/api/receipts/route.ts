import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createSSRClient } from '@/lib/supabase';
import { createHash } from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

const RATE_LIMIT = 5;          // max uploads per IP per window
const RATE_WINDOW_H = 24;      // window in hours

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const db = createServerClient();
  const id = createHash('sha256').update(`upload:${ip}`).digest('hex').slice(0, 32);
  const windowStart = new Date(Date.now() - RATE_WINDOW_H * 3600 * 1000).toISOString();

  const { data: existing } = await db
    .from('rate_limits')
    .select('count, window_start')
    .eq('id', id)
    .single();

  if (!existing || existing.window_start < windowStart) {
    // First request or window expired – reset
    await db.from('rate_limits').upsert({ id, count: 1, window_start: new Date().toISOString() });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (existing.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  await db.from('rate_limits').update({ count: existing.count + 1 }).eq('id', id);
  return { allowed: true, remaining: RATE_LIMIT - existing.count - 1 };
}

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

  // ── Auth check: require a logged-in user ────────────────────────────────────
  const ssrClient = createSSRClient();
  const { data: { user } } = await ssrClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Anmeldung erforderlich' }, { status: 401 });
  }

  // ── Rate limit: max 5 uploads per IP per 24 h ───────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
          || request.headers.get('x-real-ip')
          || 'unknown';
  const { allowed, remaining } = await checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: `Upload-Limit erreicht. Bitte versuche es in ${RATE_WINDOW_H} Stunden erneut.` },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    );
  }

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

  // Create receipt record (tracking uploader + rate-limit header)
  const { data: receipt, error: dbErr } = await db
    .from('receipts')
    .insert({
      calculation_run_id: calculationRunId || null,
      market_id: marketId || null,
      file_path: filePath,
      file_name: file.name,
      file_size_bytes: file.size,
      ocr_status: 'pending',
      uploaded_by_email: user.email ?? null,
    })
    .select()
    .single();

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json(
    { receipt_id: receipt.id, ocr_status: 'pending', uploads_remaining: remaining },
    { status: 201, headers: { 'X-RateLimit-Remaining': String(remaining) } }
  );
}
