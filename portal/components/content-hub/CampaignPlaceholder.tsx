'use client';

import React from 'react';
import { Megaphone, Sparkles } from 'lucide-react';

export default function CampaignPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mb-5">
        <Megaphone size={28} className="text-muted-foreground/50" />
      </div>
      <h3 className="text-base font-bold text-foreground mb-2">Tính năng Campaign đang được xây dựng</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-4">
        Quản lý chiến dịch / sự kiện (do B01 IMC Planner xử lý) sẽ có trong phiên bản tiếp theo của CrewLab.
      </p>
      <div className="flex items-center gap-2 text-xs bg-[#D4FF00]/10 border border-[#D4FF00]/20 text-[#D4FF00] rounded-full px-4 py-2 font-medium">
        <Sparkles size={12} />
        Sắp ra mắt — Phase 5
      </div>
    </div>
  );
}
