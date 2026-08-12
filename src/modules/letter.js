import { triggerHeartConfetti } from './confetti.js';

export function initLetter(letterConfig) {
  const envelopeContainer = document.getElementById('envelope-container');
  const waxSeal = document.getElementById('wax-seal');
  const envelopeFlap = document.getElementById('envelope-flap');
  const envelopeSlip = document.getElementById('envelope-slip');
  const openBtn = document.getElementById('open-letter-btn');
  const letterPaper = document.getElementById('letter-paper');
  const letterBodyContainer = document.getElementById('letter-body-content');
  const salutationEl = document.getElementById('letter-salutation');
  const dateEl = document.getElementById('letter-date');
  const closingEl = document.getElementById('letter-closing');
  const signatureEl = document.getElementById('letter-signature');

  if (!waxSeal || !envelopeContainer || !letterPaper) return;

  // Populate static text fields
  if (dateEl && letterConfig.date) dateEl.textContent = letterConfig.date;
  if (salutationEl && letterConfig.salutation) salutationEl.textContent = letterConfig.salutation;
  if (closingEl && letterConfig.closing) closingEl.textContent = letterConfig.closing;
  if (signatureEl && letterConfig.signature) {
    // Respect newline characters in signature
    signatureEl.style.whiteSpace = 'pre-line';
    signatureEl.textContent = letterConfig.signature;
  }

  let isLetterOpened = false;

  // Burst the wax seal into flying shards
  function burstWaxSeal() {
    if (!waxSeal) return;
    const rect = waxSeal.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const shardColors = ['#ec4899', '#be185d', '#881337', '#f43f5e', '#9d174d'];
    const frag = document.createDocumentFragment();

    for (let i = 0; i < 14; i++) {
      const shard = document.createElement('span');
      shard.className = 'seal-shard';
      const size = 7 + Math.random() * 15;
      const angle = Math.random() * Math.PI * 2;
      const dist = 45 + Math.random() * 80;
      shard.style.cssText = `
        left: ${cx}px;
        top: ${cy}px;
        width: ${size}px;
        height: ${size}px;
        background: ${shardColors[i % shardColors.length]};
        clip-path: polygon(
          ${(Math.random() * 45 + 5).toFixed(1)}% 0,
          100% ${(Math.random() * 45 + 5).toFixed(1)}%,
          ${(Math.random() * 45 + 5).toFixed(1)}% 100%,
          0 ${(Math.random() * 45 + 5).toFixed(1)}%
        );
        border-radius: 3px;
        --dx: ${(Math.cos(angle) * dist).toFixed(1)}px;
        --dy: ${(Math.sin(angle) * dist).toFixed(1)}px;
        --rot: ${((Math.random() - 0.5) * 900).toFixed(0)}deg;
      `;
      frag.appendChild(shard);
    }

    document.body.appendChild(frag);
    setTimeout(() => {
      document.querySelectorAll('.seal-shard').forEach(s => s.remove());
    }, 1000);
  }

  function openLetter() {
    if (isLetterOpened) return;
    isLetterOpened = true;

    // Begin the unsealing sequence on the container
    envelopeContainer.classList.add('open');
    triggerHeartConfetti();

    // 1. Wax seal cracks and shatters
    burstWaxSeal();
    waxSeal.classList.add('cracked');

    // 2. Flap swings open
    setTimeout(() => {
      if (envelopeFlap) envelopeFlap.classList.add('open');
    }, 450);

    // 3. Letter slip slides up out of the envelope
    setTimeout(() => {
      if (envelopeSlip) envelopeSlip.classList.add('out');
    }, 900);

    // Scroll the letter into comfortable view
    setTimeout(() => {
      letterPaper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 1500);

    // Populate & animate paragraphs with stagger
    if (letterBodyContainer && letterConfig?.paragraphs) {
      letterBodyContainer.innerHTML = '';

      letterConfig.paragraphs.forEach((paraText, pIndex) => {
        const p = document.createElement('p');
        p.textContent = paraText;
        // opacity/transform starts as 0 via CSS, JS triggers the transition
        letterBodyContainer.appendChild(p);

        setTimeout(() => {
          p.style.opacity = '1';
          p.style.transform = 'translateY(0)';
        }, 1500 + pIndex * 350);
      });
    }

    // Launch floating petals inside the letter using Three.js once it is visible
    setTimeout(spawnLetterPetals, 1650);
  }

  waxSeal.addEventListener('click', openLetter);
  if (openBtn) openBtn.addEventListener('click', openLetter);
  if (envelopeFlap) envelopeFlap.addEventListener('click', openLetter);

  // ─── Three.js Floating Petals Canvas inside the Letter ─────────────────
  function spawnLetterPetals() {
    if (typeof THREE === 'undefined') return;

    // Create a small overlay canvas on top of the letter
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
      border-radius: inherit;
    `;
    letterPaper.appendChild(canvas);

    const w = letterPaper.offsetWidth  || 860;
    const h = letterPaper.offsetHeight || 900;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 100);
    camera.position.z = 10;

    // Heart shape (small)
    function makeHeartShape(size) {
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

    const heartGeo  = new THREE.ShapeGeometry(makeHeartShape(6));
    // Simple 5-petal flower
    function makeFlowerShape(r) {
      const shape = new THREE.Shape();
      const pc = 5;
      const step = (Math.PI * 2) / pc;
      shape.moveTo(0, 0);
      for (let i = 0; i < pc; i++) {
        const a = i * step;
        const mid = a + step * 0.5;
        shape.quadraticCurveTo(Math.cos(mid) * r * 1.6, Math.sin(mid) * r * 1.6,
          Math.cos(a + step) * r * 0.3, Math.sin(a + step) * r * 0.3);
      }
      shape.closePath();
      return shape;
    }
    const flowerGeo = new THREE.ShapeGeometry(makeFlowerShape(7));

    const petalColors = ['#f497aa', '#ffc44d', '#e2738c', '#ffb3c6', '#ffd700', '#ffffff'];

    const petals = [];
    const PETAL_COUNT = 28;

    for (let i = 0; i < PETAL_COUNT; i++) {
      const isHeart = Math.random() > 0.45;
      const geo = isHeart ? heartGeo : flowerGeo;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(petalColors[Math.floor(Math.random() * petalColors.length)]),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: Math.random() * 0.35 + 0.25
      });
      const mesh = new THREE.Mesh(geo, mat);

      // Scatter within letter bounds
      mesh.position.set(
        (Math.random() - 0.5) * w,
        (Math.random() * 0.5 + 0.5) * h,   // start above center / offscreen top
        0
      );
      const sc = Math.random() * 1.1 + 0.5;
      mesh.scale.set(sc, sc, sc);
      mesh.rotation.z = Math.random() * Math.PI * 2;

      scene.add(mesh);
      petals.push({
        mesh,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(Math.random() * 0.55 + 0.2),  // fall downward
        spin: (Math.random() - 0.5) * 0.025,
        phase: Math.random() * Math.PI * 2
      });
    }

    scene.add(new THREE.AmbientLight(0xffffff, 1));

    const clock = new THREE.Clock();
    let raf;

    function animate() {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      petals.forEach(p => {
        p.mesh.position.x += p.vx + Math.sin(t * 0.8 + p.phase) * 0.3;
        p.mesh.position.y += p.vy;
        p.mesh.rotation.z += p.spin;

        // Wrap: when a petal exits the bottom, reset to top
        if (p.mesh.position.y < -h / 2 - 30) {
          p.mesh.position.y = h / 2 + 30;
          p.mesh.position.x = (Math.random() - 0.5) * w;
        }
      });

      renderer.render(scene, camera);
    }

    animate();

    // Resize handler
    const ro = new ResizeObserver(() => {
      const nw = letterPaper.offsetWidth;
      const nh = letterPaper.offsetHeight;
      renderer.setSize(nw, nh);
      camera.left   = -nw / 2;
      camera.right  =  nw / 2;
      camera.top    =  nh / 2;
      camera.bottom = -nh / 2;
      camera.updateProjectionMatrix();
    });
    ro.observe(letterPaper);

    // After 90 seconds slow-fade the canvas to not distract from reading
    setTimeout(() => {
      let op = 1;
      const fade = setInterval(() => {
        op -= 0.015;
        canvas.style.opacity = String(Math.max(0, op));
        if (op <= 0) {
          clearInterval(fade);
          cancelAnimationFrame(raf);
          renderer.dispose();
          canvas.remove();
          ro.disconnect();
        }
      }, 60);
    }, 90_000);
  }
}
