'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { AgentCode, AgentVisualState } from '../types/office';

type Vec3 = [number, number, number];
type HairStyle = 'side-part' | 'bob' | 'textured' | 'long' | 'ponytail' | 'crop';
type OutfitStyle = 'suit' | 'blazer' | 'polo' | 'blouse' | 'designer' | 'waistcoat';
type ShoeStyle = 'dress' | 'heel' | 'sneaker';

type CharacterStyle = {
  skin: string;
  hair: string;
  outer: string;
  shirt: string;
  trousers: string;
  shoes: string;
  accent: string;
  upperSleeve: string;
  lowerSleeve: string;
  hairStyle: HairStyle;
  outfit: OutfitStyle;
  shoeStyle: ShoeStyle;
  build: number;
};

const CHARACTER_STYLE: Record<AgentCode, CharacterStyle> = {
  A01: { skin: '#d9a17f', hair: '#241c19', outer: '#5f7066', shirt: '#f3f1ea', trousers: '#34413b', shoes: '#202522', accent: '#d8ff4f', upperSleeve: '#5f7066', lowerSleeve: '#f3f1ea', hairStyle: 'side-part', outfit: 'suit', shoeStyle: 'dress', build: 1.03 },
  B02: { skin: '#efbb99', hair: '#26201e', outer: '#4d8c89', shirt: '#fbf5ec', trousers: '#ebe3d6', shoes: '#d8c6ad', accent: '#79e0d5', upperSleeve: '#4d8c89', lowerSleeve: '#fbf5ec', hairStyle: 'bob', outfit: 'blazer', shoeStyle: 'heel', build: 0.94 },
  B03: { skin: '#c98f6e', hair: '#1d1a19', outer: '#eee9df', shirt: '#eee9df', trousers: '#4d535b', shoes: '#f4f1eb', accent: '#88d8cf', upperSleeve: '#eee9df', lowerSleeve: '#c98f6e', hairStyle: 'textured', outfit: 'polo', shoeStyle: 'sneaker', build: 1 },
  D01: { skin: '#e8ad8b', hair: '#38241f', outer: '#c86f4e', shirt: '#f9e8db', trousers: '#eee4d6', shoes: '#6b4033', accent: '#ffb18c', upperSleeve: '#c86f4e', lowerSleeve: '#c86f4e', hairStyle: 'long', outfit: 'blouse', shoeStyle: 'heel', build: 0.96 },
  D02: { skin: '#dca07e', hair: '#2a201d', outer: '#4f78b7', shirt: '#f2f5fa', trousers: '#355d94', shoes: '#f0f3f8', accent: '#6ec5ff', upperSleeve: '#4f78b7', lowerSleeve: '#f2f5fa', hairStyle: 'ponytail', outfit: 'designer', shoeStyle: 'sneaker', build: 0.93 },
  E01: { skin: '#d19a78', hair: '#22201f', outer: '#303a50', shirt: '#f4f5f5', trousers: '#30384a', shoes: '#4b2e24', accent: '#9eb2d4', upperSleeve: '#f4f5f5', lowerSleeve: '#f4f5f5', hairStyle: 'crop', outfit: 'waistcoat', shoeStyle: 'dress', build: 1.05 },
};

const STATE_SPEED: Record<AgentVisualState, number> = {
  idle: 0.72, working: 5.8, waiting_human: 1.05, reviewing: 1.4,
  reworking: 6.5, success: 2.25, error: 1.8, rejected: 1.2,
};

function Surface({ color, roughness = 0.56, metalness = 0 }: { color: string; roughness?: number; metalness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} envMapIntensity={0.78} />;
}

function Segment({ start, end, radius, color }: { start: Vec3; end: Vec3; radius: number; color: string }) {
  const transform = useMemo(() => {
    const from = new THREE.Vector3(...start);
    const to = new THREE.Vector3(...end);
    const direction = to.clone().sub(from);
    return {
      position: from.add(to).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()),
      length: direction.length(),
    };
  }, [end, start]);
  return (
    <mesh position={transform.position} quaternion={transform.quaternion} castShadow receiveShadow>
      <capsuleGeometry args={[radius, Math.max(0.02, transform.length - radius * 2), 8, 14]} />
      <Surface color={color} />
    </mesh>
  );
}

function Eye({ x, code }: { x: number; code: AgentCode }) {
  const eye = useRef<THREE.Group>(null);
  const phaseOffset = code.charCodeAt(0) * 0.41 + x * 2;
  useFrame(({ clock }) => {
    if (!eye.current) return;
    const target = Math.sin(clock.elapsedTime * 0.78 + phaseOffset) > 0.982 ? 0.09 : 1;
    eye.current.scale.y = THREE.MathUtils.lerp(eye.current.scale.y, target, 0.42);
  });
  return (
    <group ref={eye} position={[x, 1.49, 0.158]}>
      <mesh scale={[0.027, 0.018, 0.012]}><sphereGeometry args={[1, 16, 10]} /><Surface color="#f8f5ef" roughness={0.38} /></mesh>
      <mesh position={[0, 0, 0.013]} scale={[0.011, 0.012, 0.008]}><sphereGeometry args={[1, 14, 8]} /><Surface color="#202927" roughness={0.3} /></mesh>
    </group>
  );
}

function Face({ code, style, smiling }: { code: AgentCode; style: CharacterStyle; smiling: boolean }) {
  return (
    <group>
      <mesh position={[0, 1.45, 0.008]} scale={[0.172, 0.216, 0.164]} castShadow><sphereGeometry args={[1, 30, 22]} /><Surface color={style.skin} roughness={0.6} /></mesh>
      {[-0.174, 0.174].map((x) => <mesh key={x} position={[x, 1.45, 0]} scale={[0.03, 0.055, 0.035]} castShadow><sphereGeometry args={[1, 14, 10]} /><Surface color={style.skin} roughness={0.63} /></mesh>)}
      <Eye x={-0.061} code={code} /><Eye x={0.061} code={code} />
      {[-0.061, 0.061].map((x) => <mesh key={`brow-${x}`} position={[x, 1.528, 0.161]} scale={[0.051, 0.008, 0.008]} rotation={[0, 0, x * -0.9]}><sphereGeometry args={[1, 14, 6]} /><Surface color={style.hair} roughness={0.82} /></mesh>)}
      <mesh position={[0, 1.435, 0.171]} rotation={[Math.PI / 2, 0, 0]} castShadow><coneGeometry args={[0.026, 0.058, 14]} /><Surface color={style.skin} roughness={0.65} /></mesh>
      <mesh position={[0, 1.357, 0.164]} scale={[smiling ? 0.078 : 0.063, 0.011, 0.011]}><sphereGeometry args={[1, 16, 8]} /><Surface color={smiling ? '#a95f58' : '#935b56'} roughness={0.66} /></mesh>
      {smiling && <mesh position={[0, 1.367, 0.171]} scale={[0.052, 0.008, 0.006]}><sphereGeometry args={[1, 14, 6]} /><Surface color="#fff8ef" roughness={0.4} /></mesh>}
    </group>
  );
}

function Hair({ style, color }: { style: HairStyle; color: string }) {
  const ponytail = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ponytail.current) return;
    ponytail.current.rotation.x = Math.sin(clock.elapsedTime * 1.25) * 0.035;
    ponytail.current.rotation.z = Math.sin(clock.elapsedTime * 0.82) * 0.025;
  });
  return (
    <group>
      <mesh position={[0, 1.545, -0.012]} scale={[0.19, 0.132, 0.19]} castShadow><sphereGeometry args={[1, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.68]} /><Surface color={color} roughness={0.72} /></mesh>
      {style === 'side-part' && <><RoundedBox args={[0.23, 0.06, 0.24]} radius={0.025} position={[-0.05, 1.608, 0.045]} rotation={[0.08, 0.12, -0.2]} castShadow><Surface color={color} roughness={0.7} /></RoundedBox><RoundedBox args={[0.055, 0.18, 0.12]} radius={0.025} position={[0.14, 1.51, 0.02]} rotation={[0.02, 0, -0.08]} castShadow><Surface color={color} roughness={0.72} /></RoundedBox></>}
      {style === 'bob' && <><RoundedBox args={[0.09, 0.3, 0.17]} radius={0.043} position={[-0.15, 1.43, -0.012]} castShadow><Surface color={color} roughness={0.72} /></RoundedBox><RoundedBox args={[0.09, 0.3, 0.17]} radius={0.043} position={[0.15, 1.43, -0.012]} castShadow><Surface color={color} roughness={0.72} /></RoundedBox><RoundedBox args={[0.27, 0.12, 0.12]} radius={0.045} position={[0, 1.32, -0.08]} castShadow><Surface color={color} roughness={0.74} /></RoundedBox></>}
      {style === 'textured' && [-0.12, -0.04, 0.04, 0.12].map((x, i) => <mesh key={x} position={[x, 1.618 + (i % 2) * 0.022, 0.012]} scale={[0.07, 0.058, 0.075]} castShadow><icosahedronGeometry args={[1, 2]} /><Surface color={color} roughness={0.76} /></mesh>)}
      {style === 'long' && <><RoundedBox args={[0.33, 0.56, 0.13]} radius={0.06} position={[0, 1.27, -0.12]} castShadow><Surface color={color} roughness={0.74} /></RoundedBox>{[-0.15, 0.15].map((x) => <Segment key={x} start={[x, 1.48, 0]} end={[x * 1.1, 1.15, 0.07]} radius={0.045} color={color} />)}</>}
      {style === 'ponytail' && <group ref={ponytail} position={[0, 1.5, -0.17]}><mesh castShadow><sphereGeometry args={[0.095, 20, 16]} /><Surface color={color} roughness={0.72} /></mesh><Segment start={[0, -0.02, -0.04]} end={[0.025, -0.34, -0.13]} radius={0.06} color={color} /><mesh position={[0.028, -0.37, -0.145]} scale={[0.07, 0.11, 0.065]} castShadow><sphereGeometry args={[1, 18, 12]} /><Surface color={color} roughness={0.73} /></mesh></group>}
      {style === 'crop' && <><RoundedBox args={[0.3, 0.06, 0.21]} radius={0.027} position={[0, 1.61, -0.01]} castShadow><Surface color={color} roughness={0.72} /></RoundedBox><RoundedBox args={[0.08, 0.16, 0.12]} radius={0.03} position={[0.13, 1.51, -0.03]} rotation={[0, 0, -0.1]} castShadow><Surface color={color} roughness={0.73} /></RoundedBox></>}
    </group>
  );
}

function Torso({ style }: { style: CharacterStyle }) {
  const formal = ['suit', 'blazer', 'designer', 'waistcoat'].includes(style.outfit);
  return (
    <group>
      <RoundedBox args={[0.47, 0.56, 0.25]} radius={0.095} position={[0, 0.96, 0.01]} castShadow receiveShadow><Surface color={style.outer} roughness={0.57} /></RoundedBox>
      {formal && <><RoundedBox args={[0.19, 0.4, 0.27]} radius={0.045} position={[0, 1, 0.02]} castShadow><Surface color={style.shirt} roughness={0.62} /></RoundedBox><RoundedBox args={[0.095, 0.34, 0.035]} radius={0.014} position={[-0.077, 1.03, 0.153]} rotation={[0, 0, -0.18]} castShadow><Surface color={style.outer} roughness={0.55} /></RoundedBox><RoundedBox args={[0.095, 0.34, 0.035]} radius={0.014} position={[0.077, 1.03, 0.153]} rotation={[0, 0, 0.18]} castShadow><Surface color={style.outer} roughness={0.55} /></RoundedBox></>}
      {style.outfit === 'polo' && <><RoundedBox args={[0.2, 0.055, 0.025]} radius={0.01} position={[0, 1.18, 0.143]} castShadow><Surface color="#d8d1c5" roughness={0.63} /></RoundedBox><mesh position={[0, 1.16, 0.158]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.07, 0.07, 0.02]} /><Surface color="#c9c1b4" roughness={0.65} /></mesh></>}
      {style.outfit === 'blouse' && <><RoundedBox args={[0.025, 0.38, 0.026]} radius={0.008} position={[0, 0.99, 0.147]} castShadow><Surface color="#e4a080" roughness={0.6} /></RoundedBox>{[-0.11, 0, 0.11].map((y) => <mesh key={y} position={[0, 1 + y, 0.165]}><sphereGeometry args={[0.012, 12, 8]} /><Surface color="#f8d0b8" roughness={0.55} /></mesh>)}</>}
      {style.outfit === 'waistcoat' && [-0.13, -0.045, 0.04, 0.125].map((y) => <mesh key={y} position={[0, 0.97 + y, 0.168]}><sphereGeometry args={[0.012, 12, 8]} /><Surface color="#b6c2d5" roughness={0.48} metalness={0.12} /></mesh>)}
      <RoundedBox args={[0.41, 0.055, 0.27]} radius={0.018} position={[0, 0.67, 0.02]} castShadow><Surface color="#252c2a" roughness={0.55} /></RoundedBox>
      <RoundedBox args={[0.075, 0.065, 0.028]} radius={0.012} position={[0, 0.67, 0.163]} castShadow><Surface color={style.accent} roughness={0.42} metalness={0.16} /></RoundedBox>
    </group>
  );
}

function AnimatedArm({ side, style, visualState, phaseOffset }: { side: -1 | 1; style: CharacterStyle; visualState: AgentVisualState; phaseOffset: number }) {
  const shoulder = useRef<THREE.Group>(null);
  const elbow = useRef<THREE.Group>(null);
  const upperEnd: Vec3 = [side * 0.055, -0.23, 0.31];
  const lowerEnd: Vec3 = [side * -0.018, -0.14, 0.48];
  const typing = visualState === 'working' || visualState === 'reworking';
  const reviewing = visualState === 'reviewing' || visualState === 'waiting_human';
  const success = visualState === 'success';
  useFrame(({ clock }) => {
    const phase = clock.elapsedTime * STATE_SPEED[visualState] + phaseOffset;
    if (shoulder.current) {
      shoulder.current.rotation.z = THREE.MathUtils.lerp(shoulder.current.rotation.z, (success ? side * 1.12 : 0) + (typing ? Math.sin(phase) * 0.018 : 0), 0.12);
      shoulder.current.rotation.y = THREE.MathUtils.lerp(shoulder.current.rotation.y, reviewing ? side * 0.12 : 0, 0.1);
    }
    if (elbow.current) {
      elbow.current.rotation.x = THREE.MathUtils.lerp(elbow.current.rotation.x, (typing ? Math.sin(phase + (side === 1 ? Math.PI : 0)) * 0.045 : 0) + (success ? -0.35 : 0), 0.18);
      elbow.current.rotation.z = THREE.MathUtils.lerp(elbow.current.rotation.z, success ? side * -0.55 : 0, 0.14);
    }
  });
  return (
    <group ref={shoulder} position={[side * 0.22, 1.16, 0.025]}>
      <Segment start={[0, 0, 0]} end={upperEnd} radius={0.066} color={style.upperSleeve} />
      <group ref={elbow} position={upperEnd}>
        <Segment start={[0, 0, 0]} end={lowerEnd} radius={0.052} color={style.lowerSleeve} />
        <RoundedBox args={[0.115, 0.06, 0.13]} radius={0.028} position={lowerEnd} castShadow><Surface color={style.skin} roughness={0.62} /></RoundedBox>
        <RoundedBox args={[0.12, 0.03, 0.055]} radius={0.012} position={[lowerEnd[0], lowerEnd[1] - 0.012, lowerEnd[2] + 0.064]} castShadow><Surface color={style.skin} roughness={0.62} /></RoundedBox>
      </group>
    </group>
  );
}

function SeatedLeg({ side, style, phaseOffset, visualState }: { side: -1 | 1; style: CharacterStyle; phaseOffset: number; visualState: AgentVisualState }) {
  const shoe = useRef<THREE.Group>(null);
  const knee: Vec3 = [side * 0.145, 0.54, 0.48];
  const ankle: Vec3 = [side * 0.145, 0.12, 0.55];
  const sneaker = style.shoeStyle === 'sneaker';
  const heel = style.shoeStyle === 'heel';
  useFrame(({ clock }) => {
    if (!shoe.current) return;
    const active = visualState === 'success' || visualState === 'working' || visualState === 'reworking';
    const target = active ? Math.max(0, Math.sin(clock.elapsedTime * 2.1 + phaseOffset)) * 0.025 : 0;
    shoe.current.position.y = THREE.MathUtils.lerp(shoe.current.position.y, target, 0.16);
  });
  return (
    <group>
      <Segment start={[side * 0.13, 0.59, 0.035]} end={knee} radius={0.09} color={style.trousers} />
      <mesh position={knee} castShadow><sphereGeometry args={[0.094, 18, 12]} /><Surface color={style.trousers} roughness={0.63} /></mesh>
      <Segment start={knee} end={ankle} radius={0.078} color={style.trousers} />
      <group ref={shoe}>
        <RoundedBox args={[0.18, sneaker ? 0.11 : 0.095, sneaker ? 0.31 : 0.285]} radius={0.052} position={[side * 0.145, 0.078, 0.68]} castShadow><Surface color={style.shoes} roughness={sneaker ? 0.5 : 0.4} /></RoundedBox>
        {sneaker && <RoundedBox args={[0.185, 0.028, 0.32]} radius={0.012} position={[side * 0.145, 0.035, 0.68]} castShadow><Surface color="#d9dde3" roughness={0.64} /></RoundedBox>}
        {heel && <RoundedBox args={[0.06, 0.08, 0.06]} radius={0.012} position={[side * 0.145, 0.035, 0.57]} castShadow><Surface color={style.shoes} roughness={0.42} /></RoundedBox>}
      </group>
    </group>
  );
}

function ReviewTablet({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <group position={[0, 0.91, 0.83]} rotation={[-0.54, 0, 0]}><RoundedBox args={[0.46, 0.31, 0.035]} radius={0.025} castShadow><Surface color="#303942" roughness={0.38} metalness={0.1} /></RoundedBox><mesh position={[0, 0, 0.021]}><planeGeometry args={[0.38, 0.235]} /><meshStandardMaterial color="#9de7df" emissive="#1b7873" emissiveIntensity={0.42} roughness={0.34} /></mesh></group>;
}

export function RiggedAgentCharacter({ code, visualState }: { code: AgentCode; visualState: AgentVisualState }) {
  const style = CHARACTER_STYLE[code];
  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const speed = STATE_SPEED[visualState];
  const typing = visualState === 'working' || visualState === 'reworking';
  const reviewing = visualState === 'reviewing' || visualState === 'waiting_human';
  const success = visualState === 'success';
  const phaseOffset = code.charCodeAt(0) * 0.17 + code.charCodeAt(2) * 0.07;
  useFrame(({ clock }) => {
    const phase = clock.elapsedTime * speed + phaseOffset;
    if (root.current) {
      root.current.position.y = Math.sin(phase * 0.42) * (success ? 0.012 : 0.0045);
      root.current.rotation.z = success ? Math.sin(phase * 0.48) * 0.018 : 0;
    }
    if (torso.current) torso.current.rotation.x = THREE.MathUtils.lerp(torso.current.rotation.x, typing ? -0.055 : reviewing ? -0.025 : 0, 0.1);
    if (head.current) {
      head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, reviewing ? Math.sin(phase * 0.52) * 0.17 : Math.sin(phase * 0.2) * 0.026, 0.11);
      head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, typing ? -0.07 : success ? -0.035 : 0, 0.11);
    }
  });
  return (
    <group ref={root} position={[0, 0, 0.08]} scale={[style.build, style.build, style.build]}>
      <RoundedBox args={[0.39, 0.24, 0.285]} radius={0.095} position={[0, 0.59, 0.015]} castShadow receiveShadow><Surface color={style.trousers} roughness={0.63} /></RoundedBox>
      <SeatedLeg side={-1} style={style} phaseOffset={phaseOffset} visualState={visualState} />
      <SeatedLeg side={1} style={style} phaseOffset={phaseOffset + Math.PI} visualState={visualState} />
      <group ref={torso}>
        <Torso style={style} />
        <AnimatedArm side={-1} style={style} visualState={visualState} phaseOffset={phaseOffset} />
        <AnimatedArm side={1} style={style} visualState={visualState} phaseOffset={phaseOffset + Math.PI} />
        <Segment start={[0, 1.205, 0]} end={[0, 1.3, 0]} radius={0.075} color={style.skin} />
        <group ref={head}><Face code={code} style={style} smiling={success} /><Hair style={style.hairStyle} color={style.hair} /></group>
      </group>
      <ReviewTablet visible={reviewing} />
    </group>
  );
}
