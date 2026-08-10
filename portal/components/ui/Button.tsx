import * as React from 'react';

import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variant === 'primary' &&
          'bg-primary text-primary-foreground shadow-glow-lime-sm hover:bg-primary-hover',
        variant === 'secondary' && 'border border-border bg-card text-foreground hover:bg-muted',
        variant === 'ghost' && 'text-muted-foreground hover:bg-muted hover:text-foreground',
        size === 'default' && 'h-11 px-4',
        size === 'sm' && 'h-11 px-3 text-xs',
        size === 'icon' && 'h-11 w-11',
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
