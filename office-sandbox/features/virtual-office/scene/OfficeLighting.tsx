'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useOfficeStore } from '../state/office-store';

/**
 * Spot — R3F SpotLight needs a real Object3D target.
 */
interface SpotProps {
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  intensity?: number;
  angle?: number;
  penumbra?: number;
  distance?: number;
  showLamp?: boolean;
}

const Spot: React.FC<SpotProps> = ({
  from,
  to,
  color = '#fff8ef',
  intensity = 6,
  angle = 0.48,
  penumbra = 0.6,
  distance = 18,
  showLamp = true,
}) => {
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current;
      lightRef.current.target.updateMatrixWorld();
    }
  }, []);

  return (
    <>
      <spotLight
        ref={lightRef}
        position={from}
        color={color}
        intensity={intensity}
        angle={angle}
        penumbra={penumbra}
        distance={distance}
        decay={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.001}
      />
      <object3D ref={targetRef} position={to} />

      {showLamp && (
        <group position={from}>
          {/* Lamp housing cone */}
          <mesh position={[0, -0.1, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.14, 0.28, 10]} />
            <meshStandardMaterial color="#1c1a22" metalness={0.88} roughness={0.12} />
          </mesh>
          {/* Glowing face inside cone */}
          <mesh position={[0, -0.2, 0]}>
            <circleGeometry args={[0.09, 12]} />
            <meshBasicMaterial color={color} />
          </mesh>
          {/* Mounting stem */}
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.22, 8]} />
            <meshStandardMaterial color="#111118" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      )}
    </>
  );
};

/**
 * CeilingPanel — Invisible light source that illuminates an area from ceiling height.
 */
interface PanelProps {
  position: [number, number, number];
  width?: number;
  depth?: number;
  color?: string;
  intensity?: number;
}

const CeilingPanel: React.FC<PanelProps> = ({
  position,
  color = '#fff5e0',
  intensity = 1.4,
}) => (
  <group position={position}>
    <pointLight
      position={[0, -0.15, 0]}
      color={color}
      intensity={intensity * 18}
      distance={9}
      decay={1.6}
    />
  </group>
);

export const OfficeLighting: React.FC = () => {
  const wh = 4.0;
  const timeOfDay = useOfficeStore((s) => s.timeOfDay);
  const isDay = timeOfDay === 'day';

  return (
    <>
      {/* ══════════════════════════════════════════════════
          1. GLOBAL FILLS (DYNAMIC FOR DAY / NIGHT)
         ══════════════════════════════════════════════════ */}

      {/* Ambient Light — warm soft fill; lower in day mode so dark CrewLab materials stay dark */}
      <ambientLight
        intensity={isDay ? 2.8 : 1.4}
        color={isDay ? '#fff9f0' : '#ffe8d0'}
      />

      {/* Hemisphere Sky Light — only in day mode, simulates sky dome fill */}
      {isDay && (
        <hemisphereLight
          args={['#e0f2fe', '#fef9c3', 2.0]}
        />
      )}

      {/* ☀️ SUNLIGHT (DAY MODE) — Radiant natural daylight streaming from right window */}
      {isDay ? (
        <>
          {/* Primary Sunlight — warm directional light from right window */}
          <directionalLight
            position={[18, 14, -2]}
            intensity={4.5}
            color="#fff7ed"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={0.5}
            shadow-camera-far={60}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
            shadow-bias={-0.0001}
          />

          {/* Secondary sunlight angle — soft bounce for left & back zones */}
          <directionalLight position={[12, 16, 6]} intensity={2.8} color="#fef3c7" />

          {/* Sky blue bounce fill from opposite side — counters harsh shadows */}
          <directionalLight position={[-16, 12, 4]} intensity={2.0} color="#e0f2fe" />

          {/* Even ambient overhead daylight fill */}
          <directionalLight position={[0, 22, 0]} intensity={2.2} color="#ffffff" />
        </>
      ) : (
        /* 🌙 NIGHT MODE LIGHTING */
        <>
          {/* Primary Warm Overhead Light */}
          <directionalLight
            position={[5, 22, 10]}
            intensity={2.0}
            color="#fff8f0"
            castShadow
            shadow-mapSize-width={4096}
            shadow-mapSize-height={4096}
            shadow-camera-near={0.5}
            shadow-camera-far={70}
            shadow-camera-left={-22}
            shadow-camera-right={22}
            shadow-camera-top={22}
            shadow-camera-bottom={-22}
            shadow-bias={-0.0001}
          />

          {/* Cool-indigo moonlight from outside right window */}
          <directionalLight position={[22, 10, 0]} intensity={0.8} color="#c7d2fe" />

          {/* Warm back-fill for wood walls */}
          <directionalLight position={[-10, 8, -18]} intensity={0.55} color="#fef3c7" />
        </>
      )}

      {/* ══════════════════════════════════════════════════
          2. CEILING LIGHT PANELS
         ══════════════════════════════════════════════════ */}
      {/* 5 center panels — soft warm white */}
      <CeilingPanel position={[0, wh - 0.04, -7.0]} color={isDay ? '#fffbeb' : '#fff5e0'} intensity={isDay ? 1.5 : 1.5} />
      <CeilingPanel position={[0, wh - 0.04, -3.5]} color={isDay ? '#fffbeb' : '#fff5e0'} intensity={isDay ? 1.5 : 1.5} />
      <CeilingPanel position={[0, wh - 0.04, 0]} color={isDay ? '#fffbeb' : '#fff5e0'} intensity={isDay ? 1.4 : 1.4} />
      <CeilingPanel position={[0, wh - 0.04, 3.5]} color={isDay ? '#fffbeb' : '#fff5e0'} intensity={isDay ? 1.3 : 1.3} />
      <CeilingPanel position={[0, wh - 0.04, 7.0]} color={isDay ? '#fffbeb' : '#fff5e0'} intensity={isDay ? 1.2 : 1.2} />

      {/* Left side — Strategy Zone */}
      <CeilingPanel position={[-6.5, wh - 0.04, -4.5]} color={isDay ? '#f0fdf4' : '#e8f4ff'} intensity={isDay ? 1.4 : 1.3} />
      <CeilingPanel position={[-6.5, wh - 0.04, 0.5]} color={isDay ? '#f0fdf4' : '#e8f4ff'} intensity={isDay ? 1.4 : 1.3} />

      {/* Right side — Creative Zone */}
      <CeilingPanel position={[6.5, wh - 0.04, -4.5]} color={isDay ? '#fef9c3' : '#fff0e0'} intensity={isDay ? 1.6 : 1.3} />
      <CeilingPanel position={[6.5, wh - 0.04, 0.5]} color={isDay ? '#fef9c3' : '#fff0e0'} intensity={isDay ? 1.6 : 1.3} />

      {/* ══════════════════════════════════════════════════
          3. CORNER SPOTLIGHTS (NIGHT MODE ONLY)
         ══════════════════════════════════════════════════ */}
      {!isDay && (
        <>
          {/* Corner 1 — Back-Left → illuminates B02 zone */}
          <Spot
            from={[-11.8, wh - 0.1, -10.0]}
            to={[-7.0, 0, -4.5]}
            color="#fff4d0"
            intensity={10}
            angle={0.55}
            penumbra={0.8}
            distance={22}
            showLamp={false}
          />

          {/* Corner 2 — Back-Right → illuminates D01 zone */}
          <Spot
            from={[11.8, wh - 0.1, -10.0]}
            to={[7.0, 0, -4.5]}
            color="#fff4d0"
            intensity={10}
            angle={0.55}
            penumbra={0.8}
            distance={22}
            showLamp={false}
          />

          {/* Corner 3 — Front-Left → illuminates lounge + B03 */}
          <Spot
            from={[-11.8, wh - 0.1, 10.0]}
            to={[-5.5, 0, 2.5]}
            color="#fff0cc"
            intensity={8}
            angle={0.52}
            penumbra={0.8}
            distance={20}
            showLamp={false}
          />

          {/* Corner 4 — Front-Right → illuminates D02 + E01 area */}
          <Spot
            from={[11.8, wh - 0.1, 10.0]}
            to={[4.5, 0, 3.0]}
            color="#fff0cc"
            intensity={8}
            angle={0.52}
            penumbra={0.8}
            distance={20}
            showLamp={false}
          />
        </>
      )}

      {/* ══════════════════════════════════════════════════
          4. AGENT DESK ACCENTS
         ══════════════════════════════════════════════════ */}
      <pointLight position={[0, 3.6, -5.0]} intensity={isDay ? 3.0 : 5.0} color="#fde68a" distance={8} decay={1.6} />
      <pointLight position={[-7.0, 3.2, -2.0]} intensity={isDay ? 2.5 : 3.8} color="#bfdbfe" distance={9} decay={1.6} />
      <pointLight position={[7.0, 3.2, -2.0]} intensity={isDay ? 3.5 : 3.8} color="#fde68a" distance={9} decay={1.6} />
      <pointLight position={[0, 3.2, 5.5]} intensity={isDay ? 2.2 : 3.5} color="#ede9fe" distance={8} decay={1.6} />

      {/* ══════════════════════════════════════════════════
          5. BRAND WALL ACCENT
         ══════════════════════════════════════════════════ */}
      <pointLight position={[0, 2.8, -10.0]} intensity={isDay ? 3.5 : 5.0} color="#C49A6C" distance={7} decay={1.4} />
      <pointLight position={[-4.0, 2.0, -10.5]} intensity={isDay ? 2.0 : 3.0} color="#D4884A" distance={5} decay={1.8} />
      <pointLight position={[4.0, 2.0, -10.5]} intensity={isDay ? 2.0 : 3.0} color="#D4884A" distance={5} decay={1.8} />
    </>
  );
};
