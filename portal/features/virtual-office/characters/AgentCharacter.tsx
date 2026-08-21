'use client';

import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { OfficeAgent } from '../types/office';
import { useOfficeStore } from '../state/office-store';
import { AGENT_PERSONA_CATALOG } from '../config/agent-personas';
import { allowsAttentionBubble } from '../config/agent-state-map';

interface AgentCharacterProps {
  agent: OfficeAgent;
}

/**
 * Attention-only speech bubble messages.
 * Per spec P0.2: idle, working, reviewing, reworking agents must NOT
 * show persistent large bubbles. Only genuine CEO-attention states may.
 */
const ATTENTION_BUBBLE: Partial<Record<string, string>> = {
  waiting_human: '🙋 Cần bạn xem qua!',
  error: '⚠️ Có lỗi, cần xử lý!',
  rejected: '⛔ Bị từ chối, cần xem lại.',
  success: '✅ Hoàn thành rồi!',
};

/** A01 has its own authoritative tone */
const ATTENTION_BUBBLE_A01: Partial<Record<string, string>> = {
  waiting_human: '📋 Cần phê duyệt từ CEO.',
  error: '⚡ Gặp sự cố, cần can thiệp.',
  rejected: '⛔ Nhiệm vụ bị từ chối.',
  success: '✅ Chu kỳ hoàn tất!',
};


export const AgentCharacter: React.FC<AgentCharacterProps> = ({ agent }) => {
  const [hovered, setHovered] = useState(false);
  const headGroupRef = useRef<THREE.Group>(null);
  const torsoGroupRef = useRef<THREE.Group>(null);

  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const selectedAgentCode = useOfficeStore((s) => s.selectedAgentCode);
  const nearbyAgentCode = useOfficeStore((s) => s.nearbyAgentCode);

  const isSelected = selectedAgentCode === agent.code;
  const isNearbyCEO = nearbyAgentCode === agent.code;
  const persona = AGENT_PERSONA_CATALOG[agent.code];

  // ── THEME COLORS MATCHED 100% WITH 2D DOSSIER AVATARS ────────────
  const getThemeColors = () => {
    switch (agent.code) {
      case 'A01': // Sếp Vũ: Navy suit, electric lime tie, black swept hair
        return {
          suit: '#1d4ed8',
          accent: '#60a5fa',
          hair: '#0f172a',
          tie: '#D4FF00',
          innerShirt: '#ffffff',
          glasses: '#3b82f6',
          glassesFrame: '#60a5fa',
          glow: '#D4FF00',
        };
      case 'B02': // Chị Hà: Emerald blazer, silk green scarf, brunette hair
        return {
          suit: '#059669',
          accent: '#34d399',
          hair: '#3b1d11',
          tie: '#34d399',
          innerShirt: '#ecfdf5',
          glasses: '#047857',
          glassesFrame: '#34d399',
          glow: '#34d399',
        };
      case 'B03': // Anh Minh: Azure shirt, cyan details, black hair
        return {
          suit: '#0284c7',
          accent: '#38bdf8',
          hair: '#18181b',
          tie: '#38bdf8',
          innerShirt: '#ffffff',
          glasses: '#0284c7',
          glassesFrame: '#38bdf8',
          glow: '#D4FF00',
        };
      case 'D01': // Bé Thư: Amber/yellow hoodie, warm brown long hair, cat headphones
        return {
          suit: '#f59e0b',
          accent: '#fbbf24',
          hair: '#78350f',
          tie: '#fef3c7',
          innerShirt: '#fef3c7',
          glasses: '#fbbf24',
          glassesFrame: '#f43f5e',
          glow: '#fbbf24',
        };
      case 'D02': // Anh Khoa: Purple cyberpunk vest, dark undercut with purple highlights
        return {
          suit: '#c026d3',
          accent: '#e879f9',
          hair: '#1e1b4b',
          tie: '#e879f9',
          innerShirt: '#18181b',
          glasses: '#581c87',
          glassesFrame: '#e879f9',
          glow: '#e879f9',
        };
      case 'E01': // Chị Lan: Violet trench coat, golden badge, sleek black bob
        return {
          suit: '#7c3aed',
          accent: '#a78bfa',
          hair: '#09090b',
          tie: '#fbbf24',
          innerShirt: '#18181b',
          glasses: '#5b21b6',
          glassesFrame: '#a78bfa',
          glow: '#D4FF00',
        };
      default:
        return {
          suit: '#334155',
          accent: '#94a3b8',
          hair: '#18181b',
          tie: '#ffffff',
          innerShirt: '#ffffff',
          glasses: '#334155',
          glassesFrame: '#94a3b8',
          glow: '#D4FF00',
        };
    }
  };

  const getStatusDotColor = () => {
    if (agent.requiresHumanAction || agent.visualState === 'waiting_human') return '#f59e0b';
    switch (agent.visualState) {
      case 'working':
      case 'reworking': return '#10b981';
      case 'reviewing': return '#818cf8';
      case 'success':   return '#D4FF00';
      case 'error':
      case 'rejected':  return '#ef4444';
      case 'idle':
      default:          return '#71717a';
    }
  };

  const colors = getThemeColors();
  const statusColor = getStatusDotColor();

  const bubbleDict = agent.code === 'A01' ? ATTENTION_BUBBLE_A01 : ATTENTION_BUBBLE;
  const speechText = allowsAttentionBubble(agent.visualState, agent.requiresHumanAction)
    ? bubbleDict[agent.visualState]
    : undefined;
  const showSpeechBubble = !!speechText;

  // ── DYNAMIC MICRO-ANIMATION LOOP ────────────────────────────────
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const ceoPosition = useOfficeStore.getState().ceoPosition;

    // 1. HEAD ANIMATION & P2.5 DYNAMIC LOOK-AT CEO
    if (headGroupRef.current) {
      let basePosY = 0.98;
      let basePosX = 0;
      let baseRotX = 0;
      let baseRotY = 0;

      if (agent.visualState === 'error') {
        // KIỆT SỨC: Slumped forward onto desk
        basePosY = 0.76;
        basePosX = 0.16;
        baseRotX = 0.52;
        baseRotY = Math.sin(t * 0.8) * 0.05;
      } else if (agent.visualState === 'working' || agent.visualState === 'reworking') {
        // LÀM VIỆC: Focus nod looking at screen + monitor scanning
        baseRotX = -0.12 + Math.sin(t * 3.5) * 0.03;
        baseRotY = Math.sin(t * 1.8) * 0.08;
      } else if (agent.visualState === 'waiting_human' || isNearbyCEO) {
        // CẦN DUYỆT / GẶP CEO: Looking up towards CEO
        baseRotX = 0.14 + Math.sin(t * 2.0) * 0.04;
        baseRotY = Math.sin(t * 2.2) * 0.10;
      } else if (agent.visualState === 'reviewing') {
        // THẨM ĐỊNH (E01): Scanning checklist left/right + nod
        baseRotX = -0.06 + Math.sin(t * 1.6) * 0.04;
        baseRotY = Math.sin(t * 1.2) * 0.22;
      } else if (agent.visualState === 'success') {
        // HOÀN THÀNH: Happy vertical bounce
        basePosY = 0.98 + Math.abs(Math.sin(t * 4)) * 0.05;
        baseRotX = -0.05;
        baseRotY = Math.sin(t * 3) * 0.1;
      } else {
        // NGHỈ / IDLE: Gentle breathing
        baseRotX = Math.sin(t * 1.0) * 0.03;
        baseRotY = Math.sin(t * 0.6) * 0.08;
      }

      // P2.5 Dynamic Look-At Neck Tracking (when CEO is nearby or agent is selected)
      let targetNeckTurnY = 0;
      let targetNeckPitchX = 0;

      if (ceoPosition && (isNearbyCEO || isSelected)) {
        const dx = ceoPosition[0] - agent.position[0];
        const dz = ceoPosition[2] - agent.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 4.8) {
          const worldAngle = Math.atan2(dx, dz);
          let relAngle = worldAngle - agent.rotation[1];
          while (relAngle > Math.PI) relAngle -= Math.PI * 2;
          while (relAngle < -Math.PI) relAngle += Math.PI * 2;
          // Clamp to natural human neck turn (±45 deg)
          targetNeckTurnY = Math.max(-0.78, Math.min(0.78, relAngle));
          targetNeckPitchX = 0.12; // Look slightly up to standing CEO
        }
      }

      headGroupRef.current.position.set(0, basePosY, basePosX);
      headGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.x,
        baseRotX + targetNeckPitchX,
        delta * 6
      );
      headGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.y,
        baseRotY + targetNeckTurnY,
        delta * 6
      );
    }

    // 2. TORSO breathing / slumped pose
    if (torsoGroupRef.current) {
      if (agent.visualState === 'error') {
        torsoGroupRef.current.rotation.x = 0.35;
        torsoGroupRef.current.position.set(0, 0.38, 0.08);
      } else {
        torsoGroupRef.current.rotation.x = 0;
        torsoGroupRef.current.position.set(0, 0.48 + Math.sin(t * 1.5) * 0.01, 0);
      }
    }

    // 3. RIGHT & LEFT ARMS (Typing, Waving, Success Celebration)
    if (rightArmRef.current && leftArmRef.current) {
      if (agent.visualState === 'working' || agent.visualState === 'reworking') {
        // Typing motion on desk
        const speed = agent.visualState === 'reworking' ? 18 : 12;
        rightArmRef.current.rotation.set(-0.35 + Math.sin(t * speed) * 0.08, 0, -0.15);
        leftArmRef.current.rotation.set(-0.35 + Math.cos(t * speed) * 0.08, 0, 0.15);
      } else if (agent.visualState === 'waiting_human' || isNearbyCEO) {
        // Waving right hand to call CEO
        rightArmRef.current.rotation.set(-0.95 + Math.sin(t * 4.5) * 0.18, 0, 0.35);
        leftArmRef.current.rotation.set(-0.25, 0, 0.1);
      } else if (agent.visualState === 'success') {
        // Both arms raised up in victory
        rightArmRef.current.rotation.set(-1.3 + Math.sin(t * 5) * 0.1, 0, 0.38);
        leftArmRef.current.rotation.set(-1.3 + Math.sin(t * 5) * 0.1, 0, -0.38);
      } else if (agent.visualState === 'reviewing') {
        // One hand on chin/tablet, one hand holding notes
        rightArmRef.current.rotation.set(-0.65, 0, -0.2);
        leftArmRef.current.rotation.set(-0.3, 0, 0.1);
      } else {
        // Rest on desk
        rightArmRef.current.rotation.set(-0.25, 0, -0.05);
        leftArmRef.current.rotation.set(-0.25, 0, 0.05);
      }
    }
  });

  // ── RENDER EXACT HEAD & FACE ACCESSORIES MATCHING 2D AVATAR FOR ALL 6 AGENTS ──────
  const renderHeadAndFace = () => {
    switch (agent.code) {
      case 'A01': // Sếp Vũ: Executive side-swept hair + AR Dual-Frame Glasses + Lime HUD line + Neural Earring
        return (
          <>
            {/* 1. Sculpted Side-Swept Executive Hair */}
            <mesh position={[0.02, 0.16, 0.02]} rotation={[0, 0, -0.15]} castShadow>
              <boxGeometry args={[0.30, 0.14, 0.34]} />
              <meshStandardMaterial color={colors.hair} roughness={0.6} />
            </mesh>
            <mesh position={[0.06, 0.18, 0.08]} rotation={[0, 0.2, -0.25]} castShadow>
              <coneGeometry args={[0.16, 0.18, 5]} />
              <meshStandardMaterial color={colors.hair} roughness={0.6} />
            </mesh>
            <mesh position={[-0.18, 0.04, 0.06]} castShadow>
              <boxGeometry args={[0.04, 0.14, 0.12]} />
              <meshStandardMaterial color={colors.hair} roughness={0.6} />
            </mesh>
            <mesh position={[0.18, 0.04, 0.06]} castShadow>
              <boxGeometry args={[0.04, 0.14, 0.12]} />
              <meshStandardMaterial color={colors.hair} roughness={0.6} />
            </mesh>

            {/* 2. Eyebrows */}
            <mesh position={[-0.08, 0.08, 0.20]} rotation={[0, 0, 0.12]}>
              <boxGeometry args={[0.075, 0.022, 0.02]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.08, 0.08, 0.20]} rotation={[0, 0, -0.12]}>
              <boxGeometry args={[0.075, 0.022, 0.02]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>

            {/* 3. Eyes */}
            <mesh position={[-0.08, 0.02, 0.20]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.08, 0.02, 0.20]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>

            {/* 4. Dual-Frame AR Glasses */}
            <mesh position={[-0.08, 0.02, 0.22]}>
              <boxGeometry args={[0.09, 0.065, 0.02]} />
              <meshStandardMaterial color="#3b82f6" transparent opacity={0.6} roughness={0.1} />
            </mesh>
            <mesh position={[-0.08, 0.02, 0.225]}>
              <boxGeometry args={[0.095, 0.07, 0.008]} />
              <meshBasicMaterial color="#60a5fa" wireframe />
            </mesh>
            <mesh position={[0.08, 0.02, 0.22]}>
              <boxGeometry args={[0.09, 0.065, 0.02]} />
              <meshStandardMaterial color="#3b82f6" transparent opacity={0.6} roughness={0.1} />
            </mesh>
            <mesh position={[0.08, 0.02, 0.225]}>
              <boxGeometry args={[0.095, 0.07, 0.008]} />
              <meshBasicMaterial color="#60a5fa" wireframe />
            </mesh>
            <mesh position={[0, 0.02, 0.225]}>
              <boxGeometry args={[0.03, 0.012, 0.01]} />
              <meshBasicMaterial color="#60a5fa" />
            </mesh>

            {/* HUD scan line on left eye */}
            <mesh position={[-0.08, 0.035, 0.235]}>
              <boxGeometry args={[0.07, 0.01, 0.005]} />
              <meshBasicMaterial color="#D4FF00" />
            </mesh>

            {/* Smile */}
            <mesh position={[0, -0.07, 0.20]} rotation={[0.2, 0, 0]}>
              <torusGeometry args={[0.035, 0.008, 6, 12, Math.PI]} />
              <meshStandardMaterial color="#9a3412" />
            </mesh>

            {/* Neural Earring on Right Ear */}
            <mesh position={[0.23, -0.01, 0.02]}>
              <sphereGeometry args={[0.035, 12, 12]} />
              <meshBasicMaterial color="#D4FF00" />
            </mesh>
          </>
        );

      case 'B02': // Chị Hà: Brunette hair with Bun + Cat-Eye Glasses + Green Earrings + Smile
        return (
          <>
            {/* 1. Sculpted Brunette Hair */}
            <mesh position={[0, 0.14, 0]} castShadow>
              <boxGeometry args={[0.32, 0.16, 0.32]} />
              <meshStandardMaterial color={colors.hair} roughness={0.6} />
            </mesh>
            {/* Hair Bun at back */}
            <mesh position={[0, 0.16, -0.22]} castShadow>
              <sphereGeometry args={[0.11, 16, 16]} />
              <meshStandardMaterial color={colors.hair} roughness={0.6} />
            </mesh>
            {/* Side Hair Framing Cheeks */}
            <mesh position={[-0.18, -0.02, 0.04]} castShadow>
              <boxGeometry args={[0.04, 0.20, 0.12]} />
              <meshStandardMaterial color={colors.hair} roughness={0.6} />
            </mesh>
            <mesh position={[0.18, -0.02, 0.04]} castShadow>
              <boxGeometry args={[0.04, 0.20, 0.12]} />
              <meshStandardMaterial color={colors.hair} roughness={0.6} />
            </mesh>

            {/* 2. Eyebrows */}
            <mesh position={[-0.08, 0.08, 0.20]} rotation={[0, 0, 0.08]}>
              <boxGeometry args={[0.07, 0.018, 0.02]} />
              <meshStandardMaterial color="#3b1d11" />
            </mesh>
            <mesh position={[0.08, 0.08, 0.20]} rotation={[0, 0, -0.08]}>
              <boxGeometry args={[0.07, 0.018, 0.02]} />
              <meshStandardMaterial color="#3b1d11" />
            </mesh>

            {/* 3. Eyes */}
            <mesh position={[-0.08, 0.02, 0.20]}>
              <sphereGeometry args={[0.026, 12, 12]} />
              <meshStandardMaterial color="#1e1b4b" />
            </mesh>
            <mesh position={[0.08, 0.02, 0.20]}>
              <sphereGeometry args={[0.026, 12, 12]} />
              <meshStandardMaterial color="#1e1b4b" />
            </mesh>

            {/* 4. Cat-Eye Smart Glasses (Teal/Emerald) */}
            <mesh position={[-0.08, 0.025, 0.22]} rotation={[0, 0, -0.12]}>
              <boxGeometry args={[0.095, 0.065, 0.015]} />
              <meshStandardMaterial color="#059669" transparent opacity={0.6} />
            </mesh>
            <mesh position={[-0.08, 0.025, 0.225]} rotation={[0, 0, -0.12]}>
              <boxGeometry args={[0.10, 0.07, 0.008]} />
              <meshBasicMaterial color="#34d399" wireframe />
            </mesh>
            <mesh position={[0.08, 0.025, 0.22]} rotation={[0, 0, 0.12]}>
              <boxGeometry args={[0.095, 0.065, 0.015]} />
              <meshStandardMaterial color="#059669" transparent opacity={0.6} />
            </mesh>
            <mesh position={[0.08, 0.025, 0.225]} rotation={[0, 0, 0.12]}>
              <boxGeometry args={[0.10, 0.07, 0.008]} />
              <meshBasicMaterial color="#34d399" wireframe />
            </mesh>
            <mesh position={[0, 0.025, 0.225]}>
              <boxGeometry args={[0.03, 0.012, 0.01]} />
              <meshBasicMaterial color="#34d399" />
            </mesh>

            {/* 5. Rose Lipstick Smile */}
            <mesh position={[0, -0.07, 0.20]} rotation={[0.2, 0, 0]}>
              <torusGeometry args={[0.035, 0.008, 6, 12, Math.PI]} />
              <meshStandardMaterial color="#be123c" />
            </mesh>

            {/* 6. Green Earrings on Both Ears */}
            <mesh position={[-0.23, -0.02, 0]}>
              <sphereGeometry args={[0.03, 10, 10]} />
              <meshBasicMaterial color="#34d399" />
            </mesh>
            <mesh position={[0.23, -0.02, 0]}>
              <sphereGeometry args={[0.03, 10, 10]} />
              <meshBasicMaterial color="#34d399" />
            </mesh>
          </>
        );

      case 'B03': // Anh Minh: Neat Crop + Operator Headset with Boom Mic + Composed Face
        return (
          <>
            {/* 1. Neat Cropped Hair */}
            <mesh position={[0, 0.14, 0]} castShadow>
              <boxGeometry args={[0.30, 0.14, 0.32]} />
              <meshStandardMaterial color={colors.hair} roughness={0.8} />
            </mesh>
            {/* Front fringe */}
            <mesh position={[0, 0.12, 0.14]} castShadow>
              <boxGeometry args={[0.26, 0.05, 0.08]} />
              <meshStandardMaterial color={colors.hair} roughness={0.8} />
            </mesh>

            {/* 2. Eyebrows */}
            <mesh position={[-0.08, 0.07, 0.20]}>
              <boxGeometry args={[0.07, 0.02, 0.02]} />
              <meshStandardMaterial color="#18181b" />
            </mesh>
            <mesh position={[0.08, 0.07, 0.20]}>
              <boxGeometry args={[0.07, 0.02, 0.02]} />
              <meshStandardMaterial color="#18181b" />
            </mesh>

            {/* 3. Eyes */}
            <mesh position={[-0.08, 0.02, 0.20]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.08, 0.02, 0.20]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>

            {/* 4. Headset Band going over top of head */}
            <mesh position={[0, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.23, 0.022, 8, 24, Math.PI]} />
              <meshStandardMaterial color="#38bdf8" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Left & Right Headset Cushions on ears */}
            <mesh position={[-0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.065, 0.065, 0.04, 12]} />
              <meshStandardMaterial color="#0284c7" />
            </mesh>
            <mesh position={[0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.065, 0.065, 0.04, 12]} />
              <meshStandardMaterial color="#0284c7" />
            </mesh>
            {/* Forward Boom Microphone with glowing tip */}
            <mesh position={[0.18, -0.06, 0.12]} rotation={[0.4, 0.4, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.18, 8]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.12, -0.10, 0.20]}>
              <sphereGeometry args={[0.028, 8, 8]} />
              <meshBasicMaterial color="#D4FF00" />
            </mesh>

            {/* 5. Composed Mouth */}
            <mesh position={[0, -0.07, 0.20]}>
              <boxGeometry args={[0.06, 0.012, 0.01]} />
              <meshStandardMaterial color="#9a3412" />
            </mesh>
          </>
        );

      case 'D01': // Bé Thư: Long Hair + Cat-Ear Gaming Headphones with pink earcups + Blush + Sparkle Eyes
        return (
          <>
            {/* 1. Long Hair Base + Bangs */}
            <mesh position={[0, 0.14, 0]} castShadow>
              <boxGeometry args={[0.32, 0.16, 0.32]} />
              <meshStandardMaterial color={colors.hair} roughness={0.7} />
            </mesh>
            {/* Cute Front Bangs */}
            <mesh position={[0, 0.11, 0.14]} castShadow>
              <boxGeometry args={[0.26, 0.06, 0.08]} />
              <meshStandardMaterial color={colors.hair} roughness={0.7} />
            </mesh>
            {/* Long Hair Cascading Down Back & Shoulders */}
            <mesh position={[0, -0.16, -0.16]} castShadow>
              <boxGeometry args={[0.34, 0.44, 0.12]} />
              <meshStandardMaterial color={colors.hair} roughness={0.7} />
            </mesh>
            <mesh position={[-0.17, -0.12, 0.04]} castShadow>
              <boxGeometry args={[0.05, 0.36, 0.12]} />
              <meshStandardMaterial color={colors.hair} roughness={0.7} />
            </mesh>
            <mesh position={[0.17, -0.12, 0.04]} castShadow>
              <boxGeometry args={[0.05, 0.36, 0.12]} />
              <meshStandardMaterial color={colors.hair} roughness={0.7} />
            </mesh>

            {/* 2. Big Sparkling Eyes */}
            <mesh position={[-0.08, 0.02, 0.20]}>
              <sphereGeometry args={[0.034, 12, 12]} />
              <meshStandardMaterial color="#18181b" />
            </mesh>
            <mesh position={[-0.07, 0.035, 0.23]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.08, 0.02, 0.20]}>
              <sphereGeometry args={[0.034, 12, 12]} />
              <meshStandardMaterial color="#18181b" />
            </mesh>
            <mesh position={[0.09, 0.035, 0.23]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>

            {/* 3. Pink Blush on Cheeks */}
            <mesh position={[-0.13, -0.04, 0.18]}>
              <sphereGeometry args={[0.032, 8, 8]} />
              <meshBasicMaterial color="#fb7185" transparent opacity={0.65} />
            </mesh>
            <mesh position={[0.13, -0.04, 0.18]}>
              <sphereGeometry args={[0.032, 8, 8]} />
              <meshBasicMaterial color="#fb7185" transparent opacity={0.65} />
            </mesh>

            {/* 4. Playful Open Smile */}
            <mesh position={[0, -0.07, 0.20]}>
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshStandardMaterial color="#e11d48" />
            </mesh>

            {/* 5. Cat-Ear Gaming Headphone Band */}
            <mesh position={[0, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.24, 0.025, 8, 24, Math.PI]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.5} roughness={0.3} />
            </mesh>
            {/* Left Cat Ear */}
            <mesh position={[-0.14, 0.36, 0]} rotation={[0, 0, 0.2]}>
              <coneGeometry args={[0.075, 0.15, 4]} />
              <meshStandardMaterial color="#fbbf24" roughness={0.3} />
            </mesh>
            <mesh position={[-0.14, 0.36, 0.03]} rotation={[0, 0, 0.2]}>
              <coneGeometry args={[0.045, 0.10, 4]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
            {/* Right Cat Ear */}
            <mesh position={[0.14, 0.36, 0]} rotation={[0, 0, -0.2]}>
              <coneGeometry args={[0.075, 0.15, 4]} />
              <meshStandardMaterial color="#fbbf24" roughness={0.3} />
            </mesh>
            <mesh position={[0.14, 0.36, 0.03]} rotation={[0, 0, -0.2]}>
              <coneGeometry args={[0.045, 0.10, 4]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
            {/* Glowing Pink Earcups */}
            <mesh position={[-0.23, 0, 0]}>
              <sphereGeometry args={[0.065, 12, 12]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
            <mesh position={[0.23, 0, 0]}>
              <sphereGeometry args={[0.065, 12, 12]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
          </>
        );

      case 'D02': // Anh Khoa: Undercut with Purple Highlights + Round Designer Glasses
        return (
          <>
            {/* 1. Undercut Hair Base */}
            <mesh position={[0, 0.14, 0]} castShadow>
              <boxGeometry args={[0.30, 0.14, 0.30]} />
              <meshStandardMaterial color={colors.hair} roughness={0.8} />
            </mesh>
            {/* Top Purple Highlight Tuft */}
            <mesh position={[0.04, 0.22, 0.06]} rotation={[0, 0.1, -0.15]} castShadow>
              <boxGeometry args={[0.16, 0.08, 0.22]} />
              <meshStandardMaterial color="#e879f9" roughness={0.4} />
            </mesh>

            {/* 2. Eyebrows */}
            <mesh position={[-0.08, 0.08, 0.20]} rotation={[0, 0, 0.15]}>
              <boxGeometry args={[0.07, 0.02, 0.02]} />
              <meshStandardMaterial color="#1e1b4b" />
            </mesh>
            <mesh position={[0.08, 0.08, 0.20]} rotation={[0, 0, -0.15]}>
              <boxGeometry args={[0.07, 0.02, 0.02]} />
              <meshStandardMaterial color="#1e1b4b" />
            </mesh>

            {/* 3. Eyes */}
            <mesh position={[-0.08, 0.02, 0.20]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.08, 0.02, 0.20]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>

            {/* 4. Round Designer Glasses (Purple Glow) */}
            <mesh position={[-0.08, 0.02, 0.22]}>
              <torusGeometry args={[0.05, 0.012, 8, 16]} />
              <meshStandardMaterial color="#e879f9" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0.08, 0.02, 0.22]}>
              <torusGeometry args={[0.05, 0.012, 8, 16]} />
              <meshStandardMaterial color="#e879f9" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.02, 0.22]}>
              <boxGeometry args={[0.04, 0.01, 0.01]} />
              <meshStandardMaterial color="#e879f9" />
            </mesh>

            {/* 5. Creative Smirk */}
            <mesh position={[0.02, -0.07, 0.20]} rotation={[0.1, 0, -0.15]}>
              <torusGeometry args={[0.035, 0.008, 6, 12, Math.PI]} />
              <meshStandardMaterial color="#831843" />
            </mesh>
          </>
        );

      case 'E01': // Chị Lan: Sleek Black Bob + Holographic Monocle Scanner + Gold QA Badge
        return (
          <>
            {/* 1. Sleek Black Bob Hair Top & Sides */}
            <mesh position={[0, 0.14, 0]} castShadow>
              <boxGeometry args={[0.32, 0.16, 0.32]} />
              <meshStandardMaterial color={colors.hair} roughness={0.7} />
            </mesh>
            <mesh position={[-0.18, -0.02, 0.02]} castShadow>
              <boxGeometry args={[0.06, 0.24, 0.24]} />
              <meshStandardMaterial color={colors.hair} roughness={0.7} />
            </mesh>
            <mesh position={[0.18, -0.02, 0.02]} castShadow>
              <boxGeometry args={[0.06, 0.24, 0.24]} />
              <meshStandardMaterial color={colors.hair} roughness={0.7} />
            </mesh>

            {/* 2. Sharp Eyebrows */}
            <mesh position={[-0.08, 0.08, 0.20]} rotation={[0, 0, 0.1]}>
              <boxGeometry args={[0.075, 0.02, 0.02]} />
              <meshStandardMaterial color="#09090b" />
            </mesh>
            <mesh position={[0.08, 0.08, 0.20]} rotation={[0, 0, -0.1]}>
              <boxGeometry args={[0.075, 0.02, 0.02]} />
              <meshStandardMaterial color="#09090b" />
            </mesh>

            {/* 3. Eyes */}
            <mesh position={[-0.08, 0.02, 0.20]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.08, 0.02, 0.20]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>

            {/* 4. Holographic Radar Monocle Scanner over Left Eye (Viewer's Right) */}
            <mesh position={[0.08, 0.02, 0.22]}>
              <torusGeometry args={[0.052, 0.012, 8, 16]} />
              <meshStandardMaterial color="#a78bfa" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0.08, 0.02, 0.22]}>
              <circleGeometry args={[0.048, 16]} />
              <meshBasicMaterial color="#a78bfa" transparent opacity={0.4} />
            </mesh>
            <mesh position={[0.08, 0.02, 0.23]}>
              <sphereGeometry args={[0.016, 8, 8]} />
              <meshBasicMaterial color="#D4FF00" />
            </mesh>

            {/* 5. Composed Strict Smile */}
            <mesh position={[0, -0.07, 0.20]}>
              <boxGeometry args={[0.06, 0.012, 0.01]} />
              <meshStandardMaterial color="#831843" />
            </mesh>
          </>
        );

      default:
        return null;
    }
  };

  // ── RENDER TORSO OUTFIT WITH SHIRT, COLLAR, TIE & JACKET ───────────
  const renderTorsoOutfit = () => {
    switch (agent.code) {
      case 'A01': // Sếp Vũ: Navy Blazer + White Shirt V-neck + Lime Green Tie
        return (
          <group ref={torsoGroupRef} position={[0, 0.48, 0]}>
            {/* Inner White Shirt Body */}
            <mesh castShadow>
              <cylinderGeometry args={[0.23, 0.27, 0.65, 20]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>

            {/* Navy Blazer Left Half */}
            <mesh position={[-0.12, 0, 0.02]} rotation={[0, 0.15, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.16, 0.66, 12, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color={colors.suit} roughness={0.4} />
            </mesh>

            {/* Navy Blazer Right Half */}
            <mesh position={[0.12, 0, 0.02]} rotation={[0, -0.15, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.16, 0.66, 12, 1, false, Math.PI, Math.PI]} />
              <meshStandardMaterial color={colors.suit} roughness={0.4} />
            </mesh>

            {/* White Collar Left & Right Points */}
            <mesh position={[-0.07, 0.26, 0.17]} rotation={[0, 0, -0.3]}>
              <boxGeometry args={[0.06, 0.08, 0.02]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.07, 0.26, 0.17]} rotation={[0, 0, 0.3]}>
              <boxGeometry args={[0.06, 0.08, 0.02]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>

            {/* Lime Green Tie Knot */}
            <mesh position={[0, 0.24, 0.19]}>
              <boxGeometry args={[0.05, 0.06, 0.025]} />
              <meshBasicMaterial color="#D4FF00" />
            </mesh>

            {/* Lime Green Tie Blade hanging down chest */}
            <mesh position={[0, 0.06, 0.20]}>
              <boxGeometry args={[0.055, 0.32, 0.02]} />
              <meshBasicMaterial color="#D4FF00" />
            </mesh>
          </group>
        );

      case 'B02': // Chị Hà: Emerald Blazer + Silk Scarf + Light cream inner
        return (
          <group ref={torsoGroupRef} position={[0, 0.48, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.23, 0.27, 0.65, 20]} />
              <meshStandardMaterial color={colors.suit} roughness={0.4} />
            </mesh>
            {/* Light cream V-neck inner */}
            <mesh position={[0, 0.18, 0.16]}>
              <boxGeometry args={[0.10, 0.24, 0.02]} />
              <meshStandardMaterial color="#ecfdf5" />
            </mesh>
            {/* Emerald Silk Scarf */}
            <mesh position={[0, 0.20, 0.18]}>
              <boxGeometry args={[0.06, 0.20, 0.025]} />
              <meshStandardMaterial color="#34d399" />
            </mesh>
          </group>
        );

      case 'B03': // Anh Minh: Azure Shirt + White Collar + Azure Placket
        return (
          <group ref={torsoGroupRef} position={[0, 0.48, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.23, 0.27, 0.65, 20]} />
              <meshStandardMaterial color={colors.suit} roughness={0.4} />
            </mesh>
            {/* Crisp white collar */}
            <mesh position={[-0.07, 0.26, 0.17]} rotation={[0, 0, -0.3]}>
              <boxGeometry args={[0.06, 0.08, 0.02]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.07, 0.26, 0.17]} rotation={[0, 0, 0.3]}>
              <boxGeometry args={[0.06, 0.08, 0.02]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            {/* Azure button placket */}
            <mesh position={[0, 0.08, 0.18]}>
              <boxGeometry args={[0.04, 0.38, 0.02]} />
              <meshStandardMaterial color="#38bdf8" />
            </mesh>
          </group>
        );

      case 'D01': // Bé Thư: Amber Hoodie + Front Pouch + Hood Rim
        return (
          <group ref={torsoGroupRef} position={[0, 0.48, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.24, 0.28, 0.65, 20]} />
              <meshStandardMaterial color={colors.suit} roughness={0.6} />
            </mesh>
            {/* White round inner collar */}
            <mesh position={[0, 0.24, 0.16]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshStandardMaterial color="#fef3c7" />
            </mesh>
            {/* Hoodie Neck Rim */}
            <mesh position={[0, 0.26, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.16, 0.04, 8, 16]} />
              <meshStandardMaterial color="#d97706" />
            </mesh>
            {/* Hoodie Front Pouch */}
            <mesh position={[0, -0.05, 0.18]}>
              <boxGeometry args={[0.20, 0.16, 0.05]} />
              <meshStandardMaterial color="#d97706" />
            </mesh>
          </group>
        );

      case 'D02': // Anh Khoa: Purple Cyberpunk Vest + Stylus on chest + Black inner
        return (
          <group ref={torsoGroupRef} position={[0, 0.48, 0]}>
            {/* Dark inner shirt */}
            <mesh castShadow>
              <cylinderGeometry args={[0.23, 0.27, 0.65, 20]} />
              <meshStandardMaterial color="#18181b" roughness={0.4} />
            </mesh>
            {/* Purple Vest Overlayer */}
            <mesh position={[0, 0, 0.02]} castShadow>
              <cylinderGeometry args={[0.24, 0.28, 0.62, 16]} />
              <meshStandardMaterial color={colors.suit} roughness={0.3} />
            </mesh>
            {/* Laser Stylus on chest */}
            <mesh position={[-0.09, 0.10, 0.18]} rotation={[0, 0, -0.2]}>
              <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
              <meshBasicMaterial color="#e879f9" />
            </mesh>
          </group>
        );

      case 'E01': // Chị Lan: Violet Trench Coat + Golden QA Badge
        return (
          <group ref={torsoGroupRef} position={[0, 0.48, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.24, 0.29, 0.65, 20]} />
              <meshStandardMaterial color={colors.suit} roughness={0.4} />
            </mesh>
            {/* High Trench Collar */}
            <mesh position={[0, 0.28, 0.05]}>
              <cylinderGeometry args={[0.16, 0.18, 0.12, 16]} />
              <meshStandardMaterial color="#5b21b6" />
            </mesh>
            {/* Golden QA Badge on Chest */}
            <mesh position={[0, 0.12, 0.19]}>
              <octahedronGeometry args={[0.045]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        );

      default:
        return (
          <group ref={torsoGroupRef} position={[0, 0.48, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.24, 0.28, 0.65, 20]} />
              <meshStandardMaterial color={colors.suit} roughness={0.4} />
            </mesh>
          </group>
        );
    }
  };

  return (
    <group position={agent.position} rotation={agent.rotation}>
      {/* ────────────────────────────────────
          SPEECH BUBBLE — state-driven dialogue
         ──────────────────────────────────── */}
      {showSpeechBubble && (
        <group position={[0.5, 2.2, -0.5]}>
          <Html center zIndexRange={[50, 0]}>
            <div
              style={{
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                backgroundColor: 'rgba(10,10,14,0.97)',
                border: `1.5px solid ${statusColor}`,
                borderRadius: '8px',
                padding: '5px 8px',
                fontSize: '11px',
                fontWeight: 600,
                lineHeight: '1.45',
                color: '#f4f4f5',
                width: '130px',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                overflow: 'hidden',
                boxShadow: `0 2px 12px ${statusColor}55`,
                position: 'relative',
              }}
            >
              {speechText}
              {/* Bubble tail triangle */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-7px',
                  left: '12px',
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: `7px solid ${statusColor}`,
                }}
              />
            </div>
          </Html>
        </group>
      )}

      {/* ────────────────────────────────────
          3D CHARACTER BODY (CUSTOMIZED PER AGENT)
         ──────────────────────────────────── */}
      <group
        position={[0, 0.46, -0.62]}
        scale={[1.12, 1.12, 1.12]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          selectAgent(agent.code);
        }}
      >
        {/* Hitbox */}
        <mesh visible={false} position={[0, 0.5, 0]}>
          <boxGeometry args={[1.6, 2.0, 1.6]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>

        {/* ── HEAD & NECK GROUP (ANIMATED TOGETHER) ── */}
        <group ref={headGroupRef} position={[0, 0.98, 0]}>
          {/* Visible Neck */}
          <mesh position={[0, -0.16, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.11, 0.16, 16]} />
            <meshStandardMaterial color="#fed7aa" roughness={0.3} />
          </mesh>

          {/* Head Base Sphere */}
          <mesh castShadow>
            <sphereGeometry args={[0.22, 24, 24]} />
            <meshStandardMaterial color="#fed7aa" roughness={0.3} metalness={0.1} />
          </mesh>

          {/* Left & Right Ears */}
          <mesh position={[-0.22, 0, 0]}>
            <sphereGeometry args={[0.048, 10, 10]} />
            <meshStandardMaterial color="#fca5a5" />
          </mesh>
          <mesh position={[0.22, 0, 0]}>
            <sphereGeometry args={[0.048, 10, 10]} />
            <meshStandardMaterial color="#fca5a5" />
          </mesh>

          {/* Specific Hair and Face Features for each agent */}
          {renderHeadAndFace()}
        </group>

        {/* ── TORSO & OUTFIT ── */}
        {renderTorsoOutfit()}

        {/* ── RIGHT ARM — Dynamic micro-animation (typing, waving, celebrating) ── */}
        <group ref={rightArmRef} position={[0.28, 0.55, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.38, 10]} />
            <meshStandardMaterial color={colors.suit} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.22, 0.12]} castShadow>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color="#fed7aa" />
          </mesh>
        </group>

        {/* ── LEFT ARM — Dynamic micro-animation (typing, celebrating) ── */}
        <group ref={leftArmRef} position={[-0.28, 0.55, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.38, 10]} />
            <meshStandardMaterial color={colors.suit} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.22, 0.12]} castShadow>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color="#fed7aa" />
          </mesh>
        </group>

        {/* ── SEATED LEGS ── */}
        <mesh position={[0, 0.08, 0.22]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.48, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>
      </group>

      {/* ────────────────────────────────────
          DESK IDENTIFIER TAG (COMPACT & SLEEK: NEVER COVERS 3D GRAPHICS)
         ──────────────────────────────────── */}
      <group position={[-0.75, 0.04, 0.5]}>
        <Html center distanceFactor={18} zIndexRange={[30, 0]}>
          <div
            onClick={(e) => {
              e.stopPropagation();
              selectAgent(agent.code);
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg backdrop-blur-md border transition-all duration-200 cursor-pointer select-none whitespace-nowrap shadow-md ${
              isSelected || isNearbyCEO
                ? 'bg-[#09090b]/95 border-[#D4FF00] ring-1 ring-[#D4FF00]/60 shadow-[#D4FF00]/30 scale-105'
                : hovered
                ? 'bg-[#18181b]/90 border-zinc-400'
                : 'bg-[#111114]/85 border-zinc-800/80 hover:border-zinc-600'
            }`}
            style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
          >
            <span
              className="font-mono font-bold text-[8px] px-1 py-0.2 rounded"
              style={{ backgroundColor: `${colors.suit}33`, color: colors.accent }}
            >
              {agent.code}
            </span>

            {/* Compact Persona Name */}
            <span className="text-[9px] font-semibold text-zinc-200">
              {persona?.nickname.split(' "')[0] || agent.displayName}
            </span>

            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                agent.requiresHumanAction ? 'animate-ping' : ''
              }`}
              style={{ backgroundColor: statusColor }}
            />
          </div>
        </Html>
      </group>

    </group>
  );
};
