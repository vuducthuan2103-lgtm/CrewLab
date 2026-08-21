'use client';

import React from 'react';
import { VirtualOffice } from '@/features/virtual-office/components/VirtualOffice';
import Sidebar from '@/components/layout/Sidebar';

export default function HomePage() {
  return (
    <div className="w-screen h-screen relative bg-[#09090B] overflow-hidden flex">
      {/* Portal Collapsible Left Sidebar */}
      <Sidebar />

      {/* 3D Virtual Marketing Office Tab */}
      <div className="flex-1 h-screen w-full relative ml-[68px] overflow-hidden">
        <VirtualOffice />
      </div>
    </div>
  );
}


