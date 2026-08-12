// Canvas Fairy Fireflies & Sunflower Dust Particle System
export function initParticles(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = 55;

  // Ramp-up: fewer particles on load, reaching full density over time.
  const RAMP_START = 0.08;
  const RAMP_TIME_MS = 8000;
  const RAMP_FADE = 8;
  const loadTime = performance.now();

  class FairyParticle {
    constructor() {
      this.reset();
      this.y = Math.random() * height; // Spread initially across viewport
    }

    reset() {
      this.x = Math.random() * width;
      this.y = height + Math.random() * 80;
      this.size = Math.random() * 6 + 3;
      this.speedY = Math.random() * 0.7 + 0.2;
      this.speedX = (Math.random() - 0.5) * 0.6;
      this.pulseSpeed = Math.random() * 0.03 + 0.01;
      this.pulse = Math.random() * Math.PI;
      this.type = Math.random() > 0.3 ? 'firefly' : 'sunflower_dust';
      
      // Color palette: Golden Sunflower Amber, Magical Emerald Fairy Glow, Soft Rose
      const colors = ['#f5b027', '#ffd154', '#81ee9b', '#ff9ebb', '#ffffff'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
      this.y -= this.speedY;
      this.x += Math.sin(this.y * 0.015) * 0.8 + this.speedX;
      this.pulse += this.pulseSpeed;

      if (this.y < -20) {
        this.reset();
      }
    }

    draw(fade = 1) {
      ctx.save();
      ctx.translate(this.x, this.y);
      
      // Glowing pulse alpha
      const currentAlpha = (0.3 + Math.abs(Math.sin(this.pulse)) * 0.6) * fade;
      ctx.globalAlpha = currentAlpha;

      // Glow effect for magical fireflies
      ctx.shadowBlur = this.size * 3;
      ctx.shadowColor = this.color;

      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw faint fairy sparkle cross
      if (this.type === 'firefly' && currentAlpha > 0.6) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-this.size * 1.2, 0);
        ctx.lineTo(this.size * 1.2, 0);
        ctx.moveTo(0, -this.size * 1.2);
        ctx.lineTo(0, this.size * 1.2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new FairyParticle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    const ramp = Math.min(1, RAMP_START + (performance.now() - loadTime) / RAMP_TIME_MS);
    particles.forEach((p, i) => {
      const threshold = i / particleCount;
      if (ramp < threshold) return;
      const fade = Math.min(1, (ramp - threshold) * RAMP_FADE);
      p.update();
      p.draw(fade);
    });
    requestAnimationFrame(animate);
  }

  animate();
}
