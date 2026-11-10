import React from 'react';
import {
  LayoutDashboard,
  Calculator,
  ClipboardList,
  UserCheck,
  Wallet,
  HandCoins,
  Package,
  TrendingUp,
  ShieldCheck,
  Settings,
  Users,
  ChevronRight,
  X,
  MapPin,
  LogOut,
} from 'lucide-react';
import { MainNavTab } from './MainMenuGrid';
import { UserProfile } from '../types';
import { RoleBadge } from './RoleBadge';

interface SidebarProps {
  currentTab: MainNavTab;
  onNavigate: (tab: MainNavTab) => void;
  currentUser: UserProfile;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onNavigate,
  currentUser,
  isOpenMobile,
  onCloseMobile,
  onLogout,
}) => {
  const navItems = [
    { id: 'home' as MainNavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calculator' as MainNavTab, label: 'Kalkulator', icon: Calculator },
    { id: 'orders' as MainNavTab, label: 'Pesanan', icon: ClipboardList },
    { id: 'drivers' as MainNavTab, label: 'Driver', icon: UserCheck },
    { id: 'monitoring-driver' as MainNavTab, label: 'Monitoring Driver', icon: MapPin },
    { id: 'customer-payments' as MainNavTab, label: 'Pembayaran Customer', icon: Wallet },
    { id: 'driver-payments' as MainNavTab, label: 'Pembayaran Driver', icon: HandCoins },
    { id: 'expenses' as MainNavTab, label: 'Modal & Pengeluaran', icon: Package },
    { id: 'reports' as MainNavTab, label: 'Laporan Keuangan', icon: TrendingUp },
    { id: 'audit' as MainNavTab, label: 'Riwayat & Audit', icon: ShieldCheck },
    { id: 'settings' as MainNavTab, label: 'Pengaturan Tarif', icon: Settings },
    { id: 'users' as MainNavTab, label: 'Manajemen Admin', icon: Users, requireOwnerOrAdmin: true },
  ];

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80 p-3.5 w-64">
      {/* Brand Header: Shown on mobile drawer or as sleek title on desktop */}
      <div className="flex items-center justify-between px-2 py-2.5 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[6px] bg-white border border-slate-200/80 p-0.5 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
            <img
              src="/assets/aistudio/logo_7417d4ba.png"
              alt="HITUNG BANTER"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-1 font-black text-slate-900 tracking-tight leading-none text-sm">
              <span>HITUNG</span>
              <span className="text-blue-600 italic">BANTER</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Sistem Keuangan Driver</div>
          </div>
        </div>
        {isOpenMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-[6px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 overflow-y-auto py-1.5">
        {navItems.map((item) => {
          if (item.requireOwnerOrAdmin && currentUser.role === 'viewer') return null;
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (isOpenMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="pt-2.5 border-t border-slate-100 mt-auto">
        <div className="p-2 rounded-[6px] bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={currentUser.avatar_url || '/assets/aistudio/logo_7417d4ba.png'}
              alt=""
              className="w-7 h-7 rounded-[4px] object-cover shrink-0 ring-1 ring-blue-500"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{currentUser.full_name}</p>
              <div className="mt-0.5">
                <RoleBadge role={currentUser.role} size="sm" />
              </div>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Keluar / Logout"
              aria-label="Logout"
              className="p-1.5 rounded-[6px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block shrink-0 sticky top-18 h-[calc(100vh-4.5rem)]">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
