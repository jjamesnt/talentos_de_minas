import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';
import type { ConfirmModalProps } from '../../types';

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDestructive = false,
  isLoading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-all shadow-lg disabled:opacity-50 flex items-center gap-2 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
            }`}
          >
            {isLoading ? 'Processando...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4 py-2">
        {isDestructive && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>
        )}
        <p className="text-gray-300 text-sm leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
};
