'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export const OfficeLoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090B] text-white select-none">
      <div className="flex flex-col items-center gap-4">
        {/* Animated Brand Logo */}
        <div className="w-16 h-16 rounded-2xl bg-[#131316] border-2 border-[#D4FF00] flex items-center justify-center shadow-2xl shadow-[#D4FF00]/20 animate-pulse">
          <span className="font-black text-2xl text-[#D4FF00]">CL</span>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-white">
            Đang khởi động Văn Phòng Ảo 3D
          </h2>
          <p className="text-xs text-zinc-400">
            Nạp mô hình 3D, hệ thống vật lý Rapier và 6 nhân sự AI Marketing...
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
