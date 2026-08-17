'use client';

import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Physics } from '@react-three/rapier';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { OfficeLighting } from '../scene/OfficeLighting';
import { OfficeRoom } from '../scene/OfficeRoom';
import { WorkstationDesk } from '../scene/WorkstationDesk';
import { AgentCharacter } from '../characters/AgentCharacter';
import { CEOCharacter } from '../characters/CEOCharacter';
import { TaskHandoffEffect } from './TaskHandoffEffect';
import { OfficeCelebrationEffect } from './OfficeCelebrationEffect';
import { useOfficeStore } from '../state/office-store';
import { AgentCode } from '../types/office';

/** Sets Three.js scene background & fog based on time of day */
const SceneBackground: React.FC = () => {
  const timeOfDay = useOfficeStore((s) => s.timeOfDay);
  const isDay = timeOfDay === 'day';
  return (
    <>
      {/* Day: Soft, natural daylight sky; Night: deep-space midnight */}
      <color attach="background" args={[isDay ? '#93c5fd' : '#090912']} />
      <fog attach="fog" args={[isDay ? '#bfdbfe' : '#0b0b14', isDay ? 30 : 14, isDay ? 85 : 48]} />
    </>
  );
};

/**
 * Camera Focus & Return Controller:
 * - Only runs smooth transition animation when an agent is selected OR when closed.
 * - When transition reaches target, stops touching the camera completely so manual
 *   mouse wheel zoom / OrbitControls rotation is 100% smooth, free and unconstrained.
 */
const AgentCameraAnimator: React.FC = () => {
  const selectedAgentCode = useOfficeStore((s) => s.selectedAgentCode);
  const agents = useOfficeStore((s) => s.agents);
  const { camera, controls } = useThree();

  const prevSelectedRef = useRef<AgentCode | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const targetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 10, 17));
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.0, -1.5));
  const targetFovRef = useRef<number>(46);

  const defaultCamPos = new THREE.Vector3(0, 9.8, 20.5);
  const defaultTarget = new THREE.Vector3(0, 2.5, -1.0);
  const defaultFov = 46;

  // Detect selection changes
  useEffect(() => {
    if (selectedAgentCode && agents[selectedAgentCode]) {
      // 🎯 Clicked an agent: Calculate workstation close-up angle
      const ag = agents[selectedAgentCode];
      const [ax, , az] = ag.position;

      let camX = ax;
      let camY = 1.9;
      let camZ = az + 2.8;

      if (ag.code === 'A01') {
        camX = 0;
        camY = 1.9;
        camZ = -2.5;
      } else if (ag.code === 'B02') {
        camX = -4.2;
        camY = 1.9;
        camZ = -3.2;
      } else if (ag.code === 'B03') {
        camX = -4.2;
        camY = 1.9;
        camZ = 1.8;
      } else if (ag.code === 'D01') {
        camX = 4.2;
        camY = 1.9;
        camZ = -3.2;
      } else if (ag.code === 'D02') {
        camX = 4.2;
        camY = 1.9;
        camZ = 1.8;
      } else if (ag.code === 'E01') {
        camX = 0;
        camY = 1.9;
        camZ = 2.8;
      }

      targetPosRef.current.set(camX, camY, camZ);
      targetLookAtRef.current.set(ax, 1.05, az);
      targetFovRef.current = 38;
      isTransitioningRef.current = true;
    } else if (prevSelectedRef.current !== null && !selectedAgentCode) {
      // 🏠 Closed agent detail: Animate back to original overview
      targetPosRef.current.copy(defaultCamPos);
      targetLookAtRef.current.copy(defaultTarget);
      targetFovRef.current = defaultFov;
      isTransitioningRef.current = true;
    }

    prevSelectedRef.current = selectedAgentCode;
  }, [selectedAgentCode, agents]);

  useFrame((_, delta) => {
    if (!isTransitioningRef.current) return;

    const orbitControls = controls as any;
    const lerpSpeed = Math.min(1, delta * 12); // Fast snappy transition (~0.3s)

    // Smoothly interpolate position
    camera.position.lerp(targetPosRef.current, lerpSpeed);

    // Smoothly interpolate OrbitControls look-at target
    if (orbitControls && orbitControls.target) {
      orbitControls.target.lerp(targetLookAtRef.current, lerpSpeed);
      orbitControls.update();
    }

    // Smoothly interpolate FOV
    const pCam = camera as THREE.PerspectiveCamera;
    if (pCam.fov !== undefined) {
      pCam.fov = THREE.MathUtils.lerp(pCam.fov, targetFovRef.current, lerpSpeed);
      pCam.updateProjectionMatrix();
    }

    // Check if close enough to target to stop transition and release control
    const distPos = camera.position.distanceTo(targetPosRef.current);
    const distTarget = orbitControls?.target ? orbitControls.target.distanceTo(targetLookAtRef.current) : 0;

    if (distPos < 0.04 && distTarget < 0.04) {
      // Snap exact final values and release full manual control to user
      camera.position.copy(targetPosRef.current);
      if (orbitControls && orbitControls.target) {
        orbitControls.target.copy(targetLookAtRef.current);
        orbitControls.update();
      }
      pCam.fov = targetFovRef.current;
      pCam.updateProjectionMatrix();
      isTransitioningRef.current = false;
    }
  });

  return null;
};

export const OfficeCanvas: React.FC = () => {
  const agents = useOfficeStore((s) => s.agents);

  return (
    <div className="absolute inset-0 w-full h-full z-0">
      <Canvas
        shadows
        // Camera framed to view the towering 9m walls and all agent workstations
        camera={{ position: [0, 9.8, 20.5], fov: 46 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >

        {/* Transition-based Agent Focus Animator */}
        <AgentCameraAnimator />

        {/* Orbit controls tuned with exact zoom bounds */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={4.0}
          maxDistance={23.5}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2 - 0.04}
          target={[0, 2.5, -1.0]}
        />

        {/* Scene-level background & fog — must be outside group for correct attach */}
        <SceneBackground />

        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]}>
            {/* 1. LIGHTING & ENVIRONMENT */}
            <OfficeLighting />
            <OfficeRoom />

            {/* Soft contact shadows for grounding */}
            <ContactShadows position={[0, 0.015, 0]} opacity={0.6} scale={30} blur={2.2} far={7} />

            {/* 2. CEO CHARACTER — walks in front area */}
            <CEOCharacter />

            {/* ═══════════════════════════════════════════
                3. AGENT WORKSTATIONS
                Layout:
                  Back-Center:  A01 (Orchestrator)
                  Left column:  B02 (top-left), B03 (mid-left)
                  Right column: D01 (top-right), D02 (mid-right)
                  Front-Center: E01 (QA Gate)
               ═══════════════════════════════════════════ */}

            {/* Zone 1: Coordination — A01 Center desk (larger, prominent) */}
            {agents['A01'] && (
              <group>
                <WorkstationDesk
                  position={agents['A01'].position}
                  rotation={agents['A01'].rotation}
                  screenColor="#38bdf8"
                  screenType="coordination"
                  hasDualMonitors={true}
                />
                <AgentCharacter agent={agents['A01']} />
              </group>
            )}

            {/* Zone 2: Strategy — B02 top-left */}
            {agents['B02'] && (
              <group>
                <WorkstationDesk
                  position={agents['B02'].position}
                  rotation={agents['B02'].rotation}
                  screenColor="#10b981"
                  screenType="strategy"
                  hasDualMonitors={false}
                />
                <AgentCharacter agent={agents['B02']} />
              </group>
            )}

            {/* Zone 2: Strategy — B03 mid-left */}
            {agents['B03'] && (
              <group>
                <WorkstationDesk
                  position={agents['B03'].position}
                  rotation={agents['B03'].rotation}
                  screenColor="#14b8a6"
                  screenType="calendar"
                  hasDualMonitors={false}
                />
                <AgentCharacter agent={agents['B03']} />
              </group>
            )}

            {/* Zone 3: Creative — D01 top-right */}
            {agents['D01'] && (
              <group>
                <WorkstationDesk
                  position={agents['D01'].position}
                  rotation={agents['D01'].rotation}
                  screenColor="#f59e0b"
                  screenType="copywriting"
                  hasDualMonitors={true}
                />
                <AgentCharacter agent={agents['D01']} />
              </group>
            )}

            {/* Zone 3: Creative — D02 mid-right */}
            {agents['D02'] && (
              <group>
                <WorkstationDesk
                  position={agents['D02'].position}
                  rotation={agents['D02'].rotation}
                  screenColor="#ea580c"
                  screenType="design"
                  hasDualMonitors={true}
                />
                <AgentCharacter agent={agents['D02']} />
              </group>
            )}

            {/* Zone 4: QA Gate — E01 front-center */}
            {agents['E01'] && (
              <group>
                <WorkstationDesk
                  position={agents['E01'].position}
                  rotation={agents['E01'].rotation}
                  screenColor="#a855f7"
                  screenType="qa"
                  hasDualMonitors={false}
                />
                <AgentCharacter agent={agents['E01']} />
              </group>
            )}

            {/* ═══════════════════════════════════════════
                P2.1 & P2.4 SIGNATURE INTERACTIVE EFFECTS
               ═══════════════════════════════════════════ */}
            {/* P2.1: Visual 3D Task Handoff Trajectory */}
            <TaskHandoffEffect />

            {/* P2.4: Weekly Milestone Confetti Celebration */}
            <OfficeCelebrationEffect />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
};
