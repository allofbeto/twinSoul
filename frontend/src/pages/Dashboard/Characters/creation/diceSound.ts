// Tiny synthesized dice sounds (no audio files). Off unless the player turns them on.

const KEY = 'twinsoul.diceSound';
let ctx: AudioContext | null = null;

export const diceSoundOn = () => {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
};

export const setDiceSound = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* private mode: sound simply stays off next time */
  }
};

const audio = () => {
  if (!diceSoundOn()) return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

// A short filtered noise burst: `bright` for the clatter, dull for the landing.
const burst = (duration: number, freq: number, gain: number) => {
  const a = audio();
  if (!a) return;
  const len = Math.floor(a.sampleRate * duration);
  const buffer = a.createBuffer(1, len, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 1.2;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(a.destination);
  src.start();
};

export const playClatter = () => burst(0.035, 2600 + Math.random() * 1600, 0.18);
export const playLand = () => burst(0.12, 420, 0.5);
export const playFanfare = () => {
  const a = audio();
  if (!a) return;
  [523.25, 659.25, 783.99].forEach((f, i) => {
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const t = a.currentTime + i * 0.09;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(g).connect(a.destination);
    osc.start(t);
    osc.stop(t + 0.55);
  });
};
