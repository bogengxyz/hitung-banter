import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { banterStore } from '../storage/store';

describe('Order Realization & Customer Payment Allocation Flow', () => {
  beforeEach(() => {
    banterStore.resetToSeed();
  });

  test('full lifecycle: unknown shopping price -> pay delivery first -> driver realization -> pay remaining', () => {
    const drivers = banterStore.getDrivers();
    const driver = drivers[0];

    // 1. Create order with items where price is unknown / pending driver
    const items = [
      { name: 'Nasi Goreng Spesial', qty: 2, unit_price: 0, is_price_known: false, funding_source: 'driver' as const },
      { name: 'Es Teh Manis', qty: 1, unit_price: 0, is_price_known: false, funding_source: 'driver' as const },
      { name: 'Kerupuk Kaleng', qty: 1, unit_price: 0, is_price_known: false, funding_source: 'driver' as const },
    ];

    const order = banterStore.createOrder({
      customer_name: 'Budi Santoso',
      customer_phone: '081234567890',
      pickup_address: 'Warung Bu Kris Kaliurang',
      delivery_address: 'Jl. Kaliurang KM 5',
      purchase_location: 'Warung Bu Kris',
      driver_id: driver.id,
      distance_km: 3.5, // 3.5 KM rounds up to 4 KM
      items,
      notes: 'Tolong belikan nasi goreng dan es teh',
    });

    assert.ok(order, 'Order created successfully');
    assert.equal(order.shopping_price_status, 'pending_driver');
    assert.equal(order.total_shopping_cost, 0);
    // Customer initial bill should only be delivery fee + extra fees (belanja belum diketahui tidak ditambahkan ke tagihan final)
    const initialBill = order.customer_total_bill;
    assert.equal(initialBill, order.delivery_fee + order.extra_fees_total);
    assert.equal(order.customer_balance_remaining, initialBill);
    assert.equal(order.customer_paid_amount, 0);
    assert.equal(order.customer_payment_status, 'unpaid');

    // 2. Customer pays delivery fee first (e.g. Rp 13.000 for 4 KM)
    const receipt1 = banterStore.recordCustomerReceipt({
      order_id: order.id,
      amount: initialBill,
      method: 'cash',
      recipient: 'driver',
      allocation: {
        delivery: order.delivery_fee,
        shopping: 0,
        extra: order.extra_fees_total,
        change: 0,
        deposit: 0,
      },
      notes: 'Customer bayar ongkir dulu',
    });

    assert.ok(receipt1, 'Receipt 1 recorded successfully');
    const orderAfterPayment1 = banterStore.getOrderById(order.id);
    assert.ok(orderAfterPayment1);
    assert.equal(orderAfterPayment1.customer_paid_amount, initialBill);
    assert.equal(orderAfterPayment1.customer_balance_remaining, 0);
    assert.equal(orderAfterPayment1.customer_payment_status, 'paid');

    // 3. Driver reports actual shopping prices:
    // Item 1: 2 * 15.000 = 30.000
    // Item 2: 1 * 20.000 = 20.000
    // Item 3: 1 * 10.000 = 10.000
    // Total shopping: 60.000
    const realizedItems = [
      { name: 'Nasi Goreng Spesial', qty: 2, unit_price: 15000, funding_source: 'driver' as const },
      { name: 'Es Teh Manis', qty: 1, unit_price: 20000, funding_source: 'driver' as const },
      { name: 'Kerupuk Kaleng', qty: 1, unit_price: 10000, funding_source: 'driver' as const },
    ];

    const orderAfterRealization = banterStore.saveShoppingRealization(
      order.id,
      realizedItems,
      'Driver selesai belanja dan struk terverifikasi Rp60.000'
    );

    assert.ok(orderAfterRealization, 'Shopping realization saved successfully');
    assert.equal(orderAfterRealization.shopping_price_status, 'confirmed');
    assert.equal(orderAfterRealization.total_shopping_cost, 60000);
    // Total bill should now be Ongkir + Belanja (60.000)
    const expectedNewBill = initialBill + 60000;
    assert.equal(orderAfterRealization.customer_total_bill, expectedNewBill);
    // Previous payment (initialBill) must be preserved!
    assert.equal(orderAfterRealization.customer_paid_amount, initialBill);
    // Remaining balance must be exactly Rp 60.000
    assert.equal(orderAfterRealization.customer_balance_remaining, 60000);
    // Status must change to partial because there is remaining balance
    assert.equal(orderAfterRealization.customer_payment_status, 'partial');

    // 4. Customer pays remaining Rp 60.000
    const receipt2 = banterStore.recordCustomerReceipt({
      order_id: order.id,
      amount: 60000,
      method: 'cash',
      recipient: 'driver',
      allocation: {
        delivery: 0,
        shopping: 60000,
        extra: 0,
        change: 0,
        deposit: 0,
      },
      notes: 'Customer melunasi sisa belanja',
    });

    assert.ok(receipt2, 'Receipt 2 recorded successfully');
    const finalOrder = banterStore.getOrderById(order.id);
    assert.ok(finalOrder);
    assert.equal(finalOrder.customer_paid_amount, expectedNewBill);
    assert.equal(finalOrder.customer_balance_remaining, 0);
    assert.equal(finalOrder.customer_payment_status, 'paid');

    // Verify audit log entries
    const auditLogs = banterStore.getAuditLogs();
    const realizationLog = auditLogs.find(
      (l) => l.entity_id === order.id && l.reason?.includes('struk terverifikasi')
    );
    assert.ok(realizationLog, 'Audit log recorded for shopping realization');
    assert.equal(realizationLog.action, 'correct');
  });

  test('admin edits order details (customer name, items, purchase location)', () => {
    const drivers = banterStore.getDrivers();
    const driver = drivers[0];

    const order = banterStore.createOrder({
      customer_name: 'Dewi Lestari',
      customer_phone: '081999888777',
      pickup_address: 'Apotek K-24 Kaliurang',
      delivery_address: 'Kost Melati Pogung',
      purchase_location: 'Apotek K-24 Kaliurang',
      driver_id: driver.id,
      distance_km: 2.0,
      items: [
        { name: 'Panadol Flu', qty: 1, unit_price: 15000, is_price_known: true, funding_source: 'driver' },
      ],
      notes: 'Beli obat flu',
    });

    assert.ok(order);
    assert.equal(order.customer_name, 'Dewi Lestari');

    // Update order details via updateOrder
    const updated = banterStore.updateOrder(
      order.id,
      {
        customer_name: 'Dewi Lestari M.',
        customer_phone: '081999888778',
        purchase_location: 'Apotek K-24 Jakal KM 6',
        items: [
          { name: 'Panadol Flu & Batuk', qty: 2, unit_price: 18000, is_price_known: true, funding_source: 'driver' },
        ],
      },
      'Koreksi nama customer dan perubahan merk obat'
    );

    assert.ok(updated);
    assert.equal(updated.customer_name, 'Dewi Lestari M.');
    assert.equal(updated.customer_phone, '081999888778');
    assert.equal(updated.purchase_location, 'Apotek K-24 Jakal KM 6');
    assert.equal(updated.total_shopping_cost, 36000);
    assert.equal(updated.items?.length, 1);

    // Check audit logs
    const auditLogs = banterStore.getAuditLogs();
    const editLog = auditLogs.find((l) => l.entity_id === order.id && l.action === 'update');
    assert.ok(editLog, 'Audit log recorded for order update');
    assert.ok(editLog.reason?.includes('Koreksi nama customer'));
  });
});
