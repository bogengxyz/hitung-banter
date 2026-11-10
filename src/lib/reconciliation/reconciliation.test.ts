import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDriverObligationsSummary,
  allocateCompensation,
  generateCustomerWhatsAppMessage,
  generateDriverWhatsAppMessage,
} from './reconciliationEngine';
import { calculatePricing } from '../pricing/engine';
import { Driver, Order, DriverObligation } from '../../types';

test('Reconciliation Suite - Obligation categorization and compensation', async (t) => {
  const dummyDriver: Driver = {
    id: 'drv-test-01',
    code: 'DRV-01',
    name: 'Budi Santoso',
    phone: '081234567890',
    status: 'active',
    joined_at: '2026-01-01T00:00:00Z',
  };

  await t.test('Scenario 1: Customer Cash to Driver + Modal Admin creates distinct obligations', () => {
    // Distance 2 KM: ongkir 8000, admin 0, banter 800, driver delivery 7200
    // Shopping: 30.000 (Modal Admin)
    // Customer pays cash: 38.000 to Driver
    const pricing = calculatePricing({ distance_km: 2 });
    assert.equal(pricing.delivery_fee, 8000);
    assert.equal(pricing.admin_share, 0);
    assert.equal(pricing.banter_share, 800);
    assert.equal(pricing.driver_delivery_share, 7200);

    const obligations: DriverObligation[] = [
      {
        id: 'ob-1',
        driver_id: dummyDriver.id,
        driver_name: dummyDriver.name,
        category: 'modal_admin',
        amount: 30000,
        settled_amount: 0,
        remaining_amount: 30000,
        order_number: 'BNT-001',
        created_at: '2026-11-09T10:00:00Z',
        status: 'active',
      },
      {
        id: 'ob-2',
        driver_id: dummyDriver.id,
        driver_name: dummyDriver.name,
        category: 'banter_share',
        amount: 800,
        settled_amount: 0,
        remaining_amount: 800,
        order_number: 'BNT-001',
        created_at: '2026-11-09T10:00:00Z',
        status: 'active',
      },
    ];

    const summary = calculateDriverObligationsSummary(dummyDriver.id, obligations);
    assert.equal(summary.modal_admin_pending, 30000, 'Modal admin obligation must be 30.000');
    assert.equal(summary.banter_share_pending, 800, 'Banter share obligation must be 800');
    assert.equal(summary.admin_share_pending, 0);
    assert.equal(summary.driver_loan_pending, 0);
    assert.equal(summary.total_obligations_pending, 30800);
  });

  await t.test('Scenario 2: Driver has 3 distinct obligation categories (Modal Admin, Banter 10%, Pinjaman Driver)', () => {
    const obligations: DriverObligation[] = [
      {
        id: 'ob-1',
        driver_id: dummyDriver.id,
        driver_name: dummyDriver.name,
        category: 'modal_admin',
        amount: 30000,
        settled_amount: 0,
        remaining_amount: 30000,
        order_number: 'BNT-001',
        created_at: '2026-11-09T10:00:00Z',
        status: 'active',
      },
      {
        id: 'ob-2',
        driver_id: dummyDriver.id,
        driver_name: dummyDriver.name,
        category: 'banter_share',
        amount: 800,
        settled_amount: 0,
        remaining_amount: 800,
        order_number: 'BNT-001',
        created_at: '2026-11-09T10:00:00Z',
        status: 'active',
      },
      {
        id: 'ob-3',
        driver_id: dummyDriver.id,
        driver_name: dummyDriver.name,
        category: 'driver_loan',
        amount: 50000,
        settled_amount: 0,
        remaining_amount: 50000,
        created_at: '2026-11-09T08:00:00Z',
        status: 'active',
      },
    ];

    const summary = calculateDriverObligationsSummary(dummyDriver.id, obligations);
    assert.equal(summary.modal_admin_pending, 30000);
    assert.equal(summary.banter_share_pending, 800);
    assert.equal(summary.driver_loan_pending, 50000);
    assert.equal(summary.total_obligations_pending, 80800);
  });

  await t.test('Scenario 3: Compensation allocation prioritizes Modal Admin, then Banter, then Loans', () => {
    // Driver available entitlement to disburse: Rp20.000
    // Total obligations: Rp30.000 modal admin + Rp800 banter share = Rp30.800
    // Request compensation: Rp20.000
    const obligations: DriverObligation[] = [
      {
        id: 'ob-modal-1',
        driver_id: dummyDriver.id,
        driver_name: dummyDriver.name,
        category: 'modal_admin',
        amount: 30000,
        settled_amount: 0,
        remaining_amount: 30000,
        created_at: '2026-11-09T10:00:00Z',
        status: 'active',
      },
      {
        id: 'ob-banter-1',
        driver_id: dummyDriver.id,
        driver_name: dummyDriver.name,
        category: 'banter_share',
        amount: 800,
        settled_amount: 0,
        remaining_amount: 800,
        created_at: '2026-11-09T10:00:00Z',
        status: 'active',
      },
    ];

    const result = allocateCompensation(20000, obligations, dummyDriver.id);
    assert.equal(result.totalCompensated, 20000);
    assert.equal(result.allocations.length, 1);
    assert.equal(result.allocations[0].category, 'modal_admin');
    assert.equal(result.allocations[0].amount, 20000);

    const modalOb = result.remainingObligations.find((o) => o.id === 'ob-modal-1');
    assert.equal(modalOb?.remaining_amount, 10000, 'Remaining modal admin should be 10.000');
    assert.equal(modalOb?.settled_amount, 20000);
    assert.equal(modalOb?.status, 'partially_settled');

    const banterOb = result.remainingObligations.find((o) => o.id === 'ob-banter-1');
    assert.equal(banterOb?.remaining_amount, 800, 'Banter share remains 800');
  });

  await t.test('Scenario 4: Customer WhatsApp Message never leaks internal BANTER figures', () => {
    const dummyOrder: Order = {
      id: 'ord-test-01',
      order_number: 'BNT-20261109-001',
      created_at: '2026-11-09T10:00:00Z',
      updated_at: '2026-11-09T10:00:00Z',
      customer_name: 'Ibu Rahayu',
      driver_id: dummyDriver.id,
      driver_name: dummyDriver.name,
      pickup_address: 'Resto Ayam Goreng Bu Tini',
      delivery_address: 'Jl. Kaliurang KM 5',
      purchase_location: 'Resto Ayam Goreng Bu Tini',
      distance_raw_km: 2,
      distance_rounded_km: 2,
      is_rain: false,
      is_night: false,
      extra_stops_count: 0,
      delivery_fee: 8000,
      admin_share: 0,
      banter_share: 800,
      driver_delivery_share: 7200,
      extra_fees_total: 0,
      driver_total_delivery_entitlement: 7200,
      total_shopping_cost: 40000,
      driver_shopping_modal: 40000,
      admin_shopping_modal: 0,
      customer_total_bill: 48000,
      driver_total_entitlement: 47200,
      customer_payment_status: 'unpaid',
      customer_paid_amount: 0,
      customer_balance_remaining: 48000,
      shopping_price_status: 'confirmed',
      driver_payout_status: 'unpaid',
      driver_received_from_customer: 0,
      driver_transferred_by_admin: 0,
      driver_total_received: 0,
      driver_balance_remaining: 47200,
      status: 'pending',
      pricing_snapshot: {
        version: '1.0.0',
        base_distance_km: 2,
        base_rate: 8000,
        per_km_rate: 2500,
        admin_cut_per_km: 500,
        max_admin_cut: 2000,
        banter_percent: 0.1,
        rain_fee: 5000,
        night_fee: 5000,
        extra_stop_rate: 2000,
      },
      created_by: 'usr-admin',
      created_by_name: 'Admin BANTER',
      items: [
        {
          id: 'it-1',
          name: 'Ayam Goreng',
          qty: 2,
          unit_price: 15000,
          total_price: 30000,
          is_price_known: true,
          funding_source: 'driver',
        },
        {
          id: 'it-2',
          name: 'Es Teh',
          qty: 2,
          unit_price: 5000,
          total_price: 10000,
          is_price_known: true,
          funding_source: 'driver',
        },
      ],
    };

    const msg = generateCustomerWhatsAppMessage(dummyOrder);
    assert.match(msg, /RINCIAN PESANAN BANTER/);
    assert.match(msg, /BNT-20261109-001/);
    assert.match(msg, /Ayam Goreng/);
    assert.match(msg, /Rp48\.000/);

    // ANTI-LEAK CHECKS: No internal admin, banter 10%, driver debt, driver loan
    assert.doesNotMatch(msg, /Bagian Admin/i);
    assert.doesNotMatch(msg, /Bagian BANTER/i);
    assert.doesNotMatch(msg, /10%/);
    assert.doesNotMatch(msg, /Hak Bersih Driver/i);
    assert.doesNotMatch(msg, /Kewajiban/i);
    assert.doesNotMatch(msg, /Pinjaman/i);
    assert.doesNotMatch(msg, /Modal Admin/i);
  });

  await t.test('Scenario 5: Customer WhatsApp Message handles unconfirmed prices properly', () => {
    const dummyOrderPending: Order = {
      id: 'ord-test-02',
      order_number: 'BNT-20261109-002',
      created_at: '2026-11-09T10:00:00Z',
      updated_at: '2026-11-09T10:00:00Z',
      customer_name: 'Pak Handoko',
      driver_id: dummyDriver.id,
      driver_name: dummyDriver.name,
      pickup_address: 'Pasar Kranggan',
      delivery_address: 'Jl. Magelang KM 4',
      distance_raw_km: 3,
      distance_rounded_km: 3,
      is_rain: true,
      is_night: false,
      extra_stops_count: 0,
      delivery_fee: 10500,
      admin_share: 500,
      banter_share: 1000,
      driver_delivery_share: 9000,
      extra_fees_total: 5000,
      driver_total_delivery_entitlement: 14000,
      total_shopping_cost: 0,
      driver_shopping_modal: 0,
      admin_shopping_modal: 0,
      customer_total_bill: 15500,
      driver_total_entitlement: 14000,
      customer_payment_status: 'unpaid',
      customer_paid_amount: 0,
      customer_balance_remaining: 15500,
      shopping_price_status: 'pending_driver',
      driver_payout_status: 'unpaid',
      driver_received_from_customer: 0,
      driver_transferred_by_admin: 0,
      driver_total_received: 0,
      driver_balance_remaining: 14000,
      status: 'pending',
      pricing_snapshot: {
        version: '1.0.0',
        base_distance_km: 2,
        base_rate: 8000,
        per_km_rate: 2500,
        admin_cut_per_km: 500,
        max_admin_cut: 2000,
        banter_percent: 0.1,
        rain_fee: 5000,
        night_fee: 5000,
        extra_stop_rate: 2000,
      },
      created_by: 'usr-admin',
      created_by_name: 'Admin BANTER',
      items: [
        {
          id: 'it-p-1',
          name: 'Buah Mangga Harum Manis 2kg',
          qty: 2,
          unit_price: 0,
          total_price: 0,
          is_price_known: false,
          funding_source: 'driver',
        },
      ],
    };

    const msg = generateCustomerWhatsAppMessage(dummyOrderPending);
    assert.match(msg, /Harga menunggu konfirmasi Driver/i);
    assert.match(msg, /Belum Final/i);
  });

  await t.test('Scenario 6: Driver WhatsApp Message shows transparent breakdown and compensations', () => {
    const dummyOrder: Order = {
      id: 'ord-test-01',
      order_number: 'BNT-20261109-001',
      created_at: '2026-11-09T10:00:00Z',
      updated_at: '2026-11-09T10:00:00Z',
      customer_name: 'Ibu Rahayu',
      driver_id: dummyDriver.id,
      driver_name: dummyDriver.name,
      pickup_address: 'Resto Ayam Goreng',
      delivery_address: 'Jl. Kaliurang KM 5',
      distance_raw_km: 2,
      distance_rounded_km: 2,
      is_rain: true,
      is_night: false,
      extra_stops_count: 1,
      delivery_fee: 8000,
      admin_share: 0,
      banter_share: 800,
      driver_delivery_share: 7200,
      extra_fees_total: 7000, // rain 5000 + stop 2000
      driver_total_delivery_entitlement: 14200,
      total_shopping_cost: 30000,
      driver_shopping_modal: 30000,
      admin_shopping_modal: 0,
      customer_total_bill: 45000,
      driver_total_entitlement: 44200,
      customer_payment_status: 'paid',
      customer_paid_amount: 45000,
      customer_balance_remaining: 0,
      shopping_price_status: 'confirmed',
      driver_payout_status: 'unpaid',
      driver_received_from_customer: 0,
      driver_transferred_by_admin: 0,
      driver_total_received: 0,
      driver_balance_remaining: 44200,
      status: 'completed',
      pricing_snapshot: {
        version: '1.0.0',
        base_distance_km: 2,
        base_rate: 8000,
        per_km_rate: 2500,
        admin_cut_per_km: 500,
        max_admin_cut: 2000,
        banter_percent: 0.1,
        rain_fee: 5000,
        night_fee: 5000,
        extra_stop_rate: 2000,
      },
      created_by: 'usr-admin',
      created_by_name: 'Admin BANTER',
    };

    const priorObligations: DriverObligation[] = [
      {
        id: 'ob-banter-1',
        driver_id: dummyDriver.id,
        driver_name: dummyDriver.name,
        category: 'banter_share',
        amount: 800,
        settled_amount: 0,
        remaining_amount: 800,
        created_at: '2026-11-09T09:00:00Z',
        status: 'active',
      },
    ];

    const compensations = [
      {
        obligation_id: 'ob-banter-1',
        category: 'banter_share' as const,
        amount: 800,
        description: 'Setoran BANTER',
      },
    ];

    const msg = generateDriverWhatsAppMessage({
      driver: dummyDriver,
      orders: [dummyOrder],
      priorObligations,
      compensationsApplied: compensations,
      transferAmount: 43400,
      method: 'Transfer BCA',
    });

    assert.match(msg, /RINCIAN PEMBAYARAN DRIVER BANTER/);
    assert.match(msg, /Hak Bersih Driver: Rp7\.200/);
    assert.match(msg, /Biaya Hujan: Rp5\.000/);
    assert.match(msg, /Penggantian Modal Driver: Rp30\.000/);
    assert.match(msg, /Total Hak Driver: Rp44\.200/);
    assert.match(msg, /Total Kompensasi Kewajiban: -Rp800/);
    assert.match(msg, /Transfer Bersih Admin: Rp43\.400/);
    assert.match(msg, /Status Pembayaran: \*Lunas\*/);
  });
});
