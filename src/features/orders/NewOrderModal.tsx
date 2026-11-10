import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, ShoppingBag, Send, Store, Clock, AlertCircle } from 'lucide-react';
import { Driver, TariffConfig } from '../../types';
import { calculatePricing, formatRupiah } from '../../lib/pricing/engine';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  tariffConfig: TariffConfig;
  initialData?: {
    driver_id?: string;
    distance_km?: number;
    is_rain?: boolean;
    is_night?: boolean;
    extra_stops_count?: number;
    notes?: string;
  };
  onSubmit: (data: {
    customer_name: string;
    customer_phone?: string;
    driver_id: string;
    pickup_address: string;
    delivery_address: string;
    purchase_location?: string;
    notes?: string;
    distance_km: number;
    is_rain?: boolean;
    is_night?: boolean;
    extra_stops_count?: number;
    items?: {
      name: string;
      qty: number;
      unit_price?: number;
      is_price_known?: boolean;
      funding_source?: 'driver' | 'admin';
      notes?: string;
    }[];
    expenses?: { item_name: string; amount: number; funding_source: 'driver' | 'admin'; notes?: string }[];
  }) => void;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  drivers,
  tariffConfig,
  initialData,
  onSubmit,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [driverId, setDriverId] = useState(initialData?.driver_id || drivers[0]?.id || '');
  const [pickupAddress, setPickupAddress] = useState('Mitra BANTER / Resto');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [distanceKm, setDistanceKm] = useState(String(initialData?.distance_km || 3));
  const [isRain, setIsRain] = useState(!!initialData?.is_rain);
  const [isNight, setIsNight] = useState(!!initialData?.is_night);
  const [extraStops, setExtraStops] = useState(initialData?.extra_stops_count || 0);
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Shopping items
  const [items, setItems] = useState<
    {
      name: string;
      qty: number;
      unit_price: number;
      is_price_known: boolean;
      funding_source: 'driver' | 'admin';
      notes?: string;
    }[]
  >([]);

  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemPriceKnown, setNewItemPriceKnown] = useState(true);
  const [newFundingSource, setNewFundingSource] = useState<'driver' | 'admin'>('driver');

  // Calculations
  const numDistance = Math.max(0, parseFloat(distanceKm) || 0);
  const pricing = useMemo(() => {
    return calculatePricing({
      distance_km: numDistance,
      is_rain: isRain,
      is_night: isNight,
      extra_stops_count: extraStops,
      config: tariffConfig,
    });
  }, [numDistance, isRain, isNight, extraStops, tariffConfig]);

  const { totalShopping, driverModal, adminModal, hasPendingPrice } = useMemo(() => {
    let dModal = 0;
    let aModal = 0;
    let pending = false;

    items.forEach((it) => {
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

  // Section 3 rule: Jangan menambahkan nilai belanja yang belum diketahui ke tagihan final Customer.
  const customerTotalBill = pricing.delivery_fee + pricing.extra_fees_total + totalShopping;
  const driverTotalEntitlement = driverModal + pricing.driver_total_delivery_entitlement;

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const qty = Math.max(1, parseInt(newItemQty, 10) || 1);
    const amt = newItemPriceKnown ? parseInt(newItemAmount.replace(/[^0-9]/g, ''), 10) || 0 : 0;

    setItems([
      ...items,
      {
        name: newItemName.trim(),
        qty,
        unit_price: amt,
        is_price_known: newItemPriceKnown,
        funding_source: newFundingSource,
      },
    ]);
    setNewItemName('');
    setNewItemQty('1');
    setNewItemAmount('');
    setNewItemPriceKnown(true);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !driverId) return;

    onSubmit({
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim() || undefined,
      driver_id: driverId,
      pickup_address: pickupAddress.trim() || 'Titik Penjemputan',
      delivery_address: deliveryAddress.trim() || 'Titik Pengantaran',
      purchase_location: purchaseLocation.trim() || undefined,
      notes: notes.trim() || undefined,
      distance_km: numDistance,
      is_rain: isRain,
      is_night: isNight,
      extra_stops_count: extraStops,
      items: items.map((it) => ({
        name: it.name,
        qty: it.qty,
        unit_price: it.is_price_known ? it.unit_price : 0,
        is_price_known: it.is_price_known,
        funding_source: it.funding_source,
        notes: it.notes,
      })),
      // Backward compatibility expenses mapping
      expenses: items
        .filter((it) => it.is_price_known && it.unit_price > 0)
        .map((it) => ({
          item_name: it.name,
          amount: it.qty * it.unit_price,
          funding_source: it.funding_source,
          notes: it.notes,
        })),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-[8px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[6px] bg-white/20 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Formulir Pesanan Baru</h2>
              <p className="text-xs text-blue-100">Catat pesanan, tarif ongkir, dan rincian belanja barang</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-[4px] text-white/80 hover:bg-white/20 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Customer & Driver row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nama Customer *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Ibu Rina"
                className="w-full px-3.5 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                No. Telepon / WhatsApp Customer
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Contoh: 08123456789"
                className="w-full px-3.5 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Places & Driver */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Driver Pelaksana *
              </label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {drivers.map((drv) => (
                  <option key={drv.id} value={drv.id}>
                    {drv.code} - {drv.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-blue-600" />
                <span>Tempat Pembelian / Toko / Mitra (Opsional)</span>
              </label>
              <input
                type="text"
                value={purchaseLocation}
                onChange={(e) => setPurchaseLocation(e.target.value)}
                placeholder="Contoh: Toko Berkah / Warung Makan Bu Siti"
                className="w-full px-3.5 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Alamat Pengantaran / Tujuan Customer *
            </label>
            <input
              type="text"
              required
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Contoh: Jl. Kaliurang KM 5 No. 12"
              className="w-full px-3.5 py-2.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Pricing Parameters */}
          <div className="p-4 rounded-[6px] bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Parameter Tarif &amp; Jarak
              </span>
              <span className="text-xs font-bold text-blue-600 bg-blue-100/70 px-2.5 py-0.5 rounded-[4px]">
                Dibulatkan: {pricing.distance_rounded_km} KM
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Jarak (KM)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  className="w-full px-3 py-2 rounded-[6px] bg-white border border-slate-200 text-sm font-black text-slate-900"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isRain}
                    onChange={(e) => setIsRain(e.target.checked)}
                    className="w-4 h-4 rounded-[4px] text-blue-600 focus:ring-blue-500"
                  />
                  <span>Hujan (+5k)</span>
                </label>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isNight}
                    onChange={(e) => setIsNight(e.target.checked)}
                    className="w-4 h-4 rounded-[4px] text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Malam (+5k)</span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Stop Tambahan (+2k)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={extraStops}
                  onChange={(e) => setExtraStops(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-[6px] bg-white border border-slate-200 text-sm font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Itemized Shopping Expenses (Section 3: Harga Boleh Belum Diketahui) */}
          <div className="p-4 rounded-[6px] bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Daftar Barang Belanja (Opsional di Awal)
                </span>
                <span className="text-[11px] text-slate-500">
                  Harga boleh kosong / belum diketahui sementara jika Driver belum belanja
                </span>
              </div>
              <span className="text-xs font-black text-slate-900 bg-white px-2.5 py-1 rounded-[4px] border border-slate-200 self-start sm:self-auto">
                Total Belanja Terisi: {formatRupiah(totalShopping)}
              </span>
            </div>

            {hasPendingPrice && (
              <div className="p-2.5 rounded-[6px] bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Menunggu konfirmasi harga dari Driver.</strong> Total belanja sementara belum ditambahkan ke tagihan final customer.
                </span>
              </div>
            )}

            {/* List of items */}
            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-[6px] bg-white border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {item.name} x{item.qty}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] ${
                          item.is_price_known
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.is_price_known ? formatRupiah(item.unit_price) : 'Menunggu Driver'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] ${
                          item.funding_source === 'driver'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {item.funding_source === 'driver' ? 'Modal Driver' : 'Modal Admin'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 tabular-nums">
                        {item.is_price_known ? formatRupiah(item.qty * item.unit_price) : 'Rp0 (Pending)'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-[6px] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add item inline form */}
            <div className="pt-2 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 block mb-1.5">+ Tambah Barang Belanja</span>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Nama barang..."
                    className="w-full px-3 py-2 rounded-[6px] bg-white border border-slate-200 text-xs font-medium"
                  />
                </div>

                <div>
                  <input
                    type="number"
                    min="1"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    placeholder="Qty"
                    className="w-full px-3 py-2 rounded-[6px] bg-white border border-slate-200 text-xs font-bold text-center"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    disabled={!newItemPriceKnown}
                    value={newItemPriceKnown ? newItemAmount : ''}
                    onChange={(e) => setNewItemAmount(e.target.value)}
                    placeholder={newItemPriceKnown ? 'Rp harga' : 'Menunggu'}
                    className="w-full px-3 py-2 rounded-[6px] bg-white border border-slate-200 text-xs font-bold disabled:opacity-50"
                  />
                </div>

                <div>
                  <select
                    value={newFundingSource}
                    onChange={(e) => setNewFundingSource(e.target.value as 'driver' | 'admin')}
                    className="w-full px-2.5 py-2 rounded-[6px] bg-white border border-slate-200 text-xs font-semibold"
                  >
                    <option value="driver">Modal Driver</option>
                    <option value="admin">Modal Admin</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewItemPriceKnown(!newItemPriceKnown)}
                    className={`px-2 py-2 rounded-[6px] text-[10px] font-bold border transition-colors cursor-pointer ${
                      newItemPriceKnown
                        ? 'bg-white text-slate-700 border-slate-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                    title="Klik jika harga barang belum diketahui di awal"
                  >
                    {newItemPriceKnown ? 'Ada Harga' : 'Harga Menunggu'}
                  </button>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!newItemName.trim()}
                    className="px-3 py-2 rounded-[6px] bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shrink-0 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Catatan Order (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Titip martabak manis / belanja apotek"
              className="w-full px-3.5 py-2 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
            />
          </div>

          {/* Live Financial Summary */}
          <div className="p-4 rounded-[6px] bg-gradient-to-br from-blue-900 to-indigo-950 text-white space-y-2 text-xs">
            <div className="font-bold text-blue-200 uppercase tracking-wider text-[11px] pb-1 border-b border-blue-800">
              Ringkasan Tagihan &amp; Hak Driver
            </div>
            <div className="flex justify-between">
              <span>Ongkir Standar Customer</span>
              <span className="font-bold tabular-nums">{formatRupiah(pricing.delivery_fee)}</span>
            </div>
            {pricing.extra_fees_total > 0 && (
              <div className="flex justify-between text-teal-300">
                <span>Biaya Tambahan Driver</span>
                <span className="font-bold tabular-nums">+ {formatRupiah(pricing.extra_fees_total)}</span>
              </div>
            )}
            <div className="flex justify-between text-amber-300">
              <span>Biaya Belanja</span>
              <span className="font-bold tabular-nums">
                {hasPendingPrice ? 'Menunggu harga aktual dari Driver' : `+ ${formatRupiah(totalShopping)}`}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-blue-800 text-sm font-extrabold">
              <span>Total Tagihan ke Customer (Sementara):</span>
              <span className="tabular-nums text-white">{formatRupiah(customerTotalBill)}</span>
            </div>
            <div className="flex justify-between pt-1 text-sm font-black text-emerald-400">
              <span>Total Hak Pembayaran Driver:</span>
              <span className="tabular-nums">{formatRupiah(driverTotalEntitlement)}</span>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-[6px] text-slate-600 font-bold hover:bg-slate-100 text-xs cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-[6px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/25 flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Simpan Pesanan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
