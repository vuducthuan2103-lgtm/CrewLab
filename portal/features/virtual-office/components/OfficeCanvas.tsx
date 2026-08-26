'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useOfficeStore } from '../state/office-store';
import { OfficeAgent } from '../types/office';
import { getStatePresentation } from '../config/agent-state-map';

const deskPositions: Record<string, [number, number, number]> = {
  A01: [0, 0, -2.2], B02: [-6.1, 0, -2.8], B03: [-6.1, 0, 2.2],
  D01: [6.1, 0, -2.8], D02: [6.1, 0, 2.2], E01: [0, 0, 6.2],
};

function FocusCamera() {
  const selected = useOfficeStore((s) => s.selectedAgentCode);
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 10.5, 18));
  useFrame(() => {
    const point = selected ? deskPositions[selected] : undefined;
    target.current.set(point ? point[0] * 0.7 : 0, point ? 5.2 : 10.5, point ? point[2] + 9.5 : 18);
    camera.position.lerp(target.current, 0.045);
    camera.lookAt(point ? point[0] * 0.58 : 0, point ? 1.1 : 0, point ? point[2] * 0.55 : 0.5);
  });
  return null;
}

function SculpturalTree() {
  const leaves = useRef<THREE.Group>(null);
  useFrame((state) => { if (leaves.current) leaves.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.025; });
  return <group position={[0, 0, 1.2]}>
    <mesh castShadow><cylinderGeometry args={[0.24, 0.42, 3.1, 10]} /><meshStandardMaterial color="#6a4a33" roughness={0.82} /></mesh>
    <group ref={leaves} position={[0, 3.15, 0]}>{[[0, 0, 0], [0.65, 0.1, 0.12], [-0.6, 0.25, -0.1], [0.15, 0.75, 0.22], [-0.18, 1.1, -0.15]].map((position, index) => <mesh key={index} position={position as [number, number, number]} castShadow><icosahedronGeometry args={[0.95 - index * 0.07, 2]} /><meshStandardMaterial color={index % 2 ? '#4c7555' : '#5d865f'} roughness={0.9} /></mesh>)}</group>
  </group>;
}

function CampusShell() {
  return <group>
    <color attach="background" args={["#dfe5d7"]} />
    <mesh receiveShadow position={[0, -0.12, 0]}><boxGeometry args={[22, 0.22, 19]} /><meshStandardMaterial color="#ddd6c8" roughness={0.96} /></mesh>
    <mesh position={[0, 6.2, -8.8]} receiveShadow><boxGeometry args={[22, 12.5, 0.25]} /><meshStandardMaterial color="#eae7df" roughness={0.88} /></mesh>
    <mesh position={[-10.8, 5.3, 0]}><boxGeometry args={[0.25, 10.6, 18]} /><meshStandardMaterial color="#e6e1d6" roughness={0.85} /></mesh>
    <mesh position={[10.8, 5.3, 0]}><boxGeometry args={[0.25, 10.6, 18]} /><meshStandardMaterial color="#e6e1d6" roughness={0.85} /></mesh>
    <mesh position={[0, 8.7, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[13, 12]} /><meshPhysicalMaterial color="#e9f2eb" transparent opacity={0.34} roughness={0.12} /></mesh>
    {[-8, 8].map((x) => <mesh key={x} position={[x, 3.5, -8.5]}><boxGeometry args={[0.2, 7, 0.32]} /><meshStandardMaterial color="#c9b596" metalness={0.35} roughness={0.45} /></mesh>)}
    <mesh position={[0, 0.02, 1.2]}><cylinderGeometry args={[3.2, 3.2, 0.035, 48]} /><meshStandardMaterial color="#d1c5ad" roughness={0.92} /></mesh>
  </group>;
}

function Station({ agent }: { agent: OfficeAgent }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const selected = useOfficeStore((s) => s.selectedAgentCode === agent.code);
  const select = useOfficeStore((s) => s.selectAgent);
  const setHoveredAgent = useOfficeStore((s) => s.setHoveredAgent);
  const position = deskPositions[agent.code];
  const state = getStatePresentation(agent.visualState);
  const palette = useMemo(() => ({ A01: '#607d6a', B02: '#84745a', B03: '#667f8a', D01: '#9b725e', D02: '#877093', E01: '#68756b' }[agent.code] || '#68756b'), [agent.code]);
  useFrame((frame) => { if (group.current) group.current.position.y = agent.visualState === 'working' ? Math.sin(frame.clock.elapsedTime * 1.4 + position[0]) * 0.018 : 0; });
  return <group ref={group} position={position}>
    <mesh position={[0, 0.68, 0]} castShadow receiveShadow><boxGeometry args={[2.4, 0.16, 1.15]} /><meshStandardMaterial color="#9b7c59" roughness={0.7} /></mesh>
    <mesh position={[0, 0.34, 0]} castShadow><boxGeometry args={[1.65, 0.65, 0.7]} /><meshStandardMaterial color="#ede7dc" roughness={0.88} /></mesh>
    <mesh position={[0.55, 1.18, -0.2]} rotation={[-0.15, 0, 0]}><boxGeometry args={[0.64, 0.44, 0.05]} /><meshStandardMaterial color="#37544a" emissive="#182b25" emissiveIntensity={0.25} roughness={0.35} /></mesh>
    <group position={[0, 0.8, 0.45]} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); setHoveredAgent(agent.code); document.body.style.cursor = 'pointer'; }} onPointerOut={(e) => { e.stopPropagation(); setHovered(false); setHoveredAgent(null); document.body.style.cursor = 'auto'; }} onClick={(e) => { e.stopPropagation(); select(agent.code); }}>
      <mesh castShadow><cylinderGeometry args={[0.28, 0.33, 0.84, 16]} /><meshStandardMaterial color={palette} roughness={0.72} /></mesh>
      <mesh position={[0, 0.62, 0]} castShadow><sphereGeometry args={[0.28, 20, 20]} /><meshStandardMaterial color="#d8a27e" roughness={0.68} /></mesh>
      <mesh position={[0, 0.82, -0.03]} castShadow><sphereGeometry args={[0.285, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#3f332c" roughness={0.9} /></mesh>
      <mesh visible={selected || hovered} position={[0, 0.52, 0]}><torusGeometry args={[0.52, 0.035, 8, 32]} /><meshBasicMaterial color={selected ? '#D4FF00' : '#efe4bd'} /></mesh>
    </group>
    {(hovered || selected) && <Html position={[0, 2.05, 0]} center distanceFactor={13}><div className="pointer-events-none whitespace-nowrap rounded-lg border border-white/25 bg-[#111612]/90 px-2 py-1 text-[10px] font-medium text-white shadow-lg"><span className="text-[#D4FF00]">{agent.code}</span> · {agent.displayName.replace(/^\w+\s+—\s+/, '')}<span className="ml-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: state.dotColor }} /></div></Html>}
  </group>;
}

function CampusScene() {
  const agents = useOfficeStore((s) => s.agents);
  return <><ambientLight intensity={1.65} color="#f5efdf" /><directionalLight castShadow position={[-6, 13, 7]} intensity={2.4} color="#fff6db" shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} /><hemisphereLight args={["#dcefe7", "#8a765e", 1.1]} /><CampusShell /><SculpturalTree />{Object.values(agents).map((agent) => <Station key={agent.code} agent={agent} />)}<ContactShadows position={[0, 0.01, 0]} opacity={0.22} scale={24} blur={2.8} far={10} /></>;
}

export function OfficeCanvas() {
  return <div className="absolute inset-0"><Canvas shadows camera={{ position: [0, 10.5, 18], fov: 44 }} dpr={[1, 1.75]} gl={{ antialias: true, powerPreference: 'high-performance' }}><FocusCamera /><OrbitControls enablePan enableZoom minDistance={7} maxDistance={25} minPolarAngle={Math.PI / 5} maxPolarAngle={Math.PI / 2.05} target={[0, 0.8, 0.5]} /><CampusScene /></Canvas></div>;
}
