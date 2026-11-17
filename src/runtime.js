let resizeW = 0,
  resizeH = 0;
function resize() {
  const r = viewport.getBoundingClientRect();
  if (r.width === resizeW && r.height === resizeH) return;
  resizeW = r.width;
  resizeH = r.height;
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);
resize();
const viewButton = $('model-view');
viewButton.addEventListener('click', () => {
  showroom = !showroom;
  clearInputs();
  viewButton.textContent = showroom ? '返回驾驶' : '车辆展示';
  viewButton.setAttribute('aria-pressed', String(showroom));
  $('overlay').classList.toggle('show', state.paused && !showroom);
  viewport.style.cursor = showroom ? 'grab' : '';
  focusDrive();
  render();
});
viewport.addEventListener('pointerdown', (e) => {
  if (!showroom) return;
  orbitDrag = { id: e.pointerId, x: e.clientX };
  viewport.setPointerCapture(e.pointerId);
});
viewport.addEventListener('pointermove', (e) => {
  if (orbitDrag?.id !== e.pointerId) return;
  orbit += (e.clientX - orbitDrag.x) * 0.008;
  orbitDrag.x = e.clientX;
  render();
});
viewport.addEventListener('pointerup', () => (orbitDrag = null));
viewport.addEventListener('pointercancel', () => (orbitDrag = null));
function render() {
  car.position.set(state.x, 0.035, state.y);
  car.rotation.set(0, Math.PI / 2 - state.heading, 0);
  car.rotateZ(-state.steer * state.v * 0.0005);
  car.rotateX(active('brake') && state.v > 1 ? 0.012 : active('gas') ? -0.006 : 0);
  frontWheels.forEach((w) => (w.rotation.y = (-state.steer * 0.33) / (1 + state.v / 40)));
  rimGroups.forEach((w) => (w.rotation.x = wheelSpin));
  lampMat.color.set(active('brake') ? '#ff5257' : '#d52a34');
  spoiler.position.y = 0.72 + Math.max(0, Math.min(0.1, (state.v - 40) * 0.004));
  // Driving always uses an exterior camera directly behind and above the car.
  const a = showroom ? state.heading + orbit : state.heading,
    back = showroom ? (camera.aspect < 1 ? 8.8 : 5.8) : camera.aspect < 1 ? 11.5 : 10.2,
    height = showroom ? 2.35 : 4.6;
  const cx = Math.cos(a),
    cz = Math.sin(a);
  camera.position.set(state.x - cx * back, height, state.y - cz * back);
  camera.fov = showroom ? 43 : 48 + state.v * 0.025;
  camera.updateProjectionMatrix();
  camera.lookAt(
    state.x + (showroom ? 0 : Math.cos(state.heading) * 3.5),
    showroom ? 0.58 : 0.55,
    state.y + (showroom ? 0 : Math.sin(state.heading) * 3.5),
  );
  sun.position.set(state.x - 40, 65, state.y - 35);
  sun.target.position.set(state.x, 0, state.y);
  wave.offset.y = performance.now() * 0.000004;
  renderer.render(world, camera);
  $('speed').textContent = Math.round(state.v * 3.6);
  $('gear').textContent =
    state.v < 1 ? 'N' : String(Math.min(7, Math.max(1, Math.ceil((state.v * 3.6) / 45))));
  $('time').textContent =
    String(Math.floor(state.time / 60)).padStart(2, '0') +
    ':' +
    (state.time % 60).toFixed(1).padStart(4, '0');
  $('lap').textContent = String(state.lap).padStart(2, '0');
  $('map-car').setAttribute('cx', state.x / scale);
  $('map-car').setAttribute('cy', state.y / scale);
  const hint = $('hint');
  hint.classList.toggle('warning', !!state.off && !showroom);
  hint.style.display =
    showroom || state.off || state.v < 0.5 || performance.now() < toastUntil ? '' : 'none';
  hint.textContent = showroom
    ? '车辆展示 · 拖动画面旋转 · 点击「返回驾驶」继续'
    : state.off
      ? '已驶离赛道 · 减速调整，或按 R 重新发车'
      : performance.now() < toastUntil
        ? '完成一圈！'
        : '按 ↑ / W 踩下油门，开始驾驶';
  $('status').textContent = showroom
    ? 'LAFERRARI / 车辆展示'
    : state.paused
      ? 'PAUSED / 已暂停'
      : state.off
        ? 'OFF TRACK / 赛道外'
        : state.v < 0.5
          ? 'READY / 自由练习'
          : 'ON TRACK / 自由练习';
}
function frame(t) {
  const dt = last === null ? 0 : Math.min(0.04, (t - last) / 1000);
  last = t;
  if (!document.hidden) {
    if (!state.paused && !showroom) {
      physics(dt);
      wheelSpin += (state.v * dt) / 0.367;
      const error = Math.atan2(
        Math.sin(state.heading - cameraAngle),
        Math.cos(state.heading - cameraAngle),
      );
      cameraAngle += error * (1 - Math.exp(-dt * 5));
    }
    renderTime += dt;
    if (renderTime >= 1 / 40) {
      render();
      renderTime = 0;
    }
  }
  requestAnimationFrame(frame);
}
render();
requestAnimationFrame(frame);
