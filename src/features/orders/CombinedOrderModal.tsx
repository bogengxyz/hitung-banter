import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  MapPin,
  Plus,
  Trash2,
  Store,
  ShoppingBag,
  CloudRain,
  Moon,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Link as LinkIcon,
  Phone,
  Calculator,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { Driver, TariffConfig, CombinedAdminPricingMethod } from '../../types';
import { calculateCombinedOrderPricing } from '../../lib/pricing/combinedEngine';
import { formatRupiah } from '../../lib/pricing/engine';

interface CombinedOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  tariffConfig: TariffConfig;
  onSubmit: (data: {
    driver_id: string;
    is_rain: boolean;
    is_night: boolean;
    driver_shopping_modal: number;
    admin_shopping_modal: number;
    admin_calculation_method?: CombinedAdminPricingMethod;
    notes?: string;
    customers: {
      customer_name: string;
      customer_phone?: string;
      delivery_address: string;
      delivery_maps_url?: string;
      distance_km: number;
      locations: {
        name: string;
        address: string;
        maps_url?: string;
        items: {
          name: string;
          qty: number;
          unit_price: number;
          notes?: string;
          is_price_unconfirmed?: boolean;
        }[];
      }[];
    }[];
  }) => void;
}

interface ItemFormState {
  name: string;
  qty: number;
  unit_price: number;
  notes?: string;
  is_price_unconfirmed?: boolean;
}

interface LocationFormState {
  name: string;
  address: string;
  maps_url?: string;
  items: ItemFormState[];
}

interface CustomerFormState {
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_maps_url: string;
  distance_km: number;
  locations: LocationFormState[];
}

export const CombinedOrderModal: React.FC<CombinedOrderModalProps> = ({
  isOpen,
  onClose,
  drivers,
  tariffConfig,
  onSubmit,
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    drivers.length > 0 ? drivers[0].id : ''
  );
  const [isRain, setIsRain] = useState<boolean>(false);
  const [isNight, setIsNight] = useState<boolean>(false);
  const [groupNotes, setGroupNotes] = useState<string>('');
  const [modalType, setModalType] = useState<'driver' | 'admin'>('driver');
  const [adminPricingMethod, setAdminPricingMethod] =
    useState<CombinedAdminPricingMethod>('accumulative_per_customer');

  // Multi-customer state: 1 to 3 customers
  const [customers, setCustomers] = useState<CustomerFormState[]>([
    {
      customer_name: 'Pelanggan 1',
      customer_phone: '',
      delivery_address: '',
      delivery_maps_url: '',
      distance_km: 3,
      locations: [
        {
          name: 'Tempat Pembelian 1',
          address: '',
          maps_url: '',
          items: [{ name: '', qty: 1, unit_price: 0, is_price_unconfirmed: true }],
        },
      ],
    },
    {
      customer_name: 'Pelanggan 2',
      customer_phone: '',
      delivery_address: '',
      delivery_maps_url: '',
      distance_km: 3,
      locations: [
        {
          name: 'Tempat Pembelian 1',
          address: '',
          maps_url: '',
          items: [{ name: '', qty: 1, unit_price: 0, is_price_unconfirmed: false }],
        },
      ],
    },
  ]);

  // Compute live pricing
  const pricing = useMemo(() => {
    let rawTotalShopping = 0;
    customers.forEach((c) => {
      c.locations.forEach((loc) => {
        loc.items.forEach((it) => {
          rawTotalShopping += (it.qty || 1) * (it.unit_price || 0);
        });
      });
    });

    const driverShoppingModal = modalType === 'driver' ? rawTotalShopping : 0;
    const adminShoppingModal = modalType === 'admin' ? rawTotalShopping : 0;

    return calculateCombinedOrderPricing({
      customers: customers.map((c) => ({
        customer_name: c.customer_name || 'Pelanggan',
        delivery_address: c.delivery_address,
        distance_km: Number(c.distance_km) || 0,
        locations: c.locations.map((loc) => ({
          name: loc.name,
          address: loc.address,
          maps_url: loc.maps_url,
          items: loc.items.map((it) => ({
            name: it.name,
            qty: Number(it.qty) || 1,
            unit_price: Number(it.unit_price) || 0,
            is_price_unconfirmed: !!it.is_price_unconfirmed || Number(it.unit_price) === 0,
          })),
        })),
      })),
      is_rain: isRain,
      is_night: isNight,
      driver_shopping_modal: driverShoppingModal,
      admin_shopping_modal: adminShoppingModal,
      admin_calculation_method: adminPricingMethod,
    });
  }, [customers, isRain, isNight, modalType, adminPricingMethod]);

  if (!isOpen) return null;

  // Add / Remove customer
  const handleAddCustomer = () => {
    if (customers.length >= 3) return;
    setCustomers([
      ...customers,
      {
        customer_name: `Pelanggan ${customers.length + 1}`,
        customer_phone: '',
        delivery_address: '',
        delivery_maps_url: '',
        distance_km: 3,
        locations: [
          {
            name: 'Tempat Pembelian 1',
            address: '',
            maps_url: '',
            items: [{ name: '', qty: 1, unit_price: 0 }],
          },
        ],
      },
    ]);
  };

  const handleRemoveCustomer = (index: number) => {
    if (customers.length <= 1) return;
    setCustomers(customers.filter((_, i) => i !== index));
  };

  // Customer field updates
  const handleCustomerChange = (
    cIdx: number,
    field: keyof CustomerFormState,
    value: any
  ) => {
    const updated = [...customers];
    updated[cIdx] = { ...updated[cIdx], [field]: value };
    setCustomers(updated);
  };

  // Location helpers
  const handleAddLocation = (cIdx: number) => {
    const updated = [...customers];
    updated[cIdx].locations.push({
      name: `Tempat Pembelian ${updated[cIdx].locations.length + 1}`,
      address: '',
      maps_url: '',
      items: [{ name: '', qty: 1, unit_price: 0 }],
    });
    setCustomers(updated);
  };

  const handleRemoveLocation = (cIdx: number, lIdx: number) => {
    const updated = [...customers];
    if (updated[cIdx].locations.length <= 1) return;
    updated[cIdx].locations = updated[cIdx].locations.filter((_, i) => i !== lIdx);
    setCustomers(updated);
  };

  const handleLocationChange = (
    cIdx: number,
    lIdx: number,
    field: keyof LocationFormState,
    value: any
  ) => {
    const updated = [...customers];
    updated[cIdx].locations[lIdx] = {
      ...updated[cIdx].locations[lIdx],
      [field]: value,
    };
    setCustomers(updated);
  };

  // Item helpers
  const handleAddItem = (cIdx: number, lIdx: number) => {
    const updated = [...customers];
    updated[cIdx].locations[lIdx].items.push({
      name: '',
      qty: 1,
      unit_price: 0,
    });
    setCustomers(updated);
  };

  const handleRemoveItem = (cIdx: number, lIdx: number, iIdx: number) => {
    const updated = [...customers];
    if (updated[cIdx].locations[lIdx].items.length <= 1) return;
    updated[cIdx].locations[lIdx].items = updated[cIdx].locations[lIdx].items.filter(
      (_, i) => i !== iIdx
    );
    setCustomers(updated);
  };

  const handleItemChange = (
    cIdx: number,
    lIdx: number,
    iIdx: number,
    field: keyof ItemFormState,
    value: any
  ) => {
    const updated = [...customers];
    updated[cIdx].locations[lIdx].items[iIdx] = {
      ...updated[cIdx].locations[lIdx].items[iIdx],
      [field]: value,
    };
    setCustomers(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      driver_id: selectedDriverId || '',
      is_rain: isRain,
      is_night: isNight,
      driver_shopping_modal: pricing.driver_shopping_modal,
      admin_shopping_modal: pricing.admin_shopping_modal,
      admin_calculation_method: adminPricingMethod,
      notes: groupNotes,
      customers: customers.map((c) => ({
        customer_name: c.customer_name || 'Pelanggan',
        customer_phone: c.customer_phone,
        delivery_address: c.delivery_address || 'Alamat tujuan belum diisi',
        delivery_maps_url: c.delivery_maps_url,
        distance_km: Number(c.distance_km) || 2,
        locations: c.locations.map((l) => ({
          name: l.name || 'Tempat Pembelian',
          address: l.address || '',
          maps_url: l.maps_url,
          items: l.items.map((it) => ({
            name: it.name || 'Barang Belanja',
            qty: Number(it.qty) || 1,
            unit_price: Number(it.unit_price) || 0,
            notes: it.notes,
            is_price_unconfirmed: !!it.is_price_unconfirmed || Number(it.unit_price) === 0,
          })),
        })),
      })),
    };

    onSubmit(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-[8px] shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[6px] bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Buat Order Gabungan</h2>
              <p className="text-xs text-white/80">
                Gabungkan hingga maksimal 3 pelanggan dengan rute searah dalam 1 grup driver
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs sm:text-sm">
          {/* Driver & Global Group Conditions */}
          <div className="bg-slate-50 p-4 rounded-[6px] border border-slate-200/80 space-y-4">
            <div className="font-bold text-slate-800 uppercase tracking-wider text-xs">
              Informasi Grup &amp; Penugasan Driver
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Driver Pelaksana:
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[6px] bg-white border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Tetapkan Nanti (Tahap 1: Menunggu Driver) --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sumber Modal Belanja (Jika Ada):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalType('driver')}
                    className={`flex-1 py-2 px-3 rounded-[6px] text-xs font-bold border transition-all cursor-pointer ${
                      modalType === 'driver'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Ditalangi Driver (Reimburse)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalType('admin')}
                    className={`flex-1 py-2 px-3 rounded-[6px] text-xs font-bold border transition-all cursor-pointer ${
                      modalType === 'admin'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Kas / Saldo Admin
                  </button>
                </div>
              </div>
            </div>

            {/* Surcharges (Rain / Night) */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <label
                className={`flex items-center gap-2 px-3 py-2 rounded-[6px] border text-xs font-bold cursor-pointer transition-all ${
                  isRain ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isRain}
                  onChange={(e) => setIsRain(e.target.checked)}
                  className="sr-only"
                />
                <CloudRain className="w-4 h-4 text-blue-500" />
                <span>Kondisi Hujan (+{formatRupiah(5000)} ke Driver)</span>
              </label>

              <label
                className={`flex items-center gap-2 px-3 py-2 rounded-[6px] border text-xs font-bold cursor-pointer transition-all ${
                  isNight ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isNight}
                  onChange={(e) => setIsNight(e.target.checked)}
                  className="sr-only"
                />
                <Moon className="w-4 h-4 text-indigo-500" />
                <span>Malam Hari / Larut (+{formatRupiah(5000)} ke Driver)</span>
              </label>
            </div>
          </div>

          {/* Customers Section (Max 3) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daftar Pelanggan ({customers.length}/3 Orang)
                </h3>
                <p className="text-xs text-slate-500">
                  Setiap pelanggan memiliki rute, tempat belanja, dan ongkir tersendiri.
                </p>
              </div>

              {customers.length < 3 && (
                <button
                  type="button"
                  onClick={handleAddCustomer}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Pelanggan</span>
                </button>
              )}
            </div>

            {customers.map((cust, cIdx) => (
              <div
                key={cIdx}
                className="bg-white rounded-[6px] p-4 sm:p-5 border-2 border-slate-200/80 shadow-xs space-y-4"
              >
                {/* Customer Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-[4px] bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                      {cIdx + 1}
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      Pelanggan #{cIdx + 1}
                    </span>
                  </div>

                  {customers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomer(cIdx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-[6px] hover:bg-red-50 flex items-center gap-1 font-semibold text-xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Nama Pelanggan:
                    </label>
                    <input
                      type="text"
                      value={cust.customer_name}
                      onChange={(e) => handleCustomerChange(cIdx, 'customer_name', e.target.value)}
                      placeholder="Contoh: Ibu Siska"
                      className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Nomor WhatsApp:
                    </label>
                    <input
                      type="tel"
                      value={cust.customer_phone}
                      onChange={(e) => handleCustomerChange(cIdx, 'customer_phone', e.target.value)}
                      placeholder="Contoh: 0812-3456-7890"
                      className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Jarak Pengantaran (KM):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={cust.distance_km}
                      onChange={(e) => handleCustomerChange(cIdx, 'distance_km', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Alamat Tujuan:
                    </label>
                    <input
                      type="text"
                      value={cust.delivery_address}
                      onChange={(e) => handleCustomerChange(cIdx, 'delivery_address', e.target.value)}
                      placeholder="Contoh: Pogung Dalangan No. 4"
                      className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Link Google Maps Tujuan:
                    </label>
                    <input
                      type="url"
                      value={cust.delivery_maps_url}
                      onChange={(e) => handleCustomerChange(cIdx, 'delivery_maps_url', e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className="w-full px-3 py-2 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Locations / Tempat Pembelian */}
                <div className="bg-slate-50/70 p-3.5 rounded-[6px] border border-slate-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Tempat Pembelian ({cust.locations.length} Lokasi)</span>
                      {cust.locations.length > 1 && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-[4px]">
                          +{formatRupiah((cust.locations.length - 1) * 2000)} Biaya Tempat Extra
                        </span>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleAddLocation(cIdx)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Tempat (+Rp2.000)</span>
                    </button>
                  </div>

                  {cust.locations.map((loc, lIdx) => (
                    <div
                      key={lIdx}
                      className="bg-white p-3 rounded-[6px] border border-slate-200 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          Lokasi {lIdx + 1}:
                        </span>
                        {cust.locations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLocation(cIdx, lIdx)}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold cursor-pointer"
                          >
                            Hapus Tempat
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={loc.name}
                          onChange={(e) => handleLocationChange(cIdx, lIdx, 'name', e.target.value)}
                          placeholder="Nama Toko/Tempat"
                          className="px-2.5 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-semibold"
                          required
                        />
                        <input
                          type="text"
                          value={loc.address}
                          onChange={(e) => handleLocationChange(cIdx, lIdx, 'address', e.target.value)}
                          placeholder="Alamat Lokasi"
                          className="px-2.5 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs"
                        />
                        <input
                          type="url"
                          value={loc.maps_url}
                          onChange={(e) => handleLocationChange(cIdx, lIdx, 'maps_url', e.target.value)}
                          placeholder="Link Maps Toko"
                          className="px-2.5 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs"
                        />
                      </div>

                      {/* Items at this place */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                          <span>Daftar Barang Belanjaan:</span>
                          <button
                            type="button"
                            onClick={() => handleAddItem(cIdx, lIdx)}
                            className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tambah Barang</span>
                          </button>
                        </div>

                        {loc.items.map((it, itIdx) => (
                          <div key={itIdx} className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-200/80 space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={it.name}
                                onChange={(e) => handleItemChange(cIdx, lIdx, itIdx, 'name', e.target.value)}
                                placeholder="Nama barang..."
                                className="flex-2 px-2.5 py-1.5 rounded-[6px] bg-white border border-slate-200 text-xs font-semibold"
                              />
                              <input
                                type="number"
                                min="1"
                                value={it.qty}
                                onChange={(e) => handleItemChange(cIdx, lIdx, itIdx, 'qty', parseInt(e.target.value, 10) || 1)}
                                placeholder="Qty"
                                className="w-16 px-2 py-1.5 rounded-[6px] bg-white border border-slate-200 text-xs text-center font-bold"
                              />
                              <div className="flex-1 relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                                  Rp
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  disabled={it.is_price_unconfirmed}
                                  value={it.is_price_unconfirmed ? '' : it.unit_price || ''}
                                  onChange={(e) => handleItemChange(cIdx, lIdx, itIdx, 'unit_price', parseInt(e.target.value, 10) || 0)}
                                  placeholder={it.is_price_unconfirmed ? 'Menunggu harga' : 'Harga Satuan'}
                                  className={`w-full pl-7 pr-2 py-1.5 rounded-[6px] border text-xs font-medium tabular-nums ${
                                    it.is_price_unconfirmed
                                      ? 'bg-amber-50/60 border-amber-300 text-amber-800 placeholder-amber-700/60 font-semibold'
                                      : 'bg-white border-slate-200 text-slate-900'
                                  }`}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-800 w-24 text-right tabular-nums">
                                {it.is_price_unconfirmed ? (
                                  <span className="text-amber-700 text-[10px]">Menunggu</span>
                                ) : (
                                  formatRupiah((it.qty || 1) * (it.unit_price || 0))
                                )}
                              </span>
                              {loc.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(cIdx, lIdx, itIdx)}
                                  className="text-slate-400 hover:text-red-500 p-1"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {/* Status Harga Menunggu Konfirmasi Checkbox */}
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                              <label className="flex items-center gap-1.5 text-slate-600 font-semibold cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!it.is_price_unconfirmed}
                                  onChange={(e) => {
                                    handleItemChange(cIdx, lIdx, itIdx, 'is_price_unconfirmed', e.target.checked);
                                    if (e.target.checked) {
                                      handleItemChange(cIdx, lIdx, itIdx, 'unit_price', 0);
                                    }
                                  }}
                                  className="rounded-[4px] border-slate-300 text-amber-600 focus:ring-amber-500"
                                />
                                <span>Harga belum diketahui (Menunggu konfirmasi setelah belanja)</span>
                              </label>
                              {it.is_price_unconfirmed && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-[4px]">
                                  Menunggu Konfirmasi
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Engine Calculation Summary Box with Transparent Method Selection */}
          <div className="p-4 sm:p-5 rounded-[6px] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white space-y-4 shadow-xl border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span className="font-extrabold text-sm tracking-tight">
                  Perhitungan Ongkir &amp; Hak Driver Order Gabungan
                </span>
              </div>
              <div className="flex items-center gap-2">
                {pricing.has_unconfirmed_prices && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Tagihan Belanja Belum Final
                  </span>
                )}
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-[4px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {pricing.customer_count} Pelanggan ({pricing.total_distance_km} KM)
                </span>
              </div>
            </div>

            {/* Interactive Method Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/80 font-bold flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pilih Metode Perhitungan Bagian Admin:</span>
                </span>
                <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/20 px-2 py-0.5 rounded-[4px] border border-amber-500/30">
                  Transparan &amp; Dapat Dikonfirmasi Admin
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {/* Method 1: Accumulative */}
                <button
                  type="button"
                  onClick={() => setAdminPricingMethod('accumulative_per_customer')}
                  className={`p-2.5 rounded-[6px] border text-left transition-all cursor-pointer ${
                    adminPricingMethod === 'accumulative_per_customer'
                      ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-sm'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs mb-1">
                    <span>1. Akumulatif Jarak</span>
                    {adminPricingMethod === 'accumulative_per_customer' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-emerald-300 block mb-1">
                    (Rekomendasi Default)
                  </span>
                  <div className="font-mono text-[11px] text-amber-300">
                    Admin: {formatRupiah(pricing.admin_method_comparison.accumulative_per_customer.admin_share)}
                  </div>
                </button>

                {/* Method 2: Consolidated Route */}
                <button
                  type="button"
                  onClick={() => setAdminPricingMethod('consolidated_route')}
                  className={`p-2.5 rounded-[6px] border text-left transition-all cursor-pointer ${
                    adminPricingMethod === 'consolidated_route'
                      ? 'bg-blue-500/20 border-blue-400 text-white shadow-sm'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs mb-1">
                    <span>2. Rute Konsolidasi</span>
                    {adminPricingMethod === 'consolidated_route' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-blue-300 block mb-1">
                    (Maks Cap Rp2.000)
                  </span>
                  <div className="font-mono text-[11px] text-amber-300">
                    Admin: {formatRupiah(pricing.admin_method_comparison.consolidated_route.admin_share)}
                  </div>
                </button>

                {/* Method 3: Flat Count */}
                <button
                  type="button"
                  onClick={() => setAdminPricingMethod('flat_count')}
                  className={`p-2.5 rounded-[6px] border text-left transition-all cursor-pointer ${
                    adminPricingMethod === 'flat_count'
                      ? 'bg-purple-500/20 border-purple-400 text-white shadow-sm'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs mb-1">
                    <span>3. Flat Pelanggan</span>
                    {adminPricingMethod === 'flat_count' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-purple-300 block mb-1">
                    (Aturan Statis Lama)
                  </span>
                  <div className="font-mono text-[11px] text-amber-300">
                    Admin: {formatRupiah(pricing.admin_method_comparison.flat_count.admin_share)}
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-2.5 rounded-[6px] bg-white/5 border border-white/10">
                <span className="text-white/60 block text-[10px]">Total Ongkir Customer:</span>
                <span className="font-black text-base text-white tabular-nums">
                  {formatRupiah(pricing.total_delivery_fee)}
                </span>
              </div>
              <div className="p-2.5 rounded-[6px] bg-amber-500/10 border border-amber-500/20">
                <span className="text-amber-300/80 block text-[10px]">
                  Bagian Admin:
                </span>
                <span className="font-black text-base text-amber-300 tabular-nums">
                  {formatRupiah(pricing.admin_share)}
                </span>
              </div>
              <div className="p-2.5 rounded-[6px] bg-indigo-500/10 border border-indigo-500/20">
                <span className="text-indigo-300/80 block text-[10px]">Bagian BANTER (10%):</span>
                <span className="font-black text-base text-indigo-300 tabular-nums">
                  {formatRupiah(pricing.banter_share)}
                </span>
              </div>
              <div className="p-2.5 rounded-[6px] bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-emerald-300/80 block text-[10px]">Hak Ongkir Driver:</span>
                <span className="font-black text-base text-emerald-300 tabular-nums">
                  {formatRupiah(pricing.driver_delivery_share)}
                </span>
              </div>
            </div>

            {/* Extra fees and shopping */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-white/10">
              <div>
                <span className="text-white/60 block text-[10px]">Biaya Tambahan (100% Driver):</span>
                <span className="font-bold text-teal-300 tabular-nums">
                  +{formatRupiah(pricing.extra_fees_total)}
                </span>
                {pricing.extra_locations_fee > 0 && (
                  <span className="text-[10px] text-white/50 block">
                    (Tempat Extra: {formatRupiah(pricing.extra_locations_fee)})
                  </span>
                )}
              </div>
              <div>
                <span className="text-white/60 block text-[10px]">Total Belanja Produk:</span>
                <span className="font-bold text-white tabular-nums">
                  {pricing.has_unconfirmed_prices
                    ? `Menunggu konfirmasi (${formatRupiah(pricing.total_shopping_cost)})`
                    : formatRupiah(pricing.total_shopping_cost)}
                </span>
              </div>
              <div>
                <span className="text-white/60 block text-[10px]">Total Hak Driver Keseluruhan:</span>
                <span className="font-black text-base text-emerald-400 tabular-nums">
                  {formatRupiah(pricing.driver_total_entitlement)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-[6px] text-slate-600 font-bold hover:bg-slate-100 text-xs sm:text-sm cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-[6px] bg-emerald-600 text-white font-black text-xs sm:text-sm hover:bg-emerald-700 shadow-md shadow-emerald-600/30 cursor-pointer"
            >
              Simpan &amp; Buat Order Gabungan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
