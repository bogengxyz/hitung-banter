import React from 'react';
import {
  Calculator,
  ClipboardList,
  UserCheck,
  Wallet,
  HandCoins,
  Package,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  LayoutGrid,
  MapPin,
} from 'lucide-react';

export type MainNavTab =
  | 'home'
  | 'calculator'
  | 'orders'
  | 'drivers'
  | 'monitoring-driver'
  | 'customer-payments'
  | 'driver-payments'
  | 'expenses'
  | 'reports'
  | 'audit'
  | 'settings'
  | 'users';

interface MainMenuGridProps {
  onNavigate: (tab: MainNavTab) => void;
}

export const MainMenuGrid: React.FC<MainMenuGridProps> = ({ onNavigate }) => {
  const menuItems = [
    {
      id: 'calculator' as MainNavTab,
      title: 'Kalkulator',
      desc: 'Hitung tarif & bagi hasil',
      icon: Calculator,
      gradient: 'from-blue-600 to-cyan-500',
      shadow: 'shadow-blue-500/25',
    },
    {
      id: 'orders' as MainNavTab,
      title: 'Pesanan',
      desc: 'Kelola pesanan driver',
      icon: ClipboardList,
      gradient: 'from-emerald-500 to-green-400',
      shadow: 'shadow-emerald-500/25',
    },
    {
      id: 'drivers' as MainNavTab,
      title: 'Driver',
      desc: 'Kelola data driver',
      icon: UserCheck,
      gradient: 'from-purple-600 to-indigo-500',
      shadow: 'shadow-purple-500/25',
    },
    {
      id: 'monitoring-driver' as MainNavTab,
      title: 'Monitoring Driver',
      desc: 'Live tracking GPS peta driver',
      icon: MapPin,
      gradient: 'from-blue-700 to-indigo-600',
      shadow: 'shadow-blue-600/25',
    },
    {
      id: 'customer-payments' as MainNavTab,
      title: 'Pembayaran Customer',
      desc: 'Catat cash, QRIS & transfer',
      icon: Wallet,
      gradient: 'from-amber-500 to-orange-400',
      shadow: 'shadow-orange-500/25',
    },
    {
      id: 'driver-payments' as MainNavTab,
      title: 'Pembayaran Driver',
      desc: 'Hitung & catat pembayaran',
      icon: HandCoins,
      gradient: 'from-cyan-500 to-teal-400',
      shadow: 'shadow-cyan-500/25',
    },
    {
      id: 'expenses' as MainNavTab,
      title: 'Modal & Pengeluaran',
      desc: 'Kelola belanja dan modal',
      icon: Package,
      gradient: 'from-rose-500 to-pink-500',
      shadow: 'shadow-rose-500/25',
    },
    {
      id: 'reports' as MainNavTab,
      title: 'Laporan Keuangan',
      desc: 'Lihat laporan lengkap',
      icon: TrendingUp,
      gradient: 'from-blue-700 to-indigo-600',
      shadow: 'shadow-indigo-500/25',
    },
    {
      id: 'audit' as MainNavTab,
      title: 'Riwayat & Audit',
      desc: 'Lacak semua transaksi',
      icon: ShieldCheck,
      gradient: 'from-emerald-600 to-teal-500',
      shadow: 'shadow-emerald-600/25',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-slate-800" />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Menu Utama</h2>
        </div>
        <button
          onClick={() => onNavigate('orders')}
          className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-[6px] transition-colors cursor-pointer"
        >
          <span>Lihat Semua</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2-column mobile, 2/4-column responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group relative overflow-hidden rounded-[6px] p-4 sm:p-5 bg-gradient-to-r ${item.gradient} text-white shadow-md ${item.shadow} hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 flex items-center justify-between text-left cursor-pointer`}
            >
              {/* Soft decorative background icon outline */}
              <div className="absolute right-6 -bottom-3 opacity-10 pointer-events-none transform scale-150">
                <Icon className="w-24 h-24 stroke-[1.5]" />
              </div>

              <div className="flex items-center gap-3.5 sm:gap-4 relative z-10">
                <div className="w-11 h-11 rounded-[6px] bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30">
                  <Icon className="w-5 h-5 text-white stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-white/85 font-normal line-clamp-1 mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>

              {/* Arrow button */}
              <div className="w-8 h-8 rounded-[6px] bg-white flex items-center justify-center text-slate-800 shrink-0 shadow-sm group-hover:translate-x-0.5 transition-transform relative z-10 ml-2">
                <ChevronRight className="w-4 h-4 text-slate-700 stroke-[2.5]" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
