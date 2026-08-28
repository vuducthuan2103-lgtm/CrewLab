'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { AgentCode, AgentVisualState } from '../types/office';

type CharacterStyle = {
  skin: string;
  hair: string;
  jacket: string;
  shirt: string;
  trousers: string;
  shoes: string;
  hairStyle: 'side-part' | 'bob' | 'textured' | 'long' | 'ponytail' | 'crop';
  build: number;
};

const CHARACTER_STYLE: Record<AgentCode, CharacterStyle> = {
  A01: { skin: '#d9a17f', hair: '#2d211d', jacket: '#6f8177', shirt: '#eef1e9', trousers: '#34433d', shoes: '#252a27', hairStyle: 'side-part', build: 1.03 },
  B02: { skin: '#efbb99', hair: '#27211f', jacket: '#4f8c89', shirt: '#f7f0e8', trousers: '#315e5d', shoes: '#e7ddcf', hairStyle: 'bob', build: 0.94 },
  B03: { skin: '#c98f6e', hair: '#201c1b', jacket: '#d7d0c1', shirt: '#f5f1e9', trousers: '#5e615f', shoes: '#f0ece4', hairStyle: 'textured', build: 1.0 },
  D01: { skin: '#e8ad8b', hair: '#3b2721', jacket: '#c87655', shirt: '#fff0e5', trousers: '#703e34', shoes: '#4a2b25', hairStyle: 'long', build: 0.96 },
  D02: { skin: '#dca07e', hair: '#2d211d', jacket: '#557fbd', shirt: '#edf3fb', trousers: '#2e4f80', shoes: '#e9edf4', hairStyle: 'ponytail', build: 0.93 },
  E01: { skin: '#d19a78', hair: '#252322', jacket: '#697a92', shirt: '#f2f3f5', trousers: '#343d4c', shoes: '#252b35', hairStyle: 'crop', build: 1.05 },
};

const STATE_SPEED: Record<AgentVisualState, number> = {
  idle: 0.7, working: 5.8, waiting_human: 1.0, reviewing: 1.35,
  reworking: 6.6, success: 2.2, error: 1.8, rejected: 1.2,
};

function Segment({ start, end, radius, color }: { start: [number, number, number]; end: [number, number, number]; radius: number; color: string }) {
  const transform = useMemo(() => {
    const from = new THREE.Vector3(...start);
    const to = new THREE.Vector3(...end);
    const direction = to.clone().sub(from);
    const length = direction.length();
    return {
      position: from.add(to).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
      length,
    };
  }, [end, start]);
  return (
    <mesh position={transform.position} quaternion={transform.quaternion} castShadow receiveShadow>
      <capsuleGeometry args={[radius, Math.max(0.02, transform.length - radius * 2), 8, 14]} />
      <meshStandardMaterial color={color} roughness={0.56} envMapIntensity={0.75} />
    </mesh>
  );
}

function Hair({ style, color }: { style: CharacterStyle['hairStyle']; color: string }) {
  const common = <meshStandardMaterial color={color} roughness={0.72} envMapIntensity={0.42} />;
  return (
    <group>
      <mesh position={[0, 1.51, -0.015]} scale={[0.19, 0.13, 0.19]} castShadow>
        <sphereGeometry args={[1, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.67]} />{common}
      </mesh>
      {style === 'side-part' && <RoundedBox args={[0.2, 0.055, 0.24]} radius={0.025} position={[-0.055, 1.57, 0.055]} rotation={[0.08, 0.12, -0.18]} castShadow>{common}</RoundedBox>}
      {style === 'bob' && <><RoundedBox args={[0.08, 0.27, 0.16]} radius={0.04} position={[-0.15, 1.43, -0.015]} castShadow>{common}</RoundedBox><RoundedBox args={[0.08, 0.27, 0.16]} radius={0.04} position={[0.15, 1.43, -0.015]} castShadow>{common}</RoundedBox></>}
      {style === 'textured' && [-0.11, -0.04, 0.04, 0.11].map((x, index) => <mesh key={x} position={[x, 1.59 + (index % 2) * 0.018, 0.015]} scale={[0.065, 0.055, 0.07]} castShadow><icosahedronGeometry args={[1, 2]} />{common}</mesh>)}
      {style === 'long' && <RoundedBox args={[0.31, 0.5, 0.12]} radius={0.055} position={[0, 1.29, -0.105]} castShadow>{common}</RoundedBox>}
      {style === 'ponytail' && <><mesh position={[0, 1.49, -0.18]} castShadow><sphereGeometry args={[0.09, 20, 16]} />{common}</mesh><Segment start={[0, 1.47, -0.22]} end={[0, 1.18, -0.29]} radius={0.055} color={color} /></>}
      {style === 'crop' && <RoundedBox args={[0.29, 0.055, 0.2]} radius={0.025} position={[0, 1.56, -0.01]} castShadow>{common}</RoundedBox>}
    </group>
  );
}

function Face({ skin, hair }: { skin: string; hair: string }) {
  return (
    <group>
      <mesh position={[0, 1.43, 0.005]} scale={[0.17, 0.21, 0.16]} castShadow><sphereGeometry args={[1, 30, 22]} /><meshStandardMaterial color={skin} roughness={0.62} /></mesh>
      <mesh position={[0, 1.42, 0.166]} rotation={[Math.PI / 2, 0, 0]} castShadow><coneGeometry args={[0.025, 0.055, 12]} /><meshStandardMaterial color={skin} roughness={0.65} /></mesh>
      {[-0.062, 0.062].map((x) => <group key={x}><mesh position={[x, 1.46, 0.15]}><sphereGeometry args={[0.018, 14, 10]} /><meshStandardMaterial color="#f7f4ee" roughness={0.4} /></mesh><mesh position={[x, 1.46, 0.166]}><sphereGeometry args={[0.008, 12, 8]} /><meshStandardMaterial color="#202a28" roughness={0.32} /></mesh><mesh position={[x, 1.495, 0.16]} scale={[0.05, 0.008, 0.008]}><sphereGeometry args={[1, 12, 6]} /><meshStandardMaterial color={hair} roughness={0.8} /></mesh></group>)}
      <mesh position={[0, 1.36, 0.16]} scale={[0.065, 0.009, 0.01]}><sphereGeometry args={[1, 14, 8]} /><meshStandardMaterial color="#9b5f57" roughness={0.68} /></mesh>
    </group>
  );
}

export function RiggedAgentCharacter({ code, visualState }: { code: AgentCode; visualState: AgentVisualState }) {
  const style = CHARACTER_STYLE[code];
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const leftHand = useRef<THREE.Mesh>(null);
  const rightHand = useRef<THREE.Mesh>(null);
  const speed = STATE_SPEED[visualState];
  const leftWrist: [number, number, number] = [-0.16, 0.79, 0.54];
  const rightWrist: [number, number, number] = [0.16, 0.79, 0.54];

  useFrame(({ clock }) => {
    const phase = clock.elapsedTime * speed + code.charCodeAt(0) * 0.17;
    const typing = visualState === 'working' || visualState === 'reworking';
    const reviewing = visualState === 'reviewing' || visualState === 'waiting_human';
    if (root.current) {
      root.current.position.y = Math.sin(phase * 0.42) * 0.004;
      root.current.rotation.x = typing ? -0.035 : reviewing ? 0.018 : 0;
    }
    if (head.current) {
      head.current.rotation.y = reviewing ? Math.sin(phase * 0.55) * 0.16 : Math.sin(phase * 0.22) * 0.025;
      head.current.rotation.x = typing ? -0.055 : 0;
    }
    const handLift = typing ? 0.016 : 0.004;
    if (leftHand.current) {
      leftHand.current.position.y = leftWrist[1] + Math.max(0, Math.sin(phase)) * handLift;
      leftHand.current.position.z = leftWrist[2] + Math.cos(phase) * handLift * 0.65;
    }
    if (rightHand.current) {
      rightHand.current.position.y = rightWrist[1] + Math.max(0, Math.sin(phase + Math.PI)) * handLift;
      rightHand.current.position.z = rightWrist[2] + Math.cos(phase + Math.PI) * handLift * 0.65;
    }
  });

  return (
    <group ref={root} scale={[style.build, style.build, style.build]}>
      <RoundedBox args={[0.38, 0.23, 0.27]} radius={0.09} position={[0, 0.58, 0]} castShadow receiveShadow><meshStandardMaterial color={style.trousers} roughness={0.64} /></RoundedBox>
      <RoundedBox args={[0.47, 0.56, 0.25]} radius={0.1} position={[0, 0.93, 0.005]} castShadow receiveShadow><meshStandardMaterial color={style.jacket} roughness={0.58} envMapIntensity={0.72} /></RoundedBox>
      <RoundedBox args={[0.19, 0.38, 0.265]} radius={0.05} position={[0, 1.01, 0.015]} castShadow><meshStandardMaterial color={style.shirt} roughness={0.62} /></RoundedBox>
      <mesh position={[0, 1.15, 0.145]}><boxGeometry args={[0.13, 0.055, 0.012]} /><meshStandardMaterial color="#d7ff41" roughness={0.42} /></mesh>
      <Segment start={[-0.13, 0.59, 0.03]} end={[-0.14, 0.55, 0.45]} radius={0.09} color={style.trousers} />
      <Segment start={[0.13, 0.59, 0.03]} end={[0.14, 0.55, 0.45]} radius={0.09} color={style.trousers} />
      <Segment start={[-0.14, 0.55, 0.45]} end={[-0.14, 0.12, 0.47]} radius={0.078} color={style.trousers} />
      <Segment start={[0.14, 0.55, 0.45]} end={[0.14, 0.12, 0.47]} radius={0.078} color={style.trousers} />
      <RoundedBox args={[0.17, 0.1, 0.28]} radius={0.05} position={[-0.14, 0.08, 0.58]} castShadow><meshStandardMaterial color={style.shoes} roughness={0.48} /></RoundedBox>
      <RoundedBox args={[0.17, 0.1, 0.28]} radius={0.05} position={[0.14, 0.08, 0.58]} castShadow><meshStandardMaterial color={style.shoes} roughness={0.48} /></RoundedBox>
      <Segment start={[-0.22, 1.16, 0.02]} end={[-0.27, 0.96, 0.25]} radius={0.062} color={style.jacket} />
      <Segment start={[0.22, 1.16, 0.02]} end={[0.27, 0.96, 0.25]} radius={0.062} color={style.jacket} />
      <Segment start={[-0.27, 0.96, 0.25]} end={leftWrist} radius={0.052} color={style.skin} />
      <Segment start={[0.27, 0.96, 0.25]} end={rightWrist} radius={0.052} color={style.skin} />
      <mesh ref={leftHand} position={leftWrist} scale={[0.073, 0.035, 0.09]} castShadow><sphereGeometry args={[1, 18, 12]} /><meshStandardMaterial color={style.skin} roughness={0.62} /></mesh>
      <mesh ref={rightHand} position={rightWrist} scale={[0.073, 0.035, 0.09]} castShadow><sphereGeometry args={[1, 18, 12]} /><meshStandardMaterial color={style.skin} roughness={0.62} /></mesh>
      <Segment start={[0, 1.2, 0]} end={[0, 1.29, 0]} radius={0.075} color={style.skin} />
      <group ref={head}><Face skin={style.skin} hair={style.hair} /><Hair style={style.hairStyle} color={style.hair} /></group>
    </group>
  );
}
