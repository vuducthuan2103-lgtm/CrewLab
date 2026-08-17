'use client';

import React from 'react';
import { useOfficeStore } from '../state/office-store';

export const OfficeLighting: React.FC = () => {
  const timeOfDay = useOfficeStore((s) => s.timeOfDay);
  const isDay = timeOfDay === 'day';

  return (
    <>
      {/* ══════════════════════════════════════════════════
          1. GLOBAL AMBIENT & SKY ILLUMINATION
          Elevated fill so dark walls and furniture are clearly
          readable and NOT crushed to pure black silhouettes.
         ══════════════════════════════════════════════════ */}
      {/* Soft warm architectural ambient fill */}
      <ambientLight
        intensity={isDay ? 3.8 : 2.8}
        color={isDay ? '#ffffff' : '#e2e8f0'}
      />

      {/* Hemisphere sky dome for natural warm ceiling & floor bounce */}
      <hemisphereLight
        args={[
          isDay ? '#e0f2fe' : '#94a3b8',  // Sky / ceiling bounce
          isDay ? '#fed7aa' : '#334155',  // Floor warm bounce
          isDay ? 2.4 : 2.0,
        ]}
      />

      {/* ══════════════════════════════════════════════════
          2. KEY DIRECTIONAL LIGHTS (SHADOWS & ARCHITECTURAL DEFINITION)
         ══════════════════════════════════════════════════ */}
      {/* Top-Down Architectural Key Light (Balanced overhead so all walls receive identical ambient tone) */}
      <directionalLight
        position={[0, 22, 6]}
        intensity={isDay ? 3.6 : 2.6}
        color={isDay ? '#ffffff' : '#f1f5f9'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={45}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.0001}
      />

      {/* Subtle Sky Glancing Light from Glass Window */}
      <directionalLight
        position={[14, 12, 0]}
        intensity={isDay ? 1.8 : 0.8}
        color={isDay ? '#f8fafc' : '#94a3b8'}
      />

      {/* ══════════════════════════════════════════════════
          3. WORKSTATION ZONE DOWNLIGHTS (NATURAL WARM ACCENT)
          Clean warm downlights directly above each desk zone
          so agents, chairs, and monitors pop crisply.
         ══════════════════════════════════════════════════ */}
      {/* A01 Center Command Hub (Sếp Vũ) */}
      <pointLight
        position={[0, 4.5, -5.0]}
        intensity={isDay ? 3.6 : 4.8}
        color="#fffbeb"
        distance={9}
        decay={1.5}
      />

      {/* Strategy Zone (B02 & B03 Left Desks) */}
      <pointLight
        position={[-7.0, 4.2, -2.0]}
        intensity={isDay ? 3.2 : 4.2}
        color="#fef9c3"
        distance={9}
        decay={1.5}
      />

      {/* Creative Zone (D01 & D02 Right Desks) */}
      <pointLight
        position={[7.0, 4.2, -2.0]}
        intensity={isDay ? 3.2 : 4.2}
        color="#fef9c3"
        distance={9}
        decay={1.5}
      />

      {/* QA Review Zone (E01 Front Desk) */}
      <pointLight
        position={[0, 4.0, 5.5]}
        intensity={isDay ? 3.2 : 4.4}
        color="#fffbeb"
        distance={8.5}
        decay={1.5}
      />

      {/* ══════════════════════════════════════════════════
          4. ARCHITECTURAL BRAND WALL ACCENT
         ══════════════════════════════════════════════════ */}
      {/* BAR DINH Brand Wall Wash */}
      <pointLight
        position={[0, 3.8, -9.8]}
        intensity={3.8}
        color="#fef3c7"
        distance={7}
        decay={1.4}
      />
    </>
  );
};
