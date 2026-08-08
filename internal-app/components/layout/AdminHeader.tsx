'use client';

import React from 'react';
import { Database, Search } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export default function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-card/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between transition-colors">
      <div>
        <h1 className="text-lg font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 border border-border text-xs text-muted-foreground">
          <Search size={13} />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="bg-transparent outline-none w-36 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* DB Status */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
          <Database size={13} className="text-cyan-admin" />
          <span>Postgres ✓</span>
        </div>
      </div>
    </header>
  );
}
