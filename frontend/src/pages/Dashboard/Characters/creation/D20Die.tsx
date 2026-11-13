import React, { useEffect, useRef, useState } from 'react';
import { playClatter, playLand } from './diceSound';

const FRAME_COUNT = 24;
const frameUrl = (i: number) => `${process.env.PUBLIC_URL}/dice/d20-${i}.webp`;
const REST_URL = `${process.env.PUBLIC_URL}/dice/d20-rest.webp`;

// Warm the browser cache so the first roll doesn't flicker.
let preloaded = false;
export const preloadDice = () => {
  if (preloaded) return;
  preloaded = true;
  [...Array.from({ length: FRAME_COUNT }, (_, i) => frameUrl(i)), REST_URL].forEach((src) => {
    const img = new Image();
    img.src = src;
  });
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// How a 4d6-drop-lowest total feels.
export const rollTier = (total: number) =>
  total >= 18 ? 'legendary' : total >= 15 ? 'great' : total <= 7 ? 'grim' : total <= 9 ? 'poor' : 'fair';

interface Props {
  /** Bumps each time a new roll starts. */
  rollId: number;
  /** Delay before this die is thrown (ms), so the six land one after another. */
  delay: number;
  value: number | null;
  assignedTo?: string; // e.g. "STR" once the score is placed
  index: number;
  onSettled?: () => void;
}

// One tumbling d20: launches, spins through the frames, slows down and lands showing `value`.
const D20Die = ({ rollId, delay, value, assignedTo, index, onSettled }: Props) => {
  const [frame, setFrame] = useState<number | null>(null);
  const [transform, setTransform] = useState('');
  const [landed, setLanded] = useState(false);
  const [inFlight, setInFlight] = useState(false); // thrown but not landed yet
  const [flash, setFlash] = useState(0);
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;

  useEffect(() => {
    if (!rollId) return;
    let cancelled = false;
    const timers: number[] = [];
    const wait = (ms: number) => new Promise<void>((r) => timers.push(window.setTimeout(r, ms)));

    const run = async () => {
      setLanded(false);
      setInFlight(true);
      if (prefersReducedMotion()) {
        await wait(delay / 3);
      } else {
        await wait(delay);
        let idx = Math.floor(Math.random() * FRAME_COUNT);
        // Launch: a high arc out of the hand.
        for (let i = 0; i < 8 && !cancelled; i++) {
          idx = (idx + 2) % FRAME_COUNT;
          setFrame(idx);
          const arc = Math.sin((i / 7) * Math.PI);
          setTransform(`translateY(${-arc * 40}px) rotate(${(i - 4) * 11}deg) scale(${1 + arc * 0.12})`);
          await wait(40);
        }
        // Tumble: fast spin that slows, with bounces that die away.
        const steps = 24 + Math.floor(Math.random() * 6);
        for (let i = 0; i < steps && !cancelled; i++) {
          idx = (idx + 1 + (i < 10 ? 1 : 0)) % FRAME_COUNT;
          setFrame(idx);
          const p = i / (steps - 1);
          const bounce = Math.abs(Math.sin(i * 0.9)) * (1 - p) * 18;
          const x = (Math.random() - 0.5) * (1 - p) * 12;
          const rot = (Math.random() - 0.5) * (1 - p) * 24;
          setTransform(`translate(${x}px,${-bounce}px) rotate(${rot}deg) scale(${1.02 + (1 - p) * 0.06})`);
          if (i % 3 === 0 && p < 0.85) playClatter();
          await wait(22 + Math.pow(p, 2.6) * 85);
        }
      }
      if (cancelled) return;
      setFrame(null);
      setTransform('');
      setLanded(true);
      setInFlight(false);
      setFlash((f) => f + 1);
      playLand();
      settledRef.current?.();
    };
    run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // Only a new roll restarts the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollId]);

  const rolling = frame !== null;
  const shown = !rolling && !inFlight && value !== null;
  const tier = value !== null && shown ? rollTier(value) : '';
  return (
    <div className={`d20 ${rolling ? 'is-rolling' : ''} ${landed ? 'is-landed' : ''} ${tier ? `is-${tier}` : ''}`}>
      <div className="d20-stage">
        <span className="d20-shadow" aria-hidden />
        {flash > 0 && <span key={flash} className="d20-flash" aria-hidden />}
        {flash > 0 && tier === 'legendary' && <span key={`burst-${flash}`} className="d20-burst" aria-hidden />}
        <img
          src={rolling ? frameUrl(frame!) : REST_URL}
          alt=""
          className={`d20-img ${landed ? 'd20-settle' : ''}`}
          style={{ transform }}
          draggable={false}
        />
        {shown && <span className="d20-face" aria-label={`Roll ${index + 1}: ${value}`}>{value}</span>}
      </div>
      <div className="d20-assigned">
        {shown && assignedTo
          ? <>→ <strong>{assignedTo}</strong></>
          : <span className="d20-pips-empty">{inFlight ? 'rolling…' : `Roll ${index + 1}`}</span>}
      </div>
    </div>
  );
};

export default D20Die;
