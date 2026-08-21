---
name: playwright
description: E2E and browser automation testing skill for Next.js, 3D WebGL scenes, and DOM interaction testing.
skills:
  - playwright
---

# Playwright Testing Skill

This skill provides testing patterns for verifying CrewLab web applications, client portal, 3D WebGL viewports, accessible DOM fallbacks, and mobile responsiveness.

---

## 1. Core Testing Guidelines

1. **Deterministic Selectors:** Use `data-testid` or accessible role selectors (`page.getByRole('button', { name: /team/i })`).
2. **WebGL / Canvas Verification:** Since WebGL canvases render to a canvas context, test the container element, overlay HUD buttons, loading screens, and DOM sheet panels.
3. **Responsive Testing:** Always verify both desktop (1280x800) and mobile viewports (390x844).
4. **Fallback Testing:** Ensure the accessible DOM fallback (e.g. `[Team]` sheet) renders and allows full keyboard and click navigation even if 3D context is skipped.

---

## 2. Test Structure Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Virtual 3D Office & Portal Fallback', () => {
  test('renders office page and HUD elements', async ({ page }) => {
    await page.goto('/office');
    
    // Check loading indicator resolves
    await expect(page.getByTestId('office-container')).toBeVisible({ timeout: 10000 });
    
    // Check HUD presence
    await expect(page.getByRole('button', { name: /team/i })).toBeVisible();
  });

  test('accessible fallback roster opens sheet and inspects agent', async ({ page }) => {
    await page.goto('/office');
    
    // Click Team fallback button
    await page.getByRole('button', { name: /team/i }).click();
    
    // Expect sheet to open
    await expect(page.getByText('A01 — Orchestrator')).toBeVisible();
  });
});
```
