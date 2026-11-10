import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Clock,
  UserCheck,
  FileText,
  AlertTriangle,
  RotateCcw,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { AuditLog } from '../../types';
import { RoleBadge } from '../../components/RoleBadge';

interface AuditViewProps {
  logs: AuditLog[];
}

export const AuditView: React.FC<AuditViewProps> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = logs.filter((l) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      (l.reason || '').toLowerCase().includes(q) ||
      (l.user_name || '').toLowerCase().includes(q) ||
      (l.entity_id || '').toLowerCase().includes(q);
    if (!matchSearch) return false;

    if (entityFilter !== 'all' && l.entity_type !== entityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-[6px] bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Audit Log &amp; Riwayat Transaksi</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Jejak digital permanen setiap pencatatan, koreksi, pembatalan, dan aliran uang BANTER.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Sistem Imutabel (Tidak Dapat Dihapus)</span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-[6px] p-4 sm:p-5 shadow-xs border border-slate-200/80 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari alasan perubahan, nama admin, atau ID transaksi..."
            className="w-full h-10 pl-10 pr-4 rounded-[6px] bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          {[
            { id: 'all', label: 'Semua Entitas' },
            { id: 'order', label: 'Pesanan' },
            { id: 'customer_receipt', label: 'Penerimaan Customer' },
            { id: 'driver_payment', label: 'Pembayaran Driver' },
            { id: 'driver', label: 'Data Driver' },
            { id: 'tariff', label: 'Aturan Tarif' },
            { id: 'user', label: 'Pengguna' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setEntityFilter(tab.id)}
              className={`h-8 px-3 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
                entityFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Timeline */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-[6px] p-12 text-center border border-slate-200/80">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">Belum ada catatan aktivitas</h3>
            <p className="text-xs text-slate-400 mt-1">
              Setiap kali ada pesanan, pembayaran, atau koreksi dibuat, catatan audit akan muncul di sini.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isCancel = log.action === 'cancel';
            const isCorrect = log.action === 'correct' || log.action === 'update';
            const isCreate = log.action === 'create';

            return (
              <div
                key={log.id}
                className="bg-white rounded-[6px] p-4 sm:p-5 shadow-xs border border-slate-200/80 hover:border-emerald-200 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-[4px] ${
                        isCancel
                          ? 'bg-red-100 text-red-800'
                          : isCorrect
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {log.entity_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-400">• ID: {log.entity_id}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(log.timestamp).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="py-2.5">
                  <p className="text-sm font-semibold text-slate-800">{log.reason}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Dilakukan oleh:</span>
                    <span className="font-bold text-slate-800">{log.user_name}</span>
                    <RoleBadge role={log.user_role} size="sm" />
                  </div>

                  {(log.previous_state || log.new_state) && (
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 font-bold hover:underline cursor-pointer text-[11px]"
                    >
                      Lihat State JSON &rarr;
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Snapshot / State Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setSelectedLog(null)} />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-[8px] shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h3 className="text-base font-bold">Audit State Snapshot</h3>
                <p className="text-xs text-slate-400">{selectedLog.entity_id} • {selectedLog.reason}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-1 rounded-[6px] hover:bg-slate-800 text-slate-400 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
              {selectedLog.previous_state && (
                <div>
                  <div className="text-amber-700 font-bold mb-1">State Sebelum (Previous):</div>
                  <pre className="p-3 rounded-[6px] bg-slate-50 border border-slate-200 overflow-x-auto text-[11px] text-slate-700">
                    {JSON.stringify(selectedLog.previous_state, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_state && (
                <div>
                  <div className="text-emerald-700 font-bold mb-1">State Sesudah (New State):</div>
                  <pre className="p-3 rounded-[6px] bg-slate-50 border border-slate-200 overflow-x-auto text-[11px] text-slate-700">
                    {JSON.stringify(selectedLog.new_state, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="h-9 px-4 rounded-[6px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
