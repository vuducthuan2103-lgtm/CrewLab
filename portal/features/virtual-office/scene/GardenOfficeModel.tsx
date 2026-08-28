'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getStatePresentation } from '../config/agent-state-map';
import { GARDEN_STATION_LAYOUT } from '../config/office-layout';
import { useOfficeStore } from '../state/office-store';
import type { AgentCode, OfficeAgent } from '../types/office';

const MODEL_URL = '/virtual-office/garden-office-v4.glb?v=20260828';
const AGENT_ORDER: AgentCode[] = ['A01', 'B02', 'B03', 'D01', 'D02', 'E01'];
const LABEL_OFFSETS: Record<AgentCode, [number, number, number]> = {
  A01: [0, 3.35, -0.25],
  B02: [-0.55, 3.1, 0],
  B03: [0.55, 3.1, 0],
  D01: [-0.65, 3.0, 0],
  D02: [-0.78, 3.0, -0.15],
  E01: [0.78, 3.0, -0.15],
};

function BakedGardenOffice() {
  const gltf = useGLTF(MODEL_URL);
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const screenMaterials = useMemo<THREE.MeshStandardMaterial[]>(() => [], []);

  useEffect(() => {
    screenMaterials.length = 0;
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = !object.name.toLowerCase().includes('water');
      object.receiveShadow = true;

      if (object.name.includes('Screen') && object.material instanceof THREE.MeshStandardMaterial) {
        object.material = object.material.clone();
        object.material.emissive = new THREE.Color('#0c8f88');
        object.material.emissiveIntensity = 0.58;
        screenMaterials.push(object.material);
      }
    });

    return () => {
      screenMaterials.forEach((item) => item.dispose());
      screenMaterials.length = 0;
    };
  }, [model, screenMaterials]);

  useFrame(({ clock }) => {
    const pulse = 0.58 + Math.sin(clock.elapsedTime * 1.35) * 0.045;
    screenMaterials.forEach((item) => {
      item.emissiveIntensity = pulse;
    });
  });

  return <primitive object={model} />;
}

function AgentHotspot({ agent }: { agent: OfficeAgent }) {
  const [hovered, setHovered] = useState(false);
  const selected = useOfficeStore((state) => state.selectedAgentCode === agent.code);
  const selectAgent = useOfficeStore((state) => state.selectAgent);
  const setHoveredAgent = useOfficeStore((state) => state.setHoveredAgent);
  const presentation = getStatePresentation(agent.visualState);
  const layout = GARDEN_STATION_LAYOUT[agent.code];
  const radius = agent.code === 'A01' ? 1.78 : 1.48;

  const enter = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(true);
    setHoveredAgent(agent.code);
    document.body.style.cursor = 'pointer';
  };

  const leave = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(false);
    setHoveredAgent(null);
    document.body.style.cursor = 'auto';
  };

  return (
    <group position={layout.position}>
      <mesh
        visible={false}
        position={[0, 1.35, 0]}
        onPointerOver={enter}
        onPointerOut={leave}
        onClick={(event) => {
          event.stopPropagation();
          selectAgent(agent.code);
        }}
      >
        <cylinderGeometry args={[radius, radius, 2.7, 24]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <mesh position={[0, 0.455, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.08, radius, 72]} />
        <meshBasicMaterial
          color={selected || hovered ? '#D4FF00' : presentation.dotColor}
          transparent
          opacity={selected ? 0.94 : hovered ? 0.74 : 0.16}
          depthWrite={false}
        />
      </mesh>

      <Html position={LABEL_OFFSETS[agent.code]} center distanceFactor={selected ? 7.5 : 11} zIndexRange={[34, 0]}>
        <button
          type="button"
          data-agent-label={agent.code}
          aria-label={`Mở ${agent.code}, ${agent.role}`}
          onClick={() => selectAgent(agent.code)}
          onMouseEnter={() => {
            setHovered(true);
            setHoveredAgent(agent.code);
          }}
          onMouseLeave={() => {
            setHovered(false);
            setHoveredAgent(null);
          }}
          className={`group min-w-[124px] rounded-sm border px-2.5 py-1.5 text-left text-white shadow-[0_12px_30px_rgba(0,0,0,0.42)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 ${selected ? 'border-[#D4FF00]/90 bg-[#07100d]/98' : 'border-white/20 bg-[#09120f]/95 hover:border-white/45'}`}
        >
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ color: presentation.dotColor, backgroundColor: presentation.dotColor }} />
            <span className="font-mono text-[9px] font-bold tracking-[0.14em] text-[#D4FF00]">{agent.code}</span>
            <span className="ml-auto text-[8px] text-zinc-300">{presentation.labelVi}</span>
          </span>
          <span className="mt-0.5 block max-w-[150px] truncate text-[9px] font-medium text-zinc-100">{agent.role}</span>
        </button>
      </Html>
    </group>
  );
}

export function GardenOfficeModel() {
  const agents = useOfficeStore((state) => state.agents);

  return (
    <>
      <BakedGardenOffice />
      {AGENT_ORDER.map((code) => {
        const agent = agents[code];
        return agent ? <AgentHotspot key={code} agent={agent} /> : null;
      })}
    </>
  );
}

useGLTF?.preload?.(MODEL_URL);
