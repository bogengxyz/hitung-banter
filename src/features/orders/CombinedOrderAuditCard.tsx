import React, { useState } from 'react';
import {
  Calculator,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Info,
  Sliders,
} from 'lucide-react';
import { CombinedOrderGroup, CombinedAdminPricingMethod } from '../../types';
import { calculateCombinedOrderPricing } from '../../lib/pricing/combinedEngine';
import { formatRupiah } from '../../lib/pricing/engine';

interface CombinedOrderAuditCardProps {
  group: CombinedOrderGroup;
  onUpdateMethod?: (method: CombinedAdminPricingMethod) => void;
  readOnly?: boolean;
}

export const CombinedOrderAuditCard: React.FC<CombinedOrderAuditCardProps> = ({
  group,
  onUpdateMethod,
  readOnly = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Run live calculation to get current audit comparisons
  const pricing = calculateCombinedOrderPricing({
    customers: group.customers.map((c) => ({
      customer_name: c.customer_name,
      delivery_address: c.delivery_address,
      distance_km: c.distance_km,
      delivery_fee: c.delivery_fee,
      locations: c.locations,
    })),
    is_rain: group.is_rain,
    is_night: group.is_night,
    driver_shopping_modal: group.driver_shopping_modal,
    admin_shopping_modal: group.admin_shopping_modal,
    admin_calculation_method: group.admin_calculation_method || 'accumulative_per_customer',
  });

  const activeMethod = group.admin_calculation_method || 'accumulative_per_customer';

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 text-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span>Audit &amp; Transparansi Perhitungan Ongkir Order Gabungan</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                Resmi BANTER
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Perincian matematis jarak, ongkir kotor, bagian Admin, BANTER 10%, dan hak bersih driver
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer text-xs"
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isExpanded ? 'Sembunyikan Audit' : 'Buka Audit'}</span>
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3.5 pt-1">
          {/* Audit Note Regarding the Rp750 Anomaly */}
          <div className="p-3 rounded-xl bg-white border border-amber-300 text-slate-700 leading-relaxed shadow-2xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-amber-900 block mb-0.5">
                  Laporan Hasil Audit Anomali Bagian Admin Rp750:
                </span>
                <p className="text-[11px] text-slate-600">
                  Pada transaksi pengujian 2 pelanggan (6 KM &amp; 3 KM, total 9 KM), sistem lama memunculkan potongan Admin sebesar <strong>Rp750</strong>.
                  Hasil audit membuktikan nominal <strong>Rp750 tersebut tidak valid</strong> karena tidak memiliki dasar matematis maupun aturan tarif resmi BANTER (berasal dari perkiraan statis yang salah).
                  Berdasarkan formula resmi BANTER, untuk jarak 6 KM &amp; 3 KM:
                </p>
                <div className="mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800">
                  • Pelanggan 1 (6 KM): 4 KM ekstra × Rp500 = <strong>Rp2.000</strong> (maksimal).<br />
                  • Pelanggan 2 (3 KM): 1 KM ekstra × Rp500 = <strong>Rp500</strong>.<br />
                  • Total Bagian Admin Sah = <strong>Rp2.500</strong> (bukan Rp750).
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Table Per Customer */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-3 py-2 bg-slate-100 font-bold text-slate-800 text-[11px] border-b border-slate-200 flex items-center justify-between">
              <span>Perincian Ongkir Setiap Pelanggan:</span>
              <span className="text-slate-500 font-normal">
                Total Jarak: <strong>{pricing.total_distance_km} KM</strong> | Total Pelanggan: <strong>{pricing.customer_count}</strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                    <th className="py-2 px-3">Pelanggan</th>
                    <th className="py-2 px-3 text-center">Jarak Riil</th>
                    <th className="py-2 px-3 text-center">Pembulatan</th>
                    <th className="py-2 px-3 text-right">Ongkir Kotor</th>
                    <th className="py-2 px-3 text-right text-amber-700">Bagian Admin</th>
                    <th className="py-2 px-3 text-right text-indigo-700">BANTER (10%)</th>
                    <th className="py-2 px-3 text-right text-emerald-700">Hak Bersih Driver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {pricing.customer_results.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {idx + 1}. {c.customer_name}
                      </td>
                      <td className="py-2 px-3 text-center tabular-nums text-slate-600">
                        {c.distance_km} KM
                      </td>
                      <td className="py-2 px-3 text-center tabular-nums text-slate-600">
                        {c.rounded_distance} KM
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-900">
                        {formatRupiah(c.delivery_fee)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-amber-700">
                        {formatRupiah(c.individual_admin_share)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-indigo-700">
                        {formatRupiah(c.individual_banter_share)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-bold text-emerald-700">
                        {formatRupiah(c.individual_driver_delivery_share)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-extrabold text-slate-900">
                    <td className="py-2 px-3" colSpan={3}>
                      TOTAL AKUMULATIF (RUTE {pricing.total_distance_km} KM):
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-900">
                      {formatRupiah(pricing.total_delivery_fee)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-amber-800">
                      {formatRupiah(pricing.admin_method_comparison.accumulative_per_customer.admin_share)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-indigo-800">
                      {formatRupiah(pricing.admin_method_comparison.accumulative_per_customer.banter_share)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-emerald-800">
                      {formatRupiah(pricing.admin_method_comparison.accumulative_per_customer.driver_delivery_share)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Simulation & Choice of Admin Pricing Method */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800 text-[11px] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>Simulasi Pilihan Metode Perhitungan Bagian Admin:</span>
              </span>
              <span className="text-[10px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                Membutuhkan Konfirmasi Admin
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* Method 1: Accumulative */}
              <div
                onClick={() => !readOnly && onUpdateMethod?.('accumulative_per_customer')}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  activeMethod === 'accumulative_per_customer'
                    ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                } ${readOnly ? '' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between font-extrabold text-slate-900 mb-1">
                  <span>1. Akumulatif per Pelanggan</span>
                  {activeMethod === 'accumulative_per_customer' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-sm inline-block mb-1.5">
                  (Rekomendasi Default)
                </span>
                <p className="text-[11px] text-slate-500 mb-2">
                  Menghitung potongan admin tiap pelanggan sesuai jaraknya tanpa estimasi statis.
                </p>
                <div className="space-y-1 font-mono text-[11px] pt-1 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bagian Admin:</span>
                    <strong className="text-amber-800">{formatRupiah(pricing.admin_method_comparison.accumulative_per_customer.admin_share)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">BANTER 10%:</span>
                    <strong className="text-indigo-800">{formatRupiah(pricing.admin_method_comparison.accumulative_per_customer.banter_share)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hak Bersih Driver:</span>
                    <strong className="text-emerald-800">{formatRupiah(pricing.admin_method_comparison.accumulative_per_customer.driver_delivery_share)}</strong>
                  </div>
                </div>
              </div>

              {/* Method 2: Consolidated Route */}
              <div
                onClick={() => !readOnly && onUpdateMethod?.('consolidated_route')}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  activeMethod === 'consolidated_route'
                    ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                } ${readOnly ? '' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between font-extrabold text-slate-900 mb-1">
                  <span>2. Rute Konsolidasi</span>
                  {activeMethod === 'consolidated_route' && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <span className="text-[10px] font-semibold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded-sm inline-block mb-1.5">
                  (Maks Cap Rp2.000)
                </span>
                <p className="text-[11px] text-slate-500 mb-2">
                  Total rute dihitung sebagai 1 order gabungan tunggal dengan batas potongan Admin Rp2.000.
                </p>
                <div className="space-y-1 font-mono text-[11px] pt-1 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bagian Admin:</span>
                    <strong className="text-amber-800">{formatRupiah(pricing.admin_method_comparison.consolidated_route.admin_share)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">BANTER 10%:</span>
                    <strong className="text-indigo-800">{formatRupiah(pricing.admin_method_comparison.consolidated_route.banter_share)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hak Bersih Driver:</span>
                    <strong className="text-emerald-800">{formatRupiah(pricing.admin_method_comparison.consolidated_route.driver_delivery_share)}</strong>
                  </div>
                </div>
              </div>

              {/* Method 3: Flat Count */}
              <div
                onClick={() => !readOnly && onUpdateMethod?.('flat_count')}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  activeMethod === 'flat_count'
                    ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                } ${readOnly ? '' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between font-extrabold text-slate-900 mb-1">
                  <span>3. Flat Jumlah Pelanggan</span>
                  {activeMethod === 'flat_count' && (
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  )}
                </div>
                <span className="text-[10px] font-semibold text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded-sm inline-block mb-1.5">
                  (Flat Statis)
                </span>
                <p className="text-[11px] text-slate-500 mb-2">
                  Aturan lama berdasarkan jumlah pelanggan (1: Rp0, 2: Rp1.000, 3: Rp2.000).
                </p>
                <div className="space-y-1 font-mono text-[11px] pt-1 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bagian Admin:</span>
                    <strong className="text-amber-800">{formatRupiah(pricing.admin_method_comparison.flat_count.admin_share)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">BANTER 10%:</span>
                    <strong className="text-indigo-800">{formatRupiah(pricing.admin_method_comparison.flat_count.banter_share)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hak Bersih Driver:</span>
                    <strong className="text-emerald-800">{formatRupiah(pricing.admin_method_comparison.flat_count.driver_delivery_share)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
