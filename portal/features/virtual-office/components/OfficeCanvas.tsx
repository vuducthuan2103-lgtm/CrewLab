'use client';

import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { getStatePresentation } from '../config/agent-state-map';
import { GARDEN_STATION_LAYOUT } from '../config/office-layout';
import { GardenOfficeScene } from '../scene/GardenOfficeScene';
import { useOfficeStore } from '../state/office-store';
import type { AgentCode } from '../types/office';

const AGENT_ORDER: AgentCode[] = ['A01', 'B02', 'B03', 'D01', 'D02', 'E01'];
// Mirrors the approved v5 Blender 52 mm hero camera after glTF's Z-up to Y-up
// axis conversion: Blender (x, y, z) becomes Three.js (x, z, -y).
const HOME_POSITION = new THREE.Vector3(11.2, 10.8, 18.2);
const HOME_TARGET = new THREE.Vector3(0, 2.08, -0.35);

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
      destination.current.set(x + 3.65, 4.65, z + 5.05);
      lookAt.current.set(x, 1.48, z);
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

function SceneLoadingFallback() {
  return (
    <>
      <color attach="background" args={['#bfd8d3']} />
      <fog attach="fog" args={['#c8ddd7', 39, 68]} />
      <ambientLight intensity={0.9} color="#f8fbff" />
    </>
  );
}

function SceneLoadOverlay() {
  const { active, errors, progress } = useProgress();
  const openRoster = useOfficeStore((state) => state.setAccessibleRosterOpen);
  const hasError = errors.length > 0;

  if (!active && !hasError) return null;

  const safeProgress = Number.isFinite(progress) ? Math.min(100, Math.max(0, Math.round(progress))) : 0;

  return (
    <div
      data-testid="office-scene-loading"
      role={hasError ? 'alert' : 'status'}
      aria-live="polite"
      className="absolute inset-0 z-20 flex items-center justify-center bg-[radial-gradient(circle_at_50%_38%,rgba(239,249,244,0.96)_0%,rgba(191,216,211,0.94)_48%,rgba(130,183,177,0.96)_100%)] px-6 text-center"
    >
      <div className="w-full max-w-xs rounded-2xl border border-white/65 bg-[#f8fbf7]/88 p-5 text-[#173b34] shadow-[0_22px_70px_rgba(23,59,52,0.24)] backdrop-blur-xl">
        {hasError ? (
          <>
            <p className="text-sm font-semibold">Chưa tải được một asset 3D</p>
            <p className="mt-2 text-xs leading-5 text-[#45635d]">Bạn có thể thử tải lại hoặc mở danh sách agent để tiếp tục làm việc.</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-[#173b34] px-3 py-2 text-xs font-semibold text-white">Thử lại</button>
              <button type="button" onClick={() => openRoster(true)} className="rounded-lg border border-[#173b34]/20 bg-white/75 px-3 py-2 text-xs font-semibold text-[#173b34]">Mở danh sách</button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-[#173b34]/15 bg-white/80 shadow-sm">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#173b34]/20 border-t-[#54a99e]" />
            </div>
            <p className="mt-3 text-sm font-semibold">Đang dựng văn phòng 3D</p>
            <p className="mt-1 text-xs text-[#54716b]">Đang tải môi trường và 6 nhân vật · {safeProgress}%</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#173b34]/10">
              <div className="h-full rounded-full bg-[#54a99e] transition-[width] duration-300" style={{ width: `${Math.max(4, safeProgress)}%` }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function OfficeCanvas() {
  const agents = useOfficeStore((state) => state.agents);
  const selectAgent = useOfficeStore((state) => state.selectAgent);
  const setHoveredAgent = useOfficeStore((state) => state.setHoveredAgent);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#c9e2df]">
      <Canvas
        shadows
        camera={{ position: [HOME_POSITION.x, HOME_POSITION.y, HOME_POSITION.z], fov: 38, near: 0.1, far: 90 }}
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
          gl.toneMappingExposure = 1.1;
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
          minDistance={5.8}
          maxDistance={31}
          minPolarAngle={Math.PI / 5.4}
          maxPolarAngle={Math.PI / 2.12}
          minAzimuthAngle={-Math.PI / 3.2}
          maxAzimuthAngle={Math.PI / 3.2}
          target={[HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z]}
        />
        <Suspense fallback={<SceneLoadingFallback />}>
          <GardenOfficeScene />
        </Suspense>
      </Canvas>

      <SceneLoadOverlay />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_36%,transparent_0%,transparent_66%,rgba(35,72,65,0.06)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#173b34]/10 to-transparent" />

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
