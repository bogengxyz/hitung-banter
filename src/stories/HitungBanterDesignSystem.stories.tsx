import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { RoleBadge } from '../components/RoleBadge';
import {
  Wallet,
  TrendingUp,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const meta: Meta = {
  title: 'Design System/Hitung Banter Precision Tokens',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const TypographyAndNumerals: StoryObj = {
  render: () => (
    <div className="space-y-6 max-w-4xl p-6 bg-white rounded-2xl border border-slate-200">
      <div>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Typography Scale</span>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Heading 1: text-2xl font-black (24px)</h1>
        <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1">Heading 2: text-xl font-black (20px)</h2>
        <h3 className="text-base font-bold text-slate-900 mt-1">Heading 3: text-base font-bold (16px)</h3>
        <p className="text-sm font-semibold text-slate-800 mt-1">Body Semi-bold: text-sm font-semibold (14px)</p>
        <p className="text-xs text-slate-500 mt-1">Caption / Secondary: text-xs text-slate-500 (12px)</p>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Tabular Numerals (Financial Alignment)</span>
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-400 block">Ongkir Dasar</span>
            <span className="text-lg font-black text-slate-900 tabular-nums">Rp15.000</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-400 block">Bagian Admin</span>
            <span className="text-lg font-black text-amber-600 tabular-nums">Rp2.000</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] text-emerald-700 block font-bold">Hak Driver Net</span>
            <span className="text-lg font-black text-emerald-700 tabular-nums">Rp11.700</span>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const RadiusScaleHierarchy: StoryObj = {
  render: () => (
    <div className="space-y-4 max-w-4xl p-6 bg-white rounded-2xl border border-slate-200">
      <h3 className="text-base font-black text-slate-900">5-Tier Radius Hierarchy</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs font-bold">
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900">
          rounded-lg (8px)
          <span className="block text-[10px] font-normal text-blue-600 mt-1">Micro tags, chips</span>
        </div>
        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900">
          rounded-xl (12px)
          <span className="block text-[10px] font-normal text-indigo-600 mt-1">Buttons, Inputs</span>
        </div>
        <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900">
          rounded-2xl (16px)
          <span className="block text-[10px] font-normal text-purple-600 mt-1">Standard Cards</span>
        </div>
        <div className="p-3 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900">
          rounded-3xl (24px)
          <span className="block text-[10px] font-normal text-amber-600 mt-1">Hero banners</span>
        </div>
        <div className="p-3 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900">
          rounded-full
          <span className="block text-[10px] font-normal text-emerald-600 mt-1">Badges, Pills</span>
        </div>
      </div>
    </div>
  ),
};

export const ButtonsAndBadges: StoryObj = {
  render: () => (
    <div className="space-y-4 max-w-4xl p-6 bg-white rounded-2xl border border-slate-200">
      <h3 className="text-base font-black text-slate-900">Button &amp; Badge Components</h3>
      <div className="flex flex-wrap items-center gap-3">
        <button className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer">
          <Truck className="w-4 h-4" />
          <span>Primary Button</span>
        </button>
        <button className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer">
          <CheckCircle2 className="w-4 h-4" />
          <span>Secondary Dark</span>
        </button>
        <button className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer">
          <Wallet className="w-4 h-4" />
          <span>Success Emerald</span>
        </button>
        <button className="h-9 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer">
          <span>Outline Neutral</span>
        </button>
      </div>

      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
        <RoleBadge role="owner" />
        <RoleBadge role="admin" />
        <RoleBadge role="viewer" />
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Lunas
        </span>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          Tertunda
        </span>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
          Belum Lunas
        </span>
      </div>
    </div>
  ),
};

