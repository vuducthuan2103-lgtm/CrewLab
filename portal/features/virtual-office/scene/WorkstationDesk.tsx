'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useOfficeStore } from '../state/office-store';

export type ScreenType = 'coordination' | 'strategy' | 'calendar' | 'copywriting' | 'design' | 'qa';

interface WorkstationDeskProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  screenColor?: string;
  hasDualMonitors?: boolean;
  screenType?: ScreenType;
}



/**
 * Screen Content Renderer with Stylized UI Elements for each Role
 */
const MonitorScreenFace: React.FC<{ type: ScreenType; isSecondary?: boolean; isTertiary?: boolean }> = ({
  type,
  isSecondary = false,
  isTertiary = false,
}) => {
  // Screen background color depending on role and monitor index
  const getScreenBg = () => {
    switch (type) {
      case 'coordination':
        return isSecondary ? '#041d33' : isTertiary ? '#06202c' : '#081e3d';
      case 'strategy':
        return isSecondary ? '#062b21' : '#04241a';
      case 'calendar':
        return isSecondary ? '#062828' : '#042125';
      case 'copywriting':
        return isSecondary ? '#261b04' : '#1e1402';
      case 'design':
        return isSecondary ? '#280c2e' : isTertiary ? '#1f0d2c' : '#22082b';
      case 'qa':
        return isSecondary ? '#1f0d38' : '#15062a';
      default:
        return '#09090b';
    }
  };

  const getPrimaryAccent = () => {
    switch (type) {
      case 'coordination':
        return '#38bdf8';
      case 'strategy':
        return '#34d399';
      case 'calendar':
        return '#2dd4bf';
      case 'copywriting':
        return '#fbbf24';
      case 'design':
        return '#e879f9';
      case 'qa':
        return '#a78bfa';
      default:
        return '#D4FF00';
    }
  };

  const accent = getPrimaryAccent();
  const bg = getScreenBg();

  return (
    <group position={[0, 0, 0.016]}>
      {/* Background Display */}
      <mesh>
        <planeGeometry args={[0.88, 0.48]} />
        <meshBasicMaterial color={bg} />
      </mesh>

      {/* Top Header Bar */}
      <mesh position={[0, 0.2, 0.001]}>
        <planeGeometry args={[0.84, 0.04]} />
        <meshBasicMaterial color="#181824" />
      </mesh>
      <mesh position={[-0.36, 0.2, 0.002]}>
        <circleGeometry args={[0.01, 8]} />
        <meshBasicMaterial color={accent} />
      </mesh>
      <mesh position={[-0.32, 0.2, 0.002]}>
        <planeGeometry args={[0.12, 0.012]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Role-Specific UI Widgets */}
      {type === 'coordination' && (
        <group position={[0, -0.02, 0.002]}>
          {/* Central Workflow Graph Nodes */}
          <mesh position={[-0.25, 0.06, 0]}>
            <circleGeometry args={[0.035, 12]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <circleGeometry args={[0.045, 12]} />
            <meshBasicMaterial color="#D4FF00" />
          </mesh>
          <mesh position={[0.25, 0.06, 0]}>
            <circleGeometry args={[0.035, 12]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          {/* Connecting Lines */}
          <mesh position={[-0.125, 0.06, -0.001]}>
            <planeGeometry args={[0.2, 0.008]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          <mesh position={[0.125, 0.06, -0.001]}>
            <planeGeometry args={[0.2, 0.008]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          {/* Lower Telemetry Bars */}
          {[-0.3, -0.1, 0.1, 0.3].map((x, i) => (
            <mesh key={i} position={[x, -0.12, 0]}>
              <planeGeometry args={[0.14, 0.08 + (i % 2) * 0.04]} />
              <meshBasicMaterial color={i === 1 ? '#D4FF00' : '#0284c7'} />
            </mesh>
          ))}
        </group>
      )}

      {type === 'strategy' && (
        <group position={[0, -0.02, 0.002]}>
          {/* 4 Pillar Grid */}
          {[
            [-0.2, 0.06],
            [0.2, 0.06],
            [-0.2, -0.1],
            [0.2, -0.1],
          ].map(([x, y], i) => (
            <mesh key={i} position={[x, y, 0]}>
              <planeGeometry args={[0.34, 0.12]} />
              <meshBasicMaterial color={i === 0 ? '#059669' : '#064e3b'} />
            </mesh>
          ))}
        </group>
      )}

      {type === 'calendar' && (
        <group position={[0, -0.02, 0.002]}>
          {/* 7-Day Timeline Matrix Columns */}
          {Array.from({ length: 7 }).map((_, i) => (
            <mesh key={i} position={[-0.34 + i * 0.113, -0.02, 0]}>
              <planeGeometry args={[0.09, 0.3]} />
              <meshBasicMaterial color={i === 2 || i === 5 ? '#0d9488' : '#115e59'} />
            </mesh>
          ))}
        </group>
      )}

      {type === 'copywriting' && (
        <group position={[0, -0.02, 0.002]}>
          {/* Document Lines Simulation */}
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} position={[-0.05, 0.1 - i * 0.05, 0]}>
              <planeGeometry args={[0.65 - (i % 3) * 0.15, 0.02]} />
              <meshBasicMaterial color={i === 0 ? '#fbbf24' : '#78350f'} />
            </mesh>
          ))}
        </group>
      )}

      {type === 'design' && (
        <group position={[0, -0.02, 0.002]}>
          {/* 1:1 Instagram Visual Canvas */}
          <mesh position={[-0.14, -0.02, 0]}>
            <planeGeometry args={[0.32, 0.32]} />
            <meshBasicMaterial color="#701a75" />
          </mesh>
          {/* Inner Preview Art */}
          <mesh position={[-0.14, 0.02, 0.001]}>
            <circleGeometry args={[0.08, 16]} />
            <meshBasicMaterial color="#f43f5e" />
          </mesh>
          {/* Right Color Palette Swatches */}
          {[0.08, 0.0, -0.08, -0.16].map((y, i) => (
            <mesh key={i} position={[0.22, y, 0]}>
              <planeGeometry args={[0.22, 0.05]} />
              <meshBasicMaterial color={['#f43f5e', '#e879f9', '#D4FF00', '#38bdf8'][i]} />
            </mesh>
          ))}
        </group>
      )}

      {type === 'qa' && (
        <group position={[0, -0.02, 0.002]}>
          {/* Checklist Verification Rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <group key={i} position={[0, 0.1 - i * 0.055, 0]}>
              {/* Checkmark Icon */}
              <mesh position={[-0.32, 0, 0]}>
                <circleGeometry args={[0.018, 10]} />
                <meshBasicMaterial color={i === 3 ? '#ef4444' : '#10b981'} />
              </mesh>
              {/* Text item bar */}
              <mesh position={[0.02, 0, 0]}>
                <planeGeometry args={[0.54, 0.024]} />
                <meshBasicMaterial color="#3b0764" />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
};

export const WorkstationDesk: React.FC<WorkstationDeskProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  hasDualMonitors = true,
  screenType = 'coordination',
}) => {
  const timeOfDay = useOfficeStore((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night';

  const isA01 = screenType === 'coordination';
  const isD02 = screenType === 'design';
  const isD01 = screenType === 'copywriting';
  const isB02 = screenType === 'strategy';
  const isB03 = screenType === 'calendar';
  const isE01 = screenType === 'qa';

  // A01 and D02 get triple monitor arrays
  const hasTripleMonitors = isA01 || isD02;

  return (
    <group position={position} rotation={rotation}>
      {/* ═════════════════════════════════════════════
          1. MAIN EXECUTIVE WORKSTATION DESK
         ═════════════════════════════════════════════ */}
      <RigidBody type="fixed" colliders="cuboid">
        {/* Solid Dark Walnut Desktop with Beveled Chamfer */}
        <mesh position={[0, 0.765, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.3, 0.05, 1.15]} />
          <meshStandardMaterial
            color={isA01 ? '#202434' : isNight ? '#222636' : '#282f42'}
            roughness={0.35}
            metalness={0.2}
          />
        </mesh>

        {/* Warm Walnut / Lime Edge Trim */}
        <mesh position={[0, 0.74, 0.57]}>
          <boxGeometry args={[2.28, 0.012, 0.012]} />
          <meshBasicMaterial color={isA01 ? '#D4FF00' : isD02 ? '#e879f9' : '#38bdf8'} />
        </mesh>

        {/* Metal Frame & Legs (Matte Charcoal Anodized Aluminum) */}
        <mesh position={[-1.02, 0.375, 0]} castShadow>
          <boxGeometry args={[0.07, 0.74, 1.0]} />
          <meshStandardMaterial color="#121216" roughness={0.25} metalness={0.85} />
        </mesh>
        <mesh position={[1.02, 0.375, 0]} castShadow>
          <boxGeometry args={[0.07, 0.74, 1.0]} />
          <meshStandardMaterial color="#121216" roughness={0.25} metalness={0.85} />
        </mesh>

        {/* Modesty Panel with Perforated Acoustic Texture */}
        <mesh position={[0, 0.45, -0.48]} castShadow>
          <boxGeometry args={[2.0, 0.48, 0.02]} />
          <meshStandardMaterial color="#141418" roughness={0.7} metalness={0.3} />
        </mesh>

        {/* Side Under-Desk Filing Cabinet & High-Tech AI Workstation PC Unit */}
        <group position={[0.78, 0.35, -0.1]}>
          {/* Cabinet Body */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.38, 0.65, 0.72]} />
            <meshStandardMaterial color="#141418" roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Drawer Aluminum Pulls */}
          <mesh position={[0, 0.16, 0.37]}>
            <boxGeometry args={[0.18, 0.02, 0.02]} />
            <meshStandardMaterial color="#D4FF00" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.14, 0.37]}>
            <boxGeometry args={[0.18, 0.02, 0.02]} />
            <meshStandardMaterial color="#D4FF00" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>

        {/* Left Side: Dedicated AI Compute Tower with LED Status Ring */}
        <group position={[-0.78, 0.32, -0.1]}>
          <mesh castShadow>
            <boxGeometry args={[0.26, 0.58, 0.52]} />
            <meshStandardMaterial color="#0c0d12" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Front Glass / Mesh Panel with Emissive Cooling Fans */}
          <mesh position={[0, 0, 0.265]}>
            <planeGeometry args={[0.22, 0.52]} />
            <meshStandardMaterial color="#09090b" roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.12, 0.268]}>
            <circleGeometry args={[0.065, 16]} />
            <meshBasicMaterial color={isA01 ? '#D4FF00' : isD02 ? '#e879f9' : '#00f0ff'} />
          </mesh>
          <mesh position={[0, -0.12, 0.268]}>
            <circleGeometry args={[0.065, 16]} />
            <meshBasicMaterial color={isA01 ? '#38bdf8' : isD02 ? '#e879f9' : '#00f0ff'} />
          </mesh>
        </group>
      </RigidBody>

      {/* ═════════════════════════════════════════════
          2. ERGONOMIC EXECUTIVE MESH CHAIR
         ═════════════════════════════════════════════ */}
      <group position={[0, 0, -0.68]}>
        {/* Seat Cushion */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.56, 0.08, 0.54]} />
          <meshStandardMaterial color="#18171d" roughness={0.7} />
        </mesh>
        {/* Curved Mesh Ergonomic Spine Backrest */}
        <mesh position={[0, 0.9, -0.23]} rotation={[-0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.52, 0.7, 0.06]} />
          <meshStandardMaterial color="#0e0e14" roughness={0.6} metalness={0.3} />
        </mesh>
        {/* Adjustable Headrest */}
        <mesh position={[0, 1.3, -0.27]} castShadow>
          <boxGeometry args={[0.3, 0.15, 0.06]} />
          <meshStandardMaterial color="#18171d" roughness={0.6} />
        </mesh>
        {/* 3D Armrests with Aluminum Mounts */}
        <mesh position={[-0.29, 0.73, 0]} castShadow>
          <boxGeometry args={[0.07, 0.03, 0.32]} />
          <meshStandardMaterial color="#09090b" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0.29, 0.73, 0]} castShadow>
          <boxGeometry args={[0.07, 0.03, 0.32]} />
          <meshStandardMaterial color="#09090b" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Heavy Gas Lift Cylinder Stem */}
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.48, 16]} />
          <meshStandardMaterial color="#09090b" metalness={0.95} roughness={0.15} />
        </mesh>
        {/* 5-Star Polished Chrome/Black Caster Base */}
        <mesh position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.04, 5]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* ═════════════════════════════════════════════
          3. LARGE LEATHER DESK MAT WITH STITCHING
         ═════════════════════════════════════════════ */}
      <mesh position={[0, 0.788, 0.08]} receiveShadow>
        <boxGeometry args={[1.9, 0.006, 0.76]} />
        <meshStandardMaterial color="#0f0f14" roughness={0.85} />
      </mesh>
      {/* Accent edge line on desk mat */}
      <mesh position={[0, 0.792, -0.28]}>
        <boxGeometry args={[1.88, 0.002, 0.015]} />
        <meshBasicMaterial color={isA01 ? '#D4FF00' : '#38bdf8'} />
      </mesh>

      {/* ═════════════════════════════════════════════
          4. MULTI-MONITOR DISPLAY ARRAY
         ═════════════════════════════════════════════ */}
      {/* Primary Center Monitor */}
      <group
        position={[0, 0.79, -0.1]}
        rotation={[0, Math.PI, 0]}
      >
        {/* Aluminum Monitor Arm */}
        <mesh position={[0, 0.24, -0.06]} castShadow>
          <cylinderGeometry args={[0.035, 0.04, 0.46, 12]} />
          <meshStandardMaterial color="#09090b" metalness={0.95} roughness={0.1} />
        </mesh>
        {/* Heavy Flat Stand Base */}
        <mesh position={[0, 0.006, -0.02]} castShadow>
          <boxGeometry args={[0.3, 0.012, 0.24]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Thin Bezel Display Frame */}
        <mesh position={[0, 0.48, 0]} castShadow>
          <boxGeometry args={[0.92, 0.52, 0.03]} />
          <meshStandardMaterial color="#0a0a0c" roughness={0.2} metalness={0.8} />
        </mesh>
        {/* Procedural Screen Content */}
        <group position={[0, 0.48, 0]}>
          <MonitorScreenFace type={screenType} />
        </group>
      </group>

      {/* Secondary Monitor (Right Side) */}
      {(hasDualMonitors || hasTripleMonitors) && (
        <group
          position={[0.58, 0.79, -0.06]}
          rotation={[0, Math.PI - 0.32, 0]}
        >
          {/* Arm */}
          <mesh position={[0, 0.24, -0.06]} castShadow>
            <cylinderGeometry args={[0.03, 0.035, 0.46, 12]} />
            <meshStandardMaterial color="#09090b" metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.006, -0.02]} castShadow>
            <boxGeometry args={[0.26, 0.012, 0.2]} />
            <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.48, 0]} castShadow>
            <boxGeometry args={[0.92, 0.52, 0.03]} />
            <meshStandardMaterial color="#0a0a0c" roughness={0.2} metalness={0.8} />
          </mesh>
          <group position={[0, 0.48, 0]}>
            <MonitorScreenFace type={screenType} isSecondary={true} />
          </group>
        </group>
      )}

      {/* Tertiary Monitor (Left Side) - For A01 and D02 */}
      {hasTripleMonitors && (
        <group
          position={[-0.58, 0.79, -0.06]}
          rotation={[0, Math.PI + 0.32, 0]}
        >
          <mesh position={[0, 0.24, -0.06]} castShadow>
            <cylinderGeometry args={[0.03, 0.035, 0.46, 12]} />
            <meshStandardMaterial color="#09090b" metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.006, -0.02]} castShadow>
            <boxGeometry args={[0.26, 0.012, 0.2]} />
            <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.48, 0]} castShadow>
            <boxGeometry args={[0.92, 0.52, 0.03]} />
            <meshStandardMaterial color="#0a0a0c" roughness={0.2} metalness={0.8} />
          </mesh>
          <group position={[0, 0.48, 0]}>
            <MonitorScreenFace type={screenType} isTertiary={true} />
          </group>
        </group>
      )}

      {/* ═════════════════════════════════════════════
          5. KEYBOARD & INPUT HARDWARE
         ═════════════════════════════════════════════ */}
      {/* Mechanical Keyboard with Backlit RGB Accent */}
      <group position={[0, 0.796, 0.28]}>
        <mesh castShadow>
          <boxGeometry args={[0.44, 0.018, 0.16]} />
          <meshStandardMaterial color="#09090d" roughness={0.3} metalness={0.5} />
        </mesh>
        {/* RGB Underglow */}
        <mesh position={[0, 0.012, 0]}>
          <boxGeometry args={[0.41, 0.005, 0.14]} />
          <meshBasicMaterial color={isA01 ? '#D4FF00' : isD02 ? '#e879f9' : '#38bdf8'} />
        </mesh>
      </group>

      {/* Precision Ergonomic Mouse */}
      <mesh position={[0.34, 0.796, 0.28]} castShadow>
        <boxGeometry args={[0.08, 0.028, 0.13]} />
        <meshStandardMaterial color="#18181f" roughness={0.25} metalness={0.6} />
      </mesh>

      {/* ═════════════════════════════════════════════
          6. ROLE-SPECIFIC ACCESSORIES & PROPS
         ═════════════════════════════════════════════ */}

      {/* D02: Graphic Drawing Tablet (Wacom style) + Stylus */}
      {isD02 && (
        <group position={[-0.45, 0.795, 0.24]} rotation={[0.08, 0, -0.05]}>
          <mesh castShadow>
            <boxGeometry args={[0.38, 0.012, 0.28]} />
            <meshStandardMaterial color="#101015" roughness={0.2} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.008, 0]}>
            <planeGeometry args={[0.32, 0.22]} />
            <meshBasicMaterial color="#1f0a28" />
          </mesh>
          {/* Pressure Stylus */}
          <mesh position={[0.22, 0.01, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.16, 8]} />
            <meshStandardMaterial color="#e879f9" metalness={0.8} />
          </mesh>
        </group>
      )}

      {/* D01: Headphone Stand + Cat Headphones resting */}
      {isD01 && (
        <group position={[-0.75, 0.79, 0.22]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.015, 16]} />
            <meshStandardMaterial color="#09090b" metalness={0.9} />
          </mesh>
          <mesh position={[0, 0.16, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.32, 8]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.32, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.08, 0.015, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#f43f5e" />
          </mesh>
        </group>
      )}

      {/* B02: Strategy Tablet Stand */}
      {isB02 && (
        <group position={[-0.6, 0.79, 0.2]} rotation={[-0.3, 0.4, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.24, 0.18, 0.015]} />
            <meshStandardMaterial color="#09090b" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.009]}>
            <planeGeometry args={[0.22, 0.16]} />
            <meshBasicMaterial color="#064e3b" />
          </mesh>
        </group>
      )}

      {/* B03: Desktop Calendar Block */}
      {isB03 && (
        <group position={[-0.65, 0.79, 0.22]} rotation={[0, 0.3, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.18, 0.12, 0.08]} />
            <meshStandardMaterial color="#f4f4f5" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.02, 0.042]}>
            <planeGeometry args={[0.14, 0.07]} />
            <meshBasicMaterial color="#0f766e" />
          </mesh>
        </group>
      )}

      {/* E01: QA Verification Stamp Dock */}
      {isE01 && (
        <group position={[-0.65, 0.79, 0.2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.02, 16]} />
            <meshStandardMaterial color="#09090b" metalness={0.9} />
          </mesh>
          <mesh position={[0, 0.06, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.04, 0.1, 16]} />
            <meshStandardMaterial color="#a78bfa" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshBasicMaterial color="#D4FF00" />
          </mesh>
        </group>
      )}

      {/* Ceramic Coffee Mug */}
      <group position={[-0.75, 0.79, -0.05]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.045, 0.04, 0.1, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
        {/* Coffee Liquid Surface */}
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.01, 16]} />
          <meshStandardMaterial color="#3e2723" roughness={0.1} />
        </mesh>
      </group>

      {/* Modern Minimalist Architectural Desk Lamp */}
      <group position={[-0.92, 0.79, -0.32]}>
        {/* Heavy Base */}
        <mesh castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.015, 16]} />
          <meshStandardMaterial color="#09090b" metalness={0.95} />
        </mesh>
        {/* Double-jointed Stem */}
        <mesh position={[0, 0.22, 0]} rotation={[0, 0, 0.12]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.44, 8]} />
          <meshStandardMaterial color="#D4FF00" metalness={0.9} />
        </mesh>
        <mesh position={[0.06, 0.44, 0]} rotation={[0, 0, -0.45]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.28, 8]} />
          <meshStandardMaterial color="#18181b" metalness={0.9} />
        </mesh>
        {/* Sleek Linear Lamp Head */}
        <mesh position={[0.18, 0.52, 0]} rotation={[0, 0, -0.2]} castShadow>
          <boxGeometry args={[0.22, 0.025, 0.05]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} />
        </mesh>
        {/* Lamp Warm LED Glow */}
        <pointLight
          position={[0.18, 0.5, 0]}
          intensity={isNight ? 1.6 : 0.4}
          color={isNight ? '#fef08a' : '#fffbeb'}
          distance={3.2}
        />
      </group>
    </group>
  );
};
