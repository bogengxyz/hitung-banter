import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  Plus,
  Eye,
  Ban,
  DollarSign,
  UserCheck,
  Calendar,
  X,
  CheckCircle,
  Clock,
  ArrowRight,
  Receipt,
  Package,
  AlertTriangle,
  Users,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  Store,
  ShoppingBag,
  CloudRain,
  Moon,
  Edit2,
  Edit3,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import {
  Order,
  Driver,
  ExpenseItem,
  CustomerReceipt,
  CombinedOrderGroup,
  CombinedOrderStatus,
  CombinedAdminPricingMethod,
  TariffConfig,
  ItemPurchaseStatus,
} from '../../types';
import { formatRupiah, DEFAULT_TARIFF_CONFIG } from '../../lib/pricing/engine';
import { banterStore } from '../../lib/storage/store';
import {
  generateCustomerWhatsAppMessage,
  generateDriverWhatsAppMessage,
} from '../../lib/reconciliation/reconciliationEngine';
import { WhatsAppMessageModal } from '../../components/WhatsAppMessageModal';
import { EditOrderModal } from './EditOrderModal';
import { CombinedOrderMessageModal } from './CombinedOrderMessageModal';
import { CombinedOrderAuditCard } from './CombinedOrderAuditCard';
import { CombinedOrderTimeline } from './CombinedOrderTimeline';
import {
  isGroupPricePending,
  isCustomerPricePending,
  generateTahap1DriverAnnouncement,
  generateTahap2DriverTakingOrder,
  generateTahap3AdminProcessing,
  generateTahap4DriverAssignment,
  generateTahap5OrderCompleted,
  generateDriverShoppingListWhatsApp,
} from '../../lib/whatsapp/combinedOrderTemplates';

interface OrdersViewProps {
  orders: Order[];
  combinedOrders?: CombinedOrderGroup[];
  drivers: Driver[];
  expenses: ExpenseItem[];
  receipts: CustomerReceipt[];
  tariffConfig?: TariffConfig;
  onOpenNewOrderModal: () => void;
  onOpenCombinedOrderModal?: () => void;
  onCancelOrder: (orderId: string, reason: string) => void;
  onCancelCombinedOrder?: (groupId: string, reason: string) => void;
  onUpdateCombinedOrderStatus?: (groupId: string, status: CombinedOrderStatus) => void;
  onUpdateCombinedActualPrice?: (
    groupId: string,
    customerId: string,
    locationId: string,
    itemId: string,
    actualPrice: number
  ) => void;
  onRecordPaymentForOrder: (order: Order) => void;
  onRecordReceiptForOrder: (order: Order) => void;
  onUpdateOrder?: (orderId: string, data: any, reason?: string) => void;
  onSaveShoppingRealization?: (orderId: string, items: any[], reason?: string) => void;
  selectedOrderFromNav?: Order | null;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  combinedOrders = [],
  drivers,
  expenses,
  receipts,
  tariffConfig = DEFAULT_TARIFF_CONFIG,
  onOpenNewOrderModal,
  onOpenCombinedOrderModal,
  onCancelOrder,
  onCancelCombinedOrder,
  onUpdateCombinedOrderStatus,
  onUpdateCombinedActualPrice,
  onRecordPaymentForOrder,
  onRecordReceiptForOrder,
  onUpdateOrder,
  onSaveShoppingRealization,
  selectedOrderFromNav,
}) => {
  // Service / Tab Switcher: 'regular' vs 'combined'
  const [serviceView, setServiceView] = useState<'regular' | 'combined'>('regular');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Realisasi Belanja inline state for selectedOrder
  const [realizationItems, setRealizationItems] = useState<{
    id?: string;
    name: string;
    qty: number;
    unit_price: number;
    funding_source: 'driver' | 'admin';
    item_status?: ItemPurchaseStatus;
    notes?: string;
  }[]>([]);
  const [newRealizationName, setNewRealizationName] = useState('');
  const [newRealizationQty, setNewRealizationQty] = useState('1');
  const [newRealizationPrice, setNewRealizationPrice] = useState('');
  const [newRealizationFunding, setNewRealizationFunding] = useState<'driver' | 'admin'>('driver');
  const [newRealizationStatus, setNewRealizationStatus] = useState<ItemPurchaseStatus>('bought');
  const [realizationSaveMessage, setRealizationSaveMessage] = useState<string | null>(null);

  // Filter state for regular orders
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(selectedOrderFromNav || null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Combined orders state
  const [combinedStatusFilter, setCombinedStatusFilter] = useState<string>('all');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [cancellingGroupId, setCancellingGroupId] = useState<string | null>(null);
  const [cancelGroupReason, setCancelGroupReason] = useState<string>('');

  // Actual price edit modal
  const [editingItem, setEditingItem] = useState<{
    groupId: string;
    customerId: string;
    locationId: string;
    itemId: string;
    itemName: string;
    currentPrice: number;
    qty?: number;
    is_price_unconfirmed?: boolean;
  } | null>(null);
  const [newItemPrice, setNewItemPrice] = useState<number>(0);
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemUnconfirmed, setNewItemUnconfirmed] = useState<boolean>(false);

  // Combined Order WhatsApp Message Modal
  const [messageModalGroup, setMessageModalGroup] = useState<CombinedOrderGroup | null>(null);
  const [messageModalInitialStage, setMessageModalInitialStage] = useState<
    'tahap1' | 'tahap2' | 'tahap3' | 'tahap4' | 'tahap5' | 'shopping' | undefined
  >(undefined);

  // Driver Assignment / Take Modal
  const [assigningDriverGroup, setAssigningDriverGroup] = useState<CombinedOrderGroup | null>(null);
  const [assigningMode, setAssigningMode] = useState<'request' | 'approve' | 'assign' | 'switch'>('assign');
  const [selectedDriverIdForAssign, setSelectedDriverIdForAssign] = useState<string>('');
  const [assignNotes, setAssignNotes] = useState<string>('');

  // WhatsApp Message Modal state
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppTitle, setWhatsAppTitle] = useState('');
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [whatsAppPhone, setWhatsAppPhone] = useState<string | undefined>(undefined);
  const [whatsAppType, setWhatsAppType] = useState<'customer' | 'driver'>('customer');

  const handleOpenCustomerWhatsApp = (order: Order) => {
    const msg = generateCustomerWhatsAppMessage(order);
    setWhatsAppTitle(`Rincian Tagihan Customer - ${order.customer_name} (${order.order_number})`);
    setWhatsAppMessage(msg);
    setWhatsAppPhone(order.customer_phone);
    setWhatsAppType('customer');
    setWhatsAppModalOpen(true);
  };

  const handleCopyCustomerWhatsApp = (order: Order, actionId: string) => {
    const msg = generateCustomerWhatsAppMessage(order);
    handleCopyText(msg, actionId);
  };

  const handleOpenDriverWhatsApp = (order: Order) => {
    const drv = drivers.find((d) => d.id === order.driver_id);
    const msg = generateDriverWhatsAppMessage({
      driver: drv || ({ id: order.driver_id, name: order.driver_name, phone: '', code: 'DRV' } as Driver),
      orders: [order],
      transferAmount: order.driver_balance_remaining,
    });
    setWhatsAppTitle(`Rincian Pembayaran Driver - ${order.driver_name} (${order.order_number})`);
    setWhatsAppMessage(msg);
    setWhatsAppPhone(drv?.phone);
    setWhatsAppType('driver');
    setWhatsAppModalOpen(true);
  };

  const handleCopyDriverWhatsApp = (order: Order, actionId: string) => {
    const drv = drivers.find((d) => d.id === order.driver_id);
    const msg = generateDriverWhatsAppMessage({
      driver: drv || ({ id: order.driver_id, name: order.driver_name, phone: '', code: 'DRV' } as Driver),
      orders: [order],
      transferAmount: order.driver_balance_remaining,
    });
    handleCopyText(msg, actionId);
  };

  // Synchronize when selectedOrderFromNav changes
  React.useEffect(() => {
    if (selectedOrderFromNav) {
      setSelectedOrder(selectedOrderFromNav);
      setServiceView('regular');
    }
  }, [selectedOrderFromNav]);

  // Synchronize realizationItems when selectedOrder changes
  React.useEffect(() => {
    if (selectedOrder) {
      const latest = orders.find((o) => o.id === selectedOrder.id) || selectedOrder;
      if (latest.items && latest.items.length > 0) {
        setRealizationItems(
          latest.items.map((it) => ({
            id: it.id,
            name: it.name,
            qty: it.qty,
            unit_price: it.unit_price,
            funding_source: it.funding_source || 'driver',
            item_status: it.item_status || 'bought',
            notes: it.notes,
          }))
        );
      } else if (latest.total_shopping_cost > 0) {
        setRealizationItems([
          {
            name: 'Belanja Barang / Makanan',
            qty: 1,
            unit_price: latest.total_shopping_cost,
            funding_source: latest.driver_shopping_modal > 0 ? 'driver' : 'admin',
            item_status: 'bought',
          },
        ]);
      } else {
        setRealizationItems([]);
      }
      setRealizationSaveMessage(null);
    }
  }, [selectedOrder, orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.driver_name.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;
      if (selectedDriverId !== 'all' && o.driver_id !== selectedDriverId) return false;

      if (activeFilter === 'draft') return o.status === 'draft';
      if (activeFilter === 'pending') return o.status === 'pending';
      if (activeFilter === 'completed') return o.status === 'completed';
      if (activeFilter === 'cancelled') return o.status === 'cancelled';
      if (activeFilter === 'driver_unpaid') return o.status !== 'cancelled' && o.driver_balance_remaining > 0;
      if (activeFilter === 'driver_paid') return o.status !== 'cancelled' && o.driver_balance_remaining === 0;

      return true;
    });
  }, [orders, searchQuery, selectedDriverId, activeFilter]);

  const filteredCombinedOrders = useMemo(() => {
    return combinedOrders.filter((g) => {
      const matchSearch =
        g.group_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.customers.some((c) => c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;
      if (selectedDriverId !== 'all' && g.driver_id !== selectedDriverId) return false;

      if (combinedStatusFilter === 'waiting_driver') return g.status === 'waiting_driver';
      if (combinedStatusFilter === 'driver_requested') return ['driver_requested', 'waiting_approval'].includes(g.status);
      if (combinedStatusFilter === 'admin_processing') return g.status === 'admin_processing';
      if (combinedStatusFilter === 'driver_assigned') return ['driver_assigned', 'in_progress'].includes(g.status);
      if (combinedStatusFilter === 'shopping') return g.status === 'shopping';
      if (combinedStatusFilter === 'delivering') return g.status === 'delivering';
      if (combinedStatusFilter === 'completed') return g.status === 'completed';
      if (combinedStatusFilter === 'cancelled') return g.status === 'cancelled';

      return true;
    });
  }, [combinedOrders, searchQuery, selectedDriverId, combinedStatusFilter]);

  const handleConfirmCancel = () => {
    if (!cancellingOrderId || !cancelReason.trim()) return;
    onCancelOrder(cancellingOrderId, cancelReason);
    setCancellingOrderId(null);
    setCancelReason('');
    if (selectedOrder?.id === cancellingOrderId) {
      setSelectedOrder(null);
    }
  };

  const handleConfirmCancelGroup = () => {
    if (!cancellingGroupId || !cancelGroupReason.trim()) return;
    if (onCancelCombinedOrder) {
      onCancelCombinedOrder(cancellingGroupId, cancelGroupReason);
    } else {
      banterStore.cancelCombinedOrder(cancellingGroupId, cancelGroupReason);
    }
    setCancellingGroupId(null);
    setCancelGroupReason('');
  };

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

  const handleSaveActualPrice = () => {
    if (!editingItem) return;
    if (onUpdateCombinedActualPrice) {
      onUpdateCombinedActualPrice(
        editingItem.groupId,
        editingItem.customerId,
        editingItem.locationId,
        editingItem.itemId,
        newItemPrice
      );
    }
    banterStore.updateCombinedOrderItem(
      editingItem.groupId,
      editingItem.customerId,
      editingItem.locationId,
      editingItem.itemId,
      {
        unit_price: newItemPrice,
        qty: newItemQty,
        is_price_unconfirmed: newItemUnconfirmed,
      }
    );
    setEditingItem(null);
  };

  const getStatusBadge = (status: CombinedOrderStatus) => {
    switch (status) {
      case 'waiting_driver':
        return <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">Menunggu Driver</span>;
      case 'driver_requested':
      case 'waiting_approval':
        return <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">Driver Mengambil • Menunggu Admin</span>;
      case 'admin_processing':
        return <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">Sedang Diproses Admin</span>;
      case 'driver_assigned':
        return <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">Driver Ditugaskan</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">Berjalan</span>;
      case 'shopping':
        return <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-teal-100 text-teal-900 border border-teal-300">Sedang Belanja</span>;
      case 'delivering':
        return <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">Mengantar</span>;
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">Selesai</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-red-100 text-red-900 border border-red-300">Dibatalkan</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-[6px] bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Pesanan</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pantau seluruh alur keuangan pesanan reguler dan Order Gabungan dari belanja hingga hak driver.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onOpenCombinedOrderModal && (
            <button
              onClick={onOpenCombinedOrderModal}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-[6px] bg-emerald-600 text-white font-bold text-xs sm:text-sm hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Order Gabungan</span>
            </button>
          )}

          <button
            onClick={onOpenNewOrderModal}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-[6px] bg-blue-600 text-white font-bold text-xs sm:text-sm hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Pesanan Reguler</span>
          </button>
        </div>
      </div>

      {/* Service Type Switcher (Reguler vs Order Gabungan) */}
      <div className="flex items-center p-1 bg-slate-200/70 rounded-[6px] w-full sm:w-fit">
        <button
          onClick={() => setServiceView('regular')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-[6px] text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            serviceView === 'regular'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Pesanan Reguler</span>
          <span className="px-2 py-0.5 rounded-[4px] bg-slate-100 text-slate-700 text-[11px] font-bold">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setServiceView('combined')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-[6px] text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            serviceView === 'combined'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Order Gabungan</span>
          <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-bold ${
            serviceView === 'combined' ? 'bg-emerald-700 text-white' : 'bg-slate-300 text-slate-700'
          }`}>
            {combinedOrders.length}
          </span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-[6px] p-4 sm:p-5 shadow-xs border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor order/grup, nama customer, atau driver..."
              className="w-full pl-10 pr-4 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="w-full sm:w-60">
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Semua Driver</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Chips */}
        {serviceView === 'regular' ? (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
            {[
              { id: 'all', label: 'Semua Pesanan' },
              { id: 'pending', label: 'Menunggu Pembayaran' },
              { id: 'completed', label: 'Selesai' },
              { id: 'driver_unpaid', label: 'Belum Lunas ke Driver' },
              { id: 'driver_paid', label: 'Sudah Lunas ke Driver' },
              { id: 'cancelled', label: 'Dibatalkan' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
            {[
              { id: 'all', label: 'Semua Order Gabungan' },
              { id: 'waiting_driver', label: 'Menunggu Driver' },
              { id: 'driver_requested', label: 'Driver Mengambil' },
              { id: 'admin_processing', label: 'Diproses Admin' },
              { id: 'driver_assigned', label: 'Driver Ditugaskan' },
              { id: 'shopping', label: 'Belanja' },
              { id: 'delivering', label: 'Mengantar' },
              { id: 'completed', label: 'Selesai' },
              { id: 'cancelled', label: 'Dibatalkan' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCombinedStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
                  combinedStatusFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* REGULAR ORDERS LIST */}
      {serviceView === 'regular' && (
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-[6px] p-12 text-center border border-slate-100">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">Tidak ada pesanan reguler ditemukan</h3>
              <p className="text-xs text-slate-400 mt-1">
                Sesuaikan kata kunci pencarian atau ubah filter status di atas.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isDriverPaid = order.driver_balance_remaining === 0;
              const isCancelled = order.status === 'cancelled';
              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-[6px] p-4 sm:p-5 shadow-xs border transition-all ${
                    isCancelled
                      ? 'border-red-200 bg-red-50/20 opacity-75'
                      : 'border-slate-200/80 hover:border-blue-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[6px] bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0 tabular-nums">
                        {order.distance_rounded_km}k
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">{order.order_number}</span>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-[4px] bg-slate-100 text-slate-700">
                            {order.driver_name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Customer: <span className="font-semibold text-slate-700">{order.customer_name}</span> •{' '}
                          {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </div>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isCancelled ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-[4px] bg-red-100 text-red-800 border border-red-200">
                          Dibatalkan
                        </span>
                      ) : (
                        <>
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-[4px] ${
                              order.customer_payment_status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            Customer: {order.customer_payment_status === 'paid' ? 'Lunas' : 'Menunggu Bayar'}
                          </span>
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-[4px] ${
                              isDriverPaid
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            Driver: {isDriverPaid ? 'Lunas' : `Sisa ${formatRupiah(order.driver_balance_remaining)}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Financial breakdown row */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 py-3 text-xs bg-slate-50/70 p-3 rounded-[6px] my-2 border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Ongkir:</span>
                      <span className="font-bold text-slate-800 tabular-nums">{formatRupiah(order.delivery_fee)}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[10px]">Total Belanja:</span>
                      {order.shopping_price_status === 'pending_driver' ? (
                        <span className="font-bold text-amber-700 text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Menunggu harga aktual dari Driver</span>
                        </span>
                      ) : (
                        <span className="font-bold text-slate-800 tabular-nums">
                          {formatRupiah(order.total_shopping_cost)}
                          {order.driver_shopping_modal > 0 && (
                            <span className="text-[10px] text-blue-600 block">(Modal Driver: {formatRupiah(order.driver_shopping_modal)})</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Total Tagihan:</span>
                      <span className="font-black text-slate-900 tabular-nums">
                        {formatRupiah(order.customer_total_bill)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Sudah Dibayar:</span>
                      <span className="font-bold text-emerald-700 tabular-nums">
                        {formatRupiah(order.customer_paid_amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Sisa Tagihan:</span>
                      <span
                        className={`font-black tabular-nums ${
                          (order.customer_balance_remaining ?? Math.max(0, order.customer_total_bill - order.customer_paid_amount)) === 0
                            ? 'text-emerald-700'
                            : 'text-amber-800'
                        }`}
                      >
                        {formatRupiah(order.customer_balance_remaining ?? Math.max(0, order.customer_total_bill - order.customer_paid_amount))}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail Lengkap</span>
                      </button>

                      {!isCancelled && (
                        <button
                          onClick={() => setEditingOrder(order)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-[6px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition-colors cursor-pointer border border-blue-200"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Pesanan</span>
                        </button>
                      )}

                      {!isCancelled && (
                        <button
                          onClick={() => {
                            setCancellingOrderId(order.id);
                            setCancelReason('');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-red-600 hover:bg-red-50 font-semibold transition-colors cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Batalkan</span>
                        </button>
                      )}

                      {!isCancelled && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenCustomerWhatsApp(order)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold transition-colors cursor-pointer text-xs"
                            title="Generate Rincian Tagihan Customer"
                          >
                            <MessageSquare className="w-3 h-3 text-amber-600" />
                            <span>WA Customer</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDriverWhatsApp(order)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold transition-colors cursor-pointer text-xs"
                            title="Generate Rincian Pembayaran Driver"
                          >
                            <MessageSquare className="w-3 h-3 text-teal-600" />
                            <span>WA Driver</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {!isCancelled && (
                      <div className="flex items-center gap-2">
                        {order.customer_payment_status !== 'paid' && (
                          <button
                            onClick={() => onRecordReceiptForOrder(order)}
                            className="px-3 py-1.5 rounded-[6px] bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors shadow-xs cursor-pointer"
                          >
                            Catat Bayar Customer
                          </button>
                        )}

                        {!isDriverPaid && (
                          <button
                            onClick={() => onRecordPaymentForOrder(order)}
                            className="px-3 py-1.5 rounded-[6px] bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-xs cursor-pointer"
                          >
                            Bayar Driver ({formatRupiah(order.driver_balance_remaining)})
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* COMBINED ORDERS LIST */}
      {serviceView === 'combined' && (
        <div className="space-y-4">
          {filteredCombinedOrders.length === 0 ? (
            <div className="bg-white rounded-[6px] p-12 text-center border border-slate-100 space-y-3">
              <Users className="w-12 h-12 text-emerald-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">Belum ada Order Gabungan</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Order Gabungan menggabungkan 2 hingga 3 pelanggan dengan rute searah ke 1 driver.
              </p>
              {onOpenCombinedOrderModal && (
                <button
                  onClick={onOpenCombinedOrderModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Order Gabungan Sekarang</span>
                </button>
              )}
            </div>
          ) : (
            filteredCombinedOrders.map((group) => {
              const isExpanded = expandedGroupId === group.id;
              const isCancelled = group.status === 'cancelled';
              const isCompleted = group.status === 'completed';
              const hasUnconfirmed = group.has_unconfirmed_prices || isGroupPricePending(group);

              // Helper for current stage WhatsApp text
              const getCurrentStageText = () => {
                switch (group.status) {
                  case 'waiting_driver':
                    return generateTahap1DriverAnnouncement(group);
                  case 'driver_requested':
                  case 'waiting_approval':
                    return generateTahap2DriverTakingOrder(group);
                  case 'admin_processing':
                    return generateTahap3AdminProcessing(group);
                  case 'driver_assigned':
                  case 'in_progress':
                  case 'shopping':
                  case 'delivering':
                    return generateTahap4DriverAssignment(group);
                  case 'completed':
                    return generateTahap5OrderCompleted(group);
                  default:
                    return generateTahap1DriverAnnouncement(group);
                }
              };

              return (
                <div
                  key={group.id}
                  className={`bg-white rounded-[6px] p-4 sm:p-5 shadow-xs border transition-all ${
                    isCancelled
                      ? 'border-red-200 bg-red-50/15 opacity-80'
                      : 'border-slate-200 hover:border-emerald-300 hover:shadow-md'
                  }`}
                >
                  {/* Group Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[6px] bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                        {group.customer_count}P
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-slate-900">{group.group_number}</span>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-[4px] bg-slate-100 text-slate-700">
                            {group.driver_name || 'Belum ada Driver'}
                          </span>
                          {group.candidate_driver_name && group.status === 'driver_requested' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-purple-100 text-purple-800 border border-purple-200">
                              Kandidat: {group.candidate_driver_name}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {group.order_date} • {group.order_time} WIB • {group.customer_count} Pelanggan Searah • Total Rute: {group.total_distance_km || group.customers.reduce((acc, c) => acc + c.distance_km, 0)} KM
                        </div>
                      </div>
                    </div>

                    {/* Status badges & Quick Updater */}
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(group.status)}

                      {hasUnconfirmed && (
                        <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Harga Belum Final</span>
                        </span>
                      )}

                      {!isCancelled && onUpdateCombinedOrderStatus && (
                        <select
                          value={group.status}
                          onChange={(e) => onUpdateCombinedOrderStatus(group.id, e.target.value as CombinedOrderStatus)}
                          className="px-2.5 py-1 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                          <option value="waiting_driver">Menunggu Driver</option>
                          <option value="driver_requested">Driver Mengambil</option>
                          <option value="waiting_approval">Menunggu Persetujuan</option>
                          <option value="admin_processing">Diproses Admin</option>
                          <option value="driver_assigned">Driver Ditugaskan</option>
                          <option value="in_progress">Berjalan</option>
                          <option value="shopping">Sedang Belanja</option>
                          <option value="delivering">Mengantar</option>
                          <option value="completed">Selesai</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {/* OPERATIONAL WORKFLOW ACTION BAR */}
                  {!isCancelled && !isCompleted && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-[6px] border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Aksi Operasional:</span>
                        {group.status === 'waiting_driver' && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningDriverGroup(group);
                                setAssigningMode('request');
                                setSelectedDriverIdForAssign(drivers[0]?.id || '');
                              }}
                              className="px-3 py-1.5 rounded-[6px] bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Driver Bersedia Mengambil</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => banterStore.adminProcessCombinedOrder(group.id, 'Admin BANTER')}
                              className="px-3 py-1.5 rounded-[6px] bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <span>Mulai Proses Admin</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {(group.status === 'driver_requested' || group.status === 'waiting_approval') && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const drvId = group.candidate_driver_id || (group.driver_id !== 'UNASSIGNED' ? group.driver_id : drivers[0]?.id || 'DRV-001');
                                const drvName = group.candidate_driver_name || (group.driver_name !== 'Menunggu Driver' ? group.driver_name : drivers[0]?.name || 'Driver BANTER');
                                banterStore.assignDriverToCombinedOrder(group.id, drvId, drvName, 'Admin BANTER');
                              }}
                              className="px-3 py-1.5 rounded-[6px] bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Setujui Driver ({group.candidate_driver_name || group.driver_name})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningDriverGroup(group);
                                setAssigningMode('switch');
                                setSelectedDriverIdForAssign(drivers[0]?.id || '');
                              }}
                              className="px-3 py-1.5 rounded-[6px] bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 transition cursor-pointer"
                            >
                              Pilih Driver Lain
                            </button>
                          </div>
                        )}

                        {group.status === 'admin_processing' && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningDriverGroup(group);
                                setAssigningMode('assign');
                                setSelectedDriverIdForAssign(drivers[0]?.id || '');
                              }}
                              className="px-3 py-1.5 rounded-[6px] bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Tetapkan Driver Resmi</span>
                            </button>
                          </div>
                        )}

                        {(group.status === 'driver_assigned' || group.status === 'in_progress') && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => banterStore.updateCombinedOrderStatus(group.id, 'shopping', group.driver_name || 'Driver BANTER')}
                              className="px-3 py-1.5 rounded-[6px] bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Mulai Belanja</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningDriverGroup(group);
                                setAssigningMode('switch');
                                setSelectedDriverIdForAssign(group.driver_id || drivers[0]?.id || '');
                              }}
                              className="px-2.5 py-1.5 rounded-[6px] bg-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-300 transition cursor-pointer"
                            >
                              Ganti Driver
                            </button>
                          </div>
                        )}

                        {group.status === 'shopping' && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => banterStore.updateCombinedOrderStatus(group.id, 'delivering', group.driver_name || 'Driver BANTER')}
                              className="px-3 py-1.5 rounded-[6px] bg-cyan-600 text-white font-bold text-xs hover:bg-cyan-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Selesai Belanja &amp; Mulai Antar</span>
                            </button>
                          </div>
                        )}

                        {group.status === 'delivering' && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => banterStore.updateCombinedOrderStatus(group.id, 'completed', 'Admin BANTER')}
                              className="px-3 py-1.5 rounded-[6px] bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Selesaikan Pesanan Gabungan</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 italic">
                        *Klik tombol operasional untuk memajukan status secara otomatis.
                      </div>
                    </div>
                  )}

                  {/* Pricing and Revenue Split Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-3 text-xs bg-slate-50/70 p-3 rounded-[6px] mt-3 border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Total Ongkir Customer:</span>
                      <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(group.total_delivery_fee)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        Bagian Admin ({group.admin_calculation_method === 'consolidated_route' ? 'Rute Gabungan' : group.admin_calculation_method === 'flat_count' ? 'Flat Rp1.000/P' : 'Akumulatif Pelanggan'}):
                      </span>
                      <span className="font-bold text-amber-700 tabular-nums">{formatRupiah(group.admin_share)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Bagian BANTER (10%):</span>
                      <span className="font-bold text-indigo-700 tabular-nums">{formatRupiah(group.banter_share)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Total Belanja:</span>
                      <span className="font-bold text-slate-800 tabular-nums">
                        {hasUnconfirmed ? 'Menunggu harga final' : formatRupiah(group.total_shopping_cost)}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-1 bg-emerald-50 p-2 rounded-[6px] border border-emerald-100">
                      <span className="text-emerald-700 block text-[10px] font-bold">Total Hak Bersih Driver:</span>
                      <span className="font-black text-sm text-emerald-800 tabular-nums">{formatRupiah(group.driver_total_entitlement)}</span>
                    </div>
                  </div>

                  {/* Surcharges pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {group.extra_locations_fee > 0 && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-[4px] bg-amber-50 text-amber-800 border border-amber-200">
                        +{formatRupiah(group.extra_locations_fee)} Tempat Extra ({group.extra_locations_count} lokasi)
                      </span>
                    )}
                    {group.rain_fee > 0 && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-[4px] bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                        <CloudRain className="w-3 h-3 text-blue-600" /> +{formatRupiah(group.rain_fee)} Cuaca Hujan
                      </span>
                    )}
                    {group.night_fee > 0 && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-[4px] bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                        <Moon className="w-3 h-3 text-indigo-600" /> +{formatRupiah(group.night_fee)} Larut Malam
                      </span>
                    )}
                  </div>

                  {/* Expandable Section: Timeline, Audit, and Customer Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-200 space-y-4">
                      {/* 1. Riwayat Proses Order (Timeline with Stage preview & copy) */}
                      <CombinedOrderTimeline
                        group={group}
                        onOpenMessageModal={(stage) => {
                          setMessageModalGroup(group);
                          setMessageModalInitialStage(stage);
                        }}
                        onDirectCopyStage={(stage) => {
                          let text = '';
                          if (stage === 'tahap1') text = generateTahap1DriverAnnouncement(group);
                          else if (stage === 'tahap2') text = generateTahap2DriverTakingOrder(group);
                          else if (stage === 'tahap3') text = generateTahap3AdminProcessing(group);
                          else if (stage === 'tahap4') text = generateTahap4DriverAssignment(group);
                          else if (stage === 'tahap5') text = generateTahap5OrderCompleted(group);
                          handleCopyText(text, stage);
                        }}
                        copiedActionKey={copiedAction}
                      />

                      {/* 2. Audit Card: Transparent calculation breakdown & simulation */}
                      <CombinedOrderAuditCard
                        group={group}
                        onUpdateMethod={(method) => banterStore.updateCombinedOrderPricingMethod(group.id, method)}
                      />

                      {/* 3. Customer & Shopping Details */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-800 text-xs uppercase tracking-wider">
                            Rincian Pengantaran &amp; Belanja Pelanggan:
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {group.customer_count} Pelanggan
                          </span>
                        </div>

                        {group.customers.map((cust, cIdx) => (
                          <div
                            key={cust.id}
                            className="p-3.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs space-y-2.5"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                              <div>
                                <span className="font-extrabold text-slate-900 text-sm">
                                  Pelanggan #{cIdx + 1}: {cust.customer_name}
                                </span>
                                {cust.customer_phone && (
                                  <span className="text-slate-500 ml-2">({cust.customer_phone})</span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-slate-800">
                                  Ongkir: {formatRupiah(cust.delivery_fee)} ({cust.distance_km} KM)
                                </span>
                                <span className="text-slate-500 block text-[11px]">
                                  Subtotal Belanja: {isCustomerPricePending(cust) ? 'Menunggu harga' : formatRupiah(cust.shopping_subtotal)}
                                </span>
                              </div>
                            </div>

                            <div className="text-slate-600">
                              <span className="font-semibold text-slate-700">Tujuan:</span> {cust.delivery_address}
                              {cust.delivery_maps_url && (
                                <a
                                  href={cust.delivery_maps_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 underline ml-2 inline-flex items-center gap-0.5"
                                >
                                  <span>Buka Google Maps</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                            {/* Locations & Items */}
                            <div className="space-y-2 pt-1">
                              {cust.locations.map((loc) => (
                                <div key={loc.id} className="bg-white p-3 rounded-[6px] border border-slate-200 space-y-2">
                                  <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-100 pb-1.5">
                                    <span className="flex items-center gap-1.5">
                                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>{loc.name}</span>
                                    </span>
                                    {loc.address && <span className="text-slate-400 font-normal text-[11px]">{loc.address}</span>}
                                  </div>
                                  <div className="space-y-1.5">
                                    {loc.items.map((it) => (
                                      <div key={it.id} className="flex items-center justify-between text-slate-700 pl-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium">• {it.name} x{it.qty}</span>
                                          {it.is_price_unconfirmed ? (
                                            <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-amber-100 text-amber-800 font-bold border border-amber-200">
                                              Harga Menunggu Konfirmasi
                                            </span>
                                          ) : (
                                            <span className="text-[11px] text-slate-500">
                                              @{formatRupiah(it.unit_price)}
                                            </span>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingItem({
                                                groupId: group.id,
                                                customerId: cust.id,
                                                locationId: loc.id,
                                                itemId: it.id,
                                                itemName: it.name,
                                                currentPrice: it.unit_price,
                                                qty: it.qty,
                                                is_price_unconfirmed: it.is_price_unconfirmed,
                                              });
                                              setNewItemPrice(it.unit_price);
                                              setNewItemQty(it.qty);
                                              setNewItemUnconfirmed(!!it.is_price_unconfirmed);
                                            }}
                                            className="text-[10px] text-blue-600 hover:text-blue-800 underline flex items-center gap-0.5 cursor-pointer font-bold"
                                          >
                                            <Edit2 className="w-2.5 h-2.5" />
                                            <span>Update Harga / Status</span>
                                          </button>
                                        </div>
                                        <span className="font-semibold tabular-nums text-slate-900">
                                          {it.is_price_unconfirmed ? (
                                            <span className="text-amber-700 italic">Menunggu harga</span>
                                          ) : (
                                            formatRupiah(it.total_price)
                                          )}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>{isExpanded ? 'Tutup Rincian & Riwayat' : 'Lihat Rincian, Riwayat & Audit'}</span>
                      </button>

                      {!isCancelled && (
                        <button
                          onClick={() => {
                            setCancellingGroupId(group.id);
                            setCancelGroupReason('');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-red-600 hover:bg-red-50 font-semibold cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Batalkan Grup</span>
                        </button>
                      )}
                    </div>

                    {/* WhatsApp Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMessageModalGroup(group);
                          setMessageModalInitialStage(undefined);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-xs cursor-pointer"
                        title="Buka Generator & Preview WhatsApp 5 Tahapan Lengkap"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Template WhatsApp (5 Tahapan)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const text = getCurrentStageText();
                          handleCopyText(text, `current-stage-${group.id}`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-xs cursor-pointer"
                        title="Salin Pesan WhatsApp untuk Tahap Aktif Sekarang"
                      >
                        {copiedAction === `current-stage-${group.id}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>Pesan Tahap Ini Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Pesan Tahap Ini</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const text = banterStore.generateDriverShoppingList(group);
                          handleCopyText(text, `shopping-${group.id}`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-teal-600 text-white font-bold hover:bg-teal-700 transition-all shadow-xs cursor-pointer"
                        title="Salin Daftar Belanja Lengkap beserta status harga & modal"
                      >
                        {copiedAction === `shopping-${group.id}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>Daftar Belanja Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Salin Daftar Belanja</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Actual Price / Item Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setEditingItem(null)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-[8px] shadow-2xl p-5 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Perbarui Item &amp; Harga Belanja
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Barang: <span className="font-bold text-slate-700">{editingItem.itemName}</span>
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-[6px] border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newItemUnconfirmed}
                  onChange={(e) => {
                    setNewItemUnconfirmed(e.target.checked);
                    if (e.target.checked) setNewItemPrice(0);
                  }}
                  className="w-4 h-4 text-amber-600 rounded-[4px]"
                />
                <span className="text-xs font-bold text-amber-900">
                  Harga Belum Diketahui / Menunggu Konfirmasi
                </span>
              </label>

              {!newItemUnconfirmed && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Harga Satuan (Rupiah):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItemPrice || ''}
                    onChange={(e) => setNewItemPrice(parseInt(e.target.value, 10) || 0)}
                    placeholder="Contoh: 15000"
                    className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800"
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jumlah (Qty):
                </label>
                <input
                  type="number"
                  min="1"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3.5 py-2 rounded-[6px] text-slate-600 font-bold hover:bg-slate-100 text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveActualPrice}
                className="px-4 py-2 rounded-[6px] bg-emerald-600 text-white font-bold hover:bg-emerald-700 text-xs shadow-md cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Assignment Modal */}
      {assigningDriverGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setAssigningDriverGroup(null)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-[8px] shadow-2xl p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {assigningMode === 'request'
                    ? 'Driver Bersedia Mengambil Order'
                    : assigningMode === 'switch'
                    ? 'Ganti Driver Order Gabungan'
                    : 'Tetapkan Driver Order Gabungan'}
                </h3>
                <p className="text-xs text-slate-500">
                  Grup: <span className="font-bold text-slate-700">{assigningDriverGroup.group_number}</span> ({assigningDriverGroup.customer_count} Pelanggan)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningDriverGroup(null)}
                className="p-1 rounded-[4px] text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Pilih Driver:
              </label>
              <select
                value={selectedDriverIdForAssign}
                onChange={(e) => setSelectedDriverIdForAssign(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name} ({d.phone || 'No phone'})
                  </option>
                ))}
              </select>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Admin / Driver (Opsional):
                </label>
                <input
                  type="text"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Contoh: Mengambil via grup WA jam 10:15"
                  className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssigningDriverGroup(null)}
                className="px-4 py-2 rounded-[6px] text-slate-600 font-bold hover:bg-slate-100 text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetDriver = drivers.find((d) => d.id === selectedDriverIdForAssign) || drivers[0];
                  if (!targetDriver) return;

                  if (assigningMode === 'request') {
                    banterStore.driverRequestCombinedOrder(
                      assigningDriverGroup.id,
                      targetDriver.id,
                      targetDriver.name,
                      assignNotes || 'Driver bersedia mengambil pesanan'
                    );
                  } else {
                    banterStore.assignDriverToCombinedOrder(
                      assigningDriverGroup.id,
                      targetDriver.id,
                      targetDriver.name,
                      'Admin BANTER'
                    );
                  }
                  setAssigningDriverGroup(null);
                  setAssignNotes('');
                }}
                className="px-4 py-2 rounded-[6px] bg-emerald-600 text-white font-bold hover:bg-emerald-700 text-xs shadow-md cursor-pointer"
              >
                {assigningMode === 'request' ? 'Simpan Pengajuan Driver' : 'Konfirmasi Tetapkan Driver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Cancellation Modal */}
      {cancellingGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setCancellingGroupId(null)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-[8px] shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-[6px] bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Batalkan Order Gabungan</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan tercatat dalam audit log keuangan.</p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <label className="block text-xs font-bold text-slate-700">
                Alasan Pembatalan (Wajib):
              </label>
              <textarea
                value={cancelGroupReason}
                onChange={(e) => setCancelGroupReason(e.target.value)}
                placeholder="Contoh: Pelanggan membatalkan atau toko tutup..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setCancellingGroupId(null)}
                className="px-4 py-2 rounded-[6px] text-slate-600 font-bold hover:bg-slate-100 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!cancelGroupReason.trim()}
                onClick={handleConfirmCancelGroup}
                className="px-4 py-2 rounded-[6px] bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 text-xs shadow-md"
              >
                Konfirmasi Pembatalan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal for Regular Order */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setCancellingOrderId(null)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-[8px] shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-[6px] bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Batalkan Pesanan</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan tercatat dalam audit log keuangan.</p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <label className="block text-xs font-bold text-slate-700">
                Alasan Pembatalan (Wajib):
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Customer membatalkan sebelum toko buka / toko tutup..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setCancellingOrderId(null)}
                className="px-4 py-2 rounded-[6px] text-slate-600 font-bold hover:bg-slate-100 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim()}
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-[6px] bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 text-xs shadow-md"
              >
                Konfirmasi Pembatalan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal for Regular Order */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setSelectedOrder(null)} />
          <div className="relative z-10 w-full max-w-3xl bg-white rounded-[8px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[6px] bg-white/20 flex items-center justify-center font-black">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-black">{selectedOrder.order_number}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-[4px] bg-white/20 text-white font-bold">
                      {selectedOrder.status.toUpperCase()}
                    </span>
                    {selectedOrder.shopping_price_status === 'pending_driver' ? (
                      <span className="text-xs px-2.5 py-0.5 rounded-[4px] bg-amber-400 text-amber-950 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Menunggu Konfirmasi Belanja</span>
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-0.5 rounded-[4px] bg-emerald-400 text-emerald-950 font-bold">
                        Belanja Terkonfirmasi
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-100 mt-0.5">
                    Dibuat {new Date(selectedOrder.created_at).toLocaleString('id-ID')} oleh {selectedOrder.created_by_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedOrder.status !== 'cancelled' && (
                  <button
                    onClick={() => {
                      const ord = selectedOrder;
                      setEditingOrder(ord);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-white text-blue-900 font-bold text-xs hover:bg-blue-50 transition-colors shadow-xs cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Pesanan</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-[4px] text-white/80 hover:bg-white/20 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Customer & Location Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-[6px] border border-slate-100">
                <div>
                  <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                    Customer &amp; Pengantaran:
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{selectedOrder.customer_name}</span>
                  {selectedOrder.customer_phone && (
                    <div className="text-slate-500 font-medium">{selectedOrder.customer_phone}</div>
                  )}
                  <div className="text-slate-700 mt-1">
                    <strong>Antar ke:</strong> {selectedOrder.delivery_address}
                  </div>
                  {selectedOrder.purchase_location && (
                    <div className="text-blue-700 mt-1 flex items-center gap-1 font-semibold">
                      <Store className="w-3.5 h-3.5" />
                      <span>Tempat Pembelian: {selectedOrder.purchase_location}</span>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                    Driver &amp; Kondisi Perjalanan:
                  </span>
                  <span className="font-bold text-blue-600 text-sm">{selectedOrder.driver_name}</span>
                  <div className="text-slate-600 mt-1">
                    Jarak: {selectedOrder.distance_raw_km} KM (dibulatkan: {selectedOrder.distance_rounded_km} KM)
                  </div>
                  {selectedOrder.notes && (
                    <div className="text-amber-800 bg-amber-50 p-1.5 rounded-[4px] mt-1 font-medium">
                      Catatan: {selectedOrder.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* FOTO STRUK BELANJA DARI DRIVER JIKA ADA */}
              {selectedOrder.receipt_photo_url && (
                <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-[6px] border border-blue-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-[6px] overflow-hidden bg-white border border-blue-200 shrink-0 shadow-xs flex items-center justify-center">
                      <img
                        src={selectedOrder.receipt_photo_url}
                        alt="Struk Belanja Driver"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate">Struk Belanja Driver Terlampir</span>
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        Bukti pembelian fisik/digital yang diunggah Driver untuk audit modal &amp; belanja
                      </p>
                    </div>
                  </div>
                  <a
                    href={selectedOrder.receipt_photo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-[6px] bg-white border border-slate-200 font-bold text-xs text-blue-700 hover:bg-blue-50 flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Struk</span>
                  </a>
                </div>
              )}

              {/* REALISASI BELANJA DRIVER (Section 4) */}
              <div className="border border-slate-200 rounded-[6px] p-4 bg-slate-50/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">Realisasi Belanja Driver</h4>
                      <p className="text-[11px] text-slate-500">
                        Catat dan perbarui harga aktual barang berdasarkan struk dan laporan dari Driver.
                      </p>
                    </div>
                  </div>

                  {realizationSaveMessage && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-[4px] animate-fade-in flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>{realizationSaveMessage}</span>
                    </span>
                  )}
                </div>

                {/* Table of realization items */}
                <div className="bg-white rounded-[6px] border border-slate-200 overflow-hidden">
                  <div className="hidden md:flex items-center gap-2 bg-slate-100/80 p-2.5 font-bold text-slate-700 text-[10px] uppercase tracking-wider">
                    <span className="flex-1 min-w-[150px]">Nama Barang</span>
                    <span className="w-16 text-center">Qty</span>
                    <span className="w-36">Harga Satuan (Rp)</span>
                    <span className="w-32">Status Barang</span>
                    <span className="w-28">Sumber Modal</span>
                    <span className="w-28 text-right">Subtotal</span>
                    <span className="w-8 text-center">Aksi</span>
                  </div>

                  {realizationItems.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      Belum ada rincian barang. Tambahkan barang di formulir bawah ini.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {realizationItems.map((item, idx) => {
                        const isUnavailable = item.item_status === 'unavailable';
                        const subtotal = !isUnavailable ? item.qty * item.unit_price : 0;
                        return (
                          <div key={item.id || idx} className="p-2.5 items-center text-xs">
                            {/* Desktop row */}
                            <div className="hidden md:flex items-center gap-2">
                              <div className="flex-1 min-w-[150px] font-bold text-slate-800">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => {
                                    const updated = [...realizationItems];
                                    updated[idx].name = e.target.value;
                                    setRealizationItems(updated);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-bold"
                                />
                              </div>

                              <div className="w-16 shrink-0 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) => {
                                    const updated = [...realizationItems];
                                    updated[idx].qty = Math.max(1, parseInt(e.target.value, 10) || 1);
                                    setRealizationItems(updated);
                                  }}
                                  className="w-full px-1.5 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs text-center font-bold"
                                />
                              </div>

                              <div className="w-36 shrink-0">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unit_price || ''}
                                  onChange={(e) => {
                                    const updated = [...realizationItems];
                                    updated[idx].unit_price = Math.max(0, parseInt(e.target.value, 10) || 0);
                                    setRealizationItems(updated);
                                  }}
                                  placeholder="0"
                                  className="w-full px-2 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-black"
                                />
                              </div>

                              <div className="w-32 shrink-0">
                                <select
                                  value={item.item_status || 'bought'}
                                  onChange={(e) => {
                                    const updated = [...realizationItems];
                                    updated[idx].item_status = e.target.value as ItemPurchaseStatus;
                                    setRealizationItems(updated);
                                  }}
                                  className="w-full px-2 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 text-[10px] font-bold"
                                >
                                  <option value="bought">Sudah Dibeli</option>
                                  <option value="pending">Belum Dibeli</option>
                                  <option value="unavailable">Tidak Tersedia</option>
                                  <option value="substituted">Diganti</option>
                                </select>
                              </div>

                              <div className="w-28 shrink-0">
                                <select
                                  value={item.funding_source}
                                  onChange={(e) => {
                                    const updated = [...realizationItems];
                                    updated[idx].funding_source = e.target.value as 'driver' | 'admin';
                                    setRealizationItems(updated);
                                  }}
                                  className="w-full px-2 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 text-[10px] font-bold"
                                >
                                  <option value="driver">Driver</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </div>

                              <div className="w-28 shrink-0 text-right font-black text-slate-900 tabular-nums">
                                {isUnavailable ? (
                                  <span className="text-[10px] text-rose-600 line-through">Batal</span>
                                ) : (
                                  formatRupiah(subtotal)
                                )}
                              </div>

                              <div className="w-8 shrink-0 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => setRealizationItems(realizationItems.filter((_, i) => i !== idx))}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded-[6px] cursor-pointer"
                                  title="Hapus barang"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Mobile stacked */}
                            <div className="block md:hidden space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => {
                                    const updated = [...realizationItems];
                                    updated[idx].name = e.target.value;
                                    setRealizationItems(updated);
                                  }}
                                  className="flex-1 px-2.5 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() => setRealizationItems(realizationItems.filter((_, i) => i !== idx))}
                                  className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-3">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.qty}
                                    onChange={(e) => {
                                      const updated = [...realizationItems];
                                      updated[idx].qty = Math.max(1, parseInt(e.target.value, 10) || 1);
                                      setRealizationItems(updated);
                                    }}
                                    className="w-full px-2 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs text-center font-bold"
                                  />
                                </div>
                                <div className="col-span-5">
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.unit_price || ''}
                                    onChange={(e) => {
                                      const updated = [...realizationItems];
                                      updated[idx].unit_price = Math.max(0, parseInt(e.target.value, 10) || 0);
                                      setRealizationItems(updated);
                                    }}
                                    placeholder="0"
                                    className="w-full px-2 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-black"
                                  />
                                </div>
                                <div className="col-span-4 text-right font-black text-slate-900 tabular-nums">
                                  {formatRupiah(subtotal)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Add new realization item inline */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newRealizationName}
                    onChange={(e) => setNewRealizationName(e.target.value)}
                    placeholder="Nama barang aktual..."
                    className="w-full sm:flex-1 px-3 py-1.5 rounded-[6px] bg-white border border-slate-200 text-xs"
                  />
                  <input
                    type="number"
                    min="1"
                    value={newRealizationQty}
                    onChange={(e) => setNewRealizationQty(e.target.value)}
                    placeholder="Qty"
                    className="w-full sm:w-16 px-2 py-1.5 rounded-[6px] bg-white border border-slate-200 text-xs text-center font-bold"
                  />
                  <input
                    type="text"
                    value={newRealizationPrice}
                    onChange={(e) => setNewRealizationPrice(e.target.value)}
                    placeholder="Harga satuan"
                    className="w-full sm:w-32 px-3 py-1.5 rounded-[6px] bg-white border border-slate-200 text-xs font-black"
                  />
                  <select
                    value={newRealizationStatus}
                    onChange={(e) => setNewRealizationStatus(e.target.value as ItemPurchaseStatus)}
                    className="w-full sm:w-28 px-2 py-1.5 rounded-[6px] bg-white border border-slate-200 text-xs font-bold"
                  >
                    <option value="bought">Sudah Dibeli</option>
                    <option value="pending">Belum Dibeli</option>
                    <option value="unavailable">Tidak Tersedia</option>
                    <option value="substituted">Diganti</option>
                  </select>
                  <select
                    value={newRealizationFunding}
                    onChange={(e) => setNewRealizationFunding(e.target.value as 'driver' | 'admin')}
                    className="w-full sm:w-28 px-2 py-1.5 rounded-[6px] bg-white border border-slate-200 text-xs font-semibold"
                  >
                    <option value="driver">Modal Driver</option>
                    <option value="admin">Kas Admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newRealizationName.trim()) return;
                      const qty = Math.max(1, parseInt(newRealizationQty, 10) || 1);
                      const price = parseInt(newRealizationPrice.replace(/[^0-9]/g, ''), 10) || 0;
                      setRealizationItems([
                        ...realizationItems,
                        {
                          id: `item-${Date.now()}`,
                          name: newRealizationName.trim(),
                          qty,
                          unit_price: price,
                          funding_source: newRealizationFunding,
                          item_status: newRealizationStatus,
                        },
                      ]);
                      setNewRealizationName('');
                      setNewRealizationQty('1');
                      setNewRealizationPrice('');
                      setNewRealizationStatus('bought');
                    }}
                    disabled={!newRealizationName.trim()}
                    className="w-full sm:w-auto px-3.5 py-1.5 rounded-[6px] bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>

                {/* Save Realization Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200">
                  <div className="text-xs">
                    <span className="text-slate-500">Total Belanja Aktual: </span>
                    <span className="font-black text-slate-900 text-sm tabular-nums">
                      {formatRupiah(
                        realizationItems
                          .filter((it) => it.item_status !== 'unavailable')
                          .reduce((sum, it) => sum + it.qty * (it.unit_price || 0), 0)
                      )}
                    </span>
                    <span className="text-slate-400 ml-2">
                      (Driver:{' '}
                      {formatRupiah(
                        realizationItems
                          .filter((i) => i.item_status !== 'unavailable' && i.funding_source === 'driver')
                          .reduce((sum, it) => sum + it.qty * it.unit_price, 0)
                      )}
                      , Admin:{' '}
                      {formatRupiah(
                        realizationItems
                          .filter((i) => i.item_status !== 'unavailable' && i.funding_source === 'admin')
                          .reduce((sum, it) => sum + it.qty * it.unit_price, 0)
                      )}
                      )
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onSaveShoppingRealization) {
                        onSaveShoppingRealization(selectedOrder.id, realizationItems);
                      } else {
                        banterStore.saveShoppingRealization(selectedOrder.id, realizationItems);
                      }
                      const refreshed = banterStore.getOrderById(selectedOrder.id);
                      if (refreshed) setSelectedOrder(refreshed);
                      setRealizationSaveMessage('Realisasi Belanja Driver berhasil disimpan!');
                      setTimeout(() => setRealizationSaveMessage(null), 3000);
                    }}
                    className="px-4 py-2 rounded-[6px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Simpan Realisasi Belanja</span>
                  </button>
                </div>
              </div>

              {/* Financial Breakdown & Split */}
              <div className="border border-slate-200/80 rounded-[6px] overflow-hidden text-xs">
                <div className="bg-slate-100/80 p-3 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Rincian Alur Keuangan &amp; Tagihan Customer
                </div>
                <div className="p-4 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Ongkir Standar Customer</span>
                    <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(selectedOrder.delivery_fee)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>• Bagian Admin</span>
                    <span className="font-bold tabular-nums">- {formatRupiah(selectedOrder.admin_share)}</span>
                  </div>
                  <div className="flex justify-between text-indigo-700">
                    <span>• Bagian BANTER (10%)</span>
                    <span className="font-bold tabular-nums">- {formatRupiah(selectedOrder.banter_share)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>• Hak Bersih Ongkir Driver</span>
                    <span className="font-bold tabular-nums">= {formatRupiah(selectedOrder.driver_delivery_share)}</span>
                  </div>

                  {selectedOrder.extra_fees_total > 0 && (
                    <div className="flex justify-between text-teal-700 pt-1 border-t border-slate-100">
                      <span>• Biaya Tambahan (Hujan/Malam/Stop) - 100% Driver</span>
                      <span className="font-bold tabular-nums">+ {formatRupiah(selectedOrder.extra_fees_total)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-600">Total Biaya Belanja</span>
                    {selectedOrder.shopping_price_status === 'pending_driver' ? (
                      <span className="font-bold text-amber-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Menunggu harga aktual dari Driver</span>
                      </span>
                    ) : (
                      <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(selectedOrder.total_shopping_cost)}</span>
                    )}
                  </div>
                  {selectedOrder.total_shopping_cost > 0 && (
                    <>
                      <div className="flex justify-between pl-3 text-blue-600">
                        <span>- Dari Modal Pribadi Driver (Wajib Diganti)</span>
                        <span className="font-bold tabular-nums">{formatRupiah(selectedOrder.driver_shopping_modal)}</span>
                      </div>
                      <div className="flex justify-between pl-3 text-slate-500">
                        <span>- Dari Kas / Saldo Admin</span>
                        <span className="font-bold tabular-nums">{formatRupiah(selectedOrder.admin_shopping_modal)}</span>
                      </div>
                    </>
                  )}

                  <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-center text-sm font-extrabold">
                    <span>Total Tagihan ke Customer</span>
                    <span className="text-slate-900 tabular-nums">{formatRupiah(selectedOrder.customer_total_bill)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm font-black text-emerald-700 bg-emerald-50 p-2.5 rounded-[6px]">
                    <span>Total Hak Pembayaran Driver</span>
                    <span className="tabular-nums">{formatRupiah(selectedOrder.driver_total_entitlement)}</span>
                  </div>
                </div>
              </div>

              {/* Status Pembayaran Customer & Pelunasan Driver */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Customer Payment Status Card */}
                <div className="p-4 rounded-[6px] bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200">
                    <span>Pembayaran Customer</span>
                    <span
                      className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold ${
                        selectedOrder.customer_payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedOrder.customer_payment_status === 'paid' ? 'Lunas' : 'Menunggu Bayar'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Tagihan:</span>
                    <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(selectedOrder.customer_total_bill)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sudah Diterima:</span>
                    <span className="font-bold text-emerald-700 tabular-nums">{formatRupiah(selectedOrder.customer_paid_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm">
                    <span className="font-black text-slate-900">Sisa Tagihan:</span>
                    <span
                      className={`font-black text-base tabular-nums ${
                        (selectedOrder.customer_balance_remaining ?? Math.max(0, selectedOrder.customer_total_bill - selectedOrder.customer_paid_amount)) === 0
                          ? 'text-emerald-600'
                          : 'text-amber-700'
                      }`}
                    >
                      {formatRupiah(selectedOrder.customer_balance_remaining ?? Math.max(0, selectedOrder.customer_total_bill - selectedOrder.customer_paid_amount))}
                    </span>
                  </div>
                </div>

                {/* Driver Payment Status Card */}
                <div className="p-4 rounded-[6px] bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200">
                    <span>Pelunasan Hak Driver</span>
                    <span
                      className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold ${
                        selectedOrder.driver_balance_remaining === 0
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {selectedOrder.driver_balance_remaining === 0 ? 'Lunas' : 'Belum Lunas'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Diterima langsung dari Cash:</span>
                    <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(selectedOrder.driver_received_from_customer)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Ditransfer Admin:</span>
                    <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(selectedOrder.driver_transferred_by_admin)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm">
                    <span className="font-black text-red-600">Sisa Hak Driver:</span>
                    <span className="font-black text-red-600 text-base tabular-nums">
                      {formatRupiah(selectedOrder.driver_balance_remaining)}
                    </span>
                  </div>
                </div>
              </div>

              {/* GENERATE PESAN WHATSAPP SECTION (CUSTOMER & DRIVER) */}
              <div className="p-4 rounded-[6px] bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-[6px] bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Generate Pesan WhatsApp Resmi BANTER
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Format pesan siap kirim sesuai aturan akuntansi dan privasi BANTER
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Customer WhatsApp Panel */}
                  <div className="p-3 rounded-[6px] bg-white border border-amber-200 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-amber-950">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>Rincian Tagihan Customer</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Bersih tanpa margin internal, 10% BANTER, atau utang driver.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenCustomerWhatsApp(selectedOrder)}
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-xs cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Generate Rincian Customer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyCustomerWhatsApp(selectedOrder, `detail-cust-copy-${selectedOrder.id}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[11px] cursor-pointer"
                      >
                        {copiedAction === `detail-cust-copy-${selectedOrder.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin Pesan Customer</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Driver WhatsApp Panel */}
                  <div className="p-3 rounded-[6px] bg-white border border-teal-200 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-teal-950">
                        <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                        <span>Rincian Pembayaran Driver</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Transparan: ongkir, 10% BANTER, biaya ekstra &amp; penggantian belanja.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenDriverWhatsApp(selectedOrder)}
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-xs cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Generate Rincian Driver</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyDriverWhatsApp(selectedOrder, `detail-drv-copy-${selectedOrder.id}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 font-bold text-[11px] cursor-pointer"
                      >
                        {copiedAction === `detail-drv-copy-${selectedOrder.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin Pesan Driver</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200 cursor-pointer text-xs"
                >
                  Tutup
                </button>

                {selectedOrder.status !== 'cancelled' && (
                  <button
                    onClick={() => {
                      const ord = selectedOrder;
                      setEditingOrder(ord);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Pesanan</span>
                  </button>
                )}

                {selectedOrder.status !== 'cancelled' && (
                  <button
                    onClick={() => {
                      setCancellingOrderId(selectedOrder.id);
                      setCancelReason('');
                    }}
                    className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 font-bold text-xs cursor-pointer"
                  >
                    Batalkan
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedOrder.status !== 'cancelled' && selectedOrder.customer_payment_status !== 'paid' && (
                  <button
                    onClick={() => {
                      const ord = selectedOrder;
                      setSelectedOrder(null);
                      onRecordReceiptForOrder(ord);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md cursor-pointer"
                  >
                    Catat Bayar Customer
                  </button>
                )}

                {selectedOrder.status !== 'cancelled' && selectedOrder.driver_balance_remaining > 0 && (
                  <button
                    onClick={() => {
                      const ord = selectedOrder;
                      setSelectedOrder(null);
                      onRecordPaymentForOrder(ord);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer text-xs shadow-md"
                  >
                    Bayar Hak Driver ({formatRupiah(selectedOrder.driver_balance_remaining)}) &rarr;
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          isOpen={!!editingOrder}
          onClose={() => setEditingOrder(null)}
          order={editingOrder}
          drivers={drivers}
          tariffConfig={tariffConfig}
          onSave={(orderId, data, reason) => {
            if (onUpdateOrder) {
              onUpdateOrder(orderId, data, reason);
            } else {
              banterStore.updateOrder(orderId, data, reason);
            }
            if (selectedOrder?.id === orderId) {
              const updated = banterStore.getOrderById(orderId);
              if (updated) setSelectedOrder(updated);
            }
            setEditingOrder(null);
          }}
        />
      )}

      {/* WHATSAPP MESSAGE MODAL */}
      <WhatsAppMessageModal
        isOpen={whatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
        title={whatsAppTitle}
        recipientPhone={whatsAppPhone}
        messageText={whatsAppMessage}
        type={whatsAppType}
      />

      {/* COMBINED ORDER STAGE WHATSAPP MODAL */}
      {messageModalGroup && (
        <CombinedOrderMessageModal
          isOpen={!!messageModalGroup}
          onClose={() => setMessageModalGroup(null)}
          group={messageModalGroup}
          initialStage={messageModalInitialStage}
        />
      )}
    </div>
  );
};
