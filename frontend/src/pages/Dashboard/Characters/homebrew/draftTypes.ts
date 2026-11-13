import { CharRace } from '../raceTypes';
import { CharClass } from '../classTypes';

// The flat shape the homebrew forms edit and the API accepts (the server
// normalizes it into the same JSON layout the SRD rows use). The URL
// importer returns this shape too.

export const ABILITY_CODES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'] as const;
export const HIT_DICE = [6, 8, 10, 12] as const;

export interface BonusDraft {
  ability_score: string;
  bonus: number;
}

export interface EntryDraft {
  name: string;
  desc: string;
  level?: number;
}

export interface SubraceDraft {
  name: string;
  desc: string;
  ability_bonuses: BonusDraft[];
  traits: EntryDraft[];
}

export interface RaceDraft {
  name: string;
  description: string;
  speed: number;
  size: string;
  size_description: string;
  age: string;
  alignment: string;
  language_desc: string;
  languages: string[];
  ability_bonuses: BonusDraft[];
  traits: EntryDraft[];
  subraces: SubraceDraft[];
  source_url: string;
  icon: string; // borrowed drawn icon key, '' for none
}

export interface SubclassDraft {
  name: string;
  desc: string;
  features: EntryDraft[];
}

export interface ClassDraft {
  name: string;
  description: string;
  hit_die: number;
  saving_throws: string[];
  proficiencies: string[];
  spellcasting_ability: string;
  subclass_choice_level: number;
  subclass_flavor: string;
  features: EntryDraft[];
  subclasses: SubclassDraft[];
  source_url: string;
  icon: string; // borrowed drawn icon key, '' for none
}

export const emptyRace = (): RaceDraft => ({
  name: '',
  description: '',
  speed: 30,
  size: 'Medium',
  size_description: '',
  age: '',
  alignment: '',
  language_desc: '',
  languages: ['Common'],
  ability_bonuses: [],
  traits: [],
  subraces: [],
  source_url: '',
  icon: '',
});

export const emptyClass = (): ClassDraft => ({
  name: '',
  description: '',
  hit_die: 8,
  saving_throws: [],
  proficiencies: [],
  spellcasting_ability: '',
  subclass_choice_level: 3,
  subclass_flavor: '',
  features: [{ level: 1, name: '', desc: '' }],
  subclasses: [],
  source_url: '',
  icon: '',
});

const joinDesc = (desc: string | string[] | undefined) => (Array.isArray(desc) ? desc.join('\n\n') : desc || '');

export const raceToDraft = (r: CharRace): RaceDraft => ({
  name: r.name,
  description: r.description || '',
  speed: r.speed ?? 30,
  size: r.size || 'Medium',
  size_description: r.size_description || '',
  age: r.age || '',
  alignment: r.alignment || '',
  language_desc: r.language_desc || '',
  languages: r.languages || [],
  ability_bonuses: (r.ability_bonuses || []).map((b) => ({ ...b })),
  traits: (r.traits || []).map((t) => ({ name: t.name, desc: joinDesc(t.desc) })),
  subraces: (r.subraces || []).map((s) => ({
    name: s.name,
    desc: joinDesc(s.desc),
    ability_bonuses: (s.ability_bonuses || []).map((b) => ({ ...b })),
    traits: (s.racial_traits || []).map((t) => ({ name: t.name, desc: joinDesc(t.desc) })),
  })),
  source_url: r.source_url || '',
  icon: r.icon || '',
});

export const classToDraft = (c: CharClass): ClassDraft => ({
  name: c.name,
  description: c.description || '',
  hit_die: c.hit_die,
  saving_throws: c.saving_throws || [],
  proficiencies: c.proficiencies || [],
  spellcasting_ability: c.spellcasting_ability || '',
  subclass_choice_level: c.subclass_choice_level || 0,
  subclass_flavor: c.subclasses?.[0]?.subclass_flavor || '',
  features: (c.levels || []).flatMap((l) => l.features.map((f) => ({ level: l.level, name: f.name, desc: joinDesc(f.desc) }))),
  subclasses: (c.subclasses || []).map((s) => ({
    name: s.name,
    desc: joinDesc(s.desc),
    features: (s.levels || []).flatMap((l) => l.features.map((f) => ({ level: l.level, name: f.name, desc: joinDesc(f.desc) }))),
  })),
  source_url: c.source_url || '',
  icon: c.icon || '',
});

// Imported data is already in draft shape; fill any gaps with defaults.
export const importedRace = (data: Partial<RaceDraft>): RaceDraft => ({ ...emptyRace(), ...data, languages: data.languages || [] });
export const importedClass = (data: Partial<ClassDraft>): ClassDraft => ({
  ...emptyClass(),
  ...data,
  features: data.features?.length ? data.features : emptyClass().features,
});
