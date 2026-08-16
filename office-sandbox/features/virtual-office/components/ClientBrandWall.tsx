'use client';

import React from 'react';
import { Html } from '@react-three/drei';
import { useOfficeStore } from '../state/office-store';
import { Sparkles, Wine, Coffee } from 'lucide-react';

export const ClientBrandWall: React.FC = () => {
  const timeOfDay = useOfficeStore((s) => s.timeOfDay);

  return (
    <group position={[0, 4.2, -9.85]}>
      {/* 1. Backlit Acrylic Panel Backing */}
      <mesh receiveShadow>
        <boxGeometry args={[7.2, 1.8, 0.08]} />
        <meshStandardMaterial
          color="#0c0d12"
          metalness={0.9}
          roughness={0.2}
          emissive="#12131c"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* 2. Soft Ambient Halo Glow */}
      <pointLight
        position={[0, 0, 0.2]}
        color={timeOfDay === 'day' ? '#ffe082' : '#D4FF00'}
        intensity={timeOfDay === 'day' ? 1.5 : 2.8}
        distance={4.5}
      />

      {/* 3. HTML High-Res Typography Overlay for Crisp Rendering */}
      <Html
        position={[0, 0, 0.06]}
        transform
        distanceFactor={6}
        className="pointer-events-none select-none"
      >
        <div className="flex flex-col items-center justify-center p-6 text-center w-[680px]">
          {/* Top Brand Tag */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#181924]/90 border border-zinc-700 text-[#D4FF00] text-xs font-mono font-bold tracking-widest uppercase mb-1 shadow-lg">
            <Coffee className="w-3.5 h-3.5" />
            <span>F&B Flagship Workspace</span>
            <Wine className="w-3.5 h-3.5" />
          </div>

          {/* Main Brand Name */}
          <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow-[0_4px_16px_rgba(212,255,0,0.3)]">
            BAR <span className="text-[#D4FF00]">|</span> DINH
          </h1>

          {/* Brand Tagline */}
          <p className="text-xs font-semibold tracking-widest uppercase text-zinc-400 mt-1">
            Specialty Coffee & Craft Cocktails · Saigon
          </p>
        </div>
      </Html>
    </group>
  );
};
