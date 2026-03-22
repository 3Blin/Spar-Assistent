# 🧺 Spar-Assistent MVP

Lokaler Supermarkt-Preisvergleich mit Bon-Validierung. Beantwortet die Frage: **Welcher Markt ist für meinen Standard-Warenkorb aktuell am günstigsten?**

## Features

- **20-Kategorien Referenz-Warenkorb** – normierte Vergleichsgrundlage
- **3 Märkte** (Aldi, Lidl, Penny) mit realistischen Seed-Preisen
- **Preisvergleich** mit optionalen Fahrtkosten (fix oder distanzbasiert)
- **Bon-Upload + OCR** via Claude Vision API
- **Prognose vs. Realität** – Validierung mit Qualitätsstatus

## Tech-Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend/API | Next.js API Routes |
| Datenbank | Supabase (PostgreSQL) |
| Dateispeicher | Supabase Storage |
| OCR | Anthropic Claude Vision API |
| Hosting | Vercel |

## Schnellstart

### 1. Supabase einrichten

1. Erstelle ein Projekt auf [supabase.com](https://supabase.com)
2. Gehe zu **SQL Editor** und führe diese Dateien der Reihe nach aus:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_data.sql`
3. Gehe zu **Storage** und erstelle einen Bucket namens `receipts` (nicht öffentlich)
4. Setze eine Storage-Policy für den `receipts`-Bucket:
   - Allow INSERT for `anon` role
   - Allow SELECT for `anon` role

### 2. Umgebungsvariablen

Kopiere `.env.example` nach `.env.local`:

```bash
cp .env.example .env.local
```

Fülle aus:
- `NEXT_PUBLIC_SUPABASE_URL` – Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` – Supabase service role key (Settings > API)
- `ANTHROPIC_API_KEY` – Für OCR via Claude Vision

### 3. Installieren & Starten

```bash
npm install
npm run dev
```

App öffnen: [http://localhost:3000](http://localhost:3000)

### 4. Auf Vercel deployen

```bash
npx vercel
```

Setze die Umgebungsvariablen in Vercel Dashboard > Settings > Environment Variables.

## Projektstruktur

```
spar-assistent/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Dashboard + Preisvergleich + Ergebnis
│   │   ├── layout.tsx               # Navigation
│   │   ├── globals.css              # Styling
│   │   ├── admin/preise/page.tsx    # Preispflege
│   │   ├── bon/page.tsx             # Bon-Upload + OCR-Review
│   │   ├── validierung/page.tsx     # Prognose vs. Realität
│   │   └── api/
│   │       ├── markets/             # CRUD Märkte
│   │       ├── categories/          # CRUD Kategorien
│   │       ├── prices/              # CRUD Preise
│   │       ├── calculations/        # Berechnungsläufe
│   │       ├── receipts/            # Upload, OCR, Review
│   │       └── validations/         # Prognose vs. Realität
│   └── lib/
│       ├── types.ts                 # TypeScript-Definitionen
│       ├── supabase.ts              # DB-Client
│       ├── calculations.ts          # Preisberechnung + Ranking
│       ├── validation.ts            # Validierungslogik
│       └── ocr.ts                   # Claude Vision OCR
├── supabase/migrations/
│   ├── 001_initial_schema.sql       # Datenbankschema
│   └── 002_seed_data.sql            # Seed-Daten
├── .env.example
└── README.md
```

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/markets` | Alle aktiven Märkte |
| POST | `/api/markets` | Markt anlegen |
| PUT | `/api/markets/:id` | Markt aktualisieren |
| DELETE | `/api/markets/:id` | Markt deaktivieren |
| GET | `/api/categories` | Alle Referenzkategorien |
| GET | `/api/prices?market_id=&date=` | Preise filtern |
| POST | `/api/prices` | Preis erfassen |
| POST | `/api/calculations` | Berechnung starten |
| GET | `/api/calculations/:id` | Berechnung laden |
| POST | `/api/receipts` | Bon-Upload (multipart) |
| POST | `/api/receipts/:id/process` | OCR starten |
| PUT | `/api/receipts/:id/review` | OCR-Korrektur |
| GET | `/api/receipts/:id/lines` | OCR-Zeilenkandidaten |
| POST | `/api/validations` | Validierung erstellen |
| GET | `/api/validations` | Alle Validierungen |

## Seed-Daten

Bereits enthalten (Stand März 2026):

| Markt | Distanz | Warenkorb-Summe |
|-------|---------|----------------|
| Aldi Süd | 3,2 km | ~28,60 € |
| Lidl | 5,1 km | ~28,80 € |
| Penny | 1,8 km | ~30,40 € |

## Validierungs-Statusklassen

| Status | Bedingung |
|--------|-----------|
| Sehr gut | < 5% UND < 2€ |
| Brauchbar | ≤ 8% ODER ≤ 5€ |
| Kritisch | ≤ 12% ODER ≤ 8€ |
| Nicht tragfähig | > 12% |

## Lizenz

Privates Projekt.
