'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';

type Toast = { id: string; tone: ToastTone; message: string };

const ToastCtx = createContext<{ push: (message: string, tone?: ToastTone) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none w-[min(380px,calc(100vw-2rem))]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-surface px-3.5 py-2.5 text-sm shadow-[var(--shadow-md)] animate-rise-in',
              t.tone === 'success' && 'border-success/30',
              t.tone === 'error'   && 'border-danger/30',
              t.tone === 'info'    && 'border-border',
            )}
          >
            {t.tone === 'success' && <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />}
            {t.tone === 'error'   && <AlertCircle  className="size-4 text-danger  shrink-0 mt-0.5" />}
            {t.tone === 'info'    && <Info         className="size-4 text-info    shrink-0 mt-0.5" />}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-fg-subtle hover:text-fg -mr-1"
              aria-label="dismiss"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  return ctx || { push: () => {} };
}
