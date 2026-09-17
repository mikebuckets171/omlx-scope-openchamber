async page => {
  const failures = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (condition, message) => { if (!condition) failures.push(message); };
  const frame = () => page.frame({ url: /\/panel\/index\.html/ });
  for (const theme of ['dark', 'light']) {
    for (const width of [320, 430, 720]) {
      await page.setViewportSize({ width, height: 960 });
      await page.goto(`http://127.0.0.1:8787/?theme=${theme}&long=1`);
      await frame().getByText('oMLX connected', { exact: true }).waitFor();
      const dimensions = await frame().evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
      check(dimensions.scroll <= dimensions.width, `${theme}/${width}: horizontal overflow`);
      const button = await frame().locator('#refresh').elementHandle();
      const model = await frame().locator('#model').elementHandle();
      await frame().locator('summary').click();
      await frame().locator('summary').focus();
      await page.waitForTimeout(1100);
      check(await model.evaluate(el => el.isConnected), 'model DOM is replaced on poll');
      check(await button.evaluate(el => el.isConnected), 'refresh DOM is replaced on poll');
      check(await frame().locator('details').evaluate(el => el.open), 'details lost open state');
      check(await frame().locator('summary').evaluate(el => el === document.activeElement), 'poll stole keyboard focus');
      await frame().locator('#refresh').click();
      await page.waitForTimeout(150);
      check(!await frame().locator('#refresh').isDisabled(), 'manual refresh remains disabled');
    }
  }
  for (const state of ['idle', 'prefill', 'queued', 'notLoaded', 'offline', 'auth', 'processing']) {
    await page.goto(`http://127.0.0.1:8787/?state=${state}`);
    await page.waitForTimeout(200);
    const content = await frame().locator('main').innerText();
    check(!content.includes('NaN') && !content.includes('undefined'), `${state}: invalid text`);
    if (state === 'notLoaded') check(content.includes('Standby') && content.includes('no model loaded'), 'no-model misreported offline');
    if (state === 'auth') check(content.includes('Authentication required'), 'authentication state missing');
    if (state === 'prefill') check(await frame().locator('[role=progressbar]').getAttribute('aria-valuenow') === '64', 'prefill progress missing');
    if (state === 'offline') check(await frame().locator('#rate').innerText() === '—', 'offline has live speed');
  }
  await page.goto('http://127.0.0.1:8787/');
  await frame().getByText('oMLX connected', { exact: true }).waitFor();
  // Simulated Page Visibility event exercises production event wiring; poller
  // concurrency/pause behavior is also covered independently by unit tests.
  await frame().evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(150);
  const before = await page.evaluate(() => window.previewRequests);
  await page.waitForTimeout(1200);
  check(await page.evaluate(() => window.previewRequests) === before, 'hidden panel kept polling');
  await frame().evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(200);
  check(await page.evaluate(() => window.previewRequests) > before, 'visible panel did not resume');
  await page.goto('http://127.0.0.1:8787/?item=session&sessionTitle=Session%20action%20context');
  await frame().getByText('Session action context', { exact: true }).waitFor();
  check(await frame().locator('#session-context').isVisible(), 'session action context is hidden');
  await page.goto('http://127.0.0.1:8787/');
  check(await frame().locator('#session-context').isHidden(), 'rail-opened panel retained stale session context');
  check(errors.length === 0, `page errors: ${errors.join('; ')}`);
  if (failures.length) throw new Error(failures.join('\n'));
  console.log('PASS: 6 viewport/theme combinations, 7 runtime states, stable DOM/disclosure/focus, refresh, simulated visibility pause/resume, no page errors.');
}
