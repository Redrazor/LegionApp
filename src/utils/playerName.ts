// Random player-name generator for Play multiplayer. ShatterApp (the sister app) has
// no generator to port, so this is our own: an adjective + a Star Wars-flavoured noun,
// giving a friendly default a player can accept or override before joining a room.

const ADJECTIVES = [
  'Reckless', 'Cunning', 'Grizzled', 'Fearless', 'Rogue', 'Shadow', 'Iron', 'Swift',
  'Grim', 'Lucky', 'Veteran', 'Rebel', 'Ruthless', 'Stalwart', 'Wily', 'Bold',
  'Silent', 'Ace', 'Rugged', 'Vengeful', 'Steadfast', 'Dashing', 'Battle-Worn', 'Crimson',
]

const NOUNS = [
  'Nerf-Herder', 'Bantha', 'Wookiee', 'Smuggler', 'Commander', 'Sergeant', 'Trooper',
  'Pilot', 'Bounty-Hunter', 'Jedi', 'Sith', 'Gunslinger', 'Marshal', 'Scout',
  'Sniper', 'Tactician', 'Raider', 'Ace', 'Wing-Leader', 'Droid', 'Ronin', 'Sentinel',
]

/** Pick a random adjective+noun name. `rand` is injectable for deterministic tests. */
export function randomPlayerName(rand: () => number = Math.random): string {
  const adj = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(rand() * NOUNS.length)]
  return `${adj} ${noun}`
}
