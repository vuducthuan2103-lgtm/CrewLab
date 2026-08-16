'use client';

import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CapsuleCollider } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

import { useOfficeStore } from '../state/office-store';
import { INITIAL_OFFICE_AGENTS } from '../config/office-layout';
import { AgentCode } from '../types/office';

const SPEED = 3.6; // Refined walking speed: smoother, natural, easily controllable
const PROXIMITY_ENTER_DIST = 3.0;
const PROXIMITY_EXIT_DIST = 3.6;

export const CEOCharacter: React.FC = () => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const characterMeshRef = useRef<THREE.Group>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastCheckedTime = useRef<number>(0);

  const setNearbyAgentCode = useOfficeStore((s) => s.setNearbyAgentCode);
  const currentNearbyCode = useOfficeStore((s) => s.nearbyAgentCode);
  const dismissedCode = useOfficeStore((s) => s.dismissedNearbyAgentCode);
  const clearDismissedNearby = useOfficeStore((s) => s.clearDismissedNearby);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      if (e.key) {
        keysPressed.current[e.key.toLowerCase()] = true;
        keysPressed.current[e.key.toUpperCase()] = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
      if (e.key) {
        keysPressed.current[e.key.toLowerCase()] = false;
        keysPressed.current[e.key.toUpperCase()] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    const autoWalkTarget = useOfficeStore.getState().autoWalkTargetAgentCode;
    const cancelAutoWalk = useOfficeStore.getState().cancelAutoWalk;
    const selectAgent = useOfficeStore.getState().selectAgent;

    const keys = keysPressed.current;
    let moveX = 0;
    let moveZ = 0;

    if (keys['KeyW'] || keys['ArrowUp'] || keys['w'] || keys['W']) moveZ -= 1;
    if (keys['KeyS'] || keys['ArrowDown'] || keys['s'] || keys['S']) moveZ += 1;
    if (keys['KeyA'] || keys['ArrowLeft'] || keys['a'] || keys['A']) moveX -= 1;
    if (keys['KeyD'] || keys['ArrowRight'] || keys['d'] || keys['D']) moveX += 1;

    const isManualMoving = moveX !== 0 || moveZ !== 0;

    // If user gives manual movement input during auto-walk, cancel auto-walk immediately
    if (isManualMoving && autoWalkTarget) {
      cancelAutoWalk();
    }

    const curPos = rigidBodyRef.current.translation();
    let isMoving = isManualMoving;
    let normX = 0;
    let normZ = 0;

    if (isManualMoving) {
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
      normX = (moveX / length) * SPEED;
      normZ = (moveZ / length) * SPEED;
    } else if (autoWalkTarget && INITIAL_OFFICE_AGENTS[autoWalkTarget]) {
      // 🚶 AUTO-WALK NAVIGATION TO TARGET AGENT
      const targetAgent = INITIAL_OFFICE_AGENTS[autoWalkTarget];
      // Target front-of-desk approach point
      const targetX = targetAgent.position[0];
      const targetZ = targetAgent.position[2] + 1.5;

      const dx = targetX - curPos.x;
      const dz = targetZ - curPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.65) {
        isMoving = true;
        normX = (dx / dist) * SPEED;
        normZ = (dz / dist) * SPEED;
      } else {
        // Arrived at target agent
        cancelAutoWalk();
        selectAgent(autoWalkTarget);
      }
    }

    if (isMoving) {
      // Apply linear velocity and kinematic translation step for 100% reliable responsiveness
      rigidBodyRef.current.setLinvel({ x: normX, y: 0, z: normZ }, true);

      const newX = Math.max(-11.5, Math.min(11.5, curPos.x + normX * delta));
      const newZ = Math.max(-9.5, Math.min(9.5, curPos.z + normZ * delta));
      rigidBodyRef.current.setTranslation({ x: newX, y: 0.75, z: newZ }, true);

      // Rotate character mesh towards direction of motion
      if (characterMeshRef.current) {
        const targetAngle = Math.atan2(normX, normZ);
        characterMeshRef.current.rotation.y = THREE.MathUtils.lerp(
          characterMeshRef.current.rotation.y,
          targetAngle,
          delta * 16
        );
        // Walking bobbing effect
        characterMeshRef.current.position.y = Math.sin(Date.now() * 0.018) * 0.06;
      }
    } else {
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      if (characterMeshRef.current) {
        characterMeshRef.current.position.y = 0;
      }
    }

    // Safety ground check — ONLY if fallen below world floor (y < -2.0)
    if (curPos.y < -2.0 || isNaN(curPos.y)) {
      rigidBodyRef.current.setTranslation({ x: 0, y: 0.75, z: 1.2 }, true);
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    // ── PROXIMITY DETECTION TO AGENTS (Throttled to every 60ms) ──
    const now = state.clock.getElapsedTime();
    if (now - lastCheckedTime.current > 0.06) {
      lastCheckedTime.current = now;
      const translation = rigidBodyRef.current.translation();
      useOfficeStore.getState().setCeoPosition([translation.x, translation.y, translation.z]);

      let closestCode: AgentCode | null = null;
      let minDistance = Infinity;

      Object.values(INITIAL_OFFICE_AGENTS).forEach((agent) => {
        const dx = translation.x - agent.position[0];
        const dz = translation.z - agent.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < minDistance) {
          minDistance = dist;
          if (dist <= PROXIMITY_ENTER_DIST) {
            closestCode = agent.code;
          }
        }
      });

      // Only trigger proximity if not manually closed by CEO while standing here
      if (closestCode && closestCode !== currentNearbyCode && closestCode !== dismissedCode) {
        setNearbyAgentCode(closestCode);
      } else if (!closestCode && minDistance > PROXIMITY_EXIT_DIST) {
        if (currentNearbyCode !== null) {
          setNearbyAgentCode(null);
        }
        if (dismissedCode !== null) {
          clearDismissedNearby(); // Reset dismissal when walking away
        }
      }
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders={false}
      position={[0, 0.75, 1.2]}
      lockRotations
      linearDamping={0.4}
      type="dynamic"
    >
      <CapsuleCollider args={[0.45, 0.3]} position={[0, 0, 0]} />

      <group ref={characterMeshRef}>
        {/* 3D Golden Crown on CEO Head */}
        <group position={[0, 0.88, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.14, 0.11, 0.12, 5]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.15} emissive="#f59e0b" emissiveIntensity={0.2} />
          </mesh>
          {/* Crown Jewels / Points */}
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = (i * Math.PI * 2) / 5;
            return (
              <mesh key={`jewel-${i}`} position={[Math.cos(angle) * 0.13, 0.08, Math.sin(angle) * 0.13]}>
                <sphereGeometry args={[0.025, 8, 8]} />
                <meshBasicMaterial color="#ef4444" />
              </mesh>
            );
          })}
        </group>

        {/* Head */}
        <mesh position={[0, 0.58, 0]} castShadow>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.3} metalness={0.1} />
        </mesh>

        {/* Executive Pompadour Hair */}
        <mesh position={[0, 0.70, -0.04]} castShadow>
          <sphereGeometry args={[0.21, 16, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.74, 0.08]} rotation={[0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.24, 0.1, 0.16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} />
        </mesh>

        {/* Face Details — Eyes, Brows, Confident Smile */}
        <mesh position={[-0.07, 0.60, 0.20]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#09090b" />
        </mesh>
        <mesh position={[0.07, 0.60, 0.20]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#09090b" />
        </mesh>
        {/* Eyebrows */}
        <mesh position={[-0.07, 0.64, 0.20]} rotation={[0, 0, -0.1]}>
          <boxGeometry args={[0.06, 0.015, 0.02]} />
          <meshBasicMaterial color="#09090b" />
        </mesh>
        <mesh position={[0.07, 0.64, 0.20]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.06, 0.015, 0.02]} />
          <meshBasicMaterial color="#09090b" />
        </mesh>
        {/* Smile */}
        <mesh position={[0, 0.53, 0.20]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.07, 0.018, 0.02]} />
          <meshBasicMaterial color="#e11d48" />
        </mesh>

        {/* Torso / Navy Executive Suit */}
        <mesh position={[0, 0.14, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.28, 0.65, 20]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.2} />
        </mesh>

        {/* White Shirt Collar V */}
        <mesh position={[0, 0.38, 0.16]}>
          <boxGeometry args={[0.14, 0.12, 0.02]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>

        {/* Electric Lime Tie */}
        <mesh position={[0, 0.18, 0.18]}>
          <boxGeometry args={[0.07, 0.35, 0.025]} />
          <meshBasicMaterial color="#D4FF00" />
        </mesh>

        {/* Legs */}
        <mesh position={[-0.1, -0.36, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.5, 12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>
        <mesh position={[0.1, -0.36, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.5, 12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>

        {/* Leather Shoes */}
        <mesh position={[-0.1, -0.64, 0.04]} castShadow>
          <boxGeometry args={[0.11, 0.08, 0.22]} />
          <meshStandardMaterial color="#09090b" roughness={0.2} />
        </mesh>
        <mesh position={[0.1, -0.64, 0.04]} castShadow>
          <boxGeometry args={[0.11, 0.08, 0.22]} />
          <meshStandardMaterial color="#09090b" roughness={0.2} />
        </mesh>

        {/* Ground Glow Ring around CEO */}
        <mesh position={[0, -0.68, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.65, 32]} />
          <meshBasicMaterial color="#D4FF00" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>

        {/* Ultra-Sleek CEO Tag */}
        <Html position={[0, 1.15, 0]} center distanceFactor={18} zIndexRange={[100, 0]}>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#09090b]/95 border-2 border-[#D4FF00] text-[#D4FF00] text-[10px] font-black tracking-tight shadow-xl select-none whitespace-nowrap"
            style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
          >
            <span className="text-xs">👑</span>
            <span>CEO (BẠN)</span>
          </div>
        </Html>
      </group>
    </RigidBody>
  );
};
