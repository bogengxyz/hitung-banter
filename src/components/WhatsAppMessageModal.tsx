import React, { useState } from 'react';
import { Copy, Check, X, MessageSquare, ExternalLink, ShieldCheck } from 'lucide-react';

interface WhatsAppMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  messageText: string;
  recipientPhone?: string;
  recipientName?: string;
  type?: 'driver' | 'customer';
}

export const WhatsAppMessageModal: React.FC<WhatsAppMessageModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  messageText,
  recipientPhone,
  recipientName,
  type = 'customer',
}) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(messageText);
        setCopied(true);
        setCopyError(null);
        setTimeout(() => setCopied(false), 3000);
      } else {
        // Fallback for restricted clipboard
        const textArea = document.createElement('textarea');
        textArea.value = messageText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (success) {
          setCopied(true);
          setCopyError(null);
          setTimeout(() => setCopied(false), 3000);
        } else {
          throw new Error('Fallback copy failed');
        }
      }
    } catch {
      setCopyError('Gagal menyalin otomatis. Silakan blok dan salin teks preview.');
      setTimeout(() => setCopyError(null), 4000);
    }
  };

  // Convert local phone (08xxx) to WhatsApp international format (628xxx)
  const formatPhoneForWa = (phone?: string) => {
    if (!phone) return null;
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      return '62' + clean.slice(1);
    }
    if (clean.startsWith('62')) {
      return clean;
    }
    return clean;
  };

  const waPhone = formatPhoneForWa(recipientPhone);
  const waUrl = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(messageText)}`
    : null;

  // Render WhatsApp markdown (*bold*) nicely in preview
  const renderFormattedPreview = (text: string) => {
    return text.split('\n').map((line, lineIdx) => {
      // Split by *bold* tags
      const parts = line.split(/(\*[^*]+\*)/g);
      return (
        <div key={lineIdx} className="min-h-[1.25rem]">
          {parts.map((part, partIdx) => {
            if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
              return (
                <strong key={partIdx} className="font-bold text-slate-900">
                  {part.slice(1, -1)}
                </strong>
              );
            }
            if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
              return (
                <em key={partIdx} className="italic text-slate-600">
                  {part.slice(1, -1)}
                </em>
              );
            }
            if (part.startsWith('~') && part.endsWith('~') && part.length > 2) {
              return (
                <del key={partIdx} className="line-through text-slate-400">
                  {part.slice(1, -1)}
                </del>
              );
            }
            return <span key={partIdx}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-white rounded-[8px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between text-white ${
            type === 'driver'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-700'
              : 'bg-gradient-to-r from-emerald-600 to-teal-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[6px] bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">{title}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-white/20 uppercase">
                  {type === 'driver' ? 'Driver Template' : 'Customer Template'}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                {subtitle ||
                  (type === 'driver'
                    ? 'Rincian transparan pendapatan, modal, kewajiban, dan transfer bersih driver'
                    : 'Rincian pesanan dan total tagihan tanpa membocorkan pembukuan internal')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-white/80 hover:bg-white/20 cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
          {/* Recipient Badge */}
          {(recipientName || recipientPhone) && (
            <div className="flex items-center justify-between p-3 rounded-[6px] bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold text-[11px]">Tujuan Pesan:</span>
                <span className="font-bold text-slate-900">{recipientName || 'Penerima'}</span>
                {recipientPhone && (
                  <span className="text-slate-500 font-medium">({recipientPhone})</span>
                )}
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-emerald-100 text-emerald-800">
                Format WhatsApp Siap Kirim
              </span>
            </div>
          )}

          {/* Copy Toast feedback */}
          {copied && (
            <div className="p-3 rounded-[6px] bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pesan WhatsApp berhasil disalin ke clipboard! Tinggal paste di chat.</span>
            </div>
          )}

          {copyError && (
            <div className="p-3 rounded-[6px] bg-red-50 border border-red-200 text-red-700 font-semibold text-[11px]">
              {copyError}
            </div>
          )}

          {/* Message Preview Container */}
          <div>
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Preview Pesan WhatsApp
              </span>
              <span className="text-[10px] text-slate-400">
                {messageText.split('\n').length} baris • {messageText.length} karakter
              </span>
            </div>

            <div className="p-4 rounded-[6px] bg-[#EFEAE2] border border-slate-300 font-mono text-[11px] sm:text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner max-h-96 overflow-y-auto select-all">
              {renderFormattedPreview(messageText)}
            </div>
          </div>

          {/* Anti-leak notice for Customer template */}
          {type === 'customer' && (
            <div className="flex items-center gap-2 text-[10px] text-teal-800 bg-teal-50 p-2.5 rounded-[6px] border border-teal-200">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                <strong>Aman &amp; Terlindungi:</strong> Rincian pembukuan internal (bagian Admin,
                potongan BANTER 10%, saldo utang, dan pengembalian modal) otomatis disembunyikan dari
                pesan Customer.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[6px] text-slate-600 font-bold hover:bg-slate-200 cursor-pointer text-xs"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka WhatsApp</span>
              </a>
            )}

            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-5 py-2 rounded-[6px] font-bold text-xs text-white shadow-md transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : type === 'driver'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin!' : type === 'driver' ? 'Salin Pesan Driver' : 'Salin Pesan Customer'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
