import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateCombinedOrderPricing } from './combinedEngine';

describe('Pricing Engine Khusus Order Gabungan HITUNG BANTER', () => {
  it('Skenario 1 (Audit User): 2 pelanggan jarak 6 KM & 3 KM (Total 9 KM)', () => {
    // Audit Kasus: Pelanggan 1 = 6 km, Pelanggan 2 = 3 km
    const result = calculateCombinedOrderPricing({
      customers: [
        {
          customer_name: 'Bima',
          delivery_address: 'Banjaranyar',
          distance_km: 6,
        },
        {
          customer_name: 'Mat Codet',
          delivery_address: 'Dagan Solokuro',
          distance_km: 3,
        },
      ],
    });

    // 1. Total Jarak
    assert.strictEqual(result.total_distance_km, 9);
    assert.strictEqual(result.customer_count, 2);

    // 2. Ongkir masing-masing
    // Cust 1 (6 km): 8.000 + (6 - 2) * 2.500 = 18.000
    // Cust 2 (3 km): 8.000 + (3 - 2) * 2.500 = 10.500
    assert.strictEqual(result.customer_results[0].delivery_fee, 18000);
    assert.strictEqual(result.customer_results[1].delivery_fee, 10500);
    assert.strictEqual(result.total_delivery_fee, 28500);

    // 3. Bagian Admin Akumulatif Riil (Default Transparan):
    // Cust 1: 4 km extra * 500 = 2.000 (mencapai max Rp2.000)
    // Cust 2: 1 km extra * 500 = 500
    // Total Admin Share = 2.000 + 500 = 2.500 (Bukan angka statis Rp750 atau Rp1.000!)
    assert.strictEqual(result.customer_results[0].individual_admin_share, 2000);
    assert.strictEqual(result.customer_results[1].individual_admin_share, 500);
    assert.strictEqual(result.admin_share, 2500);

    // 4. Bagian BANTER 10%:
    // Dasar: 28.500 - 2.500 = 26.000. 10% = 2.600
    assert.strictEqual(result.banter_share, 2600);

    // 5. Hak Bersih Pengantaran Driver:
    // 28.500 - 2.500 - 2.600 = 23.400
    // (Per pelanggan: 14.400 + 9.000 = 23.400)
    assert.strictEqual(result.driver_delivery_share, 23400);
    assert.strictEqual(result.driver_total_delivery_entitlement, 23400);

    // 6. Verifikasi simulasi metode perbandingan (untuk konfirmasi Admin di UI):
    // Rute Konsolidasi (9 km dicap maks 2.000):
    assert.strictEqual(result.admin_method_comparison.consolidated_route.admin_share, 2000);
    assert.strictEqual(result.admin_method_comparison.consolidated_route.banter_share, 2650);
    assert.strictEqual(result.admin_method_comparison.consolidated_route.driver_delivery_share, 23850);

    // Flat Count (2 pelanggan = flat 1.000):
    assert.strictEqual(result.admin_method_comparison.flat_count.admin_share, 1000);
    assert.strictEqual(result.admin_method_comparison.flat_count.banter_share, 2750);
    assert.strictEqual(result.admin_method_comparison.flat_count.driver_delivery_share, 24750);
  });

  it('Skenario 2: Order Gabungan dengan 3 pelanggan dan rute berbeda', () => {
    const result = calculateCombinedOrderPricing({
      customers: [
        { customer_name: 'Pelanggan 1', delivery_address: 'Alamat 1', distance_km: 2 }, // 8.000, admin 0
        { customer_name: 'Pelanggan 2', delivery_address: 'Alamat 2', distance_km: 4 }, // 13.000, admin 1.000
        { customer_name: 'Pelanggan 3', delivery_address: 'Alamat 3', distance_km: 5 }, // 15.500, admin 1.500
      ],
    });

    assert.strictEqual(result.customer_count, 3);
    assert.strictEqual(result.total_distance_km, 11);
    // Ongkir: 8.000 + 13.000 + 15.500 = 36.500
    assert.strictEqual(result.total_delivery_fee, 36500);
    // Admin: 0 + 1.000 + 1.500 = 2.500
    assert.strictEqual(result.admin_share, 2500);
    // BANTER: 10% * (36.500 - 2.500) = 10% * 34.000 = 3.400
    assert.strictEqual(result.banter_share, 3400);
    // Driver: 36.500 - 2.500 - 3.400 = 30.600
    assert.strictEqual(result.driver_delivery_share, 30600);
  });

  it('Skenario 3: Harga barang sebagian masih menunggu konfirmasi (has_unconfirmed_prices)', () => {
    const result = calculateCombinedOrderPricing({
      customers: [
        {
          customer_name: 'Bima',
          delivery_address: 'Banjaranyar',
          distance_km: 6,
          locations: [
            {
              name: 'Toko Fatma Paciran',
              address: 'Paciran',
              items: [
                { name: 'Odol', qty: 1, unit_price: 0, is_price_unconfirmed: true },
              ],
            },
          ],
        },
        {
          customer_name: 'Mat Codet',
          delivery_address: 'Dagan',
          distance_km: 3,
          locations: [
            {
              name: 'Toserba Sunan Drajat',
              address: 'Drajat',
              items: [
                { name: 'Sampo', qty: 1, unit_price: 6000, is_price_unconfirmed: false },
                { name: 'Beras', qty: 1, unit_price: 70, is_price_unconfirmed: false },
              ],
            },
          ],
        },
      ],
    });

    // Harus terdeteksi bahwa ada harga yang belum diketahui
    assert.strictEqual(result.has_unconfirmed_prices, true);
    assert.strictEqual(result.customer_results[0].has_unconfirmed_prices, true);
    assert.strictEqual(result.customer_results[1].has_unconfirmed_prices, false);
    // Subtotal Mat Codet = 6.000 + 70 = 6.070
    assert.strictEqual(result.customer_results[1].shopping_subtotal, 6070);
  });

  it('Skenario 4: Setiap pelanggan memiliki ongkir dan jarak berbeda dengan pembulatan', () => {
    const result = calculateCombinedOrderPricing({
      customers: [
        { customer_name: 'A', delivery_address: 'A', distance_km: 2.4 }, // rounded to 2 km -> 8.000
        { customer_name: 'B', delivery_address: 'B', distance_km: 2.6 }, // rounded to 3 km -> 10.500
      ],
    });

    assert.strictEqual(result.customer_results[0].rounded_distance, 2);
    assert.strictEqual(result.customer_results[0].delivery_fee, 8000);
    assert.strictEqual(result.customer_results[1].rounded_distance, 3);
    assert.strictEqual(result.customer_results[1].delivery_fee, 10500);
  });

  it('Skenario 5: Terdapat biaya hujan (Rp5.000) dan jam malam (Rp5.000) - 100% hak driver', () => {
    const result = calculateCombinedOrderPricing({
      customers: [
        { customer_name: 'A', delivery_address: 'A', distance_km: 2 },
      ],
      is_rain: true,
      is_night: true,
    });

    assert.strictEqual(result.rain_fee, 5000);
    assert.strictEqual(result.night_fee, 5000);
    assert.strictEqual(result.extra_fees_total, 10000);
    // Ongkir = 8.000, admin = 0, banter = 800, driver delivery = 7.200
    // Driver total delivery entitlement = 7.200 + 10.000 = 17.200
    assert.strictEqual(result.driver_total_delivery_entitlement, 17200);
  });

  it('Skenario 6 & 7: Pemisahan Modal Driver (Reimburse) vs Modal Admin', () => {
    // Belanja menggunakan modal Driver
    const withDriverModal = calculateCombinedOrderPricing({
      customers: [{ customer_name: 'A', delivery_address: 'A', distance_km: 2 }],
      driver_shopping_modal: 50000,
      admin_shopping_modal: 0,
    });
    // Hak driver mencakup penggantian modal driver
    assert.strictEqual(withDriverModal.driver_shopping_modal, 50000);
    assert.strictEqual(withDriverModal.driver_total_entitlement, 7200 + 50000);

    // Belanja menggunakan modal Admin
    const withAdminModal = calculateCombinedOrderPricing({
      customers: [{ customer_name: 'A', delivery_address: 'A', distance_km: 2 }],
      driver_shopping_modal: 0,
      admin_shopping_modal: 50000,
    });
    // Modal admin TIDAK masuk sebagai utang/hak pembayaran driver
    assert.strictEqual(withAdminModal.admin_shopping_modal, 50000);
    assert.strictEqual(withAdminModal.driver_total_entitlement, 7200);
  });

  it('Skenario 8: Kompatibilitas metode flat_count jika dipilih admin', () => {
    const result = calculateCombinedOrderPricing({
      customers: [
        { customer_name: 'A', delivery_address: 'A', distance_km: 2 },
        { customer_name: 'B', delivery_address: 'B', distance_km: 4 },
        { customer_name: 'C', delivery_address: 'C', distance_km: 3 },
      ],
      admin_calculation_method: 'flat_count',
    });

    assert.strictEqual(result.admin_calculation_method, 'flat_count');
    assert.strictEqual(result.admin_share, 2000);
  });
});
