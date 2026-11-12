import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none no-print">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-lg border text-xs font-medium animate-in slide-in-from-bottom-3 duration-200 ${
            t.type === 'success'
              ? 'bg-[#124234] text-white border-[#1B5745]'
              : t.type === 'error'
              ? 'bg-red-800 text-white border-red-900'
              : 'bg-[#1E3029] text-white border-[#2E453C]'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#A9E3CE] shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-[#E0A526] shrink-0" />}
            <span>{t.message}</span>
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            className="p-1 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
