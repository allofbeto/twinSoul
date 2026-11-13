// Published 5e backgrounds: the game numbers (skills, tools, languages) plus
// short summaries written for twinSoul. Acolyte is the only SRD background;
// never paste the books' text here.

export interface Background {
  index: string;
  name: string;
  source: string;
  summary: string;
  /** Skills the background always grants. */
  skills: string[];
  /** Extra skills the player chooses, if any. */
  skillChoice?: { choose: number; from: string[] | 'any' };
  tools: string;
  languages: string;
  /** How many languages the player picks (from `languages`, e.g. "Two of your choice"). */
  languageChoices: number;
  equipment: string;
  feature: { name: string; desc: string };
}

const PHB = "Player's Handbook";
const SCAG = "Sword Coast Adventurer's Guide";
const VRGR = "Van Richten's Guide to Ravenloft";
const SRD = 'SRD 5.1';

const bg = (
  name: string,
  source: string,
  summary: string,
  skills: string[],
  tools: string,
  languages: string,
  equipment: string,
  feature: [string, string],
  skillChoice?: Background['skillChoice'],
): Background => ({
  index: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  name,
  source,
  summary,
  skills,
  skillChoice,
  tools,
  languages,
  languageChoices: /^two\b/i.test(languages) ? 2 : /^one\b/i.test(languages) ? 1 : 0,
  equipment,
  feature: { name: feature[0], desc: feature[1] },
});

export const BACKGROUNDS: Background[] = [
  bg('Acolyte', SRD, 'You served a temple, learning its rites and keeping its faith.', ['Insight', 'Religion'], '—', 'Two of your choice',
    'Holy symbol, prayer book, incense, vestments, common clothes, 15 gp', ['Shelter of the Faithful', 'Your faith’s temples will shelter and support you and your companions.']),
  bg('Charlatan', PHB, 'You lived by lies, cons and false faces.', ['Deception', 'Sleight of Hand'], 'Disguise kit, forgery kit', '—',
    'Fine clothes, disguise kit, tools of your favourite con, 15 gp', ['False Identity', 'You keep a second, documented identity you can slip into.']),
  bg('Criminal', PHB, 'You broke the law for a living and know the underworld’s ways.', ['Deception', 'Stealth'], 'One gaming set, thieves’ tools', '—',
    'Crowbar, dark clothes with a hood, 15 gp', ['Criminal Contact', 'A trusted contact links you to a network of criminals and fences.']),
  bg('Entertainer', PHB, 'You thrived in front of a crowd, earning coin with your act.', ['Acrobatics', 'Performance'], 'Disguise kit, one musical instrument', '—',
    'Musical instrument, a favour from an admirer, costume, 15 gp', ['By Popular Demand', 'You can always find a stage, and a meal and bed for performing.']),
  bg('Folk Hero', PHB, 'Ordinary folk see you as their champion after you stood up for them.', ['Animal Handling', 'Survival'], 'One artisan’s tools, land vehicles', '—',
    'Artisan’s tools, shovel, iron pot, common clothes, 10 gp', ['Rustic Hospitality', 'Common folk will hide and shelter you, as long as you bring them no harm.']),
  bg('Guild Artisan', PHB, 'You learned a craft and belong to a guild of fellow makers.', ['Insight', 'Persuasion'], 'One artisan’s tools', 'One of your choice',
    'Artisan’s tools, guild letter of introduction, traveller’s clothes, 15 gp', ['Guild Membership', 'Your guild offers lodging, legal help and contacts across the land.']),
  bg('Hermit', PHB, 'You lived apart from the world, and in solitude found a secret.', ['Medicine', 'Religion'], 'Herbalism kit', 'One of your choice',
    'Scroll case of notes, winter blanket, common clothes, herbalism kit, 5 gp', ['Discovery', 'Your seclusion revealed a unique, possibly world-changing truth.']),
  bg('Noble', PHB, 'You were born to wealth, title and expectation.', ['History', 'Persuasion'], 'One gaming set', 'One of your choice',
    'Fine clothes, signet ring, scroll of pedigree, 25 gp', ['Position of Privilege', 'High society welcomes you, and commoners try to accommodate you.']),
  bg('Outlander', PHB, 'You grew up in the wilds, far from cities and their comforts.', ['Athletics', 'Survival'], 'One musical instrument', 'One of your choice',
    'Staff, hunting trap, animal trophy, traveller’s clothes, 10 gp', ['Wanderer', 'You never forget a landscape, and can find food and water for a small group.']),
  bg('Sage', PHB, 'You spent years studying lore in libraries and halls of learning.', ['Arcana', 'History'], '—', 'Two of your choice',
    'Ink, quill, small knife, letter with an unanswered question, common clothes, 10 gp', ['Researcher', 'When you don’t know something, you usually know where to find it.']),
  bg('Sailor', PHB, 'You crewed a ship for years and know wind, rope and storm.', ['Athletics', 'Perception'], 'Navigator’s tools, water vehicles', '—',
    'Belaying pin, silk rope, lucky charm, common clothes, 10 gp', ['Ship’s Passage', 'You can secure free passage on a ship for you and your companions.']),
  bg('Soldier', PHB, 'You fought in a war and still carry its discipline.', ['Athletics', 'Intimidation'], 'One gaming set, land vehicles', '—',
    'Rank insignia, trophy from a fallen enemy, gaming set, common clothes, 10 gp', ['Military Rank', 'Soldiers loyal to your old army still respect your rank.']),
  bg('Urchin', PHB, 'You grew up alone and poor on the streets, and survived.', ['Sleight of Hand', 'Stealth'], 'Disguise kit, thieves’ tools', '—',
    'Small knife, city map, pet mouse, keepsake, common clothes, 10 gp', ['City Secrets', 'You know the hidden ways through a city and travel it twice as fast.']),

  bg('City Watch', SCAG, 'You kept the peace on a city’s streets.', ['Athletics', 'Insight'], '—', 'Two of your choice',
    'Uniform, horn, manacles, 10 gp', ['Watcher’s Eye', 'You easily find the local watch and the dens of crime.']),
  bg('Clan Crafter', SCAG, 'You learned your craft from a clan of master artisans.', ['History', 'Insight'], 'One artisan’s tools', 'One of your choice',
    'Artisan’s tools, maker’s mark chisel, traveller’s clothes, 5 gp + gem', ['Respect of the Stout Folk', 'Dwarves and other crafters will lodge and feed you.']),
  bg('Cloistered Scholar', SCAG, 'You studied in a great library, with special access to its rarest tomes.', ['History'], '—', 'Two of your choice',
    'Scholar’s robes, writing kit, borrowed book, 10 gp', ['Library Access', 'You can enter scholarly libraries and halls others cannot.'],
    { choose: 1, from: ['Arcana', 'Nature', 'Religion'] }),
  bg('Courtier', SCAG, 'You served at a court and know how power really works.', ['Insight', 'Persuasion'], '—', 'Two of your choice',
    'Fine clothes, 5 gp', ['Court Functionary', 'You know how to reach the right people in any bureaucracy.']),
  bg('Faction Agent', SCAG, 'You serve a faction that works behind the scenes.', ['Insight'], '—', 'Two of your choice',
    'Faction badge, codebook, common clothes, 15 gp', ['Safe Haven', 'Your faction’s agents will help and hide you.'],
    { choose: 1, from: ['Arcana', 'Animal Handling', 'Deception', 'History', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Performance', 'Persuasion', 'Religion', 'Survival'] }),
  bg('Far Traveler', SCAG, 'You come from a distant land, and everything here is strange.', ['Insight', 'Perception'], 'One musical instrument or gaming set', 'One of your choice',
    'Traveller’s clothes, instrument or gaming set, maps of your homeland, jewellery, 5 gp', ['All Eyes on You', 'Your foreignness draws curiosity and invitations.']),
  bg('Inheritor', SCAG, 'You received an inheritance that others want badly.', ['Survival'], 'One gaming set or musical instrument', 'One of your choice',
    'Your inheritance, traveller’s clothes, tool or instrument, 15 gp', ['Inheritance', 'You own a mysterious legacy item; its secrets are yours to uncover.'],
    { choose: 1, from: ['Arcana', 'History', 'Religion'] }),
  bg('Knight of the Order', SCAG, 'You swore oaths to a knightly order and its ideals.', ['Persuasion'], 'One gaming set or musical instrument', 'One of your choice',
    'Traveller’s clothes, signet or banner of your order, 10 gp', ['Knightly Regard', 'Members of your order and its allies will shelter you.'],
    { choose: 1, from: ['Arcana', 'History', 'Nature', 'Religion'] }),
  bg('Mercenary Veteran', SCAG, 'You fought for pay with a mercenary company.', ['Athletics', 'Persuasion'], 'One gaming set, land vehicles', '—',
    'Uniform of your company, insignia, gaming set, 10 gp', ['Mercenary Life', 'You know the companies, and can find mercenary work.']),
  bg('Urban Bounty Hunter', SCAG, 'You tracked down people for coin, in streets high and low.', [], 'Two of: gaming set, instrument, thieves’ tools', '—',
    'Clothes suited to your hunting grounds, 20 gp', ['Ear to the Ground', 'You have contacts who tell you where your quarry has gone.'],
    { choose: 2, from: ['Deception', 'Insight', 'Persuasion', 'Stealth'] }),
  bg('Uthgardt Tribe Member', SCAG, 'You were raised among the barbarian tribes of the north.', ['Athletics', 'Survival'], 'One musical instrument or artisan’s tools', 'One of your choice',
    'Hunting trap, totem, traveller’s clothes, 10 gp', ['Uthgardt Heritage', 'You know the wild northlands and can find food and shelter there.']),
  bg('Waterdhavian Noble', SCAG, 'You belong to a noble family of a great city.', ['History', 'Persuasion'], 'One gaming set or musical instrument', 'One of your choice',
    'Fine clothes, signet ring, scroll of pedigree, 20 gp', ['Kept in Style', 'Your family’s credit pays your living expenses in the city.']),

  bg('Haunted One', VRGR, 'A horror marked your past, and it still follows you.', [], '—', 'Two, including one exotic',
    'Monster hunter’s pack, gothic trinket, common clothes, 1 sp', ['Heart of Darkness', 'Common folk sense your burden and help you in your fight.'],
    { choose: 2, from: ['Arcana', 'Investigation', 'Religion', 'Survival'] }),
];

export const CUSTOM_BACKGROUND: Background = {
  index: 'custom',
  name: 'Custom',
  source: 'Homebrew',
  summary: 'Write your own past and pick any two skills.',
  skills: [],
  skillChoice: { choose: 2, from: 'any' },
  tools: 'Agree with your DM',
  languages: 'One of your choice',
  languageChoices: 1,
  equipment: 'Agree with your DM',
  feature: { name: 'Your own', desc: 'Work out a feature with your DM.' },
};

export const findBackground = (index: string) =>
  index === CUSTOM_BACKGROUND.index ? CUSTOM_BACKGROUND : BACKGROUNDS.find((b) => b.index === index);
