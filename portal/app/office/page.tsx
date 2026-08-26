'use client';

import Sidebar from '@/components/layout/Sidebar';
import { VirtualOffice } from '@/features/virtual-office/components/VirtualOffice';

export default function OfficePage() {
  return <div className="flex h-screen w-screen overflow-hidden bg-[#09090B]"><Sidebar /><div className="relative ml-[68px] min-w-0 flex-1 overflow-hidden"><VirtualOffice /></div></div>;
}
