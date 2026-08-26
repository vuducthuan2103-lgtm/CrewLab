'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getStatePresentation } from '../config/agent-state-map';
import { useOfficeStore } from '../state/office-store';
import type { AgentCode, OfficeAgent } from '../types/office';

const AGENT_ORDER: AgentCode[] = ['A01', 'B02', 'B03', 'D01', 'D02', 'E01'];

const AGENT_COLORS: Record<AgentCode, string> = {
  A01: '#567363', B02: '#9a7a52', B03: '#4f7c86',
  D01: '#a76f51', D02: '#7f658f', E01: '#596b62',
};

const CAMERA_HOME = new THREE.Vector3(0, 10.8, 18.5);
const CAMERA_TARGET = new THREE.Vector3(0, 0.8, 0.3);

function FocusCamera() {
  const selectedAgentCode = useOfficeStore((state) => state.selectedAgentCode);
  const agents = useOfficeStore((state) => state.agents);
  const { camera } = useThree();
  const desiredPosition = useRef(CAMERA_HOME.clone());
  const desiredLookAt = useRef(CAMERA_TARGET.clone());

  useFrame(() => {
    const selectedAgent = selectedAgentCode ? agents[selectedAgentCode] : null;
    if (selectedAgent) {
      const [x, , z] = selectedAgent.position;
      desiredPosition.current.set(x * 0.72, 4.9, z + 7.4);
      desiredLookAt.current.set(x * 0.72, 0.9, z);
    } else {
      desiredPosition.current.copy(CAMERA_HOME);
      desiredLookAt.current.copy(CAMERA_TARGET);
    }
    camera.position.lerp(desiredPosition.current, 0.055);
    camera.lookAt(desiredLookAt.current);
  });

  return null;
}

function CentralTree() {
  const crown = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (crown.current) crown.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.16) * 0.035;
  });

  return (
    <group position={[0, 0, 0.5]}>
      <mesh receiveShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[1.72, 1.9, 0.34, 36]} />
        <meshStandardMaterial color="#d6c6aa" roughness={0.92} />
      </mesh>
      <mesh castShadow position={[0, 1.45, 0]}>
        <cylinderGeometry args={[0.18, 0.4, 2.75, 12]} />
        <meshStandardMaterial color="#6b4a32" roughness={0.9} />
      </mesh>
      <group ref={crown} position={[0, 3.1, 0]}>
        {[
          [0, 0, 0, 0.98], [0.68, 0.08, 0.12, 0.7],
          [-0.66, 0.16, -0.14, 0.73],
        ].map(([x, y, z, radius], index) => (
          <mesh key={index} castShadow position={[x, y, z]}>
            <icosahedronGeometry args={[radius, 2]} />
            <meshStandardMaterial color={index % 2 === 0 ? '#54775a' : '#6b8d65'} roughness={0.94} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function LowPlanter({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh receiveShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.9, 1.02, 0.36, 24]} />
        <meshStandardMaterial color="#b9aa91" roughness={0.9} />
      </mesh>
      {[-0.42, 0, 0.42].map((x, index) => (
        <mesh key={x} castShadow position={[x, 0.55 + index * 0.04, index % 2 ? 0.12 : -0.08]}>
          <sphereGeometry args={[0.36, 14, 12]} />
          <meshStandardMaterial color={index === 1 ? '#668461' : '#76916a'} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function CampusArchitecture() {
  return (
    <group>
      <color attach="background" args={['#d9e4d6']} />
      <fog attach="fog" args={['#d9e4d6', 20, 43]} />
      <mesh receiveShadow position={[0, -0.18, 0]}>
        <boxGeometry args={[22, 0.34, 19]} />
        <meshStandardMaterial color="#d8d0c1" roughness={0.9} />
      </mesh>
      {[-7.5, -2.5, 2.5, 7.5].map((x) => (
        <mesh key={`floor-x-${x}`} position={[x, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.025, 18]} />
          <meshBasicMaterial color="#b8ab97" transparent opacity={0.58} />
        </mesh>
      ))}
      {[-6, -2, 2, 6].map((z) => (
        <mesh key={`floor-z-${z}`} position={[0, 0.007, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[21, 0.025]} />
          <meshBasicMaterial color="#b8ab97" transparent opacity={0.58} />
        </mesh>
      ))}
      <mesh receiveShadow position={[0, 5.1, -8.9]}>
        <boxGeometry args={[22, 10.2, 0.28]} />
        <meshStandardMaterial color="#e9e6de" roughness={0.86} />
      </mesh>
      <mesh receiveShadow position={[-10.9, 4.4, 0]}>
        <boxGeometry args={[0.25, 8.8, 18]} />
        <meshStandardMaterial color="#e5e1d7" roughness={0.88} />
      </mesh>
      <mesh position={[10.9, 4.4, 0]}>
        <boxGeometry args={[0.18, 8.8, 18]} />
        <meshPhysicalMaterial color="#eaf6f1" transparent opacity={0.24} transmission={0.42} roughness={0.12} />
      </mesh>
      {[-7.3, 0, 7.3].map((x) => (
        <group key={`window-${x}`} position={[x, 5.2, -9.06]}>
          <mesh>
            <boxGeometry args={[5.8, 4.9, 0.06]} />
            <meshPhysicalMaterial color="#cfe3dc" transparent opacity={0.46} transmission={0.32} roughness={0.16} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.07, 5.05, 0.08]} />
            <meshStandardMaterial color="#8c806d" metalness={0.35} roughness={0.45} />
          </mesh>
        </group>
      ))}
      <mesh position={[-7.2, 4.9, -8.68]}>
        <boxGeometry args={[3.8, 1.25, 0.22]} />
        <meshStandardMaterial color="#35544a" emissive="#173127" emissiveIntensity={0.12} roughness={0.45} />
      </mesh>
      <Html position={[-7.2, 4.92, -8.5]} center transform distanceFactor={9}>
        <div className="pointer-events-none whitespace-nowrap text-center text-[11px] font-black tracking-[0.18em] text-white drop-shadow-lg">
          CREWLAB <span className="text-[#D4FF00]">OFFICE</span>
        </div>
      </Html>
      <LowPlanter position={[-8.8, 0, 6.8]} />
      <LowPlanter position={[8.8, 0, -6.8]} />
    </group>
  );
}

function AgentStation({ agent }: { agent: OfficeAgent }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const selected = useOfficeStore((state) => state.selectedAgentCode === agent.code);
  const selectAgent = useOfficeStore((state) => state.selectAgent);
  const setHoveredAgent = useOfficeStore((state) => state.setHoveredAgent);
  const presentation = getStatePresentation(agent.visualState);
  const palette = useMemo(() => AGENT_COLORS[agent.code], [agent.code]);

  useFrame((state) => {
    if (group.current) {
      group.current.position.y = agent.visualState === 'working'
        ? Math.sin(state.clock.elapsedTime * 1.6 + agent.position[0]) * 0.02
        : 0;
    }
  });

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(true);
    setHoveredAgent(agent.code);
    document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(false);
    setHoveredAgent(null);
    document.body.style.cursor = 'auto';
  };

  return (
    <group ref={group} position={agent.position} rotation={agent.rotation}>
      <mesh receiveShadow castShadow position={[0, 0.62, 0]}>
        <cylinderGeometry args={[1.45, 1.2, 0.18, 28, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#a7835e" roughness={0.66} />
      </mesh>
      <mesh castShadow position={[0, 0.3, -0.08]}>
        <boxGeometry args={[1.9, 0.55, 0.72]} />
        <meshStandardMaterial color="#eee8dc" roughness={0.86} />
      </mesh>
      {[-0.48, 0.48].map((x) => (
        <group key={x} position={[x, 1.12, -0.18]} rotation={[-0.1, x * 0.08, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.72, 0.48, 0.055]} />
            <meshStandardMaterial color="#273d38" roughness={0.32} metalness={0.22} />
          </mesh>
          <mesh position={[0, 0, 0.031]}>
            <planeGeometry args={[0.61, 0.37]} />
            <meshBasicMaterial color={x < 0 ? presentation.dotColor : '#7dd3c7'} transparent opacity={0.72} />
          </mesh>
        </group>
      ))}
      <group
        position={[0, 0.9, 0.52]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={(event) => { event.stopPropagation(); selectAgent(agent.code); }}
      >
        <mesh visible={false} position={[0, 0.4, 0]}>
          <boxGeometry args={[1.6, 2, 1.5]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        <mesh castShadow>
          <cylinderGeometry args={[0.25, 0.31, 0.76, 16]} />
          <meshStandardMaterial color={palette} roughness={0.72} />
        </mesh>
        <mesh castShadow position={[0, 0.58, 0]}>
          <sphereGeometry args={[0.26, 20, 18]} />
          <meshStandardMaterial color="#dca47e" roughness={0.68} />
        </mesh>
        <mesh castShadow position={[0, 0.76, -0.03]}>
          <sphereGeometry args={[0.267, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#3b302a" roughness={0.88} />
        </mesh>
        <mesh visible={selected || hovered} position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.58, 0.035, 8, 36]} />
          <meshBasicMaterial color={selected ? '#D4FF00' : '#ffffff'} transparent opacity={0.92} />
        </mesh>
      </group>
      <Html position={[0, 2.03, 0]} center distanceFactor={12} zIndexRange={[35, 0]}>
        <button
          type="button"
          onClick={() => selectAgent(agent.code)}
          onMouseEnter={() => setHoveredAgent(agent.code)}
          onMouseLeave={() => setHoveredAgent(null)}
          className={`min-w-[126px] border bg-[#101511]/92 px-2.5 py-1.5 text-left text-white shadow-xl backdrop-blur-md transition ${selected ? 'border-[#D4FF00]' : 'border-white/25 hover:border-white/60'}`}
        >
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: presentation.dotColor }} />
            <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#D4FF00]">{agent.code}</span>
            <span className="text-[9px] text-zinc-300">{presentation.labelVi}</span>
          </span>
        </button>
      </Html>
    </group>
  );
}

function GardenCampusScene() {
  const agents = useOfficeStore((state) => state.agents);
  return (
    <>
      <ambientLight intensity={1.45} color="#fff6e5" />
      <hemisphereLight args={['#e5f2e8', '#8f775d', 1.1]} />
      <directionalLight castShadow position={[-7, 14, 8]} intensity={2.15} color="#fff2d2" shadow-mapSize={[1024, 1024]} shadow-camera-left={-13} shadow-camera-right={13} shadow-camera-top={13} shadow-camera-bottom={-13} />
      <CampusArchitecture />
      <CentralTree />
      {AGENT_ORDER.map((code) => agents[code] && <AgentStation key={code} agent={agents[code]} />)}
      <ContactShadows position={[0, 0.01, 0]} opacity={0.24} scale={25} blur={2.8} far={11} />
    </>
  );
}

export function OfficeCanvas() {
  const agents = useOfficeStore((state) => state.agents);
  const selectAgent = useOfficeStore((state) => state.selectAgent);
  const setHoveredAgent = useOfficeStore((state) => state.setHoveredAgent);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#d9e4d6]">
      <Canvas shadows camera={{ position: CAMERA_HOME.toArray(), fov: 44 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
        <FocusCamera />
        <OrbitControls enableDamping dampingFactor={0.08} enablePan={false} enableZoom minDistance={8} maxDistance={24} minPolarAngle={Math.PI / 5} maxPolarAngle={Math.PI / 2.08} target={CAMERA_TARGET.toArray()} />
        <GardenCampusScene />
      </Canvas>
      <div className="sr-only" aria-label="Chọn agent trong văn phòng 3D">
        {AGENT_ORDER.map((code) => {
          const agent = agents[code];
          if (!agent) return null;
          const presentation = getStatePresentation(agent.visualState);
          return (
            <button key={code} type="button" data-testid={`office-agent-${code}`} aria-label={`${code}, ${agent.role}, ${presentation.labelVi}`} onClick={() => selectAgent(code)} onFocus={() => setHoveredAgent(code)} onBlur={() => setHoveredAgent(null)}>
              {code} — {agent.role}
            </button>
          );
        })}
      </div>
    </div>
  );
}
