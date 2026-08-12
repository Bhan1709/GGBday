export function initHeroTitle() {
  const container = document.getElementById('hero-title-three');
  const canvas = document.getElementById('hero-title-canvas');
  if (!container || !canvas) return;

  if (typeof THREE === 'undefined') {
    container.classList.add('no-three');
    return;
  }

  const titleText = 'Happy Birthday,';
  const fontFamily = '"Great Vibes", "Parisienne", cursive';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 12;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);

  const group = new THREE.Group();
  scene.add(group);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: true });

  function onMove(e) {
    const px = e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
    const py = e.touches && e.touches.length ? e.touches[0].clientY : e.clientY;
    mouse.tx = (px / window.innerWidth) * 2 - 1;
    mouse.ty = -(py / window.innerHeight) * 2 + 1;
  }

  const textCanvas = document.createElement('canvas');
  const textCtx = textCanvas.getContext('2d');

  function drawTitle(wPx, hPx, dpr) {
    textCanvas.width = Math.max(1, Math.round(wPx * dpr));
    textCanvas.height = Math.max(1, Math.round(hPx * dpr));
    const ctx = textCtx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, wPx, hPx);
    let fontSize = hPx * 0.82;
    ctx.font = `${fontSize}px ${fontFamily}`;
    let tw = ctx.measureText(titleText).width;
    if (tw > wPx * 0.94) {
      fontSize *= (wPx * 0.94) / tw;
      ctx.font = `${fontSize}px ${fontFamily}`;
    }
    const grad = ctx.createLinearGradient(0, hPx * 0.2, 0, hPx * 0.85);
    grad.addColorStop(0, '#fff6d6');
    grad.addColorStop(0.42, '#ffc44d');
    grad.addColorStop(0.8, '#f497aa');
    grad.addColorStop(1, '#e2738c');
    ctx.shadowColor = 'rgba(255, 196, 77, 0.8)';
    ctx.shadowBlur = hPx * 0.09;
    ctx.fillStyle = grad;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleText, wPx / 2, hPx / 2);
  }

  function makeDotTexture() {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 244, 214, 1)');
    g.addColorStop(0.4, 'rgba(255, 196, 77, 0.9)');
    g.addColorStop(1, 'rgba(255, 196, 77, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  const sparkleTex = makeDotTexture();
  let sparkles = [];

  function buildSparkles(planeW, planeH) {
    for (const s of sparkles) group.remove(s.sprite);
    sparkles = [];
    const count = 40;
    for (let i = 0; i < count; i++) {
      const outer = i % 2 === 0;
      const rx = outer ? planeW * 0.56 : planeW * 0.16;
      const ry = outer ? planeH * 0.64 : planeH * 0.16;
      const mat = new THREE.SpriteMaterial({
        map: sparkleTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.9
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.z = (Math.random() - 0.5) * 2.2;
      const base = (outer ? planeW * 0.034 : planeW * 0.024) * (0.7 + Math.random() * 0.6);
      sprite.scale.setScalar(base);
      sparkles.push({
        sprite,
        rx,
        ry,
        angle: (i / count) * Math.PI * 2,
        speed: (Math.random() * 0.5 + 0.3) * (outer ? 1 : -1),
        phase: Math.random() * Math.PI * 2,
        base
      });
      group.add(sprite);
    }
  }

  let mesh = null;
  let titleTexture = null;
  let lastW = 0;
  let lastH = 0;
  let lastDpr = 1;

  function layout(wCss, hCss, dpr) {
    lastW = wCss;
    lastH = hCss;
    lastDpr = dpr;
    renderer.setPixelRatio(Math.min(dpr, 2));
    renderer.setSize(wCss, hCss, false);
    camera.aspect = wCss / hCss;
    camera.updateProjectionMatrix();

    drawTitle(wCss, hCss, dpr);

    const visibleH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const planeH = visibleH * 0.9;
    const planeW = planeH * camera.aspect;

    if (!titleTexture) titleTexture = new THREE.CanvasTexture(textCanvas);
    titleTexture.image = textCanvas;
    titleTexture.needsUpdate = true;

    if (mesh) {
      group.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    const geo = new THREE.PlaneGeometry(planeW, planeH);
    const mat = new THREE.MeshBasicMaterial({
      map: titleTexture,
      transparent: true,
      depthWrite: false
    });
    mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);

    buildSparkles(planeW, planeH);
  }

  function redraw() {
    const rect = container.getBoundingClientRect();
    const wCss = Math.max(rect.width, 60);
    const hCss = Math.max(rect.height, 40);
    layout(wCss, hCss, Math.min(window.devicePixelRatio || 1, 2));
  }

  if (document.fonts && document.fonts.load) {
    document.fonts.load(`64px ${fontFamily}`).then(() => {
      if (lastW > 0 && titleTexture) {
        drawTitle(lastW, lastH, lastDpr);
        titleTexture.needsUpdate = true;
      }
    }).catch(() => {});
  }

  redraw();
  window.addEventListener('resize', redraw);

  const clock = new THREE.Clock();
  let last = clock.getElapsedTime();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = Math.min(t - last, 0.05) || 0.016;
    last = t;

    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    group.rotation.x = mouse.y * 0.22;
    group.rotation.y = mouse.x * 0.4;
    group.rotation.z = Math.sin(t * 0.6) * 0.03;
    group.position.y = Math.sin(t * 1.4) * 0.14;
    const breathe = 1 + Math.sin(t * 2) * 0.018;
    group.scale.set(breathe, breathe, breathe);

    for (const s of sparkles) {
      s.angle += s.speed * dt;
      s.sprite.position.x = Math.cos(s.angle) * s.rx;
      s.sprite.position.y = Math.sin(s.angle) * s.ry;
      const tw = 0.55 + 0.45 * Math.sin(t * 3 + s.phase);
      s.sprite.scale.setScalar(s.base * (0.7 + 0.5 * tw));
      s.sprite.material.opacity = 0.45 + 0.55 * tw;
    }

    renderer.render(scene, camera);
  }

  animate();
}
