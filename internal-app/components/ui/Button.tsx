import * as React from 'react';

import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variant === 'primary' &&
          'bg-primary text-primary-foreground shadow-glow-lime-sm hover:bg-primary-hover',
        variant === 'secondary' && 'border border-border bg-muted/30 text-foreground hover:bg-muted/60',
        variant === 'danger' && 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20',
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

