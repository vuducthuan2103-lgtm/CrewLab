'use client';

import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getStatePresentation } from '../config/agent-state-map';
import { GARDEN_STATION_LAYOUT } from '../config/office-layout';
import { GardenOfficeScene } from '../scene/GardenOfficeScene';
import { useOfficeStore } from '../state/office-store';
import type { AgentCode } from '../types/office';

const AGENT_ORDER: AgentCode[] = ['A01', 'B02', 'B03', 'D01', 'D02', 'E01'];
const HOME_POSITION = new THREE.Vector3(10.8, 11.2, 15.0);
const HOME_TARGET = new THREE.Vector3(0, 1.45, -0.6);

interface OrbitControlsHandle {
  target?: THREE.Vector3;
  update?: () => void;
}

function GuidedCamera() {
  const selectedAgentCode = useOfficeStore((state) => state.selectedAgentCode);
  const { camera, controls, size } = useThree();
  const destination = useRef(HOME_POSITION.clone());
  const lookAt = useRef(HOME_TARGET.clone());
  const transitioning = useRef(true);

  useEffect(() => {
    if (selectedAgentCode) {
      const [x, , z] = GARDEN_STATION_LAYOUT[selectedAgentCode].position;
      destination.current.set(x + 4.7, 5.5, z + 6.4);
      lookAt.current.set(x, 1.35, z);
    } else {
      const narrowScreenOffset = size.width / Math.max(size.height, 1) < 1.25 ? 3.2 : 0;
      destination.current.set(HOME_POSITION.x, HOME_POSITION.y + narrowScreenOffset * 0.4, HOME_POSITION.z + narrowScreenOffset);
      lookAt.current.copy(HOME_TARGET);
    }
    transitioning.current = true;
  }, [selectedAgentCode, size.height, size.width]);

  useFrame((_, delta) => {
    if (!transitioning.current) return;
    const orbit = controls as OrbitControlsHandle | undefined;
    const easing = 1 - Math.exp(-delta * 5.4);
    camera.position.lerp(destination.current, easing);
    orbit?.target?.lerp(lookAt.current, easing);
    orbit?.update?.();

    const cameraReady = camera.position.distanceToSquared(destination.current) < 0.0025;
    const targetReady = !orbit?.target || orbit.target.distanceToSquared(lookAt.current) < 0.0025;
    if (cameraReady && targetReady) transitioning.current = false;
  });

  return null;
}

function WebGLFallback() {
  const openRoster = useOfficeStore((state) => state.setAccessibleRosterOpen);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#081110] px-6 text-center text-zinc-100">
      <div className="max-w-md border border-white/10 bg-[#0d1715] p-6 shadow-2xl">
        <p className="text-sm font-semibold">Thiết bị chưa thể mở không gian 3D</p>
        <p className="mt-2 text-xs leading-5 text-zinc-400">Bạn vẫn có thể xem trạng thái và tác vụ của toàn bộ đội ngũ bằng chế độ danh sách.</p>
        <button type="button" onClick={() => openRoster(true)} className="mt-4 bg-[#D4FF00] px-4 py-2 text-xs font-semibold text-[#0a0e0c]">Mở danh sách agent</button>
      </div>
    </div>
  );
}

export function OfficeCanvas() {
  const agents = useOfficeStore((state) => state.agents);
  const selectAgent = useOfficeStore((state) => state.selectAgent);
  const setHoveredAgent = useOfficeStore((state) => state.setHoveredAgent);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#193c3b]">
      <Canvas
        shadows
        camera={{ position: [HOME_POSITION.x, HOME_POSITION.y, HOME_POSITION.z], fov: 39, near: 0.1, far: 90 }}
        dpr={[1, 1.5]}
        fallback={<WebGLFallback />}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.03;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <GuidedCamera />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.075}
          enablePan={false}
          enableZoom
          minDistance={6.8}
          maxDistance={34}
          minPolarAngle={Math.PI / 5.4}
          maxPolarAngle={Math.PI / 2.12}
          minAzimuthAngle={-Math.PI / 3.2}
          maxAzimuthAngle={Math.PI / 3.2}
          target={[HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z]}
        />
        <Suspense fallback={null}>
          <GardenOfficeScene />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_36%,transparent_0%,transparent_47%,rgba(7,18,15,0.22)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#07110e]/45 to-transparent" />

      <div className="sr-only" aria-label="Chọn agent trong văn phòng 3D">
        {AGENT_ORDER.map((code) => {
          const agent = agents[code];
          if (!agent) return null;
          const presentation = getStatePresentation(agent.visualState);
          return (
            <button
              key={code}
              type="button"
              data-testid={`office-agent-${code}`}
              aria-label={`${code}, ${agent.role}, ${presentation.labelVi}`}
              onClick={() => selectAgent(code)}
              onFocus={() => setHoveredAgent(code)}
              onBlur={() => setHoveredAgent(null)}
            >
              {code} — {agent.role}
            </button>
          );
        })}
      </div>
    </div>
  );
}
