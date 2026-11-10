import {
  CombinedAdminPricingMethod,
} from '../../types';
import { calculatePricing, roundHalfUp } from './engine';

export interface CustomerPricingInput {
  id?: string;
  customer_name: string;
  customer_phone?: string;
  delivery_address: string;
  delivery_maps_url?: string;
  distance_km: number;
  delivery_fee?: number; // if predetermined or overridden
  locations?: {
    id?: string;
    name: string;
    address: string;
    maps_url?: string;
    items?: {
      id?: string;
      name: string;
      qty: number;
      unit_price: number;
      notes?: string;
      is_price_unconfirmed?: boolean;
    }[];
  }[];
}

export interface CombinedPricingInput {
  customers: CustomerPricingInput[];
  is_rain?: boolean;
  is_night?: boolean;
  driver_shopping_modal?: number;
  admin_shopping_modal?: number;
  admin_calculation_method?: CombinedAdminPricingMethod;
  admin_share_override?: number;
}

export interface CustomerCalculationDetail {
  customer_name: string;
  distance_km: number;
  rounded_distance: number;
  delivery_fee: number;
  individual_admin_share: number;
  individual_banter_share: number;
  individual_driver_delivery_share: number;
  shopping_subtotal: number;
  has_unconfirmed_prices: boolean;
  locations_count: number;
  extra_locations_count: number;
}

export interface AdminMethodSimulation {
  method: CombinedAdminPricingMethod;
  name: string;
  admin_share: number;
  banter_share: number;
  driver_delivery_share: number;
  driver_total_delivery_entitlement: number;
  description: string;
}

export interface CombinedCalculationResult {
  customer_count: number;
  total_distance_km: number;
  customer_results: CustomerCalculationDetail[];
  total_delivery_fee: number;

  // Admin Calculation
  admin_calculation_method: CombinedAdminPricingMethod;
  admin_share: number;
  admin_calculation_breakdown: string;
  admin_method_comparison: {
    accumulative_per_customer: AdminMethodSimulation;
    consolidated_route: AdminMethodSimulation;
    flat_count: AdminMethodSimulation;
  };

  // BANTER & Driver Shares
  banter_share: number;
  driver_delivery_share: number;

  // Extra Fees (100% Hak Driver)
  extra_locations_count: number;
  extra_locations_fee: number;
  rain_fee: number;
  night_fee: number;
  extra_fees_total: number;
  driver_total_delivery_entitlement: number;

  // Shopping Modal
  total_shopping_cost: number;
  has_unconfirmed_prices: boolean;
  driver_shopping_modal: number;
  admin_shopping_modal: number;

  // Final Totals
  customer_total_bill: number;
  driver_total_entitlement: number;
}

/**
 * Pricing Engine khusus Order Gabungan HITUNG BANTER:
 *
 * Mengakomodasi audit mendalam atas perhitungan ongkir:
 * 1. Jarak setiap pelanggan & pembulatan standar (round-half-up).
 * 2. Total jarak rute (penjumlahan jarak pengantaran tiap pelanggan).
 * 3. Ongkir kotor masing-masing pelanggan (0-2 km: Rp8.000, di atas 2 km: +Rp2.500/km).
 * 4. Pilihan metode Bagian Admin transparan:
 *    - accumulative_per_customer (Default & Rekomendasi):
 *      Setiap pelanggan dihitung potongan admin sesuai KM masing-masing (Rp500/km di atas 2km, maks Rp2.000).
 *      Contoh 6km + 3km: Cust 1 (Rp2.000) + Cust 2 (Rp500) = Rp2.500.
 *    - consolidated_route:
 *      Total rute dihitung sebagai 1 order gabungan (9km - 2km = 7km * 500 = 3.500 dicap maks Rp2.000).
 *    - flat_count:
 *      Tarif flat (1 cust: Rp0, 2 cust: Rp1.000, 3 cust: Rp2.000).
 * 5. Bagian BANTER 10%:
 *    10% * (Total Ongkir - Bagian Admin), dibulatkan ke Rupiah terdekat.
 * 6. Hak Bersih Ongkir Driver:
 *    Total Ongkir - Bagian Admin - Bagian BANTER.
 * 7. Biaya Tambahan (100% Hak Driver):
 *    - Lokasi ekstra (>1 toko per pelanggan): Rp2.000/lokasi.
 *    - Cuaca hujan: Rp5.000.
 *    - Malam hari: Rp5.000.
 * 8. Status Belanja:
 *    Mendeteksi apakah ada barang yang harganya belum diketahui (is_price_unconfirmed atau Rp0),
 *    sehingga tagihan total berstatus "Belum Final" dan tidak menganggap Rp0 sebagai harga final.
 */
export function calculateCombinedOrderPricing(
  input: CombinedPricingInput
): CombinedCalculationResult {
  const customers = input.customers || [];
  const customer_count = Math.min(3, Math.max(1, customers.length));
  const method: CombinedAdminPricingMethod = input.admin_calculation_method || 'accumulative_per_customer';

  let total_distance_km = 0;
  let total_delivery_fee = 0;
  let total_shopping_cost = 0;
  let extra_locations_count = 0;
  let has_unconfirmed_prices = false;

  const customer_results: CustomerCalculationDetail[] = customers.slice(0, 3).map((cust) => {
    const rawDist = Number(cust.distance_km) || 0;
    const roundedDist = roundHalfUp(rawDist);
    total_distance_km += rawDist;

    // Determine ongkir
    let delivery_fee = cust.delivery_fee;
    if (delivery_fee === undefined || delivery_fee === null) {
      const singleCalc = calculatePricing({ distance_km: rawDist });
      delivery_fee = singleCalc.delivery_fee;
    }

    // Determine individual standard admin share for this customer's distance
    const extraKm = Math.max(0, roundedDist - 2);
    const individual_admin_share = Math.min(extraKm * 500, 2000);
    const banterBase = Math.max(0, delivery_fee - individual_admin_share);
    const individual_banter_share = Math.round(0.10 * banterBase);
    const individual_driver_delivery_share = delivery_fee - individual_admin_share - individual_banter_share;

    // Determine shopping cost & unconfirmed items
    let shopping_subtotal = 0;
    let custHasUnconfirmed = false;
    const locations = cust.locations || [];
    locations.forEach((loc) => {
      (loc.items || []).forEach((item) => {
        const qty = Math.max(1, item.qty || 1);
        const price = Math.max(0, item.unit_price || 0);
        if (item.is_price_unconfirmed || price === 0) {
          custHasUnconfirmed = true;
          has_unconfirmed_prices = true;
        }
        shopping_subtotal += qty * price;
      });
    });

    // Extra locations count: each place after the 1st place in this customer's order
    const locCount = Math.max(1, locations.length);
    const extraLocs = Math.max(0, locCount - 1);
    extra_locations_count += extraLocs;

    total_delivery_fee += delivery_fee;
    total_shopping_cost += shopping_subtotal;

    return {
      customer_name: cust.customer_name,
      distance_km: rawDist,
      rounded_distance: roundedDist,
      delivery_fee,
      individual_admin_share,
      individual_banter_share,
      individual_driver_delivery_share,
      shopping_subtotal,
      has_unconfirmed_prices: custHasUnconfirmed,
      locations_count: locCount,
      extra_locations_count: extraLocs,
    };
  });

  // Calculate Simulations for the 3 Methods
  // Method 1: Accumulative per customer
  const accumulativeAdminShare = customer_results.reduce(
    (sum, c) => sum + c.individual_admin_share,
    0
  );
  const accumulativeBanterShare = Math.round(
    0.10 * Math.max(0, total_delivery_fee - accumulativeAdminShare)
  );
  const accumulativeDriverShare =
    total_delivery_fee - accumulativeAdminShare - accumulativeBanterShare;

  // Method 2: Consolidated Route (total distance as one route, max cut 2000)
  const totalRoundedDistance = roundHalfUp(total_distance_km);
  const consolidatedExtraKm = Math.max(0, totalRoundedDistance - 2);
  const consolidatedAdminShare = Math.min(consolidatedExtraKm * 500, 2000);
  const consolidatedBanterShare = Math.round(
    0.10 * Math.max(0, total_delivery_fee - consolidatedAdminShare)
  );
  const consolidatedDriverShare =
    total_delivery_fee - consolidatedAdminShare - consolidatedBanterShare;

  // Method 3: Flat Count
  let flatAdminShare = 0;
  if (customer_count === 1) {
    flatAdminShare = 0;
  } else if (customer_count === 2) {
    flatAdminShare = 1000;
  } else if (customer_count >= 3) {
    flatAdminShare = 2000;
  }
  const flatBanterShare = Math.round(0.10 * Math.max(0, total_delivery_fee - flatAdminShare));
  const flatDriverShare = total_delivery_fee - flatAdminShare - flatBanterShare;

  // Extra fees (100% Hak Driver)
  const extra_locations_fee = extra_locations_count * 2000;
  const rain_fee = input.is_rain ? 5000 : 0;
  const night_fee = input.is_night ? 5000 : 0;
  const extra_fees_total = extra_locations_fee + rain_fee + night_fee;

  const admin_method_comparison = {
    accumulative_per_customer: {
      method: 'accumulative_per_customer' as CombinedAdminPricingMethod,
      name: 'Akumulatif per Pelanggan (Rekomendasi Transparan)',
      admin_share: accumulativeAdminShare,
      banter_share: accumulativeBanterShare,
      driver_delivery_share: accumulativeDriverShare,
      driver_total_delivery_entitlement: accumulativeDriverShare + extra_fees_total,
      description: `Menjumlahkan potongan admin riil tiap pelanggan (${customer_results.map(c => `${c.customer_name}: Rp${c.individual_admin_share.toLocaleString('id-ID')}`).join(' + ')}).`,
    },
    consolidated_route: {
      method: 'consolidated_route' as CombinedAdminPricingMethod,
      name: 'Rute Konsolidasi Tunggal',
      admin_share: consolidatedAdminShare,
      banter_share: consolidatedBanterShare,
      driver_delivery_share: consolidatedDriverShare,
      driver_total_delivery_entitlement: consolidatedDriverShare + extra_fees_total,
      description: `Menghitung total rute ${totalRoundedDistance} KM sebagai 1 pesanan (maksimal Rp2.000).`,
    },
    flat_count: {
      method: 'flat_count' as CombinedAdminPricingMethod,
      name: 'Tarif Flat per Jumlah Pelanggan',
      admin_share: flatAdminShare,
      banter_share: flatBanterShare,
      driver_delivery_share: flatDriverShare,
      driver_total_delivery_entitlement: flatDriverShare + extra_fees_total,
      description: `Tarif flat tetap berdasarkan ${customer_count} pelanggan.`,
    },
  };

  // Determine chosen admin_share
  let admin_share = accumulativeAdminShare;
  let admin_calculation_breakdown = admin_method_comparison.accumulative_per_customer.description;

  if (method === 'consolidated_route') {
    admin_share = consolidatedAdminShare;
    admin_calculation_breakdown = admin_method_comparison.consolidated_route.description;
  } else if (method === 'flat_count') {
    admin_share = flatAdminShare;
    admin_calculation_breakdown = admin_method_comparison.flat_count.description;
  } else if (method === 'custom' && input.admin_share_override !== undefined) {
    admin_share = Math.max(0, input.admin_share_override);
    admin_calculation_breakdown = `Penyesuaian manual Admin: Rp${admin_share.toLocaleString('id-ID')}`;
  }

  // BANTER 10%
  const banterBase = Math.max(0, total_delivery_fee - admin_share);
  const banter_share = Math.round(0.10 * banterBase);

  // Driver delivery remainder
  const driver_delivery_share = total_delivery_fee - admin_share - banter_share;
  const driver_total_delivery_entitlement = driver_delivery_share + extra_fees_total;

  const driver_shopping_modal = Math.max(0, input.driver_shopping_modal || 0);
  const admin_shopping_modal = Math.max(0, input.admin_shopping_modal || 0);

  const customer_total_bill = total_delivery_fee + extra_fees_total + total_shopping_cost;
  const driver_total_entitlement = driver_total_delivery_entitlement + driver_shopping_modal;

  return {
    customer_count,
    total_distance_km,
    customer_results,
    total_delivery_fee,
    admin_calculation_method: method,
    admin_share,
    admin_calculation_breakdown,
    admin_method_comparison,
    banter_share,
    driver_delivery_share,
    extra_locations_count,
    extra_locations_fee,
    rain_fee,
    night_fee,
    extra_fees_total,
    driver_total_delivery_entitlement,
    total_shopping_cost,
    has_unconfirmed_prices,
    driver_shopping_modal,
    admin_shopping_modal,
    customer_total_bill,
    driver_total_entitlement,
  };
}
