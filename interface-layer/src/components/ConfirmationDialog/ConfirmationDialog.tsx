import React from 'react';
import { AlertTriangle, Check, X, ShieldAlert } from 'lucide-react';
import { WriteActionType } from '../../types/api';

interface ConfirmationDialogProps {
  action: WriteActionType;
  prompt: string;
  details?: string;
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  action,
  prompt,
  details = 'This action will modify store data.',
  isProcessing = false,
  onConfirm,
  onCancel,
}) => {
  const getActionBadgeLabel = (act: string) => {
    switch (act) {
      case 'update_stock':
        return 'INVENTORY WRITE ACTION';
      case 'place_order':
        return 'PURCHASE ORDER ACTION';
      case 'create_bill':
        return 'INVOICE BILLING ACTION';
      default:
        return 'WRITE ACTION';
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-desc"
      className="w-full bg-[#241C17] text-[#FFFDF8] p-6 sm:p-7 border-2 border-[#B96F4A] shadow-2xl relative chamfer-panel"
    >
      {/* Header Eyebrow */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#3E322A]">
        <div className="flex items-center space-x-2.5">
          <ShieldAlert className="w-5 h-5 text-[#B96F4A]" />
          <span
            id="confirmation-title"
            className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#B96F4A]"
          >
            CONFIRMATION REQUIRED
          </span>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-[#362B23] text-[#E9DDCA] tracking-wider border border-[#5A483C]">
          {getActionBadgeLabel(action)}
        </span>
      </div>

      {/* Main Prompt */}
      <div className="my-4">
        <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#FFFDF8] leading-snug">
          {prompt}
        </h3>
        <p
          id="confirmation-desc"
          className="text-xs sm:text-sm text-[#D8CCBC] mt-2 font-mono flex items-center gap-1.5"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-[#B96F4A] shrink-0" />
          <span>{details}</span>
        </p>
      </div>

      {/* Safety Notice */}
      <div className="text-[11px] text-[#A6998C] mb-6 pt-2 border-t border-[#3E322A] flex items-center justify-between">
        <span>Authoritative Safety Layer verification pending your explicit command.</span>
        <span className="font-mono text-[#C59A5A] text-[10px]">AUTH_REQ</span>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="chamfer-btn-sm px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-[#362B23] text-[#FFFDF8] hover:bg-[#46382E] border border-[#5A483C] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
          <span>CANCEL</span>
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={isProcessing}
          className="chamfer-btn px-8 py-3 text-sm font-extrabold uppercase tracking-wider bg-[#704832] text-[#FFFDF8] hover:bg-[#865A40] active:bg-[#5C3B29] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{isProcessing ? 'SENDING CONFIRMATION...' : 'CONFIRM ACTION'}</span>
        </button>
      </div>
    </div>
  );
};
