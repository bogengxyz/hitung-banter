import React from 'react';
import { UserRole } from '../types';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md' }) => {
  const isSmall = size === 'sm';
  const padding = isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (role === 'owner') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-[4px] bg-amber-100 text-amber-800 border border-amber-300 ${padding}`}>
        <span>👑</span> Owner
      </span>
    );
  }
  if (role === 'admin') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-[4px] bg-blue-100 text-blue-800 border border-blue-300 ${padding}`}>
        <span>🛡️</span> Admin
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-[4px] bg-slate-100 text-slate-700 border border-slate-300 ${padding}`}>
      <span>👁️</span> Viewer
    </span>
  );
};
