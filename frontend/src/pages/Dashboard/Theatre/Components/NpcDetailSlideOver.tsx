import SlideOver from '../../../../components/SlideOver';
import { ABILITY_SCORES, DND_SKILLS } from '../../Characters/constants';
import NpcStatblockPreview from '../../Npcs/Components/NpcStatblockPreview';
import { modOfScore, proficiencyForCr, statblockFrom } from '../../Npcs/statblock';
import { renderNotes } from './sanitizeNotes';
import '../../../../styles/npcBuilder.css';

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any | null;
  onClose: () => void;
}

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

// A read-only look at one of the DM's NPCs (or homebrew monsters) mid-fight:
// the numbers first, then the stat block as it will read at the table.
export default function NpcDetailSlideOver({ item, onClose }: Props) {
  const pb = proficiencyForCr(item?.challenge_rating);
  const mods: Record<string, number> = item ? Object.fromEntries(ABILITY_SCORES.map((a) => [a.key, modOfScore(item[a.key])])) : {};
  const saves: string[] = (item?.saving_throws ?? []).map((k: string) => `${ABILITY_SCORES.find((a) => a.key === k)?.label ?? k} ${signed((mods[k] ?? 0) + pb)}`);
  const skills: string[] = (item?.skills ?? []).map((name: string) => {
    const sk = DND_SKILLS.find((s) => s.name === name);
    return `${name} ${signed((sk ? mods[sk.ability] ?? 0 : 0) + pb)}`;
  });
  const facts: [string, string][] = item ? ([
    ['Speed', item.speed], ['Senses', item.senses], ['Languages', item.languages], ['Defenses', item.defenses],
    ['Saving throws', saves.join(', ')], ['Skills', skills.join(', ')],
  ] as [string, string][]).filter(([, v]) => !!v) : [];

  return (
    <SlideOver isOpen={!!item} onClose={onClose} title={item?.name ?? 'NPC'}>
      {item && (
        <div className="npcdetail">
          <div className="npcdetail-head">
            <span className="npcdetail-avatar" style={item.image_url ? { backgroundImage: `url(${item.image_url})` } : undefined}>
              {!item.image_url && (item.name?.[0] ?? '?').toUpperCase()}
            </span>
            <div className="npcdetail-chips">
              <span className="npcdetail-chip">{item.kind === 'monster' ? 'Homebrew monster' : 'NPC'}</span>
              {item.disposition && <span className="npcdetail-chip">{item.disposition}</span>}
              {item.challenge_rating && <span className="npcdetail-chip">CR {item.challenge_rating}</span>}
            </div>
          </div>

          <div className="npcdetail-vitals">
            <div><em>AC</em><strong>{item.armor_class}</strong></div>
            <div><em>HP</em><strong>{item.max_hp}</strong></div>
            <div><em>Prof</em><strong>{signed(pb)}</strong></div>
            <div><em>Init</em><strong>{signed(mods.dexterity ?? 0)}</strong></div>
          </div>

          <div className="npcdetail-abilities">
            {ABILITY_SCORES.map((a) => (
              <div key={a.key}>
                <em>{a.label}</em>
                <strong>{item[a.key]}</strong>
                <span>{signed(mods[a.key])}</span>
              </div>
            ))}
          </div>

          {facts.length > 0 && (
            <dl className="npcdetail-facts">
              {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          )}

          <NpcStatblockPreview npc={{ ...statblockFrom(item), ...item }} pb={pb} />

          {item.notes && (
            <section className="npcdetail-notes">
              <h5>Notes</h5>
              <div dangerouslySetInnerHTML={{ __html: renderNotes(item.notes) }} />
            </section>
          )}
        </div>
      )}
    </SlideOver>
  );
}
