import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { authService } from '../../lib/auth/authService';
import { AuthSession } from '../../types';

interface LoginPageProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMessage('Username dan password wajib diisi.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await authService.login(trimmedUser, trimmedPass);

      if (!result.success || !result.session) {
        setErrorMessage(result.error || 'Username atau password salah. Silakan periksa kembali.');
        setIsLoading(false);
        return;
      }

      // Check admin role strictly (owner is locked for deployment)
      if (result.session.user.role === 'owner') {
        setErrorMessage('Akun Owner saat ini dikunci untuk keamanan deployment. Silakan gunakan akun Administrator untuk login.');
        setIsLoading(false);
        return;
      }

      if (result.session.user.role !== 'admin') {
        setErrorMessage('Akses ditolak. Hanya akun Administrator yang diizinkan untuk login.');
        setIsLoading(false);
        return;
      }

      onLoginSuccess(result.session);
    } catch (err: any) {
      setErrorMessage('Terjadi gangguan koneksi ke server. Silakan coba beberapa saat lagi.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-slate-100 px-4 py-8 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* Subtle ambient background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header / Brand */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[6px] bg-white/10 backdrop-blur-md p-1.5 border border-white/20 shadow-inner flex items-center justify-center overflow-hidden">
            <img
              src="/assets/aistudio/logo_7417d4ba.png"
              alt="Logo HITUNG BANTER"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-lg font-black tracking-tight text-white">HITUNG</span>
              <span className="text-lg font-black italic tracking-wider text-blue-400">BANTER</span>
            </div>
            <span className="text-[10px] text-slate-400 tracking-wide font-medium">
              Sistem Operasional &amp; Pembukuan Driver
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Panel Admin</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto z-10">
        <div className="bg-white rounded-[8px] p-6 sm:p-8 shadow-2xl border border-slate-200/80 text-slate-900 transition-all">
          {/* Card Header with Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex w-16 h-16 rounded-[6px] bg-blue-50 border border-blue-100 p-2 items-center justify-center mb-3 shadow-xs">
              <img
                src="/assets/aistudio/logo_7417d4ba.png"
                alt="HITUNG BANTER"
                className="w-full h-full object-contain drop-shadow-xs"
              />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Selamat Datang Kembali
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Silakan login untuk mengakses panel administrasi.
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Input Username */}
            <div>
              <label
                htmlFor="username-input"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username-input"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoComplete="username"
                  autoFocus
                  disabled={isLoading}
                  placeholder="Masukkan username admin..."
                  className="w-full h-11 pl-10 pr-4 rounded-[6px] bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password-input"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoComplete="current-password"
                  disabled={isLoading}
                  placeholder="Masukkan password admin..."
                  className="w-full h-11 pl-10 pr-11 rounded-[6px] bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-hidden"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 px-5 rounded-[6px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-sm tracking-wide shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Panel Admin</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer note & credentials info */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>HITUNG BANTER v2.4</span>
            <span className="flex items-center gap-1 font-medium text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Sistem Keamanan Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="w-full max-w-md mx-auto text-center text-xs text-slate-400 z-10 pt-4">
        &copy; {new Date().getFullYear()} HITUNG BANTER. Hak Cipta Dilindungi.
      </div>
    </div>
  );
};
