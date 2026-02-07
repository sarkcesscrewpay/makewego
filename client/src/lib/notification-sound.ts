// client/src/lib/notification-sound.ts
// Notification sound utility using Web Audio API

let audioContext: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Unlock AudioContext on first user interaction (required by mobile browsers)
function unlockAudio() {
  if (audioUnlocked) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Play a silent buffer to fully unlock on iOS/Android
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    audioUnlocked = true;
  } catch (_) {}
}

// Register unlock listeners once
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'mousedown', 'keydown', 'click'];
  const onUnlock = () => {
    unlockAudio();
    unlockEvents.forEach(e => document.removeEventListener(e, onUnlock, true));
  };
  unlockEvents.forEach(e => document.addEventListener(e, onUnlock, true));
}

// Play a bell-like tone at the given frequency
function playBellTone(ctx: AudioContext, freq: number, startTime: number, duration: number, volume: number) {
  // Main tone (triangle wave for warm bell sound)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.setValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);

  // Harmonic overtone for brightness (sine, one octave up, quieter)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, startTime);
  gain2.gain.setValueAtTime(0, startTime);
  gain2.gain.linearRampToValueAtTime(volume * 0.25, startTime + 0.02);
  gain2.gain.exponentialRampToValueAtTime(0.01, startTime + duration * 0.6);
  osc2.start(startTime);
  osc2.stop(startTime + duration);
}

// Driver notification: urgent ascending tri-tone alert (~3 seconds)
// Pattern: C5-E5-G5 arpeggio repeated 3 times with increasing urgency
export async function playDriverNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.50;

    // Round 1: C5 → E5 → G5 (gentle)
    playBellTone(ctx, C5, now, 0.3, 0.25);
    playBellTone(ctx, E5, now + 0.15, 0.3, 0.25);
    playBellTone(ctx, G5, now + 0.30, 0.4, 0.28);

    // Round 2: C5 → E5 → G5 (stronger)
    playBellTone(ctx, C5, now + 1.0, 0.3, 0.30);
    playBellTone(ctx, E5, now + 1.15, 0.3, 0.30);
    playBellTone(ctx, G5, now + 1.30, 0.4, 0.33);

    // Round 3: C5 → E5 → G5 → C6 (full, with high resolve)
    playBellTone(ctx, C5, now + 2.0, 0.3, 0.28);
    playBellTone(ctx, E5, now + 2.15, 0.3, 0.28);
    playBellTone(ctx, G5, now + 2.30, 0.35, 0.30);
    playBellTone(ctx, C6, now + 2.50, 0.5, 0.22);

  } catch (error) {
    console.warn('Could not play driver notification sound:', error);
  }
}

// Passenger notification: soft double-chime (~2 seconds)
export async function playPassengerNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const G5 = 783.99, D6 = 1174.66;

    // Soft two-tone doorbell chime, repeated twice
    playBellTone(ctx, G5, now, 0.4, 0.20);
    playBellTone(ctx, D6, now + 0.2, 0.5, 0.15);

    playBellTone(ctx, G5, now + 1.0, 0.4, 0.18);
    playBellTone(ctx, D6, now + 1.2, 0.5, 0.13);

  } catch (error) {
    console.warn('Could not play passenger notification sound:', error);
  }
}

// Generic notification sound (defaults to passenger style)
export async function playNotificationSound() {
  return playPassengerNotificationSound();
}

// Check if sound is enabled in localStorage
export function isSoundEnabled(): boolean {
  const stored = localStorage.getItem('notificationSoundEnabled');
  return stored !== 'false'; // Default to enabled
}

// Toggle sound setting
export function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem('notificationSoundEnabled', enabled ? 'true' : 'false');
}

// Play sound only if enabled (role-aware)
export function playNotificationSoundIfEnabled(role?: string) {
  if (isSoundEnabled()) {
    if (role === 'driver') {
      playDriverNotificationSound();
    } else {
      playPassengerNotificationSound();
    }
  }
}
