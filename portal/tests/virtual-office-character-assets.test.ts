import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const AGENT_CODES = ['a01', 'b02', 'b03', 'd01', 'd02', 'e01'] as const;

describe('virtual office v10 character assets', () => {
  it.each(AGENT_CODES)('%s is a compact binary glTF asset', (code) => {
    const assetPath = path.join(process.cwd(), 'public', 'virtual-office', 'characters', 'v10', `${code}.glb`);
    const stat = fs.statSync(assetPath);
    const handle = fs.openSync(assetPath, 'r');
    const magic = Buffer.alloc(4);

    try {
      fs.readSync(handle, magic, 0, magic.length, 0);
    } finally {
      fs.closeSync(handle);
    }

    expect(magic.toString('ascii')).toBe('glTF');
    expect(stat.size).toBeGreaterThan(100_000);
    expect(stat.size).toBeLessThan(250_000);
  });
});
