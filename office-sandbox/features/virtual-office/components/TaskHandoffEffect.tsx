'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useOfficeStore } from '../state/office-store';
import { INITIAL_OFFICE_AGENTS } from '../config/office-layout';
import { Sparkles, FileText, ArrowRight } from 'lucide-react';

export const TaskHandoffEffect: React.FC = () => {
  const activeHandoff = useOfficeStore((s) => s.activeHandoff);
  const clearTaskHandoff = useOfficeStore((s) => s.clearTaskHandoff);

  const packetRef = useRef<THREE.Group>(null);
  const progressRef = useRef<number>(0);

  const fromAgent = activeHandoff ? INITIAL_OFFICE_AGENTS[activeHandoff.from] : null;
  const toAgent = activeHandoff ? INITIAL_OFFICE_AGENTS[activeHandoff.to] : null;

  useFrame((state, delta) => {
    if (!activeHandoff || !fromAgent || !toAgent || !packetRef.current) return;

    progressRef.current += delta * 0.55; // ~1.8s flight time

    if (progressRef.current >= 1.0) {
      progressRef.current = 0;
      clearTaskHandoff();
      return;
    }

    const t = progressRef.current;
    const startPos = new THREE.Vector3(fromAgent.position[0], 1.2, fromAgent.position[2]);
    const endPos = new THREE.Vector3(toAgent.position[0], 1.2, toAgent.position[2]);
    const midX = (startPos.x + endPos.x) / 2;
    const midZ = (startPos.z + endPos.z) / 2;
    const controlPoint = new THREE.Vector3(midX, 3.2, midZ);

    const p0 = startPos.clone().multiplyScalar((1 - t) * (1 - t));
    const p1 = controlPoint.clone().multiplyScalar(2 * (1 - t) * t);
    const p2 = endPos.clone().multiplyScalar(t * t);
    const currentPos = p0.add(p1).add(p2);

    packetRef.current.position.copy(currentPos);
    packetRef.current.rotation.y += delta * 4.0;
    packetRef.current.rotation.z = Math.sin(t * Math.PI) * 0.4;
  });

  if (!activeHandoff || !fromAgent || !toAgent) return null;

  const startPos: [number, number, number] = [fromAgent.position[0], 1.2, fromAgent.position[2]];

  return (
    <group ref={packetRef} position={startPos}>
      {/* Glowing Task Document Card Mesh */}
      <mesh castShadow>
        <boxGeometry args={[0.36, 0.46, 0.04]} />
        <meshStandardMaterial
          color="#D4FF00"
          emissive="#D4FF00"
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* Outer Luminous Pulse Aura */}
      <pointLight color="#D4FF00" intensity={2.5} distance={2.5} />

      {/* Floating 2D Badge showing Handoff Direction */}
      <Html position={[0, 0.45, 0]} center distanceFactor={14} className="pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#09090B]/90 border border-[#D4FF00]/60 text-white text-[10px] font-bold shadow-xl shadow-[#D4FF00]/20 whitespace-nowrap backdrop-blur-md animate-pulse">
          <span className="text-[#D4FF00] font-mono">{activeHandoff.from}</span>
          <ArrowRight className="w-3 h-3 text-[#D4FF00]" />
          <span className="text-purple-300 font-mono">{activeHandoff.to}</span>
          <span className="text-zinc-300 text-[9px] font-normal border-l border-zinc-700 pl-1.5 ml-0.5">
            {activeHandoff.title}
          </span>
        </div>
      </Html>
    </group>
  );
};
