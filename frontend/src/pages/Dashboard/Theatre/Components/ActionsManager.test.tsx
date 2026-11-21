import { fireEvent, render, screen } from '@testing-library/react';
import ActionsManager from './ActionsManager';
import type { StatblockView } from './combatResources';
import type { CombatResources } from './types';

const view: StatblockView = {
  legendaryPool: 3,
  slots: { '1': 2 },
  actions: [
    { key: 'action:Bite', group: 'action', name: 'Bite', summary: '+7 to hit · 2d6+4 piercing', desc: 'Chomp.' },
    { key: 'action:Fire Breath', group: 'action', name: 'Fire Breath', summary: 'DC 15 DEX save', desc: 'Whoosh.', recharge: '5–6' },
    { key: 'trait:Legendary Resistance', group: 'trait', name: 'Legendary Resistance', summary: '', desc: 'Nope.', limit: { max: 3, per: 'day' } },
    { key: 'legendary:Wing Attack', group: 'legendary', name: 'Wing Attack', summary: '', desc: 'Flap.', cost: 2 },
    { key: 'reaction:Parry', group: 'reaction', name: 'Parry', summary: '', desc: 'Adds 3 to AC against one melee attack.' },
  ],
};

const setup = (res?: CombatResources) => {
  const onChange = jest.fn();
  render(<ActionsManager res={res} view={view} loading={false} error="" onChange={onChange} />);
  return onChange;
};

describe('ActionsManager', () => {
  it('lists actions with their rolls, grouped', () => {
    setup();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('+7 to hit · 2d6+4 piercing')).toBeInTheDocument();
    expect(screen.getByText('+7 to hit · 2d6+4 piercing')).toBeInTheDocument();
  });

  it('puts reactions and legendary actions in loud banners, not the ordinary list', () => {
    setup();
    expect(screen.getByLabelText('Reaction')).toHaveTextContent('AVAILABLE');
    expect(screen.getByLabelText('Reaction')).toHaveTextContent('Adds 3 to AC against one melee attack.');
    expect(screen.getByLabelText('Legendary actions')).toHaveTextContent('3 of 3 left');
    expect(screen.queryByRole('heading', { name: 'Reactions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Legendary actions' })).not.toBeInTheDocument();
  });

  it('marks the reaction used from its banner', () => {
    const onChange = setup();
    fireEvent.click(screen.getByText('Use reaction'));
    expect(onChange).toHaveBeenCalledWith({ econ: { reaction: true } });
  });

  it('says so once the reaction is spent', () => {
    setup({ econ: { reaction: true } });
    expect(screen.getByLabelText('Reaction')).toHaveTextContent('USED');
    expect(screen.getByText('Reaction used · tap to undo')).toBeInTheDocument();
  });

  it('spends one use of a limited ability', () => {
    const onChange = setup();
    fireEvent.click(screen.getAllByLabelText(/Use one Legendary Resistance/)[0]);
    expect(onChange).toHaveBeenCalledWith({ used: { 'trait:Legendary Resistance': 1 } });
  });

  it('spends and recharges a breath weapon', () => {
    const onChange = setup();
    fireEvent.click(screen.getByText('Ready'));
    expect(onChange).toHaveBeenCalledWith({ used: { 'action:Fire Breath': 1 } });
  });

  it('shows a spent recharge ability and lets you flip it back', () => {
    const onChange = setup({ used: { 'action:Fire Breath': 1 } });
    fireEvent.click(screen.getByText('Spent ↻5–6'));
    expect(onChange).toHaveBeenCalledWith({ used: { 'action:Fire Breath': 0 } });
  });

  it('spends legendary actions by their cost, and stops when the pool runs short', () => {
    const onChange = setup({ legendaryUsed: 1 });
    const use = screen.getByText('Use (2)');
    fireEvent.click(use);
    expect(onChange).toHaveBeenCalledWith({ legendaryUsed: 3 });
  });

  it('disables a legendary action the pool cannot pay for', () => {
    setup({ legendaryUsed: 2 });
    expect(screen.getByText('Use (2)')).toBeDisabled();
  });

  it('marks the turn’s action economy', () => {
    const onChange = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(onChange).toHaveBeenCalledWith({ econ: { move: true } });
  });

  it('spends a spell slot', () => {
    const onChange = setup();
    fireEvent.click(screen.getAllByLabelText(/Use one 1st level slots/)[0]);
    expect(onChange).toHaveBeenCalledWith({ slotsUsed: { '1': 1 } });
  });
});
