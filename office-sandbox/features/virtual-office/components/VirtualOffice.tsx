'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useOfficeStore } from '../state/office-store';
import { OfficeHUD } from './OfficeHUD';
import { AgentDetailSheet } from './AgentDetailSheet';
import { AccessibleTeamRoster } from './AccessibleTeamRoster';
import { DailyStandUpModal } from './DailyStandUpModal';
import { OfficeLoadingScreen } from './OfficeLoadingScreen';
import { AgentDossierView } from './AgentDossierView';
import { CEOProximityHUD } from './CEOProximityHUD';
import { AgentCode } from '../types/office';

// Dynamic import for WebGL Canvas with SSR disabled
const OfficeCanvas = dynamic(
  () => import('./OfficeCanvas').then((mod) => mod.OfficeCanvas),
  {
    ssr: false,
    loading: () => <OfficeLoadingScreen />,
  }
);

export const VirtualOffice: React.FC = () => {
  const activeTab = useOfficeStore((s) => s.activeTab);
  const setActiveTab = useOfficeStore((s) => s.setActiveTab);

  const handleSelectAgentIn3D = (code: AgentCode) => {
    setActiveTab('3d_office');
  };

  return (
    <main className="w-screen h-screen relative bg-[#09090B] overflow-hidden">
      {/* ══════════════════════════════════
          TAB 1: 3D VIRTUAL MARKETING OFFICE
         ══════════════════════════════════ */}
      <div className={`w-full h-full absolute inset-0 ${activeTab === '3d_office' ? 'block' : 'hidden'}`}>
        {/* 1. 3D WebGL Canvas Layer */}
        <OfficeCanvas />

        {/* 2. Floating CEO Proximity Interaction HUD */}
        <CEOProximityHUD />
      </div>

      {/* ══════════════════════════════════
          TAB 2: DEDICATED FULL-SCREEN AGENT DOSSIER / PROFILES
         ══════════════════════════════════ */}
      {activeTab === 'dossier' && (
        <div className="w-full h-full absolute inset-0 pt-20 z-10 overflow-hidden">
          <AgentDossierView onSelectAgentIn3D={handleSelectAgentIn3D} />
        </div>
      )}

      {/* ══════════════════════════════════
          GLOBAL HUD & OVERLAYS
         ══════════════════════════════════ */}
      {/* 3. 2D Top Header & Tab Navigation Bar */}
      <OfficeHUD />

      {/* 4. Slide-out Agent Detail Sheet (Opens on Click / Proximity 'E' key) */}
      <AgentDetailSheet />

      {/* 5. Accessible DOM Roster Modal */}
      <AccessibleTeamRoster />

      {/* 6. P2.2 A01 Daily Stand-Up Briefing Modal */}
      <DailyStandUpModal />
    </main>
  );
};
