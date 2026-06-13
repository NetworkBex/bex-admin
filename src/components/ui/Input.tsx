'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

const baseInput =
  'w-full bg-surface text-fg placeholder:text-fg-subtle border border-border rounded-md ' +
  'px-3 text-sm transition-[border-color,box-shadow,background] duration-150 ' +
  'hover:border-border-strong ' +
  'focus:outline-none focus:border-accent focus:shadow-[0_0_0_4px_var(--ring)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { leadingIcon?: React.ReactNode; trailingIcon?: React.ReactNode }>(
  function Input({ className, leadingIcon, trailingIcon, ...rest }, ref) {
    if (leadingIcon || trailingIcon) {
      return (
        <div className="relative">
          {leadingIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle [&>svg]:size-4">
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(baseInput, 'h-9', leadingIcon ? 'pl-9' : '', trailingIcon ? 'pr-9' : '', className)}
            {...rest}
          />
          {trailingIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle [&>svg]:size-4">
              {trailingIcon}
            </span>
          )}
        </div>
      );
    }
    return <input ref={ref} className={cn(baseInput, 'h-9', className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(baseInput, 'h-9 appearance-none pr-9 cursor-pointer', className)}
          {...rest}
        >
          {children}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-fg-subtle" viewBox="0 0 16 16" fill="none">
          <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(baseInput, 'py-2 min-h-[80px] resize-y', className)} {...rest} />;
  },
);

export function Field({
  label, hint, error, required, children, className,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="flex items-center justify-between text-[11.5px] font-semibold text-fg-muted uppercase tracking-wider">
          <span>
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </span>
          {hint && !error && <span className="text-fg-subtle font-normal normal-case tracking-normal">{hint}</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
