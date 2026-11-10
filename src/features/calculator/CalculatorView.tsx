import React, { useState, useMemo } from 'react';
import {
  Calculator,
  CloudRain,
  Moon,
  PlusCircle,
  Copy,
  Check,
  RotateCcw,
  Send,
  UserCheck,
  MapPin,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Driver, TariffConfig } from '../../types';
import { calculatePricing, formatRupiah } from '../../lib/pricing/engine';

interface CalculatorViewProps {
  drivers: Driver[];
  tariffConfig: TariffConfig;
  onSaveAsOrder: (orderData: {
    driver_id: string;
    distance_km: number;
    is_rain: boolean;
    is_night: boolean;
    extra_stops_count: number;
    notes?: string;
  }) => void;
}

export const CalculatorView: React.FC<CalculatorViewProps> = ({
  drivers,
  tariffConfig,
  onSaveAsOrder,
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id || '');
  const [distanceKm, setDistanceKm] = useState<string>('3.5');
  const [isRain, setIsRain] = useState<boolean>(false);
  const [isNight, setIsNight] = useState<boolean>(false);
  const [extraStops, setExtraStops] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const numDistance = Math.max(0, parseFloat(distanceKm) || 0);

  const calc = useMemo(() => {
    return calculatePricing({
      distance_km: numDistance,
      is_rain: isRain,
      is_night: isNight,
      extra_stops_count: extraStops,
      config: tariffConfig,
    });
  }, [numDistance, isRain, isNight, extraStops, tariffConfig]);

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0];

  const handleCopyDetails = () => {
    const text = `🛵 *RINCIAN TARIF BANTER*
Driver: ${selectedDriver?.name || 'Driver BANTER'}
Jarak: ${calc.distance_raw_km} KM (dibulatkan: ${calc.distance_rounded_km} KM)
------------------------------
Ongkir Customer: ${formatRupiah(calc.delivery_fee)}
${calc.extra_fees_total > 0 ? `Biaya Tambahan: ${formatRupiah(calc.extra_fees_total)} (${isRain ? 'Hujan ' : ''}${isNight ? 'Malam ' : ''}${extraStops > 0 ? `${extraStops} Stop` : ''})\n` : ''}Total Bayar Customer: ${formatRupiah(calc.customer_total_fee)}
------------------------------
*Pembagian Hasil:*
• Bagian Admin: ${formatRupiah(calc.admin_share)}
• Bagian BANTER: ${formatRupiah(calc.banter_share)}
• Hak Bersih Driver: ${formatRupiah(calc.driver_total_delivery_entitlement)}
${notes ? `Catatan: ${notes}` : ''}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setDistanceKm('2');
    setIsRain(false);
    setIsNight(false);
    setExtraStops(0);
    setNotes('');
  };

  const handleSave = () => {
    onSaveAsOrder({
      driver_id: selectedDriverId || drivers[0]?.id || '',
      distance_km: numDistance,
      is_rain: isRain,
      is_night: isNight,
      extra_stops_count: extraStops,
      notes,
    });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[6px] bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Calculator className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Kalkulator Tarif BANTER</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Hitung otomatis ongkir customer dan bagi hasil Admin, BANTER, serta hak Driver.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="self-start sm:self-auto flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-xs font-semibold text-slate-600 bg-white border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Form</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left Column: Input Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-[6px] p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-5">
          {/* Driver Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Driver
            </label>
            <div className="relative">
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full h-10 px-3.5 rounded-[6px] bg-slate-50 border border-slate-200 font-semibold text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {drivers.map((drv) => (
                  <option key={drv.id} value={drv.id}>
                    {drv.code} - {drv.name} ({drv.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Distance Input with Quick Buttons & Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Jarak Tempuh (Kilometer)
              </label>
              <div className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-[4px] tabular-nums">
                Dibulatkan: {calc.distance_rounded_km} KM
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="Contoh: 3.5"
                  className="w-full h-11 px-3.5 rounded-[6px] bg-slate-50 border border-slate-200 font-bold text-slate-900 text-base focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all tabular-nums"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  KM
                </span>
              </div>
            </div>

            {/* Quick Distance Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {[1, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 10, 15].map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => setDistanceKm(String(km))}
                  className={`px-2.5 py-1 rounded-[6px] text-xs font-bold transition-all cursor-pointer tabular-nums ${
                    numDistance === km
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                  }`}
                >
                  {km} KM
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Aturan: 0-2 KM Rp8.000, di atas 2 KM +Rp2.500/KM. Pembulatan setengah ke atas (misal 2.5 KM &rarr; 3 KM).
            </p>
          </div>

          {/* Extra Fees: Rain, Night, Additional Stops */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Biaya Tambahan (100% Hak Driver)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Rain Fee */}
              <label
                className={`flex items-center justify-between p-3 rounded-[6px] border transition-all cursor-pointer ${
                  isRain
                    ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center ${isRain ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <CloudRain className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Biaya Hujan</div>
                    <div className="text-[11px] text-blue-600 font-semibold tabular-nums">+Rp5.000</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isRain}
                  onChange={(e) => setIsRain(e.target.checked)}
                  className="w-4 h-4 rounded-[4px] text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </label>

              {/* Night Order Fee */}
              <label
                className={`flex items-center justify-between p-3 rounded-[6px] border transition-all cursor-pointer ${
                  isNight
                    ? 'bg-indigo-50/80 border-indigo-400 ring-1 ring-indigo-400'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center ${isNight ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Order Malam</div>
                    <div className="text-[11px] text-indigo-600 font-semibold tabular-nums">+Rp5.000</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isNight}
                  onChange={(e) => setIsNight(e.target.checked)}
                  className="w-4 h-4 rounded-[4px] text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            </div>

            {/* Extra Stops Stepper */}
            <div className="p-3 rounded-[6px] bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">Tambahan Tempat / Titik Beli</div>
                <div className="text-[11px] text-slate-500">+Rp2.000 per tempat tambahan</div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setExtraStops(Math.max(0, extraStops - 1))}
                  className="w-7 h-7 rounded-[6px] bg-white border border-slate-300 font-black text-slate-700 flex items-center justify-center hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  -
                </button>
                <span className="text-sm font-black text-slate-900 w-5 text-center tabular-nums">
                  {extraStops}
                </span>
                <button
                  type="button"
                  onClick={() => setExtraStops(extraStops + 1)}
                  className="w-7 h-7 rounded-[6px] bg-blue-600 text-white font-black flex items-center justify-center hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Catatan Order (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Titip martabak manis &amp; susu murni"
              className="w-full h-10 px-3.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Right Column: Live Result Card & Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-22">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-[6px] p-5 sm:p-6 shadow-xl space-y-4.5 border border-slate-700/60">
            {/* Header Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Rincian Hasil Perhitungan
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-[4px] bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Formula Aktif
              </span>
            </div>

            {/* Customer Total Bill Hero */}
            <div className="bg-white/10 rounded-[6px] p-4 backdrop-blur-xs border border-white/10">
              <div className="text-xs font-medium text-slate-300">Total Pembayaran Customer</div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1 tabular-nums">
                {formatRupiah(calc.customer_total_fee)}
              </div>
              <div className="text-[11px] text-slate-300/80 mt-1 tabular-nums">
                Ongkir {formatRupiah(calc.delivery_fee)}
                {calc.extra_fees_total > 0 && ` + Tambahan ${formatRupiah(calc.extra_fees_total)}`}
              </div>
            </div>

            {/* Split Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-700/60">
                <span className="text-slate-300">Jarak Terhitung</span>
                <span className="font-bold text-white tabular-nums">
                  {calc.distance_raw_km} KM &rarr; {calc.distance_rounded_km} KM
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-700/60">
                <span className="text-slate-300">Ongkir Standar</span>
                <span className="font-bold text-white tabular-nums">
                  {formatRupiah(calc.delivery_fee)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-700/60 text-amber-300">
                <span>Potongan Admin</span>
                <span className="font-bold tabular-nums">
                  - {formatRupiah(calc.admin_share)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-700/60 text-indigo-300">
                <span>Potongan BANTER (10%)</span>
                <span className="font-bold tabular-nums">
                  - {formatRupiah(calc.banter_share)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-700/60 text-emerald-300">
                <span>Hak Ongkir Driver</span>
                <span className="font-bold tabular-nums">
                  {formatRupiah(calc.driver_delivery_share)}
                </span>
              </div>

              {calc.extra_fees_total > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-slate-700/60 text-teal-300">
                  <span>Biaya Tambahan (100% Driver)</span>
                  <span className="font-bold tabular-nums">
                    + {formatRupiah(calc.extra_fees_total)}
                  </span>
                </div>
              )}

              {/* Grand Total Hak Driver */}
              <div className="pt-2 flex justify-between items-center text-sm">
                <span className="font-extrabold text-emerald-400">Total Hak Driver</span>
                <span className="text-lg font-black text-emerald-400 tabular-nums">
                  {formatRupiah(calc.driver_total_delivery_entitlement)}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleSave}
                className="w-full h-11 px-4 rounded-[6px] bg-blue-600 hover:bg-blue-500 font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Simpan Sebagai Pesanan</span>
              </button>

              <button
                onClick={handleCopyDetails}
                className="w-full h-10 px-4 rounded-[6px] bg-white/10 hover:bg-white/15 font-semibold text-xs text-slate-200 flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Rincian Disalin ke Clipboard!' : 'Salin Rincian Teks WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
