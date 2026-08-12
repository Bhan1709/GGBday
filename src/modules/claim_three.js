// Three.js animated backdrop for the "Redeem a Gift" form modal.
// Drifts floating gold coins, pink hearts and twinkling sparkles up the panel.
// The render loop only runs while the modal is open (saves battery otherwise).
export function initClaimScene(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof THREE === 'undefined') return null;

  const parent = canvas.parentElement;
  let width = parent.clientWidth || 520;
  let height = parent.clientHeight || 600;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.z = 16;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene.add(new THREE.AmbientLight(0xffffff, 1));

  // ─── FLOATING DECOR ───────────────────────────────────────────────────────
  const items = [];
  const palette = ['#ffd97a', '#f5a623', '#ffc44d', '#fff3d6'];

  function heartShape(size) {
    const s = new THREE.Shape();
    s.moveTo(0, size * 0.25);
    s.bezierCurveTo(0, size * 0.25, -size * 0.1, 0, -size * 0.5, 0);
    s.bezierCurveTo(-size, 0, -size, size * 0.65, -size, size * 0.65);
    s.bezierCurveTo(-size, size * 1.05, -size * 0.65, size * 1.3, 0, size * 1.5);
    s.bezierCurveTo(size * 0.65, size * 1.3, size, size * 1.05, size, size * 0.65);
    s.bezierCurveTo(size, size * 0.65, size, 0, size * 0.5, 0);
    s.bezierCurveTo(size * 0.1, 0, 0, size * 0.25, 0, size * 0.25);
    return s;
  }
  const heartGeo = new THREE.ShapeGeometry(heartShape(0.5));

  const coinGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.1, 24);
  const sparkGeo = new THREE.SphereGeometry(0.06, 6, 6);

  const COUNT = 26;
  for (let i = 0; i < COUNT; i++) {
    const roll = Math.random();
    let mesh, mat;

    if (roll < 0.4) {
      mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette[Math.floor(Math.random() * palette.length)]),
        roughness: 0.35,
        metalness: 0.55
      });
      mesh = new THREE.Mesh(coinGeo, mat);
    } else if (roll < 0.7) {
      mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#f497aa'),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      mesh = new THREE.Mesh(heartGeo, mat);
    } else {
      mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(roll < 0.85 ? '#ffd700' : '#ff6ba8'),
        transparent: true,
        opacity: 0.9
      });
      mesh = new THREE.Mesh(sparkGeo, mat);
    }

    const sc = 0.7 + Math.random() * 1.1;
    mesh.scale.set(sc, sc, sc);
    mesh.position.set(
      (Math.random() - 0.5) * (width / 9),
      (Math.random() - 0.5) * (height / 9),
      (Math.random() - 0.5) * 3
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

    scene.add(mesh);
    items.push({
      mesh,
      mat,
      kind: roll < 0.4 ? 'coin' : (roll < 0.7 ? 'heart' : 'spark'),
      speed: 0.008 + Math.random() * 0.02,
      drift: (Math.random() - 0.5) * 0.01,
      spin: (Math.random() - 0.5) * 0.02,
      phase: Math.random() * Math.PI * 2,
      baseOpacity: mat.opacity !== undefined ? mat.opacity : 1
    });
  }

  // ─── BURST ON OPEN ────────────────────────────────────────────────────────
  const bursts = [];

  function spawnBurst() {
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(['#ffd700', '#fff3d6', '#ff6ba8'][i % 3]),
        transparent: true
      });
      const p = new THREE.Mesh(sparkGeo, mat);
      p.position.set(0, 0, 0.5);
      const a = Math.random() * Math.PI * 2;
      const r = 1.6 + Math.random() * 2.4;
      p.userData.vel = new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.7, (Math.random() - 0.5));
      p.userData.life = 1;
      scene.add(p);
      bursts.push(p);
    }
  }

  // ─── RENDER LOOP (only while active) ──────────────────────────────────────
  let running = false;
  let rafId = null;
  const clock = new THREE.Clock();

  function tick() {
    if (!running) return;
    rafId = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();

    items.forEach(it => {
      it.mesh.position.y += it.speed;
      it.mesh.position.x += it.drift + Math.sin(t * 0.6 + it.phase) * 0.004;
      it.mesh.rotation.y += it.spin;

      const limitY = height / 9;
      if (it.mesh.position.y > limitY) {
        it.mesh.position.y = -limitY;
        it.mesh.position.x = (Math.random() - 0.5) * (width / 9);
      }

      if (it.kind === 'spark') {
        it.mat.opacity = it.baseOpacity * (0.5 + Math.sin(t * 3 + it.phase) * 0.5);
      }
    });

    for (let i = bursts.length - 1; i >= 0; i--) {
      const p = bursts[i];
      p.userData.life -= 0.016 * 1.3;
      if (p.userData.life <= 0) {
        scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        bursts.splice(i, 1);
        continue;
      }
      p.position.add(p.userData.vel);
      p.userData.vel.multiplyScalar(0.97);
      p.material.opacity = Math.max(0, p.userData.life);
    }

    renderer.render(scene, camera);
  }

  // ─── ACTIVATION ───────────────────────────────────────────────────────────
  function setActive(active) {
    if (active && !running) {
      running = true;
      spawnBurst();
      tick();
    } else if (!active && running) {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ─── RESIZE ───────────────────────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    width = parent.clientWidth || 520;
    height = parent.clientHeight || 600;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
  ro.observe(parent);

  return {
    setActive,
    dispose() {
      setActive(false);
      ro.disconnect();
      renderer.dispose();
      items.forEach(it => {
        scene.remove(it.mesh);
        if (it.mesh.geometry) it.mesh.geometry.dispose();
        if (it.mat) it.mat.dispose();
      });
    }
  };
}
