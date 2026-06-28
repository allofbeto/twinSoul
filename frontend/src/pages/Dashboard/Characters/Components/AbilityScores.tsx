import React from 'react';
import { ABILITY_SCORES } from '../constants';

interface Props {
  form: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  handleNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const getModifier = (score: number) => {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

const RadarChart = ({ form }: { form: Props['form'] }) => {
  const size = 220;
  const center = size / 2;
  const maxValue = 30;
  const levels = 5;
  const keys = ABILITY_SCORES.map(({ key }) => key);
  const labels = ABILITY_SCORES.map(({ label }) => label);
  const numAxes = keys.length;
  const angleOffset = -Math.PI / 2;
  const maxRadius = center - 35;

  const getPoint = (index: number, radius: number) => {
    const angle = (index * 2 * Math.PI) / numAxes + angleOffset;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const gridPolygons = Array.from({ length: levels }, (_, i) => {
    const r = (maxRadius * (i + 1)) / levels;
    return keys.map((_, idx) => {
      const p = getPoint(idx, r);
      return `${p.x},${p.y}`;
    }).join(' ');
  });

  const axes = keys.map((_, idx) => {
    const p = getPoint(idx, maxRadius);
    return { x1: center, y1: center, x2: p.x, y2: p.y };
  });

  const dataPoints = keys.map((key, idx) => {
    const value = (form as any)[key];
    const r = (value / maxValue) * maxRadius;
    return getPoint(idx, r);
  });

  const labelPoints = labels.map((label, idx) => {
    const score = (form as any)[keys[idx]];
    const mod = getModifier(score);
    const p = getPoint(idx, maxRadius + 22);
    return { label, mod, x: p.x, y: p.y };
  });

  return (
    <svg width={size} height={size}>
      {gridPolygons.map((points, i) => (
        <polygon key={i} points={points} fill="none" stroke="var(--color-border)" strokeWidth={1} />
      ))}
      {axes.map((axis, i) => (
        <line key={i} x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="var(--color-border)" strokeWidth={1} />
      ))}
      <polygon
        points={dataPoints.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="var(--color-primary)"
        fillOpacity={0.25}
        stroke="var(--color-primary)"
        strokeWidth={2}
      />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--color-primary)" />
      ))}
      {labelPoints.map(({ label, mod, x, y }, i) => (
        <text key={i} x={x} textAnchor="middle" fill="var(--color-text-muted)" fontSize={10}>
          <tspan x={x} dy={y - 6} dominantBaseline="middle" fontWeight={600}>{label}</tspan>
          <tspan x={x} dy={14} dominantBaseline="middle" fill="var(--color-primary)" fontWeight={700}>{mod}</tspan>
        </text>
      ))}
    </svg>
  );
};

const AbilityScores = ({ form, handleNumberChange }: Props) => {
  return (
    <div className="card-theme p-4 mb-4 h-100">
      <h5 className="text-theme mb-3">Ability Scores</h5>
      <div className="d-flex flex-column align-items-center gap-4">
  
        {/* Radar Chart */}
        <RadarChart form={form} />
  
        {/* Inputs - 2 rows of 3 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', width: '100%' }}>
          {ABILITY_SCORES.map(({ key, label }) => (
            <div key={key} style={{ textAlign: 'center' }}>
              <label className="form-label text-muted-theme text-center d-block">{label}</label>
              <input
                type="number"
                name={key}
                className="form-control input-theme text-center"
                min={1}
                max={30}
                value={(form as any)[key]}
                onChange={handleNumberChange}
              />
              <small className="text-muted-theme">{getModifier((form as any)[key])}</small>
            </div>
          ))}
        </div>
  
      </div>
    </div>
  );
};

export default AbilityScores;