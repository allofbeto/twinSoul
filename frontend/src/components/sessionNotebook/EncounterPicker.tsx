import { useEffect, useState } from 'react';
import { getEncounters } from '../../api/backendHelpers';

export interface EncounterRef { id: string; name: string }

interface Option extends EncounterRef { summary: string }

interface Props {
  campaignId?: string;
  value?: EncounterRef;
  onChange: (ref: EncounterRef | undefined) => void;
}

// "3 Wolf + Dire Wolf" from an encounter's phases.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const summarize = (raw: any) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (raw.encounter_phases ?? []).flatMap((p: any) => p.encounter_monsters ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((m: any) => ((m.quantity ?? 1) > 1 ? `${m.quantity} ${m.name}` : m.name))
    .join(' + ');

// Link a beat to one of the campaign's encounters.
export default function EncounterPicker({ campaignId, value, onChange }: Props) {
  const [options, setOptions] = useState<Option[] | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    let alive = true;
    getEncounters({ campaignId })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((r) => { if (alive) setOptions(r.data.map((e: any) => ({ id: String(e.id), name: e.name ?? 'Untitled encounter', summary: summarize(e) }))); })
      .catch(() => { if (alive) setOptions([]); });
    return () => { alive = false; };
  }, [campaignId]);

  if (!campaignId) return <div className="nb-note">Add this session to a campaign to link encounters.</div>;

  const current = options?.find((o) => o.id === value?.id);

  return (
    <label className="nb-field-row">
      <span>⚔ Encounter</span>
      <select
        className="nb-input"
        value={value?.id ?? ''}
        onChange={(e) => {
          const o = options?.find((x) => x.id === e.target.value);
          onChange(o ? { id: o.id, name: o.name } : undefined);
        }}
      >
        <option value="">{options === null ? 'Loading…' : options.length ? 'None' : 'No encounters in this campaign yet'}</option>
        {value && !current && options !== null && <option value={value.id}>{value.name} (not found)</option>}
        {options?.map((o) => (
          <option key={o.id} value={o.id}>{o.summary ? `${o.name} · ${o.summary}` : o.name}</option>
        ))}
      </select>
    </label>
  );
}
