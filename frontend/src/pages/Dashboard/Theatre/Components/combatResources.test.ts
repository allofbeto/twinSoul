import {
  adjustLegendary, adjustSlot, adjustUsed, fromMonster, fromNpc, parseUses, resetForTurn, toggleEcon, usedOf,
} from './combatResources';

describe('parseUses', () => {
  it('reads limited uses and recharges', () => {
    expect(parseUses('3/day')).toEqual({ limit: { max: 3, per: 'day' } });
    expect(parseUses('1 / short rest')).toEqual({ limit: { max: 1, per: 'rest' } });
    expect(parseUses('Recharge 5–6')).toEqual({ recharge: '5–6' });
    expect(parseUses('Recharge 6')).toEqual({ recharge: '6' });
    expect(parseUses('At will')).toEqual({});
    expect(parseUses(undefined)).toEqual({});
  });
});

describe('fromMonster', () => {
  const dragon = {
    special_abilities: [
      { name: 'Legendary Resistance', desc: 'Succeed instead.', usage: { type: 'per day', times: 3 } },
      { name: 'Spellcasting', desc: 'Casts.', spellcasting: { dc: 20, modifier: 12, slots: { 1: 4, 2: 3, 9: 1 } } },
    ],
    actions: [
      { name: 'Multiattack', desc: 'Three attacks.', damage: [] },
      { name: 'Bite', desc: 'Bites.', attack_bonus: 14, damage: [{ damage_dice: '2d10+8', damage_type: { name: 'Piercing' } }, { damage_dice: '2d6', damage_type: { name: 'Fire' } }] },
      { name: 'Fire Breath', desc: 'Breathes.', usage: { type: 'recharge on roll', min_value: 5 }, dc: { dc_type: { name: 'DEX' }, dc_value: 21 }, damage: [{ damage_dice: '18d6', damage_type: { name: 'Fire' } }] },
    ],
    reactions: [],
    legendary_actions: [{ name: 'Detect', desc: 'A check.' }, { name: 'Wing Attack (Costs 2 Actions)', desc: 'Costs 2 Actions. Beats wings.' }],
  };
  const view = fromMonster(dragon);
  const find = (n: string) => view.actions.find((a) => a.name === n)!;

  it('summarises attacks and saves', () => {
    expect(find('Bite').summary).toBe('+14 to hit · 2d10+8 piercing + 2d6 fire');
    expect(find('Fire Breath').summary).toBe('DC 21 DEX save · 18d6 fire');
  });

  it('finds limited uses, recharges and slots', () => {
    expect(find('Legendary Resistance').limit).toEqual({ max: 3, per: 'day' });
    expect(find('Fire Breath').recharge).toBe('5–6');
    expect(view.slots).toEqual({ '1': 4, '2': 3, '9': 1 });
    expect(find('Spellcasting').group).toBe('spell');
  });

  it('gives legendary creatures a pool of three and reads action costs', () => {
    expect(view.legendaryPool).toBe(3);
    expect(find('Detect').cost).toBe(1);
    expect(find('Wing Attack (Costs 2 Actions)').cost).toBe(2);
  });

  it('has no pool for an ordinary creature', () => {
    expect(fromMonster({ actions: [{ name: 'Claw', damage: [] }] }).legendaryPool).toBe(0);
  });
});

describe('fromNpc', () => {
  const npc = {
    challenge_rating: '3', strength: 10, dexterity: 16, constitution: 12, intelligence: 10, wisdom: 10, charisma: 18, skills: [],
    traits: [{ name: 'Honeyed Lies', desc: 'Persuasive.' }],
    actions: [
      { name: 'Cutlass', desc: 'Slash.', roll_kind: 'attack', attack_ability: 'dexterity', attack_proficient: true, range: '5 ft.', damages: [{ mode: 'dice', dice_count: 1, dice_sides: 6, ability: 'dexterity', type: 'slashing' }] },
      { name: 'Smoke Pot', desc: 'Smoke.', uses: '2/day' },
    ],
    bonus_actions: [{ name: 'Slip Away', desc: 'Hide.', uses: 'Recharge 5–6' }],
    legendary_actions: [],
    spells: [{ name: 'Charm Person', level: 1, uses: '1/day' }],
    spellcasting: { ability: 'charisma', slots: { 1: 2, 2: 0 } },
  };
  const view = fromNpc(npc);
  const find = (n: string) => view.actions.find((a) => a.name === n)!;

  it('works out the attack from ability scores and CR', () => {
    expect(find('Cutlass').summary).toBe('+5 to hit · 5 ft. · 1d6+3 slashing');
  });

  it('reads uses, recharges and slots', () => {
    expect(find('Smoke Pot').limit).toEqual({ max: 2, per: 'day' });
    expect(find('Slip Away')).toMatchObject({ group: 'bonus', recharge: '5–6' });
    expect(find('Charm Person').limit).toEqual({ max: 1, per: 'day' });
    expect(view.slots).toEqual({ '1': 2 });
  });
});

describe('spending', () => {
  it('toggles the action economy and resets it on their turn', () => {
    let res = toggleEcon(undefined, 'action');
    res = toggleEcon(res, 'reaction');
    expect(res.econ).toEqual({ action: true, reaction: true });
    res = adjustLegendary(res, 2, 3);
    expect(resetForTurn(res)).toMatchObject({ econ: {}, legendaryUsed: 0 });
  });

  it('keeps uses and slots within their limits, and keeps them across turns', () => {
    let res = adjustUsed(undefined, 'action:Fire Breath', 1, 1);
    res = adjustUsed(res, 'action:Fire Breath', 1, 1);
    expect(usedOf(res, 'action:Fire Breath')).toBe(1);
    res = adjustUsed(res, 'action:Fire Breath', -5, 1);
    expect(usedOf(res, 'action:Fire Breath')).toBe(0);
    res = adjustSlot(res, '3', 1, 3);
    expect(resetForTurn(res)?.slotsUsed).toEqual({ '3': 1 });
    expect(adjustLegendary(undefined, 9, 3).legendaryUsed).toBe(3);
  });

  it('leaves a creature with nothing spent alone', () => {
    expect(resetForTurn(undefined)).toBeUndefined();
  });
});

describe('defenses', () => {
  it('reads a bestiary monster’s resistances, immunities and vulnerabilities', () => {
    const view = fromMonster({
      actions: [],
      damage_resistances: ['cold', 'bludgeoning, piercing, and slashing from nonmagical weapons'],
      damage_immunities: ['poison'],
      damage_vulnerabilities: ['fire'],
      condition_immunities: ['Charmed', 'Frightened'],
    });
    expect(view.defenses?.resist.map((d) => d.label)).toEqual(['cold', 'physical (nonmagical weapons)']);
    expect(view.defenses?.immune[0].types).toEqual(['poison']);
    expect(view.defenses?.vulnerable[0].types).toEqual(['fire']);
    expect(view.defenses?.conditionImmune).toEqual(['Charmed', 'Frightened']);
  });

  it('reads an NPC’s written defenses and keeps what it cannot place', () => {
    const view = fromNpc({ defenses: 'Resistant to fire; wears a cloak of shadows', challenge_rating: '1' });
    expect(view.defenses?.resist[0].types).toEqual(['fire']);
    expect(view.defenseNote).toBe('wears a cloak of shadows');
  });
});
