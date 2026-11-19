/**
 * Gentle, browser-native Web Audio API synthesizer for Mindful Play activities.
 * Lazily initialized on user gesture and strictly capped to soft, non-startling volumes.
 */

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let sharedAudioContext: AudioContext | null = null;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;

  try {
    if (!sharedAudioContext) {
      const AudioCtor =
        window.AudioContext || (window as WebkitAudioWindow).webkitAudioContext;
      if (!AudioCtor) return null;
      sharedAudioContext = new AudioCtor();
    }

    if (sharedAudioContext.state === 'suspended') {
      void sharedAudioContext.resume().catch(() => {
        // Ignore autoplay resume rejection silently
      });
    }

    return sharedAudioContext;
  } catch {
    return null;
  }
};

export interface GentleToneOptions {
  volume?: number;
  duration?: number;
}

/**
 * Plays a warm, celesta / music-box style chime note with zero harsh clicks.
 */
export const playMusicBoxTone = (
  frequencyHz: number,
  options: GentleToneOptions = {}
): void => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const freq = clamp(frequencyHz, 180, 1400);
  const peakGain = clamp(options.volume ?? 0.11, 0.01, 0.14);
  const duration = clamp(options.duration ?? 1.45, 0.3, 2.4);

  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(peakGain, now + 0.018);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  master.connect(ctx.destination);

  // Warm sine fundamental
  const fundamental = ctx.createOscillator();
  fundamental.type = 'sine';
  fundamental.frequency.setValueAtTime(freq, now);
  fundamental.connect(master);

  // Soft music-box octave sparkle
  const overtoneGain = ctx.createGain();
  overtoneGain.gain.setValueAtTime(0.18, now);
  overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.55);
  overtoneGain.connect(master);

  const overtone = ctx.createOscillator();
  overtone.type = 'triangle';
  overtone.frequency.setValueAtTime(freq * 2, now);
  overtone.connect(overtoneGain);

  fundamental.start(now);
  overtone.start(now);

  const stopTime = now + duration + 0.04;
  fundamental.stop(stopTime);
  overtone.stop(stopTime);

  fundamental.onended = () => {
    try {
      fundamental.disconnect();
      overtone.disconnect();
      overtoneGain.disconnect();
      master.disconnect();
    } catch {
      // Already cleaned up
    }
  };
};

/**
 * Plays a serene water-droplet / soft singing-bowl tone for Zen Ripple Pond.
 */
export const playWaterDropTone = (
  frequencyHz: number,
  options: GentleToneOptions = {}
): void => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const freq = clamp(frequencyHz, 200, 1200);
  const peakGain = clamp(options.volume ?? 0.08, 0.01, 0.11);
  const duration = clamp(options.duration ?? 1.05, 0.3, 2.0);

  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(peakGain, now + 0.025);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  master.connect(ctx.destination);

  // Subtle upward water-drop pitch shimmer
  const dropOsc = ctx.createOscillator();
  dropOsc.type = 'sine';
  dropOsc.frequency.setValueAtTime(freq * 0.92, now);
  dropOsc.frequency.exponentialRampToValueAtTime(freq, now + 0.09);
  dropOsc.connect(master);

  // Quiet warm undertone
  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.16, now);
  subGain.connect(master);

  const subOsc = ctx.createOscillator();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(freq * 0.5, now);
  subOsc.connect(subGain);

  dropOsc.start(now);
  subOsc.start(now);

  const stopTime = now + duration + 0.04;
  dropOsc.stop(stopTime);
  subOsc.stop(stopTime);

  dropOsc.onended = () => {
    try {
      dropOsc.disconnect();
      subOsc.disconnect();
      subGain.disconnect();
      master.disconnect();
    } catch {
      // Already cleaned up
    }
  };
};
