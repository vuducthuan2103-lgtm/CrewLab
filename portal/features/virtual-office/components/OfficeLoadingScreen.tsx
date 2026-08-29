'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export const OfficeLoadingScreen: React.FC = () => {
  return (
    <div className="absolute inset-0 z-50 flex select-none flex-col items-center justify-center bg-[#09090B] text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 animate-pulse items-center justify-center border-2 border-[#D4FF00] bg-[#131316] shadow-2xl shadow-[#D4FF00]/20">
          <span className="font-black text-2xl text-[#D4FF00]">CL</span>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-white">
            Đang mở CrewLab Garden Office
          </h2>
          <p className="text-xs text-zinc-400">
            Chuẩn bị không gian làm việc và trạng thái của 6 AI agent...
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#D4FF00] font-mono mt-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang kết nối không gian...</span>
        </div>
      </div>
    </div>
  );
};
