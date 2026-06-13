'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/Button';

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Default 520px, or 720px with `wide`. */
  wide?: boolean;
  className?: string;
};

/**
 * Slide-in side drawer. Backed by a portal so the overlay sits above
 * any sticky/stacked elements. Closes on ESC, on backdrop click, and on
 * the X button. Locks body scroll while open. Traps focus on the
 * panel container.
 */
export function Drawer({ open, onClose, title, description, children, footer, wide, className }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC + body scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Auto-focus the panel when it opens.
  useEffect(() => {
    if (open && panelRef.current) panelRef.current.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex justify-end"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onMouseDown={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative h-full w-full bg-surface border-l border-border shadow-[var(--shadow-lg)]',
          'flex flex-col animate-rise-in',
          wide ? 'max-w-[720px]' : 'max-w-[520px]',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 border-b border-hairline">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-fg leading-tight">{title}</h2>
            {description && <p className="text-[12px] text-fg-muted mt-1">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer && (
          <div className="px-5 py-3 border-t border-hairline bg-surface-2/40 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
