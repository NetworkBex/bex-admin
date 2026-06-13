import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'sunk' | 'elevated' | 'flush';

const variantStyles: Record<CardVariant, string> = {
  default:  'bg-surface border border-border shadow-[var(--shadow-sm)]',
  sunk:     'bg-surface-sunk border border-border',
  elevated: 'bg-surface border border-border shadow-[var(--shadow-md)]',
  flush:    'bg-transparent border-0',
};

export function Card({ className, variant = 'default', ...rest }: React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return <div className={cn('rounded-xl', variantStyles[variant], className)} {...rest} />;
}

export function CardHeader({ title, description, action, icon }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-fg leading-tight inline-flex items-center gap-2">
          {icon && <span className="text-accent [&>svg]:size-4 shrink-0">{icon}</span>}
          <span className="truncate">{title}</span>
        </h3>
        {description && <p className="text-xs text-fg-muted mt-1">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...rest} />;
}

export function CardDivider() {
  return <div className="h-px bg-hairline" />;
}
