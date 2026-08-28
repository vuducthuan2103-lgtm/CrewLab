'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getStatePresentation } from '../config/agent-state-map';
import { GARDEN_STATION_LAYOUT } from '../config/office-layout';
import { useOfficeStore } from '../state/office-store';
import type { AgentCode, OfficeAgent } from '../types/office';
import { RiggedAgentCharacter } from './RiggedAgentCharacter';

const MODEL_URL = '/virtual-office/garden-office-v7.glb?v=20260828-v7';
const CHARACTER_SCALE = 1.36;
const AGENT_ORDER: AgentCode[] = ['A01', 'B02', 'B03', 'D01', 'D02', 'E01'];
const LABEL_OFFSETS: Record<AgentCode, [number, number, number]> = {
  A01: [0, 3.35, -0.25],
  B02: [-0.55, 3.1, 0],
  B03: [0.55, 3.1, 0],
  D01: [-0.65, 3.0, 0],
  D02: [-0.78, 3.0, -0.15],
  E01: [0.78, 3.0, -0.15],
};
const CHARACTER_ROTATIONS: Record<AgentCode, number> = {
  A01: -Math.PI,
  B02: THREE.MathUtils.degToRad(-58),
  B03: THREE.MathUtils.degToRad(58),
  D01: THREE.MathUtils.degToRad(-124),
  D02: -Math.PI,
  E01: THREE.MathUtils.degToRad(124),
};

function BakedGardenOffice() {
  const gltf = useGLTF(MODEL_URL);
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const screenMaterials = useMemo<THREE.MeshStandardMaterial[]>(() => [], []);
  const waterMaterials = useMemo<THREE.MeshStandardMaterial[]>(() => [], []);
  const ownedMaterials = useMemo<THREE.MeshStandardMaterial[]>(() => [], []);

  useEffect(() => {
    screenMaterials.length = 0;
    waterMaterials.length = 0;
    ownedMaterials.length = 0;
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = !object.name.toLowerCase().includes('water');
      object.receiveShadow = true;

      if (!(object.material instanceof THREE.MeshStandardMaterial)) return;
      object.material = object.material.clone();
      ownedMaterials.push(object.material);
      const materialName = object.material.name.toLowerCase();

      object.material.envMapIntensity = 1.25;
      if (materialName.includes('limestone warm')) {
        object.material.color.multiplyScalar(0.76);
        object.material.roughness = 0.56;
      } else if (materialName.includes('ivory fluted')) {
        object.material.color.multiply(new THREE.Color('#d4b77e'));
        object.material.roughness = 0.54;
      } else if (materialName.includes('quarter sawn oak')) {
        object.material.color.multiply(new THREE.Color('#d59a5d'));
        object.material.roughness = 0.38;
      } else if (materialName.includes('ficus bark')) {
        object.material.color.multiply(new THREE.Color('#a9855e'));
      } else if (materialName.includes('garden leaf') || materialName.includes('cluster atlas')) {
        object.material.color.multiply(new THREE.Color('#91bd62'));
      } else if (materialName.includes('architectural glass')) {
        object.material.transparent = true;
        object.material.opacity = 0.16;
        object.material.depthWrite = false;
      } else if (materialName.includes('water')) {
        object.material.transparent = true;
        object.material.opacity = 0.82;
        object.material.depthWrite = false;
        object.material.roughness = 0.055;
        object.material.emissive = new THREE.Color('#063f39');
        object.material.emissiveIntensity = 0.16;
        waterMaterials.push(object.material);
      }

      if (object.name.includes('Screen')) {
        object.material.emissive = new THREE.Color('#0aa89d');
        object.material.emissiveIntensity = 0.72;
        screenMaterials.push(object.material);
      }
      object.material.needsUpdate = true;
    });

    return () => {
      ownedMaterials.forEach((item) => item.dispose());
      screenMaterials.length = 0;
      waterMaterials.length = 0;
      ownedMaterials.length = 0;
    };
  }, [model, ownedMaterials, screenMaterials, waterMaterials]);

  useFrame(({ clock }) => {
    const pulse = 0.72 + Math.sin(clock.elapsedTime * 1.35) * 0.055;
    screenMaterials.forEach((item) => {
      item.emissiveIntensity = pulse;
    });
    const shimmer = 0.14 + Math.sin(clock.elapsedTime * 0.72) * 0.035;
    waterMaterials.forEach((item) => {
      item.emissiveIntensity = shimmer;
    });
  });

  return <primitive object={model} />;
}

function AgentHotspot({ agent }: { agent: OfficeAgent }) {
  const [hovered, setHovered] = useState(false);
  const selectedAgentCode = useOfficeStore((state) => state.selectedAgentCode);
  const selected = selectedAgentCode === agent.code;
  const focusMuted = selectedAgentCode !== null && !selected;
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
      <group position={[0, -0.22, 0]} rotation={[0, CHARACTER_ROTATIONS[agent.code], 0]} scale={CHARACTER_SCALE}>
        <group position={[0, 0, -0.57]}>
          <RiggedAgentCharacter code={agent.code} visualState={agent.visualState} />
        </group>
      </group>

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
          className={`group min-w-[124px] rounded-sm border px-2.5 py-1.5 text-left text-white shadow-[0_12px_30px_rgba(0,0,0,0.42)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 ${focusMuted ? 'pointer-events-none opacity-0' : 'opacity-100'} ${selected ? 'border-[#D4FF00]/90 bg-[#07100d]/98' : 'border-white/20 bg-[#09120f]/95 hover:border-white/45'}`}
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
