import { expect, test, type Page } from '@playwright/test';

const requests = (page: Page) => page.evaluate(() => (window as unknown as { previewRequests: number }).previewRequests);
const openPanel = async (page: Page, query = '') => {
  await page.goto(`/?${query}`);
  const frame = page.frameLocator('iframe');
  await frame.locator('#hardware').waitFor({ state: 'attached' });
  await expect.poll(() => requests(page)).toBeGreaterThan(0);
  return frame;
};

test('responsive layouts preserve metrics in both themes', async ({ page }, info) => {
  for (const theme of ['dark', 'light']) for (const width of [320, 430, 1160]) {
    await page.setViewportSize({ width, height: width < 900 ? 1200 : 860 });
    const frame = await openPanel(page, `theme=${theme}&surface=${width >= 900 ? 'page' : 'panel'}&long=1`);
    await expect(frame.locator('#connection')).toHaveText('oMLX connected');
    await expect(frame.locator('#ram')).toContainText('48 GiB');
    await expect(frame.locator('#swap')).toHaveText('1.1 GiB');
    const overflow = await frame.locator('main').evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow, `${theme}/${width} overflows`).toBe(false);
    await page.screenshot({ path: info.outputPath(`${theme}-${width}.png`), fullPage: true });
  }
});

test('polling preserves controls, focus and open details', async ({ page }) => {
  const frame = await openPanel(page);
  const original = await frame.locator('#refresh').elementHandle();
  await frame.locator('summary').click();
  await frame.locator('summary').focus();
  await page.waitForTimeout(1_100);
  expect(await original!.evaluate(el => el.isConnected)).toBe(true);
  await expect(frame.locator('details')).toHaveJSProperty('open', true);
  await expect(frame.locator('summary')).toBeFocused();
  await frame.locator('#refresh').click();
  await expect(frame.locator('#refresh')).toBeEnabled();
});

test('runtime states and missing readings are explicit', async ({ page }) => {
  for (const state of ['idle', 'prefill', 'queued', 'notLoaded', 'offline', 'auth', 'processing']) {
    const frame = await openPanel(page, `state=${state}`);
    await expect(frame.locator('main')).not.toContainText(/NaN|undefined/);
    if (state === 'notLoaded') await expect(frame.locator('#rate')).toHaveText('Standby');
    if (state === 'auth') await expect(frame.locator('#connection')).toHaveText('Authentication required');
    if (state === 'prefill') await expect(frame.locator('[role=progressbar]')).toHaveAttribute('aria-valuenow', '64');
    if (state === 'offline') {
      await expect(frame.locator('#rate')).toHaveText('—');
      await expect(frame.locator('#machine')).toBeVisible();
      await expect(frame.locator('#swap')).toHaveText('1.1 GiB');
    }
  }
  let frame = await openPanel(page, 'native=missing');
  await expect(frame.locator('#swap')).toHaveText('—');
  frame = await openPanel(page, 'system=linux');
  await expect(frame.locator('#mac-memory')).toBeHidden();
  frame = await openPanel(page, 'system=missing');
  await expect(frame.locator('#machine')).toBeHidden();
  frame = await openPanel(page, 'stats=stale');
  await expect(frame.locator('#session-stats-state')).toContainText('not live');
});

test('manual pause survives visibility changes and resumes once', async ({ page }, info) => {
  const frame = await openPanel(page);
  await frame.locator('#pause').click();
  const before = await requests(page);
  await page.waitForTimeout(1_200);
  expect(await requests(page)).toBe(before);
  await expect(frame.locator('#connection')).toHaveText('Monitoring paused');
  await expect(frame.locator('#refresh')).toBeDisabled();
  await frame.locator('main').evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(600);
  expect(await requests(page)).toBe(before);
  await page.screenshot({ path: info.outputPath('paused.png'), fullPage: true });
  await frame.locator('#pause').click();
  await expect.poll(() => requests(page)).toBeGreaterThan(before);
  await expect(frame.locator('#refresh')).toBeEnabled();
});

test('hidden panels stop polling', async ({ page }) => {
  const frame = await openPanel(page);
  await frame.locator('main').evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const before = await requests(page);
  await page.waitForTimeout(1_200);
  expect(await requests(page)).toBe(before);
  await frame.locator('main').evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => requests(page)).toBeGreaterThan(before);
});

test('stalled responses cannot leave a live rate on screen', async ({ page }) => {
  const frame = await openPanel(page, 'state=stalled');
  await expect(frame.locator('#rate')).not.toHaveText('—');
  await expect(frame.locator('#rate')).toHaveText('—', { timeout: 9_000 });
  await expect(frame.locator('#activity')).toContainText('No fresh observations');
});

test('session shortcut does not imply chat-specific measurements', async ({ page }) => {
  const frame = await openPanel(page, 'item=session&sessionTitle=Private%20chat');
  await expect(frame.locator('main')).not.toContainText('Private chat');
});

test('full-page history renders without page or console errors', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 1160, height: 860 });
  const frame = await openPanel(page, 'surface=page');
  await expect(frame.locator('#cpu-history')).toHaveAttribute('d', /L/, { timeout: 7_000 });
  await page.waitForTimeout(5_000);
  await page.screenshot({ path: info.outputPath('workspace.png'), fullPage: true });
  expect(errors).toEqual([]);
});
