import { act, renderHook } from '@testing-library/react';
import { useSheetEditor } from './useSheetEditor';

interface Sheet { id: string; hp: number; notes: string; gold: number }

const setup = (save = jest.fn().mockResolvedValue(undefined)) => {
  const hook = renderHook(() => useSheetEditor<Sheet>({ save, delayMs: 500 }));
  act(() => hook.result.current.setForm({ id: 'c1', hp: 10, notes: '', gold: 0 }));
  return { hook, save };
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('saves only the changed fields, once, after a pause', async () => {
  const { hook, save } = setup();
  act(() => hook.result.current.edit({ hp: 7 }, 'HP'));
  act(() => hook.result.current.edit({ gold: 5 }, 'gold'));
  expect(save).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(500); });
  expect(save).toHaveBeenCalledTimes(1);
  expect(save.mock.calls[0][0].sort()).toEqual(['gold', 'hp']);
  expect(hook.result.current.status).toBe('saved');
});

it('undoes and redoes, and saves the undo too', async () => {
  const { hook, save } = setup();
  act(() => hook.result.current.edit({ hp: 3 }, 'HP'));
  expect(hook.result.current.undoLabel).toBe('HP');
  act(() => hook.result.current.undo());
  expect(hook.result.current.form?.hp).toBe(10);
  expect(hook.result.current.canRedo).toBe(true);
  act(() => hook.result.current.redo());
  expect(hook.result.current.form?.hp).toBe(3);
  await act(async () => { jest.advanceTimersByTime(500); });
  expect(save.mock.calls[0][1].hp).toBe(3);
});

it('folds quick typing in one field into a single undo step', () => {
  const { hook } = setup();
  act(() => hook.result.current.edit({ notes: 'O' }, 'notes', { coalesceKey: 'notes' }));
  act(() => hook.result.current.edit({ notes: 'Ow' }, 'notes', { coalesceKey: 'notes' }));
  act(() => hook.result.current.edit({ notes: 'Owe' }, 'notes', { coalesceKey: 'notes' }));
  act(() => hook.result.current.undo());
  expect(hook.result.current.form?.notes).toBe('');
  expect(hook.result.current.canUndo).toBe(false);
});

it('a new edit clears redo, and history-less edits are not undoable', () => {
  const { hook } = setup();
  act(() => hook.result.current.edit({ hp: 3 }, 'HP'));
  act(() => hook.result.current.undo());
  act(() => hook.result.current.edit({ gold: 9 }, 'gold', { history: false }));
  expect(hook.result.current.canRedo).toBe(true); // history-less edit leaves redo alone
  act(() => hook.result.current.edit({ hp: 1 }, 'HP'));
  expect(hook.result.current.canRedo).toBe(false);
});

it('keeps failed changes and retries them', async () => {
  const save = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
  const { hook } = setup(save);
  act(() => hook.result.current.edit({ hp: 4 }, 'HP'));
  await act(async () => { jest.advanceTimersByTime(500); });
  expect(hook.result.current.status).toBe('error');
  await act(async () => { await hook.result.current.flush(); });
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[1][0]).toEqual(['hp']);
  expect(hook.result.current.status).toBe('saved');
});
