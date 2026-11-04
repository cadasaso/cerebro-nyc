const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:5193';
const output = path.resolve(__dirname, '..', process.env.QA_OUTPUT || 'docs/qa/produccion');
let browser;
(async () => {
  fs.mkdirSync(output, { recursive: true });
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, reducedMotion: 'reduce' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === new URL(base).origin || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  await page.goto(base + '/trazabilidad.html');
  const summaries = [];
  for (const width of [1180, 390, 412]) {
    await page.locator('#test-viewport').selectOption(String(width));
    await page.locator('#run-test').click();
    await page.waitForFunction(() => !document.getElementById('run-test').disabled && !document.getElementById('download-test').disabled, null, { timeout: 120000 });
    const pending = page.waitForEvent('download');
    await page.locator('#download-test').click();
    const download = await pending;
    const bytes = fs.readFileSync(await download.path());
    const report = JSON.parse(bytes);
    fs.writeFileSync(path.join(output, `trazabilidad-${width}.json`), bytes);
    assert.equal(report.ok, true); assert.equal(report.clicksVerified, 143);
    assert.equal(report.uniqueSourceIds.length, 30); assert.equal(report.viewport.width, width);
    assert.equal(report.horizontalOverflow, false); assert.deepEqual(report.failures, []);
    assert.equal(new URL(report.url).origin, new URL(base).origin);
    await page.screenshot({ path: path.join(output, `trazabilidad-${width}.png`) });
    summaries.push({ width, verified: report.clicksVerified, ids: report.uniqueSourceIds.length, errors: report.failures.length, overflow: report.horizontalOverflow });
  }
  const summary = { testedAt: new Date().toISOString(), baseUrl: base, passed: true, scope: 'F01-F21 y F25-F33; F34-F36 comprobadas por browser-release.cjs', views: summaries };
  fs.writeFileSync(path.join(output, 'resumen-trazabilidad.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
