import { CombinedOrderGroup } from '../../types';
import { formatRupiah } from '../pricing/engine';

/**
 * WhatsApp Message Templates for Order Gabungan (5 Tahapan + Daftar Belanja)
 * HITUNG BANTER 2026
 *
 * Rules:
 * 1. Data aktual dari Order Group dan Pricing Engine.
 * 2. Tahap 1: Pengumuman ke Grup Driver TIDAK BOLEH memuat data internal (Bagian Admin / BANTER).
 * 3. Jika ada harga barang unconfirmed, status belanja dinyatakan "Menunggu konfirmasi" & tagihan "Belum Final".
 * 4. Pemisahan tegas:
 *    - TOTAL ONGKIR CUSTOMER vs TOTAL HAK PENGANTARAN DRIVER.
 *    - TOTAL HAK PENGANTARAN DRIVER vs TOTAL HAK DRIVER KESELURUHAN (termasuk reimburse modal belanja).
 *    - Modal Driver vs Modal Kas Admin.
 */

// Helper to check if any item is unconfirmed
export function isGroupPricePending(group: CombinedOrderGroup): boolean {
  if (group.has_unconfirmed_prices) return true;
  for (const c of group.customers) {
    for (const loc of c.locations) {
      for (const it of loc.items) {
        if (it.is_price_unconfirmed || it.unit_price === 0) return true;
      }
    }
  }
  return false;
}

export function isCustomerPricePending(cust: CombinedOrderGroup['customers'][0]): boolean {
  for (const loc of cust.locations) {
    for (const it of loc.items) {
      if (it.is_price_unconfirmed || it.unit_price === 0) return true;
    }
  }
  return false;
}

export function getTotalLocationsCount(group: CombinedOrderGroup): number {
  let count = 0;
  group.customers.forEach((c) => {
    count += (c.locations || []).length;
  });
  return Math.max(1, count);
}

export function getTotalGroupDistance(group: CombinedOrderGroup): number {
  if (group.total_distance_km !== undefined) return group.total_distance_km;
  return group.customers.reduce((sum, c) => sum + (Number(c.distance_km) || 0), 0);
}

// =============================================================================
// TAHAP 1 — PENGUMUMAN ORDER DI GRUP DRIVER (Menunggu Driver)
// =============================================================================
export function generateTahap1DriverAnnouncement(group: CombinedOrderGroup): string {
  const totalDistance = getTotalGroupDistance(group);
  const lines: string[] = [
    `*📢 ORDER GABUNGAN BANTER*`,
    ``,
    `No: ${group.group_number}`,
    `Jumlah Pelanggan: ${group.customer_count} Orang`,
    `Waktu: ${group.order_date} ${group.order_time} WIB`,
    ``,
    `*📍 RINCIAN PENGANTARAN*`,
    ``,
  ];

  group.customers.forEach((c, idx) => {
    const locNames = (c.locations || []).map((l) => l.name).filter(Boolean).join(', ') || 'Tempat belanja ditentukan kemudian';
    lines.push(`Pelanggan ${idx + 1}: ${c.customer_name}`);
    lines.push(`- Lokasi belanja: ${locNames}`);
    lines.push(`- Tujuan: ${c.delivery_address || '-'}`);
    lines.push(`- Jarak: ${c.distance_km} KM`);
    lines.push(`- Ongkir: ${formatRupiah(c.delivery_fee)}`);
    lines.push(``);
  });

  lines.push(`Total Jarak: ${totalDistance} KM`);
  lines.push(`Total Ongkir Customer: ${formatRupiah(group.total_delivery_fee)}`);
  lines.push(``);
  lines.push(`*Driver yang bersedia mengambil pesanan silakan konfirmasi.*`);
  lines.push(``);
  lines.push(`Catatan: Harga barang yang belum diketahui akan dikonfirmasi setelah proses belanja.`);

  return lines.join('\n');
}

// =============================================================================
// TAHAP 2 — DRIVER MENGAMBIL PESANAN (Menunggu Persetujuan Admin)
// =============================================================================
export function generateTahap2DriverConfirmation(
  group: CombinedOrderGroup,
  candidateDriverName?: string
): string {
  const driverName = candidateDriverName || group.candidate_driver_name || group.driver_name || 'Driver BANTER';

  const lines: string[] = [
    `*🙋 KONFIRMASI PENGAMBILAN ORDER*`,
    ``,
    `No: ${group.group_number}`,
    `Driver: ${driverName}`,
    `Jumlah Pelanggan: ${group.customer_count} Orang`,
    ``,
    `Driver telah menyatakan bersedia mengambil order gabungan ini.`,
    ``,
    `*Status: Menunggu Persetujuan Admin.*`,
    ``,
    `Pengambilan order belum dianggap resmi sampai Admin menyetujui dan menetapkan Driver.`,
  ];

  return lines.join('\n');
}

export const generateTahap2DriverTakingOrder = generateTahap2DriverConfirmation;

// =============================================================================
// TAHAP 3 — ADMIN MEMPROSES PESANAN (Sedang Diproses Admin)
// =============================================================================
export function generateTahap3AdminProcessing(group: CombinedOrderGroup): string {
  const totalLocations = getTotalLocationsCount(group);
  const totalDistance = getTotalGroupDistance(group);
  const groupHasPending = isGroupPricePending(group);

  const lines: string[] = [
    `*⚙️ INFORMASI PROSES ORDER GABUNGAN*`,
    ``,
    `No: ${group.group_number}`,
    `Status: Sedang Diproses Admin`,
    `Driver: ${group.driver_name || 'Menunggu Penetapan'}`,
    `Jumlah Pelanggan: ${group.customer_count} Orang`,
    `Total Lokasi Belanja: ${totalLocations} Tempat`,
    `Total Jarak Rute: ${totalDistance} KM`,
    ``,
    `━━━━━━━━━━━━━━━━`,
    `*RINCIAN PELANGGAN & BELANJA*`,
    ``,
  ];

  group.customers.forEach((c, cIdx) => {
    const custPending = isCustomerPricePending(c);
    lines.push(`*${cIdx + 1}. Pelanggan: ${c.customer_name}* ${c.customer_phone ? `(${c.customer_phone})` : ''}`);
    lines.push(`Tujuan: ${c.delivery_address || '-'}`);
    lines.push(`Jarak: ${c.distance_km} KM | Ongkir: ${formatRupiah(c.delivery_fee)}`);
    lines.push(``);

    c.locations.forEach((loc, lIdx) => {
      lines.push(`🏪 Tempat Belanja ${lIdx + 1}: ${loc.name}`);
      if (loc.address) lines.push(`Alamat: ${loc.address}`);
      lines.push(`Daftar Barang:`);
      if (loc.items.length === 0) {
        lines.push(`- (Belum ada catatan barang)`);
      } else {
        loc.items.forEach((it) => {
          if (it.is_price_unconfirmed || it.unit_price === 0) {
            lines.push(`- ${it.name} x${it.qty} — Harga menunggu konfirmasi`);
          } else {
            lines.push(`- ${it.name} x${it.qty} @ ${formatRupiah(it.unit_price)} = ${formatRupiah(it.total_price)}`);
          }
        });
      }
      lines.push(``);
    });

    lines.push(`Subtotal Belanja: ${custPending ? 'Menunggu konfirmasi harga' : formatRupiah(c.shopping_subtotal)}`);
    lines.push(`Ongkir Customer: ${formatRupiah(c.delivery_fee)}`);
    lines.push(`Total Tagihan Pelanggan: ${custPending ? 'Belum Final' : formatRupiah(c.customer_total_bill)}`);
    lines.push(`--------------------------------`);
  });

  lines.push(``);
  lines.push(`*💰 RINGKASAN SEMENTARA ORDER GABUNGAN*`);
  lines.push(`Total Sementara Belanja: ${groupHasPending ? `Menunggu konfirmasi (tercatat: ${formatRupiah(group.total_shopping_cost)})` : formatRupiah(group.total_shopping_cost)}`);
  lines.push(`Total Sementara Ongkir: ${formatRupiah(group.total_delivery_fee)}`);
  if (group.extra_fees_total > 0) {
    lines.push(`Total Biaya Tambahan: ${formatRupiah(group.extra_fees_total)}`);
  }
  lines.push(`*Total Tagihan Customer: ${groupHasPending ? 'Belum Final' : formatRupiah(group.customer_total_bill)}*`);
  lines.push(``);
  lines.push(`_Catatan: Tagihan belanja dan total tagihan akan difinalisasi setelah driver membeli barang di toko._`);

  return lines.join('\n');
}

// =============================================================================
// TAHAP 4 — ADMIN MENETAPKAN DRIVER (Driver Ditugaskan)
// Instruksi Operasional Lengkap Langsung Digunakan Driver
// =============================================================================
export function generateTahap4DriverAssignment(group: CombinedOrderGroup): string {
  const totalLocations = getTotalLocationsCount(group);
  const totalDistance = getTotalGroupDistance(group);

  const lines: string[] = [
    `*🏍️ PENUGASAN ORDER GABUNGAN BANTER*`,
    ``,
    `No: ${group.group_number}`,
    `Driver: ${group.driver_name}`,
    `Jumlah Pelanggan: ${group.customer_count} Orang`,
    `Total Lokasi Belanja: ${totalLocations} Tempat`,
    ``,
    `━━━━━━━━━━━━━━━━`,
    `*🛒 DAFTAR BELANJA DAN PENGANTARAN*`,
    ``,
  ];

  group.customers.forEach((c, cIdx) => {
    lines.push(`*${cIdx + 1}. PELANGGAN: ${c.customer_name.toUpperCase()}*`);
    lines.push(``);

    // Locations
    c.locations.forEach((loc, lIdx) => {
      lines.push(`🏪 *TEMPAT BELANJA ${lIdx + 1}*`);
      lines.push(`Nama Toko: ${loc.name}`);
      lines.push(`Alamat: ${loc.address || '-'}`);
      lines.push(`Lokasi: ${loc.maps_url || '-'}`);
      lines.push(``);
      lines.push(`Daftar Barang:`);
      if (loc.items.length === 0) {
        lines.push(`- (Belum ada catatan barang)`);
      } else {
        loc.items.forEach((it) => {
          if (it.is_price_unconfirmed || it.unit_price === 0) {
            lines.push(`- ${it.name} x${it.qty} (harga menyusul)`);
          } else {
            lines.push(`- ${it.name} x${it.qty} @ ${formatRupiah(it.unit_price)} = ${formatRupiah(it.total_price)}`);
          }
        });
      }
      lines.push(``);
    });

    const custPending = isCustomerPricePending(c);
    if (!custPending && c.shopping_subtotal > 0) {
      lines.push(`Subtotal Belanja: ${formatRupiah(c.shopping_subtotal)}`);
      lines.push(``);
    }

    lines.push(`📍 *TUJUAN PENGANTARAN*`);
    lines.push(`${c.delivery_address || '-'}`);
    lines.push(`Lokasi: ${c.delivery_maps_url || '-'}`);
    lines.push(``);
    lines.push(`Jarak: ${c.distance_km} KM`);
    lines.push(`Ongkir Customer: ${formatRupiah(c.delivery_fee)}`);
    // Extra fees if any customer specific or split
    const extraLocationsInThisCust = Math.max(0, (c.locations || []).length - 1);
    const extraLocationsFeeThisCust = extraLocationsInThisCust * 2000;
    if (extraLocationsFeeThisCust > 0) {
      lines.push(`Biaya Titik Belanja Tambahan: ${formatRupiah(extraLocationsFeeThisCust)}`);
    }
    const custDeliveryTotal = c.delivery_fee + extraLocationsFeeThisCust;
    lines.push(`*Total Tagihan Ongkir: ${formatRupiah(custDeliveryTotal)}*`);
    lines.push(``);
    lines.push(`━━━━━━━━━━━━━━━━`);
    lines.push(``);
  });

  lines.push(`*💰 RINGKASAN ONGKIR DAN HAK DRIVER*`);
  lines.push(``);

  group.customers.forEach((c, idx) => {
    lines.push(`Jarak Pelanggan ${idx + 1}: ${c.distance_km} KM`);
  });
  lines.push(`*Total Jarak: ${totalDistance} KM*`);
  lines.push(``);

  group.customers.forEach((c, idx) => {
    lines.push(`Ongkir Pelanggan ${idx + 1}: ${formatRupiah(c.delivery_fee)}`);
  });
  lines.push(`*TOTAL ONGKIR CUSTOMER: ${formatRupiah(group.total_delivery_fee)}*`);
  lines.push(``);
  lines.push(`Bagian Admin: ${formatRupiah(group.admin_share)}`);
  lines.push(`Bagian BANTER: ${formatRupiah(group.banter_share)}`);
  lines.push(`*TOTAL HAK PENGANTARAN DRIVER: ${formatRupiah(group.driver_delivery_share)}*`);
  lines.push(``);

  if (group.extra_fees_total > 0) {
    lines.push(`Biaya tambahan untuk Driver: ${formatRupiah(group.extra_fees_total)}`);
    if (group.extra_locations_fee > 0) {
      lines.push(`  - Tempat Belanja Ekstra: ${formatRupiah(group.extra_locations_fee)}`);
    }
    if (group.rain_fee > 0) {
      lines.push(`  - Cuaca Hujan: ${formatRupiah(group.rain_fee)}`);
    }
    if (group.night_fee > 0) {
      lines.push(`  - Jam Malam: ${formatRupiah(group.night_fee)}`);
    }
  }

  // Reimbursement modal belanja driver
  if (group.driver_shopping_modal > 0) {
    lines.push(`Penggantian Modal Belanja Driver (Reimburse): ${formatRupiah(group.driver_shopping_modal)}`);
  }
  if (group.admin_shopping_modal > 0) {
    lines.push(`_Modal Belanja Didanai Kas Admin: ${formatRupiah(group.admin_shopping_modal)} (Bukan Utang Driver)_`);
  }

  lines.push(`*TOTAL HAK DRIVER KESELURUHAN: ${formatRupiah(group.driver_total_entitlement)}*`);
  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━`);
  lines.push(`*📌 CATATAN PENUGASAN*`);
  lines.push(``);
  lines.push(`- Periksa kembali barang sebelum meninggalkan toko.`);
  lines.push(`- Simpan struk pembelian untuk verifikasi Admin.`);
  lines.push(`- Konfirmasi jika harga barang berbeda atau ada barang kosong.`);
  lines.push(`- Selesaikan pengantaran sesuai urutan yang ditentukan Admin.`);
  lines.push(`- Laporkan jika seluruh pesanan sudah selesai.`);
  lines.push(``);
  lines.push(`*Status: DRIVER RESMI DITUGASKAN.*`);
  lines.push(``);
  lines.push(`Terima kasih.`);
  lines.push(`BANTER`);

  return lines.join('\n');
}

// =============================================================================
// TAHAP 5 — ORDER SELESAI
// =============================================================================
export function generateTahap5OrderCompleted(group: CombinedOrderGroup): string {
  const payoutStatusLabel =
    group.driver_payout_status === 'paid'
      ? 'Sudah Dibayarkan Lunas'
      : group.driver_payout_status === 'partial'
      ? `Dibayar Sebagian (Sisa: ${formatRupiah(group.driver_balance_remaining)})`
      : `Menunggu Pembayaran Kas Admin (${formatRupiah(group.driver_total_entitlement)})`;

  const lines: string[] = [
    `*✅ ORDER GABUNGAN SELESAI*`,
    ``,
    `No: ${group.group_number}`,
    `Driver: ${group.driver_name}`,
    `Jumlah Pelanggan: ${group.customer_count} Orang`,
    ``,
    `*RINGKASAN PESANAN*`,
  ];

  group.customers.forEach((c, idx) => {
    lines.push(`- Pelanggan ${idx + 1}: ${c.customer_name} — Selesai`);
  });

  lines.push(``);
  lines.push(`Total Belanja: ${formatRupiah(group.total_shopping_cost)}`);
  lines.push(`Total Ongkir: ${formatRupiah(group.total_delivery_fee)}`);
  if (group.extra_fees_total > 0) {
    lines.push(`Biaya Tambahan: ${formatRupiah(group.extra_fees_total)}`);
  }
  lines.push(`*Total Tagihan Customer: ${formatRupiah(group.customer_total_bill)}*`);
  lines.push(``);
  lines.push(`*RINGKASAN DRIVER*`);
  lines.push(`Total Hak Pengantaran Driver: ${formatRupiah(group.driver_total_delivery_entitlement)}`);
  if (group.driver_shopping_modal > 0) {
    lines.push(`Penggantian Modal Driver: ${formatRupiah(group.driver_shopping_modal)}`);
  }
  lines.push(`Status Pembayaran Driver: ${payoutStatusLabel}`);
  lines.push(``);
  lines.push(`Terima kasih atas kerja samanya.`);
  lines.push(``);
  lines.push(`BANTER`);

  return lines.join('\n');
}

// =============================================================================
// PERBAIKI PESAN DAFTAR BELANJA ORDER GABUNGAN (Bagian 1)
// =============================================================================
export function generateCombinedOrderShoppingList(group: CombinedOrderGroup): string {
  const groupHasPending = isGroupPricePending(group);
  const lines: string[] = [
    `*🛒 DAFTAR BELANJA ORDER GABUNGAN*`,
    ``,
    `No: ${group.group_number}`,
  ];

  if (group.driver_name && group.driver_name !== 'Belum Ditugaskan' && group.driver_name !== 'Driver Belum Ditugaskan') {
    lines.push(`Driver: ${group.driver_name}`);
  }
  lines.push(``);

  group.customers.forEach((c, cIdx) => {
    const custPending = isCustomerPricePending(c);
    lines.push(`*👤 Pelanggan ${cIdx + 1}: ${c.customer_name}*`);
    lines.push(``);

    c.locations.forEach((loc) => {
      lines.push(`🏪 Tempat: ${loc.name}`);
      lines.push(`Alamat: ${loc.address || '-'}`);
      lines.push(``);
      lines.push(`Daftar Barang:`);
      if (loc.items.length === 0) {
        lines.push(`- (Belum ada catatan barang)`);
      } else {
        loc.items.forEach((it) => {
          if (it.is_price_unconfirmed || it.unit_price === 0) {
            lines.push(`- ${it.name} x${it.qty} — Harga menunggu konfirmasi`);
          } else {
            lines.push(`- ${it.name} x${it.qty} @ ${formatRupiah(it.unit_price)} = ${formatRupiah(it.total_price)}`);
          }
        });
      }
      lines.push(``);
    });

    lines.push(`Subtotal Belanja: ${custPending ? 'Menunggu harga' : formatRupiah(c.shopping_subtotal)}`);
    lines.push(`Ongkir: ${formatRupiah(c.delivery_fee)}`);
    // Extra location fee for this customer
    const extraLocs = Math.max(0, (c.locations || []).length - 1);
    if (extraLocs > 0) {
      lines.push(`Biaya Tambahan: ${formatRupiah(extraLocs * 2000)}`);
    }
    lines.push(`Total Tagihan: ${custPending ? 'Belum Final' : formatRupiah(c.customer_total_bill)}`);
    lines.push(``);
  });

  lines.push(`*💰 RINGKASAN ORDER GABUNGAN*`);
  lines.push(``);
  lines.push(`Total Belanja: ${groupHasPending ? `Menunggu konfirmasi harga (sementara ${formatRupiah(group.total_shopping_cost)})` : formatRupiah(group.total_shopping_cost)}`);
  lines.push(`Total Ongkir: ${formatRupiah(group.total_delivery_fee)}`);
  if (group.extra_fees_total > 0) {
    lines.push(`Total Biaya Tambahan: ${formatRupiah(group.extra_fees_total)}`);
  }
  lines.push(`*Total Tagihan Customer: ${groupHasPending ? 'Belum Final' : formatRupiah(group.customer_total_bill)}*`);
  lines.push(``);
  lines.push(`Modal Driver: ${formatRupiah(group.driver_shopping_modal)}`);
  lines.push(`Modal Admin: ${formatRupiah(group.admin_shopping_modal)}`);
  lines.push(`Total Reimburse Driver: ${formatRupiah(group.driver_shopping_modal)}`);
  lines.push(``);
  lines.push(`_Catatan: Simpan struk pembelian fisik untuk bukti verifikasi Admin._`);

  return lines.join('\n');
}

export const generateDriverShoppingListWhatsApp = generateCombinedOrderShoppingList;
