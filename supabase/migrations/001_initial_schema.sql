-- ============================================================================
-- Spar-Assistent MVP – Supabase Schema
-- Version: 1.0
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. Markets (Märkte)
-- ============================================================================
create table public.markets (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  region_code   text not null default 'neustadt',
  is_active     boolean not null default true,
  distance_km   numeric(6,2),
  fixed_travel_cost numeric(6,2),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_markets_region on public.markets(region_code);
create index idx_markets_active on public.markets(is_active);

-- ============================================================================
-- 2. Categories (Referenz-Warenkorb Kategorien)
-- ============================================================================
create table public.categories (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  target_quantity numeric(8,2) not null,
  target_unit     text not null,
  note            text,
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_categories_active on public.categories(is_active);
create index idx_categories_sort on public.categories(sort_order);

-- ============================================================================
-- 3. Price Entries (Preisdaten)
-- ============================================================================
create table public.price_entries (
  id            uuid primary key default uuid_generate_v4(),
  market_id     uuid not null references public.markets(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete cascade,
  price_value   numeric(8,2) not null check (price_value >= 0),
  currency      text not null default 'EUR',
  valid_from    date not null,
  captured_at   timestamptz not null default now(),
  is_promo      boolean not null default false,
  source        text,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_prices_market on public.price_entries(market_id);
create index idx_prices_category on public.price_entries(category_id);
create index idx_prices_valid on public.price_entries(valid_from desc);
create index idx_prices_market_cat_date on public.price_entries(market_id, category_id, valid_from desc);

-- ============================================================================
-- 4. Calculation Runs (Berechnungsläufe)
-- ============================================================================
create table public.calculation_runs (
  id            uuid primary key default uuid_generate_v4(),
  region_code   text not null default 'neustadt',
  travel_mode   text not null default 'none' check (travel_mode in ('none', 'fixed', 'factor')),
  travel_factor numeric(6,4),
  exclude_incomplete boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- 5. Calculation Results (Ergebnisse pro Markt)
-- ============================================================================
create table public.calculation_results (
  id                        uuid primary key default uuid_generate_v4(),
  calculation_run_id        uuid not null references public.calculation_runs(id) on delete cascade,
  market_id                 uuid not null references public.markets(id) on delete cascade,
  basket_sum                numeric(8,2) not null,
  travel_cost               numeric(8,2) not null default 0,
  total_sum                 numeric(8,2) not null,
  complete_categories_count integer not null default 0,
  missing_categories_count  integer not null default 0,
  is_complete               boolean not null default false,
  rank_position             integer not null default 0,
  created_at                timestamptz not null default now()
);

create index idx_calcresults_run on public.calculation_results(calculation_run_id);
create index idx_calcresults_rank on public.calculation_results(calculation_run_id, rank_position);

-- ============================================================================
-- 6. Receipts (Kassenbons)
-- ============================================================================
create table public.receipts (
  id                    uuid primary key default uuid_generate_v4(),
  calculation_run_id    uuid references public.calculation_runs(id) on delete set null,
  market_id             uuid references public.markets(id) on delete set null,
  file_path             text not null,
  file_name             text,
  file_size_bytes       integer,
  upload_time           timestamptz not null default now(),
  ocr_status            text not null default 'pending' check (ocr_status in ('pending', 'processing', 'processed', 'failed', 'needs_review')),
  extracted_market_name text,
  extracted_date        date,
  extracted_total       numeric(8,2),
  confidence_market     numeric(4,3),
  confidence_date       numeric(4,3),
  confidence_total      numeric(4,3),
  ocr_raw_text          text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Retention: Bon-Bilder nach 30 Tagen löschbar
  expires_at            timestamptz default (now() + interval '30 days')
);

create index idx_receipts_calcrun on public.receipts(calculation_run_id);
create index idx_receipts_status on public.receipts(ocr_status);

-- ============================================================================
-- 7. Receipt Line Candidates (OCR-Zeilenkandidaten)
-- ============================================================================
create table public.receipt_line_candidates (
  id                      uuid primary key default uuid_generate_v4(),
  receipt_id              uuid not null references public.receipts(id) on delete cascade,
  raw_text                text not null,
  extracted_price         numeric(8,2),
  suggested_category_id   uuid references public.categories(id) on delete set null,
  suggestion_confidence   numeric(4,3),
  confirmed_category_id   uuid references public.categories(id) on delete set null,
  is_confirmed            boolean not null default false,
  created_at              timestamptz not null default now()
);

create index idx_receiptlines_receipt on public.receipt_line_candidates(receipt_id);

-- ============================================================================
-- 8. Validation Results (Validierungsergebnisse)
-- ============================================================================
create table public.validation_results (
  id                  uuid primary key default uuid_generate_v4(),
  calculation_run_id  uuid not null references public.calculation_runs(id) on delete cascade,
  receipt_id          uuid not null references public.receipts(id) on delete cascade,
  predicted_total     numeric(8,2) not null,
  actual_total        numeric(8,2) not null,
  deviation_eur       numeric(8,2) not null,
  deviation_percent   numeric(8,2) not null,
  quality_status      text not null check (quality_status in ('sehr_gut', 'brauchbar', 'kritisch', 'nicht_tragfaehig')),
  created_at          timestamptz not null default now()
);

create index idx_validation_calcrun on public.validation_results(calculation_run_id);

-- ============================================================================
-- 9. App Configuration (konfigurierbare Schwellenwerte)
-- ============================================================================
create table public.app_config (
  key         text primary key,
  value       text not null,
  description text,
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security (minimal für MVP)
-- ============================================================================
alter table public.markets enable row level security;
alter table public.categories enable row level security;
alter table public.price_entries enable row level security;
alter table public.calculation_runs enable row level security;
alter table public.calculation_results enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_line_candidates enable row level security;
alter table public.validation_results enable row level security;
alter table public.app_config enable row level security;

-- MVP: Allow all operations for anon (single-user system)
-- In production, replace with proper auth policies
create policy "Allow all for anon" on public.markets for all using (true) with check (true);
create policy "Allow all for anon" on public.categories for all using (true) with check (true);
create policy "Allow all for anon" on public.price_entries for all using (true) with check (true);
create policy "Allow all for anon" on public.calculation_runs for all using (true) with check (true);
create policy "Allow all for anon" on public.calculation_results for all using (true) with check (true);
create policy "Allow all for anon" on public.receipts for all using (true) with check (true);
create policy "Allow all for anon" on public.receipt_line_candidates for all using (true) with check (true);
create policy "Allow all for anon" on public.validation_results for all using (true) with check (true);
create policy "Allow all for anon" on public.app_config for all using (true) with check (true);

-- ============================================================================
-- Updated_at triggers
-- ============================================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_markets_updated before update on public.markets
  for each row execute function public.update_updated_at();
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.update_updated_at();
create trigger trg_prices_updated before update on public.price_entries
  for each row execute function public.update_updated_at();
create trigger trg_receipts_updated before update on public.receipts
  for each row execute function public.update_updated_at();

-- ============================================================================
-- Supabase Storage Bucket for receipts
-- ============================================================================
-- Run this in Supabase Dashboard > Storage or via API:
-- create bucket 'receipts' with public = false
-- Policy: allow uploads for anon, allow reads for anon
