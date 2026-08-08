import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { lint } from '@google/design.md/linter';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const designPath = resolve(repositoryRoot, 'DESIGN.md');
const outputPath = resolve(repositoryRoot, 'design.tokens.json');
const checkOnly = process.argv.includes('--check');

const report = lint(readFileSync(designPath, 'utf8'));

if (report.summary.errors > 0 || report.summary.warnings > 0) {
  for (const finding of report.findings) {
    if (finding.severity !== 'info') {
      console.error(`[${finding.severity}] ${finding.rule}: ${finding.message}`);
    }
  }
  process.exit(1);
}

if (!report.tailwindConfig.success) {
  console.error('DESIGN.md could not be exported to Tailwind tokens.');
  process.exit(1);
}

const generatedTokens = {
  _meta: {
    generatedFrom: 'DESIGN.md',
    generator: '@google/design.md',
    editSourceInstead: true,
  },
  theme: report.tailwindConfig.data.theme,
};
const serializedTokens = `${JSON.stringify(generatedTokens, null, 2)}\n`;

if (checkOnly) {
  if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== serializedTokens) {
    console.error('design.tokens.json is stale. Run `npm run design:tokens`.');
    process.exit(1);
  }

  console.log('design.tokens.json matches DESIGN.md.');
  process.exit(0);
}

writeFileSync(outputPath, serializedTokens, 'utf8');
console.log('Generated design.tokens.json from DESIGN.md.');
