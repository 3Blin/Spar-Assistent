import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { processReceiptOcr } from '@/lib/ocr';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const db = createServerClient();

  // 1. Get receipt
  const { data: receipt, error: receiptErr } = await db
    .from('receipts')
    .select('*')
    .eq('id', params.id)
    .single();

  if (receiptErr || !receipt) {
    return NextResponse.json({ error: 'Bon nicht gefunden' }, { status: 404 });
  }

  // 2. Update status to processing
  await db.from('receipts').update({ ocr_status: 'processing' }).eq('id', params.id);

  try {
    // 3. Download image from storage
    const { data: fileData, error: dlErr } = await db.storage
      .from('receipts')
      .download(receipt.file_path);

    if (dlErr || !fileData) {
      await db.from('receipts').update({ ocr_status: 'failed' }).eq('id', params.id);
      return NextResponse.json({ error: 'Bon-Datei konnte nicht geladen werden' }, { status: 500 });
    }

    // 4. Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mediaType = receipt.file_path.endsWith('.png') ? 'image/png' : 'image/jpeg';

    // 5. Run OCR
    const ocrResult = await processReceiptOcr(base64, mediaType);

    // 6. Update receipt with OCR results
    const { data: updated, error: updateErr } = await db
      .from('receipts')
      .update({
        ocr_status: 'processed',
        extracted_market_name: ocrResult.market_name,
        extracted_date: ocrResult.date,
        extracted_total: ocrResult.total,
        confidence_market: ocrResult.confidence_market,
        confidence_date: ocrResult.confidence_date,
        confidence_total: ocrResult.confidence_total,
        ocr_raw_text: ocrResult.raw_text,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    // 7. Save line candidates
    if (ocrResult.line_candidates.length > 0) {
      const lines = ocrResult.line_candidates.map(lc => ({
        receipt_id: params.id,
        raw_text: lc.raw_text,
        extracted_price: lc.extracted_price,
        suggested_category_id: lc.suggested_category_id,
        suggestion_confidence: lc.suggestion_confidence,
        is_confirmed: false,
      }));

      await db.from('receipt_line_candidates').insert(lines);
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    await db.from('receipts').update({ ocr_status: 'failed' }).eq('id', params.id);
    return NextResponse.json({ error: `OCR fehlgeschlagen: ${err.message}` }, { status: 500 });
  }
}
