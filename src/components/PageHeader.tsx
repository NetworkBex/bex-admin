import { cn } from '@/lib/utils';

export function PageHeader({
  title, description, eyebrow, actions, className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6', className)}>
      <div>
        {eyebrow && (
          <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent font-semibold mb-1.5">{eyebrow}</div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-fg leading-tight">{title}</h1>
        {description && <p className="text-sm text-fg-muted mt-1.5 max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
