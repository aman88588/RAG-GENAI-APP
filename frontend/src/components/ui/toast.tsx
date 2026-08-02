import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';

  return (
    <div
      className={`fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl px-4 py-3.5 shadow-xl animate-slide-up ${
        isSuccess ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      ) : (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <span className="flex-1 text-sm font-medium leading-snug">{message}</span>
      <button
        onClick={onClose}
        className="ml-1 rounded-lg p-1 transition-colors hover:bg-white/20"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastState {
  message: string;
  type: ToastType;
  key: number;
}

export function useToastState() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type, key: Date.now() });
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  return { toast, showToast, dismiss };
}
