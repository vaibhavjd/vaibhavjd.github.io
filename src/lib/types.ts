// Shared shapes for data/published/*.json — the contract between the
// diag-pipeline export job and this site. Change here = change the exporter.

export interface City {
  slug: string;
  name: string;
  state: string;
}

export interface ProviderUsp {
  kind: string;
  title: string;
  detail: string;
}

export interface Provider {
  slug: string;
  name: string;
  kind: 'national_chain' | 'at_home_lab' | 'online_aggregator';
  website: string;
  booking_url: string;
  nabl: boolean;
  cap: boolean;
  in_house_lab: boolean;
  centers_nationwide: number | null;
  usps: ProviderUsp[];
  home_collection: {
    available: boolean;
    fee_inr: number;
    free_above_inr: number | null;
  };
  express_minutes: number | null;
  fbc_templates: Array<{
    name: string;
    panels: string[];
    claimed_params: number;
    consult_included: boolean;
    smart_report: boolean;
  }>;
}

export interface TestDef {
  slug: string;
  name: string;
  short: string;
  aka: string[];
  category: string;
  band: [number, number];
  fasting_hours: number;
  tat_hours: [number, number];
  sample: string;
  measures: string;
  why: string;
  prep: string;
  faqs: Array<{ q: string; a: string }>;
  panel_slugs: string[];
}

export interface Panel {
  slug: string;
  name: string;
  params: string[];
}

export interface OfferFee {
  label: string;
  amount: number;
}

export interface Offer {
  id: string;
  provider: string;
  city: string;
  kind: 'test' | 'package';
  test?: string;
  package_id?: string;
  mrp: number;
  price: number;
  coupon: { code: string; off_inr: number } | null;
  collection_fee: number;
  free_collection_above: number | null;
  other_fees: OfferFee[];
  tat_hours: number;
  earliest_slot: string;
  report_modes: string[];
  last_verified: string;
  source_url: string;
}

export interface PackageDef {
  id: string;
  provider: string;
  name: string;
  claimed_params: number;
  panels: string[];
  consult_included: boolean;
  smart_report: boolean;
  fasting_required: boolean;
  gender: 'any' | 'male' | 'female';
  tat_hours: number;
}

export interface ReviewAggregate {
  provider: string;
  source: 'google' | 'play' | 'appstore';
  city: string | null;
  rating: number;
  count: number;
  fetched_at: string;
  ref: string;
}

export interface DataMeta {
  generated_at: string;
  data_mode: 'fixture' | 'live';
  changed_urls: string[];
}

// ---- derived shapes ----

export interface EnrichedOffer {
  offer: Offer;
  provider: Provider;
  /** Collection fee actually charged for a typical home-collection order. */
  appliedCollectionFee: number;
  otherFeesTotal: number;
  couponOff: number;
  /** price + applied fees − coupon: the number the user actually pays. */
  total: number;
  savingsVsMrp: number;
  rating: { rating: number; count: number; source: string } | null;
}

export interface PackageCard {
  pkg: PackageDef;
  enriched: EnrichedOffer;
  verifiedParams: number;
  pricePerParam: number;
}

export interface CoverageRow {
  panel: Panel;
  included: boolean[];
}
