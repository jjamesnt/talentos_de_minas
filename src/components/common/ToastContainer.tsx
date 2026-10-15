import React from 'react';
import { useToast } from '../../hooks/useToast';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastType } from '../../types';

const toastStyles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode; text: string }> = {
  success: {
    bg: 'bg-emerald-950/90',
    border: 'border-emerald-500/30 text-emerald-200',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    text: 'text-emerald-300',
  },
  error: {
    bg: 'bg-rose-950/90',
    border: 'border-rose-500/30 text-rose-200',
    icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    text: 'text-rose-300',
  },
  warning: {
    bg: 'bg-amber-950/90',
    border: 'border-amber-500/30 text-amber-200',
    icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    text: 'text-amber-300',
  },
  info: {
    bg: 'bg-sky-950/90',
    border: 'border-sky-500/30 text-sky-200',
    icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
    text: 'text-sky-300',
  },
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const style = toastStyles[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${style.bg} ${style.border}`}
          >
            {style.icon}
            <div className="flex-1 text-sm">
              {toast.title && <p className={`font-semibold ${style.text}`}>{toast.title}</p>}
              <p className="text-gray-200 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded-lg"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
