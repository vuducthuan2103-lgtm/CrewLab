'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getStatePresentation } from '../config/agent-state-map';
import { GARDEN_CHARACTER_SEAT_TRANSFORMS, GARDEN_STATION_LAYOUT } from '../config/office-layout';
import { useOfficeStore } from '../state/office-store';
import type { AgentCode, OfficeAgent } from '../types/office';
import { RiggedAgentCharacter } from './RiggedAgentCharacter';

const MODEL_URL = '/virtual-office/garden-office-v10.glb?v=20260901-crisp-city';
const CHARACTER_SCALE = 1.14;
// Blender v10 assets use a 0.038 m shoe sole and a 0.62 m seated pelvis.
// The plaza sits at roughly 0.45 m, so this keeps the shoes planted while the
// pelvis meets the authored cushion instead of hovering above the chair.
const CHARACTER_SEAT_ANCHOR_Y = 0.41;
const AGENT_ORDER: AgentCode[] = ['A01', 'B02', 'B03', 'D01', 'D02', 'E01'];
const LABEL_OFFSETS: Record<AgentCode, [number, number, number]> = {
  A01: [0, 2.82, -0.18],
  B02: [-0.48, 2.68, 0],
  B03: [0.48, 2.68, 0],
  D01: [-0.55, 2.62, 0],
  D02: [-0.65, 2.62, -0.1],
  E01: [0.65, 2.62, -0.1],
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

      if (!(object.material instanceof THREE.MeshStandardMaterial)) return;
      object.material = object.material.clone();
      ownedMaterials.push(object.material);
      const objectName = object.name.toLowerCase();
      const materialName = object.material.name.toLowerCase();
      const isLightweightSurface =
        materialName.includes('glass') ||
        materialName.includes('water') ||
        materialName.includes('leaf') ||
        materialName.includes('foliage') ||
        materialName.includes('cluster atlas') ||
        materialName.includes('display') ||
        materialName.includes('atmospheric skyline') ||
        materialName.includes('distant city panorama') ||
        materialName.includes('skyline window ribbons') ||
        objectName.includes('ui line');
      object.castShadow = !isLightweightSurface;
      object.receiveShadow = !isLightweightSurface;

      object.material.envMapIntensity = 1.28;
      if (materialName.includes('limestone warm')) {
        object.material.roughness = 0.68;
      } else if (materialName.includes('ivory fluted')) {
        object.material.roughness = 0.62;
      } else if (materialName.includes('quarter sawn oak')) {
        object.material.roughness = 0.46;
      } else if (materialName.includes('ficus bark')) {
        object.material.color.multiply(new THREE.Color('#a47e60'));
      } else if (materialName.includes('garden leaf') || materialName.includes('cluster atlas')) {
        object.material.color.multiply(new THREE.Color('#92bd7e'));
      } else if (materialName.includes('atmospheric skyline')) {
        object.material.envMapIntensity = 0.72;
        object.material.roughness = 0.94;
      } else if (materialName.includes('distant city panorama')) {
        object.material.envMapIntensity = 0.14;
        object.material.roughness = 1;
        object.material.emissiveIntensity = 0.18;
      } else if (materialName.includes('cool city curtain wall')) {
        object.material.envMapIntensity = 1.48;
        object.material.roughness = 0.28;
        object.material.color.multiply(new THREE.Color('#77909a'));
      } else if (materialName.includes('pale city masonry')) {
        object.material.color.multiply(new THREE.Color('#aebabc'));
        object.material.roughness = 0.76;
      } else if (materialName.includes('skyline window ribbons')) {
        object.material.envMapIntensity = 1.18;
        object.material.emissiveIntensity = 0.08;
      } else if (materialName.includes('architectural concrete')) {
        object.material.color.multiply(new THREE.Color('#b7c1c2'));
        object.material.roughness = 0.84;
      } else if (materialName.includes('outdoor oak')) {
        object.material.color.multiply(new THREE.Color('#c2b4a1'));
        object.material.roughness = 0.60;
      } else if (materialName.includes('architectural glass')) {
        object.material.transparent = true;
        object.material.opacity = 0.12;
        object.material.depthWrite = false;
        object.material.roughness = 0.08;
        object.material.envMapIntensity = 1.65;
      } else if (materialName.includes('water')) {
        object.material.transparent = true;
        object.material.opacity = 0.78;
        object.material.depthWrite = false;
        object.material.roughness = 0.075;
        object.material.emissive = new THREE.Color('#0c716a');
        object.material.emissiveIntensity = 0.075;
        waterMaterials.push(object.material);
      }

      if (object.name.includes('Screen') || materialName.includes('display')) {
        object.material.emissive = new THREE.Color('#0aa89d');
        object.material.emissiveIntensity = 0.66;
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
    const pulse = 0.66 + Math.sin(clock.elapsedTime * 1.15) * 0.045;
    screenMaterials.forEach((item) => {
      item.emissiveIntensity = pulse;
    });
    const shimmer = 0.09 + Math.sin(clock.elapsedTime * 0.66) * 0.025;
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
  const seat = GARDEN_CHARACTER_SEAT_TRANSFORMS[agent.code];
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
      <group
        position={[seat.seatOffset[0], CHARACTER_SEAT_ANCHOR_Y, seat.seatOffset[1]]}
        rotation={[0, seat.rotationY, 0]}
        scale={CHARACTER_SCALE}
      >
        <RiggedAgentCharacter code={agent.code} visualState={agent.visualState} />
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

      {!selected && (
        <Html position={LABEL_OFFSETS[agent.code]} center distanceFactor={10.5} zIndexRange={[34, 0]}>
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
          className={`group min-w-[114px] rounded-md border px-2.5 py-1.5 text-left text-white shadow-[0_10px_24px_rgba(0,0,0,0.34)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 ${focusMuted ? 'pointer-events-none opacity-0' : 'opacity-100'} ${selected ? 'border-[#D4FF00]/90 bg-[#07100d]/96' : 'border-white/18 bg-[#09120f]/88 hover:border-white/40'}`}
        >
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ color: presentation.dotColor, backgroundColor: presentation.dotColor }} />
            <span className="font-mono text-[9px] font-bold tracking-[0.14em] text-[#D4FF00]">{agent.code}</span>
            <span className="ml-auto text-[8px] text-zinc-300">{presentation.labelVi}</span>
          </span>
          <span className="mt-0.5 block max-w-[150px] truncate text-[9px] font-medium text-zinc-100">{agent.role}</span>
          </button>
        </Html>
      )}
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
