import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ModalProps } from '../../types';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Box */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]`}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 shrink-0">
          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 text-gray-300 overflow-y-auto max-h-[78vh] scrollbar-thin">
          {children}
        </div>

        {footer && (
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-white/10 bg-black/30 flex justify-end gap-2.5 sm:gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
