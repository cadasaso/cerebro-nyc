const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const output = path.resolve(root, process.env.QA_OUTPUT || 'docs/qa/navegador');
const base = process.env.BASE_URL || 'http://127.0.0.1:5193';
const read = file => JSON.parse(fs.readFileSync(path.join(root, 'dist/data', file)));
const result = { testedAt: new Date().toISOString(), baseUrl: base, scope: process.env.BASE_URL ? 'URL indicada' : 'compilacion local dist', views: [], errors: [] };
let server, browser;

async function pixels(page, locator) {
  const bytes = await locator.screenshot();
  return page.evaluate(async data => {
    const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
    const context = canvas.getContext('2d'); context.drawImage(img, 0, 0);
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let teal = 0, yellow = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      const [r, g, b] = rgba.slice(i, i + 3);
      if (g > r + 25 && g > 70 && b > r + 15) teal++;
      if (r > 210 && g > 160 && b < 160) yellow++;
    }
    return { width: img.width, height: img.height, teal, yellow };
  }, bytes.toString('base64'));
}

async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Desbordamiento horizontal');
}

async function comparison(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(base + '/comparacion.html');
  await page.waitForFunction(() => document.documentElement.dataset.chartReady === 'true');
  await page.waitForFunction(() => document.documentElement.dataset.mapReady === 'true', null, { timeout: 45000 });
  assert.equal(await page.locator('#values tr').count(), 6);
  assert.equal(await page.locator('#chart svg').count(), 1);
  assert((await page.locator('#values').innerText()).includes('8.804.190'));
  for (const row of read('toolComparison.json').rows) {
    await page.locator('#borough').selectOption(row.borough);
    assert((await page.locator('#selection').innerText()).includes(row.population.toLocaleString('es-CO')));
    const chart = await page.evaluate(() => echarts.getInstanceByDom(document.getElementById('chart')).getOption().series[0].data);
    assert.equal(chart.filter(r => r.itemStyle.color === '#86ded2').length, 1);
    assert.equal(chart.find(r => r.itemStyle.color === '#86ded2').name, row.borough);
  }
  await page.locator('#borough').selectOption('Brooklyn');
  const mapPixels = await pixels(page, page.locator('#map canvas'));
  assert(mapPixels.teal > 1000, 'Mapa vacio');
  assert(mapPixels.yellow > 20, 'La seleccion no se refleja en el mapa');
  // Use the renderer's coordinates for a real pointer click on the Queens bar.
  const bar = await page.evaluate(() => {
    const chart = echarts.getInstanceByDom(document.getElementById('chart'));
    const data = chart.getOption().series[0].data;
    const index = data.findIndex(r => r.name === 'Queens');
    const [x, y] = chart.convertToPixel({ seriesIndex: 0 }, [data[index].value / 2, index]);
    return { x, y };
  });
  await page.locator('#chart').scrollIntoViewIfNeeded();
  const chartBox = await page.locator('#chart').boundingBox();
  await page.mouse.click(chartBox.x + bar.x, chartBox.y + bar.y);
  assert.equal(await page.locator('#borough').inputValue(), 'Queens');
  await page.locator('#map').scrollIntoViewIfNeeded();
  const mapBox = await page.locator('#map canvas').boundingBox();
  let polygonClick = false;
  for (let y = 0.2; y < 0.9 && !polygonClick; y += 0.12) {
    for (let x = 0.2; x < 0.9 && !polygonClick; x += 0.12) {
      await page.locator('#borough').selectOption('');
      await page.mouse.click(mapBox.x + mapBox.width * x, mapBox.y + mapBox.height * y);
      polygonClick = Boolean(await page.locator('#borough').inputValue());
    }
  }
  assert(polygonClick, 'El clic sobre poligonos no selecciona un borough');
  await page.locator('#borough').selectOption('Brooklyn');
  const pending = page.waitForEvent('download');
  await page.locator('#export-chart').click();
  const download = await pending;
  const svg = fs.readFileSync(await download.path(), 'utf8');
  assert(svg.includes('<svg') && svg.includes('Brooklyn'), 'Exportacion SVG invalida');
  if (width === 1440) fs.writeFileSync(path.join(output, 'poblacion-censo2020.svg'), svg);
  await noOverflow(page);
  await page.screenshot({ path: path.join(output, `comparador-${width}.png`), fullPage: true });
  return { width, height, rows: 5, total: 8804190, selection: true, barClick: true, polygonClick, svgDownload: true, mapPixels, overflow: false };
}

async function outcomes(page, width, height) {
  await page.setViewportSize({ width, height }); await page.goto(base + '/');
  await page.waitForSelector('#service-outcomes tbody tr', { state: 'attached' });
  const service = read('serviceOutcomes.json'), traffic = read('trafficCounts.json');
  const numeric = (n, decimals = 0) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
  const tables = page.locator('#service-outcomes table');
  for (let i = 0; i < service.rows.length; i++) {
    const row = service.rows[i];
    const closure = await tables.nth(0).locator('tbody tr').nth(i).locator('td').allTextContents();
    assert.deepEqual(closure, [row.total, row.validClosed, row.missingClosed, row.excludedClosed].map(n => numeric(n)).concat([numeric(row.meanDays, 1), numeric(row.medianDays, 1)]));
    const survey = await tables.nth(1).locator('tbody tr').nth(i).locator('td').allTextContents();
    assert.deepEqual(survey, [numeric(row.surveyValid), numeric(row.surveyPositive), numeric(row.agreementPct, 1)]);
  }
  assert.equal(await page.locator('#traffic-counts tbody tr').count(), 9);
  for (let i = 0; i < traffic.rows.length; i++) {
    const row = traffic.rows[i];
    const cells = await page.locator('#traffic-counts tbody tr').nth(i).locator('td').allTextContents();
    assert.equal(cells.at(-1), row.meanVehiclesPerObservedHour === null ? 'Sin dato' : numeric(row.meanVehiclesPerObservedHour, 1));
    assert.equal(cells[0], numeric(row.segments));
    assert.equal(cells[3], numeric(row.completeHours));
  }
  for (const file of ['serviceOutcomes.json', 'trafficCounts.json']) {
    const response = await page.request.get(base + '/data/' + file); assert.equal(response.status(), 200);
    assert.deepEqual(await response.json(), read(file));
  }
  for (const id of ['service-outcomes', 'traffic-counts']) {
    await page.locator('#' + id).scrollIntoViewIfNeeded();
    await page.evaluate(id => {
      const panel = document.getElementById(id);
      window.scrollTo(0, scrollY + panel.getBoundingClientRect().top - 110);
    }, id);
    await page.screenshot({ path: path.join(output, `${id}-${width}.png`) });
  }
  await noOverflow(page);
  return { width, closureRows: 5, surveyRows: 5, trafficRows: 9, measuredCells: 3, missingCells: 6, jsonMatchesVisibleValues: true, overflow: false };
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  if (process.env.QA_ONLY === 'leaflet') {
    const previous = JSON.parse(fs.readFileSync(path.join(output, 'resultado.json')));
    assert.equal(previous.passed, true, 'Se requiere una ejecucion completa aprobada');
    for (const [file, hash] of Object.entries(previous.inputSha256)) {
      assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'dist/data', file))).digest('hex'), hash);
    }
    result.initialFullRunAt = previous.initialFullRunAt || previous.testedAt;
    result.views = previous.views;
    result.targetedRetest = 'Leaflet, resize movil y alternativa sin WebGL; datos anteriores sin cambios';
  }
  if (!process.env.BASE_URL) {
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5193', '--strictPort'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Servidor no disponible')), 15000);
      server.stdout.on('data', chunk => { if (chunk.toString().includes('Local:')) { clearTimeout(timer); resolve(); } });
      server.on('error', reject); server.on('exit', code => reject(Error('Servidor: ' + code)));
    });
  }
  browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  result.browserVersion = browser.version();
  result.webgl = 'SwiftShader, GPU por software; no acredita un telefono fisico';
  const context = await browser.newContext({ acceptDownloads: true, reducedMotion: 'reduce' });
  const origin = new URL(base).origin;
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === origin || ['blob:', 'data:'].includes(url.protocol) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => result.errors.push(error.message));
  for (const [width, height] of process.env.QA_ONLY === 'leaflet' ? [] : [[1440, 1000], [390, 844], [412, 915]]) {
    const compared = await comparison(page, width, height);
    const indicators = await outcomes(page, width, height);
    result.views.push({ comparison: compared, outcomes: indicators });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + '/comparacion/alternativa-leaflet.html');
  await page.waitForFunction(() => document.documentElement.dataset.leafletReady === 'true');
  assert.equal(await page.locator('#map .leaflet-overlay-pane path.leaflet-interactive').count(), 5);
  for (const row of read('toolComparison.json').rows) {
    await page.locator('#borough').selectOption(row.borough);
    assert((await page.locator('#selection').innerText()).includes(row.population.toLocaleString('es-CO')));
  }
  const leafletPath = page.locator('#map .leaflet-overlay-pane path.leaflet-interactive').first();
  await leafletPath.focus(); await page.keyboard.press('Enter');
  await page.locator('#borough').selectOption('');
  await leafletPath.click({ force: true });
  assert(await page.locator('#borough').inputValue());
  await page.screenshot({ path: path.join(output, 'alternativa-leaflet-1440.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  await page.waitForFunction(() => {
    const box = document.getElementById('map').getBoundingClientRect();
    return [...document.querySelectorAll('#map .leaflet-overlay-pane path.leaflet-interactive')].every(path => {
      const rect = path.getBoundingClientRect();
      return rect.left >= box.left && rect.right <= box.right && rect.top >= box.top && rect.bottom <= box.bottom;
    });
  });
  const leafletMobilePixels = await pixels(page, page.locator('#map'));
  assert(leafletMobilePixels.teal > 1000, 'Leaflet movil vacio');
  await page.screenshot({ path: path.join(output, 'alternativa-leaflet-390.png'), fullPage: true });
  result.leaflet = { version: '1.9.4', polygons: 5, selector: true, polygonClick: true, mobileOverflow: false, mobilePixels: leafletMobilePixels };
  // Exercise the explicit WebGL failure path independently of a successful GPU render.
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /webgl/.test(type) ? null : getContext.call(this, type, ...args);
    };
  });
  const previousErrors = result.errors.length;
  await page.goto(base + '/comparacion.html');
  await page.waitForFunction(() => document.documentElement.dataset.chartReady === 'true');
  assert((await page.locator('#map-state').innerText()).includes('WebGL no disponible'));
  await page.locator('#borough').selectOption('Bronx');
  assert((await page.locator('#selection').innerText()).includes('1.472.654'));
  assert.equal(await page.locator('#values tr').count(), 6);
  result.noWebgl = { table: true, chart: true, selector: true, newUnhandledErrors: result.errors.length - previousErrors };
  assert.deepEqual(result.errors, []);
  result.inputSha256 = Object.fromEntries(['toolComparison.json', 'serviceOutcomes.json', 'trafficCounts.json'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'dist/data', file))).digest('hex')]));
  result.passed = true;
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { result.passed = false; result.failure = error.stack; console.error(error); process.exitCode = 1; }).finally(async () => {
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'resultado.json'), JSON.stringify(result, null, 2));
  await browser?.close(); server?.kill();
});
