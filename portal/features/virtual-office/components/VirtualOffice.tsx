'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { OfficeHUD } from './OfficeHUD';
import { AccessibleTeamRoster } from './AccessibleTeamRoster';
import { OfficeLoadingScreen } from './OfficeLoadingScreen';
import { AgentFocusPopup } from './AgentFocusPopup';

const OfficeCanvas = dynamic(() => import('./OfficeCanvas').then((mod) => mod.OfficeCanvas), { ssr: false, loading: () => <OfficeLoadingScreen /> });

export function VirtualOffice() {
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') import('../state/office-store').then(({ useOfficeStore }) => useOfficeStore.getState().closeDetail()); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  return <main className="relative h-full w-full overflow-hidden bg-[#09090B]"><OfficeCanvas /><OfficeHUD /><AgentFocusPopup /><AccessibleTeamRoster /></main>;
}
