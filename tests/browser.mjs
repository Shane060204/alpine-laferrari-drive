import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import '../scripts/build.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.APEX_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.APEX_BROWSER_CHANNEL ? { channel: process.env.APEX_BROWSER_CHANNEL } : {}),
  args: ['--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const html = (await readFile(new URL('../dist/index.html', import.meta.url), 'utf8'))
    .replace(
      'renderer.render(world, camera);',
      'renderer.render(world, camera); window.__APEX_TEST__ = {groundMesh,points,state,camera,car,showroom};',
    )
    .replace(
      'renderer.render(world,camera);',
      'renderer.render(world,camera); window.__APEX_TEST__ = {groundMesh,points,state,camera,car,showroom};',
    );
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__APEX_TEST__);

  const clearance = await page.evaluate(() => {
    const { groundMesh, points } = window.__APEX_TEST__;
    const geometry = groundMesh.geometry;
    const positions = geometry.attributes.position;
    const indices = geometry.index.array;
    const cols = geometry.parameters.widthSegments;
    const rows = geometry.parameters.heightSegments;
    const x0 = positions.getX(0),
      z0 = positions.getZ(0);
    const dx = (positions.getX(cols) - x0) / cols;
    const dz = (positions.getZ(rows * (cols + 1)) - z0) / rows;
    function terrainHeight(x, z) {
      const col = Math.min(cols - 1, Math.max(0, Math.floor((x - x0) / dx)));
      const row = Math.min(rows - 1, Math.max(0, Math.floor((z - z0) / dz)));
      for (let triangle = 0; triangle < 2; triangle++) {
        const offset = (row * cols + col) * 6 + triangle * 3;
        const [a, b, c] = [indices[offset], indices[offset + 1], indices[offset + 2]];
        const ax = positions.getX(a),
          az = positions.getZ(a);
        const bx = positions.getX(b),
          bz = positions.getZ(b);
        const cx = positions.getX(c),
          cz = positions.getZ(c);
        const denominator = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
        const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / denominator;
        const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / denominator;
        const w = 1 - u - v;
        if (u >= -1e-4 && v >= -1e-4 && w >= -1e-4) {
          return u * positions.getY(a) + v * positions.getY(b) + w * positions.getY(c);
        }
      }
      throw new Error('No terrain triangle found for a road sample');
    }
    let samples = 0,
      maximum = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      for (const fraction of [0, 0.5])
        for (const side of [-10, -8, -4, 0, 4, 8, 10]) {
          const x = a.x + (b.x - a.x) * fraction + (a.nx + (b.nx - a.nx) * fraction) * side;
          const z = a.y + (b.y - a.y) * fraction + (a.ny + (b.ny - a.ny) * fraction) * side;
          maximum = Math.max(maximum, terrainHeight(x, z));
          samples++;
        }
    }
    return { samples, maximum };
  });
  assert.ok(clearance.samples > 10000);
  assert.ok(clearance.maximum < -0.15, `Terrain protrudes into road: ${clearance.maximum}m`);
  console.log(
    `PASS road clearance: ${clearance.samples} samples, max terrain ${clearance.maximum.toFixed(3)}m`,
  );

  await page.locator('#enable-keyboard').click();
  await page.keyboard.down('w');
  await page.waitForFunction(() => Number(document.getElementById('speed').textContent) > 10);
  await page.keyboard.up('w');
  const before = Number(await page.locator('#map-car').getAttribute('cy'));
  await page.keyboard.down('d');
  await page.waitForFunction(
    (start) => Number(document.getElementById('map-car').getAttribute('cy')) > start + 0.1,
    before,
  );
  await page.keyboard.up('d');
  await page.keyboard.press('Space');
  const stopped = await page.locator('#map-car').getAttribute('cx');
  await page.waitForTimeout(200);
  assert.equal(await page.locator('#map-car').getAttribute('cx'), stopped);
  await page.keyboard.press('Space');
  await page.keyboard.press('r');
  assert.equal(await page.locator('#speed').textContent(), '0');
  await page.locator('#model-view').click();
  await page.waitForFunction(() => window.__APEX_TEST__.showroom);
  await page.locator('#model-view').click();
  await page.waitForFunction(() => !window.__APEX_TEST__.showroom);

  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(100);
    const projection = await page.evaluate(() => {
      const { camera, car, state } = window.__APEX_TEST__;
      const bounds = new THREE.Box3().setFromObject(car),
        corners = [];
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) {
            corners.push(new THREE.Vector3(x, y, z).project(camera));
          }
      return {
        inside: corners.every((p) => Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && p.z > -1 && p.z < 1),
        behind:
          (camera.position.x - state.x) * Math.cos(state.heading) +
          (camera.position.z - state.y) * Math.sin(state.heading),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.ok(
      projection.inside && projection.behind < -9 && !projection.overflow,
      `Camera/layout failure at ${width}px`,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS keyboard steering, pause/reset, model-view toggle and third-person framing at 1280/390/320px',
  );
} finally {
  await browser.close();
}
