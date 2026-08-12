import { CONFIG } from './config.js';
import { initParticles } from './modules/particles.js';
import { initThreeScene } from './modules/three_scene.js';
import { initHeroTitle } from './modules/hero_title.js';
import { initCake } from './modules/cake.js';
import { initLetter } from './modules/letter.js';
import { initPhotoCollage } from './modules/photo_collage.js';
import { initGiftCards } from './modules/giftcard.js';
import { initAudio } from './modules/audio.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Personalize text from CONFIG
  const heroName = document.getElementById('hero-name');
  if (heroName && CONFIG.fianceName) {
    heroName.textContent = `${CONFIG.fianceName} 💖`;
  }

  // 2. Initialize Three.js 3D WebGL Scene (3D Hearts & Interactive Mouse Trail)
  try {
    initThreeScene('three-canvas');
  } catch (e) {
    console.warn('Three.js scene init fallback:', e);
  }

  // 3. Initialize Fallback 2D Particles Canvas
  initParticles('particle-canvas');

  // 3.5. Initialize Interactive Three.js Hero Title
  try {
    initHeroTitle();
  } catch (e) {
    console.warn('Hero title 3D init fallback:', e);
  }

  // 4. Initialize Audio Engine
  initAudio();
  // Start music immediately on page load
  if (window.startAudioPlayback) {
    window.startAudioPlayback();
  }

  // 5. Initialize Interactive Cake
  await initCake();

  // 7. Initialize Wax Sealed Love Letter
  initLetter(CONFIG.loveLetter);

  // 8. Initialize Random Photo Collage
  initPhotoCollage(CONFIG.photos);

  // 9. Initialize 12 Birthday Gifts
  initGiftCards(CONFIG);
});
