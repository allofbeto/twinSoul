import { act, renderHook } from '@testing-library/react';
import { useSessionCombat } from './useSessionCombat';
import type { Combatant, SavedCombat } from './types';

const goblin: Combatant = { id: 'c1', name: 'Goblin', init: 12, hp: 7, maxHp: 7, isEnemy: true };
const saved: SavedCombat = { combatants: [goblin], turn: 0, round: 2 };

type State = { combatants: Combatant[]; turn: number; round: number; combatOn: boolean };
const empty: State = { combatants: [], turn: 0, round: 1, combatOn: false };

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const setup = (over: { sessionId?: string; stored?: SavedCombat | null; state?: State; enabled?: boolean } = {}) => {
  const restore = jest.fn();
  const save = jest.fn(() => Promise.resolve());
  const onSaved = jest.fn();
  const initial = { sessionId: 's1', stored: null as SavedCombat | null, state: empty, enabled: true, ...over };
  const hook = renderHook((props: typeof initial) => useSessionCombat({ ...props, restore, save, onSaved }), { initialProps: initial });
  return { restore, save, onSaved, hook, initial };
};

describe('useSessionCombat', () => {
  it('brings a saved fight back when its session opens, without re-saving it', () => {
    const { restore, save } = setup({ stored: saved, state: saved ? { ...saved, combatOn: true } : empty });
    expect(restore).toHaveBeenCalledWith(saved);
    act(() => { jest.advanceTimersByTime(2000); });
    expect(save).not.toHaveBeenCalled();
  });

  it('resets the tracker for a session with no fight', () => {
    const { restore } = setup();
    expect(restore).toHaveBeenCalledWith(null);
  });

  it('saves changes after a short pause, and only once for a burst', async () => {
    const { save, hook, initial } = setup();
    hook.rerender({ ...initial, state: { combatants: [goblin], turn: 0, round: 1, combatOn: true } });
    hook.rerender({ ...initial, state: { combatants: [{ ...goblin, hp: 5 }], turn: 0, round: 1, combatOn: true } });
    expect(save).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(800); });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('s1', { combatants: [{ ...goblin, hp: 5 }], turn: 0, round: 1 });
  });

  it('keeps an empty fight that has been started', async () => {
    const { save, hook, initial } = setup();
    hook.rerender({ ...initial, state: { ...empty, combatOn: true } });
    await act(async () => { jest.advanceTimersByTime(800); });
    expect(save).toHaveBeenCalledWith('s1', { combatants: [], turn: 0, round: 1 });
  });

  it('clears the saved fight when combat ends', async () => {
    const { save, hook, initial } = setup({ stored: saved, state: { ...saved, combatOn: true } });
    hook.rerender({ ...initial, state: empty });
    await act(async () => { jest.advanceTimersByTime(800); });
    expect(save).toHaveBeenCalledWith('s1', null);
  });

  it('tells the page what was saved', async () => {
    const { onSaved, hook, initial } = setup();
    hook.rerender({ ...initial, state: { combatants: [goblin], turn: 0, round: 1, combatOn: true } });
    await act(async () => { jest.advanceTimersByTime(800); });
    expect(onSaved).toHaveBeenCalledWith('s1', { combatants: [goblin], turn: 0, round: 1 });
  });

  it('saves what is pending when the theatre closes', () => {
    const { save, hook, initial } = setup();
    hook.rerender({ ...initial, state: { combatants: [goblin], turn: 0, round: 1, combatOn: true } });
    hook.unmount();
    expect(save).toHaveBeenCalledWith('s1', { combatants: [goblin], turn: 0, round: 1 });
  });

  it('never saves for a player', async () => {
    const { save, restore, hook, initial } = setup({ enabled: false });
    hook.rerender({ ...initial, state: { combatants: [goblin], turn: 0, round: 1, combatOn: true } });
    await act(async () => { jest.advanceTimersByTime(2000); });
    expect(save).not.toHaveBeenCalled();
    expect(restore).not.toHaveBeenCalled();
  });

  it('does not carry one session’s fight into the next', async () => {
    const { save, hook, initial, restore } = setup({ stored: saved, state: { ...saved, combatOn: true } });
    // Switch to a session with no fight: the page resets the tracker.
    hook.rerender({ ...initial, sessionId: 's2', stored: null, state: { ...saved, combatOn: true } });
    expect(restore).toHaveBeenLastCalledWith(null);
    hook.rerender({ ...initial, sessionId: 's2', stored: null, state: empty });
    await act(async () => { jest.advanceTimersByTime(2000); });
    expect(save).not.toHaveBeenCalled();
  });

  it('saves the battle map with the fight', () => {
    const save = jest.fn(() => Promise.resolve());
    const { rerender } = renderHook((state: State & { map?: { id: string; name: string } | null }) => useSessionCombat({
      sessionId: 's1', enabled: true, stored: null, state, restore: jest.fn(), save, onSaved: jest.fn(), delayMs: 10,
    }), { initialProps: empty });
    rerender({ ...empty, combatOn: true, map: { id: 'm1', name: 'Forest map' } });
    act(() => { jest.advanceTimersByTime(20); });
    expect(save).toHaveBeenCalledWith('s1', { combatants: [], turn: 0, round: 1, map: { id: 'm1', name: 'Forest map' } });
  });
});
