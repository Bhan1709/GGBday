// Three.js 3D Gift Box Engine for the Gift Card section.
// Renders 12 little gift boxes in a rotating ring. Boxes animate in with a
// staggered "load" when the section scrolls into view, and a claimed box pops,
// turns gold, and bursts sparkles when a transfer request is redeemed.
export function initGiftScene(canvasId, opts) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof THREE === 'undefined') return null;

  const total = opts?.total || 12;
  const claimedSet = opts?.claimedSet || new Set();
  const onBoxClick = opts?.onBoxClick || (() => {});

  const stage = canvas.parentElement;
  let width = stage.clientWidth || 820;
  let height = stage.clientHeight || 320;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 1.9, 9.6);
  camera.lookAt(0, 0.2, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // ─── LIGHTS ───────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const keyLight = new THREE.PointLight(0xffc44d, 1.5, 30);
  keyLight.position.set(4, 6, 6);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0xff6ba8, 1.1, 30);
  rimLight.position.set(-4, -2, 5);
  scene.add(rimLight);

  // ─── GIFT BOX CONSTRUCTION ────────────────────────────────────────────────
  const ring = new THREE.Group();
  scene.add(ring);

  const RING_RADIUS = 3.15;
  const palette = ['#f497aa', '#b78bdc', '#ffb3c6', '#8fa9f0', '#ffd9a0', '#e2738c'];

  const boxes = []; // { group, bodyMat, lidMat, ribbonMat, bowMat, index, baseColor }

  function buildGiftBox(index, claimed) {
    const g = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(0.72, 0.58, 0.72);
    const lidGeo = new THREE.BoxGeometry(0.8, 0.2, 0.8);
    const bandGeo = new THREE.BoxGeometry(0.09, 0.8, 0.09);
    const bowGeo1 = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const bowGeo2 = new THREE.BoxGeometry(0.14, 0.14, 0.14);

    const baseColor = claimed ? '#ffd34d' : palette[index % palette.length];
    const ribbonColor = claimed ? '#fff3d6' : '#ffc44d';

    const bodyMat = new THREE.MeshStandardMaterial({
      color: baseColor, roughness: 0.45, metalness: 0.15
    });
    const lidMat = new THREE.MeshStandardMaterial({
      color: claimed ? '#ffdf7a' : baseColor, roughness: 0.4, metalness: 0.2
    });
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: ribbonColor, roughness: 0.5, metalness: 0.25
    });
    const bowMat = new THREE.MeshStandardMaterial({
      color: ribbonColor, roughness: 0.5, metalness: 0.25
    });

    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = -0.29;
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.y = 0.02;
    const bandV = new THREE.Mesh(bandGeo, ribbonMat);   // vertical band front/back
    const bandH = new THREE.Mesh(bandGeo.clone(), ribbonMat); // horizontal band
    bandH.rotation.y = Math.PI / 2;
    const bow1 = new THREE.Mesh(bowGeo1, bowMat);
    bow1.position.set(-0.1, 0.22, 0);
    bow1.rotation.z = -0.6;
    const bow2 = new THREE.Mesh(bowGeo2, bowMat);
    bow2.position.set(0.1, 0.22, 0);
    bow2.rotation.z = 0.6;

    g.add(body, lid, bandV, bandH, bow1, bow2);

    const angle = (index / total) * Math.PI * 2;
    g.position.set(
      Math.sin(angle) * RING_RADIUS,
      0,
      Math.cos(angle) * RING_RADIUS
    );
    g.rotation.y = -angle;

    ring.add(g);

    const box = {
      group: g, bodyMat, lidMat, ribbonMat, bowMat,
      index: index + 1,
      claimed,
      phase: index * 0.53,
      enterDelay: 0.12 + index * 0.07,
      entered: false
    };
    boxes.push(box);
    return box;
  }

  for (let i = 0; i < total; i++) {
    buildGiftBox(i, claimedSet.has(i + 1));
  }

  // ─── SPARKLE PARTICLES ────────────────────────────────────────────────────
  const particles = [];

  function burstSparkles(position) {
    for (let i = 0; i < 26; i++) {
      const geo = new THREE.SphereGeometry(0.04, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: ['#ffd700', '#fff3d6', '#ff6ba8', '#ffc44d'][i % 4],
        transparent: true
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(position);
      const speed = 1.4 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      p.userData.vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed + 1.2,
        Math.sin(phi) * Math.sin(theta) * speed
      );
      p.userData.life = 1;
      scene.add(p);
      particles.push(p);
    }
  }

  // ─── INTERACTION ──────────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredBox = null;

  function pointerToNdc(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickBox(e) {
    pointerToNdc(e);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(ring.children, true);
    return hits.length > 0 ? (hits[0].object.userData.parentBox || null) : null;
  }

  // Attach box reference to every mesh inside the gift box group
  boxes.forEach(b => {
    b.group.traverse(mesh => { mesh.userData.parentBox = b; });
  });

  canvas.addEventListener('pointermove', (e) => {
    const box = pickBox(e);
    if (hoveredBox && hoveredBox !== box) {
      hoveredBox.group.scale.set(1, 1, 1);
      hoveredBox = null;
    }
    if (box && !box.claimed) {
      hoveredBox = box;
      box.group.scale.set(1.14, 1.14, 1.14);
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = box ? 'default' : 'default';
    }
  });

  canvas.addEventListener('click', (e) => {
    const box = pickBox(e);
    if (box && !box.claimed) {
      onBoxClick(box.index);
    }
  });

  canvas.addEventListener('pointerleave', () => {
    if (hoveredBox) {
      hoveredBox.group.scale.set(1, 1, 1);
      hoveredBox = null;
    }
  });

  // ─── ENTRANCE ANIMATION (staggered load on scroll into view) ──────────────
  let entered = false;
  let enterStart = 0;

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !entered) {
        entered = true;
        enterStart = performance.now();
        io.disconnect();
      }
    });
  }, { threshold: 0.35 });
  io.observe(stage);

  // ─── CLAIM A BOX ──────────────────────────────────────────────────────────
  function markClaimed(index) {
    const box = boxes.find(b => b.index === index);
    if (!box || box.claimed) return;

    box.claimed = true;
    burstSparkles(box.group.position.clone().add(new THREE.Vector3(0, 0.4, 0)));

    const targetColor = new THREE.Color('#ffd34d');
    const startColor = box.bodyMat.color.clone();
    const start = performance.now();
    const dur = 700;

    function animateClaim(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      box.bodyMat.color.lerpColors(startColor, targetColor, eased);
      box.lidMat.color.lerpColors(startColor, new THREE.Color('#ffdf7a'), eased);
      box.ribbonMat.color.set('#fff3d6');
      box.bowMat.color.set('#fff3d6');
      box.ribbonMat.emissive.set('#ffe9b8');
      box.ribbonMat.emissiveIntensity = eased * 0.7;
      box.bowMat.emissive.set('#ffe9b8');
      box.bowMat.emissiveIntensity = eased * 0.7;
      box.group.scale.set(1 + Math.sin(t * Math.PI) * 0.35, 1 + Math.sin(t * Math.PI) * 0.35, 1 + Math.sin(t * Math.PI) * 0.35);
      if (t < 1) requestAnimationFrame(animateClaim);
      else box.group.scale.set(1, 1, 1);
    }
    requestAnimationFrame(animateClaim);
  }

  // ─── SUCCESS NOTIFICATION (3D toast banner) ────────────────────────────────
  const notifications = [];

  function makeNotificationTexture(message, subtitle) {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 256;
    const g = c.getContext('2d');

    const x = 8, y = 8, w = 1008, h = 240, r = 44;
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();

    g.shadowColor = 'rgba(255, 196, 77, 0.85)';
    g.shadowBlur = 42;
    g.fillStyle = 'rgba(28, 14, 42, 0.94)';
    g.fill();
    g.shadowBlur = 0;

    const border = g.createLinearGradient(0, 0, 0, h);
    border.addColorStop(0, '#ffd97a');
    border.addColorStop(0.5, '#f5a623');
    border.addColorStop(1, '#ffdf9e');
    g.lineWidth = 8;
    g.strokeStyle = border;
    g.stroke();

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffd97a';
    g.font = '600 62px "Parisienne", "Dancing Script", cursive';
    g.fillText(message, w / 2, h / 2 - (subtitle ? 40 : 0));
    if (subtitle) {
      g.fillStyle = '#f497aa';
      g.font = '500 30px "Jost", sans-serif';
      g.fillText(subtitle, w / 2, h / 2 + 52);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function showNotification(message, subtitle) {
    const tex = makeNotificationTexture(message, subtitle);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      opacity: 0
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(0, 1.15, 3.6);
    sprite.scale.set(3.4, 0.85, 1);
    scene.add(sprite);

    burstSparkles(sprite.position.clone());

    notifications.push({
      sprite, mat, tex,
      start: performance.now(),
      inDur: 520,
      holdDur: 1900,
      outDur: 600
    });
  }

  // ─── ANIMATION LOOP ───────────────────────────────────────────────────────
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const now = performance.now();

    // Staggered entrance (only until each box has fully arrived)
    boxes.forEach(b => {
      if (b.entered) return;
      const progress = entered ? (now - enterStart - b.enterDelay * 1000) / 650 : 0;
      const scale = progress <= 0 ? 0 : Math.min(1, easeOutBack(progress));
      b.group.scale.set(scale, scale, scale);
      if (progress >= 1) b.entered = true;
    });

    // Slow carousel rotation + gentle bob
    ring.rotation.y += 0.0016;
    boxes.forEach(b => {
      b.group.position.y = Math.sin(t * 1.1 + b.phase) * 0.16;
      if (b.claimed) {
        b.group.rotation.y = t * 0.35;
        const glow = 0.6 + Math.sin(t * 2.5 + b.phase) * 0.4;
        b.ribbonMat.emissiveIntensity = glow;
        b.bowMat.emissiveIntensity = glow;
      }
    });

    // Sparkle particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.userData.life -= 0.016 * 1.4;
      if (p.userData.life <= 0) {
        scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        particles.splice(i, 1);
        continue;
      }
      p.position.add(p.userData.vel);
      p.userData.vel.y -= 0.045;
      p.material.opacity = Math.max(0, p.userData.life);
      p.scale.multiplyScalar(0.985);
    }

    // Success notification toast
    for (let i = notifications.length - 1; i >= 0; i--) {
      const n = notifications[i];
      const el = performance.now() - n.start;

      if (el < n.inDur) {
        const p = el / n.inDur;
        const s = easeOutBack(p);
        n.sprite.scale.set(3.4 * s, 0.85 * s, 1);
        n.sprite.position.y = 1.15 + (1 - p) * 0.7;
        n.mat.opacity = p;
      } else if (el < n.inDur + n.holdDur) {
        n.mat.opacity = 1;
        const pulse = 1 + Math.sin(el * 0.006) * 0.03;
        n.sprite.scale.set(3.4 * pulse, 0.85 * pulse, 1);
      } else if (el < n.inDur + n.holdDur + n.outDur) {
        const p = (el - n.inDur - n.holdDur) / n.outDur;
        n.mat.opacity = 1 - p;
        n.sprite.scale.set(3.4 * (1 - p * 0.15), 0.85 * (1 - p * 0.15), 1);
      } else {
        scene.remove(n.sprite);
        n.mat.dispose();
        n.tex.dispose();
        notifications.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
  }
  animate();

  // ─── RESIZE ───────────────────────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    width = stage.clientWidth || 820;
    height = stage.clientHeight || 320;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
  ro.observe(stage);

  return {
    markClaimed,
    showNotification,
    dispose() {
      io.disconnect();
      ro.disconnect();
      renderer.dispose();
      boxes.forEach(b => {
        b.group.traverse(mesh => {
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) mesh.material.dispose();
        });
      });
    }
  };
}
