"use client";

import React from "react";
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

export interface ChartBarDepthDataPoint {
  label: string;
  totalOngkir: number;
  totalDriver: number;
  totalBanter: number;
}

export interface ChartBarDepthProps {
  data?: ChartBarDepthDataPoint[];
  formatValue?: (value: number) => string;
}

// ─── Default Sample Data (Fallback when rendered with zero props) ──────────

export const DEFAULT_SAMPLE_DATA: ChartBarDepthDataPoint[] = [
  { label: "Sen", totalOngkir: 125000, totalDriver: 112500, totalBanter: 12500 },
  { label: "Sel", totalOngkir: 185000, totalDriver: 166500, totalBanter: 18500 },
  { label: "Rab", totalOngkir: 240000, totalDriver: 216000, totalBanter: 24000 },
  { label: "Kam", totalOngkir: 160000, totalDriver: 144000, totalBanter: 16000 },
  { label: "Jum", totalOngkir: 310000, totalDriver: 279000, totalBanter: 31000 },
  { label: "Sab", totalOngkir: 280000, totalDriver: 252000, totalBanter: 28000 },
  { label: "Min", totalOngkir: 195000, totalDriver: 175500, totalBanter: 19500 },
];

// ─── Custom 3D Bar Shape ─────────────────────────────────────────────────────

interface BarShape3DProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  depth?: number;
  topColor?: string;
  sideColor?: string;
}

const Bar3DShape = (props: BarShape3DProps) => {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    fill = "#2563EB",
    depth = 7,
    topColor,
    sideColor,
  } = props;

  if (!height || isNaN(height) || height <= 0 || !width || isNaN(width) || width <= 0) {
    return null;
  }

  // Clamp effective depth to prevent polygon inversion on low values
  const effectiveDepth = Math.max(2, Math.min(depth, height * 0.6));

  const top = topColor ?? lighten(fill, 0.32);
  const side = sideColor ?? darken(fill, 0.28);

  return (
    <g className="transition-opacity hover:opacity-95">
      {/* Ground contact shadow under bar */}
      <ellipse
        cx={x + width / 2 + effectiveDepth / 2}
        cy={y + height + 2}
        rx={width * 0.55}
        ry={effectiveDepth * 0.35}
        fill="rgba(15, 23, 42, 0.08)"
      />

      {/* Front face */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        rx={1.5}
      />

      {/* Top face (parallelogram) */}
      <polygon
        points={`
          ${x},${y}
          ${x + effectiveDepth},${y - effectiveDepth}
          ${x + width + effectiveDepth},${y - effectiveDepth}
          ${x + width},${y}
        `}
        fill={top}
      />

      {/* Right side face */}
      <polygon
        points={`
          ${x + width},${y}
          ${x + width + effectiveDepth},${y - effectiveDepth}
          ${x + width + effectiveDepth},${y + height - effectiveDepth}
          ${x + width},${y + height}
        `}
        fill={side}
      />
    </g>
  );
};

// ─── Colour helpers ────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.min(255, Math.max(0, Math.round(v)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────

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

  const labels: Record<string, string> = {
    totalOngkir: "Total Ongkir",
    totalDriver: "Hak Driver",
    totalBanter: "BANTER (10%)",
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-3 rounded-[6px] shadow-xl border border-slate-700 text-xs min-w-[190px]">
      <div className="font-bold text-slate-300 border-b border-slate-700/80 pb-1.5 mb-2 flex items-center justify-between">
        <span>{label}</span>
      </div>
      <div className="space-y-1.5">
        {payload.map((entry) => {
          const key = (entry.dataKey as string) || entry.name;
          const displayName = labels[key] ?? entry.name;
          return (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
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

// ─── Main Component ────────────────────────────────────────────────────────

const SERIES = [
  { key: "totalOngkir", label: "Total Ongkir", color: "#2563EB" },
  { key: "totalDriver", label: "Hak Driver",   color: "#10B981" },
  { key: "totalBanter", label: "BANTER (10%)", color: "#6366F1" },
] as const;

const DEPTH = 7;

export const ChartBarDepth: React.FC<ChartBarDepthProps> = ({
  data = DEFAULT_SAMPLE_DATA,
  formatValue = (v) => v.toLocaleString("id-ID"),
}) => {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs gap-2">
        <span>Tidak ada data transaksi pada rentang periode ini</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: DEPTH + 4, right: DEPTH + 12, left: 0, bottom: 0 }}
        barCategoryGap="28%"
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
          width={36}
        />
        <Tooltip
          cursor={{ fill: "rgba(226,232,240,0.4)", rx: 4 }}
          content={
            <CustomTooltip formatValue={formatValue} />
          }
        />
        {SERIES.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color}
            radius={[2, 2, 0, 0]}
            shape={(shapeProps: any) => (
              <Bar3DShape
                {...shapeProps}
                fill={s.color}
                depth={DEPTH}
              />
            )}
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-out"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ChartBarDepth;
