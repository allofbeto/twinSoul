import React, { useEffect, useState } from 'react';
import { getItems, getMonsters, deleteItem, getJoinedCampaigns, getCampaignItems } from '../../../api/backendHelpers';
import { useNavigate } from 'react-router-dom';
import DataTable, { Column } from '../../../components/DataTable';
import { VISIBILITY_SECTIONS } from './Components/VisibilityPanel';
import BestiaryFilterBar from './Components/BestiaryFilterBar';
import { useBestiaryFilters } from './useBestiaryFilters';
import MonsterDetailSlideOver from './Components/MonsterDetailSlideOver';
import ConfirmDialog from '../../../components/ConfirmDialog';
import '../../../styles/npc.css';

interface BestiaryMonster {
  id: string;
  name: string;
  size: string;
  creature_type: string;
  challenge_rating: string;
  cr_numeric: number;
  armor_class: number;
  hit_points: number;
  habitats: string[];
}

interface HomebrewMonster {
  id: string;
  name: string;
  kind: string;
  disposition: string;
  challenge_rating: string | null;
  max_hp: number;
  current_hp: number;
  armor_class: number;
  visible_sections: string[];
}

interface Campaign {
  id: string;
  name: string;
}

interface CampaignMonster {
  id: string;
  name: string;
  campaign_id: string;
  campaign_name: string;
  visible_sections: string[];
  armor_class?: number;
  current_hp?: number;
  max_hp?: number;
}

const Monsters = () => {
  const [bestiary, setBestiary] = useState<BestiaryMonster[]>([]);
  const [homebrew, setHomebrew] = useState<HomebrewMonster[]>([]);
  const [campaignMonsters, setCampaignMonsters] = useState<CampaignMonster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<HomebrewMonster | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedMonsterId, setSelectedMonsterId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const [bestiaryRes, itemsRes, joinedRes] = await Promise.all([
          getMonsters(),
          getItems(),
          getJoinedCampaigns(),
        ]);
        setBestiary(bestiaryRes.data);
        setHomebrew(itemsRes.data.filter((i: HomebrewMonster) => i.kind === 'monster'));

        const joined: Campaign[] = joinedRes.data;
        const perCampaign = await Promise.all(
          joined.map(async (c) => {
            try {
              const res = await getCampaignItems(c.id);
              return res.data
                .filter((i: any) => i.kind === 'monster')
                .map((i: any) => ({ ...i, campaign_id: c.id, campaign_name: c.name }));
            } catch {
              return [];
            }
          })
        );
        setCampaignMonsters(perCampaign.flat());
      } catch {
        setError('Could not load monsters.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const { filters, setFilters, filtered: filteredBestiary, creatureTypes, sizes, habitats, clear } =
    useBestiaryFilters(bestiary);

  const confirmDeleteHomebrew = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteItem(deleteTarget.id);
      setHomebrew((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError('Could not delete monster.');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<BestiaryMonster>[] = [
    {
      key: 'name',
      label: 'NAME',
      width: '28%',
      sortable: true,
      render: (m) => (
        <span style={{ color: 'var(--color-primary)' }}>{m.name}</span>
      ),
    },
    {
      key: 'creature_type',
      label: 'TYPE',
      width: '17%',
      sortable: true,
      render: (m) => <span className="text-muted-theme" style={{ textTransform: 'capitalize' }}>{m.creature_type}</span>,
    },
    {
      key: 'habitats',
      label: 'HABITAT',
      width: '25%',
      render: (m) => (
        <div className="d-flex flex-wrap gap-1">
          {(m.habitats || []).map((h) => (
            <span key={h} className="badge-cls" style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>{h}</span>
          ))}
        </div>
      ),
    },
    {
      key: 'cr_numeric',
      label: 'CR',
      width: '10%',
      align: 'center',
      sortable: true,
      render: (m) => <span className="badge-cls">{m.challenge_rating}</span>,
    },
    {
      key: 'armor_class',
      label: 'AC',
      width: '10%',
      align: 'center',
      sortable: true,
    },
    {
      key: 'hit_points',
      label: 'HP',
      width: '10%',
      align: 'center',
      sortable: true,
    },
  ];

  if (loading) return <p className="text-muted-theme">Loading...</p>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-theme mb-1">Monsters</h2>
          <p className="text-muted-theme mb-0">The shared bestiary, plus your own homebrew stat blocks.</p>
        </div>
        <button
          className="btn btn-theme-primary"
          onClick={() => navigate('/dashboard/monsters/new')}
        >
          + New Homebrew Monster
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card-theme p-4 mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h5 className="text-theme mb-0">Bestiary <span className="text-muted-theme">({filteredBestiary.length})</span></h5>
        </div>
        <BestiaryFilterBar
          filters={filters}
          onChange={setFilters}
          creatureTypes={creatureTypes}
          sizes={sizes}
          habitats={habitats}
          onClear={clear}
        />
        <DataTable
          columns={columns}
          data={filteredBestiary}
          keyField="id"
          pageSize={15}
          emptyMessage="No monsters match."
          onRowClick={(m) => setSelectedMonsterId(m.id)}
        />
      </div>

      <div className="card-theme p-4 mb-4">
        <h5 className="text-theme mb-3">Your Homebrew</h5>
        {homebrew.length === 0 ? (
          <p className="text-muted-theme mb-0">No homebrew monsters yet. Create one to add it to your own campaigns.</p>
        ) : (
          <div className="row g-3">
            {homebrew.map((monster) => (
              <div className="col-md-6 col-lg-4" key={monster.id}>
                <div className="card-theme p-3 h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="text-theme mb-0">{monster.name}</h6>
                      <span className={`npc-disposition-badge npc-disposition-${monster.disposition}`}>
                        {monster.disposition}
                      </span>
                    </div>
                    <p className="text-muted-theme mb-2">
                      {monster.challenge_rating ? `CR ${monster.challenge_rating}` : 'No CR set'}
                    </p>
                    <div className="d-flex gap-3 mb-2">
                      <small className="text-muted-theme">HP: {monster.current_hp}/{monster.max_hp}</small>
                      <small className="text-muted-theme">AC: {monster.armor_class}</small>
                    </div>
                    {monster.visible_sections?.length > 0 ? (
                      <div className="d-flex flex-wrap gap-1">
                        {monster.visible_sections.map((s) => (
                          <span key={s} className="badge-cls" style={{ fontSize: '0.65rem' }}>
                            {VISIBILITY_SECTIONS.find((v) => v.key === s)?.label || s} visible
                          </span>
                        ))}
                      </div>
                    ) : (
                      <small className="text-muted-theme" style={{ fontStyle: 'italic' }}>🔒 DM-only</small>
                    )}
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    <button
                      className="btn btn-theme-primary btn-sm"
                      onClick={() => navigate(`/dashboard/monsters/${monster.id}`)}
                    >
                      View
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleteTarget(monster)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {campaignMonsters.length > 0 && (
        <div className="card-theme p-4">
          <h5 className="text-theme mb-1">Campaign Monsters</h5>
          <p className="text-muted-theme mb-3" style={{ fontSize: '0.85rem' }}>
            Homebrew monsters your DMs have revealed to you, at least in part.
          </p>
          <div className="row g-3">
            {campaignMonsters.map((monster) => (
              <div className="col-md-6 col-lg-4" key={monster.id}>
                <div className="card-theme p-3 h-100 d-flex flex-column justify-content-between">
                  <div>
                    <h6 className="text-theme mb-1">{monster.name}</h6>
                    <p className="text-muted-theme mb-2" style={{ fontSize: '0.8rem' }}>{monster.campaign_name}</p>
                    {monster.visible_sections.includes('stats') ? (
                      <div className="d-flex gap-3">
                        <small className="text-muted-theme">HP: {monster.current_hp}/{monster.max_hp}</small>
                        <small className="text-muted-theme">AC: {monster.armor_class}</small>
                      </div>
                    ) : (
                      <small className="text-muted-theme" style={{ fontStyle: 'italic' }}>🔒 Stats hidden</small>
                    )}
                  </div>
                  <button
                    className="btn btn-theme-primary btn-sm mt-3"
                    onClick={() => navigate(`/dashboard/monsters/campaign/${monster.campaign_id}/${monster.id}`)}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Monster"
        message={<>Are you sure you want to delete <strong className="text-theme">{deleteTarget?.name}</strong>? This cannot be undone.</>}
        confirming={deleting}
        onConfirm={confirmDeleteHomebrew}
        onCancel={() => setDeleteTarget(null)}
      />

      <MonsterDetailSlideOver
        monsterId={selectedMonsterId}
        onClose={() => setSelectedMonsterId(null)}
      />
    </div>
  );
};

export default Monsters;
