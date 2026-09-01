import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GARDEN_AGENT_FOCUS_CAMERAS } from '../features/virtual-office/config/office-layout';

type GltfJson = {
  animations?: Array<{ name?: string }>;
  nodes?: Array<{ name?: string }>;
  skins?: Array<{ joints?: number[] }>;
};

function readGlbJson(assetPath: string): GltfJson {
  const binary = fs.readFileSync(assetPath);
  expect(binary.subarray(0, 4).toString('ascii')).toBe('glTF');
  const jsonLength = binary.readUInt32LE(12);
  const jsonType = binary.subarray(16, 20).toString('ascii');
  expect(jsonType).toBe('JSON');
  return JSON.parse(binary.subarray(20, 20 + jsonLength).toString('utf8').trim());
}

describe.each(['a01', 'b02', 'b03', 'd01', 'd02', 'e01'])('virtual office %s v14 production candidate', (agentCode) => {
  const assetPath = path.join(
    process.cwd(),
    'public',
    'virtual-office',
    'characters',
    'v14',
    `${agentCode}.glb`,
  );

  it('is a compact binary glTF with a skinned character', () => {
    const stat = fs.statSync(assetPath);
    const gltf = readGlbJson(assetPath);

    expect(stat.size).toBeGreaterThan(800_000);
    expect(stat.size).toBeLessThan(1_500_000);
    expect(gltf.skins?.[0]?.joints).toHaveLength(27);
  });

  it('contains every runtime action and workstation anchor', () => {
    const gltf = readGlbJson(assetPath);
    const actions = new Set(gltf.animations?.map((animation) => animation.name));
    const nodes = new Set(gltf.nodes?.map((node) => node.name));

    expect(actions).toEqual(
      new Set([
        'seated_idle',
        'typing',
        'thinking',
        'screen_review',
        'tablet_work',
        'waiting_human',
        'success',
        'error_rework',
      ]),
    );
    for (const anchor of [
      'SeatAnchor',
      'PelvisTarget',
      'LeftHandKeyboardTarget',
      'RightHandKeyboardTarget',
      'MonitorPrimaryTarget',
      'MonitorSecondaryTarget',
      'TabletTarget',
      'LeftFootTarget',
      'RightFootTarget',
    ]) {
      expect(nodes.has(anchor)).toBe(true);
    }

    for (const detail of ['Brow_L', 'Brow_R', 'UpperLip', 'LowerLip', 'NoseContour', 'Neckline', 'RoleBadge']) {
      expect(nodes.has(`${agentCode.toUpperCase()}_V14_${detail}`)).toBe(true);
    }
  });
});

describe('virtual office v14 character runtime', () => {
  it('loads the premium v14 assets with a shared cache version', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'features', 'virtual-office', 'scene', 'RiggedAgentCharacter.tsx'),
      'utf8',
    );

    expect(source).toContain("const CHARACTER_VERSION = '20260901-premium-v14'");
    for (const agentCode of ['a01', 'b02', 'b03', 'd01', 'd02', 'e01']) {
      expect(source).toContain(`/virtual-office/characters/v14/${agentCode}.glb`);
    }
  });

  it('uses SkeletonUtils when cloning animated skinned scenes', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'features', 'virtual-office', 'scene', 'RiggedAgentCharacter.tsx'),
      'utf8',
    );

    expect(source).toContain("from 'three/examples/jsm/utils/SkeletonUtils.js'");
    expect(source).toContain('cloneSkinnedScene(gltf.scene)');
    expect(source).not.toContain('gltf.scene.clone(true)');
  });

  it('provides a reviewed focus camera for every production agent', () => {
    expect(Object.keys(GARDEN_AGENT_FOCUS_CAMERAS)).toEqual(['A01', 'B02', 'B03', 'D01', 'D02', 'E01']);

    for (const camera of Object.values(GARDEN_AGENT_FOCUS_CAMERAS)) {
      expect(camera.position).toHaveLength(3);
      expect(camera.target).toHaveLength(3);
      expect(Math.hypot(
        camera.position[0] - camera.target[0],
        camera.position[1] - camera.target[1],
        camera.position[2] - camera.target[2],
      )).toBeGreaterThan(3);
    }
  });
});
