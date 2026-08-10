import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const files = [
  'components/kanban/KanbanBoard.tsx',
  'components/kanban/TaskCard.tsx',
  'components/content-hub/ContentCalendar.tsx',
  'components/content-hub/ContentPlanTable.tsx',
  'components/content-hub/PillarSlider.tsx',
  'app/settings/page.tsx',
];

describe('Spec 0016 portal visual cleanup', () => {
  it('does not use decorative emoji as navigation, calendar, settings or Kanban labels', () => {
    const source = files
      .map((file) => fs.readFileSync(path.join(projectRoot, file), 'utf8'))
      .join('\n');

    expect(source).not.toMatch(new RegExp('[⚡👤🔴📋⚙️✅🧠🧭📅✍️🎨📄🟦🟥📥📊💡]', 'u'));
  });
});
