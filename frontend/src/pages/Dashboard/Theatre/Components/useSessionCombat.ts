import { useCallback, useEffect, useRef } from 'react';
import type { CombatMapRef, Combatant, SavedCombat } from './types';

interface Args {
  /** The session the fight belongs to. */
  sessionId: string | undefined;
  /** Only the DM saves. */
  enabled: boolean;
  /** What that session has saved (read when the session is opened). */
  stored: SavedCombat | null;
  state: { combatants: Combatant[]; turn: number; round: number; combatOn: boolean; map?: CombatMapRef | null };
  /** Put a saved fight back in the tracker, or reset it when there isn't one. */
  restore: (combat: SavedCombat | null) => void;
  save: (sessionId: string, combat: SavedCombat | null) => Promise<unknown>;
  onSaved: (sessionId: string, combat: SavedCombat | null) => void;
  delayMs?: number;
}

const snapshot = (c: SavedCombat | null) => (c ? JSON.stringify({ combatants: c.combatants ?? [], turn: c.turn ?? 0, round: c.round ?? 1, map: c.map ?? null }) : '');

/**
 * Keeps the initiative tracker on the session: opening a session brings its
 * fight back, every change is saved shortly after (and on the way out), and
 * ending combat clears it. Unchanged state is never re-saved.
 */
export function useSessionCombat({ sessionId, enabled, stored, state, restore, save, onSaved, delayMs = 700 }: Args) {
  const saved = useRef('');
  const pending = useRef<{ id: string; payload: SavedCombat | null; json: string } | null>(null);
  const current = useRef({ sessionId, stored });
  current.current = { sessionId, stored };
  const callbacks = useRef({ restore, save, onSaved });
  callbacks.current = { restore, save, onSaved };

  // A different session: bring back its fight (or start clean).
  useEffect(() => {
    if (!sessionId || !enabled) return;
    const combat = current.current.stored;
    callbacks.current.restore(combat);
    saved.current = snapshot(combat);
    pending.current = null;
  }, [sessionId, enabled]);

  const flush = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    callbacks.current.save(p.id, p.payload)
      .then(() => {
        if (p.id === current.current.sessionId) saved.current = p.json;
        callbacks.current.onSaved(p.id, p.payload);
      })
      .catch(() => { /* the next change tries again */ });
  }, []);

  const { combatants, turn, round, combatOn, map = null } = state;
  useEffect(() => {
    if (!sessionId || !enabled) return undefined;
    // Ending combat leaves nothing to save: that is what clears it from the session.
    const payload: SavedCombat | null = combatOn || combatants.length > 0 ? { combatants, turn, round, ...(map ? { map } : {}) } : null;
    const json = snapshot(payload);
    if (json === saved.current) { pending.current = null; return undefined; }
    pending.current = { id: sessionId, payload, json };
    const timer = setTimeout(flush, delayMs);
    return () => clearTimeout(timer);
  }, [combatants, turn, round, combatOn, map, sessionId, enabled, flush, delayMs]);

  // Closing the theatre or the tab shouldn't lose the last few changes.
  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, [flush]);
}
