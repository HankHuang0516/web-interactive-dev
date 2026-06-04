import { test, expect } from '@playwright/test';

const APP = 'http://127.0.0.1:8765/index.html';

test.describe('web-interactive-dev v1 happy paths', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP);
  });

  test('1. boots with seeded diff + prompt', async ({ page }) => {
    const diff = await page.getByTestId('diff-out').innerText();
    const prompt = await page.getByTestId('prompt-out').innerText();
    expect(diff.length).toBeGreaterThan(0);
    expect(prompt).toContain('```diff');
    expect(prompt).toContain('Original file:');
    const status = await page.getByTestId('status').innerText();
    expect(status).toMatch(/^generated /);
  });

  test('2. editing edited pane regenerates outputs', async ({ page }) => {
    const edited = page.getByTestId('edited');
    await edited.fill('console.log("changed")\n');
    await page.getByTestId('generate').click();
    const diff = await page.getByTestId('diff-out').innerText();
    expect(diff).toContain('console.log("changed")');
    const prompt = await page.getByTestId('prompt-out').innerText();
    expect(prompt).toContain('console.log("changed")');
  });

  test('3. switching format unified→json swaps diff representation', async ({ page }) => {
    await page.getByTestId('format').selectOption('json');
    await page.getByTestId('generate').click();
    const diff = await page.getByTestId('diff-out').innerText();
    expect(diff.trim().startsWith('{')).toBeTruthy();
    const parsed = JSON.parse(diff);
    expect(parsed.schemaVersion).toBe('1.2');
    expect(parsed.format).toBe('json-patch');
    expect(Array.isArray(parsed.hunks)).toBeTruthy();
  });

  test('4. copy button writes prompt to clipboard', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard API requires chromium grant');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByTestId('copy').click();
    await expect(page.getByTestId('status')).toHaveText('prompt copied');
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('```diff');
  });

  test('5. identical content yields changeCount=0 diff', async ({ page }) => {
    const same = 'identical line one\nidentical line two\n';
    await page.getByTestId('original').fill(same);
    await page.getByTestId('edited').fill(same);
    await page.getByTestId('generate').click();
    const meta = await page.getByTestId('diff-meta').innerText();
    expect(meta).toContain('0 change-lines');
    const prompt = await page.getByTestId('prompt-out').innerText();
    expect(prompt).toMatch(/```diff[\s\S]*--- original[\s\S]*\+\+\+ edited[\s\S]*```/);
  });
});
