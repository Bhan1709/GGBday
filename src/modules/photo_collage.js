export function initPhotoCollage(photos, messageCard = null) {
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
  const HAS_MESSAGE = !!messageCard && !!messageCard.body;
  const TOTAL = COUNT + (HAS_MESSAGE ? 1 : 0);
  const MESSAGE_INDEX = COUNT;

  let W = container.clientWidth || 900;
  let H = container.clientHeight || 560;
  const IS_MOBILE = window.innerWidth < 768;
  const MOBILE_FACTOR = IS_MOBILE ? 1.75 : 1;

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
  let messageSrc = null;

  function wrapOffset(d) {
    if (d > TOTAL / 2) d -= TOTAL;
    if (d < -TOTAL / 2) d += TOTAL;
    return d;
  }

  function goTo(next) {
    target = ((next % TOTAL) + TOTAL) % TOTAL;
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

  function wrapCanvasText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function makeMessagePolaroid(card, scale = 1) {
    const margin = 18;
    const band = 58;
    const photoW = 520;
    const photoH = Math.round(photoW * 1.25);
    const cw = photoW + margin * 2;
    const ch = photoH + margin * 2 + band;
    const c = document.createElement('canvas');
    c.width = cw * scale;
    c.height = ch * scale;
    const g = c.getContext('2d');
    g.scale(scale, scale);

    g.fillStyle = '#fdfbf8';
    g.fillRect(0, 0, cw, ch);

    for (let i = 0; i < 800; i++) {
      g.fillStyle = `rgba(204, 178, 160, ${0.02 + Math.random() * 0.03})`;
      g.fillRect(Math.random() * cw, Math.random() * ch, 1.5, 1.5);
    }

    const grad = g.createLinearGradient(0, margin, 0, margin + photoH);
    grad.addColorStop(0, '#fff8f0');
    grad.addColorStop(1, '#ffeef5');
    g.fillStyle = grad;
    g.fillRect(margin, margin, photoW, photoH);

    g.strokeStyle = 'rgba(244, 151, 170, 0.35)';
    g.lineWidth = 1.5;
    g.strokeRect(margin + 10, margin + 10, photoW - 20, photoH - 20);

    g.textAlign = 'center';
    g.textBaseline = 'middle';

    g.font = '28px serif';
    g.fillStyle = '#f497aa';
    g.fillText('💖', cw / 2, margin + 42);

    g.fillStyle = '#c99aa2';
    g.font = 'italic 32px "Dancing Script", "Great Vibes", cursive';
    g.fillText(card.heading || 'For my baby, from my heart', cw / 2, margin + 80);

    g.strokeStyle = 'rgba(244, 151, 170, 0.4)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(cw / 2 - 60, margin + 100);
    g.lineTo(cw / 2 + 60, margin + 100);
    g.stroke();

    const body = card.body || '';
    g.fillStyle = '#5a4a52';
    g.font = '28px "Cormorant Garamond", Georgia, serif';
    const lines = wrapCanvasText(g, body, photoW - 80);
    let y = margin + 128;
    const lh = 38;
    for (const line of lines) {
      g.fillText(line, cw / 2, y);
      y += lh;
    }

    g.fillStyle = '#c99aa2';
    g.font = 'italic 30px "Great Vibes", "Dancing Script", cursive';
    g.fillText(card.signature || 'Yours forever and always', cw / 2, y + 24);

    g.fillStyle = '#9c8a94';
    g.font = 'italic 30px "Dancing Script", "Great Vibes", cursive';
    g.fillText('♡  ∞', cw / 2, margin + photoH + band / 2);

    return c;
  }

  const items = [];
  const raycastMeshes = [];
  const CARD_W = 4.0 * MOBILE_FACTOR;

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

  if (HAS_MESSAGE) {
    const msgScale = MOBILE_FACTOR > 1 ? 2 : 1;
    const msgCanvas = makeMessagePolaroid(messageCard, msgScale);
    messageSrc = makeMessagePolaroid(messageCard, 2).toDataURL('image/png');
    const msgTex = new THREE.CanvasTexture(msgCanvas);
    msgTex.encoding = THREE.sRGBEncoding;
    msgTex.anisotropy = 8;
    const msgCardH = CARD_W * (msgCanvas.height / msgCanvas.width);
    const msgMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W, msgCardH),
      new THREE.MeshBasicMaterial({ map: msgTex, transparent: true, side: THREE.DoubleSide })
    );
    msgMesh.userData.index = MESSAGE_INDEX;
    group.add(msgMesh);
    raycastMeshes.push(msgMesh);
    items.push({ index: MESSAGE_INDEX, mesh: msgMesh, tex: msgTex });
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
    const spacingMul = MOBILE_FACTOR > 1 ? 1.3 : 1;
    SPACING = Math.min(4.0, Math.max(2.8, W * 0.0048 * spacingMul));
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
    idx = ((idx % TOTAL) + TOTAL) % TOTAL;
    lightboxIndex = idx;
    lightboxImg.src = idx === MESSAGE_INDEX ? messageSrc : originalSrc(idx);
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
        target = ((t % TOTAL) + TOTAL) % TOTAL;
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
      if (idx >= 0 && idx === (((Math.round(current) % TOTAL) + TOTAL) % TOTAL)) {
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

  function springTowards(current, target, stiffness = 0.12, damping = 0.85, wrapTotal = 0) {
    let diff = target - current;
    if (wrapTotal > 0) {
      if (diff > wrapTotal / 2) diff -= wrapTotal;
      if (diff < -wrapTotal / 2) diff += wrapTotal;
    }
    return current + diff * stiffness * damping;
  }

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    current = springTowards(current, target, 0.12, 0.88, TOTAL);
    if (Math.abs(target - current) < 0.005) current = target;
    // Keep current in [0, TOTAL) range for consistent position calculations
    current = ((current % TOTAL) + TOTAL) % TOTAL;

    for (const item of items) {
      const off = wrapOffset(item.index - current);
      const abs = Math.abs(off);
      const visible = abs <= MAX_OFF;
      item.mesh.visible = visible;
      if (!visible) continue;

      const targetScale = abs === 0 ? 1.7 : abs === 1 ? 1.0 : 0.7;
      const targetX = off * SPACING;
      const targetZ = -abs * Z_STEP;
      const targetRotY = -off * ANGLE;
      const targetOpacity = abs <= 1 ? 1 : 0.7;

      item.currentScale = springTowards(item.currentScale || targetScale, targetScale, 0.18, 0.88);
      item.currentX = springTowards(item.currentX || targetX, targetX, 0.18, 0.88);
      item.currentZ = springTowards(item.currentZ || targetZ, targetZ, 0.18, 0.88);
      item.currentRotY = springTowards(item.currentRotY || targetRotY, targetRotY, 0.18, 0.88);
      item.currentOpacity = springTowards(item.currentOpacity || targetOpacity, targetOpacity, 0.25, 0.9);

      item.mesh.position.x = item.currentX;
      item.mesh.position.y = Math.sin(t * 0.7 + item.index * 0.35) * 0.03;
      item.mesh.position.z = item.currentZ + Math.sin(t * 0.9 + item.index) * 0.05;
      item.mesh.rotation.y = item.currentRotY;
      item.mesh.scale.setScalar(item.currentScale);
      item.mesh.material.opacity = item.currentOpacity;
    }

    const snapped = ((Math.round(current) % TOTAL) + TOTAL) % TOTAL;
    if (snapped !== lastCounter) {
      lastCounter = snapped;
      if (counterEl) counterEl.textContent = `${snapped + 1} / ${TOTAL}`;
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
