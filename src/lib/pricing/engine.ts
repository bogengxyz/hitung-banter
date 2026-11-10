import { CalculationResult, TariffConfig, OrderPricingSnapshot } from '../../types';

export const DEFAULT_TARIFF_CONFIG: TariffConfig = {
  id: 'tariff-standard-v1',
  version: '1.0.0',
  name: 'Tarif Reguler BANTER 2026',
  base_distance_km: 2,
  base_rate: 8000,
  per_km_rate: 2500,
  admin_cut_per_km: 500,
  max_admin_cut: 2000,
  banter_percent: 0.10,
  rain_fee: 5000,
  night_fee: 5000,
  extra_stop_rate: 2000,
  effective_from: '2026-01-01T00:00:00Z',
  is_active: true,
};

export interface PricingInput {
  distance_km: number;
  is_rain?: boolean;
  is_night?: boolean;
  extra_stops_count?: number;
  config?: Partial<TariffConfig>;
}

export function roundHalfUp(distance_km: number): number {
  return Math.floor(Math.max(0, Number(distance_km) || 0) + 0.5);
}

/**
 * Centrally calculates delivery fee and revenue split according to BANTER rules.
 * Rounded distance: floor(distance_km + 0.5)
 * Ongkir: 8000 + max(rounded_distance - 2, 0) * 2500
 * Admin: min(max(rounded_distance - 2, 0) * 500, 2000)
 * BANTER: 10% * (ongkir - admin_share)
 * Driver delivery: ongkir - admin_share - banter_share
 * Extra fees (rain, night, stops): 100% driver entitlement, no cut
 */
export function calculatePricing(input: PricingInput): CalculationResult {
  const cfg: TariffConfig = { ...DEFAULT_TARIFF_CONFIG, ...(input.config || {}) };
  const rawDist = Math.max(0, Number(input.distance_km) || 0);
  
  // Rule: Pembulatan jarak ke KM terdekat dengan aturan setengah ke atas
  // 2.49 KM -> 2 KM, 2.5 KM -> 3 KM, 3.5 KM -> 4 KM
  const roundedDist = roundHalfUp(rawDist);

  const extraKm = Math.max(roundedDist - cfg.base_distance_km, 0);
  const extraKmFee = extraKm * cfg.per_km_rate;
  const delivery_fee = cfg.base_rate + extraKmFee;

  // Admin share: max Rp2.000 (Rp500 per KM above 2 KM)
  const admin_share = Math.min(extraKm * cfg.admin_cut_per_km, cfg.max_admin_cut);

  // BANTER share: 10% of (ongkir - admin_share), rounded to nearest integer Rupiah
  const banterBase = delivery_fee - admin_share;
  const banter_share = Math.round(cfg.banter_percent * banterBase);

  // Driver delivery share: remainder of delivery fee
  const driver_delivery_share = delivery_fee - admin_share - banter_share;

  // Extra fees: 100% driver entitlement
  const rain_fee = input.is_rain ? cfg.rain_fee : 0;
  const night_fee = input.is_night ? cfg.night_fee : 0;
  const stops_count = Math.max(0, Math.floor(Number(input.extra_stops_count) || 0));
  const stops_fee = stops_count * cfg.extra_stop_rate;
  const extra_fees_total = rain_fee + night_fee + stops_fee;

  const driver_total_delivery_entitlement = driver_delivery_share + extra_fees_total;
  const customer_total_fee = delivery_fee + extra_fees_total;

  return {
    distance_raw_km: rawDist,
    distance_rounded_km: roundedDist,
    delivery_fee,
    admin_share,
    banter_share,
    driver_delivery_share,
    extra_fees_total,
    driver_total_delivery_entitlement,
    customer_total_fee,
    breakdown: {
      base_fee: cfg.base_rate,
      extra_km_fee: extraKmFee,
      rain_fee,
      night_fee,
      stops_fee,
    },
  };
}

/**
 * Creates an immutable snapshot of the pricing configuration used for an order
 */
export function createPricingSnapshot(config: TariffConfig = DEFAULT_TARIFF_CONFIG): OrderPricingSnapshot {
  return {
    version: config.version,
    base_distance_km: config.base_distance_km,
    base_rate: config.base_rate,
    per_km_rate: config.per_km_rate,
    admin_cut_per_km: config.admin_cut_per_km,
    max_admin_cut: config.max_admin_cut,
    banter_percent: config.banter_percent,
    rain_fee: config.rain_fee,
    night_fee: config.night_fee,
    extra_stop_rate: config.extra_stop_rate,
  };
}

/**
 * Standard Indonesian Rupiah formatter without decimals: Rp10.000
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp0';
  }
  const isNegative = amount < 0;
  const absVal = Math.round(Math.abs(amount));
  const formatted = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${isNegative ? '-' : ''}Rp${formatted}`;
}

/**
 * Parses user input into a clean positive integer nominal
 */
export function parseRupiahInput(value: string | number): number {
  if (typeof value === 'number') return Math.max(0, Math.round(value));
  const cleaned = value.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}
