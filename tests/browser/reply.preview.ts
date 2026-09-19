import { expect, test, type Page } from '@playwright/test';

const requests = (page: Page) => page.evaluate(() => (window as unknown as { previewRequests: number }).previewRequests);
const openPanel = async (page: Page, query = '') => {
  await page.goto(`/?${query}`);
  const frame = page.frameLocator('iframe');
  await frame.locator('#hardware').waitFor({ state: 'attached' });
  await expect.poll(() => requests(page)).toBeGreaterThan(0);
  return frame;
};


const selectedChat = (page: Page, busy: boolean, id = 'private-chat') => page.evaluate(
  session => (window as any).setPreviewSession(session),
  { id, busy, title: 'Private title', agent: 'Build', model: 'private-model' },
);

test('Next reply records only after arming and stops when the selected chat is idle', async ({ page }, info) => {
  const frame = await openPanel(page, 'state=idle');
  await frame.locator('#capture-length').selectOption('reply');
  await expect(frame.locator('#capture-start')).toBeDisabled();
  await selectedChat(page, true);
  await expect(frame.locator('#capture-start')).toBeDisabled();
  await selectedChat(page, false);
  await expect(frame.locator('#capture-start')).toBeEnabled();
  await frame.locator('#capture-start').click();
  await expect(frame.locator('#capture-state')).toHaveText('Armed');
  await frame.locator('#refresh').click();
  await expect(frame.locator('#capture-results')).toBeHidden();
  await page.evaluate(() => (window as any).setPreviewState('decode'));
  await selectedChat(page, true);
  await frame.locator('#refresh').click();
  await expect(frame.locator('#capture')).toHaveAttribute('data-recording', 'true');
  await expect(frame.locator('#capture-progress')).toBeHidden();
  await expect(frame.locator('#capture-speed')).toContainText('tok/s');
  await selectedChat(page, false);
  await expect(frame.locator('#capture-state')).toHaveText('Captured');
  await expect(frame.locator('#capture-note')).toContainText('not a completed-turn result');
  await expect(frame.locator('#capture-stop')).toBeHidden();
  await frame.locator('#capture-copy').click();
  await expect.poll(() => page.evaluate(() => (window as any).previewCopied)).toContain('not selected-chat attribution');
  const report = await page.evaluate(() => (window as any).previewCopied);
  expect(report).not.toMatch(/private-chat|Private title|private-model|Qwen/);
  expect(await page.evaluate(() => (window as any).previewUnexpectedSends)).toBe(0);
  expect(await page.evaluate(() => (window as any).previewComposed)).toBeNull();
  expect(await page.evaluate(() => (window as any).previewWrites)).toBe(0);
  await frame.locator('#capture').screenshot({path: info.outputPath('next-reply-result.png')});
});

test('Next reply cancels on a chat switch and never follows the replacement chat', async ({ page }) => {
  const frame = await openPanel(page, 'state=idle');
  await selectedChat(page, false);
  await frame.locator('#capture-length').selectOption('reply');
  await frame.locator('#capture-start').click();
  await selectedChat(page, true, 'another-chat');
  await expect(frame.locator('#capture-reply-state')).toContainText('Chat changed');
  await page.evaluate(() => (window as any).setPreviewState('decode'));
  await frame.locator('#refresh').click();
  await expect(frame.locator('#capture-results')).toBeHidden();
  await expect(frame.locator('#capture-start')).toBeDisabled();
  await selectedChat(page, false, 'another-chat');
  await expect(frame.locator('#capture-start')).toBeEnabled();
});

test('armed capture stays cancellable in compact view and follows host theme changes', async ({ page }, info) => {
  await page.setViewportSize({width:320, height:1200});
  const frame = await openPanel(page, 'state=prefill');
  await selectedChat(page, false);
  await frame.locator('#capture-length').selectOption('reply');
  await frame.locator('#capture-start').click();
  await frame.locator('#compact').click();
  await expect(frame.locator('#capture')).toBeVisible();
  await expect(frame.locator('#capture-stop')).toHaveText('Cancel');
  await expect(frame.locator('#prefill-remaining')).toBeVisible();
  await page.evaluate(() => (window as any).setPreviewTheme('violet'));
  await expect(frame.locator('#capture-state')).toHaveText('Armed');
  expect(await frame.locator('main').evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await frame.locator('main').screenshot({path:info.outputPath('next-reply-compact.png')});
  await frame.locator('#capture-stop').click();
  await expect(frame.locator('#capture')).toBeHidden();
  await frame.locator('#compact').click();
  await expect(frame.locator('#capture-reply-state')).toContainText('cancelled');
  expect(await page.evaluate(() => (window as any).previewUnexpectedSends)).toBe(0);
});

test('pausing or hiding a view cancels an armed capture without restarting it', async ({ page }) => {
  const frame = await openPanel(page, 'state=idle');
  await selectedChat(page, false);
  await frame.locator('#capture-length').selectOption('reply');
  for (const reason of ['pause', 'hidden']) {
    await frame.locator('#capture-start').click();
    await expect(frame.locator('#capture-state')).toHaveText('Armed');
    if (reason === 'pause') await frame.locator('#pause').click();
    else await frame.locator('main').evaluate(() => {
      Object.defineProperty(document, 'hidden', {configurable:true, value:true});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(frame.locator('#capture-reply-state')).toContainText('Monitoring interrupted');
    if (reason === 'pause') await frame.locator('#pause').click();
    else await frame.locator('main').evaluate(() => {
      Object.defineProperty(document, 'hidden', {configurable:true, value:false});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(frame.locator('#capture-start')).toBeEnabled();
    await selectedChat(page, true);
    await frame.locator('#refresh').click();
    await expect(frame.locator('#capture-results')).toBeHidden();
    await selectedChat(page, false);
  }
});

test('a reply with no local activity has no fabricated result', async ({ page }) => {
  const frame = await openPanel(page, 'state=idle');
  await selectedChat(page, false);
  await frame.locator('#capture-length').selectOption('reply');
  await frame.locator('#capture-start').click();
  await selectedChat(page, true);
  await frame.locator('#refresh').click();
  await selectedChat(page, false);
  await expect(frame.locator('#capture-reply-state')).toContainText('No oMLX activity');
  await expect(frame.locator('#capture-results')).toBeHidden();
  await expect(frame.locator('#capture-state')).toHaveText('On demand');
});

test('capture guidance is expandable, keyboard accessible and preserves monitor controls', async ({ page }) => {
  const frame = await openPanel(page);
  const help = frame.locator('#capture details.reading-help');
  await expect(help).toHaveJSProperty('open', false);
  const original = await frame.locator('#capture-start').elementHandle();
  const heading = help.locator('summary');
  await heading.focus(); await heading.press('Enter');
  await expect(help).toHaveJSProperty('open', true);
  await expect(help).toContainText('cannot read or add rows');
  await page.waitForTimeout(1100);
  await expect(heading).toBeFocused();
  await expect(help).toHaveJSProperty('open', true);
  expect(await original!.evaluate(node => node.isConnected)).toBe(true);
  await heading.press('Enter'); await expect(help).toHaveJSProperty('open', false);
});


test('Next reply is sidebar-only because selecting a chat closes the full page', async ({ page }) => {
  const frame = await openPanel(page, 'state=idle&surface=page');
  await selectedChat(page, false);
  await expect(frame.locator('#capture-length option[value="reply"]')).toBeDisabled();
  await expect(frame.locator('#capture-length')).toHaveValue('30');
  const help = frame.locator('#capture details');
  await help.locator('summary').click();
  await expect(help).toContainText('navigating away from a full-page monitor');
  await expect(frame.locator('#capture-state')).toHaveText('On demand');
});
