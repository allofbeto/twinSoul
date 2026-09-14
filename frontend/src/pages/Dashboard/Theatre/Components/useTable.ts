import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
// No official types for this package — declare it in a .d.ts (see note below).
import { createConsumer } from '@rails/actioncable';
import type { CharacterAddPayload, Combatant, RevealAsset, StagedAsset } from './types';

// Point this at your Rails cable endpoint. In dev that's the API host;
// in prod, wherever ActionCable is mounted.
const CABLE_URL = process.env.REACT_APP_CABLE_URL ?? 'ws://localhost:3000/cable';

const makeInstanceId = (assetId: string) =>
  `${assetId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// Cascade each new card a bit further right/down so drops don't all land in one spot.
const CASCADE_STEP = 6;
const cascadePosition = (index: number) => ({
  x: 6 + ((index * CASCADE_STEP) % 60),
  y: 6 + ((index * CASCADE_STEP * 0.7) % 55),
});

interface UseTableArgs {
  campaignId: string | null;
  role: 'owner' | 'player' | undefined;
  token: string | null; // JWT, appended to the cable URL for auth
}

interface UseTable {
  stage: StagedAsset[];
  addToStage: (asset: RevealAsset) => void;
  removeFromStage: (instanceId: string) => void;
  moveAsset: (instanceId: string, x: number, y: number) => void;
  clearStage: () => void;
  /** Read-only, already-redacted initiative order — the server strips an
   * unrevealed enemy's name before it ever reaches this connection, so
   * there's nothing to hide client-side. Only meaningful for players; the
   * DM drives their own tracker locally and doesn't consume this. */
  sharedCombatants: Combatant[];
  sharedTurn: number;
  broadcastInitiative: (combatants: Combatant[], turn: number) => void;
  /** The latest "add my character" request from any player — the DM's
   * screen watches this and inserts it into the local tracker; everyone
   * else just ignores it (they have no local tracker to insert into). */
  characterAddRequest: CharacterAddPayload | null;
  /** Any campaign member can call this for their own character — the
   * server looks it up by id (scoped to this user + campaign) rather than
   * trusting whatever stats are passed in. */
  requestAddCharacter: (characterId: string) => void;
}

export function useTable({ campaignId, role, token }: UseTableArgs): UseTable {
  const [stage, setStage] = useState<StagedAsset[]>([]);
  const stageRef = useRef<StagedAsset[]>([]);
  stageRef.current = stage;
  const [sharedCombatants, setSharedCombatants] = useState<Combatant[]>([]);
  const [sharedTurn, setSharedTurn] = useState(0);
  const [characterAddRequest, setCharacterAddRequest] = useState<CharacterAddPayload | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subRef = useRef<any>(null);

  const consumer = useMemo(() => {
    if (!token) return null;
    return createConsumer(`${CABLE_URL}?token=${encodeURIComponent(token)}`);
  }, [token]);

  useEffect(() => {
    if (!consumer || !campaignId) return;

    const sub = consumer.subscriptions.create(
      { channel: 'TableChannel', campaign_id: campaignId },
      {
        received(data: {
          type: string;
          assets?: StagedAsset[];
          combatants?: Combatant[];
          turn?: number;
          character?: CharacterAddPayload;
        }) {
          if (data.type === 'reveal') setStage(data.assets ?? []);
          else if (data.type === 'initiative') {
            setSharedCombatants(data.combatants ?? []);
            setSharedTurn(data.turn ?? 0);
          } else if (data.type === 'add_character' && data.character) {
            setCharacterAddRequest(data.character);
          }
        },
      },
    );
    subRef.current = sub;

    return () => {
      sub.unsubscribe();
      subRef.current = null;
    };
  }, [consumer, campaignId]);

  useEffect(() => () => { consumer?.disconnect(); }, [consumer]);

  // Owner drives: optimistic local update + broadcast the full list to the table.
  const broadcast = useCallback((next: StagedAsset[]) => {
    if (role !== 'owner') return;
    setStage(next);
    subRef.current?.perform('reveal', { assets: next });
  }, [role]);

  const addToStage = useCallback((asset: RevealAsset) => {
    const { x, y } = cascadePosition(stageRef.current.length);
    broadcast([...stageRef.current, { ...asset, instanceId: makeInstanceId(asset.id), x, y }]);
  }, [broadcast]);

  const removeFromStage = useCallback((instanceId: string) => {
    broadcast(stageRef.current.filter((s) => s.instanceId !== instanceId));
  }, [broadcast]);

  const moveAsset = useCallback((instanceId: string, x: number, y: number) => {
    broadcast(stageRef.current.map((s) => (s.instanceId === instanceId ? { ...s, x, y } : s)));
  }, [broadcast]);

  const clearStage = useCallback(() => broadcast([]), [broadcast]);

  // The DM's tracker is authoritative on their own screen — this just tells
  // the server what to (redact and) forward to players. No local/optimistic
  // update here since the DM never reads sharedCombatants back.
  const broadcastInitiative = useCallback((combatants: Combatant[], turn: number) => {
    if (role !== 'owner') return;
    subRef.current?.perform('set_initiative', { combatants, turn });
  }, [role]);

  // Any member (not owner-gated) — a player joining their own PC into the fight.
  const requestAddCharacter = useCallback((characterId: string) => {
    subRef.current?.perform('add_character', { character_id: characterId });
  }, []);

  return {
    stage, addToStage, removeFromStage, moveAsset, clearStage,
    sharedCombatants, sharedTurn, broadcastInitiative,
    characterAddRequest, requestAddCharacter,
  };
}
