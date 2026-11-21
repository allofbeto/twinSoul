import { ABILITY_SCORES } from '../../Characters/constants';
import {
  attackBonusOf, checkOf, customRollOf, damageTextOf, modOfScore, saveTextOf, SPELL_LEVEL_LABEL,
  type Feature, type StatblockFields,
} from '../statblock';

interface Props {
  npc: StatblockFields & Record<string, any>;
  pb: number;
}

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

const SECTIONS: { key: 'traits' | 'actions' | 'bonus_actions' | 'reactions' | 'legendary_actions'; title: string }[] = [
  { key: 'traits', title: 'Traits' },
  { key: 'actions', title: 'Actions' },
  { key: 'bonus_actions', title: 'Bonus actions' },
  { key: 'reactions', title: 'Reactions' },
  { key: 'legendary_actions', title: 'Legendary actions' },
];

// The stat block as it will read at the table: attack bonuses, damage and save
// DCs worked out from the ability scores and proficiency, like a printed block.
export default function NpcStatblockPreview({ npc, pb }: Props) {
  const mods = Object.fromEntries(ABILITY_SCORES.map((a) => [a.key, modOfScore(npc[a.key])]));

  const line = (f: Feature) => {
    const bits: string[] = [];
    const atk = attackBonusOf(f, mods, pb);
    if (atk !== null) bits.push(`${signed(atk)} to hit${f.range ? `, ${f.range}` : ''}`);
    else if (f.range) bits.push(f.range);
    const save = saveTextOf(f, mods, pb);
    if (save) bits.push(`${save} save`);
    const check = checkOf(f, mods, pb, npc.skills ?? []);
    if (check) bits.push(`${check.label} ${signed(check.bonus)}`);
    const custom = customRollOf(f);
    if (custom) bits.push(`${custom.label}: ${custom.expr}`);
    const dmg = damageTextOf(f, mods);
    if (dmg) bits.push(`${atk !== null ? 'Hit: ' : ''}${dmg}`);
    return bits.join('. ');
  };

  const spellsByLevel = (npc.spells ?? []).reduce<Record<number, string[]>>((acc, s) => {
    (acc[s.level] = acc[s.level] || []).push(s.name);
    return acc;
  }, {});
  const casting = npc.spellcasting?.ability
    ? `${npc.spellcasting.ability.slice(0, 3).toUpperCase()}, save DC ${8 + pb + (mods[npc.spellcasting.ability] ?? 0)}, ${signed(pb + (mods[npc.spellcasting.ability] ?? 0))} to hit`
    : '';

  const any = SECTIONS.some((s) => npc[s.key]?.length) || (npc.spells ?? []).length > 0;
  if (!any) return <p className="npcb-preview-empty">Actions and traits you add show up here.</p>;

  return (
    <div className="npcb-preview">
      {SECTIONS.map(({ key, title }) => (npc[key]?.length ? (
        <section key={key}>
          <h5>{title}</h5>
          {(npc[key] as Feature[]).map((f, i) => (
            <p key={`${f.name}-${i}`}>
              <strong><em>{f.name || 'Unnamed'}{f.uses ? ` (${f.uses})` : ''}.</em></strong>{' '}
              {line(f) && <span className="npcb-preview-roll">{line(f)}. </span>}
              {f.desc}
            </p>
          ))}
        </section>
      ) : null))}
      {(npc.spells ?? []).length > 0 && (
        <section>
          <h5>Spellcasting{casting ? ` (${casting})` : ''}</h5>
          {Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b).map((lvl) => (
            <p key={lvl}><strong>{SPELL_LEVEL_LABEL(lvl)}:</strong> {spellsByLevel[lvl].join(', ')}</p>
          ))}
        </section>
      )}
    </div>
  );
}
