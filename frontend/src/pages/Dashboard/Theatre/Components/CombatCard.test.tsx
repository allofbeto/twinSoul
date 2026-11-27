import { fireEvent, render, screen } from '@testing-library/react';
import CombatCard from './CombatCard';
import type { Combatant } from './types';

// A plain function: CRA resets jest.fn implementations between tests.
jest.mock('../../../../api/backendHelpers', () => ({ getMonster: () => new Promise(() => {}) }));

const base: Combatant = { id: 'c1', name: 'Goblin 1', init: 12, hp: 7, maxHp: 7, armorClass: 15, isEnemy: true, revealed: false };

const setup = (c: Combatant, over: Record<string, unknown> = {}) => {
  const props = {
    c, isTurn: false, expanded: false, rawById: {}, isDragOver: false,
    onToggle: jest.fn(), onRemove: jest.fn(), onApplyHp: jest.fn(), onAddTemp: jest.fn(), onClearTemp: jest.fn(), onToggleCondition: jest.fn(), onSetExhaustion: jest.fn(), lens: null,
    onEditInit: jest.fn(), onToggleReveal: jest.fn(), onViewDetails: jest.fn(), onSetRes: jest.fn(),
    onDragStart: jest.fn(), onDragEnd: jest.fn(), onDragOver: jest.fn(), onDrop: jest.fn(), ...over,
  };
  const utils = render(<CombatCard {...props} />);
  return { ...props, rerender: (next: Combatant) => utils.rerender(<CombatCard {...props} c={next} />) };
};

describe('CombatCard details button', () => {
  it('opens a bestiary monster', () => {
    const p = setup({ ...base, monsterId: 'm1' });
    fireEvent.click(screen.getByLabelText('View Goblin 1 stat block'));
    expect(p.onViewDetails).toHaveBeenCalledWith({ kind: 'monster', id: 'm1', title: 'Goblin 1' });
  });

  it('opens one of the DM’s NPCs', () => {
    const p = setup({ ...base, name: 'Old Marta', itemId: 'i1' });
    fireEvent.click(screen.getByLabelText('View Old Marta stat block'));
    expect(p.onViewDetails).toHaveBeenCalledWith({ kind: 'npc', id: 'i1', title: 'Old Marta' });
  });

  it('opens a player’s character sheet', () => {
    const p = setup({ ...base, name: 'Thorin', isEnemy: false, characterId: 'pc1' });
    fireEvent.click(screen.getByLabelText('View Thorin character sheet'));
    expect(p.onViewDetails).toHaveBeenCalledWith({ kind: 'character', id: 'pc1', title: 'Thorin' });
  });

  it('has no button for a blank combatant', () => {
    setup(base);
    expect(screen.queryByText('Stats')).not.toBeInTheDocument();
  });
});

describe('CombatCard HP', () => {
  it('shows temporary HP on top of the maximum', () => {
    setup({ ...base, name: 'Bruiser', hp: 120, maxHp: 120, tempHp: 10 });
    expect(screen.getByText('130/120')).toBeInTheDocument();
    expect(screen.getByText(/\+10 temp/)).toBeInTheDocument();
  });

  it('colours the number by how hurt it is', () => {
    setup({ ...base, hp: 7, maxHp: 7 });
    expect(screen.getByText('7/7')).toHaveStyle({ color: 'hsl(120 70% 46%)' });
  });

  it('adds temporary HP from the amount box', () => {
    const p = setup(base);
    fireEvent.change(screen.getByLabelText(/Amount of HP to change/), { target: { value: '10' } });
    fireEvent.click(screen.getByText('Temp'));
    expect(p.onAddTemp).toHaveBeenCalledWith(10);
  });

  it('damages and heals from the same box', () => {
    const p = setup(base);
    fireEvent.change(screen.getByLabelText(/Amount of HP to change/), { target: { value: '3' } });
    fireEvent.click(screen.getByText('Damage'));
    expect(p.onApplyHp).toHaveBeenCalledWith(-3);
  });

  it('can clear temporary HP', () => {
    const p = setup({ ...base, tempHp: 4 });
    fireEvent.click(screen.getByLabelText(/Clear Goblin 1's temporary HP/));
    expect(p.onClearTemp).toHaveBeenCalled();
  });
});

describe('CombatCard statuses', () => {
  it('shows active statuses and clears one with a tap', () => {
    const p = setup({ ...base, conditions: ['Prone', 'Stunned'] });
    expect(screen.getByLabelText('Prone: tap to clear')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Stunned: tap to clear'));
    expect(p.onToggleCondition).toHaveBeenCalledWith('Stunned');
  });

  it('adds a status from the picker, and sets exhaustion', () => {
    const p = setup({ ...base, exhaustion: 1 });
    expect(screen.getByText(/Exhaustion 1/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('＋ Status'));
    fireEvent.click(screen.getByRole('button', { name: 'Poisoned' }));
    expect(p.onToggleCondition).toHaveBeenCalledWith('Poisoned');
    fireEvent.click(screen.getByLabelText('More exhaustion'));
    expect(p.onSetExhaustion).toHaveBeenCalledWith(2);
  });
});

describe('CombatCard resistances and immunities', () => {
  const troll = {
    id: 'i1', name: 'Frost Troll', defenses: 'Resistant to cold; immune to poison, charmed; vulnerable to fire',
    strength: 18, dexterity: 12, constitution: 18, intelligence: 8, wisdom: 9, charisma: 7, challenge_rating: '5',
  };
  const withItem = { ...base, name: 'Frost Troll', itemId: 'i1' };

  it('shows them on the card without opening it', () => {
    setup(withItem, { rawById: { i1: troll } });
    const strip = screen.getByLabelText('Resistances and immunities');
    expect(strip).toHaveTextContent('Resists');
    expect(strip).toHaveTextContent('cold');
    expect(strip).toHaveTextContent('Immune');
    expect(strip).toHaveTextContent('poison');
    expect(strip).toHaveTextContent('Vulnerable');
    expect(strip).toHaveTextContent('Can’t be charmed');
  });

  it('flags how it fares against the damage type being checked', () => {
    setup(withItem, { rawById: { i1: troll }, lens: 'cold' });
    expect(screen.getByText('×½ Resists')).toBeInTheDocument();
  });

  it('says immune, and says nothing for a type it has no defense against', () => {
    setup(withItem, { rawById: { i1: troll }, lens: 'poison' });
    expect(screen.getByText('Immune', { selector: '.theatre__lens' })).toBeInTheDocument();
  });

  it('is quiet for a type it has no defense against', () => {
    setup(withItem, { rawById: { i1: troll }, lens: 'acid' });
    expect(screen.queryByText(/Resists|Vulnerable/, { selector: '.theatre__lens' })).not.toBeInTheDocument();
  });
});

describe('CombatCard health bar effects', () => {
  it('shakes when damage lands and shimmers when healed', () => {
    const p = setup({ ...base, hp: 20, maxHp: 20 });
    const box = () => document.querySelector('.theatre__hpbox')!;
    expect(box().className).not.toMatch(/is-hurt|is-heal/);
    p.rerender({ ...base, hp: 12, maxHp: 20 });
    expect(box().className).toMatch(/is-hurt/);
    p.rerender({ ...base, hp: 18, maxHp: 20 });
    expect(box().className).toMatch(/is-heal/);
  });

  it('pulses when health is low, but not at a healthy level or when down', () => {
    const p = setup({ ...base, hp: 20, maxHp: 20 });
    expect(document.querySelector('.theatre__hpbox')!.className).not.toMatch(/is-critical/);
    p.rerender({ ...base, hp: 4, maxHp: 20 });
    expect(document.querySelector('.theatre__hpbox')!.className).toMatch(/is-critical/);
    p.rerender({ ...base, hp: 0, maxHp: 20 });
    expect(document.querySelector('.theatre__hpbox')!.className).not.toMatch(/is-critical/);
  });

  it('keeps the same bar element when HP changes, so the width can slide', () => {
    const p = setup({ ...base, hp: 20, maxHp: 20 });
    const fill = document.querySelector('.theatre__hp-fill');
    const box = document.querySelector('.theatre__hpbox');
    p.rerender({ ...base, hp: 8, maxHp: 20 });
    expect(document.querySelector('.theatre__hp-fill')).toBe(fill);
    expect(document.querySelector('.theatre__hpbox')).toBe(box);
    expect(fill).toHaveStyle({ width: '40%' });
    p.rerender({ ...base, hp: 5, maxHp: 20 });
    expect(document.querySelector('.theatre__hp-fill')).toBe(fill);
  });

  it('trails the lost chunk with a ghost segment', () => {
    const p = setup({ ...base, hp: 20, maxHp: 20 });
    p.rerender({ ...base, hp: 10, maxHp: 20 });
    expect(document.querySelector('.theatre__hp-ghost')).toHaveStyle({ width: '50%' });
  });

  it('swaps its effect class on consecutive hits so the shake restarts', () => {
    const p = setup({ ...base, hp: 20, maxHp: 20 });
    const box = () => document.querySelector('.theatre__hpbox')!;
    p.rerender({ ...base, hp: 15, maxHp: 20 });
    const first = box().classList.contains('is-b');
    p.rerender({ ...base, hp: 10, maxHp: 20 });
    expect(box().classList.contains('is-b')).toBe(!first);
  });
});
