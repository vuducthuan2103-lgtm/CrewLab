import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

interface GlbAccessor { count?: number }
interface GlbPrimitive { indices?: number; mode?: number }
interface GlbMesh { primitives?: GlbPrimitive[] }
interface GlbDocument {
  accessors?: GlbAccessor[];
  images?: unknown[];
  materials?: Array<{ name?: string }>;
  meshes?: GlbMesh[];
  nodes?: unknown[];
  textures?: unknown[];
}

function readGlbJson(assetPath: string): GlbDocument {
  const buffer = fs.readFileSync(assetPath);
  expect(buffer.subarray(0, 4).toString('ascii')).toBe('glTF');
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trimEnd()) as GlbDocument;
}

describe('virtual office v8 environment asset', () => {
  it('stays inside the authored web scene budget and contains the new material families', () => {
    const assetPath = path.join(process.cwd(), 'public', 'virtual-office', 'garden-office-v8.glb');
    const stat = fs.statSync(assetPath);
    const document = readGlbJson(assetPath);
    const primitives = (document.meshes ?? []).flatMap((mesh) => mesh.primitives ?? []);
    const triangles = primitives.reduce((total, primitive) => {
      if ((primitive.mode ?? 4) !== 4 || primitive.indices === undefined) return total;
      return total + (document.accessors?.[primitive.indices]?.count ?? 0) / 3;
    }, 0);
    const materialNames = (document.materials ?? []).map((material) => material.name);

    expect(stat.size).toBeGreaterThan(10_000_000);
    expect(stat.size).toBeLessThan(18_000_000);
    expect(primitives.length).toBeLessThanOrEqual(30);
    expect(triangles).toBeLessThan(350_000);
    expect(document.textures?.length).toBeLessThanOrEqual(12);
    expect(materialNames).toEqual(expect.arrayContaining([
      'V8 honed limestone',
      'V8 planning display',
      'V8 review display',
      'Shallow turquoise water',
      'Quarter sawn oak',
    ]));
  });
});
