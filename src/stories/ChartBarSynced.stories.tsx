import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ChartBarSynced } from '../components/charts/ChartBarSynced';

const meta: Meta<typeof ChartBarSynced> = {
  title: 'Charts/ChartBarSynced (Synchronized Bar Chart)',
  component: ChartBarSynced,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof ChartBarSynced>;

export const Default: Story = {
  render: () => (
    <div className="w-full max-w-4xl p-6 bg-white rounded-[6px] border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div>
          <h3 className="text-base font-black text-slate-900">Grafik Keuangan (Synchronized Bar)</h3>
          <p className="text-xs text-slate-500">Panel tersinkronisasi antara Total Ongkir dan Alokasi Bagi Hasil</p>
        </div>
      </div>
      <ChartBarSynced />
    </div>
  ),
};

export const CustomData: Story = {
  render: () => {
    const customData = [
      { label: '01 Nov', totalOngkir: 320000, totalDriver: 288000, totalBanter: 32000 },
      { label: '02 Nov', totalOngkir: 450000, totalDriver: 405000, totalBanter: 45000 },
      { label: '03 Nov', totalOngkir: 210000, totalDriver: 189000, totalBanter: 21000 },
      { label: '04 Nov', totalOngkir: 580000, totalDriver: 522000, totalBanter: 58000 },
      { label: '05 Nov', totalOngkir: 390000, totalDriver: 351000, totalBanter: 39000 },
      { label: '06 Nov', totalOngkir: 620000, totalDriver: 558000, totalBanter: 62000 },
      { label: '07 Nov', totalOngkir: 480000, totalDriver: 432000, totalBanter: 48000 },
    ];
    return (
      <div className="w-full max-w-4xl p-6 bg-white rounded-[6px] border border-slate-200 shadow-xs">
        <ChartBarSynced
          data={customData}
          formatValue={(v) => `Rp${v.toLocaleString('id-ID')}`}
        />
      </div>
    );
  },
};

