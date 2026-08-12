import { CONFIG } from '../config.js';

// MP3 playlist playback only — no synth fallback. Tracks play in order and
// then loop back to the first. Autoplay-blocking is handled by retrying the
// current MP3 on the next user gesture.
let isPlaying = false;
let audioElements = [];
let mp3Ready = [];
let mp3Failed = [];
let currentIndex = 0;

export function initAudio() {
  const musicBar = document.getElementById('music-player-bar');
  const playBtn = document.getElementById('music-play-btn');
  const playIcon = document.getElementById('music-play-icon');
  const statusText = document.getElementById('music-status-text');
  const trackNameEl = document.getElementById('music-track-name');

  const playlist =
    (Array.isArray(CONFIG.musicPlaylist) && CONFIG.musicPlaylist.length)
      ? CONFIG.musicPlaylist
      : [{ file: CONFIG.musicFile || '', track: CONFIG.musicTrack || 'Birthday Song 🎶' }];

  playlist.forEach((entry) => {
    const idx = audioElements.length;
    mp3Ready.push(false);
    mp3Failed.push(false);

    const el = new Audio(entry.file);
    el.loop = false;
    el.volume = 0.5;
    el.preload = 'auto';
    el.addEventListener('canplay', () => { mp3Ready[idx] = true; });
    el.addEventListener('error', () => { mp3Failed[idx] = true; });
    el.addEventListener('ended', () => { nextTrack(); });
    el.load();
    audioElements.push(el);
  });

  function currentLabel() {
    return (playlist[currentIndex] && playlist[currentIndex].track) || 'Birthday Song 🎶';
  }

  function setUI(playing, label) {
    if (musicBar) musicBar.classList.toggle('playing', playing);
    if (playIcon) playIcon.textContent = playing ? '⏸' : '▶';
    if (trackNameEl) trackNameEl.textContent = currentLabel();
    if (statusText) {
      statusText.textContent = !playing
        ? 'Paused'
        : (label || `Playing ${currentLabel()}`);
    }
  }

  function startMp3At(idx) {
    const el = audioElements[idx];
    if (!el) return;

    audioElements.forEach((a, i) => {
      if (i !== idx && a && !a.paused) a.pause();
    });

    const p = el.play();

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
      if (mp3Failed[idx]) {
        // This MP3 is genuinely broken/missing — move on to the next.
        isPlaying = false;
        nextTrack();
      } else {
        // Autoplay was blocked by the browser. Stay paused so the next
        // user gesture retries the MP3.
        isPlaying = false;
        setUI(false);
      }
    });
  }

  function nextTrack() {
    if (!audioElements.length) return;
    currentIndex = (currentIndex + 1) % audioElements.length;
    if (isPlaying) {
      startMp3At(currentIndex);
    }
  }

  window.startAudioPlayback = function() {
    if (isPlaying) return;

    if (audioElements.length && audioElements.some((_, i) => !mp3Failed[i])) {
      startMp3At(currentIndex);
    } else if (audioElements.length) {
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

    audioElements.forEach((el) => {
      if (el && !el.paused) el.pause();
    });
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
