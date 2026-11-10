import React, { useState, useRef, useEffect } from 'react';
import { Bell, Menu, X, ShieldCheck, Database, Check, Search, ArrowRight, Clock, Package, LogOut } from 'lucide-react';
import { UserProfile, Order } from '../types';
import { RoleBadge } from './RoleBadge';
import { formatRupiah } from '../lib/pricing/engine';

interface NavbarProps {
  currentUser: UserProfile;
  users: UserProfile[];
  orders?: Order[];
  onSelectOrder?: (order: Order) => void;
  onSwitchUser: (user: UserProfile) => void;
  onOpenMobileMenu: () => void;
  onOpenNotifications: () => void;
  notificationCount: number;
  supabaseConnected: boolean;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  users,
  orders = [],
  onSelectOrder,
  onSwitchUser,
  onOpenMobileMenu,
  onOpenNotifications,
  notificationCount,
  supabaseConnected,
  onLogout,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = React.useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];
    return orders
      .filter((o) => {
        return (
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          (o.driver_name && o.driver_name.toLowerCase().includes(q))
        );
      })
      .slice(0, 6);
  }, [orders, globalSearch]);

  const handleSelectSearchResult = (order: Order) => {
    setGlobalSearch('');
    setIsSearchOpen(false);
    setIsMobileSearchExpanded(false);
    if (onSelectOrder) {
      onSelectOrder(order);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-2 sm:gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200/80 shadow-xs p-1 overflow-hidden">
              <img
                src="/assets/aistudio/logo_7417d4ba.png"
                alt="HITUNG BANTER"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">HITUNG</span>
                <span className="text-lg sm:text-xl font-black italic tracking-wider text-blue-600">BANTER</span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 tracking-tight mt-0.5 hidden xs:block">
                Kalkulator &amp; Pembukuan Keuangan Driver
              </p>
            </div>
          </div>

          {/* Global Search Bar (Center / Desktop & Tablet) */}
          <div ref={searchRef} className="relative flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => {
                  if (globalSearch.trim()) setIsSearchOpen(true);
                }}
                placeholder="Cari order aktif... (nama customer / no order)"
                className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200/80 text-xs font-medium text-slate-800 placeholder-slate-400 transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setGlobalSearch('');
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {isSearchOpen && globalSearch.trim().length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-80 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Hasil Pencarian Order ({searchResults.length})
                </div>

                {searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-center text-xs text-slate-500">
                    Tidak ada pesanan cocok dengan "{globalSearch}"
                  </div>
                ) : (
                  searchResults.map((ord) => (
                    <button
                      key={ord.id}
                      onClick={() => handleSelectSearchResult(ord)}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50/70 transition-colors flex items-center justify-between gap-2 border-b border-slate-50 last:border-0 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-blue-700">{ord.order_number}</span>
                          <span className="font-semibold text-xs text-slate-800 truncate">
                            {ord.customer_name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          Driver: <span className="font-medium text-slate-700">{ord.driver_name}</span> • Antar ke: {ord.delivery_address}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-slate-900 tabular-nums">
                          {formatRupiah(ord.customer_total_bill)}
                        </div>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            ord.customer_payment_status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.customer_payment_status === 'paid' ? 'Lunas' : 'Menunggu'}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right actions: Connection badge, notification bell, user switcher, mobile menu */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Database indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>{supabaseConnected ? 'Supabase Sync' : 'Engine Lokal'}</span>
              <span className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`}></span>
            </div>

            {/* Mobile Search Toggle Icon */}
            <button
              onClick={() => setIsMobileSearchExpanded(!isMobileSearchExpanded)}
              type="button"
              aria-label="Cari Order"
              className="md:hidden p-2 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              type="button"
              aria-label="Notifikasi dan aktivitas"
              className="relative p-2 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>

            {/* User Profile & Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                type="button"
                className="flex items-center gap-2 p-1 sm:p-1.5 sm:pl-2 sm:pr-2.5 rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer text-left"
                aria-expanded={showUserDropdown}
                aria-haspopup="true"
              >
                <img
                  src={currentUser.avatar_url || '/assets/aistudio/logo_7417d4ba.png'}
                  alt={currentUser.full_name}
                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-blue-500"
                />
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {currentUser.full_name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 capitalize">{currentUser.role}</div>
                </div>
                <div className="hidden sm:block">
                  <RoleBadge role={currentUser.role} size="sm" />
                </div>
              </button>

              {/* Dropdown to switch roles easily for testing & operations */}
              {showUserDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200/80 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs text-slate-400 font-medium">Masuk Sebagai:</p>
                      <p className="text-sm font-bold text-slate-800">{currentUser.full_name}</p>
                      <p className="text-xs text-slate-500">{currentUser.email}</p>
                    </div>

                    <div className="py-1">
                      <p className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Ganti Akun Demo / Role
                      </p>
                      {users.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            onSwitchUser(u);
                            setShowUserDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer text-left ${
                            u.id === currentUser.id ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <img src={u.avatar_url || '/assets/aistudio/logo_7417d4ba.png'} alt="" className="w-6 h-6 rounded-md object-cover" />
                            <div>
                              <div>{u.full_name}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{u.role.toUpperCase()}</div>
                            </div>
                          </div>
                          {u.id === currentUser.id && <Check className="w-4 h-4 text-blue-600" />}
                        </button>
                      ))}
                    </div>

                    {onLogout && (
                      <div className="pt-1 mt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserDropdown(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-left"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>Keluar / Logout</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={onOpenMobileMenu}
              type="button"
              aria-label="Buka Menu"
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar Expansion */}
      {isMobileSearchExpanded && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Cari nomor order atau customer..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-100 text-xs font-medium text-slate-900 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                setGlobalSearch('');
                setIsMobileSearchExpanded(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {globalSearch.trim() && (
            <div className="mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-1 max-h-60 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="px-3 py-2 text-center text-xs text-slate-400">
                  Tidak ada order cocok
                </div>
              ) : (
                searchResults.map((ord) => (
                  <button
                    key={ord.id}
                    onClick={() => handleSelectSearchResult(ord)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0"
                  >
                    <div>
                      <div className="font-bold text-xs text-blue-700">{ord.order_number}</div>
                      <div className="text-[11px] text-slate-700 font-semibold">{ord.customer_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900">{formatRupiah(ord.customer_total_bill)}</div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">{ord.customer_payment_status}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
