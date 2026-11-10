import React, { useState } from 'react';
import {
  Settings,
  Users,
  Database,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  Lock,
  Sparkles,
  Info,
} from 'lucide-react';
import { TariffConfig, UserProfile, UserRole } from '../../types';
import { formatRupiah } from '../../lib/pricing/engine';
import { RoleBadge } from '../../components/RoleBadge';

interface SettingsViewProps {
  currentUser: UserProfile;
  users: UserProfile[];
  tariffConfig: TariffConfig;
  onUpdateTariff: (config: TariffConfig, reason: string) => void;
  onUpdateUserRole: (userId: string, role: UserRole, isActive: boolean) => void;
  onAddUser: (user: Omit<UserProfile, 'id' | 'created_at'>) => void;
  supabaseConfig: { url: string; anonKey: string; isConnected: boolean };
  onSaveSupabaseConfig: (config: { url: string; anonKey: string; isConnected: boolean }) => void;
  onResetDatabase: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  users,
  tariffConfig,
  onUpdateTariff,
  onUpdateUserRole,
  onAddUser,
  supabaseConfig,
  onSaveSupabaseConfig,
  onResetDatabase,
}) => {
  const [activeTab, setActiveTab] = useState<'tariff' | 'users' | 'database' | 'combined_order'>('tariff');

  // Tariff form
  const [baseDistance, setBaseDistance] = useState(String(tariffConfig.base_distance_km));
  const [baseRate, setBaseRate] = useState(String(tariffConfig.base_rate));
  const [perKmRate, setPerKmRate] = useState(String(tariffConfig.per_km_rate));
  const [adminCut, setAdminCut] = useState(String(tariffConfig.admin_cut_per_km));
  const [maxAdminCut, setMaxAdminCut] = useState(String(tariffConfig.max_admin_cut));
  const [banterPercent, setBanterPercent] = useState(String(tariffConfig.banter_percent * 100));
  const [rainFee, setRainFee] = useState(String(tariffConfig.rain_fee));
  const [nightFee, setNightFee] = useState(String(tariffConfig.night_fee));
  const [extraStopRate, setExtraStopRate] = useState(String(tariffConfig.extra_stop_rate));
  const [tariffReason, setTariffReason] = useState('');
  const [tariffSaved, setTariffSaved] = useState(false);

  // Supabase connection form
  const [sbUrl, setSbUrl] = useState(supabaseConfig.url || '');
  const [sbKey, setSbKey] = useState(supabaseConfig.anonKey || '');
  const [connSuccess, setConnSuccess] = useState(supabaseConfig.isConnected);

  // New user form
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('admin');

  const canManageTariff = currentUser.role === 'admin' || currentUser.role === 'owner';
  const isOwner = currentUser.role === 'owner';

  const handleSaveTariff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTariff) return;

    onUpdateTariff(
      {
        ...tariffConfig,
        base_distance_km: parseFloat(baseDistance) || 2,
        base_rate: parseInt(baseRate) || 8000,
        per_km_rate: parseInt(perKmRate) || 2500,
        admin_cut_per_km: parseInt(adminCut) || 500,
        max_admin_cut: parseInt(maxAdminCut) || 2000,
        banter_percent: (parseFloat(banterPercent) || 10) / 100,
        rain_fee: parseInt(rainFee) || 5000,
        night_fee: parseInt(nightFee) || 5000,
        extra_stop_rate: parseInt(extraStopRate) || 2000,
        version: `1.${Date.now().toString().slice(-3)}`,
      },
      tariffReason || 'Penyesuaian konfigurasi tarif oleh Admin BANTER'
    );

    setTariffSaved(true);
    setTimeout(() => setTariffSaved(false), 3000);
  };

  const handleTestSupabase = () => {
    if (!sbUrl.trim() || !sbKey.trim()) {
      alert('Masukkan Supabase Project URL dan Anon Key terlebih dahulu.');
      return;
    }
    // Save configuration
    onSaveSupabaseConfig({
      url: sbUrl.trim(),
      anonKey: sbKey.trim(),
      isConnected: true,
    });
    setConnSuccess(true);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    onAddUser({
      full_name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      is_active: true,
      avatar_url: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=100&h=100&fit=crop&crop=face`,
    });

    setNewUserName('');
    setNewUserEmail('');
  };

  const handleExportBackup = () => {
    const data = {
      timestamp: new Date().toISOString(),
      orders: JSON.parse(localStorage.getItem('hitung_banter_orders') || '[]'),
      expenses: JSON.parse(localStorage.getItem('hitung_banter_expenses') || '[]'),
      receipts: JSON.parse(localStorage.getItem('hitung_banter_receipts') || '[]'),
      payments: JSON.parse(localStorage.getItem('hitung_banter_payments') || '[]'),
      drivers: JSON.parse(localStorage.getItem('hitung_banter_drivers') || '[]'),
      audit_logs: JSON.parse(localStorage.getItem('hitung_banter_audit_logs') || '[]'),
    };
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', jsonStr);
    dl.setAttribute('download', `HITUNG_BANTER_BACKUP_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-[6px] bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <Settings className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pengaturan Sistem &amp; Tarif</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Konfigurasi formula tarif, hak akses akun multi-admin, sinkronisasi Supabase, dan aturan khusus.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'tariff', label: 'Tarif Reguler', icon: Settings },
          { id: 'users', label: 'Akun Admin', icon: Users },
          { id: 'combined_order', label: 'Order Gabungan', icon: Sparkles },
          { id: 'database', label: 'Supabase & Backup', icon: Database },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 h-9 px-3.5 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Tab Tariff Settings */}
      {activeTab === 'tariff' && (
        <div className="bg-white rounded-[6px] p-6 shadow-xs border border-slate-200/80 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Konfigurasi Pricing Engine BANTER</h3>
              <p className="text-xs text-slate-500">
                Perubahan tarif hanya berlaku untuk order baru; transaksi lama tetap mempertahankan snapshot tarif aslinya.
              </p>
            </div>
            {!canManageTariff && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-[4px] border border-amber-200">
                <Lock className="w-3.5 h-3.5" />
                <span>Hanya Administrator yang dapat mengubah</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSaveTariff} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Jarak Dasar (KM)</label>
                <input
                  type="number"
                  disabled={!canManageTariff}
                  value={baseDistance}
                  onChange={(e) => setBaseDistance(e.target.value)}
                  className="w-full h-10 px-3 rounded-[6px] bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tarif Dasar Ongkir (Rp)</label>
                <input
                  type="number"
                  disabled={!canManageTariff}
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  className="w-full h-10 px-3 rounded-[6px] bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 tabular-nums"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tambahan per KM di atas 2 KM (Rp)</label>
                <input
                  type="number"
                  disabled={!canManageTariff}
                  value={perKmRate}
                  onChange={(e) => setPerKmRate(e.target.value)}
                  className="w-full h-10 px-3 rounded-[6px] bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Potongan Admin per KM (Rp)</label>
                <input
                  type="number"
                  disabled={!canManageTariff}
                  value={adminCut}
                  onChange={(e) => setAdminCut(e.target.value)}
                  className="w-full h-10 px-3 rounded-[6px] bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 tabular-nums"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Batas Maksimal Potongan Admin (Rp)</label>
                <input
                  type="number"
                  disabled={!canManageTariff}
                  value={maxAdminCut}
                  onChange={(e) => setMaxAdminCut(e.target.value)}
                  className="w-full h-10 px-3 rounded-[6px] bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 tabular-nums"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Persentase Bagi Hasil BANTER (%)</label>
                <input
                  type="number"
                  disabled={!canManageTariff}
                  value={banterPercent}
                  onChange={(e) => setBanterPercent(e.target.value)}
                  className="w-full h-10 px-3 rounded-[6px] bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 tabular-nums"
                />
              </div>
            </div>

            {/* Extra Fees */}
            <div className="pt-3 border-t border-slate-100">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block mb-3">
                Biaya Tambahan (100% Hak Driver)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Biaya Hujan (Rp)</label>
                  <input
                    type="number"
                    disabled={!canManageTariff}
                    value={rainFee}
                    onChange={(e) => setRainFee(e.target.value)}
                    className="w-full h-10 px-3 rounded-[6px] bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Biaya Order Malam (Rp)</label>
                  <input
                    type="number"
                    disabled={!canManageTariff}
                    value={nightFee}
                    onChange={(e) => setNightFee(e.target.value)}
                    className="w-full h-10 px-3 rounded-[6px] bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stop / Titik Tambahan (Rp)</label>
                  <input
                    type="number"
                    disabled={!canManageTariff}
                    value={extraStopRate}
                    onChange={(e) => setExtraStopRate(e.target.value)}
                    className="w-full h-10 px-3 rounded-[6px] bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 tabular-nums"
                  />
                </div>
              </div>
            </div>

            {canManageTariff && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alasan Perubahan Tarif (Tercatat di Audit Log) *
                </label>
                <input
                  type="text"
                  required
                  value={tariffReason}
                  onChange={(e) => setTariffReason(e.target.value)}
                  placeholder="Contoh: Penyesuaian tarif BBM atau evaluasi kuartal"
                  className="w-full h-10 px-3 rounded-[6px] bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="p-3.5 rounded-[6px] bg-blue-50/80 border border-blue-200 text-blue-900 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Otorisasi Sistem: <strong>Akses Penuh Administrator</strong> (Akun Owner sementara dikunci untuk keamanan deployment).
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-blue-200 text-blue-800">
                Admin Mode
              </span>
            </div>

            {canManageTariff && (
              <div className="flex items-center justify-between pt-3">
                {tariffSaved && (
                  <span className="text-emerald-600 font-bold flex items-center gap-1 text-xs">
                    <CheckCircle2 className="w-4 h-4" /> Tarif berhasil diperbarui &amp; diaudit!
                  </span>
                )}
                <button
                  type="submit"
                  className="ml-auto h-9 px-5 rounded-[6px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Simpan Konfigurasi Tarif
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* 2. Tab Users Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-[6px] p-6 shadow-xs border border-slate-200/80 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Manajemen Pengguna &amp; Hak Akses Multi-Admin</h3>
              <p className="text-xs text-slate-500">
                Akun Owner sementara dikunci untuk pra-deploy. Admin BANTER memiliki kontrol operasional penuh.
              </p>
            </div>
          </div>

          {/* User List */}
          <div className="space-y-3">
            {users.map((u) => {
              const isLockedOwner = u.role === 'owner';
              return (
                <div
                  key={u.id}
                  className="p-4 rounded-[6px] bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-1 ring-blue-500" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{u.full_name}</h4>
                        {isLockedOwner && (
                          <span className="px-2 py-0.5 rounded-[4px] font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-200">
                            Terkunci (Pra-deploy)
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <RoleBadge role={u.role} />
                    {canManageTariff && u.id !== currentUser.id && !isLockedOwner && (
                      <select
                        value={u.role}
                        onChange={(e) => onUpdateUserRole(u.id, e.target.value as UserRole, u.is_active)}
                        className="px-2.5 py-1.5 rounded-[6px] bg-white border border-slate-300 font-semibold text-xs"
                      >
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-[4px] font-bold text-[10px] ${
                        !isLockedOwner && u.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isLockedOwner ? 'Terkunci' : u.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add User */}
          {canManageTariff && (
            <div className="p-4 rounded-[6px] bg-slate-100/70 border border-slate-200 mt-4">
              <h4 className="font-bold text-slate-800 text-xs mb-3">Tambah Akun Admin Baru</h4>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nama Lengkap Admin"
                  className="px-3 py-2 rounded-[6px] bg-white border border-slate-200 font-medium"
                />
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Email Login"
                  className="px-3 py-2 rounded-[6px] bg-white border border-slate-200 font-medium"
                />
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="px-3 py-2 rounded-[6px] bg-white border border-slate-200 font-bold"
                >
                  <option value="admin">Admin Operasional</option>
                  <option value="viewer">Viewer (Hanya Lihat)</option>
                </select>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-[6px] bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-xs cursor-pointer"
                >
                  + Tambah Pengguna
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 3. Tab Order Gabungan (Section 25) */}
      {activeTab === 'combined_order' && (
        <div className="bg-white rounded-[6px] p-6 shadow-xs border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2.5 text-amber-800 bg-amber-50 p-4 rounded-[6px] border border-amber-200">
            <Info className="w-5 h-5 shrink-0 text-amber-600" />
            <div>
              <h3 className="font-bold text-sm">Status: Menunggu Konfirmasi Owner</h3>
              <p className="text-xs text-amber-700/90 mt-0.5">
                Sesuai instruksi Bagian 25, formula Order Gabungan sebelumnya (1 customer: Rp0, 2 customer: Rp1.000, 3 customer: Rp2.000) belum dikonfirmasi apakah masih berlaku dengan aturan baru Rp500/KM. Modul ini dipisahkan dari kalkulator utama agar tidak merusak pembukuan reguler.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-[6px] bg-slate-50 border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-800 block text-sm">Draft Aturan Order Gabungan</span>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>1 Customer dalam satu rute gabungan: Potongan Admin Rp0</li>
              <li>2 Customer dalam satu rute gabungan: Potongan Admin Rp1.000</li>
              <li>3 Customer dalam satu rute gabungan: Potongan Admin Rp2.000</li>
              <li>BANTER 10% setelah dikurangi bagian Admin</li>
              <li>Biaya tambahan (hujan/malam/stop) 100% untuk Driver</li>
            </ul>
          </div>
        </div>
      )}

      {/* 4. Tab Database Supabase & Diagnostics */}
      {activeTab === 'database' && (
        <div className="bg-white rounded-[6px] p-6 shadow-xs border border-slate-200/80 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Konfigurasi Database Supabase PostgreSQL</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hubungkan ke proyek Supabase baru khusus HITUNG BANTER. Jika belum terhubung, aplikasi tetap berjalan 100% menggunakan engine lokal reaktif dan migrasi SQL siap pakai.
            </p>
          </div>

          <div className="p-4 rounded-[6px] bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">VITE_SUPABASE_URL</label>
              <input
                type="text"
                value={sbUrl}
                onChange={(e) => setSbUrl(e.target.value)}
                placeholder="https://xyzproject.supabase.co"
                className="w-full h-10 px-3 rounded-[6px] bg-white border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">VITE_SUPABASE_ANON_KEY</label>
              <input
                type="password"
                value={sbKey}
                onChange={(e) => setSbKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full h-10 px-3 rounded-[6px] bg-white border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500">
                Status: {connSuccess ? '🟢 Terhubung ke Supabase' : '🔵 Menggunakan Local Storage Engine Reaktif'}
              </span>
              <button
                type="button"
                onClick={handleTestSupabase}
                className="h-9 px-4 rounded-[6px] bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
              >
                Simpan &amp; Uji Koneksi
              </button>
            </div>
          </div>

          {/* Backup & Reset tools */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="font-bold text-slate-800 text-xs">Cadangan &amp; Pemulihan Data</h4>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-2 h-9 px-4 rounded-[6px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer border border-slate-200"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Export Backup JSON Lengkap</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin mereset data demo ke default awal?')) {
                    onResetDatabase();
                  }
                }}
                className="flex items-center gap-2 h-9 px-4 rounded-[6px] bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs cursor-pointer border border-red-200"
              >
                <RotateCcw className="w-4 h-4 text-red-600" />
                <span>Reset ke Data Awal Demo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
