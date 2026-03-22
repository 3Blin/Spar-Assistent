import { createServerClient } from './supabase';
import type { OcrResult } from './types';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * Process a receipt image using Claude Vision API
 * Extracts: market name, date, total, and line items
 */
export async function processReceiptOcr(
  imageBase64: string,
  mediaType: string = 'image/jpeg'
): Promise<OcrResult> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY nicht konfiguriert');
  }

  // Load categories for matching
  const db = createServerClient();
  const { data: categories } = await db
    .from('categories')
    .select('id, name, target_quantity, target_unit')
    .eq('is_active', true)
    .order('sort_order');

  const categoryList = (categories || []).map(
    (c: any) => `${c.name} (${c.target_quantity} ${c.target_unit})`
  ).join(', ');

  const systemPrompt = `Du bist ein Experte für deutsche Kassenbons. Analysiere das Bild eines Kassenbons und extrahiere strukturierte Daten.

Antworte ausschließlich im folgenden JSON-Format (kein anderer Text):
{
  "market_name": "Name des Marktes oder null",
  "market_confidence": 0.0-1.0,
  "date": "YYYY-MM-DD oder null",
  "date_confidence": 0.0-1.0,
  "total": numerischer Wert oder null,
  "total_confidence": 0.0-1.0,
  "line_items": [
    {
      "raw_text": "Originalzeile vom Bon",
      "price": numerischer Wert oder null,
      "suggested_category": "Name der passenden Kategorie oder null"
    }
  ]
}

Bekannte Referenzkategorien zum Matching: ${categoryList}

Regeln:
- Confidence-Werte: 1.0 = absolut sicher, 0.5 = unsicher, 0.0 = nicht erkannt
- Gesamtsumme ist typischerweise die letzte/größte Summe auf dem Bon (oft nach "SUMME", "GESAMT", "TOTAL", "EUR")
- Marktname steht meist oben auf dem Bon
- Datum in deutschem Format (TT.MM.JJJJ) → umwandeln in YYYY-MM-DD
- Bei Unsicherheit lieber null als falsche Daten
- Pfand und Zwischensummen sind KEINE Gesamtsumme`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Analysiere diesen Kassenbon und extrahiere die Daten im angegebenen JSON-Format.',
            },
          ],
        },
      ],
      system: systemPrompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API Fehler: ${response.status} – ${errorText}`);
  }

  const data = await response.json();
  const textContent = data.content?.find((c: any) => c.type === 'text')?.text || '';

  // Parse JSON from response
  let parsed: any;
  try {
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Kein JSON in Antwort');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('OCR-Ergebnis konnte nicht geparst werden');
  }

  // Map suggested categories to IDs
  const lineCandidates = (parsed.line_items || []).map((item: any) => {
    let suggestedCategoryId: string | null = null;
    let suggestionConfidence: number | null = null;

    if (item.suggested_category && categories) {
      const match = categories.find(
        (c: any) => c.name.toLowerCase() === item.suggested_category?.toLowerCase()
      );
      if (match) {
        suggestedCategoryId = match.id;
        suggestionConfidence = 0.7; // baseline confidence for keyword match
      }
    }

    return {
      raw_text: item.raw_text || '',
      extracted_price: item.price ?? null,
      suggested_category_id: suggestedCategoryId,
      suggestion_confidence: suggestionConfidence,
    };
  });

  return {
    market_name: parsed.market_name || null,
    date: parsed.date || null,
    total: parsed.total ?? null,
    confidence_market: parsed.market_confidence ?? 0,
    confidence_date: parsed.date_confidence ?? 0,
    confidence_total: parsed.total_confidence ?? 0,
    raw_text: textContent,
    line_candidates: lineCandidates,
  };
}
