import { fireEvent, render, screen } from '@testing-library/react';
import PlayerCombat from './PlayerCombat';
import type { Combatant, MyCharacter } from './types';

const order: Combatant[] = [
  { id: 'a', name: 'Unknown Creature', init: 17, hp: 0, maxHp: 0, isEnemy: true, revealed: false },
  { id: 'b', name: 'Thorin', init: 12, hp: 20, maxHp: 30, characterId: 'pc1' },
  { id: 'c', name: 'Mira', init: 8, hp: 9, maxHp: 9, characterId: 'pc2' },
];
const mine: MyCharacter[] = [{ id: 'pc1', name: 'Thorin', user_id: 'u1' }];

const setup = (turn: number, myCharacters: MyCharacter[] = mine, combatants: Combatant[] = order) => {
  const onJoin = jest.fn();
  const onDone = jest.fn();
  render(<PlayerCombat combatants={combatants} turn={turn} round={4} myCharacters={myCharacters} onJoin={onJoin} onDone={onDone} />);
  return { onJoin, onDone };
};

describe('PlayerCombat', () => {
  it('shows the round and who is up', () => {
    setup(2);
    expect(screen.getByText('Round 4')).toBeInTheDocument();
    expect(screen.getByText('Now up')).toBeInTheDocument();
    expect(screen.getAllByText('Mira').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Unknown Creature').length).toBeGreaterThan(0);
  });

  it('says it loudly when it is your turn, and lets you tell the DM you are done', () => {
    const { onDone } = setup(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Your turn, Thorin!');
    fireEvent.click(screen.getByText('I’m done'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.getByText('DM told ✓')).toBeDisabled();
  });

  it('warns when you are up next', () => {
    setup(0);
    expect(screen.getByText('You’re up next')).toBeInTheDocument();
  });

  it('marks your own character and shows party HP, but never a hidden creature’s', () => {
    setup(0);
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('20/30')).toBeInTheDocument();
    expect(screen.getByText('9/9')).toBeInTheDocument();
    expect(screen.queryByText('0/0')).not.toBeInTheDocument();
  });

  it('lets a player join with their own roll, or leave it blank to be rolled for', () => {
    const { onJoin } = setup(0, [{ id: 'pc3', name: 'Brin', user_id: 'u1' }]);
    fireEvent.change(screen.getByLabelText(/Initiative for Brin/), { target: { value: '18' } });
    fireEvent.click(screen.getByText('Join'));
    expect(onJoin).toHaveBeenCalledWith('pc3', 18);
    fireEvent.click(screen.getByText('Join'));
    expect(onJoin).toHaveBeenLastCalledWith('pc3', undefined);
  });

  it('lets a player get in the order before combat starts', () => {
    setup(0, [{ id: 'pc3', name: 'Brin', user_id: 'u1' }], []);
    expect(screen.getByText(/Combat hasn’t started/)).toBeInTheDocument();
    expect(screen.getByText('Join')).toBeInTheDocument();
  });

  it('explains the empty state to a player with nothing to join', () => {
    setup(0, [], []);
    expect(screen.getByText(/No combat right now/)).toBeInTheDocument();
  });
});
