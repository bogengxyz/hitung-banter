import React from 'react';
import { DriverTrackingPanel } from './DriverTrackingPanel';
import { Radio, Navigation, MapPin, Sparkles, Shield, Compass } from 'lucide-react';
import { Order } from '../../types';

interface DriverTrackingViewProps {
  onSelectDriverDetail?: (driverId: string) => void;
  onSelectOrder?: (order: Order) => void;
  orders: Order[];
}

export const DriverTrackingView: React.FC<DriverTrackingViewProps> = ({
  onSelectDriverDetail,
  onSelectOrder,
  orders,
}) => {
  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-[6px] border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[6px] bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <MapPin className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Monitoring Driver
              </h1>
              <span className="px-2.5 py-0.5 rounded-[4px] text-[11px] font-extrabold bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE GPS TRACKING
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Pantau armada driver secara langsung via Google Maps, status bertugas, kecepatan, dan penugasan order aktif.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="px-3.5 py-1.5 rounded-[6px] bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2 text-xs font-bold">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Socket.IO Live: Online</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Driver Tracking Panel with Google Maps */}
      <DriverTrackingPanel
        onSelectDriverDetail={onSelectDriverDetail}
        onSelectOrder={(orderId) => {
          const ord = orders.find((o) => o.id === orderId);
          if (ord && onSelectOrder) onSelectOrder(ord);
        }}
      />
    </div>
  );
};
