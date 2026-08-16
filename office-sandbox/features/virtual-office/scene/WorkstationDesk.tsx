'use client';

import React from 'react';
import { RigidBody } from '@react-three/rapier';
import { useOfficeStore } from '../state/office-store';

interface WorkstationDeskProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  screenColor?: string;
  hasDualMonitors?: boolean;
  screenType?: 'coordination' | 'strategy' | 'calendar' | 'copywriting' | 'design' | 'qa';
}

export const WorkstationDesk: React.FC<WorkstationDeskProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  screenColor = '#38bdf8',
  hasDualMonitors = true,
  screenType = 'coordination',
}) => {
  const timeOfDay = useOfficeStore((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night';
  return (
    <group position={position} rotation={rotation}>
      {/* 1. PHYSICAL DESK (Fixed RigidBody) */}
      <RigidBody type="fixed" colliders="hull">
        {/* Walnut Wood Desktop Surface */}
        <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.05, 1.1]} />
          <meshStandardMaterial color="#2d221c" roughness={0.5} metalness={0.1} />
        </mesh>

        {/* Metal Frame & Legs (Matte Charcoal Steel) */}
        <mesh position={[-0.98, 0.375, 0]} castShadow>
          <boxGeometry args={[0.06, 0.74, 0.95]} />
          <meshStandardMaterial color="#1e1e24" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0.98, 0.375, 0]} castShadow>
          <boxGeometry args={[0.06, 0.74, 0.95]} />
          <meshStandardMaterial color="#1e1e24" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Modesty Panel */}
        <mesh position={[0, 0.45, -0.46]} castShadow>
          <boxGeometry args={[1.9, 0.48, 0.02]} />
          <meshStandardMaterial color="#18181b" roughness={0.7} />
        </mesh>

        {/* Side Under-Desk Filing Cabinet */}
        <group position={[0.75, 0.35, -0.1]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.38, 0.65, 0.7]} />
            <meshStandardMaterial color="#18181b" roughness={0.5} metalness={0.5} />
          </mesh>
          {/* Drawer Metal Handles */}
          <mesh position={[0, 0.15, 0.36]}>
            <boxGeometry args={[0.18, 0.02, 0.02]} />
            <meshStandardMaterial color="#D4FF00" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.15, 0.36]}>
            <boxGeometry args={[0.18, 0.02, 0.02]} />
            <meshStandardMaterial color="#D4FF00" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      </RigidBody>

      {/* 2. ERGONOMIC MESH CHAIR */}
      <group position={[0, 0, -0.65]}>
        {/* Seat Cushion */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.55, 0.08, 0.52]} />
          <meshStandardMaterial color="#1c1917" roughness={0.8} />
        </mesh>
        {/* Curved Mesh Backrest */}
        <mesh position={[0, 0.88, -0.22]} rotation={[-0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.5, 0.68, 0.06]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} />
        </mesh>
        {/* Headrest */}
        <mesh position={[0, 1.28, -0.26]} castShadow>
          <boxGeometry args={[0.28, 0.14, 0.06]} />
          <meshStandardMaterial color="#18181b" roughness={0.6} />
        </mesh>
        {/* Armrests */}
        <mesh position={[-0.28, 0.72, 0]} castShadow>
          <boxGeometry args={[0.06, 0.03, 0.3]} />
          <meshStandardMaterial color="#09090b" roughness={0.4} />
        </mesh>
        <mesh position={[0.28, 0.72, 0]} castShadow>
          <boxGeometry args={[0.06, 0.03, 0.3]} />
          <meshStandardMaterial color="#09090b" roughness={0.4} />
        </mesh>
        {/* Chair Central Gas Lift Stem */}
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.48]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* 5-Star Caster Base */}
        <mesh position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.04, 5]} />
          <meshStandardMaterial color="#09090b" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* 3. DESK ACCESSORIES & HIGH-END HARDWARE */}
      {/* Large Leather Desk Mat */}
      <mesh position={[0, 0.788, 0.08]} receiveShadow>
        <boxGeometry args={[1.8, 0.005, 0.7]} />
        <meshStandardMaterial color="#121214" roughness={0.8} />
      </mesh>

      {/* Primary Ultra-Wide Monitor — screen faces TOWARD viewer (camera), agent sits behind */}
      <group position={[hasDualMonitors ? -0.42 : 0, 0.79, -0.08]} rotation={[0, hasDualMonitors ? Math.PI + 0.12 : Math.PI, 0]}>
        {/* Heavy Aluminum Monitor Arm */}
        <mesh position={[0, 0.22, -0.05]} castShadow>
          <cylinderGeometry args={[0.03, 0.04, 0.42]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Heavy Flat Stand Base */}
        <mesh position={[0, 0.005, -0.02]} castShadow>
          <boxGeometry args={[0.28, 0.01, 0.22]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Thin Bezel Display Frame */}
        <mesh position={[0, 0.46, 0]} castShadow>
          <boxGeometry args={[0.92, 0.52, 0.03]} />
          <meshStandardMaterial color="#0a0a0c" roughness={0.2} metalness={0.7} />
        </mesh>
        {/* Glowing Screen with Rich Color Display */}
        <mesh position={[0, 0.46, 0.018]}>
          <planeGeometry args={[0.88, 0.48]} />
          <meshBasicMaterial color={screenColor} />
        </mesh>
      </group>

      {/* Secondary Monitor */}
      {hasDualMonitors && (
        <group position={[0.46, 0.79, -0.08]} rotation={[0, Math.PI - 0.25, 0]}>
          {/* Stand */}
          <mesh position={[0, 0.22, -0.05]} castShadow>
            <cylinderGeometry args={[0.03, 0.04, 0.42]} />
            <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.005, -0.02]} castShadow>
            <boxGeometry args={[0.28, 0.01, 0.22]} />
            <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.46, 0]} castShadow>
            <boxGeometry args={[0.92, 0.52, 0.03]} />
            <meshStandardMaterial color="#0a0a0c" roughness={0.2} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.46, 0.018]}>
            <planeGeometry args={[0.88, 0.48]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
        </group>
      )}

      {/* Mechanical Keyboard with Backlit Keys */}
      <group position={[0, 0.795, 0.28]}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.018, 0.15]} />
          <meshStandardMaterial color="#09090b" roughness={0.4} />
        </mesh>
        {/* RGB Underglow */}
        <mesh position={[0, 0.012, 0]}>
          <boxGeometry args={[0.39, 0.005, 0.13]} />
          <meshBasicMaterial color="#D4FF00" />
        </mesh>
      </group>

      {/* Precision Mouse & Mousepad */}
      <mesh position={[0.32, 0.795, 0.28]} castShadow>
        <boxGeometry args={[0.07, 0.025, 0.12]} />
        <meshStandardMaterial color="#18181b" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Coffee Ceramic Mug */}
      <group position={[-0.7, 0.79, 0.2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.045, 0.04, 0.1, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
        {/* Coffee liquid inside */}
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.01, 16]} />
          <meshStandardMaterial color="#3e2723" roughness={0.1} />
        </mesh>
      </group>

      {/* Modern Metal Desk Lamp */}
      <group position={[-0.85, 0.79, -0.3]}>
        {/* Base */}
        <mesh castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.015, 16]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} />
        </mesh>
        {/* Stem */}
        <mesh position={[0, 0.25, 0]} rotation={[0, 0, 0.15]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.5]} />
          <meshStandardMaterial color="#D4FF00" metalness={0.8} />
        </mesh>
        {/* Hood */}
        <mesh position={[0.08, 0.48, 0]} rotation={[0, 0, -0.5]} castShadow>
          <cylinderGeometry args={[0.06, 0.09, 0.12, 16]} />
          <meshStandardMaterial color="#09090b" metalness={0.8} />
        </mesh>
        {/* Warm Bulb Light */}
        <pointLight
          position={[0.12, 0.44, 0]}
          intensity={isNight ? 1.4 : 0.4}
          color={isNight ? '#fef08a' : '#fffbeb'}
          distance={3.2}
        />
      </group>
    </group>
  );
};
