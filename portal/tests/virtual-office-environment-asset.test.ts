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

describe('virtual office v9 rooftop environment asset', () => {
  it('stays inside the authored web scene budget and removes the rainforest backplate', () => {
    const assetPath = path.join(process.cwd(), 'public', 'virtual-office', 'garden-office-v9.glb');
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
      'V9 temporary skyline haze',
      'V9 sunlit limestone',
      'V9 architectural concrete',
      'V9 outdoor oak',
      'V9 architectural tree foliage',
    ]));
    expect(document.textures?.length).toBe(11);
    expect(bufferContains(assetPath, 'exterior-garden-depth')).toBe(false);
    expect(bufferContains(assetPath, 'Ficus photoreal canopy')).toBe(false);
    expect(bufferContains(assetPath, 'V8 ficus crown detail')).toBe(false);
    expect(bufferContains(assetPath, 'V9 Ficus architectural canopy')).toBe(true);
    expect(bufferContains(assetPath, 'V9 exterior olive A')).toBe(true);
    expect(bufferContains(assetPath, 'V9 exterior olive B')).toBe(true);
    expect(bufferContains(assetPath, 'V9 exterior acacia A')).toBe(true);
    expect(bufferContains(assetPath, 'V9 exterior acacia B')).toBe(true);
  });

  it('renders a visible loading state instead of a black canvas while GLB assets suspend', () => {
    const canvasSource = fs.readFileSync(
      path.join(process.cwd(), 'features', 'virtual-office', 'components', 'OfficeCanvas.tsx'),
      'utf8',
    );

    expect(canvasSource).not.toContain('Suspense fallback={null}');
    expect(canvasSource).toContain('fallback={<SceneLoadingFallback />}');
    expect(canvasSource).toContain('data-testid="office-scene-loading"');
    expect(canvasSource).toContain('Đang dựng văn phòng 3D');
  });
});

function bufferContains(assetPath: string, value: string): boolean {
  return fs.readFileSync(assetPath).includes(Buffer.from(value));
}
