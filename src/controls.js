const $ = (id) => document.getElementById(id),
  NS = 'http://www.w3.org/2000/svg',
  path = $('track'),
  length = path.getTotalLength(),
  scale = 2.1;
const count = Math.ceil((length * scale) / 7),
  worldLength = length * scale,
  roadHalf = 10.5;
const points = Array.from({ length: count }, (_, i) => {
  let p = path.getPointAtLength((i / count) * length),
    a = path.getPointAtLength(Math.max(0, (i / count) * length - 0.4)),
    b = path.getPointAtLength(Math.min(length, (i / count) * length + 0.4)),
    ang = Math.atan2(b.y - a.y, b.x - a.x);
  return { x: p.x * scale, y: p.y * scale, nx: -Math.sin(ang), ny: Math.cos(ang), ang };
});
const keys = new Set(),
  touches = new Map(),
  state = {
    x: points[0].x,
    y: points[0].y,
    heading: 0,
    v: 0,
    steer: 0,
    paused: false,
    nearest: 0,
    lap: 1,
    time: 0,
  };
let last = null,
  renderTime = 0,
  previousSector = 0,
  checkpoint = 0,
  toastUntil = 0;
const keyboard = {
  ArrowUp: 'gas',
  KeyW: 'gas',
  ArrowDown: 'brake',
  KeyS: 'brake',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};
const driveArea = $('drive-area');
function keyboardFocus(ready) {
  $('keyboard-status').textContent = ready ? '键盘已就绪 · 按住 ↑ / W 加速' : '点击画面启用键盘';
  $('keyboard-status').classList.toggle('ready', ready);
  $('enable-keyboard').hidden = ready;
}
function focusDrive() {
  driveArea.focus({ preventScroll: true });
  keyboardFocus(document.hasFocus());
}
driveArea.addEventListener('pointerdown', () => focusDrive());
driveArea.addEventListener('focus', () => keyboardFocus(true));
document.addEventListener('focusin', (e) => keyboardFocus(driveArea.contains(e.target)));
$('enable-keyboard').addEventListener('click', () => {
  focusDrive();
  announce('键盘已启用，按住方向键或 WASD 驾驶');
});
function codeFor(e) {
  if (keyboard[e.code] || e.code === 'Space' || e.code === 'KeyR') return e.code;
  const key = String(e.key || '').toLowerCase();
  return (
    {
      arrowup: 'ArrowUp',
      up: 'ArrowUp',
      w: 'KeyW',
      arrowdown: 'ArrowDown',
      down: 'ArrowDown',
      s: 'KeyS',
      arrowleft: 'ArrowLeft',
      left: 'ArrowLeft',
      a: 'KeyA',
      arrowright: 'ArrowRight',
      right: 'ArrowRight',
      d: 'KeyD',
      r: 'KeyR',
      ' ': 'Space',
      spacebar: 'Space',
    }[key] ||
    {
      38: 'ArrowUp',
      87: 'KeyW',
      40: 'ArrowDown',
      83: 'KeyS',
      37: 'ArrowLeft',
      65: 'KeyA',
      39: 'ArrowRight',
      68: 'KeyD',
      82: 'KeyR',
      32: 'Space',
    }[e.keyCode] ||
    ''
  );
}
function active(input) {
  return (
    Array.from(keys).some((k) => keyboard[k] === input) ||
    Array.from(touches.values()).includes(input)
  );
}
function clearInputs() {
  keys.clear();
  touches.clear();
  document.querySelectorAll('.touch').forEach((b) => b.classList.remove('active'));
}
function announce(t) {
  $('announcement').textContent = t;
}
function reset() {
  Object.assign(state, {
    x: points[0].x,
    y: points[0].y,
    heading: points[0].ang,
    v: 0,
    steer: 0,
    nearest: 0,
    lap: 1,
    time: 0,
    off: false,
  });
  checkpoint = 0;
  previousSector = 0;
  toastUntil = 0;
  clearInputs();
  last = null;
  cameraAngle = state.heading;
  render();
  announce('已返回发车位置');
}
function pause() {
  state.paused = !state.paused;
  clearInputs();
  last = null;
  $('pause').textContent = state.paused ? '继续驾驶' : '暂停';
  $('overlay').classList.toggle('show', state.paused && !showroom);
  render();
  announce(state.paused ? '驾驶已暂停' : '驾驶继续');
}
window.addEventListener(
  'keydown',
  (e) => {
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.target?.closest?.('input,textarea,[contenteditable="true"]')
    )
      return;
    const code = codeFor(e);
    if (!code) return;
    const nativeButtonSpace =
      code === 'Space' && e.target?.closest?.('button') && !driveArea.contains(e.target);
    if (nativeButtonSpace) return;
    e.preventDefault();
    e.stopPropagation();
    if (keyboard[code]) {
      keys.add(code);
      keyboardFocus(true);
    }
    if (!e.repeat && code === 'Space') pause();
    if (!e.repeat && code === 'KeyR') reset();
  },
  true,
);
window.addEventListener(
  'keyup',
  (e) => {
    const code = codeFor(e);
    keys.delete(code);
    if (keyboard[code]) {
      e.preventDefault();
      e.stopPropagation();
    }
  },
  true,
);
window.addEventListener('blur', () => {
  clearInputs();
  last = null;
  keyboardFocus(false);
});
window.addEventListener('focus', () => keyboardFocus(driveArea.contains(document.activeElement)));
document.addEventListener('visibilitychange', () => {
  clearInputs();
  last = null;
  if (document.hidden) keyboardFocus(false);
});
document.querySelectorAll('[data-input]').forEach((b) => {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    touches.set(e.pointerId, b.dataset.input);
    b.classList.add('active');
  });
  const release = (e) => {
    touches.delete(e.pointerId);
    b.classList.remove('active');
  };
  b.addEventListener('pointerup', release);
  b.addEventListener('pointercancel', release);
  b.addEventListener('lostpointercapture', release);
});
$('pause').addEventListener('click', () => {
  pause();
  focusDrive();
});
$('reset').addEventListener('click', () => {
  reset();
  focusDrive();
});
function nearest() {
  let best = Infinity,
    index = 0,
    fraction = 0;
  for (let i = 0; i < count; i++) {
    const a = points[i],
      b = points[(i + 1) % count],
      dx = b.x - a.x,
      dy = b.y - a.y,
      t = Math.max(
        0,
        Math.min(1, ((state.x - a.x) * dx + (state.y - a.y) * dy) / (dx * dx + dy * dy)),
      ),
      x = a.x + dx * t,
      y = a.y + dy * t,
      d = (state.x - x) ** 2 + (state.y - y) ** 2;
    if (d < best) {
      best = d;
      index = i;
      fraction = t;
    }
  }
  state.nearest = index;
  return { distance: Math.sqrt(best), progress: (index + fraction) / count };
}
function physics(dt) {
  const n = nearest(),
    off = n.distance > roadHalf,
    gas = active('gas'),
    brake = active('brake'),
    turn = Number(active('right')) - Number(active('left'));
  state.steer += (turn - state.steer) * (1 - Math.exp(-dt * 8));
  const drag = 1.7 + state.v * state.v * 0.0015 + (off ? state.v * 0.75 : 0);
  state.v = Math.max(0, Math.min(87, state.v + ((gas ? 22 : 0) - (brake ? 44 : 0) - drag) * dt));
  state.heading += (state.v / 3.2) * Math.tan((state.steer * 0.25) / (1 + state.v / 19)) * dt;
  state.x += Math.cos(state.heading) * state.v * dt;
  state.y += Math.sin(state.heading) * state.v * dt;
  if (state.v > 0.2) state.time += dt;
  const sector = Math.floor(n.progress * 4);
  if (sector === checkpoint + 1) checkpoint = sector;
  if (previousSector === 3 && sector === 0 && checkpoint === 3) {
    state.lap++;
    state.time = 0;
    checkpoint = 0;
    toastUntil = performance.now() + 3000;
    announce('完成一圈，进入第 ' + state.lap + ' 圈');
  }
  previousSector = sector;
  state.off = off;
}
// Procedural geometry and materials: no external textures or model downloads at runtime.
