import React, { useState } from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter } from 'reactstrap';
import { useCharRaces, findCharRace } from '../useCharRaces';
import { getRaceIcon, Subrace } from '../raceTypes';

interface Props {
  selectedRaceIndex: string | null;
  selectedSubraceIndex: string | null;
  onSelect: (args: { raceIndex: string; raceName: string; subraceIndex?: string; subraceName?: string }) => void;
}

const formatBonus = (ability: string, bonus: number) => `${ability.toUpperCase()} +${bonus}`;

const RaceIconPicker = ({ selectedRaceIndex, selectedSubraceIndex, onSelect }: Props) => {
  const { races, loading } = useCharRaces('dnd_5e');
  const [openRaceIndex, setOpenRaceIndex] = useState<string | null>(null);
  const [pendingSubrace, setPendingSubrace] = useState<Subrace | null>(null);

  const openRace = findCharRace(races, openRaceIndex || undefined);

  const handleOpen = (raceIndex: string) => {
    setOpenRaceIndex(raceIndex);
    setPendingSubrace(null);
  };

  const handleClose = () => {
    setOpenRaceIndex(null);
    setPendingSubrace(null);
  };

  const handleConfirm = () => {
    if (!openRace) return;
    onSelect({
      raceIndex: openRace.index,
      raceName: openRace.name,
      subraceIndex: pendingSubrace?.index,
      subraceName: pendingSubrace?.name,
    });
    handleClose();
  };

  return (
    <div>
      {loading && <p className="text-muted-theme">Loading races...</p>}
      <div className="row g-3">
        {races.map((r) => {
          const isSelected = r.index === selectedRaceIndex;
          return (
            <div className="col-4 col-md-3 col-lg-2" key={r.index}>
              <div
                className="card-theme p-3 text-center"
                style={{
                  cursor: 'pointer',
                  position: 'relative',
                  border: isSelected ? '2px solid var(--theme-primary, #6a5acd)' : undefined,
                }}
                onClick={() => handleOpen(r.index)}
              >
                {isSelected && (
                  <span style={{ position: 'absolute', top: '0.35rem', right: '0.5rem', fontSize: '0.75rem' }}>✓</span>
                )}
                <div style={{ fontSize: '2rem', lineHeight: 1 }}>{getRaceIcon(r.index)}</div>
                <div className="text-theme mt-2" style={{ fontSize: '0.85rem' }}>
                  {isSelected && selectedSubraceIndex
                    ? r.subraces.find((s) => s.index === selectedSubraceIndex)?.name || r.name
                    : r.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={!!openRace} toggle={handleClose} size="lg">
        {openRace && (
          <>
            <ModalHeader toggle={handleClose}>
              {getRaceIcon(openRace.index)} {openRace.name}
            </ModalHeader>
            <ModalBody>
              <p className="text-muted-theme" style={{ fontSize: '0.85rem' }}>
                Speed {openRace.speed} ft. · Size {openRace.size}
              </p>

              <div className="d-flex flex-wrap gap-2 mb-3">
                {openRace.ability_bonuses.map((b) => (
                  <span key={b.ability_score} className="badge-cls">{formatBonus(b.ability_score, b.bonus)}</span>
                ))}
                {pendingSubrace?.ability_bonuses.map((b) => (
                  <span key={`sub-${b.ability_score}`} className="badge-cls">{formatBonus(b.ability_score, b.bonus)} ({pendingSubrace.name})</span>
                ))}
              </div>

              <p className="text-theme" style={{ fontSize: '0.85rem' }}>{openRace.size_description}</p>

              <h6 className="text-theme mt-3 mb-2">Traits</h6>
              <div className="d-flex flex-column gap-1">
                {openRace.traits.map((t) => (
                  <details key={t.index} style={{ fontSize: '0.82rem' }}>
                    <summary className="text-theme" style={{ cursor: 'pointer' }}>{t.name}</summary>
                    {t.desc.map((d, i) => (
                      <p key={i} className="text-muted-theme" style={{ fontSize: '0.78rem', marginLeft: '0.5rem' }}>{d}</p>
                    ))}
                  </details>
                ))}
                {pendingSubrace?.racial_traits.map((t) => (
                  <details key={`sub-${t.index}`} style={{ fontSize: '0.82rem' }}>
                    <summary className="text-theme" style={{ cursor: 'pointer' }}>{t.name} <span className="text-muted-theme">({pendingSubrace.name})</span></summary>
                    {t.desc.map((d, i) => (
                      <p key={i} className="text-muted-theme" style={{ fontSize: '0.78rem', marginLeft: '0.5rem' }}>{d}</p>
                    ))}
                  </details>
                ))}
              </div>

              {openRace.languages.length > 0 && (
                <p className="text-muted-theme mt-3 mb-0" style={{ fontSize: '0.8rem' }}>
                  Languages: {openRace.languages.join(', ')}
                </p>
              )}

              {openRace.subraces.length > 0 && (
                <>
                  <h6 className="text-theme mt-3 mb-2">Choose a Subrace</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {openRace.subraces.map((sr) => (
                      <button
                        key={sr.index}
                        type="button"
                        className={`btn btn-sm ${pendingSubrace?.index === sr.index ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setPendingSubrace(pendingSubrace?.index === sr.index ? null : sr)}
                      >
                        {sr.name}
                      </button>
                    ))}
                  </div>
                  {pendingSubrace && (
                    <p className="text-muted-theme mt-2 mb-0" style={{ fontSize: '0.78rem' }}>{pendingSubrace.desc}</p>
                  )}
                </>
              )}
            </ModalBody>
            <ModalFooter>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-theme-primary btn-sm" onClick={handleConfirm}>
                Choose {openRace.name}{pendingSubrace ? ` — ${pendingSubrace.name}` : ''}
              </button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
};

export default RaceIconPicker;
