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
         ══════════════════════════════════════════════════ */}
      {/* Soft warm global ambient fill */}
      <ambientLight
        intensity={isDay ? 3.2 : 2.2}
        color={isDay ? '#ffffff' : '#f1f5f9'}
      />

      {/* Hemisphere sky dome for rich color grading */}
      <hemisphereLight
        args={[
          isDay ? '#e0f2fe' : '#38bdf8',
          isDay ? '#fef3c7' : '#1e1b4b',
          isDay ? 1.8 : 1.2,
        ]}
      />

      {/* ══════════════════════════════════════════════════
          2. KEY DIRECTIONAL LIGHTS (SHADOWS & DEPTH)
         ══════════════════════════════════════════════════ */}
      {/* Main Overhead Architectural Key Light */}
      <directionalLight
        position={[4, 18, 12]}
        intensity={isDay ? 3.6 : 2.6}
        color={isDay ? '#fffdfa' : '#f8fafc'}
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

      {/* Window Daylight / Night Skyline Light from Right Side */}
      <directionalLight
        position={[18, 10, -2]}
        intensity={isDay ? 3.2 : 1.6}
        color={isDay ? '#fff7ed' : '#93c5fd'}
      />

      {/* Soft Fill from Left Wall to soften contrast */}
      <directionalLight
        position={[-16, 12, 4]}
        intensity={isDay ? 2.0 : 1.4}
        color="#f8fafc"
      />

      {/* ══════════════════════════════════════════════════
          3. FOCUSED ACCENT LIGHTS OVER WORKSTATIONS & BRAND
         ══════════════════════════════════════════════════ */}
      {/* A01 Center Command Desk */}
      <pointLight
        position={[0, 3.8, -5.0]}
        intensity={isDay ? 3.2 : 4.5}
        color={isDay ? '#fffbeb' : '#38bdf8'}
        distance={8}
        decay={1.5}
      />

      {/* BAR DINH Brand Wall */}
      <pointLight
        position={[0, 3.2, -10.2]}
        intensity={4.5}
        color="#fbbf24"
        distance={7}
        decay={1.4}
      />
      <pointLight
        position={[-5.0, 2.8, -10.5]}
        intensity={2.8}
        color="#D4FF00"
        distance={6}
        decay={1.6}
      />
      <pointLight
        position={[5.0, 2.8, -10.5]}
        intensity={2.8}
        color="#D4FF00"
        distance={6}
        decay={1.6}
      />

      {/* Left Wall Dashboard Accent */}
      <pointLight
        position={[-11.5, 3.2, -4.5]}
        intensity={3.0}
        color="#38bdf8"
        distance={7}
        decay={1.6}
      />
      <pointLight
        position={[-11.5, 3.2, 2.0]}
        intensity={2.8}
        color="#fef08a"
        distance={7}
        decay={1.6}
      />

      {/* Strategy Zone (B02 & B03) */}
      <pointLight
        position={[-7.0, 3.5, -2.0]}
        intensity={isDay ? 2.6 : 3.5}
        color="#34d399"
        distance={8}
        decay={1.6}
      />

      {/* Creative Zone (D01 & D02) */}
      <pointLight
        position={[7.0, 3.5, -2.0]}
        intensity={isDay ? 2.6 : 3.5}
        color="#f472b6"
        distance={8}
        decay={1.6}
      />

      {/* QA Review Zone (E01) */}
      <pointLight
        position={[0, 3.5, 5.5]}
        intensity={isDay ? 2.6 : 3.8}
        color="#a78bfa"
        distance={8}
        decay={1.6}
      />

      {/* AI Command Kiosk (Front Left) */}
      <pointLight
        position={[5.5, 2.2, 7.2]}
        intensity={2.5}
        color="#D4FF00"
        distance={5}
        decay={1.6}
      />
    </>
  );
};
