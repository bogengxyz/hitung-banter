"use client";

import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChartBarSyncedDataPoint {
  label: string;
  totalOngkir: number;
  totalDriver: number;
  totalBanter: number;
  [key: string]: any;
}

export interface ChartBarSyncedProps {
  data?: ChartBarSyncedDataPoint[];
  formatValue?: (value: number) => string;
  syncId?: string;
  defaultMode?: "synced" | "combined";
}

// ─── Default Sample Data ──────────────────────────────────────────────────────

export const DEFAULT_SAMPLE_DATA: ChartBarSyncedDataPoint[] = [
  { label: "Sen", totalOngkir: 125000, totalDriver: 112500, totalBanter: 12500 },
  { label: "Sel", totalOngkir: 185000, totalDriver: 166500, totalBanter: 18500 },
  { label: "Rab", totalOngkir: 240000, totalDriver: 216000, totalBanter: 24000 },
  { label: "Kam", totalOngkir: 160000, totalDriver: 144000, totalBanter: 16000 },
  { label: "Jum", totalOngkir: 310000, totalDriver: 279000, totalBanter: 31000 },
  { label: "Sab", totalOngkir: 280000, totalDriver: 252000, totalBanter: 28000 },
  { label: "Min", totalOngkir: 195000, totalDriver: 175500, totalBanter: 19500 },
];

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

const LABELS_MAP: Record<string, string> = {
  totalOngkir: "Total Ongkir",
  totalDriver: "Hak Driver",
  totalBanter: "BANTER (10%)",
};

const CustomTooltip = ({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey?: string }>;
  label?: string;
  formatValue: (v: number) => string;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-[6px] shadow-xl border border-slate-700/80 text-xs min-w-[185px] z-50">
      <div className="font-bold text-slate-300 border-b border-slate-700/70 pb-1.5 mb-2 flex items-center justify-between">
        <span>{label}</span>
      </div>
      <div className="space-y-1.5">
        {payload.map((entry) => {
          const key = (entry.dataKey as string) || entry.name;
          const displayName = LABELS_MAP[key] ?? entry.name;
          return (
            <div key={entry.name} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-300">{displayName}:</span>
              </div>
              <span className="font-black tabular-nums" style={{ color: entry.color }}>
                {formatValue(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const ChartBarSynced: React.FC<ChartBarSyncedProps> = ({
  data = DEFAULT_SAMPLE_DATA,
  formatValue = (v) => `Rp${v.toLocaleString("id-ID")}`,
  syncId = "financial-synced-bar",
  defaultMode = "synced",
}) => {
  const [mode, setMode] = useState<"synced" | "combined">(defaultMode);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-xs gap-2">
        <span>Tidak ada data transaksi pada rentang periode ini</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* View Mode Toggle Pill */}
      <div className="flex items-center justify-end">
        <div className="inline-flex items-center p-0.5 rounded-[6px] bg-slate-100 border border-slate-200 text-[11px]">
          <button
            type="button"
            onClick={() => setMode("synced")}
            className={`px-2.5 py-1 rounded-[4px] font-bold transition-all cursor-pointer ${
              mode === "synced"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Panel Sinkron (Synced)
          </button>
          <button
            type="button"
            onClick={() => setMode("combined")}
            className={`px-2.5 py-1 rounded-[4px] font-bold transition-all cursor-pointer ${
              mode === "combined"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Grafik Tunggal
          </button>
        </div>
      </div>

      {mode === "synced" ? (
        /* ─── 2-PANEL SYNCHRONIZED CHARTS ─────────────────────────────────────── */
        <div className="space-y-2">
          {/* Panel 1: Total Ongkir */}
          <div className="p-3 rounded-[6px] bg-slate-50/60 border border-slate-200/70">
            <div className="flex items-center justify-between pb-1.5 px-1">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-blue-600" />
                <span>1. Total Ongkir (Volume Bruto)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Sinkron dengan bagi hasil</span>
            </div>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  syncId={syncId}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#E2E8F0"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: "#64748B", fontFamily: "sans-serif" }}
                    dy={4}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 700, fill: "#94A3B8", fontFamily: "sans-serif" }}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                    width={38}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(37, 99, 235, 0.08)", rx: 4 }}
                    content={<CustomTooltip formatValue={formatValue} />}
                  />
                  <Bar
                    dataKey="totalOngkir"
                    name="Total Ongkir"
                    fill="#2563EB"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Panel 2: Hak Driver & BANTER 10% */}
          <div className="p-3 rounded-[6px] bg-slate-50/60 border border-slate-200/70">
            <div className="flex items-center justify-between pb-1.5 px-1">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500" />
                  <span>Hak Driver</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-indigo-500" />
                  <span>BANTER (10%)</span>
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Distribusi bagi hasil</span>
            </div>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  syncId={syncId}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                  barCategoryGap="28%"
                  barGap={3}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#E2E8F0"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: "#64748B", fontFamily: "sans-serif" }}
                    dy={4}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 700, fill: "#94A3B8", fontFamily: "sans-serif" }}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                    width={38}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(16, 185, 129, 0.08)", rx: 4 }}
                    content={<CustomTooltip formatValue={formatValue} />}
                  />
                  <Bar
                    dataKey="totalDriver"
                    name="Hak Driver"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={500}
                  />
                  <Bar
                    dataKey="totalBanter"
                    name="BANTER (10%)"
                    fill="#6366F1"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        /* ─── SINGLE COMBINED MULTI-BAR CHART ─────────────────────────────────── */
        <div className="p-3 rounded-[6px] bg-slate-50/60 border border-slate-200/70">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                barCategoryGap="24%"
                barGap={4}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: "#64748B", fontFamily: "sans-serif" }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 700, fill: "#94A3B8", fontFamily: "sans-serif" }}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                  width={38}
                />
                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.12)", rx: 4 }}
                  content={<CustomTooltip formatValue={formatValue} />}
                />
                <Bar
                  dataKey="totalOngkir"
                  name="Total Ongkir"
                  fill="#2563EB"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={500}
                />
                <Bar
                  dataKey="totalDriver"
                  name="Hak Driver"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={500}
                />
                <Bar
                  dataKey="totalBanter"
                  name="BANTER (10%)"
                  fill="#6366F1"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartBarSynced;

