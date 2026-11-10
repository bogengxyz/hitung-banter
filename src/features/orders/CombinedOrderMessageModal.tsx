import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  MessageSquare,
  AlertTriangle,
  Send,
  ShoppingBag,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { CombinedOrderGroup } from '../../types';
import {
  generateTahap1DriverAnnouncement,
  generateTahap2DriverConfirmation,
  generateTahap3AdminProcessing,
  generateTahap4DriverAssignment,
  generateTahap5OrderCompleted,
  generateCombinedOrderShoppingList,
  isGroupPricePending,
} from '../../lib/whatsapp/combinedOrderTemplates';

interface CombinedOrderMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: CombinedOrderGroup;
  initialStage?: 'tahap1' | 'tahap2' | 'tahap3' | 'tahap4' | 'tahap5' | 'shopping';
}

type MessageStageKey = 'tahap1' | 'tahap2' | 'tahap3' | 'tahap4' | 'tahap5' | 'shopping';

export const CombinedOrderMessageModal: React.FC<CombinedOrderMessageModalProps> = ({
  isOpen,
  onClose,
  group,
  initialStage,
}) => {
  // Determine appropriate default tab based on group status or initialStage prop
  const getDefaultStage = (): MessageStageKey => {
    if (initialStage) return initialStage;
    switch (group.status) {
      case 'waiting_driver':
        return 'tahap1';
      case 'driver_requested':
      case 'waiting_approval':
        return 'tahap2';
      case 'admin_processing':
        return 'tahap3';
      case 'driver_assigned':
      case 'in_progress':
      case 'shopping':
      case 'delivering':
        return 'tahap4';
      case 'completed':
        return 'tahap5';
      default:
        return 'tahap1';
    }
  };

  const [activeStage, setActiveStage] = useState<MessageStageKey>(getDefaultStage());
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Generate current text based on active tab
  const getMessageText = (stage: MessageStageKey): string => {
    switch (stage) {
      case 'tahap1':
        return generateTahap1DriverAnnouncement(group);
      case 'tahap2':
        return generateTahap2DriverConfirmation(group);
      case 'tahap3':
        return generateTahap3AdminProcessing(group);
      case 'tahap4':
        return generateTahap4DriverAssignment(group);
      case 'tahap5':
        return generateTahap5OrderCompleted(group);
      case 'shopping':
        return generateCombinedOrderShoppingList(group);
      default:
        return '';
    }
  };

  const currentMessageText = getMessageText(activeStage);
  const groupHasPending = isGroupPricePending(group);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentMessageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = currentMessageText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const stagesList: { key: MessageStageKey; label: string; badge: string; icon: string }[] = [
    { key: 'tahap1', label: 'Tahap 1: Pengumuman Order', badge: 'Menunggu Driver', icon: '📢' },
    { key: 'tahap2', label: 'Tahap 2: Konfirmasi Driver', badge: 'Persetujuan Admin', icon: '🙋' },
    { key: 'tahap3', label: 'Tahap 3: Proses Pesanan', badge: 'Admin Review', icon: '⚙️' },
    { key: 'tahap4', label: 'Tahap 4: Instruksi Driver', badge: 'Driver Ditugaskan', icon: '🏍️' },
    { key: 'tahap5', label: 'Tahap 5: Laporan Selesai', badge: 'Selesai', icon: '✅' },
    { key: 'shopping', label: '🛒 Daftar Belanja Lengkap', badge: 'Semua Rincian', icon: '🛒' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-3xl max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">
                  Template WhatsApp Order Gabungan
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {group.group_number}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pilih tahapan untuk melihat preview teks pesan WhatsApp operasional
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-5 pt-3 border-b border-slate-100 bg-slate-50/80 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 min-w-max pb-2">
            {stagesList.map((st) => {
              const isActive = activeStage === st.key;
              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => {
                    setActiveStage(st.key);
                    setCopied(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80'
                  }`}
                >
                  <span>{st.icon}</span>
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stage Notification & Price Pending Notice */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Status Order Saat Ini:</span>
            <span className="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              {group.status}
            </span>
            {group.driver_name && group.driver_name !== 'Belum Ditugaskan' && (
              <span className="text-slate-500">
                • Driver: <strong className="text-slate-800">{group.driver_name}</strong>
              </span>
            )}
          </div>

          {groupHasPending && (
            <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-semibold text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Ada harga belum diketahui (Tagihan Belum Final)</span>
            </div>
          )}
        </div>

        {/* Preview Area */}
        <div className="p-5 flex-1 overflow-y-auto">
          {activeStage === 'tahap1' && (
            <div className="mb-3 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Keamanan Keuangan:</strong> Pesan Tahap 1 untuk Grup Driver <em>tidak memuat</em> Bagian Admin, Bagian BANTER, atau pembukuan internal.
              </span>
            </div>
          )}

          <div className="relative rounded-2xl bg-[#0F172A] p-4 text-slate-100 font-mono text-xs sm:text-[13px] leading-relaxed shadow-inner overflow-x-auto whitespace-pre-wrap select-all border border-slate-800">
            {currentMessageText}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Menyalin pesan tidak mengubah status order. Admin tetap mengirim pesan ke WhatsApp secara manual.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200 text-xs cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs text-white transition-all shadow-md cursor-pointer ${
                copied
                  ? 'bg-emerald-700 shadow-emerald-700/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Tersalin ke Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin Pesan WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
