import React, { useState, useMemo, useEffect } from 'react';
import {
  HandCoins,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  CreditCard,
  UserCheck,
  ArrowRight,
  Clock,
  AlertCircle,
  FileCheck,
  X,
  MessageSquare,
  Copy,
  Check,
  Scale,
  ShieldCheck,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  Driver,
  Order,
  DriverPayment,
  PaymentMethod,
  DriverObligation,
  DriverManualDeposit,
  CompensationItem,
} from '../../types';
import { formatRupiah } from '../../lib/pricing/engine';
import { banterStore } from '../../lib/storage/store';
import {
  calculateDriverObligationsSummary,
  allocateCompensation,
  generateDriverWhatsAppMessage,
  getCategoryLabel,
} from '../../lib/reconciliation/reconciliationEngine';
import { WhatsAppMessageModal } from '../../components/WhatsAppMessageModal';

interface DriverPaymentsViewProps {
  payments: DriverPayment[];
  drivers: Driver[];
  orders: Order[];
  onRecordDriverPayment: (data: {
    driver_id: string;
    amount: number;
    gross_amount?: number;
    compensation_amount?: number;
    compensation_allocations?: CompensationItem[];
    method: PaymentMethod;
    reference_number?: string;
    notes?: string;
    allocations: { order_id: string; order_number: string; allocated_amount: number }[];
  }) => void;
  preSelectedDriver?: Driver | null;
}

export const DriverPaymentsView: React.FC<DriverPaymentsViewProps> = ({
  payments,
  drivers,
  orders,
  onRecordDriverPayment,
  preSelectedDriver,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(!!preSelectedDriver);
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    preSelectedDriver?.id || drivers[0]?.id || ''
  );

  // Reconciliation tab & live state
  const [obligations, setObligations] = useState<DriverObligation[]>([]);
  const [deposits, setDeposits] = useState<DriverManualDeposit[]>([]);
  const [activeDriverTab, setActiveDriverTab] = useState<string>(
    preSelectedDriver?.id || drivers[0]?.id || ''
  );

  // Modals state
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);

  // Deposit Form
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>('transfer');
  const [depositRef, setDepositRef] = useState('');
  const [depositNotes, setDepositNotes] = useState('');

  // Loan Form
  const [loanAmount, setLoanAmount] = useState('');
  const [loanReason, setLoanReason] = useState('');

  // WhatsApp Modal State
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppTitle, setWhatsAppTitle] = useState('');
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [whatsAppPhone, setWhatsAppPhone] = useState<string | undefined>(undefined);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  // Disburse Form states
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [refNumber, setRefNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [applyCompensation, setApplyCompensation] = useState<boolean>(true);

  // Refresh obligations and deposits on mount and when payments update
  const refreshFinancialData = () => {
    setObligations(banterStore.getDriverObligations());
    setDeposits(banterStore.getDriverDeposits());
  };

  useEffect(() => {
    refreshFinancialData();
  }, [payments, orders]);

  // Update if preSelectedDriver changes
  useEffect(() => {
    if (preSelectedDriver) {
      setSelectedDriverId(preSelectedDriver.id);
      setActiveDriverTab(preSelectedDriver.id);
      handleDriverChange(preSelectedDriver.id);
      setIsDisburseModalOpen(true);
    }
  }, [preSelectedDriver]);

  // Driver objects
  const activeDriver = useMemo(() => {
    return drivers.find((d) => d.id === activeDriverTab) || drivers[0];
  }, [drivers, activeDriverTab]);

  const disburseDriver = useMemo(() => {
    return drivers.find((d) => d.id === selectedDriverId) || drivers[0];
  }, [drivers, selectedDriverId]);

  // Obligations summary for active driver tab
  const activeDriverObligationsSummary = useMemo(() => {
    if (!activeDriver) return null;
    return calculateDriverObligationsSummary(activeDriver.id, obligations);
  }, [activeDriver, obligations]);

  // Obligations summary for disburse modal selected driver
  const disburseObligationsSummary = useMemo(() => {
    if (!disburseDriver) return null;
    return calculateDriverObligationsSummary(disburseDriver.id, obligations);
  }, [disburseDriver, obligations]);

  // Unpaid orders for disburse driver
  const driverUnpaidOrders = useMemo(() => {
    return orders.filter(
      (o) => o.driver_id === selectedDriverId && o.status !== 'cancelled' && o.driver_balance_remaining > 0
    );
  }, [orders, selectedDriverId]);

  // When driver changes in disburse modal
  const handleDriverChange = (drvId: string) => {
    setSelectedDriverId(drvId);
    const unpaids = orders.filter(
      (o) => o.driver_id === drvId && o.status !== 'cancelled' && o.driver_balance_remaining > 0
    );
    setSelectedOrderIds(unpaids.map((o) => o.id));
  };

  // Gross entitlement for selected orders in disburse modal
  const totalGrossForSelectedOrders = useMemo(() => {
    return driverUnpaidOrders
      .filter((o) => selectedOrderIds.includes(o.id))
      .reduce((sum, o) => sum + o.driver_balance_remaining, 0);
  }, [driverUnpaidOrders, selectedOrderIds]);

  // Calculate live compensation allocation
  const compensationCalculation = useMemo(() => {
    if (!applyCompensation || !disburseDriver || totalGrossForSelectedOrders <= 0) {
      return { totalCompensated: 0, allocations: [], remainingObligations: disburseObligationsSummary?.total_obligations_pending || 0 };
    }
    const maxComp = Math.min(totalGrossForSelectedOrders, disburseObligationsSummary?.total_obligations_pending || 0);
    const result = allocateCompensation(maxComp, obligations, disburseDriver.id);
    const remainingObligations = Math.max(0, (disburseObligationsSummary?.total_obligations_pending || 0) - result.totalCompensated);
    return {
      totalCompensated: result.totalCompensated,
      allocations: result.allocations,
      remainingObligations,
    };
  }, [applyCompensation, disburseDriver, totalGrossForSelectedOrders, obligations, disburseObligationsSummary]);

  // Net amount Admin must transfer
  const netTransferAmount = Math.max(0, totalGrossForSelectedOrders - compensationCalculation.totalCompensated);

  // Copy helper
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

  // Generate WhatsApp message for current disburse configuration
  const handleGenerateDisburseWhatsApp = (mode: 'modal' | 'copy') => {
    if (!disburseDriver) return;
    const selectedOrders = driverUnpaidOrders.filter((o) => selectedOrderIds.includes(o.id));
    if (selectedOrders.length === 0) return;

    const message = generateDriverWhatsAppMessage({
      driver: disburseDriver,
      orders: selectedOrders,
      priorObligations: obligations.filter((o) => o.driver_id === disburseDriver.id && o.status !== 'cancelled'),
      compensationsApplied: compensationCalculation.allocations,
      transferAmount: netTransferAmount,
      method: paymentMethod,
      notes: notes.trim() || undefined,
    });

    if (mode === 'modal') {
      setWhatsAppTitle(`Rincian Pembayaran Driver - ${disburseDriver.name}`);
      setWhatsAppMessage(message);
      setWhatsAppPhone(disburseDriver.phone);
      setWhatsAppModalOpen(true);
    } else {
      handleCopyText(message, 'disburse-copy-btn');
    }
  };

  // Submit Driver Payment
  const handleSubmitDisburse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId || totalGrossForSelectedOrders <= 0) return;

    // Distribute gross payment across selected orders sequentially
    let remainingToDistribute = totalGrossForSelectedOrders;
    const allocations: { order_id: string; order_number: string; allocated_amount: number }[] = [];

    const ordersToPay = driverUnpaidOrders.filter((o) => selectedOrderIds.includes(o.id));
    for (const ord of ordersToPay) {
      if (remainingToDistribute <= 0) break;
      const alloc = Math.min(ord.driver_balance_remaining, remainingToDistribute);
      allocations.push({
        order_id: ord.id,
        order_number: ord.order_number,
        allocated_amount: alloc,
      });
      remainingToDistribute -= alloc;
    }

    if (remainingToDistribute > 0 && ordersToPay.length > 0) {
      allocations[0].allocated_amount += remainingToDistribute;
    }

    onRecordDriverPayment({
      driver_id: selectedDriverId,
      amount: netTransferAmount,
      gross_amount: totalGrossForSelectedOrders,
      compensation_amount: compensationCalculation.totalCompensated,
      compensation_allocations: compensationCalculation.allocations,
      method: paymentMethod,
      reference_number: refNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      allocations,
    });

    refreshFinancialData();
    setIsDisburseModalOpen(false);
  };

  // Submit Manual Deposit
  const handleSaveManualDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(depositAmount.replace(/[^0-9]/g, ''), 10) || 0;
    if (!activeDriver || amt <= 0) return;

    banterStore.recordDriverManualDeposit({
      driver_id: activeDriver.id,
      amount: amt,
      method: depositMethod,
      reference_number: depositRef.trim() || undefined,
      notes: depositNotes.trim() || undefined,
    });

    setDepositAmount('');
    setDepositRef('');
    setDepositNotes('');
    setIsDepositModalOpen(false);
    refreshFinancialData();
  };

  // Submit Driver Loan
  const handleSaveDriverLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(loanAmount.replace(/[^0-9]/g, ''), 10) || 0;
    if (!activeDriver || amt <= 0) return;

    banterStore.addDriverLoan(
      activeDriver.id,
      amt,
      loanReason.trim() || 'Pinjaman modal operasional harian driver'
    );

    setLoanAmount('');
    setLoanReason('');
    setIsLoanModalOpen(false);
    refreshFinancialData();
  };

  // Filtered payments list
  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.payment_number.toLowerCase().includes(q) ||
      p.driver_name.toLowerCase().includes(q) ||
      (p.reference_number && p.reference_number.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs">
              <HandCoins className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Pembayaran &amp; Rekonsiliasi Driver</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Hitung sisa hak driver, kompensasi kewajiban (Modal Admin, 10% BANTER, Kasbon), dan generate pesan WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              handleDriverChange(drivers[0]?.id || '');
              setIsDisburseModalOpen(true);
            }}
            className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-blue-600 text-white font-bold text-xs sm:text-sm hover:bg-blue-700 transition-colors shadow-xs shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cairkan Pembayaran Driver</span>
          </button>
        </div>
      </div>

      {/* REKONSILIASI KEWAJIBAN & SETORAN DRIVER (FEATURE SECTION) */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Rekonsiliasi Kewajiban Driver
              </h2>
              <p className="text-[11px] text-slate-400">
                Pencatatan pengembalian Modal Admin, setoran 10% BANTER, dan kompensasi otomatis.
              </p>
            </div>
          </div>

          {/* Action buttons for manual deposit / loan */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDepositModalOpen(true)}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs transition-colors cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>+ Catat Setoran Manual</span>
            </button>
            <button
              onClick={() => setIsLoanModalOpen(true)}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition-colors cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+ Pinjaman Driver</span>
            </button>
          </div>
        </div>

        {/* Driver selector tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {drivers.map((drv) => {
            const sum = calculateDriverObligationsSummary(drv.id, obligations);
            const isSelected = activeDriverTab === drv.id;
            return (
              <button
                key={drv.id}
                onClick={() => setActiveDriverTab(drv.id)}
                className={`flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{drv.name}</span>
                {sum.total_obligations_pending > 0 ? (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isSelected ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    Wajib: {formatRupiah(sum.total_obligations_pending)}
                  </span>
                ) : (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    Bersih
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Driver Breakdown Grid */}
        {activeDriver && activeDriverObligationsSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            {/* Total Obligations Pending */}
            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-200">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">
                Total Sisa Kewajiban
              </span>
              <span className="text-lg font-black text-red-700 tabular-nums block mt-1">
                {formatRupiah(activeDriverObligationsSummary.total_obligations_pending)}
              </span>
              <span className="text-[10px] text-red-600/80 block mt-0.5">
                Kewajiban aktif yang belum lunas
              </span>
            </div>

            {/* Modal Admin Pending */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Modal Admin
              </span>
              <span className="text-sm font-black text-slate-900 tabular-nums block mt-1">
                {formatRupiah(activeDriverObligationsSummary.modal_admin_pending)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Kewajiban belanja modal admin
              </span>
            </div>

            {/* Setoran BANTER 10% */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Setoran BANTER 10%
              </span>
              <span className="text-sm font-black text-indigo-700 tabular-nums block mt-1">
                {formatRupiah(activeDriverObligationsSummary.banter_share_pending)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Bagi hasil aplikasi 10%
              </span>
            </div>

            {/* Setoran Bagian Admin */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Setoran Bagian Admin
              </span>
              <span className="text-sm font-black text-amber-700 tabular-nums block mt-1">
                {formatRupiah(activeDriverObligationsSummary.admin_share_pending)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Bagi hasil kilometer admin
              </span>
            </div>

            {/* Kasbon / Pinjaman Driver */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Pinjaman / Kasbon
              </span>
              <span className="text-sm font-black text-slate-900 tabular-nums block mt-1">
                {formatRupiah(activeDriverObligationsSummary.driver_loan_pending)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Pinjaman modal operasional
              </span>
            </div>
          </div>
        )}

        {/* Detailed itemized pending obligations list */}
        {activeDriver && (
          <div className="mt-2 text-xs">
            {obligations.filter((o) => o.driver_id === activeDriver.id && o.status !== 'settled').length > 0 ? (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Daftar Rincian Kewajiban Aktif:
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {obligations
                    .filter((o) => o.driver_id === activeDriver.id && o.status !== 'settled')
                    .map((ob) => (
                      <div
                        key={ob.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 font-bold text-[10px] text-slate-700">
                            {getCategoryLabel(ob.category)}
                          </span>
                          <span className="text-slate-700 font-medium">
                            {ob.notes || (ob.order_number ? `Order ${ob.order_number}` : 'Kewajiban')}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-red-600 tabular-nums">
                            Sisa {formatRupiah(ob.remaining_amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            (Total {formatRupiah(ob.amount)})
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-semibold flex items-center gap-2 border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Driver {activeDriver.name} tidak memiliki tunggakan kewajiban saat ini. Seluruh saldo seimbang!</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor bukti pembayaran, nama driver, atau nomor referensi..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Payments History List */}
      <div className="space-y-3">
        {filteredPayments.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
            <HandCoins className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">Belum ada pencairan dana driver</h3>
            <p className="text-xs text-slate-400 mt-1">
              Catat bukti transfer atau pencairan cash kepada driver agar riwayat pembukuan tetap seimbang.
            </p>
          </div>
        ) : (
          filteredPayments.map((pay) => {
            const hasCompensation = (pay.compensation_amount || 0) > 0;
            const gross = pay.gross_amount || pay.amount;
            return (
              <div
                key={pay.id}
                className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 hover:border-cyan-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{pay.payment_number}</span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 uppercase">
                          {pay.method}
                        </span>
                        {hasCompensation && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                            Ada Kompensasi ({formatRupiah(pay.compensation_amount || 0)})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Penerima: <span className="font-bold text-slate-800">{pay.driver_name}</span> • Waktu:{' '}
                        {new Date(pay.payment_date).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1">
                    <div className="text-base font-black text-emerald-700 tabular-nums">
                      {formatRupiah(pay.amount)}
                      {hasCompensation && (
                        <span className="text-xs font-medium text-slate-400 ml-2">
                          (Hak: {formatRupiah(gross)})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">
                        Mencakup {pay.allocations.length} pesanan
                      </span>
                      {/* Button to view WhatsApp message for this historic payment */}
                      <button
                        type="button"
                        onClick={() => {
                          const drv = drivers.find((d) => d.id === pay.driver_id);
                          const relatedOrders = orders.filter((o) =>
                            pay.allocations.some((a) => a.order_id === o.id)
                          );
                          const msg = generateDriverWhatsAppMessage({
                            driver: drv || ({ id: pay.driver_id, name: pay.driver_name, phone: '', code: 'DRV' } as Driver),
                            orders: relatedOrders,
                            compensationsApplied: pay.compensation_allocations || [],
                            transferAmount: pay.amount,
                            method: pay.method,
                            notes: pay.notes,
                          });
                          setWhatsAppTitle(`Rincian Pembayaran - ${pay.driver_name} (${pay.payment_number})`);
                          setWhatsAppMessage(msg);
                          setWhatsAppPhone(drv?.phone);
                          setWhatsAppModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] transition-colors cursor-pointer"
                        title="Generate Rincian Pembayaran Driver WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600" />
                        <span>Rincian WA</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order allocations badges */}
                <div className="pt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 text-[10px]">Alokasi Pesanan:</span>
                  {pay.allocations.map((a, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]"
                    >
                      {a.order_number}: {formatRupiah(a.allocated_amount)}
                    </span>
                  ))}
                </div>

                {pay.notes && (
                  <div className="mt-2 text-xs text-slate-500 font-medium">Catatan: {pay.notes}</div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* DISBURSE PAYMENT MODAL (WITH COMPENSATION & WHATSAPP GENERATION) */}
      {isDisburseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsDisburseModalOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
              <div>
                <h3 className="text-base font-bold">Pencairan Hak Pembayaran Driver</h3>
                <p className="text-xs text-blue-100">
                  Hitung hak driver, potong kompensasi kewajiban, dan generate rincian WhatsApp
                </p>
              </div>
              <button onClick={() => setIsDisburseModalOpen(false)} className="p-1 rounded-full hover:bg-white/20 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDisburse} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Select Driver */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Pilih Driver Penerima Dana *
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => handleDriverChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs cursor-pointer focus:ring-2 focus:ring-blue-500"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Unpaid Orders Checkbox Selection (Batch payout) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                    Pesanan Belum Lunas ({driverUnpaidOrders.length})
                  </span>
                  <span className="font-black text-blue-600 text-xs">
                    Total Hak Kotor: {formatRupiah(totalGrossForSelectedOrders)}
                  </span>
                </div>

                {driverUnpaidOrders.length === 0 ? (
                  <p className="text-slate-400 py-2 text-center">
                    Tidak ada pesanan tertunda untuk driver ini. Semua sudah lunas!
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {driverUnpaidOrders.map((ord) => {
                      const isSelected = selectedOrderIds.includes(ord.id);
                      return (
                        <label
                          key={ord.id}
                          className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 border-blue-400 font-bold text-blue-900'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOrderIds([...selectedOrderIds, ord.id]);
                                } else {
                                  setSelectedOrderIds(selectedOrderIds.filter((id) => id !== ord.id));
                                }
                              }}
                              className="w-4 h-4 rounded text-blue-600"
                            />
                            <div>
                              <div>{ord.order_number}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {ord.customer_name} • Hak Total {formatRupiah(ord.driver_total_entitlement)}
                                {ord.driver_shopping_modal > 0 && (
                                  <span className="text-blue-600 ml-1">
                                    (Ganti modal belanja: {formatRupiah(ord.driver_shopping_modal)})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="font-black text-red-600 tabular-nums">
                            Sisa {formatRupiah(ord.driver_balance_remaining)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* KOMPENSASI KEWAJIBAN CARD */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-indigo-950 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyCompensation}
                      onChange={(e) => setApplyCompensation(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>Terapkan Kompensasi Kewajiban Driver (Potong dari Hak Pembayaran)</span>
                  </label>
                  <span className="font-black text-indigo-700 text-xs tabular-nums">
                    Total Kewajiban: {formatRupiah(disburseObligationsSummary?.total_obligations_pending || 0)}
                  </span>
                </div>

                {applyCompensation && (
                  <div className="space-y-2 pt-1 border-t border-indigo-100 text-[11px]">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-indigo-900">
                      <div className="p-2 rounded-xl bg-white border border-indigo-100">
                        <span className="text-[10px] text-slate-400 block">Modal Admin:</span>
                        <span className="font-bold tabular-nums">
                          {formatRupiah(disburseObligationsSummary?.modal_admin_pending || 0)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-indigo-100">
                        <span className="text-[10px] text-slate-400 block">Setoran BANTER 10%:</span>
                        <span className="font-bold tabular-nums">
                          {formatRupiah(disburseObligationsSummary?.banter_share_pending || 0)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-indigo-100">
                        <span className="text-[10px] text-slate-400 block">Setoran Bagian Admin:</span>
                        <span className="font-bold tabular-nums">
                          {formatRupiah(disburseObligationsSummary?.admin_share_pending || 0)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-indigo-100">
                        <span className="text-[10px] text-slate-400 block">Kasbon Driver:</span>
                        <span className="font-bold tabular-nums">
                          {formatRupiah(disburseObligationsSummary?.driver_loan_pending || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-100/80 font-bold text-indigo-900">
                      <span>Total Kewajiban Dikompensasikan:</span>
                      <span className="font-black text-sm text-red-600 tabular-nums">
                        - {formatRupiah(compensationCalculation.totalCompensated)}
                      </span>
                    </div>

                    {compensationCalculation.remainingObligations > 0 && (
                      <p className="text-[10px] text-slate-500">
                        * Sisa kewajiban setelah pembayaran ini: {formatRupiah(compensationCalculation.remainingObligations)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* RINGKASAN PEMBAYARAN & WHATSAPP BUTTONS */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3 shadow-md">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <span className="text-xs font-bold text-slate-300">Ringkasan Pembayaran:</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {totalGrossForSelectedOrders > 0 ? 'Siap Dicairkan' : 'Pilih Pesanan'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Hak Kotor Driver</span>
                    <span className="font-bold text-slate-100 text-xs tabular-nums">
                      {formatRupiah(totalGrossForSelectedOrders)}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Kompensasi Dipotong</span>
                    <span className="font-bold text-red-400 text-xs tabular-nums">
                      - {formatRupiah(compensationCalculation.totalCompensated)}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40">
                    <span className="text-[10px] text-emerald-400 block font-bold">Transfer Admin (Net)</span>
                    <span className="font-black text-emerald-300 text-sm tabular-nums">
                      {formatRupiah(netTransferAmount)}
                    </span>
                  </div>
                </div>

                {/* WhatsApp Action Buttons */}
                <div className="pt-2 border-t border-slate-700 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400">
                    Kirim rincian transparan ke WhatsApp driver:
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateDisburseWhatsApp('modal')}
                      disabled={totalGrossForSelectedOrders <= 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Generate Rincian Driver</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenerateDisburseWhatsApp('copy')}
                      disabled={totalGrossForSelectedOrders <= 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                    >
                      {copiedAction === 'disburse-copy-btn' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Pesan Driver</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment Method & Reference */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Metode Pencairan *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="transfer">Transfer Bank (BCA / Mandiri / BRI)</option>
                    <option value="cash">Tunai / Cash</option>
                    <option value="qris">E-Wallet / QRIS</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Nomor Referensi Transfer Bank
                  </label>
                  <input
                    type="text"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    placeholder="Contoh: TRX-20261109-981273"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Catatan Pembayaran
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Pelunasan shift siang dengan pemotongan modal admin"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsDisburseModalOpen(false)}
                  className="h-9 px-4 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={totalGrossForSelectedOrders <= 0}
                  className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold shadow-xs cursor-pointer"
                >
                  Konfirmasi Pembayaran ({formatRupiah(netTransferAmount)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATAT SETORAN MANUAL DRIVER */}
      {isDepositModalOpen && activeDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsDepositModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
              <div>
                <h3 className="text-base font-bold">Catat Setoran Manual Driver</h3>
                <p className="text-xs text-teal-100">Setoran tunai / transfer langsung dari driver ke admin</p>
              </div>
              <button onClick={() => setIsDepositModalOpen(false)} className="p-1 rounded-full hover:bg-white/20 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualDeposit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Driver Penyetor
                </label>
                <div className="h-10 px-3 flex items-center rounded-xl bg-slate-100 font-bold text-slate-800">
                  {activeDriver.code} - {activeDriver.name}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Nominal Setoran (Rp) *
                </label>
                <input
                  type="text"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Contoh: 50000"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 tabular-nums"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Metode Setoran
                  </label>
                  <select
                    value={depositMethod}
                    onChange={(e) => setDepositMethod(e.target.value as PaymentMethod)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="transfer">Transfer Bank</option>
                    <option value="cash">Tunai / Cash</option>
                    <option value="qris">QRIS</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    No. Bukti / Referensi
                  </label>
                  <input
                    type="text"
                    value={depositRef}
                    onChange={(e) => setDepositRef(e.target.value)}
                    placeholder="Contoh: BNI-88912"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Catatan Setoran
                </label>
                <input
                  type="text"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder="Contoh: Setoran uang tunai belanja sisa kemarin"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="h-9 px-4 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!depositAmount}
                  className="h-9 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Simpan Setoran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PINJAMAN MODAL DRIVER */}
      {isLoanModalOpen && activeDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsLoanModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-600 to-orange-600 text-white">
              <div>
                <h3 className="text-base font-bold">Catat Pinjaman Modal Driver</h3>
                <p className="text-xs text-amber-100">Pinjaman operasional belanja atau bensin yang dicatat sebagai kewajiban</p>
              </div>
              <button onClick={() => setIsLoanModalOpen(false)} className="p-1 rounded-full hover:bg-white/20 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriverLoan} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Driver Peminjam
                </label>
                <div className="h-10 px-3 flex items-center rounded-xl bg-slate-100 font-bold text-slate-800">
                  {activeDriver.code} - {activeDriver.name}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Nominal Pinjaman (Rp) *
                </label>
                <input
                  type="text"
                  required
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  placeholder="Contoh: 100000"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 tabular-nums"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Keperluan / Alasan Pinjaman *
                </label>
                <input
                  type="text"
                  required
                  value={loanReason}
                  onChange={(e) => setLoanReason(e.target.value)}
                  placeholder="Contoh: Modal awal belanja pagi atau uang kembalian"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="h-9 px-4 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!loanAmount || !loanReason.trim()}
                  className="h-9 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Catat Pinjaman
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
        type="driver"
      />
    </div>
  );
};
