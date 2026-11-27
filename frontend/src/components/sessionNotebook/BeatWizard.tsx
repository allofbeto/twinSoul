import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { CreateCampaignObject } from '../formComponents/editor/CampaignObjectMention';
import { SectionEdit } from './BeatSections';
import { BEAT_TYPES, beatType, newBeat, sectionQuestion, type Beat, type BeatType } from './model';

interface Props {
  campaignId?: string;
  onCreateObject?: CreateCampaignObject;
  /** Title of the beat this one goes after, for context. */
  after?: string;
  /** The notebook root: its theme tokens are copied onto the portalled dialog. */
  themeFrom?: RefObject<HTMLElement | null>;
  onDone: (beat: Beat) => void;
  onCancel: () => void;
}

// Guided beat builder: pick a type and a one-liner, then answer one short
// question per section that type needs. Every question can be skipped, and
// "Skip to editor" adds the beat as it stands.
const TOKENS = ['--nb-bg', '--nb-panel', '--nb-card', '--nb-border', '--nb-ink', '--nb-dim', '--nb-accent', '--nb-font-head'];

export default function BeatWizard({ campaignId, onCreateObject, after, themeFrom, onDone, onCancel }: Props) {
  // Rendered into <body> so it sits above the theatre chrome; carry the notebook's theme along.
  const [theme] = useState<CSSProperties>(() => {
    const el = themeFrom?.current;
    if (!el) return {};
    const cs = getComputedStyle(el);
    const vars: Record<string, string> = { fontFamily: cs.fontFamily };
    TOKENS.forEach((t) => { const v = cs.getPropertyValue(t).trim(); if (v) vars[t] = v; });
    return vars as CSSProperties;
  });

  const [beat, setBeat] = useState<Beat>(() => ({ ...newBeat(''), type: undefined as unknown as BeatType }));
  const [step, setStep] = useState(0);
  const titleRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const info = beat.type ? beatType(beat.type) : null;
  const steps = info?.steps ?? [];
  const total = 1 + steps.length;
  const isLast = step === total - 1;
  const canLeaveFirst = !!beat.type && !!beat.title.trim();

  useEffect(() => { dialogRef.current?.focus(); }, []);
  useEffect(() => { if (step === 0 && beat.type) titleRef.current?.focus(); }, [beat.type, step]);

  const patch = (fn: (b: Beat) => Beat) => setBeat((b) => fn(b));
  const finish = () => onDone({ ...beat, type: beat.type ?? 'other', title: beat.title.trim() || 'New beat' });
  const next = () => {
    if (step === 0 && !canLeaveFirst) return;
    if (isLast) finish(); else setStep((s) => s + 1);
  };

  const section = step > 0 ? steps[step - 1] : null;
  const question = section && beat.type ? sectionQuestion(section, beat.type) : null;
  const upcoming = beat.type && steps[step] ? sectionQuestion(steps[step], beat.type).q.replace(/\?$/, '') : null;
  const nextLabel = beat.type && isLast ? 'Add beat' : upcoming ? `Next: ${upcoming} ›` : 'Next ›';

  return createPortal(
    <div className="nb-wiz-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div
        className="nb nb-wiz" style={theme} role="dialog" aria-modal="true" aria-label="New beat" tabIndex={-1} ref={dialogRef}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } }}
      >
        <div className="nb-wiz-top">
          <span className="nb-wiz-context">{after ? `New beat · after “${after}”` : 'New beat'}</span>
          <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" disabled={!canLeaveFirst} onClick={finish}
            title={canLeaveFirst ? 'Add the beat and fill in the rest yourself' : 'Pick a type and give it a title first'}>
            Skip to editor
          </button>
          <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" aria-label="Close" onClick={onCancel}>✕</button>
        </div>

        <div className="nb-wiz-steps" aria-hidden="true">
          {Array.from({ length: beat.type ? total : 3 }, (_, i) => <i key={i} className={i <= step ? 'is-on' : ''} />)}
        </div>

        {step === 0 ? (
          <>
            <h2 className="nb-wiz-q">What happens in this beat?</h2>
            <p className="nb-wiz-hint">Pick one — you can change it later.</p>
            <div className="nb-wiz-types" role="radiogroup" aria-label="Beat type">
              {BEAT_TYPES.map((t) => (
                <button
                  key={t.type} type="button" role="radio" aria-checked={beat.type === t.type}
                  className={`nb-wiz-type ${beat.type === t.type ? 'is-on' : ''}`}
                  onClick={() => patch((b) => ({ ...b, type: t.type }))}
                >
                  <span className={`nb-type-ico nb-type-ico--${t.type}`} aria-hidden="true">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
            {info && (
              <label className="nb-wiz-field">
                <span>{info.ask} <em>In one line.</em></span>
                <input
                  ref={titleRef} className="nb-input" value={beat.title}
                  placeholder={info.type === 'fight' ? 'Wolves ambush the party inside the old mill' : 'One line is plenty'}
                  onChange={(e) => patch((b) => ({ ...b, title: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); next(); } }}
                />
              </label>
            )}
          </>
        ) : (
          section && question && (
            <>
              <h2 className="nb-wiz-q">{question.q}</h2>
              <p className="nb-wiz-hint">{question.hint}</p>
              <div className="nb-wiz-section" key={section}>
                <SectionEdit beat={beat} section={section} patch={patch} campaignId={campaignId} onCreateObject={onCreateObject} />
              </div>
            </>
          )
        )}

        <div className="nb-wiz-foot">
          {step > 0 ? <button type="button" className="nb-btn nb-btn--ghost" onClick={() => setStep((s) => s - 1)}>‹ Back</button> : <span />}
          <span className="nb-wiz-foot-right">
            {step > 0 && !isLast && <button type="button" className="nb-btn nb-btn--ghost" onClick={() => setStep((s) => s + 1)}>Skip</button>}
            <button type="button" className="nb-btn nb-btn--primary" disabled={step === 0 && !canLeaveFirst} onClick={next}>{nextLabel}</button>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
