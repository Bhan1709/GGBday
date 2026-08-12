export function initPhotoCollage(photos) {
  const container = document.getElementById('photo-collage-container');
  const prevBtn = document.getElementById('collage-prev-btn');
  const nextBtn = document.getElementById('collage-next-btn');
  const counterEl = document.getElementById('collage-counter');
  const lightbox = document.getElementById('photo-lightbox');
  const lightboxImg = document.getElementById('photo-lightbox-img');
  const lightboxPrev = document.getElementById('photo-lightbox-prev');
  const lightboxNext = document.getElementById('photo-lightbox-next');
  const lightboxClose = document.getElementById('photo-lightbox-close');
  if (!container || typeof THREE === 'undefined') return;

  const photosArr = Array.isArray(photos) ? photos : [];
  const COUNT = photosArr.length;
  if (!COUNT) return;

  let W = container.clientWidth || 900;
  let H = container.clientHeight || 560;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.touchAction = 'pan-y';
  renderer.domElement.style.cursor = 'grab';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
  camera.position.set(0, 0, 12);

  const group = new THREE.Group();
  scene.add(group);

  const MAX_OFF = 2;
  const ANGLE = 0.45;
  let SPACING = 4.0;
  let Z_STEP = 2.9;

  let current = 0;
  let target = 0;
  let dragging = false;
  let paused = false;
  let autoTimer = null;
  let lightboxIndex = -1;

  function wrapOffset(d) {
    if (d > COUNT / 2) d -= COUNT;
    if (d < -COUNT / 2) d += COUNT;
    return d;
  }

  function goTo(next) {
    target = ((next % COUNT) + COUNT) % COUNT;
    scheduleAuto();
  }

  function scheduleAuto() {
    stopAuto();
    autoTimer = setInterval(() => {
      if (!paused && !dragging) goTo(target + 1);
    }, 4500);
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function makePolaroid(img, i) {
    const margin = 18;
    const band = 58;
    const photoW = 520;
    const iw = img ? (img.naturalWidth || img.width || 4) : 4;
    const ih = img ? (img.naturalHeight || img.height || 5) : 5;
    const photoH = Math.round((ih / iw) * photoW);
    const cw = photoW + margin * 2;
    const ch = photoH + margin * 2 + band;
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const g = c.getContext('2d');
    g.fillStyle = '#fdfbf8';
    g.fillRect(0, 0, cw, ch);
    if (img) {
      const scale = Math.max(photoW / iw, photoH / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      g.drawImage(img, margin + (photoW - dw) / 2, margin + (photoH - dh) / 2, dw, dh);
    } else {
      const grad = g.createLinearGradient(0, 0, cw, ch);
      grad.addColorStop(0, '#ffd1dc');
      grad.addColorStop(1, '#ffb347');
      g.fillStyle = grad;
      g.fillRect(margin, margin, photoW, photoH);
      g.fillStyle = '#ffffff';
      g.font = '140px serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('🌙', margin + photoW / 2, margin + photoH / 2);
    }
    g.fillStyle = '#9c8a94';
    g.font = 'italic 30px "Dancing Script", "Great Vibes", cursive';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(`♡  ${i + 1}`, cw / 2, margin + photoH + band / 2);
    return c;
  }

  const items = [];
  const raycastMeshes = [];
  const CARD_W = 4.0;

  for (let i = 0; i < COUNT; i++) {
    const pc = makePolaroid(null, i);
    const tex = new THREE.CanvasTexture(pc);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;

    const cardH = CARD_W * (pc.height / pc.width);

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W, cardH),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    );
    mesh.userData.index = i;
    group.add(mesh);
    raycastMeshes.push(mesh);

    const item = { index: i, mesh, tex };
    items.push(item);

    const img = new Image();
    img.onload = () => {
      const c = makePolaroid(img, i);
      tex.image = c;
      tex.needsUpdate = true;
      const nh = CARD_W * (c.height / c.width);
      item.mesh.geometry.dispose();
      item.mesh.geometry = new THREE.PlaneGeometry(CARD_W, nh);
    };
    img.src = photosArr[i];
  }

  function fitZ() {
    const f = 2 * Math.tan(THREE.MathUtils.degToRad(45 / 2));
    const halfSpan = SPACING * MAX_OFF + 2.0;
    const needW = (halfSpan * 2) / (f * (W / H));
    const maxCardH = CARD_W * 1.2 * 1.7;
    const needH = maxCardH / (0.78 * f);
    return Math.max(needW, needH, 7);
  }

  function applyMetrics() {
    SPACING = Math.min(4.0, Math.max(2.8, W * 0.0048));
    Z_STEP = SPACING * 0.74;
    camera.aspect = W / H;
    camera.position.z = fitZ();
    camera.updateProjectionMatrix();
  }

  applyMetrics();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function pick(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(raycastMeshes).filter((h) => h.object.visible);
    return hits.length ? hits[0].object.userData.index : -1;
  }

  function originalSrc(i) {
    return photosArr[i].replace(/thumbs\//, '');
  }

  function showLightbox(idx) {
    lightboxIndex = ((idx % COUNT) + COUNT) % COUNT;
    lightboxImg.src = originalSrc(lightboxIndex);
  }

  function openLightbox(idx) {
    if (!lightbox || !lightboxImg) return;
    showLightbox(idx);
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    paused = true;
    stopAuto();
  }

  function closeLightbox() {
    if (!lightbox || lightboxIndex < 0) return;
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    lightboxIndex = -1;
    paused = false;
    scheduleAuto();
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener('click', () => showLightbox(lightboxIndex - 1));
  if (lightboxNext) lightboxNext.addEventListener('click', () => showLightbox(lightboxIndex + 1));
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  let downX = 0;
  let downY = 0;
  let moved = false;
  let startTarget = 0;

  renderer.domElement.addEventListener('pointerdown', (e) => {
    downX = e.clientX;
    downY = e.clientY;
    moved = false;
    startTarget = target;
    dragging = true;
    renderer.domElement.style.cursor = 'grabbing';
  });

  window.addEventListener('pointermove', (e) => {
    if (dragging) {
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        const t = startTarget - Math.round(dx / 110);
        target = ((t % COUNT) + COUNT) % COUNT;
      }
      return;
    }
    renderer.domElement.style.cursor = pick(e.clientX, e.clientY) >= 0 ? 'pointer' : 'grab';
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    renderer.domElement.style.cursor = 'grab';
    scheduleAuto();
    if (!moved) {
      const idx = pick(e.clientX, e.clientY);
      if (idx >= 0 && idx === (Math.round(current) % COUNT)) {
        openLightbox(idx);
      } else if (idx >= 0) {
        goTo(idx);
      }
    }
  }

  renderer.domElement.addEventListener('pointerup', endDrag);
  renderer.domElement.addEventListener('pointercancel', () => {
    dragging = false;
    scheduleAuto();
  });
  renderer.domElement.addEventListener('pointerenter', () => { paused = true; });
  renderer.domElement.addEventListener('pointerleave', () => {
    paused = false;
    if (lightboxIndex < 0) scheduleAuto();
  });

  if (prevBtn) prevBtn.addEventListener('click', () => goTo(target - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo(target + 1));

  window.addEventListener('keydown', (e) => {
    if (lightboxIndex >= 0) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showLightbox(lightboxIndex - 1);
      if (e.key === 'ArrowRight') showLightbox(lightboxIndex + 1);
      return;
    }
    if (e.key === 'ArrowLeft') goTo(target - 1);
    if (e.key === 'ArrowRight') goTo(target + 1);
  });

  const clock = new THREE.Clock();
  let lastCounter = -1;

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    let diff = target - current;
    if (diff > COUNT / 2) diff -= COUNT;
    if (diff < -COUNT / 2) diff += COUNT;
    current += diff * 0.09;
    if (Math.abs(diff) < 0.01) current = target;

    for (const item of items) {
      const off = wrapOffset(item.index - current);
      const abs = Math.abs(off);
      const visible = abs <= MAX_OFF + 1;
      item.mesh.visible = visible;
      if (!visible) continue;

      const scale = abs === 0 ? 1.18 : abs === 1 ? 1.0 : 0.82;
      item.mesh.position.x = off * SPACING;
      item.mesh.position.y = Math.sin(t * 0.7 + item.index * 0.35) * 0.03;
      item.mesh.position.z = -abs * Z_STEP + Math.sin(t * 0.9 + item.index) * 0.05;
      item.mesh.rotation.y = -off * ANGLE;
      item.mesh.scale.setScalar(scale);
      item.mesh.material.opacity = abs <= 1 ? 1 : 0.85;
    }

    const snapped = Math.round(current) % COUNT;
    if (snapped !== lastCounter) {
      lastCounter = snapped;
      if (counterEl) counterEl.textContent = `${snapped + 1} / ${COUNT}`;
    }

    renderer.render(scene, camera);
  }

  animate();
  scheduleAuto();

  const ro = new ResizeObserver(() => {
    W = container.clientWidth;
    H = container.clientHeight;
    renderer.setSize(W, H);
    applyMetrics();
  });
  ro.observe(container);
}
