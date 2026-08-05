import * as React from 'react';

import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-lime-admin text-black hover:opacity-90',
        variant === 'secondary' && 'border border-border bg-muted/30 text-foreground hover:bg-muted/60',
        variant === 'danger' && 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20',
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

