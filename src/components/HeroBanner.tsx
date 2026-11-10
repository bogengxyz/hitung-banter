import React from 'react';
import { Crown } from 'lucide-react';
import { UserProfile } from '../types';

interface HeroBannerProps {
  currentUser: UserProfile;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ currentUser }) => {
  return (
    <div className="relative overflow-hidden rounded-[8px] bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/15 p-5 sm:p-7">
      {/* Background soft pattern */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/20 blur-3xl transform translate-x-20 -translate-y-20"></div>
        <div className="absolute -bottom-10 left-1/3 w-60 h-60 rounded-full bg-sky-300/30 blur-2xl"></div>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
        {/* Left Copy */}
        <div className="max-w-md">
          <p className="text-xs sm:text-sm font-medium text-blue-100/90 tracking-wide">
            Selamat Datang,
          </p>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {currentUser.role === 'owner' ? 'Owner BANTER' : currentUser.full_name}
            </h1>
            <span className="inline-flex items-center justify-center p-1 rounded-[4px] bg-amber-400/20 text-amber-300 border border-amber-300/30 shadow-xs">
              <Crown className="w-4 h-4 fill-amber-300" />
            </span>
          </div>
          <p className="text-xs sm:text-sm text-blue-100/90 mt-2 font-normal leading-relaxed">
            Kelola pesanan, hitung hak driver, dan pantau keuangan dengan mudah &amp; transparan.
          </p>
        </div>

        {/* Right Illustration: Scooter Courier & Pin */}
        <div className="w-full md:w-auto flex justify-end items-center">
          <div className="relative w-48 sm:w-56 h-32 flex items-center justify-center">
            {/* Location Pin in sky */}
            <div className="absolute -top-1 right-3 text-blue-300/90 animate-pulse">
              <svg className="w-8 h-8 drop-shadow-md text-blue-200 fill-blue-500" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
              </svg>
            </div>

            {/* Courier Scooter Vector SVG matching reference */}
            <svg viewBox="0 0 260 160" className="w-full h-full drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Ground shadow */}
              <ellipse cx="130" cy="145" rx="85" ry="10" fill="#003585" fillOpacity="0.3" />
              
              {/* Scooter Body */}
              <path d="M70 125 C70 95 110 95 130 115 L175 115 C190 115 195 90 200 80 L185 75 L180 65 L205 65 L195 110 L210 125 C215 130 205 135 195 135 L65 135 Z" fill="#0056D2" />
              <path d="M85 105 L125 105 L135 125 L75 125 Z" fill="#2563EB" />
              
              {/* Scooter Wheels */}
              {/* Back Wheel */}
              <circle cx="80" cy="130" r="22" fill="#1E293B" />
              <circle cx="80" cy="130" r="14" fill="#E2E8F0" />
              <circle cx="80" cy="130" r="6" fill="#475569" />
              
              {/* Front Wheel */}
              <circle cx="200" cy="130" r="22" fill="#1E293B" />
              <circle cx="200" cy="130" r="14" fill="#E2E8F0" />
              <circle cx="200" cy="130" r="6" fill="#475569" />

              {/* Headlight & Handlebar */}
              <polygon points="205,65 220,70 205,75" fill="#FEF08A" opacity="0.9" />
              <rect x="180" y="60" width="22" height="6" rx="3" fill="#334155" />

              {/* Courier Rider */}
              {/* Body / Jacket with BANTER 'B' */}
              <path d="M120 75 C120 60 145 60 155 75 L165 110 L125 110 Z" fill="#1D4ED8" />
              <text x="135" y="98" fill="#FFFFFF" fontWeight="900" fontSize="18" fontFamily="Outfit, sans-serif">B</text>

              {/* Delivery Backpack with BANTER 'B' */}
              <rect x="95" y="70" width="30" height="42" rx="6" fill="#0284C7" stroke="#38BDF8" strokeWidth="1.5" />
              <text x="105" y="96" fill="#FFFFFF" fontWeight="800" fontSize="16" fontFamily="Outfit, sans-serif">B</text>

              {/* Head & Helmet */}
              <circle cx="145" cy="50" r="18" fill="#1E40AF" />
              <path d="M132 48 C132 36 158 36 158 48 Z" fill="#3B82F6" />
              {/* Face & Smile */}
              <circle cx="152" cy="52" r="7" fill="#FCD34D" />
              <path d="M152 53 Q155 57 157 53" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <circle cx="154" cy="50" r="1" fill="#78350F" />
              {/* Helmet Visor / Chin Strap */}
              <path d="M142 58 C148 62 155 60 158 56" stroke="#1E3A8A" strokeWidth="2.5" fill="none" strokeLinecap="round" />

              {/* Speed lines */}
              <line x1="40" y1="110" x2="60" y2="110" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
              <line x1="30" y1="125" x2="52" y2="125" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
              <line x1="45" y1="138" x2="62" y2="138" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
