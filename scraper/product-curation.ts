// Hand-curated overrides for the Philibert product catalogue.
//
// Philibert (philibertnet.com) is the box-art / product source: its category
// listing gives a title, an EAN/UPC (the AMG–Asmodee barcode, embedded in the
// product URL), a faction-indicating category, and a box image. What it does NOT
// give is *box contents* — detail pages list counts ("4 miniatures") but never
// name the units. So `scraper/products.ts` auto-derives unit membership from box
// titles where it can, and this file supplies the rest by hand:
//
//   EXCLUDE          — EANs to drop (card/upgrade packs, foam, FR duplicates,
//                      discontinued boxes with no current-edition unit).
//   RENAME           — clean English names for French/garbled Philibert titles.
//   FACTION_OVERRIDE — fix Philibert mis-categorisations.
//   CONTENTS         — curated unitSlugs for boxes whose title names no unit
//                      (specialists/army boxes/starters are intentionally left
//                      out — their units are covered by the synthetic fallback).
//
// Keyed by EAN so it survives Philibert re-ordering. CONTENTS slugs are validated
// against units.json by tests/products.spec.ts. Curated by hand — pending review.

export const EXCLUDE = new Set<string>([
  '5907222526521', // empty foam trays
  // card packs (no miniatures)
  '841333133856', '841333134006', '841333133795', '841333133979', '841333133825',
  '841333133887', '841333134037', '841333134068', '841333133917',
  // upgrade-only expansions (no unit cards)
  '8435407628137', '8435407628151', '8435407628144',
  // French-language duplicates of an included English box
  '3558380089865', '3558380089896', '3558380089872', '8435407629646',
  '8435407629226', '841333123352', '841333123291', '8435407633230',
  // discontinued / superseded — no current-edition unit
  '841333105570', '841333111533', '841333120528', '841333134969',
  '841333135102', // duplicate "Republic Specialists"
  // French-language duplicates of an included English box (distinct title → not auto-deduped)
  '3558380089933', // Grand Maître Yoda          → Grand Master Yoda
  '841333124885',  // Sun Fac & Poggle (FR)      → Sun Fac & Poggle the Lesser
  '841333119232',  // Défenseurs de la Base Echo → Echo Base Defenders Special Edition Army Box
])

export const RENAME: Record<string, string> = {
  '3558380089919': 'Raddaugh Gnasp Fluttercraft',
  '8435407630802': 'STAP Riders',
  '841333117573': 'Swoop Bike Riders',
  '8435407620759': '1.4 FD Laser Cannon Team',
  '3558380085867': 'Rebel Veterans',
  '841333135027': 'DSD1 Dwarf Spider Droid',
  '841333131166': 'IG-Series Assassin Droids',
  '841333129248': 'BX-Series Droid Commandos',
  '841333134914': 'WLO-5 Speeder Tank',
  // Clean English names for French / garbled / typo'd Philibert titles
  '841333119775': 'Boba Fett, Daimyo of Mos Espa',
  '3558380089926': 'Wookiee Warriors',
  '8435407627703': 'Count Dooku',
  '841333116934': 'Gar Saxon',
  '841333117023': 'Pyke Syndicate Foot Soldiers',
  '841333133405': 'Clone Trooper Infantry',
  '841333130510': 'Scout Troopers',
  '841333127435': 'The Bad Batch',
}

export const FACTION_OVERRIDE: Record<string, string> = {
  '841333131166': 'mercenary', // IG-Series Assassin Droids (Philibert: empire)
  '841333134914': 'mercenary', // WLO-5 Speeder Tank   (Philibert: star-wars-legion-vf)
  '8435407630802': 'separatists', // STAP Riders        (Philibert: star-wars-legion)
  '841333119447': 'mercenary', // Din Djarin & Grogu    (Philibert: star-wars-legion-vf)
}

// Curated box contents (only where confident). Army boxes / starters / specialists
// are deliberately omitted — those units are covered by the synthetic fallback.
export const CONTENTS: Record<string, string[]> = {
  '3558380089919': ['raddaugh-gnasp-fluttercraft', 'raddaugh-gnasp-fluttercraft-attack-craft'],
  '8435407630802': ['stap-riders'],
  '841333117573': ['swoop-bike-riders'],
  '8435407620759': ['14-fd-laser-cannon-team'],
  '3558380085867': ['rebel-veterans'],
  '841333135027': ['dsd1-dwarf-spider-droid'],
  '841333131166': ['ig-88-notorious-assassin-droid', 'ig-11-nurse-and-protect'],
  '841333127435': ['the-bad-batch-clone-force-99', 'the-bad-batch-clone-force-99-2'],
  '841333133405': ['clone-trooper-infantry'],
  '841333129224': ['ewok-skirmishers', 'ewok-slingers'],
  '841333129200': ['wookiee-warriors-kashyyyk-defenders', 'wookiee-warriors-noble-fighters'],
  '3558380089926': ['wookiee-warriors-freedom-fighters', 'wookiee-warriors-kashyyyk-resistance'],
  '841333129217': ['imperial-dark-troopers'],
  '841333110055': ['saber-class-tank'],
  '841333133443': ['tsmeu-6-wheel-bikes', 'general-grievous-wheel-bike-warlord'],
  '841333128401': ['stormtrooper-riot-squad'],
  '841333132903': ['jedi-knight-general-strong-in-the-force', 'jedi-knight-mounted-jedi-general', 'jedi-knight-keeper-of-the-peace'],
  '841333135010': ['super-tactical-command-droid-command-and-control-droid', 'super-tactical-command-droid-auxiliary-command-droid'],
  '841333134808': ['grand-admiral-thrawn-imperial-high-command', 'grand-moff-tarkin-imperial-high-command', 'general-tagge-imperial-high-command'],
  '841333129248': ['bx-series-droid-commandos', 'bx-series-droid-commandos-strike-team'],
  '841333134914': ['wlo-5-speeder-tank'],
  '841333117023': ['pyke-syndicate-foot-soldiers'],
  '2100001342166': ['bo-katan-kryze-savior-of-mandalore', 'the-armorer-forging-the-future', 'paz-vizsla-proud-warrior'],
  '841333136437': ['mandalorian-initiates', 'mandalorian-warriors', 'mandalorian-warriors-fire-support', 'clan-kryze-veterans', 'din-djarin-the-mandalorian'],
  '841333119447': ['din-djarin-the-mandalorian'], // Din Djarin & Grogu (Grogu has no unit card)

  // Starter sets, army boxes and multi-character packs — contents researched from
  // AMG / retailer / Wookieepedia listings (the Specialists boxes are upgrade-only
  // personnel and are intentionally left out). Pending review.
  '841333132033': ['darth-vader-dark-lord-of-the-sith', 'stormtroopers', 'stormtroopers-heavy-response-unit', 'scout-troopers', 'scout-troopers-strike-team'], // Galactic Empire Starter Set
  '841333132026': ['luke-skywalker-hero-of-the-rebellion', 'rebel-troopers', 'rebel-commandos', 'rebel-commandos-strike-team', 'wookiee-warriors-freedom-fighters', 'wookiee-warriors-kashyyyk-resistance'], // Rebel Alliance Starter Set
  '841333132040': ['obi-wan-kenobi-civilized-warrior', 'clone-trooper-infantry', 'clone-trooper-marksmen'], // Galactic Republic Starter Set (Obi-Wan + clones; vehicle/Jedi card unconfirmed)
  '841333132019': ['count-dooku-darth-tyranus', 'general-grievous-wheel-bike-warlord', 'b1-battle-droids', 'b2-super-battle-droids'], // Separatist Alliance Starter Set
  '841333134785': ['darth-vader-dark-lord-of-the-sith', 'imperial-probe-droid', 'stormtroopers', 'stormtroopers-heavy-response-unit', 'snowtroopers'], // Blizzard Force Army Box
  '841333134792': ['leia-organa-fearless-and-inventive', 'c-3p0-golden-god', 'r2-d2-hero-of-a-thousand-devices', 'rebel-veterans', 'mark-ii-medium-blaster-trooper', 'tauntaun-riders'], // Echo Base Defenders Army Box
  '841333131159': ['boba-fett-daimyo-of-mos-espa', 'din-djarin-the-mandalorian'], // Outer Rim Outlaws
  '2100001342159': ['clan-wren-veterans', 'ursa-wren-leader-of-clan-wren'], // Clan Wren Mandalorians
  '841333133009': ['luke-skywalker-hero-of-the-rebellion', 'luke-skywalker-jedi-knight', 'han-solo-unorthodox-general', 'leia-organa-fearless-and-inventive', 'chewbacca-walking-carpet'], // Heroes of the Rebellion
  '841333134662': ['obi-wan-kenobi-civilized-warrior', 'clone-captain-rex-honorable-soldier', 'anakin-skywalker-the-chosen-one'], // Heroes of the Clone Army
  '841333136451': ['maul-a-rival', 'gar-saxon-militant-commando', 'rook-kast-devoted-to-the-cause'], // Leaders of the Shadow Collective
  '841333134624': ['han-solo-unorthodox-general', 'luke-skywalker-commander-skywalker'], // Captain Solo & Commander Skywalker on Tauntauns

  // Variant cards built from a mini already in the box (override the title auto-match):
  '841333131944': ['imperial-officer-ruthless-efficiency', 'imperial-agent-bringing-order-to-the-galaxy'], // Customizable Imperial Officer & Agent
  '841333132064': ['rebel-officer-fighting-for-freedom', 'rebel-agent-defender-of-democracy'], // Customizable Rebel Officer & Agent
  '841333135232': ['shoretroopers', 'df-90-mortar-trooper'], // Imperial Shoretroopers (incl. DF-90 Mortar)
}
