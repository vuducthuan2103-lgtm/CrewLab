'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useOfficeStore } from '../state/office-store';

const CONFETTI_COUNT = 80;
const COLORS = ['#D4FF00', '#A855F7', '#38BDF8', '#F59E0B', '#EC4899', '#10B981'];

export const OfficeCelebrationEffect: React.FC = () => {
  const isCelebrationActive = useOfficeStore((s) => s.isCelebrationActive);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const particles = useMemo(() => {
    return Array.from({ length: CONFETTI_COUNT }, () => ({
      x: (Math.random() - 0.5) * 16,
      y: 6.0 + Math.random() * 4.0,
      z: (Math.random() - 0.5) * 12,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -(1.2 + Math.random() * 1.5),
      vz: (Math.random() - 0.5) * 0.8,
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      rotZ: Math.random() * Math.PI * 2,
      vRotX: (Math.random() - 0.5) * 4,
      vRotY: (Math.random() - 0.5) * 4,
      vRotZ: (Math.random() - 0.5) * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      scale: 0.12 + Math.random() * 0.08,
    }));
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    if (!meshRef.current || !isCelebrationActive) return;

    particles.forEach((p, i) => {
      p.y += p.vy * delta;
      p.x += p.vx * delta;
      p.z += p.vz * delta;

      p.rotX += p.vRotX * delta;
      p.rotY += p.vRotY * delta;
      p.rotZ += p.vRotZ * delta;

      // Reset when falling below floor
      if (p.y < 0.2) {
        p.y = 7.0 + Math.random() * 2.0;
        p.x = (Math.random() - 0.5) * 16;
        p.z = (Math.random() - 0.5) * 12;
      }

      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rotX, p.rotY, p.rotZ);
      dummy.scale.set(p.scale, p.scale * 1.6, 0.02);
      dummy.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.matrix);
      colorObj.set(p.color);
      meshRef.current!.setColorAt(i, colorObj);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  if (!isCelebrationActive) return null;

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, CONFETTI_COUNT]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial side={THREE.DoubleSide} roughness={0.3} metalness={0.4} />
      </instancedMesh>

      {/* Warm Celebratory Room Light Burst */}
      <pointLight position={[0, 4.5, 0]} color="#D4FF00" intensity={3.5} distance={16} />
    </group>
  );
};
