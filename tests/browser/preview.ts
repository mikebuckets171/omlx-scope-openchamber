import { expect, test } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:8787';
const PANEL = BASE_URL + '/panel/index.html';

const openPanel = async (page: import('@playwright/test').Page, query: string): Promise<import('@playwright/test').FrameLocator> => {
  await page.setViewportSize({ width: 720, height: 960 });
  await page.goto(`${BASE_URL}/?${query}`);
  const frame = page.frameLocator('iframe');
  await frame.locator('main').waitFor();
  return frame;
};

test.describe('OMLX Scope browser preview', () => {
  test('lays out without overflow across themes and viewport widths', async ({ page }) => {
    for (const theme of ['dark', 'light']) {
      for (const width of [320, 430, 720]) {
        await page.setViewportSize({ width, height: 960 });
        await page.goto(`${BASE_URL}/?theme=${theme}&long=1`);
        const frame = page.frameLocator('iframe');
        await frame.locator('main').waitFor();
        const overflow = await frame.locator('main').evaluate((main: HTMLElement) => ({
          scroll: main.scrollWidth,
          inner: window.innerWidth,
        }));
        expect(overflow.scroll, `${theme}/${width}`).toBeLessThanOrEqual(overflow.inner);
      }
    }
  });

  test('keeps stable DOM, disclosure state, and focus across refreshes', async ({ page }) => {
    const frame = await openPanel(page, 'theme=dark&long=1');
    const button = frame.locator('#refresh');
    const model = frame.locator('#model');
    await frame.locator('summary').click();
    await frame.locator('summary').focus();
    await page.waitForTimeout(1_100);
    await expect(model).toHaveCount(1);
    await expect(button).toHaveCount(1);
    await expect(frame.locator('details')).toHaveJSProperty('open', true);
    await expect(frame.locator('summary')).toBeFocused();
    await button.click();
    await page.waitForTimeout(150);
    await expect(button).toBeEnabled();
  });

  test('reports each runtime state without NaN, undefined, or wrong placeholders', async ({ page }) => {
    for (const state of ['idle', 'prefill', 'queued', 'notLoaded', 'offline', 'auth', 'processing']) {
      await page.goto(`${BASE_URL}/?state=${state}`);
      const frame = page.frameLocator('iframe');
      const main = frame.locator('main');
      await main.waitFor();
      const content = await main.innerText();
      expect(content, `${state} should not contain NaN`).not.toMatch(/NaN/);
      expect(content, `${state} should not contain undefined`).not.toMatch(/undefined/);
      if (state === 'notLoaded') {
        await expect(frame.locator('#connection')).toContainText('no model loaded');
      }
      if (state === 'auth') {
        await expect(frame.locator('#connection')).toContainText(/Authentication required/);
      }
      if (state === 'prefill') {
        await expect(frame.locator('[role=progressbar]')).toHaveAttribute('aria-valuenow', '64');
      }
      if (state === 'offline') {
        await expect(frame.locator('#rate')).toHaveText('—');
      }
    }
  });

  test('pauses and resumes polling when the iframe is hidden', async ({ page }) => {
    await page.goto(BASE_URL);
    const frame = page.frameLocator('iframe');
    await frame.locator('main').waitFor();
    await page.waitForTimeout(150);
    const baseline = await page.evaluate(() => window.previewRequests);
    await frame.locator('main').evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(800);
    const afterHide = await page.evaluate(() => window.previewRequests);
    expect(afterHide).toBe(baseline);
    await frame.locator('main').evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(800);
    const afterResume = await page.evaluate(() => window.previewRequests);
    expect(afterResume, 'visible panel did not resume').toBeGreaterThan(baseline);
  });

  test('no browser errors are raised during navigation and polling', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${BASE_URL}/?theme=dark&long=1`);
    await page.frameLocator('iframe').locator('main').waitFor();
    await page.waitForTimeout(1_000);
    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});
