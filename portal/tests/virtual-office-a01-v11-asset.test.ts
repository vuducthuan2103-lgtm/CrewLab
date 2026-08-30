import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

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

describe.each(['a01', 'b02', 'b03', 'd01', 'd02'])('virtual office %s v11 production candidate', (agentCode) => {
  const assetPath = path.join(
    process.cwd(),
    'public',
    'virtual-office',
    'characters',
    'v11',
    `${agentCode}.glb`,
  );

  it('is a compact binary glTF with a skinned character', () => {
    const stat = fs.statSync(assetPath);
    const gltf = readGlbJson(assetPath);

    expect(stat.size).toBeGreaterThan(1_000_000);
    expect(stat.size).toBeLessThan(2_000_000);
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
  });
});
