import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePricing, formatRupiah } from './engine';

test('Tarif 2 KM matches reference table exactly', () => {
  const result = calculatePricing({ distance_km: 2 });
  assert.equal(result.distance_rounded_km, 2);
  assert.equal(result.delivery_fee, 8000);
  assert.equal(result.admin_share, 0);
  assert.equal(result.banter_share, 800);
  assert.equal(result.driver_delivery_share, 7200);
  assert.equal(result.driver_total_delivery_entitlement, 7200);
});

test('Tarif 2.49 KM rounds down to 2 KM', () => {
  const result = calculatePricing({ distance_km: 2.49 });
  assert.equal(result.distance_rounded_km, 2);
  assert.equal(result.delivery_fee, 8000);
  assert.equal(result.admin_share, 0);
  assert.equal(result.banter_share, 800);
  assert.equal(result.driver_delivery_share, 7200);
});

test('Tarif 2.5 KM rounds up to 3 KM', () => {
  const result = calculatePricing({ distance_km: 2.5 });
  assert.equal(result.distance_rounded_km, 3);
  assert.equal(result.delivery_fee, 10500);
  assert.equal(result.admin_share, 500);
  assert.equal(result.banter_share, 1000);
  assert.equal(result.driver_delivery_share, 9000);
});

test('Tarif 3 KM matches reference table', () => {
  const result = calculatePricing({ distance_km: 3 });
  assert.equal(result.distance_rounded_km, 3);
  assert.equal(result.delivery_fee, 10500);
  assert.equal(result.admin_share, 500);
  assert.equal(result.banter_share, 1000);
  assert.equal(result.driver_delivery_share, 9000);
});

test('Tarif 3.5 KM rounds up to 4 KM', () => {
  const result = calculatePricing({ distance_km: 3.5 });
  assert.equal(result.distance_rounded_km, 4);
  assert.equal(result.delivery_fee, 13000);
  assert.equal(result.admin_share, 1000);
  assert.equal(result.banter_share, 1200);
  assert.equal(result.driver_delivery_share, 10800);
});

test('Tarif 4 KM matches reference table', () => {
  const result = calculatePricing({ distance_km: 4 });
  assert.equal(result.delivery_fee, 13000);
  assert.equal(result.admin_share, 1000);
  assert.equal(result.banter_share, 1200);
  assert.equal(result.driver_delivery_share, 10800);
});

test('Tarif 5 KM matches reference table', () => {
  const result = calculatePricing({ distance_km: 5 });
  assert.equal(result.delivery_fee, 15500);
  assert.equal(result.admin_share, 1500);
  assert.equal(result.banter_share, 1400);
  assert.equal(result.driver_delivery_share, 12600);
});

test('Tarif 6 KM matches reference table (Admin reaches max Rp2.000)', () => {
  const result = calculatePricing({ distance_km: 6 });
  assert.equal(result.delivery_fee, 18000);
  assert.equal(result.admin_share, 2000);
  assert.equal(result.banter_share, 1600);
  assert.equal(result.driver_delivery_share, 14400);
});

test('Tarif 7 KM matches reference table (Admin stays capped at Rp2.000)', () => {
  const result = calculatePricing({ distance_km: 7 });
  assert.equal(result.delivery_fee, 20500);
  assert.equal(result.admin_share, 2000);
  assert.equal(result.banter_share, 1850);
  assert.equal(result.driver_delivery_share, 16650);
});

test('Extra fees: rain, night, and extra stops go 100% to driver', () => {
  const result = calculatePricing({
    distance_km: 3,
    is_rain: true, // +5000
    is_night: true, // +5000
    extra_stops_count: 2, // 2 * 2000 = +4000
  });

  assert.equal(result.delivery_fee, 10500);
  assert.equal(result.admin_share, 500);
  assert.equal(result.banter_share, 1000);
  assert.equal(result.driver_delivery_share, 9000);
  
  // Total extra fees: 5000 + 5000 + 4000 = 14000
  assert.equal(result.extra_fees_total, 14000);
  assert.equal(result.driver_total_delivery_entitlement, 9000 + 14000); // 23000
  assert.equal(result.customer_total_fee, 10500 + 14000); // 24500
});

test('formatRupiah produces standard Indonesian Rupiah notation without decimals', () => {
  assert.equal(formatRupiah(10000), 'Rp10.000');
  assert.equal(formatRupiah(528000), 'Rp528.000');
  assert.equal(formatRupiah(0), 'Rp0');
  assert.equal(formatRupiah(-15000), '-Rp15.000');
});
