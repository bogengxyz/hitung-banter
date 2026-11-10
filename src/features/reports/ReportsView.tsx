import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Download,
  Printer,
  Calendar,
  Filter,
  DollarSign,
  Users,
  Wallet,
  HandCoins,
  Package,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Order, CustomerReceipt, DriverPayment, ExpenseItem, Driver } from '../../types';
import { formatRupiah } from '../../lib/pricing/engine';

interface ReportsViewProps {
  orders: Order[];
  receipts: CustomerReceipt[];
  payments: DriverPayment[];
  expenses: ExpenseItem[];
  drivers: Driver[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  orders,
  receipts,
  payments,
  expenses,
  drivers,
}) => {
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('today');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('all');

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return orders.filter((o) => {
      if (selectedDriverId !== 'all' && o.driver_id !== selectedDriverId) return false;
      if (o.status === 'cancelled') return false; // don't count cancelled orders

      const dateStr = o.created_at.split('T')[0];
      if (dateFilter === 'today') return dateStr === todayStr;
      if (dateFilter === 'yesterday') return dateStr === yesterdayStr;
      if (dateFilter === 'week') return new Date(o.created_at) >= sevenDaysAgo;
      if (dateFilter === 'month') return new Date(o.created_at) >= thirtyDaysAgo;
      return true;
    });
  }, [orders, dateFilter, selectedDriverId]);

  // Aggregate 13 key financial metrics
  const totalOrdersCount = filteredOrders.length;
  const totalOngkir = filteredOrders.reduce((s, o) => s + o.delivery_fee, 0);
  const totalAdminShare = filteredOrders.reduce((s, o) => s + o.admin_share, 0);
  const totalBanterShare = filteredOrders.reduce((s, o) => s + o.banter_share, 0);
  const totalDriverDeliveryShare = filteredOrders.reduce((s, o) => s + o.driver_delivery_share, 0);
  const totalDriverExtraFees = filteredOrders.reduce((s, o) => s + o.extra_fees_total, 0);
  const totalDriverShoppingModal = filteredOrders.reduce((s, o) => s + o.driver_shopping_modal, 0);
  const totalAdminShoppingModal = filteredOrders.reduce((s, o) => s + o.admin_shopping_modal, 0);
  const totalDriverEntitlement = filteredOrders.reduce((s, o) => s + o.driver_total_entitlement, 0);
  const totalDriverPaid = filteredOrders.reduce((s, o) => s + o.driver_total_received, 0);
  const totalDriverBalanceRemaining = filteredOrders.reduce((s, o) => s + o.driver_balance_remaining, 0);

  // Customer Receipts breakdown
  const orderIds = filteredOrders.map((o) => o.id);
  const relevantReceipts = receipts.filter((r) => orderIds.includes(r.order_id));
  const cashReceipts = relevantReceipts.filter((r) => r.method === 'cash').reduce((s, r) => s + r.amount, 0);
  const qrisReceipts = relevantReceipts.filter((r) => r.method === 'qris').reduce((s, r) => s + r.amount, 0);
  const transferReceipts = relevantReceipts.filter((r) => r.method === 'transfer').reduce((s, r) => s + r.amount, 0);
  const totalCustomerReceipts = cashReceipts + qrisReceipts + transferReceipts;

  const handleExportCSV = () => {
    const headers = [
      'No Pesanan',
      'Tanggal',
      'Customer',
      'Driver',
      'Jarak (KM)',
      'Ongkir Customer',
      'Bagian Admin',
      'Bagian BANTER',
      'Hak Ongkir Driver',
      'Biaya Tambahan Driver',
      'Modal Belanja Driver',
      'Modal Belanja Admin',
      'Total Hak Driver',
      'Sudah Diterima Driver',
      'Sisa Hak Driver',
      'Status Pelunasan',
    ];

    const rows = filteredOrders.map((o) => [
      o.order_number,
      o.created_at.split('T')[0],
      `"${o.customer_name}"`,
      `"${o.driver_name}"`,
      o.distance_rounded_km,
      o.delivery_fee,
      o.admin_share,
      o.banter_share,
      o.driver_delivery_share,
      o.extra_fees_total,
      o.driver_shopping_modal,
      o.admin_shopping_modal,
      o.driver_total_entitlement,
      o.driver_total_received,
      o.driver_balance_remaining,
      o.driver_balance_remaining === 0 ? 'LUNAS' : 'BELUM LUNAS',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Keuangan_BANTER_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const darkSlate = [15, 23, 42];
    const grayText = [100, 116, 139];

    // Document Header
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.rect(0, 0, 210, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('HITUNG BANTER - LAPORAN KEUANGAN OPERASIONAL', 14, 11);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    const filterNames: Record<string, string> = {
      today: 'Hari Ini',
      yesterday: 'Kemarin',
      week: '7 Hari Terakhir',
      month: 'Bulan Ini',
      all: 'Semua Periode',
    };
    const activeDriverName = selectedDriverId === 'all' ? 'Semua Driver' : (drivers.find((d) => d.id === selectedDriverId)?.name || 'Driver');
    doc.text(`Periode: ${filterNames[dateFilter] || dateFilter} | Driver: ${activeDriverName} | Waktu Unduh: ${new Date().toLocaleString('id-ID')} WIB`, 14, 18);

    // Section 1: 12 Financial Summaries
    let y = 32;
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('REKAPITULASI 13 POS KEUANGAN', 14, y);
    y += 5;

    const kpis = [
      { label: '1. Total Transaksi', value: `${totalOrdersCount} Order` },
      { label: '2. Total Ongkir', value: formatRupiah(totalOngkir) },
      { label: '3. Bagian Admin', value: formatRupiah(totalAdminShare) },
      { label: '4. Bagian BANTER', value: formatRupiah(totalBanterShare) },
      { label: '5. Hak Bersih Driver', value: formatRupiah(totalDriverDeliveryShare) },
      { label: '6. Biaya Tambahan Driver', value: formatRupiah(totalDriverExtraFees) },
      { label: '7. Modal Driver (Reimburse)', value: formatRupiah(totalDriverShoppingModal) },
      { label: '8. Modal Admin', value: formatRupiah(totalAdminShoppingModal) },
      { label: '9. Cash Diterima', value: formatRupiah(cashReceipts) },
      { label: '10. QRIS Diterima', value: formatRupiah(qrisReceipts) },
      { label: '11. Transfer Diterima', value: formatRupiah(transferReceipts) },
      { label: '12. Sisa Hak Belum Lunas', value: formatRupiah(totalDriverBalanceRemaining) },
    ];

    doc.setFontSize(7.5);
    const boxWidth = 43;
    const boxHeight = 13;
    kpis.forEach((kpi, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const bx = 14 + col * (boxWidth + 3);
      const by = y + row * (boxHeight + 2.5);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(bx, by, boxWidth, boxHeight, 'FD');

      doc.setTextColor(grayText[0], grayText[1], grayText[2]);
      doc.setFont('helvetica', 'normal');
      doc.text(kpi.label, bx + 2, by + 4.5);

      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(kpi.value, bx + 2, by + 10);
    });

    y += 3 * (boxHeight + 2.5) + 8;

    // Section 2: Order Detail Table
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('RINCIAN TRANSAKSI PESANAN', 14, y);
    y += 5;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 6.5, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);

    doc.text('No Order', 16, y + 4.5);
    doc.text('Driver', 52, y + 4.5);
    doc.text('Jarak', 82, y + 4.5);
    doc.text('Ongkir', 97, y + 4.5);
    doc.text('Admin', 117, y + 4.5);
    doc.text('BANTER', 135, y + 4.5);
    doc.text('Modal Drv', 153, y + 4.5);
    doc.text('Hak Driver', 172, y + 4.5);
    y += 6.5;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    filteredOrders.forEach((o, index) => {
      if (y > 275) {
        doc.addPage();
        y = 15;
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, 182, 6.5, 'F');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('No Order', 16, y + 4.5);
        doc.text('Driver', 52, y + 4.5);
        doc.text('Jarak', 82, y + 4.5);
        doc.text('Ongkir', 97, y + 4.5);
        doc.text('Admin', 117, y + 4.5);
        doc.text('BANTER', 135, y + 4.5);
        doc.text('Modal Drv', 153, y + 4.5);
        doc.text('Hak Driver', 172, y + 4.5);
        y += 6.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
      }

      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 5.5, 'F');
      }

      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(o.order_number, 16, y + 4);
      doc.text(o.driver_name.slice(0, 15), 52, y + 4);
      doc.text(`${o.distance_rounded_km} KM`, 82, y + 4);
      doc.text(formatRupiah(o.delivery_fee), 97, y + 4);
      doc.text(formatRupiah(o.admin_share), 117, y + 4);
      doc.text(formatRupiah(o.banter_share), 135, y + 4);
      doc.text(formatRupiah(o.driver_shopping_modal), 153, y + 4);
      doc.text(formatRupiah(o.driver_total_entitlement), 172, y + 4);

      y += 5.5;
    });

    y = Math.min(y + 6, 285);
    doc.setDrawColor(203, 213, 225);
    doc.line(14, y, 196, y);
    doc.setFontSize(7);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text('HITUNG BANTER — Sistem Operasional & Pembukuan Keuangan Driver Terpercaya.', 14, y + 4);

    doc.save(`Laporan_Keuangan_BANTER_${dateFilter}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Laporan Keuangan BANTER</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rekapitulasi 13 pos keuangan: ongkir, pembagian hasil, modal belanja, dan hak driver.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-xs shadow-rose-500/20 cursor-pointer transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 shadow-xs cursor-pointer transition-all"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-xs shadow-blue-500/20 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-slate-400 hidden sm:block" />
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: 'yesterday', label: 'Kemarin' },
            { id: 'week', label: '7 Hari Terakhir' },
            { id: 'month', label: 'Bulan Ini' },
            { id: 'all', label: 'Semua Periode' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateFilter(tab.id as any)}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-56">
          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Driver</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 13 Key Financial Reports Grid (Section 15 Requirements) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Transaksi Pesanan */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            1. Total Transaksi
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tabular-nums">
            {totalOrdersCount} <span className="text-xs font-semibold text-slate-500">Order</span>
          </div>
          <span className="text-[11px] text-slate-400">Pesanan valid terlaksana</span>
        </div>

        {/* 2. Total Ongkir */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            2. Total Ongkir
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tabular-nums">
            {formatRupiah(totalOngkir)}
          </div>
          <span className="text-[11px] text-slate-400">Sebelum potongan</span>
        </div>

        {/* 3. Pembagian Admin */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            3. Bagian Admin
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1 tabular-nums">
            {formatRupiah(totalAdminShare)}
          </div>
          <span className="text-[11px] text-amber-600">Max Rp2.000/order</span>
        </div>

        {/* 4. Bagian BANTER */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
            4. Bagian BANTER
          </span>
          <div className="text-xl sm:text-2xl font-black text-indigo-700 mt-1 tabular-nums">
            {formatRupiah(totalBanterShare)}
          </div>
          <span className="text-[11px] text-indigo-600">10% laba operasional</span>
        </div>

        {/* 5. Hak Bersih Ongkir Driver */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            5. Hak Ongkir Driver
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 tabular-nums">
            {formatRupiah(totalDriverDeliveryShare)}
          </div>
          <span className="text-[11px] text-emerald-600">Setelah potongan admin &amp; banter</span>
        </div>

        {/* 6. Biaya Tambahan Driver */}
        <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
            6. Biaya Tambahan Driver
          </span>
          <div className="text-xl sm:text-2xl font-black text-teal-700 mt-1 tabular-nums">
            {formatRupiah(totalDriverExtraFees)}
          </div>
          <span className="text-[11px] text-teal-600">100% Hak Driver</span>
        </div>

        {/* 7. Modal Belanja Driver */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
            7. Modal Driver (Reimburse)
          </span>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1 tabular-nums">
            {formatRupiah(totalDriverShoppingModal)}
          </div>
          <span className="text-[11px] text-blue-600">Wajib diganti ke driver</span>
        </div>

        {/* 8. Modal Belanja Admin */}
        <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
            8. Modal Admin
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-800 mt-1 tabular-nums">
            {formatRupiah(totalAdminShoppingModal)}
          </div>
          <span className="text-[11px] text-slate-500">Dari kas admin</span>
        </div>

        {/* 9. Penerimaan Cash Customer */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            9. Penerimaan Cash
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tabular-nums">
            {formatRupiah(cashReceipts)}
          </div>
          <span className="text-[11px] text-slate-400">Uang tunai customer</span>
        </div>

        {/* 10. Penerimaan QRIS */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            10. Penerimaan QRIS
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tabular-nums">
            {formatRupiah(qrisReceipts)}
          </div>
          <span className="text-[11px] text-slate-400">QRIS BANTER</span>
        </div>

        {/* 11. Penerimaan Transfer Bank */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            11. Penerimaan Transfer
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tabular-nums">
            {formatRupiah(transferReceipts)}
          </div>
          <span className="text-[11px] text-slate-400">Rekening bank</span>
        </div>

        {/* 12. Sisa Hak Pembayaran Driver Belum Lunas */}
        <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider block">
            12. Sisa Hak Driver
          </span>
          <div className="text-xl sm:text-2xl font-black text-red-600 mt-1 tabular-nums">
            {formatRupiah(totalDriverBalanceRemaining)}
          </div>
          <span className="text-[11px] text-red-500 font-semibold">Belum dicairkan</span>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 overflow-x-auto">
        <h3 className="text-base font-bold text-slate-900 mb-3">Tabel Rincian Transaksi Keuangan</h3>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
              <th className="py-2.5 px-3">No Order</th>
              <th className="py-2.5 px-3">Driver</th>
              <th className="py-2.5 px-3">Jarak</th>
              <th className="py-2.5 px-3 text-right">Ongkir</th>
              <th className="py-2.5 px-3 text-right">Admin</th>
              <th className="py-2.5 px-3 text-right">BANTER</th>
              <th className="py-2.5 px-3 text-right">Modal Driver</th>
              <th className="py-2.5 px-3 text-right">Total Hak</th>
              <th className="py-2.5 px-3 text-right">Sisa Hak</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.map((ord) => (
              <tr key={ord.id} className="hover:bg-slate-50/60">
                <td className="py-2.5 px-3 font-bold text-slate-900">{ord.order_number}</td>
                <td className="py-2.5 px-3 text-slate-700">{ord.driver_name}</td>
                <td className="py-2.5 px-3">{ord.distance_rounded_km} KM</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{formatRupiah(ord.delivery_fee)}</td>
                <td className="py-2.5 px-3 text-right text-amber-600 tabular-nums">{formatRupiah(ord.admin_share)}</td>
                <td className="py-2.5 px-3 text-right text-indigo-600 tabular-nums">{formatRupiah(ord.banter_share)}</td>
                <td className="py-2.5 px-3 text-right text-blue-600 tabular-nums">{formatRupiah(ord.driver_shopping_modal)}</td>
                <td className="py-2.5 px-3 text-right font-bold text-emerald-700 tabular-nums">{formatRupiah(ord.driver_total_entitlement)}</td>
                <td className="py-2.5 px-3 text-right font-black text-red-600 tabular-nums">{formatRupiah(ord.driver_balance_remaining)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
