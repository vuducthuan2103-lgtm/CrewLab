'use client';

import React from 'react';
import { RigidBody } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { OFFICE_ROOM_CONFIG, CLIENT_BRAND_CONFIG } from '../config/office-layout';
import { useOfficeStore } from '../state/office-store';

/**
 * BrandWall — Bardinh brand wall behind A01.
 * Uses Html component to render actual text in the 3D scene.
 */
const BrandWall: React.FC = () => {
  const brand = CLIENT_BRAND_CONFIG;
  const w = OFFICE_ROOM_CONFIG.width;
  const halfD = OFFICE_ROOM_CONFIG.depth / 2;
  const wh = OFFICE_ROOM_CONFIG.wallHeight;

  return (
    <group position={[0, 0, -halfD + 0.05]}>
      {/* ── BASE WALL PANEL: warm mahogany ── */}
      <mesh position={[0, wh / 2, 0]}>
        <boxGeometry args={[w + 0.5, wh, 0.06]} />
        <meshStandardMaterial color="#1a1208" roughness={0.65} metalness={0.05} />
      </mesh>

      {/* ── ACOUSTIC WOOD SLAT PANELS ── */}
      {Array.from({ length: 30 }).map((_, idx) => (
        <mesh key={idx} position={[-12.5 + idx * 0.88, wh / 2, 0.04]} castShadow>
          <boxGeometry args={[0.46, wh - 0.5, 0.07]} />
          <meshStandardMaterial
            color={idx % 3 === 0 ? '#3d2b1a' : '#2d1e10'}
            roughness={0.6}
          />
        </mesh>
      ))}

      {/* ── BRAND SIGNAGE PANEL FRAME ── */}
      <mesh position={[0, 2.05, 0.12]}>
        <boxGeometry args={[6.0, 2.4, 0.05]} />
        <meshStandardMaterial
          color={brand.primaryColor}
          roughness={0.25}
          metalness={0.55}
          emissive={brand.primaryColor}
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Panel dark face */}
      <mesh position={[0, 2.05, 0.148]}>
        <boxGeometry args={[5.8, 2.2, 0.02]} />
        <meshStandardMaterial color="#0a0705" roughness={0.85} />
      </mesh>

      {/* ── BRAND HTML TEXT ── */}
      <group position={[0, 2.05, 0.17]}>
        <Html
          center
          distanceFactor={8}
          zIndexRange={[10, 0]}
          transform
          occlude={false}
        >
          <div
            style={{
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              userSelect: 'none',
              pointerEvents: 'none',
              width: '460px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0px',
            }}
          >
            {/* ── BAR | DINH ── */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                gap: '0px',
              }}
            >
              <span
                style={{
                  fontSize: '44px',
                  fontWeight: 900,
                  letterSpacing: '0.22em',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  textShadow: `0 0 28px rgba(255,255,255,0.65), 0 0 10px ${brand.accentColor}88`,
                }}
              >
                BAR
              </span>

              <span
                style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '42px',
                  backgroundColor: brand.accentColor,
                  margin: '0 14px',
                  flexShrink: 0,
                  boxShadow: `0 0 10px ${brand.accentColor}`,
                }}
              />

              <span
                style={{
                  fontSize: '44px',
                  fontWeight: 900,
                  letterSpacing: '0.22em',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  textShadow: `0 0 28px rgba(255,255,255,0.65), 0 0 10px ${brand.accentColor}88`,
                }}
              >
                DINH
              </span>
            </div>

            {/* ── SUBTITLE ── */}
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.38em',
                color: brand.accentColor,
                textTransform: 'uppercase',
                marginTop: '10px',
                opacity: 0.9,
              }}
            >
              COFFEE IN SUNSET
            </div>
          </div>
        </Html>
      </group>

      {/* Warm accent trim on panel */}
      <mesh position={[0, 3.18, 0.12]}>
        <boxGeometry args={[5.8, 0.04, 0.02]} />
        <meshStandardMaterial
          color={brand.primaryColor}
          emissive={brand.primaryColor}
          emissiveIntensity={2.0}
        />
      </mesh>
      <mesh position={[0, 0.92, 0.12]}>
        <boxGeometry args={[5.8, 0.04, 0.02]} />
        <meshStandardMaterial
          color={brand.primaryColor}
          emissive={brand.primaryColor}
          emissiveIntensity={2.0}
        />
      </mesh>

      {/* Baseboard strip */}
      <mesh position={[0, 0.07, 0.09]}>
        <boxGeometry args={[w - 0.8, 0.12, 0.04]} />
        <meshStandardMaterial
          color={brand.primaryColor}
          emissive={brand.primaryColor}
          emissiveIntensity={1.5}
        />
      </mesh>

      <mesh position={[0, 0.20, 0.09]}>
        <boxGeometry args={[w * 0.35, 0.025, 0.02]} />
        <meshStandardMaterial color="#D4FF00" emissive="#D4FF00" emissiveIntensity={2.0} />
      </mesh>
    </group>
  );
};

export const OfficeRoom: React.FC = () => {
  const { width, depth, wallHeight } = OFFICE_ROOM_CONFIG;
  const halfW = width / 2;
  const halfD = depth / 2;
  const wallThickness = 0.6;

  const timeOfDay = useOfficeStore((s) => s.timeOfDay);
  const isDay = timeOfDay === 'day';

  return (
    <group>
      {/* ═══════════════════════════════════════
          1. FLOOR — Dynamic Day/Night Polish
         ═══════════════════════════════════════ */}

      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.25, 0]} receiveShadow>
          <boxGeometry args={[width, 0.5, depth]} />
          <meshStandardMaterial
            color={isDay ? '#2a3350' : '#1a1830'}
            roughness={0.18}
            metalness={0.35}
          />
        </mesh>
      </RigidBody>

      {/* Tech grid tiles */}
      {Array.from({ length: 14 }).map((_, xi) =>
        Array.from({ length: 12 }).map((_, zi) => (
          <mesh
            key={`${xi}-${zi}`}
            position={[-12 + xi * 1.86, 0.003, -10 + zi * 1.86]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[1.78, 1.78]} />
            <meshStandardMaterial
              color={isDay
                ? (xi + zi) % 2 === 0 ? '#344060' : '#2c3856'
                : (xi + zi) % 2 === 0 ? '#252340' : '#1e1c38'
              }
              roughness={isDay ? 0.25 : 0.15}
              metalness={isDay ? 0.3 : 0.4}
            />
          </mesh>
        ))
      )}

      {/* Neon grid accent lines */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width - 1, 0.04]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width - 1, 0.015]} />
        <meshBasicMaterial color="#93c5fd" />
      </mesh>

      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, depth - 1]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>

      <mesh position={[-3.8, 0.006, -2.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.025, depth - 2]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>

      <mesh position={[3.8, 0.006, -2.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.025, depth - 2]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>

      {/* ── ZONE OVERLAYS ── */}
      <mesh position={[0, 0.004, -5.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6.0, 4.5]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.9} transparent opacity={0.18} />
      </mesh>
      <mesh position={[-7.0, 0.004, -2.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.0, 9.0]} />
        <meshStandardMaterial color="#0c3028" roughness={0.9} transparent opacity={0.18} />
      </mesh>
      <mesh position={[7.0, 0.004, -2.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.0, 9.0]} />
        <meshStandardMaterial color="#2d1060" roughness={0.9} transparent opacity={0.18} />
      </mesh>
      <mesh position={[0, 0.004, 5.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.5, 3.5]} />
        <meshStandardMaterial color="#1a0a30" roughness={0.9} transparent opacity={0.18} />
      </mesh>

      {/* ═══════════════════════════════════════
          2. WALLS
         ═══════════════════════════════════════ */}

      {/* BACK WALL: Bardinh Brand Wall */}
      <RigidBody type="fixed" colliders="hull">
        <BrandWall />
      </RigidBody>

      {/* LEFT WALL: Solid acoustic wall */}
      <RigidBody type="fixed" colliders="hull">
        <mesh position={[-halfW - wallThickness / 2, wallHeight / 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[wallThickness, wallHeight, depth]} />
          <meshStandardMaterial color="#18171a" roughness={0.85} />
        </mesh>
      </RigidBody>
      {/* Left wall slats */}
      {Array.from({ length: 12 }).map((_, idx) => (
        <mesh key={idx} position={[-halfW + 0.05, wallHeight / 2 + 0.5, -9 + idx * 1.7]} castShadow>
          <boxGeometry args={[0.06, wallHeight - 1.0, 0.32]} />
          <meshStandardMaterial color={idx % 2 === 0 ? '#2d221c' : '#1e1510'} roughness={0.6} />
        </mesh>
      ))}

      {/* ══════════════════════════════════════════════════════════════
          3. RIGHT WALL — PANORAMIC GLASS FACADE & REALISTIC OUTDOOR SCENE
         ══════════════════════════════════════════════════════════════ */}
      <RigidBody type="fixed" colliders="hull">
        {/* Top Header Mullion (Sleek dark aluminum profile) */}
        <mesh position={[halfW, wallHeight - 0.05, 0]}>
          <boxGeometry args={[0.16, 0.10, depth]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Bottom Sill Mullion */}
        <mesh position={[halfW, 0.05, 0]}>
          <boxGeometry args={[0.16, 0.10, depth]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* Sparse Vertical Architectural Mullions (5 columns across 22m = ~4.4m wide panoramic bays) */}
        {[-8.8, -4.4, 0, 4.4, 8.8].map((zPos, idx) => (
          <mesh key={`mullion-${idx}`} position={[halfW, wallHeight / 2, zPos]}>
            <boxGeometry args={[0.14, wallHeight, 0.06]} />
            <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.15} />
          </mesh>
        ))}

        {/* Ultra-Clear Seamless Architectural Glass Pane */}
        <mesh position={[halfW, wallHeight / 2, 0]} receiveShadow>
          <boxGeometry args={[0.04, wallHeight - 0.12, depth - 0.12]} />
          <meshPhysicalMaterial
            color={isDay ? '#ffffff' : '#e0e7ff'}
            transparent
            opacity={0.18}
            roughness={0.01}
            metalness={0.05}
            transmission={0.96}
            ior={1.52}
            reflectivity={0.6}
          />
        </mesh>
      </RigidBody>

      {/* ══════════════════════════════════════════════════════════════
          🏙️ OUTDOOR BALCONY TERRACE (HARMONIOUS LUXURY FINISH)
         ══════════════════════════════════════════════════════════════ */}
      <group position={[halfW, 0, 0]}>
        {/* 1. OUTDOOR BALCONY TERRACE DECK (Warm luxury cedar wood deck) */}
        <mesh position={[1.5, -0.06, 0]} receiveShadow>
          <boxGeometry args={[3.0, 0.12, depth]} />
          <meshStandardMaterial
            color={isDay ? '#3e2723' : '#1a100c'}
            roughness={0.65}
            metalness={0.08}
          />
        </mesh>

        {/* Outer Ground Base below balcony */}
        <mesh position={[8.0, -0.6, 0]} receiveShadow>
          <boxGeometry args={[16.0, 0.5, depth + 8]} />
          <meshStandardMaterial
            color={isDay ? '#334155' : '#0f172a'}
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>

        {/* 2. GLASS BALUSTRADE / GUARDRAIL (Ultra-clear, no milky haze) */}
        <mesh position={[2.9, 0.55, 0]}>
          <boxGeometry args={[0.04, 1.1, depth - 0.2]} />
          <meshPhysicalMaterial
            color={isDay ? '#ffffff' : '#a5b4fc'}
            transparent
            opacity={0.15}
            roughness={0.05}
            transmission={0.95}
          />
        </mesh>
        {/* Balustrade Top Handrail */}
        <mesh position={[2.9, 1.12, 0]}>
          <boxGeometry args={[0.10, 0.05, depth]} />
          <meshStandardMaterial color="#09090b" metalness={0.95} roughness={0.1} />
        </mesh>
        {/* Balustrade Metal Posts */}
        {[-9, -5.4, -1.8, 1.8, 5.4, 9].map((zPos, postIdx) => (
          <mesh key={`post-${postIdx}`} position={[2.9, 0.55, zPos]}>
            <boxGeometry args={[0.08, 1.1, 0.08]} />
            <meshStandardMaterial color="#09090b" metalness={0.95} roughness={0.1} />
          </mesh>
        ))}

        {/* 3. BALCONY OUTDOOR PLANTERS & GREENERY */}
        {[-7.5, -2.5, 2.5, 7.5].map((zPos, pIdx) => (
          <group key={`balcony-plant-${pIdx}`} position={[2.1, 0.0, zPos]}>
            {/* Planter Box (Matte Dark Stone) */}
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[0.6, 0.6, 1.1]} />
              <meshStandardMaterial color={isDay ? '#1e293b' : '#0f172a'} roughness={0.7} />
            </mesh>
            {/* Foliage (Natural Deep Garden Greens) */}
            <mesh position={[0, 0.75, 0]} castShadow>
              <sphereGeometry args={[0.45, 14, 14]} />
              <meshStandardMaterial color={isDay ? '#15803d' : '#064e3b'} roughness={0.8} />
            </mesh>
            <mesh position={[0.1, 0.95, 0.15]} castShadow>
              <sphereGeometry args={[0.32, 12, 12]} />
              <meshStandardMaterial color={isDay ? '#16a34a' : '#047857'} roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>



      {/* FRONT ENTRANCE WALL */}
      <RigidBody type="fixed" colliders="hull">
        <mesh position={[-halfW / 2 - 1.5, wallHeight / 2, halfD + wallThickness / 2]} receiveShadow castShadow>
          <boxGeometry args={[halfW - 3, wallHeight, wallThickness]} />
          <meshStandardMaterial color="#18171a" roughness={0.8} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="hull">
        <mesh position={[halfW / 2 + 1.5, wallHeight / 2, halfD + wallThickness / 2]} receiveShadow castShadow>
          <boxGeometry args={[halfW - 3, wallHeight, wallThickness]} />
          <meshStandardMaterial color="#18171a" roughness={0.8} />
        </mesh>
      </RigidBody>

      {/* LOUNGE CORNER */}
      <group position={[-8.5, 0, 6.5]} rotation={[0, 0.6, 0]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[2.4, 0.38, 0.9]} />
          <meshStandardMaterial color="#2a2730" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.58, -0.38]} castShadow>
          <boxGeometry args={[2.4, 0.48, 0.22]} />
          <meshStandardMaterial color="#1e1c22" roughness={0.8} />
        </mesh>
        <mesh position={[-1.1, 0.44, 0]} castShadow>
          <boxGeometry args={[0.22, 0.28, 0.9]} />
          <meshStandardMaterial color="#1e1c22" roughness={0.8} />
        </mesh>
        <mesh position={[1.1, 0.44, 0]} castShadow>
          <boxGeometry args={[0.22, 0.28, 0.9]} />
          <meshStandardMaterial color="#1e1c22" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.22, 0.95]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.05, 0.65]} />
          <meshStandardMaterial color="#3e2713" roughness={0.4} metalness={0.05} />
        </mesh>
        {[[-0.55, 0.1, 0.95], [0.55, 0.1, 0.95]].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <cylinderGeometry args={[0.022, 0.022, 0.2]} />
            <meshStandardMaterial color="#09090b" metalness={0.9} />
          </mesh>
        ))}
        <mesh position={[0.2, 0.29, 0.95]}>
          <cylinderGeometry args={[0.04, 0.035, 0.09, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
      </group>

      {/* PLANTS */}
      <group position={[-10.5, 0, 4.5]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.4, 0.28, 0.88, 16]} />
          <meshStandardMaterial color="#f5f0eb" roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.2, 0]} castShadow>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshStandardMaterial color="#16a34a" roughness={0.7} />
        </mesh>
        <mesh position={[0.22, 1.58, 0.1]} castShadow>
          <sphereGeometry args={[0.46, 16, 16]} />
          <meshStandardMaterial color="#15803d" roughness={0.7} />
        </mesh>
        <mesh position={[-0.2, 1.62, -0.05]} castShadow>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#166534" roughness={0.7} />
        </mesh>
      </group>

      <group position={[10.5, 0, 6.5]}>
        <mesh position={[0, 0.38, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.22, 0.75, 16]} />
          <meshStandardMaterial color="#2d2420" roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.05, 0]} castShadow>
          <sphereGeometry args={[0.48, 16, 16]} />
          <meshStandardMaterial color="#15803d" roughness={0.65} />
        </mesh>
      </group>

      {/* Small plants on desks */}
      <group position={[-9.5, 0.8, -5.8]}>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.14, 8]} />
          <meshStandardMaterial color="#dde5cc" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#4ade80" roughness={0.6} />
        </mesh>
      </group>

      {/* WHITEBOARD */}
      <group position={[-halfW + 0.1, 2.0, 2.0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[3.5, 2.0, 0.06]} />
          <meshStandardMaterial color="#1a1a20" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.035]}>
          <boxGeometry args={[3.3, 1.82, 0.02]} />
          <meshStandardMaterial color="#f4f4f5" roughness={0.95} />
        </mesh>
        <mesh position={[-1.0, 0.4, 0.06]}>
          <boxGeometry args={[0.38, 0.38, 0.01]} />
          <meshBasicMaterial color="#D4FF00" />
        </mesh>
        <mesh position={[-0.5, 0.4, 0.06]}>
          <boxGeometry args={[0.38, 0.38, 0.01]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
        <mesh position={[0.0, 0.4, 0.06]}>
          <boxGeometry args={[0.38, 0.38, 0.01]} />
          <meshBasicMaterial color="#fb923c" />
        </mesh>
        <mesh position={[0.5, 0.4, 0.06]}>
          <boxGeometry args={[0.38, 0.38, 0.01]} />
          <meshBasicMaterial color="#e879f9" />
        </mesh>
        <mesh position={[0, -0.92, 0.04]}>
          <boxGeometry args={[3.3, 0.04, 0.02]} />
          <meshBasicMaterial color="#D4FF00" />
        </mesh>
      </group>

      {/* ENTRANCE SIGN */}
      <group position={[0, wallHeight - 0.3, halfD + 0.1]}>
        <mesh>
          <boxGeometry args={[3.8, 0.35, 0.08]} />
          <meshStandardMaterial color="#0d0b09" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.19, 0]}>
          <boxGeometry args={[3.8, 0.04, 0.04]} />
          <meshBasicMaterial color="#D4FF00" />
        </mesh>
      </group>
    </group>
  );
};
