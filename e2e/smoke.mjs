// Tier 4 — browser smoke test. Loads the actual page in Chromium and asserts the
// render path works end to end: the grid draws, the legend builds, the tooltip
// responds to hover, and the data-load failure branch shows its message.
//
// Hermetic by design: the two CDN <script> tags (d3, topojson-client) are
// intercepted and fulfilled from the locally installed UMD bundles, so the test
// needs no external network and never flakes on a CDN. See
// docs/testing-strategy.md (Tier 4).
//
// Run: npm run test:e2e   (locally set CHROMIUM_PATH to the pre-installed binary;
// in CI, `playwright install chromium` provides it and the default is used.)

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

const D3_BUNDLE = path.join(ROOT, 'node_modules/d3/dist/d3.min.js');
const TOPOJSON_BUNDLE = path.join(ROOT, 'node_modules/topojson-client/dist/topojson-client.min.js');

let server;
let baseUrl;
let browser;

before(async () => {
  server = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const buf = await readFile(path.join(ROOT, p));
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      res.end(buf);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${server.address().port}/`;

  // CHROMIUM_PATH points at a pre-installed binary (local sandbox); unset in CI,
  // where `playwright install chromium` puts it on the default search path.
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});

after(async () => {
  await browser?.close();
  await new Promise((r) => server.close(r));
});

// Open a page with the CDN libraries redirected to local bundles. `routes` lets
// a test add extra interception (e.g. to simulate a failed data load) before the
// navigation happens.
async function openPage(routes = async () => {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.route('https://d3js.org/d3.v7.min.js', (r) =>
    r.fulfill({ path: D3_BUNDLE, contentType: 'text/javascript' }));
  await page.route('https://cdn.jsdelivr.net/npm/topojson-client@3/**', (r) =>
    r.fulfill({ path: TOPOJSON_BUNDLE, contentType: 'text/javascript' }));
  await routes(page);
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  return page;
}

test('renders the choropleth grid', async () => {
  const page = await openPage();
  try {
    await page.locator('#loading').waitFor({ state: 'hidden', timeout: 15000 });
    assert.equal(await page.evaluate(() => typeof window.d3 !== 'undefined'), true, 'd3 should load');
    const cells = await page.locator('rect.cell').count();
    assert.ok(cells > 1000, `expected a filled grid, got ${cells} cells`);
  } finally {
    await page.close();
  }
});

test('builds a legend with one item per distinct rendered sequence', async () => {
  const page = await openPage();
  try {
    await page.locator('#loading').waitFor({ state: 'hidden', timeout: 15000 });
    const legendCount = await page.locator('#legend .legend-item').count();
    assert.ok(legendCount >= 10, `expected a populated legend, got ${legendCount}`);

    // The legend is built from the sequences actually present in the grid, and
    // colors are unique (guarded by the Tier 1 suite), so distinct cell fills
    // should equal the number of legend items.
    const distinctFills = await page.evaluate(() => {
      const fills = new Set();
      document.querySelectorAll('rect.cell').forEach((r) => fills.add(r.getAttribute('fill')));
      return fills.size;
    });
    assert.equal(legendCount, distinctFills, 'legend items should match distinct cell colors');

    // Every legend item has a visible label.
    const emptyLabels = await page.evaluate(() =>
      [...document.querySelectorAll('#legend .legend-label')].filter((el) => !el.textContent.trim()).length);
    assert.equal(emptyLabels, 0, 'every legend item should have a label');
  } finally {
    await page.close();
  }
});

test('tooltip appears on hover and hides on leave', async () => {
  const page = await openPage();
  try {
    await page.locator('#loading').waitFor({ state: 'hidden', timeout: 15000 });
    const tooltip = page.locator('#tooltip');

    await page.locator('rect.cell').first().hover();
    assert.equal(await tooltip.evaluate((el) => getComputedStyle(el).display), 'block', 'tooltip should show');
    const seq = await page.locator('#tooltip .seq').textContent();
    assert.ok(seq && seq.trim().length > 0, 'tooltip should name a sequence');

    // Move the pointer far away from any cell.
    await page.mouse.move(5, 5);
    await tooltip.waitFor({ state: 'hidden', timeout: 5000 });
    assert.equal(await tooltip.evaluate((el) => getComputedStyle(el).display), 'none', 'tooltip should hide');
  } finally {
    await page.close();
  }
});

test('shows a helpful message when the map data fails to load', async () => {
  const page = await openPage(async (p) => {
    await p.route('**/us-states.json', (r) => r.abort());
  });
  try {
    await assert.doesNotReject(
      page.locator('#loading', { hasText: 'Could not load map data' }).waitFor({ timeout: 15000 }),
      'the loading element should show the data-load failure message',
    );
    assert.equal(await page.locator('rect.cell').count(), 0, 'no cells should render without data');
  } finally {
    await page.close();
  }
});
