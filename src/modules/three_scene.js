// Three.js Interactive 3D Magical Fairy Garden Engine
export function initThreeScene(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (typeof THREE === 'undefined') {
    console.warn('Three.js CDN not loaded yet, falling back to 2D particle canvas.');
    return;
  }

  // 1. Scene, Camera & WebGL Renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 25;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 2. Mouse Tracking
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  window.addEventListener('mousemove', (e) => {
    mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
  });
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      mouse.targetX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
    }
  });

  // ─── HEART SHAPE ─────────────────────────────────────────────────────────────
  function createHeartShape(size) {
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

  const heartGeo = new THREE.ShapeGeometry(createHeartShape(0.26)); // increased from 0.18

  const heartPalette = ['#ffc44d', '#f5a623', '#f497aa', '#e2738c', '#ff6ba8', '#ffd6e8', '#ffffff', '#ffb3c6'];

  // 3. Floating Hearts (120, bigger scale)
  const heartCount = 120;
  const hearts = [];
  for (let i = 0; i < heartCount; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(heartPalette[Math.floor(Math.random() * heartPalette.length)]),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: Math.random() * 0.45 + 0.45
    });
    const mesh = new THREE.Mesh(heartGeo, mat);
    mesh.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 40);
    const s = Math.random() * 1.0 + 0.45; // bigger range
    mesh.scale.set(s, s, s);
    mesh.rotation.z = (Math.random() - 0.5) * Math.PI * 0.5;
    scene.add(mesh);
    hearts.push({
      mesh,
      driftX: (Math.random() - 0.5) * 0.02,
      driftY: Math.random() * 0.018 + 0.005,
      spinZ: (Math.random() - 0.5) * 0.012,
      phaseOffset: Math.random() * Math.PI * 2
    });
  }

  // ─── FLOWER SHAPE ─────────────────────────────────────────────────────────────
  function createFlowerShape(r, petalCount) {
    const shape = new THREE.Shape();
    const step = (Math.PI * 2) / petalCount;
    shape.moveTo(0, 0);
    for (let i = 0; i < petalCount; i++) {
      const angle = i * step;
      const midAngle = angle + step * 0.5;
      const cx = Math.cos(midAngle) * r * 1.6;
      const cy = Math.sin(midAngle) * r * 1.6;
      const ex = Math.cos(angle + step) * r * 0.3;
      const ey = Math.sin(angle + step) * r * 0.3;
      shape.quadraticCurveTo(cx, cy, ex, ey);
    }
    shape.closePath();
    return shape;
  }

  const flowerPalette = [
    { petal: '#ffd700', center: '#ff8c00' }, // sunflower
    { petal: '#ffb3c6', center: '#e2738c' }, // cherry blossom
    { petal: '#ffffff', center: '#ffc44d' }, // white daisy
    { petal: '#f497aa', center: '#fff0a0' }, // pink rose
    { petal: '#ffe0b2', center: '#f5a623' }, // peach blossom
  ];

  const flowerCount = 35;
  const flowers = [];

  for (let i = 0; i < flowerCount; i++) {
    const scheme = flowerPalette[Math.floor(Math.random() * flowerPalette.length)];
    const petalCount = Math.random() > 0.5 ? 5 : 6;
    const flowerGeo = new THREE.ShapeGeometry(createFlowerShape(0.22, petalCount));
    const centerGeo = new THREE.CircleGeometry(0.09, 12);

    const petalMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(scheme.petal),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: Math.random() * 0.4 + 0.5
    });
    const centerMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(scheme.center),
      transparent: true,
      opacity: 0.9
    });

    const group = new THREE.Group();
    const petalMesh = new THREE.Mesh(flowerGeo, petalMat);
    const centerMesh = new THREE.Mesh(centerGeo, centerMat);
    centerMesh.position.z = 0.01;
    group.add(petalMesh);
    group.add(centerMesh);

    group.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 38);
    const fs = Math.random() * 0.9 + 0.4;
    group.scale.set(fs, fs, fs);
    group.rotation.z = Math.random() * Math.PI * 2;

    scene.add(group);
    flowers.push({
      mesh: group,
      driftX: (Math.random() - 0.5) * 0.015,
      driftY: Math.random() * 0.014 + 0.003,
      spinZ: (Math.random() - 0.5) * 0.008,
      phaseOffset: Math.random() * Math.PI * 2
    });
  }

  // ─── BUTTERFLIES (increased to 14) ───────────────────────────────────────────
  const butterflyColors = ['#ffd700', '#ff94b8', '#ffb833', '#ffffff', '#f497aa', '#ffe0b2', '#b0f4b8'];

  function create3DButterfly(colorHex) {
    const group = new THREE.Group();
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0,  0.8, 1.2, 0,  1.5, 0.4, 0,  1.2, -0.6, 0,  0.4, -1.0, 0,  0, 0, 0
    ]), 3));
    const wingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    const rightWing = new THREE.Mesh(wingGeo, wingMat.clone());
    leftWing.rotation.y = Math.PI / 4;
    rightWing.rotation.y = -Math.PI / 4;
    rightWing.scale.x = -1;
    group.add(leftWing);
    group.add(rightWing);
    return {
      mesh: group, leftWing, rightWing,
      speedX: (Math.random() - 0.5) * 0.04,
      speedY: Math.random() * 0.03 + 0.008,
      speedZ: (Math.random() - 0.5) * 0.02,
      wingSpeed: Math.random() * 0.15 + 0.08,
      wingAngle: Math.random() * Math.PI * 2
    };
  }

  const butterflyGroup = new THREE.Group();
  scene.add(butterflyGroup);
  const butterflies = [];

  for (let i = 0; i < 14; i++) { // increased from 6
    const col = butterflyColors[i % butterflyColors.length];
    const b = create3DButterfly(col);
    b.mesh.position.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 28, (Math.random() - 0.5) * 22);
    const bs = Math.random() * 0.4 + 0.5;
    b.mesh.scale.set(bs, bs, bs);
    butterflyGroup.add(b.mesh);
    butterflies.push(b);
  }

  // ─── LIGHTS ───────────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const pointLight = new THREE.PointLight(0xffc44d, 1.5, 50);
  pointLight.position.set(0, 5, 10);
  scene.add(pointLight);

  // ─── ANIMATION LOOP ───────────────────────────────────────────────────────────
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;
    camera.position.x = mouse.x * 3;
    camera.position.y = mouse.y * 2;
    camera.lookAt(scene.position);

    // Hearts
    hearts.forEach((h) => {
      h.mesh.position.y += h.driftY;
      h.mesh.position.x += h.driftX + Math.sin(t * 0.6 + h.phaseOffset) * 0.008;
      h.mesh.rotation.z += h.spinZ;
      if (h.mesh.position.y > 26) h.mesh.position.y = -26;
      if (h.mesh.position.x > 31) h.mesh.position.x = -31;
      if (h.mesh.position.x < -31) h.mesh.position.x = 31;
    });

    // Flowers
    flowers.forEach((f) => {
      f.mesh.position.y += f.driftY;
      f.mesh.position.x += f.driftX + Math.cos(t * 0.5 + f.phaseOffset) * 0.006;
      f.mesh.rotation.z += f.spinZ;
      if (f.mesh.position.y > 26) f.mesh.position.y = -26;
      if (f.mesh.position.x > 31) f.mesh.position.x = -31;
      if (f.mesh.position.x < -31) f.mesh.position.x = 31;
    });

    // Butterflies
    butterflies.forEach((b) => {
      b.wingAngle += b.wingSpeed;
      const flap = Math.sin(b.wingAngle) * 0.7;
      b.leftWing.rotation.y = flap;
      b.rightWing.rotation.y = -flap;
      b.mesh.position.x += b.speedX + Math.sin(t * 0.8) * 0.01;
      b.mesh.position.y += b.speedY;
      b.mesh.position.z += b.speedZ;
      if (b.mesh.position.y > 20) b.mesh.position.y = -20;
      if (b.mesh.position.x > 25) b.mesh.position.x = -25;
      if (b.mesh.position.x < -25) b.mesh.position.x = 25;
    });

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
