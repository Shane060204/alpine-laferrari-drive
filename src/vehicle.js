const car = new T.Group();
world.add(car);
const wheelGroups = [],
  frontWheels = [],
  rimGroups = [];
function customMesh(vertices, indices, mat, parent = car) {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  const m = new T.Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function panel(vertices, mat, parent = car) {
  return customMesh(
    vertices.flat(),
    Array.from({ length: vertices.length - 2 }, (_, i) => [0, i + 1, i + 2]).flat(),
    mat,
    parent,
  );
}
// Smooth interpolated sections reproduce a low nose, muscular wheel arches and a narrow waist.
const profiles = [
  [-2.35, 0.86, 0.67, 0.66],
  [-2.1, 0.99, 0.78, 0.73],
  [-1.5, 1.015, 0.9, 0.76],
  [-1.0, 0.985, 0.84, 0.76],
  [-0.5, 0.93, 0.7, 0.73],
  [0, 0.9, 0.65, 0.68],
  [0.6, 0.93, 0.76, 0.62],
  [1.3, 0.975, 0.86, 0.54],
  [1.8, 0.94, 0.75, 0.44],
  [2.15, 0.84, 0.51, 0.3],
  [2.35, 0.64, 0.34, 0.27],
];
const profileCurve = new T.CatmullRomCurve3(profiles.map((p) => new T.Vector3(p[1], p[2], p[0]))),
  centerCurve = new T.CatmullRomCurve3(profiles.map((p) => new T.Vector3(p[1], p[3], p[0])));
const bodyPos = [],
  bodyIdx = [],
  rows = 160,
  cols = 48;
for (let i = 0; i <= rows; i++) {
  const p = profileCurve.getPoint(i / rows),
    c = centerCurve.getPoint(i / rows),
    cross = new T.CatmullRomCurve3([
      new T.Vector3(-p.x, 0.2, p.z),
      new T.Vector3(-p.x * 1.01, p.y * 0.71, p.z),
      new T.Vector3(-p.x * 0.91, p.y, p.z),
      new T.Vector3(-p.x * 0.58, c.y + 0.045, p.z),
      new T.Vector3(0, c.y, p.z),
      new T.Vector3(p.x * 0.58, c.y + 0.045, p.z),
      new T.Vector3(p.x * 0.91, p.y, p.z),
      new T.Vector3(p.x * 1.01, p.y * 0.71, p.z),
      new T.Vector3(p.x, 0.2, p.z),
    ]);
  for (let j = 0; j <= cols; j++) {
    const v = cross.getPoint(j / cols);
    bodyPos.push(v.x, v.y, v.z);
  }
}
for (let k = 0; k < bodyPos.length; k += 3) {
  const x = bodyPos[k],
    z = bodyPos[k + 2];
  if (Math.abs(x) > 0.8) {
    for (const wz of [-1.47, 1.42]) {
      const dz = z - wz;
      if (Math.abs(dz) < 0.43)
        bodyPos[k + 1] = Math.max(bodyPos[k + 1], 0.385 + Math.sqrt(0.43 * 0.43 - dz * dz));
    }
  }
}
function archCut(index) {
  const x = bodyPos[index * 3],
    h = bodyPos[index * 3 + 1],
    z = bodyPos[index * 3 + 2];
  if (Math.abs(x) < 0.82) return false;
  for (const wz of [-1.47, 1.42]) {
    const dz = z - wz;
    if (Math.abs(dz) < 0.425 && h < 0.385 + Math.sqrt(0.425 * 0.425 - dz * dz)) return true;
  }
  return false;
}
for (let i = 0; i < rows; i++)
  for (let j = 0; j < cols; j++) {
    let a = i * (cols + 1) + j,
      b = a + cols + 1;
    bodyIdx.push(a, b, a + 1, a + 1, b, b + 1);
  }
const mainBody = customMesh(bodyPos, bodyIdx, paint);
mainBody.name = 'LaFerrari sculpted body';
panel(
  [
    [-0.86, 0.2, -2.35],
    [0.86, 0.2, -2.35],
    [0.94, 0.57, -2.35],
    [0.84, 0.73, -2.35],
    [0, 0.68, -2.35],
    [-0.84, 0.73, -2.35],
    [-0.94, 0.57, -2.35],
  ],
  paint,
);
panel(
  [
    [-0.85, 0.23, 2.19],
    [-0.59, 0.35, 2.35],
    [0.59, 0.35, 2.35],
    [0.85, 0.23, 2.19],
  ],
  redDark,
);
const canopyProfiles = [
  [-1.08, 0.58, 0.8],
  [-0.72, 0.57, 1.04],
  [-0.3, 0.52, 1.21],
  [0.18, 0.51, 1.24],
  [0.52, 0.55, 1.15],
  [0.91, 0.6, 0.91],
  [1.12, 0.63, 0.68],
];
const cp = new T.CatmullRomCurve3(canopyProfiles.map((p) => new T.Vector3(p[1], p[2], p[0]))),
  canPos = [],
  canIdx = [];
const canRows = 40,
  canCols = 24;
for (let i = 0; i <= canRows; i++) {
  const p = cp.getPoint(i / canRows);
  for (let j = 0; j <= canCols; j++) {
    const t = (j / canCols - 0.5) * Math.PI;
    canPos.push(Math.sin(t) * p.x, 0.7 + (p.y - 0.7) * Math.pow(Math.cos(t), 0.5), p.z);
  }
}
for (let i = 0; i < canRows; i++)
  for (let j = 0; j < canCols; j++) {
    let a = i * (canCols + 1) + j,
      b = a + canCols + 1;
    canIdx.push(a, b, a + 1, a + 1, b, b + 1);
  }
const roofIdx = [],
  windowIdx = [];
for (let i = 0; i < canIdx.length; i += 3) {
  const ids = canIdx.slice(i, i + 3),
    zs = ids.map((k) => canPos[k * 3 + 2]),
    xs = ids.map((k) => Math.abs(canPos[k * 3]));
  (Math.min(...zs) > -0.4 && Math.max(...zs) < 0.42 && Math.max(...xs) < 0.49
    ? roofIdx
    : windowIdx
  ).push(...ids);
}
customMesh(canPos, windowIdx, glass);
customMesh(canPos, roofIdx, carbon);
// Gloss black roof and slender red flying buttresses.
const roof = new T.Mesh(new T.SphereGeometry(1, 32, 16), carbon);
roof.scale.set(0.51, 0.1, 0.48);
roof.position.set(0, 1.17, -0.04);
for (const sign of [-1, 1]) {
  const rearPillar = new T.Mesh(
    new T.TubeGeometry(
      new T.CatmullRomCurve3([
        new T.Vector3(sign * 0.55, 0.8, -1.06),
        new T.Vector3(sign * 0.47, 1.0, -0.65),
        new T.Vector3(sign * 0.44, 1.1, -0.22),
      ]),
      20,
      0.023,
      7,
      false,
    ),
    paint,
  );
  car.add(rearPillar);
  const frontPillar = new T.Mesh(
    new T.TubeGeometry(
      new T.CatmullRomCurve3([
        new T.Vector3(sign * 0.45, 1.08, 0.43),
        new T.Vector3(sign * 0.53, 0.93, 0.8),
        new T.Vector3(sign * 0.62, 0.72, 1.1),
      ]),
      20,
      0.021,
      7,
      false,
    ),
    paint,
  );
  car.add(frontPillar);
  panel(
    [
      [sign * 0.95, 0.35, -0.9],
      [sign * 0.95, 0.67, -0.85],
      [sign * 0.9, 0.65, -0.2],
      [sign * 0.905, 0.42, -0.05],
    ],
    carbon,
  );
  panel(
    [
      [sign * 0.94, 0.71, -0.79],
      [sign * 0.91, 0.69, -0.18],
      [sign * 0.89, 0.64, -0.07],
      [sign * 0.92, 0.64, -0.78],
    ],
    redDark,
  );
  const mirror = addBox(car, sign * 1.08, 0.82, 0.65, 0.19, 0.075, 0.29, paint);
  mirror.rotation.z = -sign * 0.08;
  addBox(car, sign * 0.98, 0.78, 0.64, 0.16, 0.035, 0.05, carbon);
}
const engineGlass = new T.Mesh(
  new T.PlaneGeometry(0.94, 0.88),
  new T.MeshPhysicalMaterial({
    color: '#27413b',
    transparent: true,
    opacity: 0.75,
    metalness: 0.3,
    roughness: 0.17,
    side: T.DoubleSide,
  }),
);
engineGlass.rotation.x = -Math.PI / 2;
engineGlass.position.set(0, 0.8, -1.45);
car.add(engineGlass);
addBox(car, 0, 0.7, -1.45, 0.6, 0.1, 0.68, redDark);
for (const z of [-1.78, -1.64, -1.5, -1.36, -1.22])
  addBox(car, 0, 0.82, z, 0.88, 0.018, 0.025, carbon);
addBox(car, 0, 0.16, 2.24, 1.67, 0.055, 0.3, carbon);
addBox(car, 0, 0.17, -2.18, 1.74, 0.08, 0.52, carbon);
const grilleTex = texture(128, (c, s) => {
  c.fillStyle = '#101315';
  c.fillRect(0, 0, s, s);
  c.strokeStyle = '#343c3d';
  c.lineWidth = 1;
  for (let y = 0; y < 140; y += 10)
    for (let x = 0; x < 140; x += 12) {
      c.beginPath();
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2;
        c.lineTo(x + (y % 20 ? 6 : 0) + Math.cos(a) * 6, y + Math.sin(a) * 5);
      }
      c.closePath();
      c.stroke();
    }
});
grilleTex.repeat.set(4, 1);
const grilleMat = new T.MeshStandardMaterial({ map: grilleTex, roughness: 0.6, metalness: 0.4 });
addBox(car, 0, 0.58, -2.373, 1.74, 0.28, 0.028, grilleMat);
addBox(car, 0, 0.39, -2.395, 0.33, 0.12, 0.018, carbon);
const nameTex = texture(256, (c, w) => {
  c.fillStyle = '#161d1e';
  c.fillRect(0, 0, w, w);
  c.fillStyle = '#e2e5e3';
  c.font = 'italic 39px serif';
  c.textAlign = 'center';
  c.fillText('LaFerrari', 128, 143);
});
const name = new T.Mesh(new T.PlaneGeometry(0.32, 0.12), new T.MeshBasicMaterial({ map: nameTex }));
name.rotation.y = Math.PI;
name.position.set(0, 0.395, -2.408);
car.add(name);
for (const x of [-0.71, -0.51, -0.25, 0, 0.25, 0.51, 0.71]) {
  const fin = addBox(car, x, 0.13, -2.15, 0.025, 0.23, 0.57, carbon);
  fin.rotation.x = -0.1;
}
const spoiler = new T.Group();
spoiler.position.set(0, 0.72, -2.23);
car.add(spoiler);
addBox(spoiler, 0, 0, 0, 1.73, 0.048, 0.2, paint);
addBox(spoiler, 0, -0.035, -0.075, 1.65, 0.025, 0.035, carbon);
for (const sign of [-1, 1]) {
  const ring = new T.Mesh(new T.TorusGeometry(0.085, 0.018, 10, 36), lampMat);
  ring.position.set(sign * 0.73, 0.684, -2.389);
  car.add(ring);
  const lens = new T.Mesh(new T.CircleGeometry(0.066, 32), material('#3b080b', 0.2, 0.2));
  lens.rotation.y = Math.PI;
  lens.position.set(sign * 0.73, 0.684, -2.39);
  car.add(lens);
  for (const x of [sign * 0.7, sign * 0.49]) {
    const tube = new T.Mesh(new T.CylinderGeometry(0.054, 0.054, 0.115, 20, true), chrome);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(x, 0.26, -2.397);
    car.add(tube);
    const dark = new T.Mesh(new T.CircleGeometry(0.044, 20), carbon);
    dark.rotation.y = Math.PI;
    dark.position.set(x, 0.26, -2.457);
    car.add(dark);
  }
  const ledMat = new T.MeshStandardMaterial({
    color: '#e2f1f0',
    emissive: '#a6cbd0',
    emissiveIntensity: 1.1,
    roughness: 0.14,
  });
  panel(
    [
      [sign * 0.77, 0.77, 1.59],
      [sign * 0.81, 0.7, 1.8],
      [sign * 0.66, 0.47, 2.15],
      [sign * 0.61, 0.45, 2.17],
      [sign * 0.74, 0.71, 1.78],
    ],
    ledMat,
  );
}
const discTex = texture(128, (c, s) => {
  c.fillStyle = '#71767b';
  c.fillRect(0, 0, s, s);
  for (let r = 26; r < 61; r += 8)
    for (let j = 0; j < 24; j++) {
      const a = (j / 24) * Math.PI * 2 + r * 0.1;
      c.fillStyle = '#252b2e';
      c.beginPath();
      c.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 1.7, 0, 7);
      c.fill();
    }
});
const gold = material('#e9bf37', 0.42, 0.3),
  brakeMat = material('#c32222', 0.5, 0.15);
for (const sign of [-1, 1])
  for (const z of [-1.47, 1.42]) {
    const g = new T.Group();
    g.position.set(sign * 0.96, 0.385, z);
    car.add(g);
    wheelGroups.push(g);
    if (z > 0) frontWheels.push(g);
    const spin = new T.Group();
    g.add(spin);
    rimGroups.push(spin);
    const tire = new T.Mesh(new T.CylinderGeometry(0.367, 0.367, 0.29, 40, 1), rubber);
    tire.rotation.z = Math.PI / 2;
    spin.add(tire);
    const shoulder = new T.Mesh(new T.TorusGeometry(0.303, 0.063, 10, 40), rubber);
    shoulder.rotation.y = Math.PI / 2;
    shoulder.position.x = sign * 0.13;
    spin.add(shoulder);
    const barrel = new T.Mesh(new T.CylinderGeometry(0.271, 0.271, 0.3, 32), carbon);
    barrel.rotation.z = Math.PI / 2;
    spin.add(barrel);
    const disc = new T.Mesh(
      new T.CircleGeometry(0.236, 40),
      new T.MeshStandardMaterial({
        map: discTex,
        metalness: 0.75,
        roughness: 0.45,
        side: T.DoubleSide,
      }),
    );
    disc.rotation.y = (sign * Math.PI) / 2;
    disc.position.x = sign * 0.15;
    spin.add(disc);
    const rim = new T.Mesh(new T.TorusGeometry(0.258, 0.014, 6, 40), chrome);
    rim.rotation.y = Math.PI / 2;
    rim.position.x = sign * 0.17;
    spin.add(rim);
    for (let j = 0; j < 5; j++) {
      const a = (j / 5) * Math.PI * 2,
        spoke = addBox(
          spin,
          sign * 0.179,
          Math.cos(a) * 0.139,
          Math.sin(a) * 0.139,
          0.027,
          0.22,
          0.032,
          chrome,
        );
      spoke.rotation.x = a;
      const spoke2 = addBox(
        spin,
        sign * 0.182,
        Math.cos(a + 0.13) * 0.141,
        Math.sin(a + 0.13) * 0.141,
        0.025,
        0.2,
        0.018,
        chrome,
      );
      spoke2.rotation.x = a + 0.13;
    }
    const hub = new T.Mesh(new T.CylinderGeometry(0.052, 0.052, 0.025, 24), gold);
    hub.rotation.z = Math.PI / 2;
    hub.position.x = sign * 0.19;
    spin.add(hub);
    const caliper = addBox(g, sign * 0.151, 0.13, -0.14, 0.058, 0.16, 0.07, brakeMat);
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }
const shadowTex = texture(128, (c, s) => {
  const g = c.createRadialGradient(s / 2, s / 2, 5, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(0,0,0,.65)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, s, s);
});
const contact = new T.Mesh(
  new T.PlaneGeometry(3.8, 6.4),
  new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.7 }),
);
contact.rotation.x = -Math.PI / 2;
contact.position.y = 0.065;
car.add(contact);
viewport.dataset.modelTriangles = String(
  car.children.reduce(
    (n, c) => n + (c.geometry?.index?.count || c.geometry?.attributes?.position?.count || 0) / 3,
    0,
  ) | 0,
);
