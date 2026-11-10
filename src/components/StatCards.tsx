import React from 'react';
import { ShoppingCart, DollarSign, Users, UserCheck } from 'lucide-react';
import { formatRupiah } from '../lib/pricing/engine';

interface StatCardsProps {
  ordersCountToday: number;
  totalOngkirToday: number;
  banterShareToday: number;
  driverEntitlementToday: number;
}

export const StatCards: React.FC<StatCardsProps> = ({
  ordersCountToday,
  totalOngkirToday,
  banterShareToday,
  driverEntitlementToday,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Pesanan Hari Ini */}
      <div className="bg-white rounded-[6px] p-4 sm:p-5 shadow-xs border border-slate-200/80 flex flex-col items-center text-center hover:shadow-md hover:border-blue-200 transition-all">
        <div className="w-11 h-11 rounded-[6px] bg-blue-600 flex items-center justify-center text-white mb-2.5 shadow-sm shadow-blue-500/20">
          <ShoppingCart className="w-5 h-5" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
          {ordersCountToday}
        </div>
        <div className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
          Pesanan Hari Ini
        </div>
        <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[4px]">
          <span>↑</span> +2 kemarin
        </div>
      </div>

      {/* 2. Total Ongkir */}
      <div className="bg-white rounded-[6px] p-4 sm:p-5 shadow-xs border border-slate-200/80 flex flex-col items-center text-center hover:shadow-md hover:border-emerald-200 transition-all">
        <div className="w-11 h-11 rounded-[6px] bg-emerald-600 flex items-center justify-center text-white mb-2.5 shadow-sm shadow-emerald-500/20">
          <DollarSign className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate max-w-full tabular-nums">
          {formatRupiah(totalOngkirToday)}
        </div>
        <div className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
          Total Ongkir
        </div>
        <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[4px]">
          <span>↑</span> +12%
        </div>
      </div>

      {/* 3. Bagian BANTER */}
      <div className="bg-white rounded-[6px] p-4 sm:p-5 shadow-xs border border-slate-200/80 flex flex-col items-center text-center hover:shadow-md hover:border-indigo-200 transition-all">
        <div className="w-11 h-11 rounded-[6px] bg-indigo-600 flex items-center justify-center text-white mb-2.5 shadow-sm shadow-indigo-500/20">
          <Users className="w-5 h-5" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate max-w-full tabular-nums">
          {formatRupiah(banterShareToday)}
        </div>
        <div className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
          Bagian BANTER
        </div>
        <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-[4px]">
          <span>↑</span> +12%
        </div>
      </div>

      {/* 4. Hak Driver */}
      <div className="bg-white rounded-[6px] p-4 sm:p-5 shadow-xs border border-slate-200/80 flex flex-col items-center text-center hover:shadow-md hover:border-teal-200 transition-all">
        <div className="w-11 h-11 rounded-[6px] bg-teal-600 flex items-center justify-center text-white mb-2.5 shadow-sm shadow-teal-500/20">
          <UserCheck className="w-5 h-5" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate max-w-full tabular-nums">
          {formatRupiah(driverEntitlementToday)}
        </div>
        <div className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
          Hak Driver
        </div>
        <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-[4px]">
          <span>↑</span> +8%
        </div>
      </div>
    </div>
  );
};
