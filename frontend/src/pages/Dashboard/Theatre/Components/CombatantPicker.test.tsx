import { fireEvent, render, screen } from '@testing-library/react';
import CombatantPicker from './CombatantPicker';
import type { CombatantOption } from './types';

const opt = (o: Partial<CombatantOption> & Pick<CombatantOption, 'key' | 'source' | 'name'>): CombatantOption => ({
  subtitle: '', armorClass: 12, maxHp: 10, dexterity: 12, isEnemy: o.source !== 'character', ...o,
});

const options = [
  opt({ key: 'character:1', source: 'character', name: 'Thorin', characterId: '1' }),
  opt({ key: 'npc:1', source: 'npc', name: 'Old Marta' }),
  opt({ key: 'beast:1', source: 'beast', name: 'Goblin', monsterId: 'm1' }),
  opt({ key: 'beast:2', source: 'beast', name: 'Goblin Boss', monsterId: 'm2' }),
  opt({ key: 'beast:3', source: 'beast', name: 'Wolf', monsterId: 'm3' }),
];

const setup = (inCombat: string[] = [], onAdd = jest.fn()) => {
  render(<CombatantPicker options={options} loading={false} inCombat={new Set(inCombat)} onAdd={onAdd} />);
  return onAdd;
};

describe('CombatantPicker', () => {
  it('starts with the party and NPCs, not the whole bestiary', () => {
    setup();
    expect(screen.getByText('Thorin')).toBeInTheDocument();
    expect(screen.getByText('Old Marta')).toBeInTheDocument();
    expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
  });

  it('finds beasts by name, best match first', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Search for a combatant'), { target: { value: 'gob' } });
    const names = screen.getAllByRole('listitem').map((li) => li.querySelector('strong')?.textContent);
    expect(names).toEqual(['Goblin', 'Goblin Boss']);
  });

  it('adds the chosen quantity', () => {
    const onAdd = setup();
    fireEvent.change(screen.getByLabelText('Search for a combatant'), { target: { value: 'wolf' } });
    fireEvent.click(screen.getByLabelText('More'));
    fireEvent.click(screen.getByLabelText('More'));
    fireEvent.click(screen.getByLabelText('Add Wolf'));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Wolf' }), 3);
  });

  it('will not add a character who is already in combat', () => {
    const onAdd = setup(['1']);
    const button = screen.getByLabelText('Thorin is already in combat');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('filters by kind', () => {
    setup();
    fireEvent.click(screen.getByRole('tab', { name: /Beasts/ }));
    expect(screen.getByText('Wolf')).toBeInTheDocument();
    expect(screen.queryByText('Thorin')).not.toBeInTheDocument();
  });
});
