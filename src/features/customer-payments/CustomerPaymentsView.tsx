import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Search,
  CheckCircle2,
  FileCheck,
  User,
  ArrowRight,
  ShieldAlert,
  X,
  CreditCard,
  QrCode,
  Banknote,
  Clock,
  Sparkles,
  Calculator,
  MessageSquare,
  Copy,
  Check,
} from 'lucide-react';
import { CustomerReceipt, Order, PaymentMethod, PaymentRecipient } from '../../types';
import { formatRupiah } from '../../lib/pricing/engine';
import { generateCustomerWhatsAppMessage } from '../../lib/reconciliation/reconciliationEngine';
import { WhatsAppMessageModal } from '../../components/WhatsAppMessageModal';

interface CustomerPaymentsViewProps {
  receipts: CustomerReceipt[];
  orders: Order[];
  onRecordReceipt: (data: {
    order_id: string;
    amount: number;
    method: PaymentMethod;
    recipient: PaymentRecipient;
    reference_number?: string;
    notes?: string;
    allocation: {
      shopping: number;
      delivery: number;
      extra: number;
      change: number;
      deposit: number;
    };
  }) => void;
  preSelectedOrder?: Order | null;
}

export const CustomerPaymentsView: React.FC<CustomerPaymentsViewProps> = ({
  receipts,
  orders,
  onRecordReceipt,
  preSelectedOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(!!preSelectedOrder);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(preSelectedOrder?.id || orders[0]?.id || '');

  // Payment Form State
  const [amountInput, setAmountInput] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [recipient, setRecipient] = useState<PaymentRecipient>('driver');
  const [refNumber, setRefNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Allocation matrix
  const [allocShopping, setAllocShopping] = useState<string>('0');
  const [allocDelivery, setAllocDelivery] = useState<string>('0');
  const [allocExtra, setAllocExtra] = useState<string>('0');
  const [allocChange, setAllocChange] = useState<string>('0');
  const [allocDeposit, setAllocDeposit] = useState<string>('0');

  // WhatsApp Modal State
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppTitle, setWhatsAppTitle] = useState('');
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [whatsAppPhone, setWhatsAppPhone] = useState<string | undefined>(undefined);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  const handleCopyText = async (text: string, actionId: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch {
      try {
        const el = document.createElement('textarea');
        el.value = text;
        el.setAttribute('readonly', '');
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      } catch (err) {
        console.warn('Fallback copy failed', err);
      }
    }
    setCopiedAction(actionId);
    setTimeout(() => setCopiedAction(null), 2500);
  };

  const openCustomerWhatsAppModal = (ord: Order) => {
    const msg = generateCustomerWhatsAppMessage(ord);
    setWhatsAppTitle(`Rincian Tagihan Customer - ${ord.customer_name} (${ord.order_number})`);
    setWhatsAppMessage(msg);
    setWhatsAppPhone(ord.customer_phone);
    setWhatsAppModalOpen(true);
  };

  const copyCustomerWhatsAppDirect = (ord: Order, actionId: string) => {
    const msg = generateCustomerWhatsAppMessage(ord);
    handleCopyText(msg, actionId);
  };

  // Compute breakdown of unpaid amounts for an order
  const getOrderBreakdown = (ord: Order) => {
    const ordReceipts = receipts.filter((r) => r.order_id === ord.id);
    let paidShopping = 0;
    let paidDelivery = 0;
    let paidExtra = 0;
    ordReceipts.forEach((r) => {
      paidShopping += r.allocation?.shopping || 0;
      paidDelivery += r.allocation?.delivery || 0;
      paidExtra += r.allocation?.extra || 0;
    });

    const remDelivery = Math.max(0, ord.delivery_fee - paidDelivery);
    const remExtra = Math.max(0, ord.extra_fees_total - paidExtra);
    const remShopping = Math.max(0, ord.total_shopping_cost - paidShopping);
    const totalRemaining = Math.max(0, ord.customer_total_bill - ord.customer_paid_amount);

    return {
      paidShopping,
      paidDelivery,
      paidExtra,
      remDelivery,
      remExtra,
      remShopping,
      totalRemaining,
    };
  };

  // Smart allocation helper
  const applySmartAllocation = (
    ord: Order,
    mode: 'ongkir_only' | 'remaining_all' | 'custom',
    customAmt?: number
  ) => {
    const { remDelivery, remExtra, remShopping, totalRemaining } = getOrderBreakdown(ord);

    if (mode === 'ongkir_only') {
      const targetAmt = remDelivery + remExtra;
      setAmountInput(String(targetAmt));
      setAllocDelivery(String(remDelivery));
      setAllocExtra(String(remExtra));
      setAllocShopping('0');
      setAllocChange('0');
      setAllocDeposit('0');
    } else if (mode === 'remaining_all') {
      setAmountInput(String(totalRemaining));
      setAllocDelivery(String(remDelivery));
      setAllocExtra(String(remExtra));
      setAllocShopping(String(remShopping));
      setAllocChange('0');
      setAllocDeposit('0');
    } else if (mode === 'custom' && customAmt !== undefined) {
      let rem = customAmt;
      // Prioritize delivery
      const dAlloc = Math.min(rem, remDelivery);
      rem -= dAlloc;
      // Next extra fees
      const eAlloc = Math.min(rem, remExtra);
      rem -= eAlloc;
      // Next shopping
      const sAlloc = Math.min(rem, remShopping);
      rem -= sAlloc;
      // Remainder to change or deposit
      setAllocDelivery(String(dAlloc));
      setAllocExtra(String(eAlloc));
      setAllocShopping(String(sAlloc));
      setAllocChange(String(rem));
      setAllocDeposit('0');
    }
  };

  const handleSelectOrder = (ordId: string) => {
    setSelectedOrderId(ordId);
    const ord = orders.find((o) => o.id === ordId);
    if (!ord) return;

    if (ord.shopping_price_status === 'pending_driver') {
      applySmartAllocation(ord, 'ongkir_only');
    } else {
      applySmartAllocation(ord, 'remaining_all');
    }
  };

  // Open modal if preSelectedOrder changes
  useEffect(() => {
    if (preSelectedOrder) {
      setSelectedOrderId(preSelectedOrder.id);
      if (preSelectedOrder.shopping_price_status === 'pending_driver') {
        applySmartAllocation(preSelectedOrder, 'ongkir_only');
      } else {
        applySmartAllocation(preSelectedOrder, 'remaining_all');
      }
      setIsRecordModalOpen(true);
    }
  }, [preSelectedOrder]);

  const currentOrder = orders.find((o) => o.id === selectedOrderId);
  const currentBreakdown = currentOrder ? getOrderBreakdown(currentOrder) : null;

  const parsedAmount = parseInt(amountInput.replace(/[^0-9]/g, ''), 10) || 0;
  const numShopping = parseInt(allocShopping.replace(/[^0-9]/g, ''), 10) || 0;
  const numDelivery = parseInt(allocDelivery.replace(/[^0-9]/g, ''), 10) || 0;
  const numExtra = parseInt(allocExtra.replace(/[^0-9]/g, ''), 10) || 0;
  const numChange = parseInt(allocChange.replace(/[^0-9]/g, ''), 10) || 0;
  const numDeposit = parseInt(allocDeposit.replace(/[^0-9]/g, ''), 10) || 0;
  const totalAllocated = numShopping + numDelivery + numExtra + numChange + numDeposit;
  const isAllocationValid = totalAllocated === parsedAmount && parsedAmount > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !isAllocationValid) return;

    onRecordReceipt({
      order_id: selectedOrderId,
      amount: parsedAmount,
      method,
      recipient,
      reference_number: refNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      allocation: {
        shopping: numShopping,
        delivery: numDelivery,
        extra: numExtra,
        change: numChange,
        deposit: numDeposit,
      },
    });

    setIsRecordModalOpen(false);
  };

  const filteredReceipts = receipts.filter((r) => {
    const q = searchQuery.toLowerCase();
    const ord = orders.find((o) => o.id === r.order_id);
    return (
      r.receipt_number.toLowerCase().includes(q) ||
      (ord?.customer_name && ord.customer_name.toLowerCase().includes(q)) ||
      (ord?.order_number && ord.order_number.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-[6px] bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Pembayaran Customer</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Catat penerimaan Cash, QRIS, dan Transfer beserta alokasi belanja, ongkir, dan penerima uang.
          </p>
        </div>

        <button
          onClick={() => {
            const ord = orders.find((o) => o.customer_payment_status !== 'paid') || orders[0];
            if (ord) handleSelectOrder(ord.id);
            setIsRecordModalOpen(true);
          }}
          className="flex items-center gap-2 h-9 px-3.5 rounded-[6px] bg-amber-500 text-white font-bold text-xs sm:text-sm hover:bg-amber-600 transition-colors shadow-xs shadow-amber-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Penerimaan Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-[6px] p-4 shadow-xs border border-slate-200/80">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor tanda terima, customer, atau nomor order..."
            className="w-full h-10 pl-10 pr-4 rounded-[6px] bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Receipts List */}
      <div className="space-y-3">
        {filteredReceipts.length === 0 ? (
          <div className="bg-white rounded-[6px] p-12 text-center border border-slate-200/80">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">Belum ada penerimaan customer dicatat</h3>
            <p className="text-xs text-slate-400 mt-1">
              Klik tombol 'Catat Penerimaan Customer' untuk mencatat transaksi cash atau transfer.
            </p>
          </div>
        ) : (
          filteredReceipts.map((rcpt) => {
            const ord = orders.find((o) => o.id === rcpt.order_id);
            return (
              <div
                key={rcpt.id}
                className="bg-white rounded-[6px] p-5 shadow-xs border border-slate-200/80 hover:border-amber-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-[6px] flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                        rcpt.method === 'qris'
                          ? 'bg-purple-600'
                          : rcpt.method === 'transfer'
                          ? 'bg-blue-600'
                          : 'bg-emerald-600'
                      }`}
                    >
                      {rcpt.method === 'qris' ? (
                        <QrCode className="w-5 h-5" />
                      ) : rcpt.method === 'transfer' ? (
                        <CreditCard className="w-5 h-5" />
                      ) : (
                        <Banknote className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{rcpt.receipt_number}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-slate-100 uppercase">
                          {rcpt.method}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Order: <span className="font-bold text-slate-700">{ord?.order_number || rcpt.order_id}</span> • Customer:{' '}
                        <span className="font-semibold text-slate-800">{ord?.customer_name || 'Customer'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-base font-black text-slate-900 tabular-nums">
                      {formatRupiah(rcpt.amount)}
                    </div>
                    <span
                      className={`inline-block mt-0.5 text-[11px] font-bold px-2.5 py-0.5 rounded-[4px] ${
                        rcpt.recipient === 'driver'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      Diterima oleh {rcpt.recipient.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Allocation breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 py-3 text-[11px] border-b border-slate-100">
                  <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Uang Belanja:</span>
                    <span className="font-bold text-slate-800 tabular-nums">{formatRupiah(rcpt.allocation.shopping)}</span>
                  </div>
                  <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Ongkir:</span>
                    <span className="font-bold text-slate-800 tabular-nums">{formatRupiah(rcpt.allocation.delivery)}</span>
                  </div>
                  <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Biaya Tambahan:</span>
                    <span className="font-bold text-slate-800 tabular-nums">{formatRupiah(rcpt.allocation.extra)}</span>
                  </div>
                  <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Kembalian:</span>
                    <span className="font-bold text-slate-800 tabular-nums">{formatRupiah(rcpt.allocation.change)}</span>
                  </div>
                  <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Titipan / Sisa:</span>
                    <span className="font-bold text-slate-800 tabular-nums">{formatRupiah(rcpt.allocation.deposit)}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span>Waktu: {new Date(rcpt.received_at).toLocaleString('id-ID')}</span>
                    {rcpt.notes && <span className="text-slate-600 font-medium">Catatan: {rcpt.notes}</span>}
                  </div>

                  {ord && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openCustomerWhatsAppModal(ord)}
                        className="flex items-center gap-1 h-8 px-2.5 rounded-[6px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition-colors cursor-pointer"
                        title="Generate Rincian Tagihan Customer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                        <span>Generate Rincian Customer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => copyCustomerWhatsAppDirect(ord, `rcpt-copy-${rcpt.id}`)}
                        className="flex items-center gap-1 h-8 px-2.5 rounded-[6px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                        title="Salin Pesan Tagihan Customer"
                      >
                        {copiedAction === `rcpt-copy-${rcpt.id}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Pesan</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Record Receipt Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsRecordModalOpen(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-[8px] shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <div>
                <h3 className="text-base font-bold">Catat Pembayaran Customer</h3>
                <p className="text-xs text-amber-100">
                  Catat nominal uang yang benar-benar diterima dan distribusikan alokasinya
                </p>
              </div>
              <button onClick={() => setIsRecordModalOpen(false)} className="p-1 rounded-[6px] hover:bg-white/20 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Select Order */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Pilih Pesanan Terkait *
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => handleSelectOrder(e.target.value)}
                  className="w-full h-10 px-3 rounded-[6px] bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs cursor-pointer focus:ring-2 focus:ring-amber-500"
                >
                  {orders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.order_number} - {ord.customer_name} (Total Tagihan: {formatRupiah(ord.customer_total_bill)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Status Cards */}
              {currentOrder && currentBreakdown && (
                <div className="p-3.5 rounded-[6px] bg-slate-50 border border-slate-200 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-[6px] bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-medium">Total Tagihan</span>
                      <span className="text-xs font-black text-slate-900 tabular-nums">
                        {formatRupiah(currentOrder.customer_total_bill)}
                      </span>
                    </div>
                    <div className="p-2 rounded-[6px] bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-medium">Sudah Dibayar</span>
                      <span className="text-xs font-black text-emerald-700 tabular-nums">
                        {formatRupiah(currentOrder.customer_paid_amount)}
                      </span>
                    </div>
                    <div className="p-2 rounded-[6px] bg-amber-50 border border-amber-200">
                      <span className="text-[10px] text-amber-700 block font-bold">Sisa Tagihan</span>
                      <span className="text-xs font-black text-amber-900 tabular-nums">
                        {formatRupiah(currentBreakdown.totalRemaining)}
                      </span>
                    </div>
                  </div>

                  {currentOrder.shopping_price_status === 'pending_driver' && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-100/70 p-2 rounded-xl font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Belanja: <strong>Menunggu harga aktual dari Driver</strong>. Customer dapat membayar ongkir terlebih dahulu.
                      </span>
                    </div>
                  )}

                  {/* Quick Allocation Fillers */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {currentBreakdown.remDelivery + currentBreakdown.remExtra > 0 && (
                      <button
                        type="button"
                        onClick={() => applySmartAllocation(currentOrder, 'ongkir_only')}
                        className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 font-bold text-[11px] text-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>Hanya Ongkir ({formatRupiah(currentBreakdown.remDelivery + currentBreakdown.remExtra)})</span>
                      </button>
                    )}

                    {currentBreakdown.totalRemaining > 0 && (
                      <button
                        type="button"
                        onClick={() => applySmartAllocation(currentOrder, 'remaining_all')}
                        className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 font-bold text-[11px] text-emerald-800 flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Lunas Seluruh Sisa ({formatRupiah(currentBreakdown.totalRemaining)})</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Amount & Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Nominal Benar-Benar Diterima (Rp) *
                  </label>
                  <input
                    type="text"
                    required
                    value={amountInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAmountInput(val);
                      const amt = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
                      if (currentOrder && amt > 0) {
                        applySmartAllocation(currentOrder, 'custom', amt);
                      }
                    }}
                    placeholder="Contoh: 10500"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Metode Pembayaran *
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="cash">Cash / Tunai</option>
                    <option value="qris">QRIS BANTER</option>
                    <option value="transfer">Transfer Bank</option>
                  </select>
                </div>
              </div>

              {/* Recipient: Driver vs Admin */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Siapa yang Menerima Uang Ini? *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                      recipient === 'driver'
                        ? 'bg-teal-50 border-teal-500 font-bold text-teal-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="recipient"
                      value="driver"
                      checked={recipient === 'driver'}
                      onChange={() => setRecipient('driver')}
                      className="text-teal-600"
                    />
                    <div>
                      <div className="text-xs">Driver Langsung</div>
                      <div className="text-[10px] text-slate-400 font-normal">Uang dipegang driver</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                      recipient === 'admin'
                        ? 'bg-blue-50 border-blue-500 font-bold text-blue-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="recipient"
                      value="admin"
                      checked={recipient === 'admin'}
                      onChange={() => setRecipient('admin')}
                      className="text-blue-600"
                    />
                    <div>
                      <div className="text-xs">Admin BANTER</div>
                      <div className="text-[10px] text-slate-400 font-normal">Rekening / kas admin</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Allocation Matrix (Section 6: Total rincian alokasi harus sama dengan nominal uang yang diterima) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                    Alokasi Pembagian Uang Diterima
                  </span>
                  <div className="flex items-center gap-2">
                    {currentOrder && (
                      <button
                        type="button"
                        onClick={() => applySmartAllocation(currentOrder, 'custom', parsedAmount)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                      >
                        Auto-Alokasikan
                      </button>
                    )}
                    <span
                      className={`font-black text-xs ${
                        totalAllocated === parsedAmount && parsedAmount > 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      Total: {formatRupiah(totalAllocated)} / {formatRupiah(parsedAmount)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Ongkir (Rp)</label>
                    <input
                      type="text"
                      value={allocDelivery}
                      onChange={(e) => setAllocDelivery(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Belanja Barang (Rp)</label>
                    <input
                      type="text"
                      value={allocShopping}
                      onChange={(e) => setAllocShopping(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Biaya Tambahan (Rp)</label>
                    <input
                      type="text"
                      value={allocExtra}
                      onChange={(e) => setAllocExtra(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Kembalian Customer (Rp)</label>
                    <input
                      type="text"
                      value={allocChange}
                      onChange={(e) => setAllocChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 block mb-0.5">Titipan / Saldo Lebih (Rp)</label>
                    <input
                      type="text"
                      value={allocDeposit}
                      onChange={(e) => setAllocDeposit(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 font-bold"
                    />
                  </div>
                </div>

                {!isAllocationValid && (
                  <div className="text-[11px] text-red-500 font-semibold bg-red-50 p-2 rounded-xl border border-red-200">
                    * Total rincian alokasi ({formatRupiah(totalAllocated)}) harus sama persis dengan nominal diterima ({formatRupiah(parsedAmount)}).
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Catatan / No. Referensi
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: QRIS BCA ref #89217319 / Pembayaran bertahap ongkir"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              {/* WhatsApp Generator Bar for Customer */}
              {currentOrder && (
                <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-amber-950 text-xs block">Kirim Rincian Tagihan ke Customer</span>
                    <span className="text-[10px] text-amber-800">Format bersih tanpa detail bagi hasil internal</span>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => openCustomerWhatsAppModal(currentOrder)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Generate Rincian Customer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => copyCustomerWhatsAppDirect(currentOrder, 'modal-cust-copy')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[11px] cursor-pointer"
                    >
                      {copiedAction === 'modal-cust-copy' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Tersalin!</span>
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
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="h-9 px-4 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!isAllocationValid}
                  className="h-9 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold shadow-xs cursor-pointer"
                >
                  Simpan Penerimaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WHATSAPP MESSAGE MODAL */}
      <WhatsAppMessageModal
        isOpen={whatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
        title={whatsAppTitle}
        recipientPhone={whatsAppPhone}
        messageText={whatsAppMessage}
      />
    </div>
  );
};
