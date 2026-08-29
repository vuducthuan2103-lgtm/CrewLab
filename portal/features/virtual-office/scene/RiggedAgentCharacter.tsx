'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { AgentCode, AgentVisualState } from '../types/office';

const CHARACTER_VERSION = '20260829-v10';
const CHARACTER_URLS: Record<AgentCode, string> = {
  A01: `/virtual-office/characters/v10/a01.glb?v=${CHARACTER_VERSION}`,
  B02: `/virtual-office/characters/v10/b02.glb?v=${CHARACTER_VERSION}`,
  B03: `/virtual-office/characters/v10/b03.glb?v=${CHARACTER_VERSION}`,
  D01: `/virtual-office/characters/v10/d01.glb?v=${CHARACTER_VERSION}`,
  D02: `/virtual-office/characters/v10/d02.glb?v=${CHARACTER_VERSION}`,
  E01: `/virtual-office/characters/v10/e01.glb?v=${CHARACTER_VERSION}`,
};

const STATE_SPEED: Record<AgentVisualState, number> = {
  idle: 0.72,
  working: 5.8,
  waiting_human: 1.05,
  reviewing: 1.4,
  reworking: 6.5,
  success: 2.25,
  error: 1.8,
  rejected: 1.2,
};

type JointName = 'root' | 'pelvis' | 'spine' | 'head' | 'shoulderL' | 'shoulderR' | 'elbowL' | 'elbowR' | 'wristL' | 'wristR';
type JointMap = Record<JointName, THREE.Object3D | null>;

const tempEuler = new THREE.Euler();
const tempQuaternion = new THREE.Quaternion();

function collectJoints(model: THREE.Object3D, code: AgentCode): JointMap {
  return {
    root: model.getObjectByName(`${code}_CharacterRoot`) ?? null,
    pelvis: model.getObjectByName('PelvisJoint') ?? null,
    spine: model.getObjectByName('SpineJoint') ?? null,
    head: model.getObjectByName('HeadJoint') ?? null,
    shoulderL: model.getObjectByName('ShoulderLJoint') ?? null,
    shoulderR: model.getObjectByName('ShoulderRJoint') ?? null,
    elbowL: model.getObjectByName('ElbowLJoint') ?? null,
    elbowR: model.getObjectByName('ElbowRJoint') ?? null,
    wristL: model.getObjectByName('WristLJoint') ?? null,
    wristR: model.getObjectByName('WristRJoint') ?? null,
  };
}

function applyJointDelta(joint: THREE.Object3D | null, base: THREE.Quaternion | undefined, x = 0, y = 0, z = 0) {
  if (!joint || !base) return;
  tempEuler.set(x, y, z, 'XYZ');
  tempQuaternion.setFromEuler(tempEuler);
  joint.quaternion.copy(base).multiply(tempQuaternion);
}

export function RiggedAgentCharacter({ code, visualState }: { code: AgentCode; visualState: AgentVisualState }) {
  const gltf = useGLTF(CHARACTER_URLS[code]);
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const joints = useMemo(() => collectJoints(model, code), [code, model]);
  const baseRotations = useMemo(() => {
    const result = {} as Partial<Record<JointName, THREE.Quaternion>>;
    (Object.keys(joints) as JointName[]).forEach((name) => {
      const joint = joints[name];
      if (joint) result[name] = joint.quaternion.clone();
    });
    return result;
  }, [joints]);
  const rootBasePosition = useMemo(() => joints.root?.position.clone() ?? new THREE.Vector3(), [joints.root]);

  useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (object.material instanceof THREE.MeshStandardMaterial) object.material.envMapIntensity = 1.05;
    });
  }, [model]);

  useFrame(({ clock }) => {
    const phaseOffset = code.charCodeAt(0) * 0.17 + code.charCodeAt(2) * 0.07;
    const phase = clock.elapsedTime * STATE_SPEED[visualState] + phaseOffset;
    const typing = visualState === 'working' || visualState === 'reworking';
    const reviewing = visualState === 'reviewing' || visualState === 'waiting_human';
    const success = visualState === 'success';
    const troubled = visualState === 'error' || visualState === 'rejected';

    if (joints.root) {
      joints.root.position.copy(rootBasePosition);
      joints.root.position.y += Math.sin(phase * 0.42) * (success ? 0.012 : 0.004);
    }

    const breathing = Math.sin(phase * 0.28) * 0.012;
    applyJointDelta(joints.pelvis, baseRotations.pelvis, 0, 0, success ? Math.sin(phase * 0.4) * 0.018 : 0);
    applyJointDelta(joints.spine, baseRotations.spine, typing ? 0.07 + breathing : reviewing ? 0.035 + breathing : troubled ? -0.025 + breathing : breathing, 0, troubled ? Math.sin(phase * 0.35) * 0.025 : 0);
    applyJointDelta(joints.head, baseRotations.head, typing ? 0.075 : success ? -0.045 : troubled ? -0.025 : Math.sin(phase * 0.18) * 0.012, reviewing ? Math.sin(phase * 0.5) * 0.18 : troubled ? Math.sin(phase * 0.42) * 0.08 : Math.sin(phase * 0.16) * 0.025, troubled ? Math.sin(phase * 0.31) * 0.035 : 0);

    const keyStroke = typing ? Math.sin(phase) : 0;
    const oppositeStroke = typing ? Math.sin(phase + Math.PI) : 0;
    applyJointDelta(joints.elbowL, baseRotations.elbowL, keyStroke * 0.07 + (success ? -0.25 : 0), 0, success ? -0.16 : 0);
    applyJointDelta(joints.elbowR, baseRotations.elbowR, oppositeStroke * 0.07 + (success ? -0.25 : 0), 0, success ? 0.16 : 0);
    applyJointDelta(joints.wristL, baseRotations.wristL, keyStroke * 0.08, keyStroke * 0.035, 0);
    applyJointDelta(joints.wristR, baseRotations.wristR, oppositeStroke * 0.08, oppositeStroke * 0.035, 0);
    applyJointDelta(joints.shoulderL, baseRotations.shoulderL, 0, success ? -0.22 : 0, success ? -0.48 : 0);
    applyJointDelta(joints.shoulderR, baseRotations.shoulderR, 0, success ? 0.22 : 0, success ? 0.48 : 0);
  });

  return <primitive object={model} />;
}

Object.values(CHARACTER_URLS).forEach((url) => useGLTF.preload(url));
