'use client';

import React from 'react';
import PortalLayout from '@/components/layout/PortalLayout';
import { BarChart3, Sparkles } from 'lucide-react';

export default function ReportsPage() {
  return (
    <PortalLayout>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center">
          <BarChart3 size={15} className="text-[#D4FF00]" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Báo cáo</h1>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-3xl bg-muted/50 border border-border flex items-center justify-center mb-6">
          <BarChart3 size={36} className="text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-3">Báo cáo đang được xây dựng</h2>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
          Báo cáo hiệu quả nội dung tự động — reach, engagement, ROI theo từng Trụ nội dung — sẽ ra mắt khi CrewLab hoàn thiện tích hợp phân tích dữ liệu.
        </p>
        <div className="flex items-center gap-2 text-xs bg-[#D4FF00]/10 border border-[#D4FF00]/20 text-[#D4FF00] rounded-full px-5 py-2.5 font-medium">
          <Sparkles size={13} />
          Sắp ra mắt — Phase 4 (G01–G04 Analytics Agents)
        </div>
      </div>
    </PortalLayout>
  );
}
