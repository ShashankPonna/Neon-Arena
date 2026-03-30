/* ═══════════════════════════════════════════════════════════
   audio.js — Retro Web Audio API Synthesizer
   Generates 8-bit / neon-style sound effects purely with math,
   requiring no external sound files.
   ═══════════════════════════════════════════════════════════ */

class NeonAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.initialized = false;
  }

  // Must be called upon first user interaction (e.g. key press or click)
  init() {
    if (this.initialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Default volume 30%
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;
  }

  /* ── Tone Generator Helper ──────────────────────────────── */
  playTone(freq, type, duration, vol = 1, slideToFreq = null) {
    if (!this.initialized || !this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideToFreq, this.ctx.currentTime + duration);
    }

    gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration * 0.9);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  /* ── Noise Generator Helper (for Dash/Damage/Explosions) ── */
  playNoise(duration, vol = 1, filterFreq = 1000) {
    if (!this.initialized || !this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1; // White noise
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.exponentialRampToValueAtTime(filterFreq, this.ctx.currentTime + duration);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    noiseSource.start();
  }

  /* ── Specific Game Sounds ───────────────────────────────── */
  
  playStart() {
    this.playTone(440, 'sine', 0.1, 0.5, 880);
    setTimeout(() => this.playTone(660, 'square', 0.3, 0.4, 1320), 100);
  }

  playCoin() {
    this.playTone(1200, 'sine', 0.1, 0.2, 1800);
  }

  playDamage() {
    this.playTone(150, 'sawtooth', 0.4, 0.5, 50);
    this.playNoise(0.3, 0.8, 400); // Thud noise
  }

  playPowerup() {
    this.playTone(300, 'square', 0.6, 0.3, 1200);
  }

  playDash() {
    this.playNoise(0.2, 0.5, 3000); // Quick whoosh
    this.playTone(800, 'sine', 0.15, 0.4, 400); // Downward pitch
  }

  playSkillUnlock() {
    this.playTone(523.25, 'sine', 0.1, 0.3); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.3), 100); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.3, 0.4), 200); // G5
  }

  playGameOver() {
    this.playTone(300, 'sawtooth', 0.3, 0.6, 200);
    setTimeout(() => this.playTone(250, 'sawtooth', 0.3, 0.6, 150), 300);
    setTimeout(() => this.playTone(200, 'sawtooth', 0.8, 0.8, 50), 600);
    setTimeout(() => this.playNoise(1.5, 1.0, 800), 600); // Long crashing static
  }
}

export const audio = new NeonAudio();
