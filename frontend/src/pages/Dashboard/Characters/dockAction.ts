import { createContext, useContext, useEffect, useRef } from 'react';

/** A tab's main "add" button, shown inside the phone dock beside undo / redo. */
export interface DockAction {
  label: string;
  run: () => void;
}

export const DockActionContext = createContext<(action: DockAction | null) => void>(() => {});

/** Register the "add" button while the calling panel is on screen. Pass null for no button. */
export const useDockAction = (label: string | null, run: () => void) => {
  const set = useContext(DockActionContext);
  const latest = useRef(run);
  latest.current = run;
  useEffect(() => {
    if (!label) return undefined;
    set({ label, run: () => latest.current() });
    return () => set(null);
  }, [label, set]);
};
