import { useMemo, useState } from 'react';
import BattleMapView from './BattleMapView';
import { BIOMES, generateMap, type Biome } from './generate';
import type { GridType } from './grid';
import { blankMap, MAX_HEIGHT, MAX_WIDTH, MIN_SIZE, type BattleMap, type Lighting } from './map';
import type { TerrainCode } from './terrain';

const SIZES = [
  { label: 'Small', w: 16, h: 12 },
  { label: 'Medium', w: 26, h: 18 },
  { label: 'Large', w: 40, h: 28 },
];
const FILLS: { code: TerrainCode; label: string }[] = [
  { code: 'g', label: 'Grass' }, { code: 's', label: 'Stone' }, { code: '.', label: 'Wood' }, { code: 'd', label: 'Dirt' },
];

interface Props {
  /** Start on the quick-map generator (random fights) instead of a blank map. */
  startQuick?: boolean;
  submitLabel?: string;
  busy?: boolean;
  onSubmit: (map: BattleMap) => void;
  onCancel?: () => void;
}

const clampSize = (n: number, max: number) => Math.max(MIN_SIZE, Math.min(max, Math.round(n) || MIN_SIZE));

// Name, grid, size, and either a blank map or a generated one, with a live preview.
export default function NewMapForm({ startQuick = false, submitLabel = 'Create map', busy, onSubmit, onCancel }: Props) {
  const [name, setName] = useState('');
  const [grid, setGrid] = useState<GridType>('square');
  const [w, setW] = useState(26);
  const [h, setH] = useState(18);
  const [mode, setMode] = useState<'blank' | 'quick'>(startQuick ? 'quick' : 'blank');
  const [fill, setFill] = useState<TerrainCode>('g');
  const [biome, setBiome] = useState<Biome>('forest');
  const [obstacles, setObstacles] = useState(0.5);
  const [hazards, setHazards] = useState(0.2);
  const [lighting, setLighting] = useState<Lighting>('bright');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));

  const width = clampSize(w, MAX_WIDTH), height = clampSize(h, MAX_HEIGHT);
  const map = useMemo(() => {
    const base = mode === 'quick'
      ? generateMap({ biome, grid, width, height, obstacles, hazards, lighting, seed })
      : { ...blankMap('New map', grid, width, height, fill), lighting };
    return { ...base, name: name.trim() || base.name };
  }, [mode, biome, grid, width, height, obstacles, hazards, lighting, seed, fill, name]);

  return (
    <form className="bm-new" onSubmit={(e) => { e.preventDefault(); onSubmit(map); }}>
      <div className="bm-new-fields">
        <label className="form-label text-muted-theme" htmlFor="bm-name">Name</label>
        <input id="bm-name" className="form-control input-theme" placeholder={map.name} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />

        <div className="bm-new-row">
          <div>
            <span className="form-label text-muted-theme d-block">Grid</span>
            <div className="bm-seg" role="radiogroup" aria-label="Grid">
              {(['square', 'hex'] as GridType[]).map((gt) => (
                <button key={gt} type="button" role="radio" aria-checked={grid === gt} className={grid === gt ? 'is-on' : ''} onClick={() => setGrid(gt)}>
                  {gt === 'square' ? '▦ Square' : '⬡ Hex'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="form-label text-muted-theme d-block">Size</span>
            <div className="bm-seg" role="radiogroup" aria-label="Size">
              {SIZES.map((s) => (
                <button key={s.label} type="button" role="radio" aria-checked={w === s.w && h === s.h} className={w === s.w && h === s.h ? 'is-on' : ''} onClick={() => { setW(s.w); setH(s.h); }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="bm-size">
            <input className="form-control input-theme" type="number" min={MIN_SIZE} max={MAX_WIDTH} value={w} onChange={(e) => setW(Number(e.target.value))} aria-label="Width in cells" />
            <span>×</span>
            <input className="form-control input-theme" type="number" min={MIN_SIZE} max={MAX_HEIGHT} value={h} onChange={(e) => setH(Number(e.target.value))} aria-label="Height in cells" />
          </div>
        </div>

        <span className="form-label text-muted-theme d-block">Start from</span>
        <div className="bm-seg bm-seg--wide" role="radiogroup" aria-label="Start from">
          <button type="button" role="radio" aria-checked={mode === 'blank'} className={mode === 'blank' ? 'is-on' : ''} onClick={() => setMode('blank')}>Blank map</button>
          <button type="button" role="radio" aria-checked={mode === 'quick'} className={mode === 'quick' ? 'is-on' : ''} onClick={() => setMode('quick')}>✦ Quick map</button>
        </div>

        {mode === 'blank' ? (
          <div className="bm-new-row">
            <div>
              <span className="form-label text-muted-theme d-block">Ground</span>
              <div className="bm-seg">
                {FILLS.map((f) => <button key={f.code} type="button" className={fill === f.code ? 'is-on' : ''} onClick={() => setFill(f.code)}>{f.label}</button>)}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bm-biomes" role="radiogroup" aria-label="Biome">
              {BIOMES.map((b) => (
                <button key={b.biome} type="button" role="radio" aria-checked={biome === b.biome} className={biome === b.biome ? 'is-on' : ''} onClick={() => setBiome(b.biome)}>
                  <span aria-hidden="true">{b.icon}</span>{b.label}
                </button>
              ))}
            </div>
            <div className="bm-new-row">
              <label className="bm-range">Obstacles<input type="range" min={0} max={1} step={0.05} value={obstacles} onChange={(e) => setObstacles(Number(e.target.value))} /></label>
              <label className="bm-range">Hazards<input type="range" min={0} max={1} step={0.05} value={hazards} onChange={(e) => setHazards(Number(e.target.value))} /></label>
            </div>
          </>
        )}

        <div className="bm-new-row">
          <div>
            <span className="form-label text-muted-theme d-block">Light</span>
            <div className="bm-seg">
              {([['bright', '☀ Day'], ['dim', '◐ Dusk'], ['dark', '☾ Dark']] as [Lighting, string][]).map(([l, label]) => (
                <button key={l} type="button" className={lighting === l ? 'is-on' : ''} onClick={() => setLighting(l)}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bm-new-preview">
        <div className="bm-new-canvas"><BattleMapView map={map} fit showGrid={width <= 40} /></div>
        <div className="bm-new-actions">
          {mode === 'quick' && <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSeed((s) => s + 1)}>↻ Generate again</button>}
          <span className="bm-spacer" />
          {onCancel && <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button>}
          <button type="submit" className="btn btn-theme-primary" disabled={busy}>{busy ? 'Creating…' : submitLabel}</button>
        </div>
      </div>
    </form>
  );
}
