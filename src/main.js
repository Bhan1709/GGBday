import { CONFIG } from './config.js';
import { initParticles } from './modules/particles.js';
import { initThreeScene } from './modules/three_scene.js';
import { triggerCelebrationConfetti } from './modules/confetti.js';
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

  // 4. Initialize Audio Engine
  initAudio();

  // 5. Handle Entrance Realm Modal
  const entranceModal = document.getElementById('entrance-modal');
  const enterBtn = document.getElementById('enter-realm-btn');

  function dismissModal() {
    if (!entranceModal) return;
    // Start audio on first interaction
    if (window.startAudioPlayback) {
      window.startAudioPlayback();
    }
    triggerCelebrationConfetti();

    entranceModal.style.opacity = '0';
    entranceModal.style.pointerEvents = 'none';
    setTimeout(() => {
      entranceModal.style.display = 'none';
    }, 700);
  }

  if (enterBtn) {
    enterBtn.addEventListener('click', dismissModal);
  }

  // Also dismiss on any first interaction with the modal overlay itself
  if (entranceModal) {
    entranceModal.addEventListener('click', dismissModal, { once: true });
    entranceModal.addEventListener('touchstart', dismissModal, { once: true });
    entranceModal.addEventListener('keydown', dismissModal, { once: true });
  }

  // Auto-dismiss after 3.5 s so music plays even if user doesn't interact
  // (browsers allow audio after minimal page render time on some platforms)
  // The audio engine already attempts auto-play; this ensures the curtain always lifts.
  setTimeout(() => {
    if (entranceModal && entranceModal.style.display !== 'none') {
      dismissModal();
    }
  }, 3500);

  // 6. Initialize Interactive Cake
  await initCake();

  // 7. Initialize Wax Sealed Love Letter
  initLetter(CONFIG.loveLetter);

  // 8. Initialize Random Photo Collage
  initPhotoCollage(CONFIG.photos);

  // 9. Initialize 12-Transfer Birthday Gift Cards
  initGiftCards(CONFIG);
});
