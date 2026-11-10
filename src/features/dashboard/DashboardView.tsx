import React from 'react';
import { HeroBanner } from '../../components/HeroBanner';
import { StatCards } from '../../components/StatCards';
import { MainMenuGrid, MainNavTab } from '../../components/MainMenuGrid';
import { Order, Driver, UserProfile, CustomerReceipt, DriverPayment, ExpenseItem } from '../../types';
import { formatRupiah } from '../../lib/pricing/engine';
import { DashboardAnalytics } from './DashboardAnalytics';
import { ArrowUpRight, Clock, AlertTriangle, CheckCircle, ChevronRight, Fuel, ShieldCheck, Wallet } from 'lucide-react';

interface DashboardViewProps {
  currentUser: UserProfile;
  orders: Order[];
  drivers: Driver[];
  receipts?: CustomerReceipt[];
  payments?: DriverPayment[];
  expenses?: ExpenseItem[];
  onNavigate: (tab: MainNavTab) => void;
  onSelectOrder: (order: Order) => void;
  onOpenNewOrderModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  orders,
  drivers,
  receipts = [],
  payments = [],
  expenses = [],
  onNavigate,
  onSelectOrder,
  onOpenNewOrderModal,
}) => {
  // Compute dashboard metrics
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter((o) => o.created_at.startsWith(today) && o.status !== 'cancelled');
  
  const totalOngkir = todayOrders.reduce((sum, o) => sum + o.delivery_fee, 0);
  const banterShare = todayOrders.reduce((sum, o) => sum + o.banter_share, 0);
  const adminShare = todayOrders.reduce((sum, o) => sum + o.admin_share, 0);
  const driverDeliveryShare = todayOrders.reduce((sum, o) => sum + o.driver_delivery_share, 0);
  const driverTotalEntitlement = todayOrders.reduce((sum, o) => sum + o.driver_total_entitlement, 0);
  
  const totalDriverModal = todayOrders.reduce((sum, o) => sum + o.driver_shopping_modal, 0);
  const totalAdminModal = todayOrders.reduce((sum, o) => sum + o.admin_shopping_modal, 0);
  
  const unpaidDriverOrders = orders.filter((o) => o.status !== 'cancelled' && o.driver_balance_remaining > 0);
  const totalUnpaidToDrivers = unpaidDriverOrders.reduce((sum, o) => sum + o.driver_balance_remaining, 0);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* 1. Hero Banner */}
      <HeroBanner currentUser={currentUser} />

      {/* 2. Stat Cards (The 4 summary cards matching screenshot) */}
      <StatCards
        ordersCountToday={todayOrders.length}
        totalOngkirToday={totalOngkir}
        banterShareToday={banterShare}
        driverEntitlementToday={driverTotalEntitlement}
      />

      {/* 2B. GRAFIK & ANALISIS OPERASIONAL (Replaces Monitoring Driver) */}
      <DashboardAnalytics
        orders={orders}
        receipts={receipts}
        payments={payments}
        expenses={expenses}
      />

      {/* 3. Main Menu Grid (The vibrant gradient cards) */}
      <MainMenuGrid onNavigate={onNavigate} />

      {/* 4. Quick Financial Alert / Summary Banner if there are pending payouts */}
      {totalUnpaidToDrivers > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-[6px] p-5 text-white shadow-lg shadow-orange-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[6px] bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-100">
                Peringatan Hak Pembayaran
              </div>
              <div className="text-lg sm:text-xl font-black">
                {formatRupiah(totalUnpaidToDrivers)} Belum Dibayarkan ke Driver
              </div>
              <p className="text-xs text-amber-100/90 mt-0.5">
                Ada {unpaidDriverOrders.length} pesanan yang hak drivernya belum lunas atau masih di kas admin.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('driver-payments')}
            className="px-4 py-2 rounded-[6px] bg-white text-orange-600 font-bold text-xs sm:text-sm hover:bg-orange-50 transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            Bayar Driver Sekarang &rarr;
          </button>
        </div>
      )}

      {/* 5. Two Columns: Ringkasan Alur Uang & Pesanan Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Ringkasan Alur Kas (Col 1) */}
        <div className="bg-white rounded-[6px] p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Pembagian Hasil Hari Ini</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-[4px] bg-blue-50 text-blue-700 font-bold border border-blue-100">Resmi BANTER</span>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-[6px] bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="text-xs font-semibold text-slate-700">Total Ongkir Customer</span>
              </div>
              <span className="text-sm font-black text-slate-900 tabular-nums">{formatRupiah(totalOngkir)}</span>
            </div>

            <div className="p-3 rounded-[6px] bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-semibold text-slate-700">Bagian Admin (Max Rp2.000/order)</span>
              </div>
              <span className="text-sm font-black text-amber-600 tabular-nums">{formatRupiah(adminShare)}</span>
            </div>

            <div className="p-3 rounded-[6px] bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span className="text-xs font-semibold text-slate-700">Bagian BANTER (10% Bersih)</span>
              </div>
              <span className="text-sm font-black text-indigo-600 tabular-nums">{formatRupiah(banterShare)}</span>
            </div>

            <div className="p-3 rounded-[6px] bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span className="text-xs font-semibold text-emerald-900">Hak Bersih Driver (Ongkir)</span>
              </div>
              <span className="text-sm font-black text-emerald-700 tabular-nums">{formatRupiah(driverDeliveryShare)}</span>
            </div>
          </div>

          {/* Modal Shopping Split */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-700 mb-2">Pemisahan Modal Belanja:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-100">
                <div className="text-slate-400 text-[10px]">Modal Driver (Diganti)</div>
                <div className="text-xs font-bold text-slate-800 tabular-nums">{formatRupiah(totalDriverModal)}</div>
              </div>
              <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-100">
                <div className="text-slate-400 text-[10px]">Modal Admin</div>
                <div className="text-xs font-bold text-slate-800 tabular-nums">{formatRupiah(totalAdminModal)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pesanan Terbaru (Col 2 & 3) */}
        <div className="lg:col-span-2 bg-white rounded-[6px] p-5 sm:p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Pesanan Hari Ini</h3>
                <p className="text-xs text-slate-500">Daftar transaksi aktif dan status hak driver</p>
              </div>
              <button
                onClick={onOpenNewOrderModal}
                className="px-3.5 py-1.5 rounded-[6px] bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
              >
                + Pesanan Baru
              </button>
            </div>

            <div className="space-y-2.5">
              {todayOrders.slice(0, 5).map((order) => {
                const isPaidToDriver = order.driver_balance_remaining === 0;
                return (
                  <div
                    key={order.id}
                    onClick={() => onSelectOrder(order)}
                    className="p-3.5 rounded-[6px] bg-slate-50/70 hover:bg-blue-50/40 border border-slate-100 hover:border-blue-200 transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-[6px] bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 tabular-nums">
                        {order.distance_rounded_km}k
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{order.order_number}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[4px] bg-slate-200 text-slate-700">
                            {order.driver_name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {order.customer_name} • Ongkir {formatRupiah(order.delivery_fee)}
                          {order.total_shopping_cost > 0 && ` + Belanja ${formatRupiah(order.total_shopping_cost)}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-900 tabular-nums">
                        Hak: {formatRupiah(order.driver_total_entitlement)}
                      </div>
                      <span
                        className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-[4px] ${
                          isPaidToDriver
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isPaidToDriver ? 'Lunas Driver' : `Sisa ${formatRupiah(order.driver_balance_remaining)}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Menampilkan 5 dari {todayOrders.length} pesanan hari ini</span>
            <button
              onClick={() => onNavigate('orders')}
              className="text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Lihat Semua Pesanan &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
