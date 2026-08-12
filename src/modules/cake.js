import { triggerCelebrationConfetti } from './confetti.js';

// ─── Three.js Realistic Birthday Cake ──────────────────────────────────────
// Fully procedural: buttercream textures, piped trims, drips, berries,
// striped candles with additive flames + drag-to-orbit camera.
export async function initCake() {
  const container = document.getElementById('cake-three-container');
  const blowBtn   = document.getElementById('blow-candles-btn');
  const wishReveal = document.getElementById('wish-reveal-box');

  function showError(msg) {
    if (container) {
      container.innerHTML = `<div style="padding:2rem;color:#ff6b6b;text-align:center;font-family:var(--font-sans);">
        <h3>🎂 Cake failed to load</h3>
        <pre style="font-size:0.85rem;text-align:left;background:rgba(0,0,0,0.3);padding:1rem;border-radius:8px;overflow:auto;">${msg}</pre>
      </div>`;
    }
    console.error('[Cake]', msg);
  }

  if (!container || typeof THREE === 'undefined') {
    // Graceful fallback: just wire button if Three not available
    if (blowBtn && wishReveal) {
      blowBtn.addEventListener('click', () => {
        wishReveal.classList.add('active');
        blowBtn.textContent = '🎂 Your Wish Is Sealed With Love! ✨';
        blowBtn.disabled = true;
      });
    }
    if (!container) showError('Container #cake-three-container not found');
    if (typeof THREE === 'undefined') showError('THREE is undefined - Three.js failed to load');
    return;
  }

try {
  // Wait for THREE to be available (CDN timing)
  let retries = 50;
  while (retries > 0 && typeof THREE === 'undefined') {
    await new Promise(r => setTimeout(r, 20));
    retries--;
  }
  if (typeof THREE === 'undefined') {
    showError('THREE.js failed to load from CDN after 1s. Check network/CDN.');
    return;
  }

  // Ensure container has a usable size (wait for CSS layout first).
  // If the stylesheet hasn't applied for whatever reason (stale/missing
  // CSS), force explicit inline dimensions so the cake always renders.
  let layoutRetries = 30;
  while (layoutRetries > 0) {
    if (container.clientWidth > 0 && container.clientHeight > 0) break;
    await new Promise(r => setTimeout(r, 30));
    layoutRetries--;
  }
  let cw = container.clientWidth;
  let ch = container.clientHeight;
  if (cw === 0 || ch === 0) {
    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    container.style.display = 'block';
    container.style.width = '100%';
    container.style.maxWidth = '560px';
    container.style.height = isMobile ? '340px' : '460px';
    cw = container.clientWidth;
    ch = container.clientHeight;
  }
  if (cw === 0 || ch === 0) {
    const cs = getComputedStyle(container);
    showError(
      `Container still has zero dimensions (${cw}x${ch}). ` +
      `display=${cs.display} width=${cs.width} height=${cs.height} ` +
      `parentHeight=${container.parentElement ? container.parentElement.clientHeight : '?'}`
    );
    return;
  }

  // Diagnostic: test WebGL context
  const testCanvas = document.createElement('canvas');
  const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
  if (!gl) {
    showError('WebGL not supported in this browser');
    return;
  }

  // ── Renderer ─────────────────────────────────────────────────────────────
  const W = container.clientWidth  || 500;
  const H = container.clientHeight || 480;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.style.cursor = 'grab';
  container.appendChild(renderer.domElement);

  // ── Scene & Camera ───────────────────────────────────────────────────────
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);

  // ── Procedural Textures (no downloads needed) ───────────────────────────
  function makeTexture(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 8;
    return t;
  }

  // Buttercream: warm ivory with fine crumb speckle + soft sheen bands
  const buttercreamTex = makeTexture(256, 256, (g) => {
    g.fillStyle = '#fff6ec';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2400; i++) {
      const v = Math.random();
      g.fillStyle = v < 0.5
        ? `rgba(204, 178, 160, ${0.04 + Math.random() * 0.06})`
        : `rgba(255, 255, 255, ${0.06 + Math.random() * 0.1})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4);
    }
    for (let b = 0; b < 5; b++) {
      const y = 18 + b * 52 + Math.random() * 12;
      const gr = g.createLinearGradient(0, y - 16, 0, y + 16);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.5, `rgba(255,240,226,${0.06 + Math.random() * 0.05})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, y - 16, 256, 32);
    }
  });

  // Strawberry: red gradient + pale seeds + gloss highlight
  const strawberryTex = makeTexture(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 44, 4, 64, 70, 78);
    gr.addColorStop(0, '#ff6d6d');
    gr.addColorStop(0.55, '#e33d50');
    gr.addColorStop(1, '#a8162c');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 42; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 48 + 8;
      const x = 64 + Math.cos(a) * r;
      const y = 64 + Math.sin(a) * r;
      if (x < 10 || x > 118 || y < 10 || y > 118) continue;
      g.fillStyle = 'rgba(255, 226, 140, 0.9)';
      g.beginPath();
      g.ellipse(x, y, 1.5, 2.4, Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.3)';
    g.beginPath();
    g.ellipse(50, 36, 15, 10, -0.35, 0, Math.PI * 2);
    g.fill();
  });

  // Soft radial glow sprite for flames & sparkles
  const glowTex = makeTexture(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.22, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
  });

  // Diagonal stripes for candles
  function makeStripeTexture(hexA, hexB) {
    return makeTexture(128, 256, (g) => {
      const a = '#' + hexA.toString(16).padStart(6, '0');
      const b = '#' + hexB.toString(16).padStart(6, '0');
      g.fillStyle = a;
      g.fillRect(0, 0, 128, 256);
      g.fillStyle = b;
      const w = 24;
      for (let x = -256; x < 512; x += w * 2) {
        g.beginPath();
        g.moveTo(x, 256);
        g.lineTo(x + w, 256);
        g.lineTo(x + w + 150, 0);
        g.lineTo(x + 150, 0);
        g.closePath();
        g.fill();
      }
    });
  }

  // ── Material helper ──────────────────────────────────────────────────────
  function std(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.6,
      metalness: opts.metalness ?? 0,
      ...(opts.map ? { map: opts.map } : {}),
      ...(opts.emissive ? { emissive: opts.emissive, emissiveIntensity: opts.emissiveIntensity ?? 1 } : {}),
      ...(opts.side ? { side: opts.side } : {})
    });
  }

  // ── Lighting rig ─────────────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight(0xfff3e0, 0xffd9e6, 0.85));

  const key = new THREE.DirectionalLight(0xfff3e2, 1.5);
  key.position.set(5, 10, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.0006;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x9fd4ff, 0.55);
  rim.position.set(-6, 7, -9);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffc9d8, 0.4);
  fill.position.set(0, 1.5, 8);
  scene.add(fill);

  // ── Shared decorative materials / helpers ───────────────────────────────
  const GOLD = std(0xd8b36a, { roughness: 0.32, metalness: 0.85 });
  const WHITE_PIPE = std(0xffffff, { roughness: 0.5 });

  function goldRing(radius, y, tube = 0.045) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 96), GOLD);
    m.rotation.x = Math.PI / 2;
    m.position.y = y;
    m.castShadow = true;
    scene.add(m);
    return m;
  }

  function pipedRing(radius, y, count, size, mat = WHITE_PIPE, ySpread = 0.05) {
    const geo = new THREE.IcosahedronGeometry(size, 1);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const m = new THREE.Mesh(geo, mat);
      m.position.set(
        Math.cos(a) * radius,
        y + Math.sin(a * count * 0.5) * ySpread,
        Math.sin(a) * radius
      );
      m.scale.set(1, 0.8, 1);
      m.castShadow = true;
      scene.add(m);
    }
  }

  // ── Plate (ceramic with gold rim) ────────────────────────────────────────
  const plateMat = std(0xfffdf7, { roughness: 0.35, metalness: 0.02 });
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 3.85, 0.24, 72), plateMat);
  plate.position.y = -0.12;
  plate.receiveShadow = true;
  plate.castShadow = true;
  scene.add(plate);

  goldRing(3.62, 0.015, 0.04);

  // ── Cake tiers ───────────────────────────────────────────────────────────
  function buildTier(radius, height, y0, map) {
    const geo = new THREE.CylinderGeometry(radius, radius * 1.02, height, 72, 2);
    const pos = geo.attributes.position;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      const n = (Math.random() - 0.5) * 0.025;
      v3.x *= 1 + n;
      v3.z *= 1 + n;
      pos.setXYZ(i, v3.x, v3.y, v3.z);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, std(0xffffff, { map, roughness: 0.62 }));
    m.position.y = y0 + height / 2;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }

  buildTier(2.75, 1.45, 0, buttercreamTex);   // bottom tier, spans y 0 → 1.45
  buildTier(1.7, 1.15, 1.45, buttercreamTex); // top tier,    spans y 1.45 → 2.6

  // Decorative trims
  pipedRing(2.82, 0.14, 40, 0.075);      // piped base ruffle on bottom tier
  goldRing(2.8, 1.43, 0.05);             // gold band at the tier seam

  // ── Top cap: flat disc + piped border + dripping frosting ───────────────
  const CAP_Y = 2.6;
  const DISC_TOP = CAP_Y + 0.16;

  const capDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.66, 1.7, 0.16, 72),
    std(0xffffff, { map: buttercreamTex, roughness: 0.6 })
  );
  capDisc.position.y = CAP_Y + 0.08;
  capDisc.receiveShadow = true;
  capDisc.castShadow = true;
  scene.add(capDisc);

  pipedRing(1.6, DISC_TOP, 34, 0.07); // scalloped piped border around cap edge

  // Drip skirt: open cylinder hugging the tier top, bottom edge droops
  const DRIP_LEN = 0.42;
  const D = 14;
  const SKIRT_H = 0.18;
  const skirt = new THREE.CylinderGeometry(1.72, 1.72, SKIRT_H, 96, 5, true);
  skirt.translate(0, -SKIRT_H / 2, 0); // top ring at y=0, bottom at -SKIRT_H
  const sp = skirt.attributes.position;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < sp.count; i++) {
    v3.fromBufferAttribute(sp, i);
    const ang = Math.atan2(v3.z, v3.x);
    const dip = Math.pow(Math.max(0, Math.cos(ang * D)), 1.7);
    const t = (v3.y + SKIRT_H) / SKIRT_H; // 0 at bottom → 1 at top
    v3.y -= dip * DRIP_LEN * 0.95 * (1 - t);
    const bul = 1 + dip * 0.025;
    v3.x *= bul;
    v3.z *= bul;
    sp.setXYZ(i, v3.x, v3.y, v3.z);
  }
  skirt.computeVertexNormals();
  const skirtMesh = new THREE.Mesh(
    skirt,
    std(0xffffff, { map: buttercreamTex, roughness: 0.6, side: THREE.DoubleSide })
  );
  skirtMesh.position.y = CAP_Y - 0.02;
  skirtMesh.castShadow = true;
  scene.add(skirtMesh);

  // Rounded drip tips at each droop
  const tipMat = std(0xffffff, { map: buttercreamTex, roughness: 0.6 });
  for (let i = 0; i < D; i++) {
    const a = (i / D) * Math.PI * 2;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), tipMat);
    tip.position.set(Math.cos(a) * 1.72, CAP_Y - 0.6, Math.sin(a) * 1.72);
    tip.scale.set(1, 1.3, 1);
    scene.add(tip);
  }

  // Piped rosette in the centre
  function pipedRose(x, y, z, scale, color = 0xffffff) {
    const group = new THREE.Group();
    const mat = std(color, { roughness: 0.5 });
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const r = (0.9 - i * 0.14) * scale;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.075 * scale, 10, 28), mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.03 + i * 0.039 * scale;
      ring.castShadow = true;
      group.add(ring);
    }
    const nub = new THREE.Mesh(new THREE.SphereGeometry(0.085 * scale, 16, 12), mat);
    nub.position.y = 0.03 + steps * 0.039 * scale;
    group.add(nub);
    group.position.set(x, y, z);
    scene.add(group);
    return group;
  }
  pipedRose(0, DISC_TOP, 0, 0.65, 0xffe8ef);

  // ── Toppings ─────────────────────────────────────────────────────────────
  function makeStrawberry(size) {
    const g = new THREE.Group();
    const mat = std(0xffffff, { map: strawberryTex, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.ConeGeometry(size, size * 1.6, 24, 6), mat);
    const butt = new THREE.Mesh(
      new THREE.SphereGeometry(size * 0.97, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      mat
    );
    butt.position.y = -size * 0.58;
    g.add(body, butt);
    const calyx = new THREE.Mesh(
      new THREE.ConeGeometry(size * 0.62, size * 0.14, 6),
      std(0x5d8a3c, { roughness: 0.8 })
    );
    calyx.position.y = size * 0.82;
    calyx.rotation.y = Math.PI / 6;
    g.add(calyx);
    g.scale.setScalar(0.85 + Math.random() * 0.35);
    g.rotation.y = Math.random() * Math.PI * 2;
    return g;
  }

  function makeBlueberry(size) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(size, 22, 16),
      std(0x3a4a78, { roughness: 0.3, metalness: 0.06 })
    );
    body.scale.y = 1.08;
    g.add(body);
    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(size * 0.24, size * 0.055, 8, 12),
      std(0x28324f)
    );
    crown.rotation.x = Math.PI / 2;
    crown.position.y = size * 0.93;
    g.add(crown);
    return g;
  }

  function makeMacaron(color, scale) {
    const g = new THREE.Group();
    const mat = std(color, { roughness: 0.4 });
    const top = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      mat
    );
    top.scale.set(1, 0.42, 1);
    top.position.y = 0.2;
    top.castShadow = true;
    const bot = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 24, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      mat
    );
    bot.scale.set(1, 0.42, 1);
    bot.position.y = -0.2;
    bot.castShadow = true;
    g.add(top, bot);
    const fillMat = std(0xfff3d6, { roughness: 0.75 });
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.09, 24), fillMat));
    const foot = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.045, 8, 28), mat);
    foot.rotation.x = Math.PI / 2;
    g.add(foot);
    g.scale.setScalar(scale);
    g.rotation.y = Math.random() * Math.PI * 2;
    return g;
  }

  function makeMintLeaf() {
    const s = new THREE.Shape();
    s.moveTo(0, -0.3);
    s.quadraticCurveTo(0.26, 0, 0, 0.3);
    s.quadraticCurveTo(-0.26, 0, 0, -0.3);
    const m = new THREE.Mesh(
      new THREE.ShapeGeometry(s),
      std(0x79ab54, { roughness: 0.7, side: THREE.DoubleSide })
    );
    m.rotation.x = -Math.PI / 2;
    m.scale.setScalar(0.6 + Math.random() * 0.4);
    return m;
  }

  const macaronColors = [0xffb3c6, 0xb8e0a8, 0xc9b3ff, 0xffe9a8];
  const toppingCount = 12;
  for (let i = 0; i < toppingCount; i++) {
    const a = (i / toppingCount) * Math.PI * 2 + Math.random() * 0.3;
    const r = 0.5 + Math.random() * 0.25;
    let g;
    if (i % 4 === 0) g = makeBlueberry(0.18 + Math.random() * 0.04);
    else if (i % 4 === 1) g = makeMacaron(macaronColors[i % macaronColors.length], 0.85);
    else g = makeStrawberry(0.42);
    g.position.set(Math.cos(a) * r, DISC_TOP, Math.sin(a) * r);
    g.rotation.x = -0.12 + Math.random() * 0.12;
    scene.add(g);
  }

  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.5 + Math.random() * 0.45;
    const lf = makeMintLeaf();
    lf.position.set(Math.cos(a) * r, DISC_TOP + 0.02, Math.sin(a) * r);
    lf.rotation.z = Math.random() * Math.PI;
    scene.add(lf);
  }

  const sprinkleColors = [0xff5d8f, 0xffc44d, 0x6fc2ef, 0x9be59b, 0xd4a5ff, 0xfff1a8];
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.7 + Math.random() * 0.3;
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.16, 6),
      std(sprinkleColors[i % sprinkleColors.length], { roughness: 0.5 })
    );
    m.position.set(Math.cos(a) * r, DISC_TOP + 0.085, Math.sin(a) * r);
    m.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI, (Math.random() - 0.5) * 0.5);
    m.castShadow = true;
    scene.add(m);
  }

  // ── Heart relief on bottom tier ──────────────────────────────────────────
  function makeHeartShape(s) {
    const sh = new THREE.Shape();
    sh.moveTo(0, s * 0.25);
    sh.bezierCurveTo(0, s * 0.25, -s * 0.1, 0, -s * 0.5, 0);
    sh.bezierCurveTo(-s, 0, -s, s * 0.65, -s, s * 0.65);
    sh.bezierCurveTo(-s, s * 1.05, -s * 0.65, s * 1.3, 0, s * 1.5);
    sh.bezierCurveTo(s * 0.65, s * 1.3, s, s * 1.05, s, s * 0.65);
    sh.bezierCurveTo(s, s * 0.65, s, 0, s * 0.5, 0);
    sh.bezierCurveTo(s * 0.1, 0, 0, s * 0.25, 0, s * 0.25);
    return sh;
  }

  const heartMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(makeHeartShape(0.22), {
      depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02
    }),
    std(0xff3d5e, { roughness: 0.35, metalness: 0.1, emissive: 0xff1144, emissiveIntensity: 0.25 })
  );
  heartMesh.rotation.z = Math.PI;
  heartMesh.position.set(-0.35, 0.85, 2.78);
  heartMesh.castShadow = true;
  scene.add(heartMesh);

  // ── Candles, flames & smoke ──────────────────────────────────────────────
  const CANDLE_COUNT = 4;
  const candleColors = [
    [0xff8fa8, 0xffffff],
    [0x9ecbff, 0xffffff],
    [0xc9a6ff, 0xffffff],
    [0xa5e8c4, 0xffffff]
  ];
  const candlePositions = [0.785, 2.356, 3.927, 5.498]
    .map(a => [Math.cos(a) * 1.22, Math.sin(a) * 1.22]);

  const candles = [];
  const flames = [];
  const smokes = [];
  const flameLights = [];
  const flameData = [];

  candlePositions.forEach(([cx, cz], i) => {
    // Striped body (slightly tapered)
    const stripeTex = makeStripeTexture(candleColors[i][0], candleColors[i][1]);
    stripeTex.repeat.set(2, 1);
    stripeTex.wrapS = THREE.RepeatWrapping;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.105, 0.9, 20),
      std(0xffffff, { map: stripeTex, roughness: 0.45 })
    );
    body.position.set(cx, 3.21, cz);
    body.castShadow = true;
    scene.add(body);
    candles.push(body);

    // Wick
    const wick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.011, 0.14, 6),
      std(0x1a1a1a, { roughness: 0.9 })
    );
    wick.position.set(cx, 3.73, cz);
    scene.add(wick);

    // Flame group: layered additive cones + glow sprite
    const fg = new THREE.Group();
    fg.position.set(cx, 3.82, cz);
    const mats = [];
    const mk = (color, opacity, size, yOff) => {
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(size, size * 2.6, 14),
        new THREE.MeshBasicMaterial({
          color, transparent: true, opacity,
          blending: THREE.AdditiveBlending, depthWrite: false
        })
      );
      m.position.y = yOff;
      m._o0 = opacity;
      mats.push(m);
      return m;
    };
    fg.add(mk(0xff4d00, 0.5, 0.13, 0.06));   // outer
    fg.add(mk(0xff9a1f, 0.8, 0.095, 0.09));  // mid
    fg.add(mk(0xfff2b8, 1.0, 0.05, 0.1));    // core
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffb054, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    glow._o0 = 0.75;
    glow.scale.set(0.85, 1.05, 1);
    fg.add(glow);
    mats.push(glow);
    fg.userData.mats = mats;
    scene.add(fg);
    flames.push(fg);

    flameData.push({ phase: Math.random() * Math.PI * 2, alive: true, blownAt: null });

    const fl = new THREE.PointLight(0xffa42e, 1.0, 6);
    fl.position.set(cx, 3.9, cz);
    scene.add(fl);
    flameLights.push(fl);

    // Smoke puffs (invisible until candle is blown)
    const puffs = [];
    for (let s = 0; s < 7; s++) {
      const sm = new THREE.Mesh(
        new THREE.SphereGeometry(0.05 + s * 0.02, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xbfbfbf, transparent: true, opacity: 0 })
      );
      sm.position.set(cx + (Math.random() - 0.5) * 0.08, 3.86 + s * 0.2, cz);
      sm._vy = 0.012 + Math.random() * 0.008;
      sm._vx = (Math.random() - 0.5) * 0.006;
      sm._age = 0;
      sm._active = false;
      scene.add(sm);
      puffs.push(sm);
    }
    smokes.push(puffs);
  });

  // ── Floating golden sparkles ─────────────────────────────────────────────
  const SPARK_COUNT = 70;
  const sparkPos = new Float32Array(SPARK_COUNT * 3);
  const sparkData = [];
  for (let i = 0; i < SPARK_COUNT; i++) {
    sparkPos[i * 3]     = (Math.random() - 0.5) * 8;
    sparkPos[i * 3 + 1] = Math.random() * 7;
    sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    sparkData.push({ vy: Math.random() * 0.02 + 0.006, phase: Math.random() * Math.PI * 2 });
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({
    map: glowTex, color: 0xffd98a, size: 0.34, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const sparkles = new THREE.Points(sparkGeo, sparkMat);
  scene.add(sparkles);

  // ── State & blow-out ─────────────────────────────────────────────────────
  let blownCount = 0;
  let celebrationDone = false;

  function blowCandle(i) {
    if (!flameData[i].alive) return;
    flameData[i].alive = false;
    flameData[i].blownAt = performance.now();
    blownCount++;
    flameLights[i].intensity = 0;
    smokes[i].forEach(sm => { sm._active = true; sm._age = 0; });
    candles[i].scale.y = 0.93;

    if (blownCount === CANDLE_COUNT && !celebrationDone) {
      celebrationDone = true;
      setTimeout(() => {
        triggerCelebrationConfetti();
        wishReveal?.classList.add('active');
        if (blowBtn) {
          blowBtn.textContent = '🎂 Your Wish Is Sealed With Love! ✨';
          blowBtn.disabled = true;
          blowBtn.style.opacity = '0.7';
        }
      }, 800);
    }
  }

  if (blowBtn) {
    blowBtn.addEventListener('click', () => {
      flameData.forEach((_, i) => setTimeout(() => blowCandle(i), i * 220));
    });
  }

  // ── Pointer orbit + click-to-blow ────────────────────────────────────────
  const target = new THREE.Vector3(0, 2.1, 0);
  let azimuth = 0.6;
  let targetAz = 0.6;
  let polar = 1.28;
  let targetPolar = 1.28;
  const camDist = 11.6;
  let dragging = false;
  let didDrag = false;
  let lastX = 0;
  let lastY = 0;

  renderer.domElement.addEventListener('pointerdown', (e) => {
    dragging = true;
    didDrag = false;
    lastX = e.clientX;
    lastY = e.clientY;
    renderer.domElement.style.cursor = 'grabbing';
  });

  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) didDrag = true;
    lastX = e.clientX;
    lastY = e.clientY;
    targetAz -= dx * 0.006;
    targetPolar = Math.max(0.9, Math.min(1.5, targetPolar - dy * 0.004));
  });

  window.addEventListener('pointerup', () => {
    dragging = false;
    renderer.domElement.style.cursor = 'grab';
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  renderer.domElement.addEventListener('click', (e) => {
    if (didDrag) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([...candles, ...flames], true);
    for (const h of hits) {
      const fi = flames.findIndex(fg => fg === h.object || fg.children.includes(h.object));
      if (fi >= 0) { blowCandle(fi); break; }
      const ci = candles.indexOf(h.object);
      if (ci >= 0) { blowCandle(ci); break; }
    }
  });

  // ── Animation loop ───────────────────────────────────────────────────────
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const now = performance.now();

    // Gentle idle orbit / drag orbit
    if (!dragging) targetAz += 0.0022;
    azimuth += (targetAz - azimuth) * 0.055;
    polar   += (targetPolar - polar) * 0.055;
    const bobY = target.y + Math.sin(t * 0.6) * 0.12;
    camera.position.set(
      Math.sin(azimuth) * Math.sin(polar) * camDist,
      Math.cos(polar) * camDist,
      Math.cos(azimuth) * Math.sin(polar) * camDist
    );
    camera.lookAt(0, bobY, 0);

    // Flame flicker / fade-out
    flames.forEach((fg, i) => {
      const d = flameData[i];
      if (!d.alive) {
        if (d.blownAt) {
          const k = (now - d.blownAt) / 500;
          if (k >= 1) {
            fg.visible = false;
          } else {
            fg.scale.setScalar(1 - k);
            (fg.userData.mats || []).forEach(m => {
              m.material.opacity = (m._o0 ?? 1) * (1 - k);
            });
          }
        }
        return;
      }
      const flicker = Math.sin(t * 16 + d.phase) * 0.09 + Math.sin(t * 7.3 + d.phase * 1.7) * 0.05;
      fg.scale.set(1 + flicker, 1 + Math.abs(flicker) * 0.6, 1 + flicker);
      fg.rotation.y += 0.05;
      flameLights[i].intensity = 0.8 + Math.sin(t * 13 + d.phase) * 0.25;
    });

    // Smoke
    smokes.forEach((puffs, ci) => {
      puffs.forEach(sm => {
        if (!sm._active) return;
        sm._age += 0.016;
        sm.position.y += sm._vy;
        sm.position.x += sm._vx;
        const fadeIn  = Math.min(sm._age / 0.3, 1);
        const fadeOut = Math.max(0, 1 - sm._age / 2.4);
        sm.material.opacity = fadeIn * fadeOut * 0.4;
        if (sm._age > 2.6) {
          sm._age = 0;
          sm.position.set(
            candles[ci].position.x + (Math.random() - 0.5) * 0.08,
            3.86,
            candles[ci].position.z
          );
        }
      });
    });

    // Sparkles drift upward
    const sp = sparkGeo.attributes.position.array;
    for (let i = 0; i < SPARK_COUNT; i++) {
      sp[i * 3 + 1] += sparkData[i].vy;
      sp[i * 3] += Math.sin(t + sparkData[i].phase) * 0.004;
      if (sp[i * 3 + 1] > 7.5) {
        sp[i * 3 + 1] = 0;
        sp[i * 3] = (Math.random() - 0.5) * 8;
      }
    }
    sparkGeo.attributes.position.needsUpdate = true;

    // Pulsing heart
    const pulse = 1 + Math.sin(t * 2.4) * 0.07;
    heartMesh.scale.set(pulse, pulse, pulse);

    renderer.render(scene, camera);
  }

  animate();

  // ── Resize ───────────────────────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });
  ro.observe(container);
  } catch (err) {
    showError(err.stack || err.message);
  }
}
