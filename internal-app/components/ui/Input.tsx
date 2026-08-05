import * as React from 'react';

import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground outline-none focus:border-lime-admin',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
