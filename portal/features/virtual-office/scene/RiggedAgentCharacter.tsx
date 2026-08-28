'use client';

import { useAnimations, useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AgentCode, AgentVisualState } from '../types/office';

const CHARACTER_VERSION = '20260828-v6';
const LOCAL_DRACO_DECODER = '/draco/';

const CLIP_BY_STATE: Record<AgentVisualState, string> = {
  idle: 'Idle',
  working: 'Typing',
  waiting_human: 'Reviewing',
  reviewing: 'Reviewing',
  reworking: 'Typing',
  success: 'Success',
  error: 'Reviewing',
  rejected: 'Reviewing',
};

function characterUrl(code: AgentCode) {
  return `/virtual-office/characters/${code.toLowerCase()}.glb?v=${CHARACTER_VERSION}`;
}

export function RiggedAgentCharacter({
  code,
  visualState,
}: {
  code: AgentCode;
  visualState: AgentVisualState;
}) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF(characterUrl(code), LOCAL_DRACO_DECODER);
  const model = useMemo(() => cloneSkeleton(gltf.scene), [gltf.scene]);
  const { actions } = useAnimations(gltf.animations, group);

  useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = false;
    });
  }, [model]);

  useEffect(() => {
    const clipName = CLIP_BY_STATE[visualState];
    const action = actions[clipName] ?? actions.Idle;
    if (!action) return;

    action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.32).play();
    return () => {
      action.fadeOut(0.26);
    };
  }, [actions, visualState]);

  return (
    <group ref={group} name={`RiggedAgent_${code}`}>
      <primitive object={model} />
    </group>
  );
}

(['A01', 'B02', 'B03', 'D01', 'D02', 'E01'] as AgentCode[]).forEach((code) => {
  useGLTF.preload(characterUrl(code), LOCAL_DRACO_DECODER);
});
