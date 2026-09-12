export type CombatantSource = 'bestiary' | 'homebrew' | 'custom';

export interface CombatantRow {
  key: string;
  id?: string;
  monster_id?: string | null;
  item_id?: string | null;
  name: string;
  challenge_rating?: string;
  xp: number;
  quantity: number;
  notes?: string;
  source: CombatantSource;
  _destroy?: boolean;
}

export interface PhaseRow {
  key: string;
  id?: string;
  name: string;
  position: number;
  notes?: string;
  combatants: CombatantRow[];
  _destroy?: boolean;
}

export interface BestiaryOption {
  id: string;
  name: string;
  creature_type: string;
  size: string;
  challenge_rating: string;
  cr_numeric: number;
  xp: number;
  habitats: string[];
}

export interface HomebrewOption {
  id: string;
  name: string;
  kind: string;
  challenge_rating: string | null;
}

export interface SessionOption {
  id: string;
  title: string;
  campaign_id: string | null;
  session_number: number;
}
