import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { banterStore } from '../storage/store';
import {
  generateTahap1DriverAnnouncement,
  generateTahap2DriverConfirmation,
  generateTahap3AdminProcessing,
  generateTahap4DriverAssignment,
  generateTahap5OrderCompleted,
  generateCombinedOrderShoppingList,
  isGroupPricePending,
} from '../whatsapp/combinedOrderTemplates';

describe('Pengujian Wajib Order Gabungan (12+ Skenario)', () => {
  beforeEach(() => {
    banterStore.resetToSeed();
  });

  it('Skenario 1: Order Gabungan 2 pelanggan total jarak 9 KM (Audit Bagian Admin)', () => {
    const group = banterStore.createCombinedOrder({
      driver_id: '',
      customers: [
        {
          customer_name: 'Bima',
          delivery_address: 'Banjaranyar',
          distance_km: 6,
          locations: [
            {
              name: 'Toko Fatma Paciran',
              address: 'Paciran',
              items: [{ name: 'Odol', qty: 1, unit_price: 0, is_price_unconfirmed: true }],
            },
          ],
        },
        {
          customer_name: 'Mat Codet',
          delivery_address: 'Dagan Solokuro',
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

    assert.strictEqual(group.customer_count, 2);
    assert.strictEqual(group.total_distance_km, 9);
    // Ongkir: 18.000 + 10.500 = 28.500
    assert.strictEqual(group.total_delivery_fee, 28500);
    // Bagian Admin Akumulatif: 2.000 (Cust 1) + 500 (Cust 2) = 2.500 (Bukan Rp750!)
    assert.strictEqual(group.admin_share, 2500);
    // BANTER: 10% * (28.500 - 2.500) = 2.600
    assert.strictEqual(group.banter_share, 2600);
    // Hak Bersih Driver: 28.500 - 2.500 - 2.600 = 23.400
    assert.strictEqual(group.driver_delivery_share, 23400);
  });

  it('Skenario 2: Order Gabungan dengan 3 pelanggan', () => {
    const group = banterStore.createCombinedOrder({
      driver_id: 'drv-01',
      customers: [
        { customer_name: 'A', delivery_address: 'A', distance_km: 2, locations: [] },
        { customer_name: 'B', delivery_address: 'B', distance_km: 3, locations: [] },
        { customer_name: 'C', delivery_address: 'C', distance_km: 4, locations: [] },
      ],
    });

    assert.strictEqual(group.customer_count, 3);
    assert.strictEqual(group.total_distance_km, 9);
    // 8.000 + 10.500 + 13.000 = 31.500
    assert.strictEqual(group.total_delivery_fee, 31500);
  });

  it('Skenario 3: Harga barang sebagian masih menunggu konfirmasi', () => {
    const group = banterStore.createCombinedOrder({
      driver_id: 'drv-01',
      customers: [
        {
          customer_name: 'Bima',
          delivery_address: 'Banjaranyar',
          distance_km: 6,
          locations: [
            {
              name: 'Toko Fatma',
              address: 'Paciran',
              items: [{ name: 'Odol', qty: 1, unit_price: 0, is_price_unconfirmed: true }],
            },
          ],
        },
      ],
    });

    assert.strictEqual(group.has_unconfirmed_prices, true);
    assert.strictEqual(isGroupPricePending(group), true);

    const shoppingListText = generateCombinedOrderShoppingList(group);
    assert.match(shoppingListText, /Harga menunggu konfirmasi/);
    assert.match(shoppingListText, /Belum Final/);
  });

  it('Skenario 4: Setiap pelanggan memiliki ongkir berbeda', () => {
    const group = banterStore.createCombinedOrder({
      driver_id: '',
      customers: [
        { customer_name: 'A', delivery_address: 'A', distance_km: 2, locations: [] }, // 8.000
        { customer_name: 'B', delivery_address: 'B', distance_km: 5, locations: [] }, // 15.500
      ],
    });

    assert.strictEqual(group.customers[0].delivery_fee, 8000);
    assert.strictEqual(group.customers[1].delivery_fee, 15500);
    assert.strictEqual(group.total_delivery_fee, 23500);
  });

  it('Skenario 5: Terdapat biaya hujan dan jam malam', () => {
    const group = banterStore.createCombinedOrder({
      driver_id: '',
      is_rain: true,
      is_night: true,
      customers: [{ customer_name: 'A', delivery_address: 'A', distance_km: 2, locations: [] }],
    });

    assert.strictEqual(group.rain_fee, 5000);
    assert.strictEqual(group.night_fee, 5000);
    assert.strictEqual(group.extra_fees_total, 10000);
    assert.strictEqual(group.driver_total_delivery_entitlement, group.driver_delivery_share + 10000);
  });

  it('Skenario 6 & 7: Belanja menggunakan modal Driver vs modal Admin', () => {
    const groupDriver = banterStore.createCombinedOrder({
      driver_id: 'drv-01',
      driver_shopping_modal: 35000,
      admin_shopping_modal: 0,
      customers: [{ customer_name: 'A', delivery_address: 'A', distance_km: 2, locations: [] }],
    });
    assert.strictEqual(groupDriver.driver_shopping_modal, 35000);
    assert.strictEqual(groupDriver.driver_total_entitlement, groupDriver.driver_total_delivery_entitlement + 35000);

    const groupAdmin = banterStore.createCombinedOrder({
      driver_id: 'drv-01',
      driver_shopping_modal: 0,
      admin_shopping_modal: 35000,
      customers: [{ customer_name: 'A', delivery_address: 'A', distance_km: 2, locations: [] }],
    });
    assert.strictEqual(groupAdmin.admin_shopping_modal, 35000);
    // Modal Admin tidak menambah hak utang/pembayaran Driver
    assert.strictEqual(groupAdmin.driver_total_entitlement, groupAdmin.driver_total_delivery_entitlement);
  });

  it('Skenario 8: Driver mengambil order tetapi belum disetujui Admin (driver_requested)', () => {
    const group = banterStore.createCombinedOrder({
      driver_id: '',
      customers: [{ customer_name: 'A', delivery_address: 'A', distance_km: 2, locations: [] }],
    });
    assert.strictEqual(group.status, 'waiting_driver');

    banterStore.driverRequestCombinedOrder(group.id, 'drv-02', 'Budi Santoso');
    const updated = banterStore.getCombinedOrders().find((g) => g.id === group.id);
    assert.strictEqual(updated?.status, 'driver_requested');
    assert.strictEqual(updated?.candidate_driver_id, 'drv-02');
    assert.strictEqual(updated?.candidate_driver_name, 'Budi Santoso');

    const msg = generateTahap2DriverConfirmation(updated!);
    assert.match(msg, /Menunggu Persetujuan Admin/);
    assert.match(msg, /Budi Santoso/);
  });

  it('Skenario 9: Admin menetapkan atau mengganti Driver yang ditugaskan', () => {
    const group = banterStore.createCombinedOrder({
      driver_id: '',
      customers: [{ customer_name: 'A', delivery_address: 'A', distance_km: 2, locations: [] }],
    });

    banterStore.assignDriverToCombinedOrder(group.id, 'drv-01', 'Ahmad Pratama');
    let current = banterStore.getCombinedOrders().find((g) => g.id === group.id);
    assert.strictEqual(current?.status, 'driver_assigned');
    assert.strictEqual(current?.driver_name, 'Ahmad Pratama');

    // Admin ganti driver
    banterStore.assignDriverToCombinedOrder(group.id, 'drv-02', 'Budi Santoso');
    current = banterStore.getCombinedOrders().find((g) => g.id === group.id);
    assert.strictEqual(current?.driver_name, 'Budi Santoso');
    assert.strictEqual(current?.status_history?.length, 3); // initial + assign1 + assign2
  });

  it('Skenario 10: Admin mengubah harga barang setelah proses belanja', () => {
    const group = banterStore.createCombinedOrder({
      driver_id: 'drv-01',
      customers: [
        {
          customer_name: 'Mat Codet',
          delivery_address: 'Dagan',
          distance_km: 3,
          locations: [
            {
              name: 'Toserba Sunan Drajat',
              address: 'Drajat',
              items: [{ name: 'Beras', qty: 2, unit_price: 15000, is_price_unconfirmed: false }],
            },
          ],
        },
      ],
    });

    const cust = group.customers[0];
    const loc = cust.locations[0];
    const item = loc.items[0];

    // Admin koreksi harga beras dari 15.000 menjadi 18.000
    banterStore.updateCombinedOrderItem(group.id, cust.id, loc.id, item.id, {
      unit_price: 18000,
      is_price_unconfirmed: false,
    });

    const updated = banterStore.getCombinedOrders().find((g) => g.id === group.id);
    const updatedItem = updated?.customers[0].locations[0].items[0];
    assert.strictEqual(updatedItem?.unit_price, 18000);
    assert.strictEqual(updatedItem?.total_price, 36000); // 2 x 18.000
    assert.strictEqual(updated?.total_shopping_cost, 36000);
  });

  it('Skenario 11: Pesanan selesai dengan status completed', () => {
    const group = banterStore.createCombinedOrder({
      driver_id: 'drv-01',
      customers: [{ customer_name: 'A', delivery_address: 'A', distance_km: 2, locations: [] }],
    });

    banterStore.updateCombinedOrderStatus(group.id, 'completed', 'Semua barang dan pengantaran selesai');
    const updated = banterStore.getCombinedOrders().find((g) => g.id === group.id);
    assert.strictEqual(updated?.status, 'completed');

    const msg = generateTahap5OrderCompleted(updated!);
    assert.match(msg, /ORDER GABUNGAN SELESAI/);
    assert.match(msg, /Selesai/);
  });

  it('Skenario 12: Order dibatalkan di tengah proses dengan alasan', () => {
    const group = banterStore.createCombinedOrder({
      driver_id: 'drv-01',
      customers: [{ customer_name: 'A', delivery_address: 'A', distance_km: 2, locations: [] }],
    });

    banterStore.cancelCombinedOrder(group.id, 'Toko tutup dan cuaca ekstrem');
    const updated = banterStore.getCombinedOrders().find((g) => g.id === group.id);
    assert.strictEqual(updated?.status, 'cancelled');
    assert.strictEqual(updated?.cancellation_reason, 'Toko tutup dan cuaca ekstrem');
  });

  it('Skenario 13: Verifikasi keamanan pesan WhatsApp Tahap 1 tidak bocor data internal', () => {
    const group = banterStore.createCombinedOrder({
      driver_id: '',
      customers: [
        { customer_name: 'Bima', delivery_address: 'Banjaranyar', distance_km: 6, locations: [] },
        { customer_name: 'Mat Codet', delivery_address: 'Dagan', distance_km: 3, locations: [] },
      ],
    });

    const msg = generateTahap1DriverAnnouncement(group);
    assert.doesNotMatch(msg, /Bagian Admin/i);
    assert.doesNotMatch(msg, /Bagian BANTER/i);
    assert.doesNotMatch(msg, /Pembukuan/i);
    assert.match(msg, /ORDER GABUNGAN BANTER/);
    assert.match(msg, /Total Jarak: 9 KM/);
    assert.match(msg, /Total Ongkir Customer: Rp28\.500/);
  });
});
