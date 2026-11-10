import {
  Driver,
  Order,
  DriverObligation,
  ObligationCategory,
  CompensationItem,
  CustomerReceipt,
} from '../../types';
import { formatRupiah } from '../pricing/engine';

export interface DriverObligationsSummary {
  driver_id: string;
  driver_name: string;
  modal_admin_pending: number;
  banter_share_pending: number;
  admin_share_pending: number;
  driver_loan_pending: number;
  total_obligations_pending: number;
  total_settled: number;
  total_compensated: number;
}

/**
 * Calculates pending obligations grouped strictly by category without double-counting.
 */
export function calculateDriverObligationsSummary(
  driverId: string,
  obligations: DriverObligation[]
): DriverObligationsSummary {
  const driverObs = obligations.filter(
    (o) => o.driver_id === driverId && o.status !== 'cancelled'
  );

  let modalAdmin = 0;
  let banterShare = 0;
  let adminShare = 0;
  let driverLoan = 0;
  let totalSettled = 0;

  for (const o of driverObs) {
    const remaining = Math.max(0, o.remaining_amount);
    totalSettled += Math.max(0, o.settled_amount);

    if (o.category === 'modal_admin') {
      modalAdmin += remaining;
    } else if (o.category === 'banter_share') {
      banterShare += remaining;
    } else if (o.category === 'admin_share') {
      adminShare += remaining;
    } else if (o.category === 'driver_loan') {
      driverLoan += remaining;
    }
  }

  const totalPending = modalAdmin + banterShare + adminShare + driverLoan;

  return {
    driver_id: driverId,
    driver_name: driverObs[0]?.driver_name || '',
    modal_admin_pending: modalAdmin,
    banter_share_pending: banterShare,
    admin_share_pending: adminShare,
    driver_loan_pending: driverLoan,
    total_obligations_pending: totalPending,
    total_settled: totalSettled,
    total_compensated: 0, // dynamic per context
  };
}

/**
 * Allocates requested compensation across pending obligations in defined priority order:
 * 1. Pengembalian Modal Admin (cash customer held by driver for admin shopping)
 * 2. Setoran BANTER (10% company cut)
 * 3. Setoran Admin (admin cut)
 * 4. Pinjaman Modal Driver (operational loans)
 */
export function allocateCompensation(
  requestedCompensation: number,
  obligations: DriverObligation[],
  driverId: string
): {
  totalCompensated: number;
  allocations: CompensationItem[];
  remainingObligations: DriverObligation[];
} {
  const driverObs = obligations.filter(
    (o) => o.driver_id === driverId && o.status !== 'cancelled' && o.remaining_amount > 0
  );

  // Sort by priority category
  const priorityOrder: Record<ObligationCategory, number> = {
    modal_admin: 1,
    banter_share: 2,
    admin_share: 3,
    driver_loan: 4,
  };

  const sortedObs = [...driverObs].sort((a, b) => {
    const pA = priorityOrder[a.category] ?? 99;
    const pB = priorityOrder[b.category] ?? 99;
    if (pA !== pB) return pA - pB;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  let remainingToCompensate = Math.max(0, Math.round(requestedCompensation));
  const allocations: CompensationItem[] = [];
  const updatedObs: DriverObligation[] = JSON.parse(JSON.stringify(obligations));

  for (const obs of sortedObs) {
    if (remainingToCompensate <= 0) break;
    const canDeduct = Math.min(obs.remaining_amount, remainingToCompensate);
    if (canDeduct > 0) {
      allocations.push({
        obligation_id: obs.id,
        category: obs.category,
        amount: canDeduct,
        order_number: obs.order_number,
        description: `Kompensasi ${getCategoryLabel(obs.category)}${obs.order_number ? ` Order ${obs.order_number}` : ''}`,
      });
      remainingToCompensate -= canDeduct;

      const idx = updatedObs.findIndex((o) => o.id === obs.id);
      if (idx !== -1) {
        updatedObs[idx].settled_amount += canDeduct;
        updatedObs[idx].remaining_amount -= canDeduct;
        if (updatedObs[idx].remaining_amount === 0) {
          updatedObs[idx].status = 'settled';
        } else {
          updatedObs[idx].status = 'partially_settled';
        }
      }
    }
  }

  const totalCompensated = allocations.reduce((sum, a) => sum + a.amount, 0);

  return {
    totalCompensated,
    allocations,
    remainingObligations: updatedObs,
  };
}

export function getCategoryLabel(category: ObligationCategory): string {
  switch (category) {
    case 'modal_admin':
      return 'Pengembalian Modal Admin';
    case 'banter_share':
      return 'Setoran Bagian BANTER (10%)';
    case 'admin_share':
      return 'Setoran Bagian Admin';
    case 'driver_loan':
      return 'Pinjaman Modal Driver';
    default:
      return 'Kewajiban Driver';
  }
}

/**
 * GENERATE RINCIAN TAGIHAN CUSTOMER
 * Strictly prevents any internal accounting leakage (no admin cut, banter cut, driver debt, loans).
 */
export function generateCustomerWhatsAppMessage(
  order: Order,
  options?: { hideZero?: boolean }
): string {
  const lines: string[] = [];

  // Header & Identity
  lines.push(`*RINCIAN PESANAN BANTER*`);
  lines.push(`Halo Kak ${order.customer_name}, berikut rincian pesanan Kakak:`);
  lines.push(`Nomor Order: *${order.order_number}*`);
  const dateFormatted = new Date(order.created_at).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  lines.push(`Tanggal: ${dateFormatted}`);
  lines.push(``);

  // Rincian Belanja
  const items = order.items || [];
  let shoppingTotal = 0;
  let hasPendingPrice = order.shopping_price_status === 'pending_driver';

  if (items.length > 0) {
    lines.push(`*DAFTAR BELANJA*`);
    items.forEach((it) => {
      const isKnown = it.is_price_known !== false && it.unit_price > 0 && it.item_status !== 'unavailable';
      if (!isKnown && it.item_status !== 'unavailable') {
        hasPendingPrice = true;
        lines.push(`• ${it.name}`);
        lines.push(`  ${it.qty}x × _(Harga menunggu konfirmasi Driver)_`);
      } else if (it.item_status === 'unavailable') {
        lines.push(`• ~${it.name}~ _(Barang tidak tersedia / dibatalkan)_`);
      } else {
        const subtotal = it.qty * it.unit_price;
        shoppingTotal += subtotal;
        lines.push(`• ${it.name}`);
        lines.push(`  ${it.qty} × ${formatRupiah(it.unit_price)} = ${formatRupiah(subtotal)}`);
      }
    });

    if (hasPendingPrice) {
      lines.push(`*Total Belanja:* _(Belum final - menunggu konfirmasi driver)_`);
    } else {
      lines.push(`*Total Belanja: ${formatRupiah(order.total_shopping_cost || shoppingTotal)}*`);
    }
    lines.push(``);
  } else if (order.total_shopping_cost > 0) {
    lines.push(`*DAFTAR BELANJA*`);
    lines.push(`• Belanja Makanan / Barang: ${formatRupiah(order.total_shopping_cost)}`);
    lines.push(`*Total Belanja: ${formatRupiah(order.total_shopping_cost)}*`);
    lines.push(``);
  }

  // Tempat Belanja / Lokasi
  const locationsCount = 1 + (order.extra_stops_count || 0);
  lines.push(`*TEMPAT BELANJA*`);
  if (order.purchase_location) {
    lines.push(`Lokasi: ${order.purchase_location}`);
  }
  lines.push(`Jumlah tempat: ${locationsCount} lokasi`);
  if (order.pickup_address) {
    lines.push(`Titik Ambil: ${order.pickup_address}`);
  }
  lines.push(`Titik Antar: ${order.delivery_address}`);
  lines.push(``);

  // Rincian Ongkir & Biaya Tambahan
  lines.push(`*BIAYA PENGANTARAN*`);
  lines.push(`• Ongkir (${order.distance_rounded_km} KM): ${formatRupiah(order.delivery_fee)}`);

  let extraFeesShown = 0;
  if (order.is_rain) {
    lines.push(`• Biaya Hujan: ${formatRupiah(order.pricing_snapshot?.rain_fee || 5000)}`);
    extraFeesShown += order.pricing_snapshot?.rain_fee || 5000;
  }
  if (order.is_night) {
    lines.push(`• Biaya Jam Malam: ${formatRupiah(order.pricing_snapshot?.night_fee || 5000)}`);
    extraFeesShown += order.pricing_snapshot?.night_fee || 5000;
  }
  if (order.extra_stops_count > 0) {
    const stopsRate = order.pricing_snapshot?.extra_stop_rate || 2000;
    const stopsTotal = order.extra_stops_count * stopsRate;
    lines.push(`• Biaya Tempat Tambahan (${order.extra_stops_count} titik): ${formatRupiah(stopsTotal)}`);
    extraFeesShown += stopsTotal;
  }
  lines.push(``);

  // Ringkasan Pembayaran
  lines.push(`*TOTAL PEMBAYARAN*`);
  if (hasPendingPrice) {
    lines.push(`• Belanja: _(Menunggu konfirmasi harga)_`);
  } else if (order.total_shopping_cost > 0) {
    lines.push(`• Belanja: ${formatRupiah(order.total_shopping_cost)}`);
  }
  lines.push(`• Ongkir: ${formatRupiah(order.delivery_fee)}`);
  if (order.extra_fees_total > 0) {
    lines.push(`• Biaya Tambahan: ${formatRupiah(order.extra_fees_total)}`);
  }

  if (hasPendingPrice) {
    const baseKnownBill = order.delivery_fee + order.extra_fees_total;
    lines.push(`*TOTAL TAGIHAN: ${formatRupiah(baseKnownBill)} + Belanja (Belum Final)*`);
    lines.push(`_Harga barang final akan dikonfirmasi oleh driver setelah struk tercatat._`);
  } else {
    lines.push(`*TOTAL TAGIHAN: ${formatRupiah(order.customer_total_bill)}*`);
  }

  const paidAmt = order.customer_paid_amount || 0;
  lines.push(`Sudah Dibayar: ${formatRupiah(paidAmt)}`);

  if (!hasPendingPrice) {
    const remaining = Math.max(0, order.customer_total_bill - paidAmt);
    lines.push(`*Sisa Pembayaran: ${formatRupiah(remaining)}*`);
  } else {
    const remOngkir = Math.max(0, (order.delivery_fee + order.extra_fees_total) - paidAmt);
    lines.push(`*Sisa Pembayaran Ongkir: ${formatRupiah(remOngkir)}*`);
  }

  lines.push(``);
  lines.push(`Terima kasih telah menggunakan layanan *BANTER*.`);

  return lines.join('\n');
}

/**
 * GENERATE RINCIAN PEMBAYARAN DRIVER
 * Includes full financial transparency: Delivery cut, 10% Banter, 100% extra fees,
 * actual driver personal shopping reimbursement, itemized obligations, compensations,
 * and net transfer.
 */
export function generateDriverWhatsAppMessage(data: {
  driver: Driver;
  orders: Order[];
  priorObligations?: DriverObligation[];
  compensationsApplied?: CompensationItem[];
  transferAmount?: number;
  method?: string;
  notes?: string;
  statusText?: string;
}): string {
  const { driver, orders, priorObligations = [], compensationsApplied = [], transferAmount, method = 'Transfer Bank' } = data;
  const lines: string[] = [];

  lines.push(`*RINCIAN PEMBAYARAN DRIVER BANTER*`);
  lines.push(`Nama Driver: *${driver.name}* (${driver.code})`);

  const orderNumbers = orders.map((o) => o.order_number).join(', ');
  lines.push(`Order: *${orderNumbers || '-'}*`);

  const customerNames = orders.map((o) => o.customer_name).filter(Boolean).join(', ');
  if (customerNames) {
    lines.push(`Customer: ${customerNames}`);
  }

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  lines.push(`Tanggal: ${todayStr}`);
  lines.push(``);

  // A. Rincian Ongkir
  const totalDeliveryFee = orders.reduce((sum, o) => sum + o.delivery_fee, 0);
  const totalAdminShare = orders.reduce((sum, o) => sum + o.admin_share, 0);
  const totalBanterShare = orders.reduce((sum, o) => sum + o.banter_share, 0);
  const totalDriverDeliveryShare = orders.reduce((sum, o) => sum + o.driver_delivery_share, 0);

  lines.push(`*RINCIAN ONGKIR*`);
  lines.push(`• Ongkir Customer: ${formatRupiah(totalDeliveryFee)}`);
  if (totalAdminShare > 0) {
    lines.push(`• Bagian Admin: ${formatRupiah(totalAdminShare)}`);
  }
  lines.push(`• Bagian BANTER (10%): ${formatRupiah(totalBanterShare)}`);
  lines.push(`• Hak Bersih Driver: ${formatRupiah(totalDriverDeliveryShare)}`);
  lines.push(``);

  // B. Biaya Tambahan (100% Hak Driver)
  const totalRain = orders.reduce((sum, o) => sum + (o.is_rain ? (o.pricing_snapshot?.rain_fee || 5000) : 0), 0);
  const totalNight = orders.reduce((sum, o) => sum + (o.is_night ? (o.pricing_snapshot?.night_fee || 5000) : 0), 0);
  const totalStops = orders.reduce((sum, o) => sum + (o.extra_stops_count * (o.pricing_snapshot?.extra_stop_rate || 2000)), 0);
  const totalExtra = totalRain + totalNight + totalStops;

  if (totalExtra > 0) {
    lines.push(`*BIAYA TAMBAHAN (100% Hak Driver)*`);
    if (totalRain > 0) lines.push(`• Biaya Hujan: ${formatRupiah(totalRain)}`);
    if (totalNight > 0) lines.push(`• Biaya Jam Malam: ${formatRupiah(totalNight)}`);
    if (totalStops > 0) lines.push(`• Biaya Tempat Tambahan: ${formatRupiah(totalStops)}`);
    lines.push(`• Total Biaya Tambahan: ${formatRupiah(totalExtra)}`);
    lines.push(``);
  }

  // C. Rincian Belanja
  const driverShoppingModal = orders.reduce((sum, o) => sum + o.driver_shopping_modal, 0);
  const adminShoppingModal = orders.reduce((sum, o) => sum + o.admin_shopping_modal, 0);

  if (driverShoppingModal > 0 || adminShoppingModal > 0) {
    lines.push(`*RINCIAN BELANJA*`);
    if (driverShoppingModal > 0) {
      lines.push(`• Belanja menggunakan Modal Pribadi Driver: ${formatRupiah(driverShoppingModal)}`);
      lines.push(`• Penggantian Modal Driver: ${formatRupiah(driverShoppingModal)}`);
    }
    if (adminShoppingModal > 0) {
      lines.push(`• Belanja menggunakan Kas/Transfer Admin: ${formatRupiah(adminShoppingModal)} (Bukan Utang ke Driver)`);
    }
    lines.push(``);
  }

  // D. Rincian Kewajiban & Kompensasi
  const summary = calculateDriverObligationsSummary(driver.id, priorObligations);
  const totalCompensation = compensationsApplied.reduce((sum, c) => sum + c.amount, 0);
  const remainingObligations = Math.max(0, summary.total_obligations_pending - totalCompensation);

  lines.push(`*RINCIAN KEWAJIBAN DAN SETORAN*`);
  lines.push(`• Saldo kewajiban sebelumnya: ${formatRupiah(summary.total_obligations_pending)}`);
  if (summary.modal_admin_pending > 0) {
    lines.push(`  - Pengembalian Modal Admin: ${formatRupiah(summary.modal_admin_pending)}`);
  }
  if (summary.banter_share_pending > 0) {
    lines.push(`  - Setoran bagian BANTER: ${formatRupiah(summary.banter_share_pending)}`);
  }
  if (summary.admin_share_pending > 0) {
    lines.push(`  - Setoran bagian Admin: ${formatRupiah(summary.admin_share_pending)}`);
  }
  if (summary.driver_loan_pending > 0) {
    lines.push(`  - Pinjaman Modal Driver: ${formatRupiah(summary.driver_loan_pending)}`);
  }

  if (totalCompensation > 0) {
    lines.push(`• Kompensasi pembayaran ini: ${formatRupiah(totalCompensation)}`);
    compensationsApplied.forEach((c) => {
      lines.push(`  - Potongan ${getCategoryLabel(c.category)}: ${formatRupiah(c.amount)}`);
    });
  }
  lines.push(`• Sisa kewajiban Driver: ${formatRupiah(remainingObligations)}`);
  lines.push(``);

  // E. Ringkasan Pembayaran
  const grossEntitlement = orders.reduce((sum, o) => sum + o.driver_total_entitlement, 0);
  const alreadyReceivedFromCustomer = orders.reduce((sum, o) => sum + o.driver_received_from_customer, 0);
  const alreadyTransferredByAdmin = orders.reduce((sum, o) => sum + o.driver_transferred_by_admin, 0);
  const totalAlreadyReceived = alreadyReceivedFromCustomer + alreadyTransferredByAdmin;

  // Actual transfer amount if not provided
  const actualTransfer = transferAmount !== undefined
    ? transferAmount
    : Math.max(0, grossEntitlement - totalAlreadyReceived - totalCompensation);

  const remainingRights = Math.max(0, grossEntitlement - totalAlreadyReceived - totalCompensation - actualTransfer);

  let status = 'Lunas';
  if (remainingRights > 0) {
    status = (totalAlreadyReceived + actualTransfer + totalCompensation) > 0 ? 'Dibayar Sebagian' : 'Belum Dibayar';
  }

  lines.push(`*TOTAL PEMBAYARAN*`);
  lines.push(`• Total Hak Driver: ${formatRupiah(grossEntitlement)}`);
  if (driverShoppingModal > 0) {
    lines.push(`• Penggantian Modal Driver: ${formatRupiah(driverShoppingModal)}`);
  }
  if (totalCompensation > 0) {
    lines.push(`• Total Kompensasi Kewajiban: -${formatRupiah(totalCompensation)}`);
  }
  if (totalAlreadyReceived > 0) {
    lines.push(`• Sudah Diterima Sebelumnya: ${formatRupiah(totalAlreadyReceived)}`);
  }
  lines.push(`• *Transfer Bersih Admin: ${formatRupiah(actualTransfer)}* (${method})`);
  lines.push(`• Sisa Hak Driver: ${formatRupiah(remainingRights)}`);
  lines.push(`• Status Pembayaran: *${data.statusText || status}*`);
  lines.push(``);
  lines.push(`Terima kasih atas kerja samanya.`);
  lines.push(`*BANTER*`);

  return lines.join('\n');
}
