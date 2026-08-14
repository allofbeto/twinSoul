import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
// No official types for this package — declare it in a .d.ts (see note below).
import { createConsumer } from '@rails/actioncable';
import type { RevealAsset } from './types';

// Point this at your Rails cable endpoint. In dev that's the API host;
// in prod, wherever ActionCable is mounted.
const CABLE_URL = process.env.REACT_APP_CABLE_URL ?? 'ws://localhost:3000/cable';

interface UseTableArgs {
  campaignId: string | null;
  role: 'owner' | 'player' | undefined;
  token: string | null; // JWT, appended to the cable URL for auth
}

interface UseTable {
  stage: RevealAsset | null;
  reveal: (asset: RevealAsset | null) => void;
}

export function useTable({ campaignId, role, token }: UseTableArgs): UseTable {
  const [stage, setStage] = useState<RevealAsset | null>(null);
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
        received(data: { type: string; asset: RevealAsset | null }) {
          if (data.type === 'reveal') setStage(data.asset ?? null);
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

  const reveal = useCallback((asset: RevealAsset | null) => {
    // Owner drives: optimistic local update + broadcast to the table.
    if (role === 'owner') {
      setStage(asset);
      subRef.current?.perform('reveal', { asset });
    }
    // Players can't drive the stage; incoming broadcasts update it instead.
  }, [role]);

  return { stage, reveal };
}