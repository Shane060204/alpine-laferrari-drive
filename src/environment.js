const T = THREE,
  world = new T.Scene();
world.background = new T.Color('#b8ced5');
world.fog = new T.FogExp2('#bdcfd1', 0.0003);
const viewport = $('viewport'),
  renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
const graphicsContext = renderer.getContext();
const rendererInfo = graphicsContext.getExtension('WEBGL_debug_renderer_info');
const rendererName = rendererInfo
  ? graphicsContext.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)
  : '';
// CPU-based rendering also occurs on older devices and remote desktops.
// Keep the same road and car, while reducing scenery work so input stays responsive.
const lightweightGraphics = /swiftshader|llvmpipe|software/i.test(rendererName);
renderer.setPixelRatio(Math.min(devicePixelRatio, lightweightGraphics ? 1 : 1.7));
renderer.shadowMap.enabled = !lightweightGraphics;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
viewport.appendChild(renderer.domElement);
viewport.dataset.renderer = 'webgl';
viewport.dataset.model = 'LaFerrari-inspired';
const camera = new T.PerspectiveCamera(48, 1, 0.12, 6500);
let cameraAngle = 0,
  showroom = false,
  orbit = 0.65,
  orbitDrag = null,
  wheelSpin = 0;
const hemi = new T.HemisphereLight('#d4e6f2', '#626a48', 1.2);
world.add(hemi);
const sun = new T.DirectionalLight('#fff1d8', 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -44, right: 44, top: 44, bottom: -44, near: 1, far: 180 });
sun.shadow.bias = -0.00025;
sun.shadow.normalBias = 0.025;
sun.shadow.radius = 2;
world.add(sun, sun.target);
function material(color, roughness = 0.7, metalness = 0) {
  return new T.MeshStandardMaterial({ color, roughness, metalness });
}
const paint = new T.MeshPhysicalMaterial({
  color: '#c70012',
  metalness: 0.25,
  roughness: 0.28,
  clearcoat: 1,
  clearcoatRoughness: 0.13,
  envMapIntensity: 1.3,
  side: T.DoubleSide,
});
const carbon = material('#111819', 0.48, 0.25),
  glass = new T.MeshPhysicalMaterial({
    color: '#192f3b',
    metalness: 0.38,
    roughness: 0.095,
    clearcoat: 1,
    envMapIntensity: 1.7,
    side: T.DoubleSide,
  });
const chrome = material('#cbd0d0', 0.22, 0.93),
  rubber = material('#111314', 0.96),
  redDark = material('#850713', 0.29, 0.4),
  lampMat = new T.MeshBasicMaterial({ color: '#da1e29', toneMapped: false });
let seed = 4189;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function texture(size, draw, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
const asphalt = texture(256, (c, s) => {
  c.fillStyle = '#64676a';
  c.fillRect(0, 0, s, s);
  for (let i = 0; i < 30000; i++) {
    const v = 65 + rand() * 80;
    c.fillStyle = `rgba(${v},${v + 2},${v + 3},${0.2 + rand() * 0.45})`;
    c.fillRect(rand() * s, rand() * s, 0.5 + rand() * 1.1, 0.5 + rand() * 1.1);
  }
  for (let i = 0; i < 25; i++) {
    c.strokeStyle = '#20232609';
    c.beginPath();
    c.moveTo(rand() * s, 0);
    c.lineTo(rand() * s, s);
    c.stroke();
  }
});
asphalt.repeat.set(8, 2);
const grassTex = texture(
  256,
  (c, s) => {
    c.fillStyle = '#7c8a60';
    c.fillRect(0, 0, s, s);
    for (let i = 0; i < 22000; i++) {
      const n = rand();
      c.fillStyle = n < 0.4 ? '#a8a27a' : n < 0.7 ? '#657446' : '#90956a';
      c.globalAlpha = 0.12 + rand() * 0.25;
      c.fillRect(rand() * s, rand() * s, 0.5 + rand() * 3, rand() * 4 + 0.5);
    }
    c.globalAlpha = 1;
  },
  950,
);
const envFaces = [];
for (let i = 0; i < 6; i++) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'),
    gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#c3dae7');
  gr.addColorStop(0.47, '#eef1e9');
  gr.addColorStop(0.51, '#7e876d');
  gr.addColorStop(1, '#444d38');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffffff';
  g.globalAlpha = 0.7;
  g.fillRect(15, 13, 25, 45);
  g.fillStyle = '#fff6dd';
  g.fillRect(90, 4, 10, 60);
  envFaces.push(c);
}
const cube = new T.CubeTexture(envFaces);
cube.needsUpdate = true;
cube.colorSpace = T.SRGBColorSpace;
const pmrem = new T.PMREMGenerator(renderer);
world.environment = pmrem.fromCubemap(cube).texture;
pmrem.dispose();
cube.dispose();
const sky = new T.Mesh(
  new T.SphereGeometry(5800, 32, 18),
  new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    uniforms: { top: { value: new T.Color('#6e9bb5') }, bottom: { value: new T.Color('#d9dfda') } },
    vertexShader:
      'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:
      'varying vec3 p;uniform vec3 top;uniform vec3 bottom;void main(){vec3 n=normalize(p);float h=max(n.y,0.);vec3 col=mix(bottom,top,pow(h,.43));float s=max(dot(n,normalize(vec3(-.5,.38,-.25))),0.);col+=vec3(1.,.88,.65)*pow(s,1800.)*1.1+vec3(.2,.14,.06)*pow(s,20.);gl_FragColor=vec4(col,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  }),
);
world.add(sky);
// Continuous segment distance avoids gaps between sparsely sampled track points.
const trackCells = new Map(),
  trackCellSize = 64;
for (let i = 0; i < count; i++) {
  const a = points[i],
    b = points[(i + 1) % count];
  for (
    let x = Math.floor(Math.min(a.x, b.x) / trackCellSize);
    x <= Math.floor(Math.max(a.x, b.x) / trackCellSize);
    x++
  )
    for (
      let z = Math.floor(Math.min(a.y, b.y) / trackCellSize);
      z <= Math.floor(Math.max(a.y, b.y) / trackCellSize);
      z++
    ) {
      const key = x + ',' + z;
      if (!trackCells.has(key)) trackCells.set(key, []);
      trackCells.get(key).push(i);
    }
}
function nearTrack(x, z) {
  let min = 200 * 200;
  const gx = Math.floor(x / trackCellSize),
    gz = Math.floor(z / trackCellSize);
  for (let cx = gx - 2; cx <= gx + 2; cx++)
    for (let cz = gz - 2; cz <= gz + 2; cz++) {
      const candidates = trackCells.get(cx + ',' + cz);
      if (!candidates) continue;
      for (const i of candidates) {
        const a = points[i],
          b = points[(i + 1) % count],
          dx = b.x - a.x,
          dz = b.y - a.y,
          t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.y) * dz) / (dx * dx + dz * dz))),
          d = (x - a.x - t * dx) ** 2 + (z - a.y - t * dz) ** 2;
        if (d < min) min = d;
      }
    }
  return Math.sqrt(min);
}

const lakeX = 810 * scale,
  lakeZ = 572 * scale;
function heightAt(x, z, dist) {
  const d = dist === undefined ? nearTrack(x, z) : dist;
  const lake = ((x - lakeX) / 275) ** 2 + ((z - lakeZ) / 125) ** 2;
  if (lake < 1.13 && d > 26) return -1.8;
  const h =
    Math.sin(x * 0.004 + Math.cos(z * 0.003)) * Math.cos(z * 0.004) * 13 +
    Math.sin(x * 0.013 + z * 0.007) * 3 +
    15;
  return -0.13 + Math.min(1, Math.max(0, (d - 32) / 100)) * h;
}
const terrainGeo = new T.PlaneGeometry(6600, 5600, 190, 160);
terrainGeo.rotateX(-Math.PI / 2);
terrainGeo.translate(1250, 0, 800);
const tp = terrainGeo.attributes.position;
for (let i = 0; i < tp.count; i++) {
  tp.setY(i, heightAt(tp.getX(i), tp.getZ(i)));
} // A triangle may cross the road even if all its vertices lie outside it.
// Lower all vertices of every face whose bounding circle intersects the road corridor.
const flattenedTerrainVertices = new Set(),
  terrainIndices = terrainGeo.index.array;
for (let i = 0; i < terrainIndices.length; i += 3) {
  const ids = [terrainIndices[i], terrainIndices[i + 1], terrainIndices[i + 2]],
    cx = ids.reduce((v, k) => v + tp.getX(k), 0) / 3,
    cz = ids.reduce((v, k) => v + tp.getZ(k), 0) / 3,
    r = Math.max(...ids.map((k) => Math.hypot(tp.getX(k) - cx, tp.getZ(k) - cz)));
  if (nearTrack(cx, cz) <= r + 19) ids.forEach((k) => flattenedTerrainVertices.add(k));
}
for (const k of flattenedTerrainVertices) tp.setY(k, Math.min(tp.getY(k), -0.32));
terrainGeo.computeVertexNormals();
const groundMesh = new T.Mesh(
  terrainGeo,
  new T.MeshStandardMaterial({ color: '#bbc4a7', map: grassTex, roughness: 1 }),
);
groundMesh.receiveShadow = true;
world.add(groundMesh);
function ribbon(left, right, h, mat, colored = false) {
  const ps = [],
    uv = [],
    cs = [],
    idx = [];
  for (let i = 0; i <= count; i++) {
    const a = points[i % count];
    for (const side of [left, right]) {
      ps.push(a.x + a.nx * side, h, a.y + a.ny * side);
      uv.push(side === left ? 0 : 1, (i * worldLength) / count / 8);
      if (colored) {
        const color = new T.Color(Math.floor(i / 2) % 2 ? '#dad6c8' : '#aa352b');
        cs.push(color.r, color.g, color.b);
      }
    }
    if (i < count) {
      let j = i * 2;
      idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(ps, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  if (colored) g.setAttribute('color', new T.Float32BufferAttribute(cs, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new T.Mesh(g, mat);
  m.receiveShadow = true;
  world.add(m);
  return m;
}
ribbon(-14, 14, -0.025, material('#b5ad98', 1));
ribbon(
  -10.5,
  10.5,
  0.012,
  new T.MeshStandardMaterial({
    map: asphalt,
    bumpMap: asphalt,
    bumpScale: 0.018,
    roughness: 0.92,
    color: '#929596',
  }),
);
const curbmat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 });
ribbon(-11.7, -10.45, 0.045, curbmat, true);
ribbon(10.45, 11.7, 0.045, curbmat, true);
ribbon(-10.5, -10.32, 0.053, material('#ddd9c5', 0.84));
ribbon(10.32, 10.5, 0.053, material('#ddd9c5', 0.84));
const gridGeo = new T.PlaneGeometry(20.8, 1.0),
  checkTex = texture(64, (c, s) => {
    c.fillStyle = '#ede9dd';
    c.fillRect(0, 0, s, s);
    c.fillStyle = '#222a29';
    c.fillRect(0, 0, 32, 32);
    c.fillRect(32, 32, 32, 32);
  });
checkTex.repeat.set(16, 1);
const grid = new T.Mesh(gridGeo, new T.MeshStandardMaterial({ map: checkTex, roughness: 0.85 }));
grid.rotation.x = -Math.PI / 2;
grid.rotation.z = Math.PI / 2;
grid.position.set(points[0].x, 0.06, points[0].y);
world.add(grid);
const waterMat = new T.MeshPhysicalMaterial({
  color: '#3c8792',
  metalness: 0.35,
  roughness: 0.17,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  envMapIntensity: 1.4,
});
const water = new T.Mesh(new T.CircleGeometry(1, 96), waterMat);
water.rotation.x = -Math.PI / 2;
water.scale.set(270, 120, 1);
water.position.set(lakeX, -0.2, lakeZ);
world.add(water);
const wave = texture(
  256,
  (c, s) => {
    for (let y = 0; y < s; y++) {
      const v = 120 + Math.sin(y * 0.42) * 28 + Math.sin(y * 0.18) * 14;
      c.fillStyle = `rgb(${v},${v},${v})`;
      c.fillRect(0, y, s, 1);
    }
  },
  18,
);
waterMat.bumpMap = wave;
waterMat.bumpScale = 0.065;
waterMat.roughness = 0.22;
// Distant ridges use rough geometry, height dependent rock and snow colours.
const mountains = new T.PlaneGeometry(7000, 6400, 140, 126);
mountains.rotateX(-Math.PI / 2);
mountains.translate(1250, 0, 800);
const mp = mountains.attributes.position,
  colors = [];
for (let i = 0; i < mp.count; i++) {
  const x = mp.getX(i),
    z = mp.getZ(i),
    d = Math.hypot((x - 1250) * 0.9, (z - 800) * 1.2);
  let h =
    d < 1700
      ? -20
      : Math.max(
          0,
          Math.sin(x * 0.0028) + Math.cos(z * 0.0034) + Math.sin(x * 0.006 - z * 0.002) * 0.6 + 1.8,
        ) * Math.min(135, (d - 1700) * 0.26);
  h += d > 1700 ? rand() * 25 : 0;
  mp.setY(i, h);
  const col = new T.Color(
    h > 450 ? '#b9c4c7' : h > 260 ? '#6c797b' : h > 140 ? '#647568' : '#5c735b',
  );
  col.multiplyScalar(0.85 + rand() * 0.26);
  colors.push(col.r, col.g, col.b);
}
mountains.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
mountains.computeVertexNormals();
world.add(
  new T.Mesh(
    mountains,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false }),
  ),
);
function mergeGeometry(geos) {
  const p = [],
    n = [];
  for (const g0 of geos) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    p.push(...g.attributes.position.array);
    n.push(...g.attributes.normal.array);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(n, 3));
  return g;
}
const treePositions = [];
for (let i = 0; i < count; i += 4) {
  const a = points[i];
  for (const sign of [-1, 1]) {
    const dist = 28 + rand() * 90;
    const x = a.x + a.nx * dist * sign,
      z = a.y + a.ny * dist * sign;
    if (((x - lakeX) / 300) ** 2 + ((z - lakeZ) / 145) ** 2 < 1.2) continue;
    if (nearTrack(x, z) < 23) continue;
    treePositions.push({ x, z, h: heightAt(x, z), s: 0.65 + rand() * 0.9, r: rand() * 6.28 });
  }
}
for (let i = 0; i < (lightweightGraphics ? 1100 : 3000); i++) {
  const x = -500 + rand() * 3600,
    z = -600 + rand() * 2900;
  if (nearTrack(x, z) < 50 || ((x - lakeX) / 330) ** 2 + ((z - lakeZ) / 170) ** 2 < 1.2) continue;
  treePositions.push({ x, z, h: heightAt(x, z), s: 0.7 + rand() * 1.4, r: rand() * 6.28 });
}
const pineParts = [];
for (let i = 0; i < (lightweightGraphics ? 3 : 9); i++) {
  const level = lightweightGraphics ? i * 3 : i;
  const g = new T.ConeGeometry(2.5 - level * 0.24, 2.5, lightweightGraphics ? 7 : 14);
  const a = g.attributes.position;
  for (let j = 0; j < a.count; j++) {
    const f = 0.85 + rand() * 0.3;
    a.setXYZ(j, a.getX(j) * f, a.getY(j) + (rand() - 0.5) * 0.28, a.getZ(j) * f);
  }
  g.computeVertexNormals();
  g.translate(0, 2.4 + level * 0.91, 0);
  pineParts.push(g);
}
const leafGeo = mergeGeometry(pineParts),
  pineLeaves = new T.InstancedMesh(leafGeo, material('#31573f', 0.95), treePositions.length),
  trunks = new T.InstancedMesh(
    new T.CylinderGeometry(0.12, 0.23, 3, 7),
    material('#675b47', 1),
    treePositions.length,
  );
const dummy = new T.Object3D();
treePositions.forEach((p, i) => {
  dummy.position.set(p.x, p.h, p.z);
  dummy.scale.set(p.s, p.s, p.s);
  dummy.rotation.y = p.r;
  dummy.updateMatrix();
  pineLeaves.setMatrixAt(i, dummy.matrix);
  pineLeaves.setColorAt(
    i,
    new T.Color().setHSL(0.29 + rand() * 0.06, 0.16 + rand() * 0.14, 0.2 + rand() * 0.12),
  );
  dummy.position.y = p.h + p.s * 1.5;
  dummy.updateMatrix();
  trunks.setMatrixAt(i, dummy.matrix);
});
pineLeaves.castShadow = true;
pineLeaves.receiveShadow = true;
world.add(pineLeaves, trunks);

const broadParts = [];
for (const [x, y, z, r] of [
  [0, 6.3, 0, 2.3],
  [-1.1, 5.5, 0.5, 1.8],
  [1.1, 5.7, -0.4, 1.8],
  [0.4, 7.3, 0.4, 1.6],
]) {
  const g = new T.IcosahedronGeometry(r, lightweightGraphics ? 1 : 2);
  g.translate(x, y, z);
  broadParts.push(g);
}
const broadGeo = mergeGeometry(broadParts);
const broadPositions = treePositions.filter(
    (p, i) =>
      i % 4 === 0 &&
      nearTrack(p.x + 8, p.z + 8) > 26 &&
      ((p.x + 8 - lakeX) / 300) ** 2 + ((p.z + 8 - lakeZ) / 145) ** 2 > 1.1,
  ),
  broad = new T.InstancedMesh(broadGeo, material('#597144', 0.97), broadPositions.length);
const broadTrunks = new T.InstancedMesh(
  new T.CylinderGeometry(0.12, 0.24, 6, 8),
  material('#756f5c', 1),
  broadPositions.length,
);
broadPositions.forEach((p, i) => {
  const h = heightAt(p.x + 8, p.z + 8);
  dummy.position.set(p.x + 8, h, p.z + 8);
  dummy.scale.set(p.s, p.s, p.s);
  dummy.rotation.y = p.r;
  dummy.updateMatrix();
  broad.setMatrixAt(i, dummy.matrix);
  dummy.position.y = h + 3 * p.s;
  dummy.updateMatrix();
  broadTrunks.setMatrixAt(i, dummy.matrix);
  broad.setColorAt(i, new T.Color().setHSL(0.22 + rand() * 0.08, 0.22, 0.28 + rand() * 0.1));
});
broad.castShadow = true;
broad.receiveShadow = true;
world.add(broad, broadTrunks);

const rockPositions = [];
for (let i = 0; i < 90; i++) {
  const angle = (i / 90) * Math.PI * 2;
  const x = lakeX + Math.cos(angle) * (277 + rand() * 15),
    z = lakeZ + Math.sin(angle) * (123 + rand() * 9);
  if (nearTrack(x, z) > 23) rockPositions.push({ x, z });
}
const rocks = new T.InstancedMesh(
  new T.IcosahedronGeometry(1, 1),
  material('#8c8e82', 0.96),
  rockPositions.length,
);
rockPositions.forEach((p, i) => {
  dummy.position.set(p.x, Math.max(-0.8, heightAt(p.x, p.z)), p.z);
  dummy.scale.set(1 + rand() * 2.8, 0.5 + rand() * 0.9, 0.6 + rand() * 1.7);
  dummy.rotation.set(rand(), rand() * 6, rand());
  dummy.updateMatrix();
  rocks.setMatrixAt(i, dummy.matrix);
  rocks.setColorAt(i, new T.Color().setHSL(0.11, 0.06, 0.37 + rand() * 0.16));
});
rocks.castShadow = true;
rocks.receiveShadow = true;
world.add(rocks);
dummy.rotation.set(0, 0, 0);

const bladeTex = texture(64, (c, s) => {
  c.clearRect(0, 0, s, s);
  for (let i = 0; i < 18; i++) {
    const x = rand() * s,
      y = s * (0.08 + rand() * 0.5);
    c.strokeStyle = ['#69764c', '#7e8956', '#8b9061'][i % 3];
    c.lineWidth = 1 + rand();
    c.beginPath();
    c.moveTo(x, s);
    c.quadraticCurveTo(x + (rand() - 0.5) * 20, s * 0.55, x + (rand() - 0.5) * 20, y);
    c.stroke();
  }
});
const bladeMat = new T.MeshStandardMaterial({
    map: bladeTex,
    alphaTest: 0.45,
    side: T.DoubleSide,
    roughness: 1,
    color: '#b9c2a0',
  }),
  bladePositions = [];
for (let i = 0; i < count; i += 2) {
  const p = points[i];
  for (const sign of [-1, 1])
    for (let k = 0; k < (lightweightGraphics ? 3 : 8); k++) {
      const d = 12.4 + rand() * 22,
        x = p.x + p.nx * d * sign + (rand() - 0.5) * 8,
        z = p.y + p.ny * d * sign + (rand() - 0.5) * 8;
      if (nearTrack(x, z) < 13.5 || ((x - lakeX) / 300) ** 2 + ((z - lakeZ) / 140) ** 2 < 1.1)
        continue;
      bladePositions.push({ x, z });
    }
}
const blades = new T.InstancedMesh(new T.PlaneGeometry(0.8, 0.55), bladeMat, bladePositions.length);
bladePositions.forEach((p, i) => {
  const size = 0.6 + rand() * 0.8;
  dummy.position.set(p.x, heightAt(p.x, p.z) + 0.275 * size, p.z);
  dummy.scale.set(size, size, size);
  dummy.rotation.set(0, rand() * Math.PI, 0);
  dummy.updateMatrix();
  blades.setMatrixAt(i, dummy.matrix);
});
blades.receiveShadow = true;
world.add(blades);
dummy.scale.set(1, 1, 1);
dummy.rotation.set(0, 0, 0);

// Armco barriers, posts and trackside advertising anchor the circuit in the landscape.
const railMat = material('#a9b0af', 0.4, 0.65),
  railPos = [],
  railIdx = [];
for (const sign of [-1, 1]) {
  const offset = 15.7 * sign,
    base = railPos.length / 3;
  for (let i = 0; i <= count; i++) {
    const p = points[i % count];
    railPos.push(
      p.x + p.nx * offset,
      0.43,
      p.y + p.ny * offset,
      p.x + p.nx * offset,
      0.76,
      p.y + p.ny * offset,
    );
    if (i < count) {
      let j = base + i * 2;
      railIdx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
    }
  }
}
const railG = new T.BufferGeometry();
railG.setAttribute('position', new T.Float32BufferAttribute(railPos, 3));
railG.setIndex(railIdx);
railG.computeVertexNormals();
railMat.side = T.DoubleSide;
const rails = new T.Mesh(railG, railMat);
rails.castShadow = true;
world.add(rails);
const postCount = Math.ceil(count / 3) * 2,
  posts = new T.InstancedMesh(new T.BoxGeometry(0.12, 0.85, 0.12), railMat, postCount);
let pi = 0;
for (let i = 0; i < count; i += 3) {
  const p = points[i];
  for (const sign of [-1, 1]) {
    dummy.position.set(p.x + p.nx * 15.7 * sign, 0.39, p.y + p.ny * 15.7 * sign);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, -p.ang, 0);
    dummy.updateMatrix();
    posts.setMatrixAt(pi++, dummy.matrix);
  }
}
posts.count = pi;
posts.castShadow = true;
world.add(posts);
function addBox(parent, x, y, z, w, h, d, mat) {
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const standSteel = material('#5f6966', 0.5, 0.5),
  standRoof = material('#b5b8b3', 0.65, 0.25),
  concrete = material('#b1afa2', 0.92),
  seatMat = material('#8e302d', 0.8);
for (let k = 0; k < 4; k++) {
  const index = 18 + k * 18,
    p = points[index],
    g = new T.Group();
  g.position.set(p.x + p.nx * 35, 0, p.y + p.ny * 35);
  g.rotation.y = Math.PI / 2 - p.ang;
  for (let row = 0; row < 5; row++) {
    addBox(g, 0, 0.65 + row * 0.55, 2.5 - row * 1.15, 32, 0.45, 1.2, concrete);
    addBox(g, 0, 1.0 + row * 0.55, 2.6 - row * 1.15, 30, 0.18, 0.6, seatMat);
  }
  for (const x of [-15, 15]) addBox(g, x, 4.5, -2, 0.18, 9, 0.18, standSteel);
  addBox(g, 0, 8.5, -0.8, 34, 0.22, 9, standRoof);
  world.add(g);
}
const chaletWall = material('#c6c0a9', 0.88),
  chaletRoof = material('#706154', 0.8);
for (let i = 0; i < 10; i++) {
  const x = (710 + i * 38) * scale,
    z = (535 - (i % 3) * 12) * scale,
    g = new T.Group(),
    h = heightAt(x, z);
  g.position.set(x, h, z);
  addBox(g, 0, 3, 0, 11, 6, 9, chaletWall);
  const roof = new T.Mesh(new T.ConeGeometry(8.5, 3.5, 4), chaletRoof);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 7.5;
  roof.castShadow = true;
  g.add(roof);
  for (let j = -1; j <= 1; j++) addBox(g, j * 3, 3.6, 4.53, 1.3, 1.7, 0.03, glass);
  world.add(g);
}
