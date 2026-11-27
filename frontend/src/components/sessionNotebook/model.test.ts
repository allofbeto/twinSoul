import { beatRefs, notebookStats, parseNotebook, plannedEncounters, sectionFilled, sceneMatches, serializeNotebook, newBeat } from './model';

const v2 = (blocks: object[]) => JSON.stringify({
  v: 2,
  scenes: [{ id: 's1', title: 'The Mill', purpose: '<p>Wolves</p>', beats: [{ id: 'b1', title: 'Ambush', done: true, blocks }] }],
});

describe('parseNotebook', () => {
  it('starts an empty session with one empty scene', () => {
    const nb = parseNotebook('');
    expect(nb.v).toBe(3);
    expect(nb.scenes).toHaveLength(1);
    expect(nb.scenes[0].beats).toEqual([]);
  });

  it('keeps legacy HTML as a note on one beat', () => {
    const nb = parseNotebook('<p>Old notes</p>');
    expect(nb.scenes[0].beats[0].note).toBe('<p>Old notes</p>');
  });

  it('upgrades v2 blocks into sections without losing anything', () => {
    const nb = parseNotebook(v2([
      { id: 'k1', type: 'readaloud', content: '<p>Creak.</p>' },
      { id: 'k2', type: 'readaloud', content: '<p>Eyes.</p>' },
      { id: 'k3', type: 'npc', content: '<ul><li>wants sheep</li></ul>', npc: { id: '9', name: 'Brisk' } },
      { id: 'k4', type: 'clue', content: '<p>Grain sacks</p>' },
      { id: 'k5', type: 'branch', content: '<p>sneak in</p>' },
      { id: 'k6', type: 'puzzle', content: '<p>Riddle</p>' },
      { id: 'k7', type: 'music', content: '', trackId: 't1' },
      { id: 'k8', type: 'art', content: '<p>caption</p>', url: 'https://x/a.png' },
      { id: 'k9', type: 'art', content: '', url: 'https://x/b.png' },
      { id: 'k10', type: 'text', content: '<p>Remember</p>' },
    ]));
    const b = nb.scenes[0].beats[0];
    expect(b).toMatchObject({ id: 'b1', title: 'Ambush', done: true, type: 'other' });
    expect(b.read).toBe('<p>Creak.</p><p>Eyes.</p>');
    expect(b.npcs).toEqual([{ key: 'k3', id: '9', name: 'Brisk', points: '<ul><li>wants sheep</li></ul>' }]);
    expect(b.find).toBe('<p>Grain sacks</p>');
    expect(b.branches).toBe('<p>sneak in</p>');
    expect(b.trackId).toBe('t1');
    expect(b.artUrl).toBe('https://x/a.png');
    expect(b.note).toContain('Riddle');
    expect(b.note).toContain('caption');
    expect(b.note).toContain('https://x/b.png');
    expect(b.note).toContain('Remember');
    expect(nb.scenes[0].purpose).toBe('<p>Wolves</p>');
  });

  it('round-trips v3', () => {
    const nb = parseNotebook(v2([{ id: 'k1', type: 'clue', content: '<p>A</p>' }]));
    expect(parseNotebook(serializeNotebook(nb))).toEqual(nb);
  });
});

describe('helpers', () => {
  it('knows which sections are filled', () => {
    const b = { ...newBeat('x'), read: '<p></p>', find: '<p>clue</p>', encounter: { id: '1', name: 'Wolves' } };
    expect(sectionFilled(b, 'read')).toBe(false);
    expect(sectionFilled(b, 'find')).toBe(true);
    expect(sectionFilled(b, 'stage')).toBe(true);
    expect(sectionFilled(b, 'npcs')).toBe(false);
  });

  it('searches and summarizes beat sections', () => {
    const nb = parseNotebook(v2([{ id: 'k1', type: 'npc', content: '<p>hates wolves</p>', npc: { id: '9', name: 'Brisk' } }]));
    expect(sceneMatches(nb.scenes[0], 'brisk')).toBe(true);
    expect(sceneMatches(nb.scenes[0], 'dragon')).toBe(false);
    const st = notebookStats(serializeNotebook(nb));
    expect(st).toMatchObject({ scenes: 1, beats: 1, done: 1 });
    expect(st.excerpt).toContain('Brisk');
  });
});

describe('theatre helpers', () => {
  it('collects NPCs and mentioned objects from a beat', () => {
    const b = {
      ...newBeat('x'),
      npcs: [{ key: 'a', id: '7', name: 'Brisk', points: '<p>knows <span data-type="mention" data-id="7" data-kind="npc" data-label="Brisk">🧙 Brisk</span></p>' }],
      find: '<p><span data-type="mentionItem" data-id="12" data-label="Iron collar">#Iron collar</span> and <span data-id="3" data-kind="map" data-label="Old Mill">🗺️ Old Mill</span> and <span data-id="5" data-kind="character" data-label="Pip">Pip</span></p>',
    };
    expect(beatRefs(b)).toEqual([
      { id: '7', kind: 'npc', label: 'Brisk' },
      { id: '12', kind: 'item', label: 'Iron collar' },
      { id: '3', kind: 'map', label: 'Old Mill' },
    ]);
  });

  it('lists planned encounters in order, once each', () => {
    const nb = parseNotebook('');
    const a = { ...newBeat('Ambush'), encounter: { id: 'e1', name: 'Wolves' } };
    const b = { ...newBeat('Rematch'), encounter: { id: 'e1', name: 'Wolves' } };
    const c = { ...newBeat('Boss'), encounter: { id: 'e2', name: 'Dire wolf' }, done: true };
    nb.scenes[0].beats = [a, newBeat('Talk'), b, c];
    expect(plannedEncounters(nb).map((p) => [p.encounterId, p.beatTitle, p.done])).toEqual([
      ['e1', 'Ambush', false],
      ['e2', 'Boss', true],
    ]);
  });
});
