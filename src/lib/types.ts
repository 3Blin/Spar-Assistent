// ============================================================================
// Spar-Assistent MVP – Type Definitions
// ============================================================================

export interface Market {
  id: string;
  name: string;
  region_code: string;
  is_active: boolean;
  distance_km: number | null;
  fixed_travel_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  target_quantity: number;
  target_unit: string;
  note: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PriceEntry {
  id: string;
  market_id: string;
  category_id: string;
  price_value: number;
  currency: string;
  valid_from: string;
  captured_at: string;
  is_promo: boolean;
  source: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  market?: Market;
  category?: Category;
}

export interface CalculationRun {
  id: string;
  region_code: string;
  travel_mode: 'none' | 'fixed' | 'factor';
  travel_factor: number | null;
  exclude_incomplete: boolean;
  created_at: string;
}

export interface CalculationResult {
  id: string;
  calculation_run_id: string;
  market_id: string;
  basket_sum: number;
  travel_cost: number;
  total_sum: number;
  complete_categories_count: number;
  missing_categories_count: number;
  is_complete: boolean;
  rank_position: number;
  created_at: string;
  // Joined
  market?: Market;
}

export interface Receipt {
  id: string;
  calculation_run_id: string | null;
  market_id: string | null;
  file_path: string;
  file_name: string | null;
  file_size_bytes: number | null;
  upload_time: string;
  ocr_status: 'pending' | 'processing' | 'processed' | 'failed' | 'needs_review';
  extracted_market_name: string | null;
  extracted_date: string | null;
  extracted_total: number | null;
  confidence_market: number | null;
  confidence_date: number | null;
  confidence_total: number | null;
  ocr_raw_text: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface ReceiptLineCandidate {
  id: string;
  receipt_id: string;
  raw_text: string;
  extracted_price: number | null;
  suggested_category_id: string | null;
  suggestion_confidence: number | null;
  confirmed_category_id: string | null;
  is_confirmed: boolean;
  created_at: string;
  // Joined
  suggested_category?: Category;
  confirmed_category?: Category;
}

export interface ValidationResult {
  id: string;
  calculation_run_id: string;
  receipt_id: string;
  predicted_total: number;
  actual_total: number;
  deviation_eur: number;
  deviation_percent: number;
  quality_status: 'sehr_gut' | 'brauchbar' | 'kritisch' | 'nicht_tragfaehig';
  created_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CalculationRequest {
  region_code?: string;
  travel_mode: 'none' | 'fixed' | 'factor';
  travel_factor?: number;
  exclude_incomplete?: boolean;
  market_ids?: string[]; // Optional: filter to specific markets
}

export interface CalculationResponse {
  calculation_run_id: string;
  recommended_market_id: string | null;
  recommended_market_name: string | null;
  results: (CalculationResult & { market_name: string })[];
  saving_vs_second_best: number | null;
}

export interface OcrResult {
  market_name: string | null;
  date: string | null;
  total: number | null;
  confidence_market: number;
  confidence_date: number;
  confidence_total: number;
  raw_text: string;
  line_candidates: {
    raw_text: string;
    extracted_price: number | null;
    suggested_category_id: string | null;
    suggestion_confidence: number | null;
  }[];
}

export interface ValidationRequest {
  calculation_run_id: string;
  receipt_id: string;
}

export interface ValidationResponse extends ValidationResult {
  status_label: string;
  status_description: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface PriceMatrix {
  categories: Category[];
  markets: Market[];
  prices: Record<string, Record<string, PriceEntry | null>>; // [categoryId][marketId]
}

export type QualityStatus = 'sehr_gut' | 'brauchbar' | 'kritisch' | 'nicht_tragfaehig';

export const QUALITY_STATUS_CONFIG: Record<QualityStatus, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
}> = {
  sehr_gut: {
    label: 'Sehr gut',
    description: 'Prognose stimmt hervorragend überein',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200',
  },
  brauchbar: {
    label: 'Brauchbar',
    description: 'Prognose ist im akzeptablen Bereich',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
  },
  kritisch: {
    label: 'Kritisch',
    description: 'Deutliche Abweichung – Datenqualität prüfen',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
  },
  nicht_tragfaehig: {
    label: 'Nicht tragfähig',
    description: 'Prognose weicht stark ab – nicht verwertbar',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
  },
};
