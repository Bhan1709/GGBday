// ─── Three.js Random Photo Collage ─────────────────────────────────────────
// A scatter of polaroid-style photos floating over the page background.
// Photos are loaded from the paths in CONFIG.photos; if a file is missing a
// pretty procedural placeholder is drawn instead. Hover to lift a photo,
// click to bring it front-and-center, and hit Shuffle to re-scatter them.
export function initPhotoCollage(photos) {
  const container = document.getElementById('photo-collage-container');
  const shuffleBtn = document.getElementById('shuffle-photos-btn');
  if (!container || typeof THREE === 'undefined') return;

  // ── Renderer ─────────────────────────────────────────────────────────────
  const W = container.clientWidth  || 700;
  const H = container.clientHeight || 560;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.style.cursor = 'default';
  container.appendChild(renderer.domElement);

  // ── Scene & Camera ───────────────────────────────────────────────────────
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
  camera.position.set(0, 0.5, 13);

  // The collage roughly spans these world bounds (incl. jitter) — used to fit
  // the camera on resize so the whole wall is always visible.
  const COLLAGE_W = 11;
  const COLLAGE_H = 9.4;

  function fitZ(w, h) {
    const aspect = w / h;
    const f = 2 * Math.tan(THREE.MathUtils.degToRad(45 / 2));
    const needH = (COLLAGE_H * 1.16) / f;
    const needW = (COLLAGE_W * 1.24) / (f * aspect);
    return Math.max(needH, needW, 8);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function coverDraw(g, img, x, y, w, h) {
    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  // Draws the photo (real image or placeholder) onto a fixed-aspect canvas so
  // every frame keeps its orientation.
  function photoCanvasOf(draw, portrait) {
    const c = document.createElement('canvas');
    c.width  = portrait ? 440 : 560;
    c.height = portrait ? 560 : 440;
    draw(c.getContext('2d'));
    return c;
  }

  const PLACEHOLDER_STYLES = [
    ['#ffd1dc', '#ff8fb1', '🌸'], ['#ffe4a8', '#ffb347', '🍋'],
    ['#c9e9ff', '#6fc2ef', '🌊'], ['#d4ffcf', '#7ecb6f', '🌿'],
    ['#e6d3ff', '#b98af0', '🌙'], ['#fff0b8', '#ffc44d', '✨'],
    ['#ffd9e8', '#ff7bab', '🎀'], ['#cff5ff', '#57b8d8', '🌷'],
    ['#ffe8d1', '#ff9a62', '🍑'], ['#d9f6e8', '#5ecf9b', '🍃'],
    ['#f3d7ff', '#c96fe0', '💫'], ['#ffead4', '#ffb38a', '🌻']
  ];

  function makePlaceholderCanvas(i, portrait) {
    const [c1, c2, emoji] = PLACEHOLDER_STYLES[i % PLACEHOLDER_STYLES.length];
    return photoCanvasOf((g) => {
      const grad = g.createLinearGradient(0, 0, g.canvas.width, g.canvas.height);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      g.fillStyle = grad;
      g.fillRect(0, 0, g.canvas.width, g.canvas.height);

      g.globalAlpha = 0.22;
      for (let k = 0; k < 3; k++) {
        g.fillStyle = k % 2 ? '#ffffff' : '#000000';
        g.beginPath();
        g.arc(Math.random() * g.canvas.width, Math.random() * g.canvas.height, 40 + Math.random() * 70, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;

      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '90px serif';
      g.fillText(emoji, g.canvas.width / 2, g.canvas.height / 2 - 18);
      g.font = 'bold 26px Jost, sans-serif';
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.fillText('Photo ' + (i + 1), g.canvas.width / 2, g.canvas.height / 2 + 72);
      g.font = '14px Jost, sans-serif';
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.fillText('drop a picture here', g.canvas.width / 2, g.canvas.height / 2 + 100);
    }, portrait);
  }

  // Wraps the photo canvas in a white polaroid frame + caption band.
  function buildPolaroidFrame(photoCanvas, i) {
    const margin = 22;
    const capH = 84;
    const cw = photoCanvas.width + margin * 2;
    const ch = photoCanvas.height + margin * 2 + capH;
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const g = c.getContext('2d');

    g.fillStyle = '#fdfbf8';
    g.fillRect(0, 0, cw, ch);
    g.fillStyle = 'rgba(0,0,0,0.045)';
    g.fillRect(0, 0, cw, 4);
    g.fillRect(0, ch - 4, cw, 4);
    g.fillRect(0, 0, 4, ch);
    g.fillRect(cw - 4, 0, 4, ch);

    g.drawImage(photoCanvas, margin, margin);
    g.strokeStyle = 'rgba(0,0,0,0.07)';
    g.strokeRect(margin - 0.5, margin - 0.5, photoCanvas.width + 1, photoCanvas.height + 1);

    const captions = ['✨', '🌸', '🌙', '🍋', '☕', '🌿', '💕', '🍑', '🌊', '🎀', '🌻', '🍕'];
    g.font = 'italic 30px "Dancing Script", cursive';
    g.fillStyle = '#9c8a94';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(captions[i % captions.length] + '   ' + (i + 1), cw / 2, ch - capH / 2);
    return c;
  }

  const tapeColors = [0xffb3c6, 0xb8e0a8, 0xc9b3ff, 0xffe9a8, 0x9ecbff, 0xffc9a3];

  // ── Layout ───────────────────────────────────────────────────────────────
  function layoutPositions(count) {
    const cols = 4;
    const rows = Math.ceil(count / cols);
    const spacingX = 2.45;
    const spacingY = 2.95;
    const out = [];
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      out.push({
        x: (col - (cols - 1) / 2) * spacingX + (Math.random() - 0.5) * 0.8,
        y: (row - (rows - 1) / 2) * spacingY + (Math.random() - 0.5) * 0.9,
        z: -0.7 + Math.random() * 1.2,
        rz: (Math.random() - 0.5) * 0.26,
        s: 0.92 + Math.random() * 0.18
      });
    }
    return out;
  }

  // ── Build the collage ────────────────────────────────────────────────────
  const COUNT = Array.isArray(photos) && photos.length ? photos.length : 12;
  const group = new THREE.Group();
  scene.add(group);

  const items = [];
  const layouts = layoutPositions(COUNT);

  for (let i = 0; i < COUNT; i++) {
    const portrait = i % 3 !== 1; // 2/3 portrait, 1/3 landscape
    const layout = layouts[i];

    // Start with a placeholder so something shows immediately
    const frameCanvas = buildPolaroidFrame(makePlaceholderCanvas(i, portrait), i);
    const tex = new THREE.CanvasTexture(frameCanvas);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;

    const Wd = 2.1 * (frameCanvas.width / 440);   // portrait width basis
    const Hd = 2.1 * (frameCanvas.height / 440);

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(Wd, Hd),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    mesh.userData.index = i;

    // Soft drop shadow
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(Wd * 1.04, Hd * 1.04),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false })
    );
    shadow.position.set(0.15, -0.17, -0.02);

    // Washi tape
    const tape = new THREE.Mesh(
      new THREE.PlaneGeometry(Wd * 0.34, 0.34),
      new THREE.MeshBasicMaterial({ color: tapeColors[i % tapeColors.length], transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    tape.rotation.z = Math.PI / 4;
    tape.position.set(0, Hd / 2 - 0.12, 0.01);

    const frame = new THREE.Group();
    frame.add(shadow, mesh, tape);
    frame.position.set(layout.x, layout.y, layout.z);
    frame.rotation.z = layout.rz;
    frame.scale.setScalar(layout.s);
    group.add(frame);

    const ph = {
      index: i,
      portrait,
      mesh,
      tex,
      frame,
      home: { ...layout },
      cur: { x: layout.x, y: layout.y, z: layout.z, rz: layout.rz },
      curScale: layout.s,
      idlePhase: Math.random() * Math.PI * 2
    };
    items.push(ph);

    // Try to load the real photo (keep placeholder on failure)
    const src = photos && photos[i];
    if (src) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const pc = photoCanvasOf((g) => coverDraw(g, img, 0, 0, g.canvas.width, g.canvas.height), portrait);
        const fc = buildPolaroidFrame(pc, i);
        tex.image = fc;
        tex.needsUpdate = true;
      };
      img.onerror = () => { /* keep placeholder */ };
      img.src = src;
    }
  }

  // ── Interaction ──────────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const meshes = items.map(p => p.mesh);
  let hoveredIndex = -1;
  let selectedIndex = -1;

  function pick(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(meshes);
    return hits.length ? hits[0].object.userData.index : -1;
  }

  renderer.domElement.addEventListener('pointermove', (e) => {
    const idx = pick(e.clientX, e.clientY);
    if (idx !== hoveredIndex) {
      hoveredIndex = idx;
      renderer.domElement.style.cursor = idx >= 0 ? 'pointer' : 'default';
    }
  });

  renderer.domElement.addEventListener('pointerleave', () => {
    hoveredIndex = -1;
    renderer.domElement.style.cursor = 'default';
  });

  renderer.domElement.addEventListener('click', (e) => {
    const idx = pick(e.clientX, e.clientY);
    if (idx >= 0) {
      selectedIndex = selectedIndex === idx ? -1 : idx;
    } else if (selectedIndex >= 0) {
      selectedIndex = -1;
    }
  });

  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      const fresh = layoutPositions(COUNT);
      items.forEach((p, i) => {
        if (selectedIndex === i) return;
        p.home = { ...fresh[i] };
      });
    });
  }

  // ── Mouse parallax ───────────────────────────────────────────────────────
  let mouseNx = 0, mouseNy = 0, mx = 0, my = 0;
  window.addEventListener('pointermove', (e) => {
    mouseNx = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNy = (e.clientY / window.innerHeight) * 2 - 1;
  });

  // ── Animation loop ───────────────────────────────────────────────────────
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    mx += (mouseNx - mx) * 0.04;
    my += (mouseNy - my) * 0.04;
    camera.position.x = mx * 1.3;
    camera.position.y = 0.5 + my * 0.55;
    camera.lookAt(0, 0, 0);

    items.forEach(p => {
      const h = p.home;
      let tx = h.x, ty = h.y, tz = h.z, tr = h.rz, ts = h.s;

      if (selectedIndex === p.index) {
        tx = 0; ty = 0; tz = 1.15; tr = 0; ts = 1.62;
      } else {
        // Idle sway
        tx += Math.sin(t * 0.7 + p.idlePhase) * 0.05;
        ty += Math.cos(t * 0.55 + p.idlePhase * 1.3) * 0.04;
        tr += Math.sin(t * 0.8 + p.idlePhase) * 0.02;
        if (hoveredIndex === p.index) {
          tz += 0.7;
          ts *= 1.08;
          ty += 0.12;
          tr = 0;
        }
      }

      const c = p.cur;
      const k = 0.085;
      c.x  += (tx - c.x) * k;
      c.y  += (ty - c.y) * k;
      c.z  += (tz - c.z) * k;
      c.rz += (tr - c.rz) * k;
      p.curScale += (ts - p.curScale) * k;

      p.frame.position.set(c.x, c.y, c.z);
      p.frame.rotation.z = c.rz;
      p.frame.scale.setScalar(p.curScale);

      // Focus dimming: when a photo is selected, fade the others
      const targetOpacity = selectedIndex >= 0 ? (selectedIndex === p.index ? 1 : 0.28) : 1;
      p.mesh.material.opacity += (targetOpacity - p.mesh.material.opacity) * 0.12;
    });

    renderer.render(scene, camera);
  }

  animate();

  // ── Resize ───────────────────────────────────────────────────────────────
  camera.position.z = fitZ(W, H);
  const ro = new ResizeObserver(() => {
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    renderer.setSize(nw, nh);
    camera.aspect = nw / nh;
    camera.position.z = fitZ(nw, nh);
    camera.updateProjectionMatrix();
  });
  ro.observe(container);
}
