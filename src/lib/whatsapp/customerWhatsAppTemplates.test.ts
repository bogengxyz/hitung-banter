import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCustomerWhatsAppMessage,
  generateCombinedCustomerWhatsAppMessage,
} from '../reconciliation/reconciliationEngine';
import { Order, CombinedOrderCustomer, CombinedOrderGroup } from '../../types';

const defaultSnapshot = {
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
};

test('1. Pesanan dengan satu barang', () => {
  const order: Order = {
    id: 'ord-1',
    order_number: 'BNT-20261110-001',
    created_at: '2026-11-10T10:00:00Z',
    updated_at: '2026-11-10T10:00:00Z',
    customer_name: 'Budi Santoso',
    driver_id: 'drv-1',
    driver_name: 'Agus',
    pickup_address: 'Warung Nasi Bu Kris',
    delivery_address: 'Jl. Kaliurang KM 5',
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
    total_shopping_cost: 15000,
    driver_shopping_modal: 15000,
    admin_shopping_modal: 0,
    customer_total_bill: 23000,
    driver_total_entitlement: 22200,
    customer_payment_status: 'unpaid',
    customer_paid_amount: 0,
    customer_balance_remaining: 23000,
    shopping_price_status: 'confirmed',
    driver_payout_status: 'unpaid',
    driver_received_from_customer: 0,
    driver_transferred_by_admin: 0,
    driver_total_received: 0,
    driver_balance_remaining: 22200,
    status: 'completed',
    pricing_snapshot: defaultSnapshot,
    created_by: 'admin',
    created_by_name: 'Admin',
    items: [
      {
        id: 'item-1',
        name: 'Nasi Pecel Madiun',
        qty: 1,
        unit_price: 15000,
        total_price: 15000,
        is_price_known: true,
        funding_source: 'driver',
      },
    ],
  };

  const text = generateCustomerWhatsAppMessage(order);
  const expected = [
    '📋 *DAFTAR PESANAN*',
    '',
    '1. Nasi Pecel Madiun - Rp15.000',
    '',
    '*Rincian Biaya:*',
    '- Ongkir: Rp8.000',
    '',
    '━━━━━━━━━━━━━━━━',
    '💰 *TOTAL PESANAN: Rp23.000*',
  ].join('\n');

  assert.equal(text, expected);
});

test('2. Pesanan dengan banyak barang (multi-qty dan single-qty)', () => {
  const order: Order = {
    id: 'ord-2',
    order_number: 'BNT-20261110-002',
    created_at: '2026-11-10T10:00:00Z',
    updated_at: '2026-11-10T10:00:00Z',
    customer_name: 'Siti Aminah',
    driver_id: 'drv-1',
    driver_name: 'Agus',
    pickup_address: 'Kuliner Malam Malioboro',
    delivery_address: 'Pogung Baru',
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
    total_shopping_cost: 27000,
    driver_shopping_modal: 27000,
    admin_shopping_modal: 0,
    customer_total_bill: 35000,
    driver_total_entitlement: 34200,
    customer_payment_status: 'unpaid',
    customer_paid_amount: 0,
    customer_balance_remaining: 35000,
    shopping_price_status: 'confirmed',
    driver_payout_status: 'unpaid',
    driver_received_from_customer: 0,
    driver_transferred_by_admin: 0,
    driver_total_received: 0,
    driver_balance_remaining: 34200,
    status: 'completed',
    pricing_snapshot: defaultSnapshot,
    created_by: 'admin',
    created_by_name: 'Admin',
    items: [
      {
        id: 'it-1',
        name: 'Nasi Goreng',
        qty: 1,
        unit_price: 12000,
        total_price: 12000,
        is_price_known: true,
        funding_source: 'driver',
      },
      {
        id: 'it-2',
        name: 'Pentol',
        qty: 1,
        unit_price: 10000,
        total_price: 10000,
        is_price_known: true,
        funding_source: 'driver',
      },
      {
        id: 'it-3',
        name: 'Teh Poci',
        qty: 1,
        unit_price: 5000,
        total_price: 5000,
        is_price_known: true,
        funding_source: 'driver',
      },
    ],
  };

  const text = generateCustomerWhatsAppMessage(order);
  assert.match(text, /1\. Nasi Goreng - Rp12\.000/);
  assert.match(text, /2\. Pentol - Rp10\.000/);
  assert.match(text, /3\. Teh Poci - Rp5\.000/);
  assert.match(text, /💰 \*TOTAL PESANAN: Rp35\.000\*/);
});

test('3. Pesanan dengan beberapa tempat pembelian (items sequentially numbered)', () => {
  const order: Order = {
    id: 'ord-3',
    order_number: 'BNT-20261110-003',
    created_at: '2026-11-10T10:00:00Z',
    updated_at: '2026-11-10T10:00:00Z',
    customer_name: 'Rudi',
    driver_id: 'drv-1',
    driver_name: 'Agus',
    pickup_address: 'Pasar Demangan & Toko Roti',
    delivery_address: 'Gejayan',
    distance_raw_km: 2,
    distance_rounded_km: 2,
    is_rain: false,
    is_night: false,
    extra_stops_count: 2, // 2 extra places @ 2000 = 4000
    delivery_fee: 8000,
    admin_share: 0,
    banter_share: 800,
    driver_delivery_share: 7200,
    extra_fees_total: 4000,
    driver_total_delivery_entitlement: 11200,
    total_shopping_cost: 39000,
    driver_shopping_modal: 39000,
    admin_shopping_modal: 0,
    customer_total_bill: 51000,
    driver_total_entitlement: 50200,
    customer_payment_status: 'unpaid',
    customer_paid_amount: 0,
    customer_balance_remaining: 51000,
    shopping_price_status: 'confirmed',
    driver_payout_status: 'unpaid',
    driver_received_from_customer: 0,
    driver_transferred_by_admin: 0,
    driver_total_received: 0,
    driver_balance_remaining: 50200,
    status: 'completed',
    pricing_snapshot: defaultSnapshot,
    created_by: 'admin',
    created_by_name: 'Admin',
    items: [
      {
        id: 'it-1',
        name: 'Ayam Geprek',
        qty: 1,
        unit_price: 15000,
        total_price: 15000,
        is_price_known: true,
        funding_source: 'driver',
      },
      {
        id: 'it-2',
        name: 'Roti Bakar',
        qty: 1,
        unit_price: 18000,
        total_price: 18000,
        is_price_known: true,
        funding_source: 'driver',
      },
      {
        id: 'it-3',
        name: 'Jus Jeruk',
        qty: 1,
        unit_price: 6000,
        total_price: 6000,
        is_price_known: true,
        funding_source: 'driver',
      },
    ],
  };

  const text = generateCustomerWhatsAppMessage(order);
  assert.match(text, /1\. Ayam Geprek - Rp15\.000/);
  assert.match(text, /2\. Roti Bakar - Rp18\.000/);
  assert.match(text, /3\. Jus Jeruk - Rp6\.000/);
  assert.match(text, /- Tambah tempat: Rp4\.000/);
  assert.match(text, /💰 \*TOTAL PESANAN: Rp51\.000\*/);
});

test('4. Pesanan dengan biaya tambahan (Biaya Hujan + Jam Malam + Tambah Tempat)', () => {
  const order: Order = {
    id: 'ord-4',
    order_number: 'BNT-20261110-004',
    created_at: '2026-11-10T23:30:00Z',
    updated_at: '2026-11-10T23:50:00Z',
    customer_name: 'Dewi',
    driver_id: 'drv-1',
    driver_name: 'Agus',
    pickup_address: 'Krapyak',
    delivery_address: 'Bantul',
    distance_raw_km: 2,
    distance_rounded_km: 2,
    is_rain: true,
    is_night: true,
    extra_stops_count: 1, // 2000
    delivery_fee: 8000,
    admin_share: 0,
    banter_share: 800,
    driver_delivery_share: 7200,
    extra_fees_total: 12000, // 5000 rain + 5000 night + 2000 stop
    driver_total_delivery_entitlement: 19200,
    total_shopping_cost: 20000,
    driver_shopping_modal: 20000,
    admin_shopping_modal: 0,
    customer_total_bill: 40000,
    driver_total_entitlement: 39200,
    customer_payment_status: 'unpaid',
    customer_paid_amount: 0,
    customer_balance_remaining: 40000,
    shopping_price_status: 'confirmed',
    driver_payout_status: 'unpaid',
    driver_received_from_customer: 0,
    driver_transferred_by_admin: 0,
    driver_total_received: 0,
    driver_balance_remaining: 39200,
    status: 'completed',
    pricing_snapshot: defaultSnapshot,
    created_by: 'admin',
    created_by_name: 'Admin',
    items: [
      {
        id: 'it-1',
        name: 'Bakmi Jawa Rebus',
        qty: 1,
        unit_price: 20000,
        total_price: 20000,
        is_price_known: true,
        funding_source: 'driver',
      },
    ],
  };

  const text = generateCustomerWhatsAppMessage(order);
  assert.match(text, /- Ongkir: Rp8\.000/);
  assert.match(text, /- Tambah tempat: Rp2\.000/);
  assert.match(text, /- Biaya Hujan: Rp5\.000/);
  assert.match(text, /- Biaya Jam Malam: Rp5\.000/);
  assert.match(text, /💰 \*TOTAL PESANAN: Rp40\.000\*/);
});

test('5. Pesanan tanpa biaya tambahan (hanya ongkir dasar)', () => {
  const order: Order = {
    id: 'ord-5',
    order_number: 'BNT-20261110-005',
    created_at: '2026-11-10T12:00:00Z',
    updated_at: '2026-11-10T12:20:00Z',
    customer_name: 'Doni',
    driver_id: 'drv-1',
    driver_name: 'Agus',
    pickup_address: 'KFC Sudirman',
    delivery_address: 'Kotabaru',
    distance_raw_km: 1.2,
    distance_rounded_km: 1,
    is_rain: false,
    is_night: false,
    extra_stops_count: 0,
    delivery_fee: 8000,
    admin_share: 0,
    banter_share: 800,
    driver_delivery_share: 7200,
    extra_fees_total: 0,
    driver_total_delivery_entitlement: 7200,
    total_shopping_cost: 50000,
    driver_shopping_modal: 50000,
    admin_shopping_modal: 0,
    customer_total_bill: 58000,
    driver_total_entitlement: 57200,
    customer_payment_status: 'unpaid',
    customer_paid_amount: 0,
    customer_balance_remaining: 58000,
    shopping_price_status: 'confirmed',
    driver_payout_status: 'unpaid',
    driver_received_from_customer: 0,
    driver_transferred_by_admin: 0,
    driver_total_received: 0,
    driver_balance_remaining: 57200,
    status: 'completed',
    pricing_snapshot: defaultSnapshot,
    created_by: 'admin',
    created_by_name: 'Admin',
    items: [
      {
        id: 'it-1',
        name: 'Super Besar 2',
        qty: 1,
        unit_price: 50000,
        total_price: 50000,
        is_price_known: true,
        funding_source: 'driver',
      },
    ],
  };

  const text = generateCustomerWhatsAppMessage(order);
  assert.match(text, /\*Rincian Biaya:\*\n- Ongkir: Rp8\.000\n\n━━━━━━━━━━━━━━━━/);
  assert.doesNotMatch(text, /Tambah tempat/);
  assert.doesNotMatch(text, /Hujan/);
  assert.doesNotMatch(text, /Malam/);
  assert.match(text, /💰 \*TOTAL PESANAN: Rp58\.000\*/);
});

test('6. Pesanan dengan harga barang yang belum diisi (pending confirmation)', () => {
  const order: Order = {
    id: 'ord-6',
    order_number: 'BNT-20261110-006',
    created_at: '2026-11-10T12:00:00Z',
    updated_at: '2026-11-10T12:20:00Z',
    customer_name: 'Bu Maya',
    driver_id: 'drv-1',
    driver_name: 'Agus',
    pickup_address: 'Apotek K-24',
    delivery_address: 'Condongcatur',
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
    total_shopping_cost: 0,
    driver_shopping_modal: 0,
    admin_shopping_modal: 0,
    customer_total_bill: 8000,
    driver_total_entitlement: 7200,
    customer_payment_status: 'unpaid',
    customer_paid_amount: 0,
    customer_balance_remaining: 8000,
    shopping_price_status: 'pending_driver',
    driver_payout_status: 'unpaid',
    driver_received_from_customer: 0,
    driver_transferred_by_admin: 0,
    driver_total_received: 0,
    driver_balance_remaining: 7200,
    status: 'in_progress',
    pricing_snapshot: defaultSnapshot,
    created_by: 'admin',
    created_by_name: 'Admin',
    items: [
      {
        id: 'it-1',
        name: 'Obat Batuk Syrup',
        qty: 1,
        unit_price: 0,
        total_price: 0,
        is_price_known: false,
        funding_source: 'driver',
      },
    ],
  };

  const text = generateCustomerWhatsAppMessage(order);
  assert.match(text, /1\. Obat Batuk Syrup - \(Harga menunggu konfirmasi\)/);
  assert.match(text, /💰 \*TOTAL PESANAN: Rp8\.000 \+ Belanja \(Menunggu konfirmasi harga\)\*/);
});

test('7. Pesanan Order Gabungan (tiap customer hanya menerima rincian miliknya sendiri)', () => {
  const cust1: CombinedOrderCustomer = {
    id: 'cust-1',
    customer_name: 'Ibu Ratna',
    customer_phone: '08123456789',
    delivery_address: 'Jl. Kaliurang KM 6',
    distance_km: 4,
    delivery_fee: 13000, // 8000 base + 5000 extra km
    shopping_subtotal: 24000,
    customer_total_bill: 37000,
    payment_status: 'unpaid',
    paid_amount: 0,
    locations: [
      {
        id: 'loc-1',
        name: 'Toko Roti Prima',
        address: 'Gejayan',
        items: [
          {
            id: 'it-1',
            name: 'Roti Tawar',
            qty: 1,
            unit_price: 14000,
            total_price: 14000,
          },
          {
            id: 'it-2',
            name: 'Donat Coklat',
            qty: 2,
            unit_price: 5000,
            total_price: 10000,
          },
        ],
      },
    ],
  };

  const cust2: CombinedOrderCustomer = {
    id: 'cust-2',
    customer_name: 'Mas Joko',
    customer_phone: '08987654321',
    delivery_address: 'Jl. Kaliurang KM 7',
    distance_km: 2,
    delivery_fee: 8000,
    shopping_subtotal: 18000,
    customer_total_bill: 26000,
    payment_status: 'unpaid',
    paid_amount: 0,
    locations: [
      {
        id: 'loc-2',
        name: 'Apotek Sehat',
        address: 'Colombo',
        items: [
          {
            id: 'it-3',
            name: 'Vitamin C 500mg',
            qty: 1,
            unit_price: 18000,
            total_price: 18000,
          },
        ],
      },
    ],
  };

  const group: CombinedOrderGroup = {
    id: 'grp-1',
    group_number: 'GAB-20261110-001',
    service_type: 'order_gabungan',
    order_date: '2026-11-10',
    order_time: '14:00',
    customer_count: 2,
    status: 'in_progress',
    driver_id: 'drv-1',
    driver_name: 'Agus',
    customers: [cust1, cust2],
    is_rain: false,
    is_night: false,
    extra_locations_count: 0,
    extra_locations_fee: 0,
    rain_fee: 5000,
    night_fee: 5000,
    extra_fees_total: 0,
    total_delivery_fee: 21000,
    admin_share: 1000,
    banter_share: 2000,
    driver_delivery_share: 18000,
    driver_total_delivery_entitlement: 18000,
    total_shopping_cost: 42000,
    driver_shopping_modal: 42000,
    admin_shopping_modal: 0,
    customer_total_bill: 63000,
    driver_total_entitlement: 60000,
    driver_payout_status: 'unpaid',
    driver_total_received: 0,
    driver_balance_remaining: 60000,
    created_at: '2026-11-10T14:00:00Z',
    updated_at: '2026-11-10T14:00:00Z',
    created_by: 'admin',
    created_by_name: 'Admin',
  };

  // Test Customer 1 message
  const text1 = generateCombinedCustomerWhatsAppMessage(cust1, group);
  assert.match(text1, /1\. Roti Tawar - Rp14\.000/);
  assert.match(text1, /2\. Donat Coklat \(2x\) - Rp10\.000/);
  assert.match(text1, /- Ongkir: Rp8\.000/);
  assert.match(text1, /- Jarak 4 KM: Rp5\.000/);
  assert.match(text1, /💰 \*TOTAL PESANAN: Rp37\.000\*/);
  // Must NOT contain Customer 2 data
  assert.doesNotMatch(text1, /Vitamin C/);
  assert.doesNotMatch(text1, /Mas Joko/);

  // Test Customer 2 message
  const text2 = generateCombinedCustomerWhatsAppMessage(cust2, group);
  assert.match(text2, /1\. Vitamin C 500mg - Rp18\.000/);
  assert.match(text2, /- Ongkir: Rp8\.000/);
  assert.match(text2, /💰 \*TOTAL PESANAN: Rp26\.000\*/);
  // Must NOT contain Customer 1 data
  assert.doesNotMatch(text2, /Roti Tawar/);
  assert.doesNotMatch(text2, /Ibu Ratna/);
});

test('8. Pesanan dengan jarak dan ongkir berbeda (jarak 5,4 KM)', () => {
  const order: Order = {
    id: 'ord-8',
    order_number: 'BNT-20261110-008',
    created_at: '2026-11-10T15:00:00Z',
    updated_at: '2026-11-10T15:20:00Z',
    customer_name: 'Pak Bambang',
    driver_id: 'drv-1',
    driver_name: 'Agus',
    pickup_address: 'Toko Buku Togamas',
    delivery_address: 'Depok Sleman',
    distance_raw_km: 5.4,
    distance_rounded_km: 5,
    is_rain: false,
    is_night: false,
    extra_stops_count: 0,
    delivery_fee: 15500, // 8000 base + (3 * 2500 = 7500)
    admin_share: 1500,
    banter_share: 1400,
    driver_delivery_share: 12600,
    extra_fees_total: 0,
    driver_total_delivery_entitlement: 12600,
    total_shopping_cost: 65000,
    driver_shopping_modal: 65000,
    admin_shopping_modal: 0,
    customer_total_bill: 80500,
    driver_total_entitlement: 77600,
    customer_payment_status: 'unpaid',
    customer_paid_amount: 0,
    customer_balance_remaining: 80500,
    shopping_price_status: 'confirmed',
    driver_payout_status: 'unpaid',
    driver_received_from_customer: 0,
    driver_transferred_by_admin: 0,
    driver_total_received: 0,
    driver_balance_remaining: 77600,
    status: 'completed',
    pricing_snapshot: defaultSnapshot,
    created_by: 'admin',
    created_by_name: 'Admin',
    items: [
      {
        id: 'it-1',
        name: 'Buku Agenda Kerja 2026',
        qty: 1,
        unit_price: 65000,
        total_price: 65000,
        is_price_known: true,
        funding_source: 'driver',
      },
    ],
  };

  const text = generateCustomerWhatsAppMessage(order);
  assert.match(text, /1\. Buku Agenda Kerja 2026 - Rp65\.000/);
  assert.match(text, /- Ongkir: Rp8\.000/);
  assert.match(text, /- Jarak 5,4 KM: Rp7\.500/);
  assert.match(text, /💰 \*TOTAL PESANAN: Rp80\.500\*/);
});

