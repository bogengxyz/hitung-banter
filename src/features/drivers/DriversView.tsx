import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Search,
  Plus,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  CreditCard,
  Edit,
  X,
  FileText,
} from 'lucide-react';
import { Driver, Order, DriverPayment } from '../../types';
import { formatRupiah } from '../../lib/pricing/engine';

interface DriversViewProps {
  drivers: Driver[];
  orders: Order[];
  payments: DriverPayment[];
  onAddDriver: (driver: Omit<Driver, 'id' | 'joined_at'>) => void;
  onUpdateDriver: (driver: Driver) => void;
  onPayDriver: (driver: Driver) => void;
}

export const DriversView: React.FC<DriversViewProps> = ({
  drivers,
  orders,
  payments,
  onAddDriver,
  onUpdateDriver,
  onPayDriver,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // New driver form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [notes, setNotes] = useState('');

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const q = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q)
      );
    });
  }, [drivers, searchQuery]);

  // Compute stats per driver
  const driverStats = useMemo(() => {
    const stats: Record<
      string,
      {
        totalOrders: number;
        totalDeliveryShare: number;
        totalExtraFees: number;
        totalShoppingReimbursement: number;
        totalEntitlement: number;
        totalReceived: number;
        balanceRemaining: number;
      }
    > = {};

    drivers.forEach((d) => {
      const dOrders = orders.filter((o) => o.driver_id === d.id && o.status !== 'cancelled');
      const totalDeliveryShare = dOrders.reduce((s, o) => s + o.driver_delivery_share, 0);
      const totalExtraFees = dOrders.reduce((s, o) => s + o.extra_fees_total, 0);
      const totalShoppingReimbursement = dOrders.reduce((s, o) => s + o.driver_shopping_modal, 0);
      const totalEntitlement = dOrders.reduce((s, o) => s + o.driver_total_entitlement, 0);
      const totalReceived = dOrders.reduce((s, o) => s + o.driver_total_received, 0);
      const balanceRemaining = dOrders.reduce((s, o) => s + o.driver_balance_remaining, 0);

      stats[d.id] = {
        totalOrders: dOrders.length,
        totalDeliveryShare,
        totalExtraFees,
        totalShoppingReimbursement,
        totalEntitlement,
        totalReceived,
        balanceRemaining,
      };
    });

    return stats;
  }, [drivers, orders]);

  const handleOpenAdd = () => {
    const nextCode = `DRV-${String(drivers.length + 1).padStart(2, '0')}`;
    setCode(nextCode);
    setName('');
    setPhone('');
    setPlate('');
    setNotes('');
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    onAddDriver({
      code: code.trim(),
      name: name.trim(),
      phone: phone.trim() || '-',
      vehicle_plate: plate.trim() || undefined,
      notes: notes.trim() || undefined,
      status: 'active',
    });

    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver || !editingDriver.name.trim()) return;
    onUpdateDriver(editingDriver);
    setEditingDriver(null);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-[6px] bg-purple-600 text-white flex items-center justify-center shadow-sm">
              <UserCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Driver BANTER</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data armada driver, total pesanan, riwayat hak ongkir, dan kontrol pelunasan.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 h-9 px-3.5 rounded-[6px] bg-blue-600 text-white font-bold text-xs sm:text-sm hover:bg-blue-700 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Driver Baru</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-[6px] p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama driver, kode ID (DRV-01), atau nomor telepon..."
            className="w-full h-10 pl-10 pr-4 rounded-[6px] bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Drivers Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDrivers.map((driver) => {
          const stat = driverStats[driver.id] || {
            totalOrders: 0,
            totalDeliveryShare: 0,
            totalExtraFees: 0,
            totalShoppingReimbursement: 0,
            totalEntitlement: 0,
            totalReceived: 0,
            balanceRemaining: 0,
          };
          const isSettled = stat.balanceRemaining === 0;

          return (
            <div
              key={driver.id}
              className="bg-white rounded-[6px] p-5 shadow-xs border border-slate-200/80 hover:border-purple-200 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Top Profile Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-[6px] bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      {driver.code}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{driver.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{driver.phone}</span>
                        {driver.vehicle_plate && (
                          <span className="font-semibold px-2 py-0.5 bg-slate-100 rounded-[4px] text-[10px] text-slate-700 border border-slate-200/70">
                            {driver.vehicle_plate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-[4px] ${
                      driver.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {driver.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 gap-2.5 py-3 text-xs">
                  <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Total Pesanan:</span>
                    <span className="font-bold text-slate-800">{stat.totalOrders} order</span>
                  </div>

                  <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Total Hak Bersih:</span>
                    <span className="font-bold text-slate-800 tabular-nums">
                      {formatRupiah(stat.totalEntitlement)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Sudah Diterima:</span>
                    <span className="font-bold text-emerald-700 tabular-nums">
                      {formatRupiah(stat.totalReceived)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-[6px] bg-amber-50/70 border border-amber-100">
                    <span className="text-amber-800 block text-[10px] font-semibold">Sisa Hak Pembayaran:</span>
                    <span className={`font-black tabular-nums ${isSettled ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatRupiah(stat.balanceRemaining)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                <button
                  onClick={() => setSelectedDriver(driver)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat Rincian</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingDriver(driver)}
                    className="h-8 w-8 rounded-[6px] hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
                    title="Edit Data Driver"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  {!isSettled ? (
                    <button
                      onClick={() => onPayDriver(driver)}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-xs cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Bayar Hak</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-[4px]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Lunas</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Driver Detail Modal (Section 14) */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setSelectedDriver(null)} />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-[8px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[6px] bg-white/20 flex items-center justify-center font-black">
                  {selectedDriver.code}
                </div>
                <div>
                  <h3 className="text-base font-bold">{selectedDriver.name}</h3>
                  <p className="text-xs text-purple-100">
                    Bergabung sejak {new Date(selectedDriver.joined_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedDriver(null)} className="p-1 rounded-[4px] text-white/80 hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Comprehensive Summary Cards */}
              {(() => {
                const stat = driverStats[selectedDriver.id] || {
                  totalOrders: 0,
                  totalDeliveryShare: 0,
                  totalExtraFees: 0,
                  totalShoppingReimbursement: 0,
                  totalEntitlement: 0,
                  totalReceived: 0,
                  balanceRemaining: 0,
                };
                return (
                  <div className="p-4 rounded-[6px] bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200">
                      Rincian Akumulasi Hak Keuangan Driver
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Ongkir Bersih Driver</span>
                      <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(stat.totalDeliveryShare)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Biaya Tambahan (Hujan, Malam, Stop)</span>
                      <span className="font-bold text-teal-700 tabular-nums">{formatRupiah(stat.totalExtraFees)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Penggantian Modal Belanja Driver</span>
                      <span className="font-bold text-blue-700 tabular-nums">{formatRupiah(stat.totalShoppingReimbursement)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
                      <span>Total Seluruh Hak Pembayaran:</span>
                      <span className="tabular-nums">{formatRupiah(stat.totalEntitlement)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Total Pembayaran Sudah Diterima:</span>
                      <span className="tabular-nums">{formatRupiah(stat.totalReceived)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-black text-red-600 bg-red-50 p-2 rounded-[6px]">
                      <span>Sisa yang Harus Dibayarkan ke Driver:</span>
                      <span className="tabular-nums text-base">{formatRupiah(stat.balanceRemaining)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Order History for this Driver */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  Riwayat Pesanan Driver Ini
                </h4>
                <div className="space-y-2">
                  {orders
                    .filter((o) => o.driver_id === selectedDriver.id)
                    .slice(0, 10)
                    .map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3 rounded-[6px] bg-white border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{ord.order_number}</div>
                          <div className="text-slate-500 text-[11px]">
                            {ord.customer_name} • {ord.distance_rounded_km} KM • {new Date(ord.created_at).toLocaleDateString('id-ID')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900 tabular-nums">
                            {formatRupiah(ord.driver_total_entitlement)}
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] ${
                              ord.driver_balance_remaining === 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ord.driver_balance_remaining === 0 ? 'Lunas' : `Sisa ${formatRupiah(ord.driver_balance_remaining)}`}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setSelectedDriver(null)}
                className="px-4 py-2 rounded-[6px] text-slate-600 font-bold hover:bg-slate-200"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  const d = selectedDriver;
                  setSelectedDriver(null);
                  onPayDriver(d);
                }}
                className="px-4 py-2 rounded-[6px] bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md"
              >
                Bayar Driver Ini &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-[8px] shadow-2xl p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Pendaftaran Driver BANTER</h3>
            <form onSubmit={handleSaveAdd} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kode Driver *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Contoh: DRV-05"
                  className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Driver *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Wahyu Pratama"
                  className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">No. WhatsApp / HP</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 0812-3456-7890"
                  className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plat Nomor Kendaraan</label>
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="Contoh: AB 4567 ZX"
                  className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan / Area Operasional</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Domisili Depok Sleman, standby siang"
                  className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-[6px] text-slate-600 font-bold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[6px] bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md"
                >
                  Simpan Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setEditingDriver(null)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-[8px] shadow-2xl p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Data Driver</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editingDriver.name}
                  onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">No. WhatsApp</label>
                <input
                  type="tel"
                  value={editingDriver.phone}
                  onChange={(e) => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plat Kendaraan</label>
                <input
                  type="text"
                  value={editingDriver.vehicle_plate || ''}
                  onChange={(e) => setEditingDriver({ ...editingDriver, vehicle_plate: e.target.value })}
                  className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Keaktifan</label>
                <select
                  value={editingDriver.status}
                  onChange={(e) => setEditingDriver({ ...editingDriver, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200 font-bold"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="px-4 py-2 rounded-[6px] text-slate-600 font-bold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[6px] bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
