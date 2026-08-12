import { CONFIG } from '../config.js';

// MP3 playback only — no synth fallback. If the MP3 is missing or broken,
// we play nothing and surface a small status message. Autoplay-blocking is
// handled by retrying the MP3 on the next user gesture.
let isPlaying = false;
let audioElement = null;
let mp3Ready = false;
let mp3Failed = false;

export function initAudio() {
  const musicBar = document.getElementById('music-player-bar');
  const playBtn = document.getElementById('music-play-btn');
  const playIcon = document.getElementById('music-play-icon');
  const statusText = document.getElementById('music-status-text');

  const MP3_SRC   = CONFIG.musicFile   || '';
  const TRACK_STR = CONFIG.musicTrack  || 'Birthday Song 🎶';

  // Load the provided MP3 from /public (served at root on GitHub Pages / Vite)
  if (MP3_SRC) {
    try {
      audioElement = new Audio(MP3_SRC);
      audioElement.loop = true;
      audioElement.volume = 0.5;
      audioElement.preload = 'auto';
      audioElement.addEventListener('canplay', () => { mp3Ready = true; });
      audioElement.addEventListener('error', () => { mp3Failed = true; });
      audioElement.load();
    } catch (e) {
      audioElement = null;
    }
  }

  function setUI(playing, label) {
    if (musicBar) musicBar.classList.toggle('playing', playing);
    if (playIcon) playIcon.textContent = playing ? '⏸' : '▶';
    if (statusText) {
      statusText.textContent = !playing
        ? 'Paused'
        : (label || `Playing ${TRACK_STR}`);
    }
  }

  function startMp3() {
    if (!audioElement) return;
    const p = audioElement.play();

    // Very old browsers may not return a promise
    if (!p || typeof p.then !== 'function') {
      isPlaying = true;
      setUI(true);
      return;
    }

    p.then(() => {
      isPlaying = true;
      setUI(true);
    }).catch(() => {
      if (mp3Failed) {
        // The MP3 file is genuinely broken/missing — play nothing.
        isPlaying = false;
        setUI(false, 'Music file unavailable');
      } else {
        // Autoplay was blocked by the browser. Stay paused so the next
        // user gesture retries the MP3.
        isPlaying = false;
        setUI(false);
      }
    });
  }

  window.startAudioPlayback = function() {
    if (isPlaying) return;

    if (audioElement && !mp3Failed) {
      startMp3();
    } else if (audioElement) {
      isPlaying = false;
      setUI(false, 'Music file unavailable');
    } else {
      isPlaying = false;
      setUI(false);
    }
  };

  window.pauseAudioPlayback = function() {
    isPlaying = false;
    setUI(false);

    if (audioElement && !audioElement.paused) {
      audioElement.pause();
    }
  };

  function togglePlay() {
    if (isPlaying) {
      window.pauseAudioPlayback();
    } else {
      window.startAudioPlayback();
    }
  }

  if (playBtn) {
    playBtn.addEventListener('click', togglePlay);
  }

  // Attempt auto-start immediately (likely blocked by autoplay policy)
  window.startAudioPlayback();

  // Retry on any first click/touch — this is when the browser allows audio
  const firstGesture = () => {
    window.startAudioPlayback();
    document.removeEventListener('click', firstGesture);
    document.removeEventListener('touchstart', firstGesture);
    document.removeEventListener('keydown', firstGesture);
  };

  document.addEventListener('click', firstGesture, { once: true });
  document.addEventListener('touchstart', firstGesture, { once: true });
  document.addEventListener('keydown', firstGesture, { once: true });
}
