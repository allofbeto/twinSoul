import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
// No official types for this package — declare it in a .d.ts (see note below).
import { createConsumer } from '@rails/actioncable';
import type { RevealAsset, StagedAsset } from './types';

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
}

export function useTable({ campaignId, role, token }: UseTableArgs): UseTable {
  const [stage, setStage] = useState<StagedAsset[]>([]);
  const stageRef = useRef<StagedAsset[]>([]);
  stageRef.current = stage;
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
        received(data: { type: string; assets: StagedAsset[] | null }) {
          if (data.type === 'reveal') setStage(data.assets ?? []);
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

  return { stage, addToStage, removeFromStage, moveAsset, clearStage };
}
