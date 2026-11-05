/**
 * Zero-dependency Web Audio Sound Synthesizer for Recall.
 * Provides snappy auditory feedback for correct answers, mistakes, and victory.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  constructor() {
    // Check if muted in localStorage
    const saved = localStorage.getItem('recall_sound_muted');
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('recall_sound_muted', String(this.isMuted));
    return this.isMuted;
  }

  public playCorrect() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // High-yield harmonious two-tone chime (E5 -> G#5)
      [
        { freq: 659.25, time: 0, dur: 0.12 },
        { freq: 830.61, time: 0.1, dur: 0.25 },
      ].forEach(({ freq, time, dur }) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.15, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch {
      // Ignore audio failure gracefully
    }
  }

  public playWrong() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Soft gentle low thud (C3)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130.81, now);
      osc.frequency.exponentialRampToValueAtTime(110.0, now + 0.2);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Ignore audio failure
    }
  }

  public playError() {
    this.playWrong();
  }

  public playTick() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Ignore audio failure
    }
  }

  public playVictory() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Arpeggio fanfare: C5 -> E5 -> G5 -> C6
      [
        { freq: 523.25, time: 0, dur: 0.12 },
        { freq: 659.25, time: 0.1, dur: 0.12 },
        { freq: 783.99, time: 0.2, dur: 0.14 },
        { freq: 1046.5, time: 0.32, dur: 0.35 },
      ].forEach(({ freq, time, dur }) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.18, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch {
      // Ignore audio failure
    }
  }

  // Ambient Focus Generator for ADHD / Just Start Mode
  private ambientSource: any = null;
  private ambientGain: GainNode | null = null;

  public startFocusAmbient(type: 'rain' | 'drone') {
    this.stopFocusAmbient();
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const master = this.ctx.createGain();
      master.gain.setValueAtTime(0.08, this.ctx.currentTime);
      master.connect(this.ctx.destination);
      this.ambientGain = master;

      if (type === 'rain') {
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          output[i] = (b0 + b1 + b2) * 0.11;
        }
        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(700, this.ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(master);
        whiteNoise.start();
        this.ambientSource = whiteNoise;
      } else {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(110, this.ctx.currentTime);
        osc2.frequency.setValueAtTime(164.81, this.ctx.currentTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(master);

        osc1.start();
        osc2.start();
        this.ambientSource = filter;
      }
    } catch {}
  }

  public stopFocusAmbient() {
    try {
      if (this.ambientSource) {
        if ('stop' in this.ambientSource) {
          (this.ambientSource as any).stop();
        }
        this.ambientSource.disconnect();
        this.ambientSource = null;
      }
      if (this.ambientGain) {
        this.ambientGain.disconnect();
        this.ambientGain = null;
      }
    } catch {}
  }
}

export const soundManager = new SoundManager();

