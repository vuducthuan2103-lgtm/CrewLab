// @vitest-environment node

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe('Spec 0014 removed Asset Request UI', () => {
  it('does not expose an Asset Request component, tab, route or action', () => {
    const roots = ['app', 'components', 'lib'];
    const source = roots
      .flatMap((root) => sourceFiles(path.resolve(process.cwd(), root)))
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');

    expect(source).not.toMatch(/AssetUploadDropzone|AssetRequest|asset[_-]request/i);
    expect(source).not.toContain('Yêu cầu ảnh');
    expect(fs.existsSync(path.resolve(process.cwd(), 'components/assets/AssetUploadDropzone.tsx'))).toBe(false);
  });
});
