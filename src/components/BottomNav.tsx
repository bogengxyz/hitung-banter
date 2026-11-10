import React from 'react';
import { Home, Calculator, ClipboardList, BarChart3, Settings } from 'lucide-react';
import { MainNavTab } from './MainMenuGrid';

interface BottomNavProps {
  currentTab: MainNavTab;
  onNavigate: (tab: MainNavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onNavigate }) => {
  const tabs = [
    { id: 'home' as MainNavTab, label: 'Beranda', icon: Home },
    { id: 'calculator' as MainNavTab, label: 'Kalkulator', icon: Calculator },
    { id: 'orders' as MainNavTab, label: 'Pesanan', icon: ClipboardList },
    { id: 'reports' as MainNavTab, label: 'Laporan', icon: BarChart3 },
    { id: 'settings' as MainNavTab, label: 'Pengaturan', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-2 py-1 md:hidden">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-[6px] transition-all cursor-pointer relative ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-blue-600 rounded-[2px]" />
                )}
              </div>
              <span className="text-[11px] mt-1.5 leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
