import React from 'react';
import { X, AlertCircle, CheckCircle2, Clock, UserCheck } from 'lucide-react';
import { Order, Driver } from '../types';
import { formatRupiah } from '../lib/pricing/engine';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  unpaidOrders: Order[];
  drivers: Driver[];
  onSelectOrder: (order: Order) => void;
  onNavigateToPayments: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  unpaidOrders,
  drivers,
  onSelectOrder,
  onNavigateToPayments,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-[8px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[6px] bg-blue-600 flex items-center justify-center text-white">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Notifikasi &amp; Pembayaran Tertunda</h3>
              <p className="text-xs text-slate-500">Hak driver dan transaksi yang butuh perhatian</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-[4px] text-slate-400 hover:bg-white hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {unpaidOrders.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">Semua Hak Driver Lunas!</p>
              <p className="text-xs text-slate-500 mt-1">Tidak ada pembayaran tertunda saat ini.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
                <span>{unpaidOrders.length} Pesanan Belum Lunas ke Driver</span>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToPayments();
                  }}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  Bayar Semua Driver &rarr;
                </button>
              </div>

              {unpaidOrders.slice(0, 8).map((order) => (
                <div
                  key={order.id}
                  onClick={() => {
                    onClose();
                    onSelectOrder(order);
                  }}
                  className="p-3 rounded-[6px] bg-slate-50 hover:bg-blue-50/60 border border-slate-200/70 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[6px] bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>{order.order_number}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-[4px] bg-slate-200 text-slate-700 font-medium">
                          {order.driver_name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Customer: {order.customer_name} • {order.distance_rounded_km} KM
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-red-600">
                      Sisa {formatRupiah(order.driver_balance_remaining)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      dari total {formatRupiah(order.driver_total_entitlement)}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Otomatis dihitung dari alur uang aktual</span>
          <button
            onClick={() => {
              onClose();
              onNavigateToPayments();
            }}
            className="px-3.5 py-1.5 rounded-[6px] bg-blue-600 text-white font-semibold hover:bg-blue-700 cursor-pointer"
          >
            Buka Modul Pembayaran
          </button>
        </div>
      </div>
    </div>
  );
};
