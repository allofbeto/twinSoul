import { memo, useId, useMemo, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { CELL_PX, cellKey, geometry, type Cell, type Geometry } from './grid';
import { codeAt, type BattleMap } from './map';
import { BRIGHT, DIM, GREY } from './rules';
import { terrain } from './terrain';
import '../styles/battleMapTokens.css';

export interface MapToken {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: 'pc' | 'enemy' | 'npc';
  hidden?: boolean;
  active?: boolean;
  selected?: boolean;
  /** 0–1 health, shown as a bar (DM only). */
  hp?: number;
  /** At 0 HP. */
  down?: boolean;
  /** Portrait to show inside the token. */
  imageUrl?: string;
  /** Small badge, e.g. "2" for "Wolf 2" when the art hides the label. */
  badge?: string;
}

interface Props {
  map: BattleMap;
  zoom?: number;
  showGrid?: boolean;
  /** DM view shows secrets (traps). */
  dm?: boolean;
  /** Vision per cell (see rules.vision); omit for no fog. */
  seen?: Uint8Array;
  explored?: Uint8Array;
  tokens?: MapToken[];
  selection?: Cell[];
  preview?: Cell[];
  previewColor?: string;
  path?: Cell[];
  pathLabel?: string;
  onCellDown?: (cell: Cell, e: ReactPointerEvent<SVGSVGElement>) => void;
  onCellMove?: (cell: Cell, e: ReactPointerEvent<SVGSVGElement>) => void;
  onCellUp?: (cell: Cell, e: ReactPointerEvent<SVGSVGElement>) => void;
  children?: ReactNode;
  className?: string;
  /** Fit to the container instead of drawing at zoom × natural size. */
  fit?: boolean;
  title?: string;
}

const C = CELL_PX / 2;

// Terrain detail drawn on top of the base fill, centred on (0, 0) in a 32 px cell.
function Detail({ code, m, x, y, dm, hex }: { code: string; m: BattleMap; x: number; y: number; dm: boolean; hex: boolean }) {
  const p = m.props[cellKey(x, y)];
  switch (code) {
    case '.': return hex ? null : <path d={`M${-C} -5H${C}M${-C} 6H${C}`} stroke="rgba(0,0,0,.18)" />;
    case 's': return hex ? null : <path d={`M${-C} 0H${C}M0 ${-C}V0M-8 0V${C}`} stroke="rgba(0,0,0,.16)" />;
    case '~': case 'W': return <path d="M-10 -4q5 -4 10 0t10 0M-10 6q5 -4 10 0t10 0" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.4" />;
    case ',': case 'm': return <g fill="rgba(30,20,12,.55)"><circle cx="-7" cy="-6" r="2.4" /><circle cx="5" cy="-3" r="3" /><circle cx="-3" cy="7" r="2.4" /><circle cx="8" cy="8" r="2" /></g>;
    case 'h': return <path d="M-8 4l8 -8l8 8" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2" />;
    case 'B': return <path d="M-14 -8H14M-14 0H14M-14 8H14" stroke="#5a3d1f" />;
    case 'o': return <circle r="11" fill="#0a0710" stroke="#3a2a1a" strokeWidth="2.5" />;
    case '#': return hex ? null : <path d={`M${-C} 0H${C}M0 ${-C}V0M-8 0V${C}M8 0V${C}`} stroke="#3a2d4c" />;
    case 'D': {
      // Orient the door along the wall it sits in.
      const vertical = codeAt(m, x, y - 1) === '#' || codeAt(m, x, y + 1) === '#';
      const state = p?.state ?? 'closed';
      const bar = state === 'open'
        ? <rect x={vertical ? -C + 1 : -C + 2} y={vertical ? -C + 2 : -C + 1} width={vertical ? 5 : CELL_PX - 4} height={vertical ? CELL_PX - 4 : 5} fill="#c08a4a" stroke="#4a2f17" opacity=".7" />
        : <rect x={vertical ? -3 : -C + 2} y={vertical ? -C + 2 : -3} width={vertical ? 6 : CELL_PX - 4} height={vertical ? CELL_PX - 4 : 6} rx="1" fill="#c08a4a" stroke="#4a2f17" />;
      return <g>{bar}{state === 'locked' && <circle r="3.2" fill="#fde047" stroke="#713f12" />}</g>;
    }
    case 'c': return <g><rect x="-9" y="-9" width="18" height="18" fill="#a0713e" stroke="#4a2f17" strokeWidth="1.6" /><path d="M-9 -9l18 18M9 -9l-18 18" stroke="#4a2f17" /></g>;
    case 't': return <rect x="-12" y="-8" width="24" height="16" rx="2" fill="#9b6a37" stroke="#4a2f17" strokeWidth="1.6" />;
    case 'P': return <circle r="11" fill="#a7a3b3" stroke="#4b4858" strokeWidth="2.4" />;
    case 'b': return <ellipse rx="12" ry="10" fill="#77746c" stroke="#45433d" strokeWidth="1.8" />;
    case 'T': return <g><circle r="13" fill="#1d3b1b" stroke="#122812" /><circle cx="-4" cy="-4" r="6" fill="#2e5a29" /></g>;
    case 'f': return <g><path d="M0 -12c8 8 9 13 5 19c-3 4 -8 4 -10 0c-4 -6 0 -11 5 -19z" fill="#f97316" /><path d="M0 -3c4 4 4 8 1 10c-1 1 -3 1 -4 0c-1 -3 0 -6 3 -10z" fill="#fde047" /></g>;
    case 'l': {
      const lit = p?.lit !== false;
      return <g><circle r="7" fill="#3a2e10" stroke="#a16207" strokeWidth="1.5" />{lit && <path d="M0 -7c4 4 4 7 2 9c-1 1 -3 1 -4 0c-2 -2 -1 -5 2 -9z" fill="#fbbf24" />}</g>;
    }
    case '^': return dm ? <g><rect x="-11" y="-11" width="22" height="22" fill="rgba(244,114,182,.18)" stroke="#f472b6" strokeDasharray="3 2" /><text y="5" fontSize="14" textAnchor="middle" fill="#f9a8d4" fontFamily="sans-serif">!</text></g> : null;
    default: return null;
  }
}

const BaseLayer = memo(function BaseLayer({ m, g, dm, showGrid }: { m: BattleMap; g: Geometry; dm: boolean; showGrid: boolean }) {
  const hex = m.grid === 'hex';
  const cells: ReactNode[] = [];
  const details: ReactNode[] = [];
  const labels: ReactNode[] = [];
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
    let code = m.cells[y][x];
    if (code === '^' && !dm) code = '.';
    const t = terrain(code);
    const [cx, cy] = g.center(x, y);
    cells.push(hex
      ? <polygon key={`c${x},${y}`} points={g.outline(cx, cy, -0.5)} fill={t.fill} />
      : <rect key={`c${x},${y}`} x={cx - C} y={cy - C} width={CELL_PX + 0.5} height={CELL_PX + 0.5} fill={t.fill} />);
    details.push(<g key={`d${x},${y}`} transform={`translate(${cx} ${cy})`}><Detail code={code} m={m} x={x} y={y} dm={dm} hex={hex} /></g>);
    const label = m.props[cellKey(x, y)]?.label;
    if (label) labels.push(<text key={`l${x},${y}`} x={cx} y={cy - C - 3} fontSize="10" fontWeight="700" textAnchor="middle" fill="#fff" stroke="rgba(0,0,0,.7)" strokeWidth="3" paintOrder="stroke" fontFamily="sans-serif">{label}</text>);
  }
  let grid: ReactNode = null;
  if (showGrid) {
    if (hex) {
      const polys: ReactNode[] = [];
      for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) polys.push(<polygon key={`${x},${y}`} points={g.outline(...g.center(x, y))} />);
      grid = <g fill="none" stroke="rgba(255,255,255,.16)">{polys}</g>;
    } else {
      const [W, H] = g.size(m.width, m.height);
      let d = '';
      for (let x = 0; x <= m.width; x++) d += `M${x * CELL_PX} 0V${H}`;
      for (let y = 0; y <= m.height; y++) d += `M0 ${y * CELL_PX}H${W}`;
      grid = <path d={d} stroke="rgba(255,255,255,.13)" fill="none" />;
    }
  }
  return <g>{cells}{details}{grid}{labels}</g>;
});

export default function BattleMapView({
  map, zoom = 1, showGrid = true, dm = true, seen, explored, tokens = [], selection, preview, previewColor = '#c9a94a',
  path, pathLabel, onCellDown, onCellMove, onCellUp, children, className, fit, title,
}: Props) {
  const g = geometry(map.grid);
  const [W, H] = g.size(map.width, map.height);
  const uid = useId().replace(/:/g, '');

  const fog = useMemo(() => {
    if (!seen) return null;
    const out: ReactNode[] = [];
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      const i = y * map.width + x;
      const s = seen[i];
      if (s === BRIGHT) continue;
      const fill = s === DIM ? 'rgba(6,3,13,.35)' : s === GREY ? 'rgba(14,18,34,.55)' : explored?.[i] ? 'rgba(6,3,13,.78)' : '#06030d';
      const [cx, cy] = g.center(x, y);
      out.push(map.grid === 'hex'
        ? <polygon key={i} points={g.outline(cx, cy, -0.8)} fill={fill} />
        : <rect key={i} x={cx - C - 0.25} y={cy - C - 0.25} width={CELL_PX + 0.5} height={CELL_PX + 0.5} fill={fill} />);
    }
    return <g pointerEvents="none">{out}</g>;
  }, [seen, explored, map.width, map.height, map.grid, g]);

  const toCell = (e: ReactPointerEvent<SVGSVGElement>): Cell => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return g.cellAt(p.x, p.y);
  };

  const outline = (cells: Cell[] | undefined, color: string, fill: string) => cells?.map(([x, y]) => {
    const [cx, cy] = g.center(x, y);
    return <polygon key={`${x},${y}`} points={g.outline(cx, cy, 1.5)} fill={fill} stroke={color} strokeWidth="2" />;
  });

  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      width={fit ? '100%' : W * zoom}
      height={fit ? '100%' : H * zoom}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={title ?? map.name}
      style={{ display: 'block', touchAction: onCellDown ? 'none' : undefined, userSelect: 'none' }}
      onPointerDown={onCellDown ? (e) => { e.currentTarget.setPointerCapture(e.pointerId); onCellDown(toCell(e), e); } : undefined}
      onPointerMove={onCellMove ? (e) => onCellMove(toCell(e), e) : undefined}
      onPointerUp={onCellUp ? (e) => onCellUp(toCell(e), e) : undefined}
    >
      <defs>
        <filter id={`tokgray-${uid}`}><feColorMatrix type="saturate" values="0" /></filter>
      </defs>
      <BaseLayer m={map} g={g} dm={dm} showGrid={showGrid} />
      {fog}
      <g pointerEvents="none">
        {outline(preview, previewColor, `${previewColor}33`)}
        {outline(selection, '#c9a94a', 'none')}
        {path && path.length > 1 && (
          <>
            <polyline points={path.map(([x, y]) => g.center(x, y).join(',')).join(' ')} fill="none" stroke="#c9a94a" strokeWidth="3.5" strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" />
            {pathLabel && (() => {
              const [lx, ly] = g.center(...path[path.length - 1]);
              const w = pathLabel.length * 6.4 + 12;
              return <g transform={`translate(${lx - w / 2} ${ly - C - 22})`}><rect width={w} height="18" rx="4" fill="#c9a94a" /><text x="6" y="13" fontSize="11.5" fontWeight="700" fill="#100a1e" fontFamily="sans-serif">{pathLabel}</text></g>;
            })()}
          </>
        )}
        {/* Fallen first, so the living are drawn on top of them; the active creature last. */}
        {[...tokens].sort((a, b) => Number(!!b.down) - Number(!!a.down) || Number(!!a.active) - Number(!!b.active)).map((t) => {
          const [cx, cy] = g.center(t.x, t.y);
          const color = t.kind === 'pc' ? '#2563eb' : t.kind === 'npc' ? '#7c3aed' : '#b91c1c';
          // 0 HP: enemies are dead, player characters and allies are dying.
          const dead = !!t.down && t.kind === 'enemy';
          const dying = !!t.down && !dead;
          const hpColor = t.hp === undefined ? '' : t.hp > 0.5 ? '#22c55e' : t.hp > 0.25 ? '#f59e0b' : '#ef4444';
          const r = C - 4;
          return (
            <g key={t.id} opacity={t.hidden && !t.down ? 0.6 : 1} className={t.active ? 'bm-tok is-active' : 'bm-tok'}>
              {t.active && (
                <>
                  <polygon points={g.outline(cx, cy, 0.5)} className="bm-turn-cell" />
                  <circle cx={cx} cy={cy} r={C + 2} className="bm-turn-glow" />
                </>
              )}
              {dead && (
                <path className="bm-splat" d={`M${cx - 13} ${cy + 3}c2 -6 8 -9 13 -8c6 -3 12 1 13 6c3 4 0 9 -5 10c-4 4 -12 4 -16 1c-5 1 -8 -4 -5 -9z`} />
              )}
              {t.selected && <circle cx={cx} cy={cy} r={C + 1} fill="rgba(56,189,248,.18)" stroke="#38bdf8" strokeWidth="2" />}
              <g transform={dead ? `rotate(-12 ${cx} ${cy})` : undefined}>
                <circle cx={cx} cy={cy} r={r} fill={dead ? '#3a3542' : dying ? '#3b1520' : color}
                  stroke={dead ? '#6b6475' : dying ? '#ef4444' : t.imageUrl ? color : '#fff'}
                  strokeWidth={t.imageUrl || t.down ? 3 : 2.2} strokeDasharray={t.hidden && !t.down ? '4 3' : undefined}
                  className={dying ? 'bm-dying-ring' : undefined} />
                {t.imageUrl ? (
                  <>
                    <clipPath id={`tokclip-${uid}-${t.id}`}><circle cx={cx} cy={cy} r={r - 1.5} /></clipPath>
                    <image href={t.imageUrl} x={cx - r + 1.5} y={cy - r + 1.5} width={(r - 1.5) * 2} height={(r - 1.5) * 2}
                      preserveAspectRatio="xMidYMid slice" clipPath={`url(#tokclip-${uid}-${t.id})`}
                      filter={dead ? `url(#tokgray-${uid})` : undefined} opacity={dead ? 0.55 : dying ? 0.7 : 1} />
                  </>
                ) : (
                  <text x={cx} y={cy + 4} fontSize={t.label.length > 2 ? 9 : 11} fontWeight="700" textAnchor="middle"
                    fill={dead ? '#8d8698' : '#fff'} fontFamily="sans-serif">{t.label}</text>
                )}
              </g>
              {t.badge && !t.down && t.imageUrl && (
                <g>
                  <circle cx={cx + C - 6} cy={cy - C + 6} r="6" fill={color} stroke="#fff" strokeWidth="1.2" />
                  <text x={cx + C - 6} y={cy - C + 9} fontSize="8" fontWeight="700" textAnchor="middle" fill="#fff" fontFamily="sans-serif">{t.badge}</text>
                </g>
              )}
              {dead && (
                // A big skull right over the greyed-out token.
                <g transform={`translate(${cx} ${cy}) scale(1.55)`} aria-label="dead">
                  <path d="M-5.2 0.4a5.2 5.2 0 1 1 10.4 0v2.2h-1.8v2.1h-6.8v-2.1h-1.8z" fill="#f3f4f6" stroke="#111827" strokeWidth="0.9" strokeLinejoin="round" />
                  <circle cx="-2.1" cy="0.3" r="1.45" fill="#111827" /><circle cx="2.1" cy="0.3" r="1.45" fill="#111827" />
                  <path d="M-0.6 2.6h1.2l-0.6 -1.2z" fill="#111827" />
                </g>
              )}
              {dying && (
                <>
                  <circle cx={cx} cy={cy} r={r - 1.5} fill="rgba(220,38,38,.38)" />
                  <g transform={`translate(${cx} ${cy + C - 5})`} aria-label="dying">
                    <g className="bm-heartbeat">
                      <circle r="6.5" fill="#7f1d1d" stroke="#fecaca" strokeWidth="1.2" />
                      <path d="M0 3.4l-3.2-3.1a2 2 0 0 1 2.8-2.8l0.4 0.4l0.4-0.4a2 2 0 0 1 2.8 2.8z" fill="#fecaca" />
                    </g>
                  </g>
                </>
              )}
              {hpColor && !t.down && (
                <g>
                  <rect x={cx - 11} y={cy + C - 6} width="22" height="4" rx="2" fill="#1f1530" />
                  <rect x={cx - 11} y={cy + C - 6} width={22 * Math.max(0, Math.min(1, t.hp!))} height="4" rx="2" fill={hpColor} />
                </g>
              )}
              {t.active && (
                <g className="bm-turn-marker" transform={`translate(${cx} ${cy - C - 4})`}>
                  <path d="M-7 -9h14l-7 8z" fill="#c9a94a" stroke="#100a1e" strokeWidth="1.2" strokeLinejoin="round" />
                </g>
              )}
            </g>
          );
        })}
      </g>
      {children}
    </svg>
  );
}
