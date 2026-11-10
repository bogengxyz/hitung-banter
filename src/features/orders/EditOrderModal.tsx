import React, { useState, useMemo } from 'react';
import {
  X,
  Edit3,
  Plus,
  Trash2,
  Store,
  MapPin,
  Save,
  CheckCircle2,
  Clock,
  Camera,
  Upload,
  Receipt,
  AlertCircle,
  Eye,
  Check,
} from 'lucide-react';
import { Order, OrderItem, Driver, TariffConfig, ItemPurchaseStatus } from '../../types';
import { formatRupiah, calculatePricing } from '../../lib/pricing/engine';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  drivers: Driver[];
  tariffConfig: TariffConfig;
  onSave: (
    orderId: string,
    data: {
      customer_name?: string;
      customer_phone?: string;
      pickup_address?: string;
      delivery_address?: string;
      purchase_location?: string;
      notes?: string;
      driver_id?: string;
      distance_km?: number;
      is_rain?: boolean;
      is_night?: boolean;
      extra_stops_count?: number;
      receipt_photo_url?: string;
      items?: {
        id?: string;
        name: string;
        qty: number;
        unit_price?: number;
        is_price_known?: boolean;
        funding_source?: 'driver' | 'admin';
        item_status?: ItemPurchaseStatus;
        notes?: string;
      }[];
    },
    reason?: string
  ) => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  drivers,
  tariffConfig,
  onSave,
}) => {
  const [customerName, setCustomerName] = useState(order.customer_name);
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone || '');
  const [driverId, setDriverId] = useState(order.driver_id);
  const [pickupAddress, setPickupAddress] = useState(order.pickup_address);
  const [deliveryAddress, setDeliveryAddress] = useState(order.delivery_address);
  const [purchaseLocation, setPurchaseLocation] = useState(order.purchase_location || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [editReason, setEditReason] = useState('Pembaruan data pesanan dan rincian belanja');
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState(order.receipt_photo_url || '');
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  // Parameters
  const [distanceKm, setDistanceKm] = useState(String(order.distance_raw_km));
  const [isRain, setIsRain] = useState(order.is_rain);
  const [isNight, setIsNight] = useState(order.is_night);
  const [extraStops, setExtraStops] = useState(order.extra_stops_count);

  // Items
  const [items, setItems] = useState<
    {
      id?: string;
      name: string;
      qty: number;
      unit_price: number;
      is_price_known: boolean;
      funding_source: 'driver' | 'admin';
      item_status: ItemPurchaseStatus;
      notes?: string;
    }[]
  >(
    order.items && order.items.length > 0
      ? order.items.map((it) => ({
          id: it.id,
          name: it.name,
          qty: it.qty,
          unit_price: it.unit_price,
          is_price_known: it.is_price_known !== false,
          funding_source: it.funding_source || 'driver',
          item_status: it.item_status || 'bought',
          notes: it.notes,
        }))
      : order.total_shopping_cost > 0
      ? [
          {
            name: 'Belanja Barang / Makanan',
            qty: 1,
            unit_price: order.total_shopping_cost,
            is_price_known: true,
            funding_source: order.driver_shopping_modal > 0 ? 'driver' : 'admin',
            item_status: 'bought',
          },
        ]
      : []
  );

  // New item form
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemPriceKnown, setNewItemPriceKnown] = useState(true);
  const [newItemFunding, setNewFunding] = useState<'driver' | 'admin'>('driver');
  const [newItemStatus, setNewItemStatus] = useState<ItemPurchaseStatus>('bought');

  // Recalculate delivery fee if params change
  const numDist = Math.max(0, parseFloat(distanceKm) || 0);
  const pricing = useMemo(() => {
    return calculatePricing({
      distance_km: numDist,
      is_rain: isRain,
      is_night: isNight,
      extra_stops_count: extraStops,
      config: tariffConfig,
    });
  }, [numDist, isRain, isNight, extraStops, tariffConfig]);

  // Calculations for items
  const { totalShopping, driverModal, adminModal, hasPendingPrice } = useMemo(() => {
    let dModal = 0;
    let aModal = 0;
    let pending = false;

    items.forEach((it) => {
      // If item status is 'unavailable', exclude it from shopping calculation
      if (it.item_status === 'unavailable') {
        return;
      }
      if (!it.is_price_known) {
        pending = true;
      } else {
        const sub = it.qty * (it.unit_price || 0);
        if (it.funding_source === 'driver') dModal += sub;
        else aModal += sub;
      }
    });

    return {
      totalShopping: dModal + aModal,
      driverModal: dModal,
      adminModal: aModal,
      hasPendingPrice: pending,
    };
  }, [items]);

  const newCustomerBill = pricing.delivery_fee + pricing.extra_fees_total + totalShopping;
  const newBalanceRemaining = Math.max(0, newCustomerBill - order.customer_paid_amount);

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const qty = Math.max(1, parseInt(newItemQty, 10) || 1);
    const price = newItemPriceKnown ? parseInt(newItemPrice.replace(/[^0-9]/g, ''), 10) || 0 : 0;

    setItems([
      ...items,
      {
        id: `item-new-${Date.now()}`,
        name: newItemName.trim(),
        qty,
        unit_price: price,
        is_price_known: newItemPriceKnown,
        funding_source: newItemFunding,
        item_status: newItemStatus,
      },
    ]);

    setNewItemName('');
    setNewItemQty('1');
    setNewItemPrice('');
    setNewItemPriceKnown(true);
    setNewItemStatus('bought');
  };

  const handleUpdateItem = (
    index: number,
    field: 'name' | 'qty' | 'unit_price' | 'is_price_known' | 'funding_source' | 'item_status',
    value: any
  ) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    if (field === 'is_price_known' && !value) {
      updated[index].unit_price = 0;
    }
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReceiptPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !driverId) return;

    onSave(
      order.id,
      {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || undefined,
        driver_id: driverId,
        pickup_address: pickupAddress.trim(),
        delivery_address: deliveryAddress.trim(),
        purchase_location: purchaseLocation.trim() || undefined,
        notes: notes.trim() || undefined,
        distance_km: numDist,
        is_rain: isRain,
        is_night: isNight,
        extra_stops_count: extraStops,
        receipt_photo_url: receiptPhotoUrl.trim() || undefined,
        items: items.map((it) => ({
          id: it.id,
          name: it.name,
          qty: it.qty,
          unit_price: it.is_price_known ? it.unit_price : 0,
          is_price_known: it.is_price_known,
          funding_source: it.funding_source,
          item_status: it.item_status,
          notes: it.notes,
        })),
      },
      editReason.trim() || 'Pembaruan rincian pesanan dan belanja'
    );

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl bg-white rounded-[8px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[6px] bg-white/20 flex items-center justify-center font-black">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Edit Pesanan</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-[4px] bg-white/20 text-white font-bold">
                  {order.order_number}
                </span>
              </div>
              <p className="text-xs text-blue-100">
                Perbarui data customer, rincian barang, harga aktual, struk belanja, dan tarif pesanan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[4px] text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Customer & Location Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1">
                Nama Customer *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama customer"
                className="w-full px-3.5 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 font-bold text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1">
                No. Telepon / WhatsApp Customer
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="08123456789"
                className="w-full px-3.5 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 font-semibold text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Place of Purchase & Delivery Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-blue-600" />
                <span>Tempat Pembelian / Toko / Mitra</span>
              </label>
              <input
                type="text"
                value={purchaseLocation}
                onChange={(e) => setPurchaseLocation(e.target.value)}
                placeholder="Contoh: Toko Berkah / Resto Mie Gacoan / Indomaret"
                className="w-full px-3.5 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 font-semibold text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Alamat Pengantaran Customer *</span>
              </label>
              <input
                type="text"
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Alamat pengantaran customer"
                className="w-full px-3.5 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 font-semibold text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Driver & Trip Parameters */}
          <div className="p-4 rounded-[6px] bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Driver &amp; Parameter Tarif
              </span>
              <span className="font-bold text-blue-600 bg-blue-100/70 px-2.5 py-0.5 rounded-[4px] text-[11px]">
                Jarak: {pricing.distance_rounded_km} KM (Ongkir: {formatRupiah(pricing.delivery_fee)})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold text-[10px] mb-1">Driver Pelaksana</label>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full px-3 py-2 rounded-[6px] bg-white border border-slate-200 font-bold text-slate-800"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold text-[10px] mb-1">Jarak (KM)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  className="w-full px-3 py-2 rounded-[6px] bg-white border border-slate-200 font-bold text-slate-900"
                />
              </div>

              <div className="flex items-center pt-3 sm:pt-4">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isRain}
                    onChange={(e) => setIsRain(e.target.checked)}
                    className="w-4 h-4 rounded-[4px] text-blue-600"
                  />
                  <span>Hujan (+5k)</span>
                </label>
              </div>

              <div className="flex items-center pt-3 sm:pt-4">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isNight}
                    onChange={(e) => setIsNight(e.target.checked)}
                    className="w-4 h-4 rounded-[4px] text-indigo-600"
                  />
                  <span>Malam (+5k)</span>
                </label>
              </div>
            </div>
          </div>

          {/* ITEM REALIZATION TABLE - PROPORTIONAL & RESPONSIVE */}
          <div className="p-4 sm:p-5 rounded-[6px] bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-900 text-sm">
                    Daftar Barang Belanja (Realisasi Belanja Driver)
                  </span>
                  {hasPendingPrice ? (
                    <span className="px-2.5 py-0.5 rounded-[4px] text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Menunggu konfirmasi harga dari Driver</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-[4px] text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Harga Aktual Lengkap</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Atur nama barang, kuantitas, harga aktual, status ketersediaan barang, dan sumber modal pembelian.
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                  Total Belanja Aktual:
                </span>
                <span className="text-base font-black text-slate-900 tabular-nums">
                  {formatRupiah(totalShopping)}
                </span>
              </div>
            </div>

            {/* Desktop Table Header */}
            <div className="hidden md:flex items-center gap-2.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200/60 rounded-[6px]">
              <span className="flex-1 min-w-[170px]">Nama Barang</span>
              <span className="w-20 text-center">Qty</span>
              <span className="w-40">Harga Satuan (Rp)</span>
              <span className="w-20 text-center">Harga</span>
              <span className="w-32">Status Barang</span>
              <span className="w-36">Sumber Modal</span>
              <span className="w-32 text-right">Subtotal</span>
              <span className="w-8 text-center">Aksi</span>
            </div>

            {/* Items List */}
            {items.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-white rounded-[6px] border border-dashed border-slate-200 text-xs">
                Belum ada rincian barang belanja pada pesanan ini. Tambahkan di formulir bawah.
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map((item, idx) => {
                  const isUnavailable = item.item_status === 'unavailable';
                  const subtotal = item.is_price_known && !isUnavailable ? item.qty * (item.unit_price || 0) : 0;

                  return (
                    <div
                      key={item.id || idx}
                      className={`p-3 rounded-[6px] bg-white border border-slate-200 transition-all ${
                        isUnavailable ? 'opacity-60 bg-slate-50/50' : 'hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {/* Desktop 1-Row Layout */}
                      <div className="hidden md:flex items-center gap-2.5">
                        {/* Nama Barang: flex-1 min-w-[170px] */}
                        <div className="flex-1 min-w-[170px]">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                            placeholder="Nama barang..."
                            className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        {/* Qty: w-20 */}
                        <div className="w-20 shrink-0">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'qty', Math.max(1, parseInt(e.target.value, 10) || 1))
                            }
                            className="w-full px-2 py-2 rounded-[6px] bg-slate-50 border border-slate-200 font-bold text-slate-900 text-center text-xs focus:bg-white focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        {/* Harga Satuan: w-40 (never clipped) */}
                        <div className="w-40 shrink-0">
                          <input
                            type="number"
                            min="0"
                            disabled={!item.is_price_known || isUnavailable}
                            value={item.is_price_known ? item.unit_price || '' : ''}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'unit_price', Math.max(0, parseInt(e.target.value, 10) || 0))
                            }
                            placeholder={item.is_price_known ? '0' : 'Menunggu driver'}
                            className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200 font-black text-slate-900 text-xs disabled:opacity-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        {/* Status Harga Toggle: w-20 */}
                        <div className="w-20 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(idx, 'is_price_known', !item.is_price_known)}
                            className={`w-full py-2 rounded-[6px] text-[10px] font-black border transition-colors cursor-pointer ${
                              item.is_price_known
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                            }`}
                            title="Klik untuk ubah status apakah harga sudah pasti/aktual atau masih pending dari driver"
                          >
                            {item.is_price_known ? 'Aktual' : 'Pending'}
                          </button>
                        </div>

                        {/* Status Barang: w-32 */}
                        <div className="w-32 shrink-0">
                          <select
                            value={item.item_status}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'item_status', e.target.value as ItemPurchaseStatus)
                            }
                            className={`w-full px-2 py-2 rounded-[6px] border text-[11px] font-bold ${
                              item.item_status === 'bought'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : item.item_status === 'pending'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : item.item_status === 'unavailable'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-purple-50 text-purple-800 border-purple-200'
                            }`}
                          >
                            <option value="bought">Sudah Dibeli</option>
                            <option value="pending">Belum Dibeli</option>
                            <option value="unavailable">Tidak Tersedia</option>
                            <option value="substituted">Diganti</option>
                          </select>
                        </div>

                        {/* Sumber Modal: w-36 */}
                        <div className="w-36 shrink-0">
                          <select
                            value={item.funding_source}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'funding_source', e.target.value as 'driver' | 'admin')
                            }
                            className="w-full px-2.5 py-2 rounded-[6px] bg-slate-50 border border-slate-200 font-bold text-[11px] text-slate-700 focus:bg-white focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="driver">Modal Driver</option>
                            <option value="admin">Modal Admin</option>
                          </select>
                        </div>

                        {/* Subtotal: w-32 text-right */}
                        <div className="w-32 shrink-0 text-right pr-1">
                          {isUnavailable ? (
                            <span className="text-[10px] font-bold text-rose-600 block line-through">
                              Tidak Dihitung
                            </span>
                          ) : (
                            <span className="font-extrabold text-slate-900 text-xs tabular-nums block">
                              {item.is_price_known ? formatRupiah(subtotal) : 'Menunggu'}
                            </span>
                          )}
                        </div>

                        {/* Hapus: w-8 h-8 */}
                        <div className="w-8 shrink-0 flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="w-8 h-8 rounded-[6px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="Hapus barang"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Mobile Structured 2-3 Line Grid Layout */}
                      <div className="block md:hidden space-y-2">
                        {/* Line 1: Nama & Delete */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                            placeholder="Nama barang..."
                            className="flex-1 px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="w-8 h-8 rounded-[6px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Line 2: Qty, Unit Price, Price Toggle */}
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-3">
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">Qty</label>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'qty', Math.max(1, parseInt(e.target.value, 10) || 1))
                              }
                              className="w-full px-2 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 font-bold text-center text-xs"
                            />
                          </div>

                          <div className="col-span-6">
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">Harga Satuan (Rp)</label>
                            <input
                              type="number"
                              min="0"
                              disabled={!item.is_price_known || isUnavailable}
                              value={item.is_price_known ? item.unit_price || '' : ''}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'unit_price', Math.max(0, parseInt(e.target.value, 10) || 0))
                              }
                              placeholder={item.is_price_known ? '0' : 'Menunggu'}
                              className="w-full px-2.5 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 font-black text-xs disabled:opacity-50"
                            />
                          </div>

                          <div className="col-span-3">
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">Status</label>
                            <button
                              type="button"
                              onClick={() => handleUpdateItem(idx, 'is_price_known', !item.is_price_known)}
                              className={`w-full py-1.5 rounded-[6px] text-[10px] font-black border transition-colors cursor-pointer ${
                                item.is_price_known
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {item.is_price_known ? 'Aktual' : 'Pending'}
                            </button>
                          </div>
                        </div>

                        {/* Line 3: Status Barang, Modal, Subtotal */}
                        <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-slate-100">
                          <div className="col-span-5">
                            <select
                              value={item.item_status}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'item_status', e.target.value as ItemPurchaseStatus)
                              }
                              className="w-full px-2 py-1.5 rounded-[6px] border border-slate-200 text-[10px] font-bold bg-white"
                            >
                              <option value="bought">Sudah Dibeli</option>
                              <option value="pending">Belum Dibeli</option>
                              <option value="unavailable">Tidak Tersedia</option>
                              <option value="substituted">Diganti</option>
                            </select>
                          </div>

                          <div className="col-span-4">
                            <select
                              value={item.funding_source}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'funding_source', e.target.value as 'driver' | 'admin')
                              }
                              className="w-full px-2 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 font-bold text-[10px] text-slate-700"
                            >
                              <option value="driver">Modal Driver</option>
                              <option value="admin">Modal Admin</option>
                            </select>
                          </div>

                          <div className="col-span-3 text-right">
                            <span className="text-[9px] text-slate-400 block">Subtotal</span>
                            <span className="font-extrabold text-slate-900 text-xs tabular-nums">
                              {isUnavailable
                                ? '-'
                                : item.is_price_known
                                ? formatRupiah(subtotal)
                                : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ADD NEW ITEM FORM - MATCHING PROPORTIONS */}
            <div className="pt-3 border-t border-slate-200">
              <span className="text-[11px] font-extrabold text-slate-800 block mb-2">
                + Tambah Barang Belanja Baru
              </span>

              {/* Desktop Input Row */}
              <div className="hidden md:flex items-center gap-2.5">
                <div className="flex-1 min-w-[170px]">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Nama barang baru..."
                    className="w-full px-3 py-2 rounded-[6px] bg-white border border-slate-200 font-semibold text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="w-20 shrink-0">
                  <input
                    type="number"
                    min="1"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    placeholder="Qty"
                    className="w-full px-2 py-2 rounded-[6px] bg-white border border-slate-200 font-bold text-center text-xs"
                  />
                </div>

                <div className="w-40 shrink-0">
                  <input
                    type="text"
                    disabled={!newItemPriceKnown}
                    value={newItemPriceKnown ? newItemPrice : ''}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder={newItemPriceKnown ? 'Rp 0' : 'Menunggu'}
                    className="w-full px-3 py-2 rounded-[6px] bg-white border border-slate-200 font-black text-xs disabled:opacity-50"
                  />
                </div>

                <div className="w-20 shrink-0">
                  <button
                    type="button"
                    onClick={() => setNewItemPriceKnown(!newItemPriceKnown)}
                    className={`w-full py-2 rounded-[6px] text-[10px] font-black border transition-colors cursor-pointer ${
                      newItemPriceKnown
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {newItemPriceKnown ? 'Ada' : 'Pending'}
                  </button>
                </div>

                <div className="w-32 shrink-0">
                  <select
                    value={newItemStatus}
                    onChange={(e) => setNewItemStatus(e.target.value as ItemPurchaseStatus)}
                    className="w-full px-2 py-2 rounded-[6px] bg-white border border-slate-200 font-bold text-[11px]"
                  >
                    <option value="bought">Sudah Dibeli</option>
                    <option value="pending">Belum Dibeli</option>
                    <option value="unavailable">Tidak Tersedia</option>
                    <option value="substituted">Diganti</option>
                  </select>
                </div>

                <div className="w-36 shrink-0">
                  <select
                    value={newItemFunding}
                    onChange={(e) => setNewFunding(e.target.value as 'driver' | 'admin')}
                    className="w-full px-2.5 py-2 rounded-[6px] bg-white border border-slate-200 font-semibold text-[11px]"
                  >
                    <option value="driver">Modal Driver</option>
                    <option value="admin">Modal Admin</option>
                  </select>
                </div>

                <div className="w-32 shrink-0 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!newItemName.trim()}
                    className="px-4 py-2 rounded-[6px] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>

                <div className="w-8 shrink-0" />
              </div>

              {/* Mobile Input Stack */}
              <div className="block md:hidden space-y-2">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Nama barang baru..."
                  className="w-full px-3 py-2 rounded-[6px] bg-white border border-slate-200 font-semibold text-xs"
                />

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="1"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      placeholder="Qty"
                      className="w-full px-2 py-2 rounded-[6px] bg-white border border-slate-200 font-bold text-center text-xs"
                    />
                  </div>

                  <div className="col-span-6">
                    <input
                      type="text"
                      disabled={!newItemPriceKnown}
                      value={newItemPriceKnown ? newItemPrice : ''}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder={newItemPriceKnown ? 'Rp harga' : 'Menunggu'}
                      className="w-full px-3 py-2 rounded-[6px] bg-white border border-slate-200 font-black text-xs disabled:opacity-50"
                    />
                  </div>

                  <div className="col-span-3">
                    <button
                      type="button"
                      onClick={() => setNewItemPriceKnown(!newItemPriceKnown)}
                      className={`w-full py-2 rounded-[6px] text-[10px] font-black border transition-colors cursor-pointer ${
                        newItemPriceKnown
                          ? 'bg-slate-100 text-slate-700 border-slate-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {newItemPriceKnown ? 'Ada' : 'Pending'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <select
                      value={newItemStatus}
                      onChange={(e) => setNewItemStatus(e.target.value as ItemPurchaseStatus)}
                      className="w-full px-2 py-2 rounded-[6px] bg-white border border-slate-200 text-[10px] font-bold"
                    >
                      <option value="bought">Sudah Dibeli</option>
                      <option value="pending">Belum Dibeli</option>
                      <option value="unavailable">Tidak Tersedia</option>
                      <option value="substituted">Diganti</option>
                    </select>
                  </div>

                  <div className="col-span-4">
                    <select
                      value={newItemFunding}
                      onChange={(e) => setNewFunding(e.target.value as 'driver' | 'admin')}
                      className="w-full px-2 py-2 rounded-[6px] bg-white border border-slate-200 font-semibold text-[10px]"
                    >
                      <option value="driver">Modal Driver</option>
                      <option value="admin">Modal Admin</option>
                    </select>
                  </div>

                  <div className="col-span-3">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!newItemName.trim()}
                      className="w-full py-2 rounded-[6px] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FOTO STRUK BELANJA DARI DRIVER */}
          <div className="p-4 sm:p-5 rounded-[6px] bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-slate-800 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-indigo-600" />
                <span>Foto Struk Belanja / Bukti Pembelian Driver</span>
              </label>
              {receiptPhotoUrl && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-[4px] flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Struk Terlampir</span>
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              Unggah foto struk fisik atau tempel tautan foto/bukti belanja yang dikirimkan Driver.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-7">
                <input
                  type="text"
                  value={receiptPhotoUrl}
                  onChange={(e) => setReceiptPhotoUrl(e.target.value)}
                  placeholder="https://... atau data foto struk belanja"
                  className="w-full px-3.5 py-2.5 rounded-[6px] bg-white border border-slate-200 font-medium text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-5 flex items-center gap-2">
                <label className="flex-1 px-3 py-2.5 rounded-[6px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Unggah Struk</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {receiptPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setShowReceiptPreview(!showReceiptPreview)}
                    className="px-3 py-2.5 rounded-[6px] bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-slate-800 cursor-pointer shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showReceiptPreview ? 'Tutup' : 'Lihat'}</span>
                  </button>
                )}

                {receiptPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptPhotoUrl('');
                      setShowReceiptPreview(false);
                    }}
                    className="p-2.5 rounded-[6px] bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                    title="Hapus struk"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Receipt Preview Thumbnail */}
            {(showReceiptPreview || receiptPhotoUrl) && receiptPhotoUrl && (
              <div className="mt-3 p-3 bg-white rounded-[6px] border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-36 h-36 rounded-[6px] overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                  <img
                    src={receiptPhotoUrl}
                    alt="Foto Struk Belanja"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex-1 space-y-1 text-xs">
                  <span className="font-bold text-slate-800 block">Pratinjau Struk Belanja Driver</span>
                  <p className="text-slate-500 text-[11px]">
                    Struk ini tersimpan di detail pesanan dan dapat dilihat oleh Admin saat audit keuangan atau rekonsiliasi kas belanja.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Notes & Audit Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1">
                Catatan Pesanan
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan pesanan..."
                className="w-full px-3.5 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1">
                Alasan Pengeditan (Audit Log Keuangan) *
              </label>
              <input
                type="text"
                required
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Contoh: Mengisi harga aktual belanja dari driver"
                className="w-full px-3.5 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Real-time Financial Breakdown Summary */}
          <div className="p-4 sm:p-5 rounded-[6px] bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white space-y-2">
            <div className="font-bold text-slate-300 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-800 flex items-center justify-between">
              <span>Ringkasan Perubahan Keuangan</span>
              <span className="text-[10px] text-slate-400">Pembaruan Real-Time</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-400 block text-[10px]">Ongkir Customer:</span>
                <span className="font-bold text-white tabular-nums">{formatRupiah(pricing.delivery_fee)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Total Belanja Aktual:</span>
                <span className="font-bold text-amber-300 tabular-nums">{formatRupiah(totalShopping)}</span>
                {driverModal > 0 && (
                  <span className="text-[10px] text-blue-300 block">(Modal Driver: {formatRupiah(driverModal)})</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Total Tagihan Customer:</span>
                <span className="font-black text-white text-sm tabular-nums">{formatRupiah(newCustomerBill)}</span>
                <span className="text-[10px] text-slate-400 block">
                  Sudah dibayar: {formatRupiah(order.customer_paid_amount)}
                </span>
              </div>
              <div className="bg-white/10 p-2.5 rounded-[6px] border border-white/10">
                <span className="text-emerald-300 block text-[10px] font-bold">Sisa Tagihan Customer:</span>
                <span className="font-black text-base text-emerald-400 tabular-nums">
                  {formatRupiah(newBalanceRemaining)}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-[6px] text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-[6px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Pesanan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
