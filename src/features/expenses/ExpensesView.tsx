import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Receipt,
  User,
  ShieldCheck,
  X,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { ExpenseItem, Order } from '../../types';
import { formatRupiah } from '../../lib/pricing/engine';

interface ExpensesViewProps {
  expenses: ExpenseItem[];
  orders: Order[];
  onAddExpense: (orderId: string, item: {
    item_name: string;
    amount: number;
    funding_source: 'driver' | 'admin';
    notes?: string;
  }) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  orders,
  onAddExpense,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'driver' | 'admin'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [itemName, setItemName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [fundingSource, setFundingSource] = useState<'driver' | 'admin'>('driver');
  const [notes, setNotes] = useState('');

  const filteredExpenses = expenses.filter((e) => {
    const matchSearch =
      e.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchSearch) return false;

    if (filterSource !== 'all' && e.funding_source !== filterSource) return false;
    return true;
  });

  const totalDriverModal = expenses
    .filter((e) => e.funding_source === 'driver')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalAdminModal = expenses
    .filter((e) => e.funding_source === 'admin')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalAllShopping = totalDriverModal + totalAdminModal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(amountInput.replace(/[^0-9]/g, ''), 10);
    if (!selectedOrderId || !itemName.trim() || !amt || amt <= 0) return;

    onAddExpense(selectedOrderId, {
      item_name: itemName.trim(),
      amount: amt,
      funding_source: fundingSource,
      notes: notes.trim() || undefined,
    });

    setItemName('');
    setAmountInput('');
    setNotes('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
              <Package className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Modal Belanja &amp; Pengeluaran</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pemisahan ketat antara dana talangan pribadi driver vs modal kas admin BANTER.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 text-white font-bold text-xs sm:text-sm hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengeluaran Belanja</span>
        </button>
      </div>

      {/* Summary 3 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Seluruh Belanja</span>
          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
            {formatRupiah(totalAllShopping)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{expenses.length} item pembelian</span>
        </div>

        <div className="p-5 rounded-3xl bg-blue-50/70 border border-blue-200/80 shadow-xs">
          <span className="text-xs font-bold text-blue-800">Modal Pribadi Driver (Wajib Diganti)</span>
          <div className="text-2xl font-black text-blue-700 mt-1 tabular-nums">
            {formatRupiah(totalDriverModal)}
          </div>
          <span className="text-[11px] text-blue-600 mt-0.5 block">Diperhitungkan ke hak driver</span>
        </div>

        <div className="p-5 rounded-3xl bg-amber-50/70 border border-amber-200/80 shadow-xs">
          <span className="text-xs font-bold text-amber-800">Modal Kas Admin BANTER</span>
          <div className="text-2xl font-black text-amber-700 mt-1 tabular-nums">
            {formatRupiah(totalAdminModal)}
          </div>
          <span className="text-[11px] text-amber-600 mt-0.5 block">Bukan utang kepada driver</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama barang belanja, toko, atau catatan..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          {[
            { id: 'all', label: 'Semua Sumber Modal' },
            { id: 'driver', label: 'Modal Pribadi Driver' },
            { id: 'admin', label: 'Modal Kas Admin' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterSource(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterSource === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses List */}
      <div className="space-y-3">
        {filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">Belum ada data pengeluaran</h3>
            <p className="text-xs text-slate-400 mt-1">
              Catat item pembelian barang pesanan dan tentukan sumber modalnya.
            </p>
          </div>
        ) : (
          filteredExpenses.map((exp) => {
            const ord = orders.find((o) => o.id === exp.order_id);
            const isDriver = exp.funding_source === 'driver';
            return (
              <div
                key={exp.id}
                className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 hover:border-rose-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                      isDriver ? 'bg-blue-600' : 'bg-amber-500'
                    }`}
                  >
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{exp.item_name}</h4>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Order: <span className="font-bold text-slate-700">{ord?.order_number || exp.order_id}</span> •{' '}
                      {ord ? `Customer ${ord.customer_name} (${ord.driver_name})` : ''}
                    </div>
                    {exp.notes && (
                      <div className="text-[11px] text-slate-400 mt-0.5">Catatan: {exp.notes}</div>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-base font-black text-slate-900 tabular-nums">
                    {formatRupiah(exp.amount)}
                  </div>
                  <span
                    className={`inline-block mt-0.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      isDriver
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isDriver ? 'Modal Pribadi Driver (Reimburse)' : 'Modal Kas Admin'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-4">Tambah Pengeluaran Belanja</h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Pilih Pesanan Terkait *
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                >
                  {orders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.order_number} - {ord.customer_name} ({ord.driver_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Nama Item / Barang Belanja *
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Contoh: Nasi Goreng Spesial 2 Porsi"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Nominal Pengeluaran (Rp) *
                </label>
                <input
                  type="text"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="Contoh: 35000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-black text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Sumber Modal *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      fundingSource === 'driver'
                        ? 'bg-blue-50 border-blue-500 font-bold text-blue-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="funding"
                      checked={fundingSource === 'driver'}
                      onChange={() => setFundingSource('driver')}
                      className="text-blue-600"
                    />
                    <span>Modal Driver</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      fundingSource === 'admin'
                        ? 'bg-amber-50 border-amber-500 font-bold text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="funding"
                      checked={fundingSource === 'admin'}
                      onChange={() => setFundingSource('admin')}
                      className="text-amber-600"
                    />
                    <span>Modal Admin</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Catatan / Keterangan Struk
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Ada struk fisik warung"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-md"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
