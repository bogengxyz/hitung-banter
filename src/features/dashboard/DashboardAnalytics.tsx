import React, { useState, useMemo } from 'react';
import { ChartBarSynced, type ChartBarSyncedDataPoint } from '../../components/charts/ChartBarSynced';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  Filter,
  DollarSign,
  HandCoins,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { Order, CustomerReceipt, DriverPayment, ExpenseItem } from '../../types';
import { formatRupiah } from '../../lib/pricing/engine';

interface DashboardAnalyticsProps {
  orders: Order[];
  receipts: CustomerReceipt[];
  payments: DriverPayment[];
  expenses: ExpenseItem[];
}

type PeriodFilter = 'today' | '7d' | '30d' | 'this_month' | 'custom';

// Helper to convert date to Jakarta WIB date string (YYYY-MM-DD)
const toWibDateString = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return parts; // Returns 'YYYY-MM-DD'
};

// Helper to get WIB hour (0 - 23)
const getWibHour = (isoString: string): number => {
  const date = new Date(isoString);
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: 'numeric',
    hour12: false,
  }).format(date);
  return parseInt(hourStr, 10) || 0;
};

// Helper to get formatted WIB date label (e.g. "09 Nov")
const formatWibDateLabel = (dateStr: string): string => {
  try {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  } catch {
    return dateStr;
  }
};

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  orders,
  receipts,
  payments,
  expenses,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toWibDateString(d);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => toWibDateString(new Date()));
  // hoveredPoint removed — tooltip now handled by Recharts ChartBarDepth

  // 1. Calculate Date Range Bounds
  const { startDateStr, endDateStr, isHourly } = useMemo(() => {
    const now = new Date();
    const todayStr = toWibDateString(now);

    if (period === 'today') {
      return { startDateStr: todayStr, endDateStr: todayStr, isHourly: true };
    }
    if (period === '7d') {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      return { startDateStr: toWibDateString(past), endDateStr: todayStr, isHourly: false };
    }
    if (period === '30d') {
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      return { startDateStr: toWibDateString(past), endDateStr: todayStr, isHourly: false };
    }
    if (period === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDateStr: toWibDateString(startOfMonth), endDateStr: todayStr, isHourly: false };
    }
    // Custom
    return {
      startDateStr: customStartDate,
      endDateStr: customEndDate,
      isHourly: customStartDate === customEndDate,
    };
  }, [period, customStartDate, customEndDate]);

  // 2. Filter Orders in range
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const orderDateStr = toWibDateString(new Date(o.created_at));
      return orderDateStr >= startDateStr && orderDateStr <= endDateStr;
    });
  }, [orders, startDateStr, endDateStr]);

  const activeFilteredOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status !== 'cancelled');
  }, [filteredOrders]);

  // 3. Filter Receipts & Payments in range
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const rDateStr = toWibDateString(new Date(r.received_at));
      return rDateStr >= startDateStr && rDateStr <= endDateStr;
    });
  }, [receipts, startDateStr, endDateStr]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const pDateStr = toWibDateString(new Date(p.payment_date));
      return pDateStr >= startDateStr && pDateStr <= endDateStr;
    });
  }, [payments, startDateStr, endDateStr]);

  // 4. Section D: Ringkasan Pembayaran
  const paymentSummary = useMemo(() => {
    const totalCustReceived = filteredReceipts.reduce((sum, r) => sum + r.amount, 0);
    const totalDriverPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalUnpaidDriver = activeFilteredOrders.reduce(
      (sum, o) => sum + Math.max(0, o.driver_balance_remaining || 0),
      0
    );
    const totalBanter = activeFilteredOrders.reduce((sum, o) => sum + o.banter_share, 0);

    return {
      totalCustReceived,
      totalDriverPaid,
      totalUnpaidDriver,
      totalBanter,
    };
  }, [filteredReceipts, filteredPayments, activeFilteredOrders]);

  // 5. Section A: Grafik Keuangan Data Preparation (Line Chart)
  // 6. Section B: Grafik Aktivitas Pesanan Data Preparation (Bar Chart)
  const timeBuckets = useMemo(() => {
    if (isHourly) {
      // 2-hour intervals for today: 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00
      const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22];
      return hours.map((h) => {
        const nextH = h + 2;
        const label = `${String(h).padStart(2, '0')}:00`;

        const bucketOrders = activeFilteredOrders.filter((o) => {
          const hr = getWibHour(o.created_at);
          return hr >= h && hr < nextH;
        });

        const allBucketOrders = filteredOrders.filter((o) => {
          const hr = getWibHour(o.created_at);
          return hr >= h && hr < nextH;
        });

        const totalOngkir = bucketOrders.reduce((sum, o) => sum + o.delivery_fee, 0);
        const totalBanter = bucketOrders.reduce((sum, o) => sum + o.banter_share, 0);
        const totalDriver = bucketOrders.reduce((sum, o) => sum + o.driver_total_delivery_entitlement, 0);

        const completedCount = allBucketOrders.filter((o) => o.status === 'completed').length;
        const waitingPaymentCount = allBucketOrders.filter(
          (o) => o.status !== 'cancelled' && o.customer_payment_status !== 'paid'
        ).length;
        const cancelledCount = allBucketOrders.filter((o) => o.status === 'cancelled').length;

        return {
          key: label,
          label,
          totalOngkir,
          totalBanter,
          totalDriver,
          totalOrders: allBucketOrders.length,
          completedCount,
          waitingPaymentCount,
          cancelledCount,
        };
      });
    }

    // Daily intervals for multi-day period
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const dates: string[] = [];

    const curr = new Date(start);
    while (curr <= end) {
      dates.push(toWibDateString(curr));
      curr.setDate(curr.getDate() + 1);
    }

    return dates.map((dateStr) => {
      const label = formatWibDateLabel(dateStr);
      const bucketOrders = activeFilteredOrders.filter((o) => toWibDateString(new Date(o.created_at)) === dateStr);
      const allBucketOrders = filteredOrders.filter((o) => toWibDateString(new Date(o.created_at)) === dateStr);

      const totalOngkir = bucketOrders.reduce((sum, o) => sum + o.delivery_fee, 0);
      const totalBanter = bucketOrders.reduce((sum, o) => sum + o.banter_share, 0);
      const totalDriver = bucketOrders.reduce((sum, o) => sum + o.driver_total_delivery_entitlement, 0);

      const completedCount = allBucketOrders.filter((o) => o.status === 'completed').length;
      const waitingPaymentCount = allBucketOrders.filter(
        (o) => o.status !== 'cancelled' && o.customer_payment_status !== 'paid'
      ).length;
      const cancelledCount = allBucketOrders.filter((o) => o.status === 'cancelled').length;

      return {
        key: dateStr,
        label,
        totalOngkir,
        totalBanter,
        totalDriver,
        totalOrders: allBucketOrders.length,
        completedCount,
        waitingPaymentCount,
        cancelledCount,
      };
    });
  }, [isHourly, startDateStr, endDateStr, activeFilteredOrders, filteredOrders]);

  // Financial Chart Synced Bar Data
  const chartData: ChartBarSyncedDataPoint[] = useMemo(() => {
    return timeBuckets.map((b) => ({
      label: b.label,
      totalOngkir: b.totalOngkir,
      totalDriver: b.totalDriver,
      totalBanter: b.totalBanter,
    }));
  }, [timeBuckets]);

  const maxOrdersVal = useMemo(() => {
    const max = Math.max(...timeBuckets.map((b) => b.totalOrders), 4);
    return Math.ceil(max / 2) * 2;
  }, [timeBuckets]);

  // 7. Section C: Status Pesanan Distribution (Separate Dimensions)
  const statusDistribution = useMemo(() => {
    const total = filteredOrders.length;
    if (total === 0) {
      return {
        total: 0,
        nonCancelledCount: 0,
        custPaid: 0,
        custWaiting: 0,
        driverPaid: 0,
        driverUnpaid: 0,
        completed: 0,
        cancelled: 0,
      };
    }

    const nonCancelled = filteredOrders.filter((o) => o.status !== 'cancelled');
    const custPaid = nonCancelled.filter((o) => o.customer_payment_status === 'paid').length;
    const custWaiting = nonCancelled.filter((o) => o.customer_payment_status !== 'paid').length;

    const driverPaid = nonCancelled.filter((o) => o.driver_payout_status === 'paid').length;
    const driverUnpaid = nonCancelled.filter((o) => o.driver_payout_status !== 'paid').length;

    const completed = nonCancelled.filter((o) => o.status === 'completed').length;
    const cancelled = filteredOrders.filter((o) => o.status === 'cancelled').length;

    return {
      total,
      nonCancelledCount: nonCancelled.length,
      custPaid,
      custWaiting,
      driverPaid,
      driverUnpaid,
      completed,
      cancelled,
    };
  }, [filteredOrders]);

  // Overall financial totals for period header
  const periodOngkirTotal = activeFilteredOrders.reduce((sum, o) => sum + o.delivery_fee, 0);
  const periodBanterTotal = activeFilteredOrders.reduce((sum, o) => sum + o.banter_share, 0);
  const periodDriverTotal = activeFilteredOrders.reduce(
    (sum, o) => sum + o.driver_total_delivery_entitlement,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header and Period Filter Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-[6px] border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[6px] bg-blue-600/10 text-blue-600 flex items-center justify-center font-black">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Grafik & Analisis Operasional
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Statistik performa keuangan, volume pesanan, dan distribusi status pembayaran.
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-[6px] self-start md:self-auto">
          <button
            onClick={() => setPeriod('today')}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
              period === 'today'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setPeriod('7d')}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
              period === '7d'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 Hari
          </button>
          <button
            onClick={() => setPeriod('30d')}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
              period === '30d'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30 Hari
          </button>
          <button
            onClick={() => setPeriod('this_month')}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
              period === 'this_month'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bulan Ini
          </button>
          <button
            onClick={() => setPeriod('custom')}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              period === 'custom'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Pilih Rentang</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {period === 'custom' && (
        <div className="bg-blue-50/70 border border-blue-200/70 p-3.5 rounded-[6px] flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-blue-900 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            Rentang Tanggal (WIB):
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-[6px] bg-white border border-blue-200 font-bold text-slate-800 text-xs"
            />
            <span className="text-slate-400 font-bold">s/d</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-[6px] bg-white border border-blue-200 font-bold text-slate-800 text-xs"
            />
          </div>
          <span className="text-slate-500 text-[11px] ml-auto">
            Menampilkan data transaksi zona waktu Asia/Jakarta
          </span>
        </div>
      )}

      {/* Section D: Ringkasan Pembayaran (4 Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-[6px] bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Pembayaran Customer
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 tabular-nums block mt-0.5">
              {formatRupiah(paymentSummary.totalCustReceived)}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Diterima kas/driver</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-[6px] bg-emerald-50 text-emerald-600 flex items-center justify-center font-black shrink-0">
            <Wallet className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-[6px] bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Pembayaran Driver
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 tabular-nums block mt-0.5">
              {formatRupiah(paymentSummary.totalDriverPaid)}
            </span>
            <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 mt-1">
              <HandCoins className="w-3 h-3" />
              <span>Sudah disalurkan</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-[6px] bg-blue-50 text-blue-600 flex items-center justify-center font-black shrink-0">
            <HandCoins className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-[6px] bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Sisa Hak Driver
            </span>
            <span className="text-lg sm:text-xl font-black text-amber-600 tabular-nums block mt-0.5">
              {formatRupiah(paymentSummary.totalUnpaidDriver)}
            </span>
            <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              <span>Belum lunas / sisa</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-[6px] bg-amber-50 text-amber-600 flex items-center justify-center font-black shrink-0">
            <Clock className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-[6px] bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Bagian BANTER (10%)
            </span>
            <span className="text-lg sm:text-xl font-black text-indigo-700 tabular-nums block mt-0.5">
              {formatRupiah(paymentSummary.totalBanter)}
            </span>
            <span className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1 mt-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Hak platform bersih</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-[6px] bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shrink-0">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* Main Charts Grid: A. Financial Synced Bar Chart & B. Order Activity Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* A. Grafik Keuangan (Synced Bar Chart, 2 cols on lg) */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-[6px] bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Grafik Keuangan</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-[4px] bg-slate-100 text-slate-600">
                    {isHourly ? 'Per Jam Hari Ini' : 'Tren Harian'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perbandingan Total Ongkir, Bagian BANTER, dan Hak Bersih Driver
                </p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-[2px] bg-blue-600" />
                  <span className="font-bold text-slate-700">Total Ongkir</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-[2px] bg-emerald-500" />
                  <span className="font-bold text-slate-700">Hak Driver</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-[2px] bg-indigo-500" />
                  <span className="font-bold text-slate-700">BANTER (10%)</span>
                </div>
              </div>
            </div>

            {/* Quick Stat Pill in Chart Header */}
            <div className="grid grid-cols-3 gap-2 py-3 mb-2 bg-slate-50/70 rounded-[6px] px-3 border border-slate-100 mt-3 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Ongkir:</span>
                <span className="text-xs sm:text-sm font-black text-blue-600 tabular-nums">
                  {formatRupiah(periodOngkirTotal)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Hak Driver:</span>
                <span className="text-xs sm:text-sm font-black text-emerald-600 tabular-nums">
                  {formatRupiah(periodDriverTotal)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">BANTER:</span>
                <span className="text-xs sm:text-sm font-black text-indigo-600 tabular-nums">
                  {formatRupiah(periodBanterTotal)}
                </span>
              </div>
            </div>

            {/* Synced Bar Chart (Recharts) */}
            <div className="relative w-full mt-2">
              <ChartBarSynced data={chartData} formatValue={formatRupiah} />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Zona waktu: Asia/Jakarta (WIB)</span>
            <span>Arahkan kursor ke bar untuk sinkronisasi detail nominal</span>
          </div>
        </div>

        {/* B. Grafik Aktivitas Pesanan (Bar Chart, 1 col on lg) */}
        <div className="p-5 sm:p-6 rounded-[6px] bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span>Aktivitas Pesanan</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Jumlah pesanan berdasarkan status</p>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                {filteredOrders.length} Order
              </span>
            </div>

            {/* Status Indicator Badges */}
            <div className="grid grid-cols-2 gap-2 my-3">
              <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Selesai:</span>
                <span className="text-base font-black text-emerald-600 tabular-nums">
                  {statusDistribution.completed}
                </span>
              </div>
              <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Menunggu Bayar:</span>
                <span className="text-base font-black text-amber-600 tabular-nums">
                  {statusDistribution.custWaiting}
                </span>
              </div>
              <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Sudah Lunas Cust:</span>
                <span className="text-base font-black text-blue-600 tabular-nums">
                  {statusDistribution.custPaid}
                </span>
              </div>
              <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Dibatalkan:</span>
                <span className="text-base font-black text-rose-500 tabular-nums">
                  {statusDistribution.cancelled}
                </span>
              </div>
            </div>

            {/* Vertical Bar Chart */}
            <div className="space-y-2 mt-4 max-h-56 overflow-y-auto pr-1">
              {timeBuckets.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">Belum ada pesanan pada rentang ini</div>
              ) : (
                timeBuckets.map((bucket) => {
                  const pct = maxOrdersVal > 0 ? (bucket.totalOrders / maxOrdersVal) * 100 : 0;
                  return (
                    <div key={bucket.key} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>{bucket.label}</span>
                        <span className="text-slate-900 font-extrabold">{bucket.totalOrders} order</span>
                      </div>
                      <div className="w-full h-3.5 bg-slate-100 rounded-[4px] overflow-hidden flex">
                        {bucket.completedCount > 0 && (
                          <div
                            style={{ width: `${(bucket.completedCount / maxOrdersVal) * 100}%` }}
                            className="h-full bg-emerald-500"
                            title={`Selesai: ${bucket.completedCount}`}
                          />
                        )}
                        {bucket.waitingPaymentCount > 0 && (
                          <div
                            style={{ width: `${(bucket.waitingPaymentCount / maxOrdersVal) * 100}%` }}
                            className="h-full bg-amber-400"
                            title={`Menunggu Bayar: ${bucket.waitingPaymentCount}`}
                          />
                        )}
                        {bucket.cancelledCount > 0 && (
                          <div
                            style={{ width: `${(bucket.cancelledCount / maxOrdersVal) * 100}%` }}
                            className="h-full bg-rose-400"
                            title={`Dibatalkan: ${bucket.cancelledCount}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Selesai
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Menunggu Bayar
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> Dibatalkan
            </span>
          </div>
        </div>
      </div>

      {/* C. Grafik Status Pesanan (Dimensi Terpisah Anti-Double Counting) */}
      <div className="p-5 sm:p-6 rounded-[6px] bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              <span>Grafik Status Pesanan & Pembayaran</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Analisis proporsi status Customer dan Driver dipisahkan secara akurat untuk mencegah double counting.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium self-start sm:self-auto">
            Total {filteredOrders.length} transaksi dianalisis
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
          {/* Dimension 1: Status Pembayaran Customer */}
          <div className="p-4 rounded-[6px] bg-slate-50 border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                1. Status Pembayaran Customer
              </span>
              <span className="text-xs font-extrabold text-blue-600">
                {statusDistribution.nonCancelledCount || 0} Order Aktif
              </span>
            </div>

            {/* Segment Bar */}
            {statusDistribution.nonCancelledCount === 0 ? (
              <div className="text-center text-slate-400 py-4 text-xs">Belum ada order aktif</div>
            ) : (
              <>
                <div className="w-full h-4 bg-slate-200 rounded-[4px] overflow-hidden flex">
                  <div
                    style={{
                      width: `${(statusDistribution.custPaid / statusDistribution.nonCancelledCount) * 100}%`,
                    }}
                    className="h-full bg-emerald-500 transition-all"
                    title={`Lunas: ${statusDistribution.custPaid}`}
                  />
                  <div
                    style={{
                      width: `${(statusDistribution.custWaiting / statusDistribution.nonCancelledCount) * 100}%`,
                    }}
                    className="h-full bg-amber-400 transition-all"
                    title={`Menunggu Bayar: ${statusDistribution.custWaiting}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-700">Sudah Lunas Customer</div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {statusDistribution.custPaid} order (
                        {Math.round((statusDistribution.custPaid / statusDistribution.nonCancelledCount) * 100)}%)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-700">Menunggu Pembayaran</div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {statusDistribution.custWaiting} order (
                        {Math.round((statusDistribution.custWaiting / statusDistribution.nonCancelledCount) * 100)}%)
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Dimension 2: Status Pelunasan Hak Driver */}
          <div className="p-4 rounded-[6px] bg-slate-50 border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                2. Status Pelunasan Hak Driver
              </span>
              <span className="text-xs font-extrabold text-indigo-600">
                {statusDistribution.nonCancelledCount || 0} Order Aktif
              </span>
            </div>

            {/* Segment Bar */}
            {statusDistribution.nonCancelledCount === 0 ? (
              <div className="text-center text-slate-400 py-4 text-xs">Belum ada order aktif</div>
            ) : (
              <>
                <div className="w-full h-4 bg-slate-200 rounded-[4px] overflow-hidden flex">
                  <div
                    style={{
                      width: `${(statusDistribution.driverPaid / statusDistribution.nonCancelledCount) * 100}%`,
                    }}
                    className="h-full bg-blue-600 transition-all"
                    title={`Lunas ke Driver: ${statusDistribution.driverPaid}`}
                  />
                  <div
                    style={{
                      width: `${(statusDistribution.driverUnpaid / statusDistribution.nonCancelledCount) * 100}%`,
                    }}
                    className="h-full bg-rose-400 transition-all"
                    title={`Belum Lunas ke Driver: ${statusDistribution.driverUnpaid}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-700">Sudah Lunas ke Driver</div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {statusDistribution.driverPaid} order (
                        {Math.round((statusDistribution.driverPaid / statusDistribution.nonCancelledCount) * 100)}%)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-rose-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-700">Belum Lunas ke Driver</div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {statusDistribution.driverUnpaid} order (
                        {Math.round((statusDistribution.driverUnpaid / statusDistribution.nonCancelledCount) * 100)}%)
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
