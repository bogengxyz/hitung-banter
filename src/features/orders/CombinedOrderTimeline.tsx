import React, { useState } from 'react';
import {
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { CombinedOrderGroup, CombinedOrderStatus, CombinedOrderStatusHistoryEntry } from '../../types';

interface CombinedOrderTimelineProps {
  group: CombinedOrderGroup;
  onOpenMessageModal: (stage?: 'tahap1' | 'tahap2' | 'tahap3' | 'tahap4' | 'tahap5' | 'shopping') => void;
  onDirectCopyStage: (stage: 'tahap1' | 'tahap2' | 'tahap3' | 'tahap4' | 'tahap5') => void;
  copiedActionKey: string | null;
}

export const CombinedOrderTimeline: React.FC<CombinedOrderTimelineProps> = ({
  group,
  onOpenMessageModal,
  onDirectCopyStage,
  copiedActionKey,
}) => {
  const history: CombinedOrderStatusHistoryEntry[] =
    group.status_history && group.status_history.length > 0
      ? group.status_history
      : [
          {
            id: 'hist-default',
            status: group.status,
            timestamp: group.created_at,
            actor_id: group.created_by,
            actor_name: group.created_by_name || 'Admin BANTER',
            actor_role: 'admin',
            notes: 'Order Gabungan dibuat',
          },
        ];

  const getStatusMeta = (status: CombinedOrderStatus) => {
    switch (status) {
      case 'waiting_driver':
        return {
          label: 'Menunggu Driver',
          color: 'bg-amber-100 text-amber-900 border-amber-300',
          dot: 'bg-amber-500',
          stageKey: 'tahap1' as const,
          stageName: 'Tahap 1: Pengumuman Order',
        };
      case 'driver_requested':
      case 'waiting_approval':
        return {
          label: 'Driver Mengambil Order / Menunggu Persetujuan Admin',
          color: 'bg-purple-100 text-purple-900 border-purple-300',
          dot: 'bg-purple-500',
          stageKey: 'tahap2' as const,
          stageName: 'Tahap 2: Konfirmasi Driver',
        };
      case 'admin_processing':
        return {
          label: 'Sedang Diproses Admin',
          color: 'bg-blue-100 text-blue-900 border-blue-300',
          dot: 'bg-blue-500',
          stageKey: 'tahap3' as const,
          stageName: 'Tahap 3: Proses Pesanan',
        };
      case 'driver_assigned':
      case 'in_progress':
        return {
          label: 'Driver Ditugaskan Resmi',
          color: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          dot: 'bg-indigo-500',
          stageKey: 'tahap4' as const,
          stageName: 'Tahap 4: Instruksi Driver',
        };
      case 'shopping':
        return {
          label: 'Sedang Belanja di Toko',
          color: 'bg-teal-100 text-teal-900 border-teal-300',
          dot: 'bg-teal-500',
          stageKey: 'tahap4' as const,
          stageName: 'Tahap 4: Instruksi Belanja',
        };
      case 'delivering':
        return {
          label: 'Dalam Pengantaran ke Pelanggan',
          color: 'bg-cyan-100 text-cyan-900 border-cyan-300',
          dot: 'bg-cyan-500',
          stageKey: 'tahap4' as const,
          stageName: 'Tahap 4: Instruksi Pengantaran',
        };
      case 'completed':
        return {
          label: 'Selesai & Diverifikasi',
          color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          dot: 'bg-emerald-500',
          stageKey: 'tahap5' as const,
          stageName: 'Tahap 5: Laporan Selesai',
        };
      case 'cancelled':
        return {
          label: 'Dibatalkan',
          color: 'bg-red-100 text-red-900 border-red-300',
          dot: 'bg-red-500',
          stageKey: 'tahap1' as const,
          stageName: 'Pengumuman Dibatalkan',
        };
      default:
        return {
          label: status,
          color: 'bg-slate-100 text-slate-900 border-slate-300',
          dot: 'bg-slate-500',
          stageKey: 'tahap1' as const,
          stageName: 'Pengumuman',
        };
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 text-xs space-y-3 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm">
              Riwayat Proses Order (Timeline)
            </h4>
            <p className="text-[11px] text-slate-500">
              Jejak waktu, pelaksana tindakan (Admin/Driver), serta template pesan per tahapan
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
          {history.length} Catatan Tahapan
        </span>
      </div>

      {/* Timeline entries */}
      <div className="relative pl-5 space-y-4 pt-1 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {history.map((item, idx) => {
          const meta = getStatusMeta(item.status);
          const isLatest = idx === history.length - 1;
          const copyKey = `timeline-${item.id}-${meta.stageKey}`;

          return (
            <div key={item.id || idx} className="relative group">
              {/* Dot */}
              <div
                className={`absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${meta.dot} ${
                  isLatest ? 'animate-pulse' : ''
                }`}
              />

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${meta.color}`}>
                      {meta.label}
                    </span>
                    {isLatest && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-sm">
                        Tahap Aktif
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 tabular-nums flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatTimestamp(item.timestamp)}</span>
                  </div>
                </div>

                {/* Actor & Notes */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600 text-xs">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">{item.actor_name}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200/80 px-1.5 py-0.2 rounded-sm">
                      {item.actor_role}
                    </span>
                  </div>
                  {item.notes && (
                    <span className="text-slate-600 italic text-[11px] bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      "{item.notes}"
                    </span>
                  )}
                </div>

                {/* Quick WhatsApp Actions for this stage */}
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500 font-medium">
                    Template: <strong>{meta.stageName}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenMessageModal(meta.stageKey)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer text-[11px] transition-colors"
                      title="Lihat Preview Teks Lengkap"
                    >
                      <Eye className="w-3 h-3 text-slate-500" />
                      <span>Preview Pesan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDirectCopyStage(meta.stageKey)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer text-[11px] shadow-2xs transition-colors"
                      title="Salin Pesan Tahap Ini Langsung"
                    >
                      {copiedActionKey === copyKey ? (
                        <>
                          <Check className="w-3 h-3 text-white" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin Pesan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
