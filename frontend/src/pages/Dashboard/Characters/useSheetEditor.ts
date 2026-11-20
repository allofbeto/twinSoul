import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

// Editing state for the character sheet: every change is undoable and saves
// itself a moment later. There's no Save button; undo is the safety net.

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface HistoryEntry<T> {
  label: string;
  before: Partial<T>;
  after: Partial<T>;
  /** Changes with the same key in quick succession (typing) undo as one step. */
  coalesceKey?: string;
  at: number;
}

export interface EditOptions {
  /** Merge with the previous change if it had the same key and was recent. */
  coalesceKey?: string;
  /** Skip the undo history (e.g. moving campaigns, which also moves items). */
  history?: boolean;
  /** Save now instead of after the usual pause. */
  immediate?: boolean;
}

interface Options<T> {
  /** Sends the changed fields; resolves with the server's copy. */
  save: (changed: (keyof T)[], current: T) => Promise<Partial<T> | void>;
  /** Folds the server's response into the sheet. `pending` = fields changed since the save started. */
  merge?: (prev: T, saved: Partial<T>, pending: Set<keyof T>) => T;
  delayMs?: number;
}

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1500;

const pick = <T,>(obj: T, keys: (keyof T)[]): Partial<T> =>
  keys.reduce((out, k) => { out[k] = obj[k]; return out; }, {} as Partial<T>);

export function useSheetEditor<T extends object>({ save, merge, delayMs = 800 }: Options<T>) {
  const [form, setFormState] = useState<T | null>(null);
  const formRef = useRef<T | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  // Stacks live in refs (no side effects inside state updaters); bump re-renders.
  const undoStack = useRef<HistoryEntry<T>[]>([]);
  const redoStack = useRef<HistoryEntry<T>[]>([]);
  const [, bump] = useReducer((n: number) => n + 1, 0);

  const pending = useRef<Set<keyof T>>(new Set());
  const timer = useRef<number | undefined>(undefined);
  const inFlight = useRef<Promise<void> | null>(null);
  // Latest callbacks without re-creating flush (and its unmount effect) each render.
  const saveRef = useRef(save);
  const mergeRef = useRef(merge);
  saveRef.current = save;
  mergeRef.current = merge;

  /** Replace the sheet without touching history or saving (loads, server results). */
  const setForm = useCallback((next: T | null | ((prev: T | null) => T | null)) => {
    const value = typeof next === 'function' ? (next as (p: T | null) => T | null)(formRef.current) : next;
    formRef.current = value;
    setFormState(value);
  }, []);

  const flush = useCallback(async (): Promise<void> => {
    window.clearTimeout(timer.current);
    // One save at a time, so an older save can't land after a newer one.
    if (inFlight.current) await inFlight.current;
    const current = formRef.current;
    if (!current || pending.current.size === 0) return;
    const keys = Array.from(pending.current);
    pending.current = new Set();
    setStatus('saving');
    const run = (async () => {
      try {
        const saved = await saveRef.current(keys, current);
        const latest = formRef.current;
        if (saved && latest && mergeRef.current) setForm(mergeRef.current(latest, saved, new Set(pending.current)));
        setStatus(pending.current.size ? 'pending' : 'saved');
      } catch {
        keys.forEach((k) => pending.current.add(k)); // retried by the next change or Retry
        setStatus('error');
      }
    })();
    inFlight.current = run;
    await run;
    inFlight.current = null;
  }, [setForm]);

  const schedule = useCallback((immediate?: boolean) => {
    window.clearTimeout(timer.current);
    setStatus('pending');
    if (immediate) flush();
    else timer.current = window.setTimeout(flush, delayMs);
  }, [delayMs, flush]);

  const apply = useCallback((patch: Partial<T>) => {
    const current = formRef.current;
    if (!current) return;
    setForm({ ...current, ...patch });
    (Object.keys(patch) as (keyof T)[]).forEach((k) => pending.current.add(k));
  }, [setForm]);

  const edit = useCallback((patch: Partial<T>, label: string, opts: EditOptions = {}) => {
    const current = formRef.current;
    if (!current) return;
    const keys = (Object.keys(patch) as (keyof T)[]).filter((k) => current[k] !== patch[k]);
    if (keys.length === 0) return;

    if (opts.history !== false) {
      const now = Date.now();
      const stack = undoStack.current;
      const last = stack[stack.length - 1];
      if (last && opts.coalesceKey && last.coalesceKey === opts.coalesceKey && now - last.at < COALESCE_MS) {
        stack[stack.length - 1] = {
          ...last,
          before: { ...pick(current, keys), ...last.before },
          after: { ...last.after, ...pick(patch as T, keys) },
          at: now,
        };
      } else {
        stack.push({ label, before: pick(current, keys), after: pick(patch as T, keys), coalesceKey: opts.coalesceKey, at: now });
        if (stack.length > HISTORY_LIMIT) stack.shift();
      }
      redoStack.current = [];
      bump();
    }
    apply(pick(patch as T, keys));
    schedule(opts.immediate);
  }, [apply, schedule]);

  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    redoStack.current.push(entry);
    apply(entry.before);
    schedule();
    bump();
  }, [apply, schedule]);

  const redo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    undoStack.current.push({ ...entry, coalesceKey: undefined });
    apply(entry.after);
    schedule();
    bump();
  }, [apply, schedule]);

  const clearHistory = useCallback(() => { undoStack.current = []; redoStack.current = []; bump(); }, []);

  // Save straight away when the tab is hidden (phones kill background tabs),
  // when the page goes away, and warn if leaving with something unsaved.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current.size || inFlight.current) {
        flush();
        e.preventDefault();
        e.returnValue = '';
      }
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
      flush();
    };
  }, [flush]);

  return {
    form,
    setForm,
    edit,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    undoLabel: undoStack.current[undoStack.current.length - 1]?.label,
    redoLabel: redoStack.current[redoStack.current.length - 1]?.label,
    clearHistory,
    status,
    flush,
  };
}
