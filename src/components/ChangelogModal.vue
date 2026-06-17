<script setup lang="ts">
// The "What's New" changelog, opened from the footer version badge. MANDATORY: add a
// new entry at the top of `entries` before every `npm version` bump, and update the
// version string in App.vue's footer to match the top entry. (Mirrors ShatterApp.)
defineProps<{ show: boolean }>()
defineEmits<{ (e: 'close'): void }>()

const entries = [
  {
    version: '1.11.0',
    date: '2026-06-17',
    changes: [
      'Keyword glossary rebuilt from the official April 2026 rulebook. Around 40 keyword descriptions were wrong or out of date (carried over from a 1st-edition source) — including range errors (Aid, Bolster, Spotter, Strategize, Take Cover, Command Vehicle and more are Range 2, not 1/3) and keywords that had been completely reworked (Fire Support, Infiltrate, Hunted, Scout, Secret Mission, Self-Destruct, Soresu/Djem So Mastery, Tempted, Low Profile, Reinforcements, Impervious, and others). All now match the rulebook.',
      'Added the two missing keywords Anti-Personnel and "I\'m Part of the Squad Too", and removed a handful of retired entries.',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-06-17',
    changes: [
      'Big mobile pass across the whole app. The Build footer no longer cuts off actions on a phone — Save, Share and Cards stay put, and Stats, Print, Export and Import move into a “•••” menu.',
      'Buttons, dice steppers, quantity controls and close icons are now sized for thumbs (44px targets) throughout Build, Roll, Collection and the card drawers.',
      'Tapping a search or filter field no longer makes the page zoom in on iPhone — every input is now 16px.',
      'Unit and card pop-out panels lock the page behind them so it stops scrolling out from under you, and their close buttons are bigger.',
      'The Commands and Upgrades browse filters now stick to the top as you scroll, matching Units.',
      'Importing a list over an existing army now uses an in-app confirm dialog, so it works in PWA and in-app browsers where the old prompt was silently ignored.',
      'The Reference rulebook now shows a clean link on mobile instead of an unusable embedded viewer, and assorted layout, wrapping and legibility fixes across the app.',
    ],
  },
  {
    version: '1.9.1',
    date: '2026-06-17',
    changes: [
      'Removed three retired keywords from the glossary (Contingencies, Flawed, Loadout) — the latest official rulebook dropped them and no card uses them anymore.',
    ],
  },
  {
    version: '1.9.0',
    date: '2026-06-17',
    changes: [
      'Browse now covers Command cards and Upgrades, not just units — switch sections with the new tabs at the top of Browse. Command cards are grouped by faction with their pip value; upgrades are grouped by slot. Tap any card to see the full scan (upgrades also list their keywords with tap-to-define tooltips).',
      'Filter command cards or upgrades by a specific commander or operative to see just the cards tied to that character, alongside the free-text search.',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-06-17',
    changes: [
      'Mandalorian armies now build as the Mandalorian Clans battle force automatically, with full clan-affiliation rules: every unit must share an affiliation with one of your Commanders or Operatives — mixed-clan lists work as long as each clan brings a leader, an unassigned generic Mandalorian slots into any clan, and giving a generic unit a clan (via its Clan upgrade) holds it to that clan.',
      'Battle-force mercenary handling now follows each battle force’s own rule: forces built around mercenaries (e.g. Shadow Collective, the Mandalorian clans) correctly let them count toward rank minimums, while others apply the normal allied-mercenary caps inside the battle force too.',
    ],
  },
  {
    version: '1.7.2',
    date: '2026-06-16',
    changes: [
      'Dice roller: tap anywhere on a dice-colour row to add one of that die — you no longer have to hit the small "+" button (the − and + steppers still work).',
      'Dice roller: after a roll, "+ Add" now lets you pick which colour of die to add — a swatch per available colour instead of always adding the first.',
    ],
  },
  {
    version: '1.7.1',
    date: '2026-06-16',
    changes: [
      'New app logo — a battle-station-style mark replaces the placeholder "L" in the nav, favicon, install icon and share preview.',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-06-16',
    changes: [
      'Fixed Imperial Probe Droids (and any rank-based detachment) leaking across factions — adding a Special Forces unit to, say, a Separatist army no longer offers the Empire-only Probe Droid. Detachments now still respect your army\'s faction.',
      'Upgrade picker: the Inspect button is now a magnifying-glass icon, and you can also open the full-card view by tapping an upgrade\'s thumbnail.',
    ],
  },
  {
    version: '1.6.1',
    date: '2026-06-16',
    changes: [
      'Fixed Detachment units (e.g. Imperial Probe Droids) counting against your rank maximum — per the rules they don\'t, so you can now field them on top of a full rank (your three Special Forces plus their probe-droid detachments). They still count toward the rank minimum.',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-06-16',
    changes: [
      'Print is now configurable: the Print button opens an options panel where you choose which sections to include. Your roster always prints; tick extras for a command-hand and battle-deck reference, an alphabetical keyword reference covering every keyword in your list, and full card images of your units, upgrades, command cards and objective deck to proxy — with an option to print one image per copy. Your choices are remembered for next time.',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-06-16',
    changes: [
      'Imperial March and Dug In can now be added to any eligible unit even when it has no Training upgrade slot — the builder gives it a dedicated slot. If the unit already has a Training slot (including one granted by an upgrade like a Stormtrooper Captain), the card fills that instead, so it never doubles up.',
    ],
  },
  {
    version: '1.4.2',
    date: '2026-06-16',
    changes: [
      'Corrected Poggle the Lesser\'s defence to red dice (the data source had it as white).',
    ],
  },
  {
    version: '1.4.1',
    date: '2026-06-16',
    changes: [
      'Audited every unit\'s miniature count against its card and corrected the few the data source got wrong (Stormtroopers Heavy Response Unit, MagnaGuard Prototype Assassin Droids, Clan Wren Veterans, the Scout Troopers Strike Team, and The Bad Batch), so model counts now match the cards.',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-06-15',
    changes: [
      'Upgrades that grant an extra slot (e.g. Comms Technician) now add that slot to the unit live as you equip them — remove the upgrade and the granted slot (and anything in it) goes away again.',
      'Model counts everywhere in Build: each unit shows its number of miniatures (in the catalogue and on its army card) and the footer + Army Stats panel show the army total — correctly counting the minis upgrades add, whether a single trooper (heavy-weapon / personnel upgrades) or a whole extra squad (e.g. a Stormtrooper Squad adds 5).',
      'A unit\'s Build profile now lists the keywords its equipped upgrades grant, highlighted in a distinct colour so you can tell them apart from the unit\'s printed keywords.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-06-15',
    changes: [
      'New Army Stats panel — open it from the Build footer to see a full breakdown of your list: points by rank, your aggregate attack-dice pool with expected hits and crits at each range band, total wounds and effective HP, defence-die mix, speed and courage averages, and tallies of your weapon and unit keywords.',
    ],
  },
  {
    version: '1.2.3',
    date: '2026-06-15',
    changes: [
      'Fixed the Build unit badges showing cropped card art instead of the proper round portrait busts, and restored missing keyword tooltips on a handful of upgrades — both lost in the 1.2.2 data refresh.',
    ],
  },
  {
    version: '1.2.2',
    date: '2026-06-15',
    changes: [
      'Added the on-foot General Grievous (Sinister Cyborg) commander, plus five upgrade cards (Ax-108 "Ground Buzzer", "Bunker Buster" Shells, EMP "Droid Poppers", "Nanny" Programming and "Bounty" Programming) — a card-import bug had been silently dropping any card whose name contained quotation marks.',
    ],
  },
  {
    version: '1.2.1',
    date: '2026-06-15',
    changes: [
      'Keyword tooltip coverage is now effectively complete — added the official definitions for the keywords that were still missing one (Anti-Materiel, Overwhelm, Sniper Team, Shields, Strafe, Mobile, Vaapad Mastery, and more), plus several unit-specific keywords (This is the Way, Victory or Death, Interrogate, Hold the Line and others). Valued and combined forms on cards now resolve too.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-06-15',
    changes: [
      'More keyword tooltips: keywords with a value or qualifier (e.g. "Weak Point 1: Rear", "Reliable 2", "Special Issue Blizzard Force", "Mercenary Rebels") now show their definition, and several keywords that were missing one — Transport, Reliable, Primitive, Death from Above, Advanced Targeting, Weighed Down, Mercenary and more — have been added from the official rulebook.',
    ],
  },
  {
    version: '1.1.1',
    date: '2026-06-15',
    changes: [
      'Sharing a specific unit link (e.g. /browse/darth-vader) now unfurls with that unit\'s own card image — rendered server-side, so the preview shows up in Discord, Reddit, X and other apps, not just in the browser.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-06-15',
    changes: [
      'Sharing a link now shows a rich preview card on Discord, Reddit and social — with a title, description and image.',
      'Search-engine ready — added a sitemap, descriptive page titles/descriptions per section, and structured data so LegionApp is easier to find.',
    ],
  },
  {
    version: '1.0.1',
    date: '2026-06-15',
    changes: [
      'Added a footer link to ShatterApp — the sister companion app for Star Wars: Shatterpoint.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-06-14',
    changes: [
      '🎉 LegionApp 1.0 — the first public release. Browse the full current-edition catalogue, build and validate armies for any format, track your collection, and look up the rules glossary — installable to your phone and usable offline. (Play, the at-the-table tracker, is coming soon.)',
      'Build — Export your army: a new Export button offers three formats. The LegionApp file is a lossless backup you can re-import later. Plain text is a clean, readable list to paste into Discord or forums. The TTS / Longshanks format is a single JSON payload that imports into the Tabletop Simulator Legion mod and registers your list on Longshanks for event stats. Copy to clipboard or download as a file.',
      'Build — Import a list: the new Import button loads a previously-exported list back in. A LegionApp file restores everything exactly; a TTS / Longshanks JSON is matched by card name, with a note for anything that could not be found.',
    ],
  },
  {
    version: '0.25.0',
    date: '2026-06-14',
    changes: [
      'Build — Print your army: the Print button now produces a clean one-page sheet with units (and their upgrades + points) grouped by rank, your command hand, your battle deck, and totals',
    ],
  },
  {
    version: '0.24.0',
    date: '2026-06-14',
    changes: [
      'Build — New Battle Deck tab: build your 9-card deck (3 Primary Objectives, 3 Secondary Objectives, 3 Advantage cards), each colour-coded by type. Only Standard-pool cards for your faction are offered; the tab is hidden in Recon (which has no battle deck)',
      'Build — A new "Cards" button in the footer shows your picked command hand (by pip) and battle deck (colour-coded) at a glance, without leaving the roster. Both are validated live and saved/shared with your army',
    ],
  },
  {
    version: '0.23.0',
    date: '2026-06-13',
    changes: [
      'Build — New Command Hand tab: build your 7-card command hand (2 one-pip, 2 two-pip, 2 three-pip, plus the auto-included Standing Orders). Only cards you can actually field are shown — your commanders\' own cards, your faction\'s generics, and the universal cards',
      'Build — The command hand is validated live (2/2/2, no duplicates, all eligible) and feeds the Legal/Illegal check; cards that stop being eligible (e.g. after removing a commander) are flagged so you can fix them. Your hand saves and shares with the army',
    ],
  },
  {
    version: '0.21.0',
    date: '2026-06-13',
    changes: [
      'Build — Battle forces are here. Tap the “Battle force” button in the builder header to switch any army to one of its faction\'s battle forces (212th Attack Battalion, Blizzard Force, Echo Base Defenders, Shadow Collective, the Mandalorian clans, and more). It\'s fully optional — a standard faction army is still the default',
      'Build — A battle force swaps in its own roster, rank limits and special rules: only its eligible units are offered (placed in their battle-force rank), its rank table and combined Commander/Operative caps apply, per-unit limits are enforced, and its battle-specific upgrades become available. The full rules text is shown so nothing is hidden',
      'Build — Switching battle force keeps your current list and flags any units that aren\'t eligible, so you can adjust rather than start over',
    ],
  },
  {
    version: '0.19.0',
    date: '2026-06-13',
    changes: [
      'Build — Mandalorian Clans armies now use the battle force\'s own rank requirements (Corps minimum 2, not 3 at Standard), so legal clan lists are no longer wrongly flagged for being short on Corps',
    ],
  },
  {
    version: '0.18.0',
    date: '2026-06-13',
    changes: [
      'Build — Illegal units in your army list now stand out: a red border, an "⚠ Illegal" badge, and the exact reason (e.g. "Needs a heavy weapon", "Needs <parent unit>", "Can\'t ally here") — the warning clears the moment you fix it',
    ],
  },
  {
    version: '0.17.1',
    date: '2026-06-13',
    changes: [
      'Build — Fixed Mandalorian Clans armies wrongly flagging their own units (e.g. the Heavy Weapon Team Mandalorian Warriors detachment) as illegal foreign mercenaries — detachment units whose parent is in your list now count as native',
    ],
  },
  {
    version: '0.17.0',
    date: '2026-06-13',
    changes: [
      'Build — Units with the Heavy Weapon Team keyword (Mandalorian Warriors, Scout Troopers, Rebel Commandos, ARC Troopers, BX-Series Droid Commandos) are now flagged illegal until you equip a heavy weapon, as the rules require',
    ],
  },
  {
    version: '0.16.0',
    date: '2026-06-13',
    changes: [
      'Build — Identical units now stack into one card with a ×N count and a [− N +] stepper, so adding a third Stormtrooper squad no longer fills your list with separate rows',
      'Build — Each stacked card shows the group\'s total cost; the + button is disabled once that rank is full',
      'Build — Give one copy a different upgrade and it splits out into its own card; unique units never get a stepper',
      'Build — A 🗑 button removes a whole stack at once',
    ],
  },
  {
    version: '0.15.0',
    date: '2026-06-13',
    changes: [
      'Build — The Mandalorian Clans army now fields its full roster (16 units): Din Djarin, Bo-Katan Kryze, The Armorer, Ursa Wren, Paz Vizsla, Axe Woves, Mandalorian Warriors / Initiates, Clan Wren & Clan Kryze Veterans, and more — not just the four it had before',
      'Build — Those clan units count as native Mandalorians (no mercenary ally caps) when building a Mandalorian army',
      'Build — The upgrade picker now stays in view (sticky) while you scroll your army list, so you can equip units near the bottom without scrolling back to the top',
      'Build — Equipped upgrades on a unit now show their point cost',
      'Build — Detachment units (Fire Support, the Strike Teams, DF-90 Mortar Trooper, Imperial Probe Droid, …) now appear in the catalogue only once their parent unit is in your list',
      'Build — Restored keyword/skill definitions in the unit profile — tap a keyword (unit or weapon) for its rulebook text',
    ],
  },
  {
    version: '0.14.1',
    date: '2026-06-13',
    changes: [
      'Build — Tapping a keyword in a unit\'s profile now shows its rulebook definition (previously this only worked on the Browse tab) — including weapon keywords',
      'App — Keyword definition popovers flip above the keyword when it\'s near the bottom of the screen, so they\'re always readable',
    ],
  },
  {
    version: '0.14.0',
    date: '2026-06-12',
    changes: [
      'Build — Equip upgrades inline: tap an army unit\'s upgrade slot to pick from its valid upgrades right in the left pane (the pop-out drawer is gone). Pick to equip, ✕ to close',
      'Build — Upgrade picker now shows each upgrade\'s card art and what it does (its keywords), not just a name',
      'Build — Inspect upgrades: tap Inspect in the picker to open a swipeable card gallery — flip through every option (full rules and art) and Select the one you want',
      'Build — Tap a unit in your army list to open its profile — a focused view with stats, weapons, and keyword definitions',
      'Data — Filled in missing upgrade keywords (e.g. Situational Awareness now shows Outmaneuver) so most upgrades say what they grant at a glance',
    ],
  },
  {
    version: '0.13.0',
    date: '2026-06-12',
    changes: [
      'App — New footer "What\'s New" changelog: tap the version badge to see every release and what changed',
      'App — Support the project with the new "Buy me a coffee on Ko-fi" link in the footer',
    ],
  },
  {
    version: '0.12.0',
    date: '2026-06-12',
    changes: [
      'Build — New always-visible unit catalogue grouped by rank: browse and add units without a popup. Desktop shows all six ranks with a rank-focus filter, tablet uses an accordion, and mobile a rank tab-strip',
      'Build — Clean round unit portrait icons across the catalogue and your army list',
      'Build — At-a-glance unit indicators on every row: defense die, wounds, upgrade-slot count, attack dice, and speed',
      'Build — Tap any unit to view its full profile (stats, weapons, keywords, upgrades) without leaving the builder',
    ],
  },
  {
    version: '0.11.0',
    date: '2026-06-12',
    changes: [
      'Build — Permanent rank-tracker footer: per-rank count chips (count · min–max) coloured when you are over or under, plus live points, activations, and a Legal/Illegal badge',
      'Build — Format switcher moved into the footer; tap the totals to expand the full army-status checklist in place',
    ],
  },
  {
    version: '0.10.0',
    date: '2026-06-12',
    changes: [
      'Build — New "Roster Canvas" layout: responsive Catalogue | Army panes with a pinned action footer, and a segmented Catalogue / My Army toggle on mobile',
    ],
  },
  {
    version: '0.9.0',
    date: '2026-06-12',
    changes: [
      'Build — Mercenary "Allies of Convenience": hire mercenaries into a faction by affiliation, with per-rank caps (≤2 Corps, ≤1 each other rank) and the no-minimum rule enforced',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-06-12',
    changes: [
      'Build — Upgrade eligibility: the upgrade picker and the unit profile now only show upgrades a unit can legally equip',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-06-12',
    changes: [
      'Build — Keyword build rules enforced via the validation checklist: Field Commander, Entourage, Detachment, and limited-upgrade copy caps',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-06-10',
    changes: [
      'Build — Per-format rank limits and multiple game sizes: Recon 600 and Standard 1000 (2024 official), plus Standard-800 (legacy) and Grand Army 1600 (community)',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-06-10',
    changes: [
      'Roll — Legion dice roller with red / black / white attack dice, surge conversion, and combat modifiers',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-06-10',
    changes: [
      'Collection — Real Star Wars: Legion product boxes with cover art',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-06-10',
    changes: [
      'Factions — Mandalorians promoted to a first-class, selectable faction',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-06-10',
    changes: [
      'Browse — Unit catalogue grouped by faction with a slide-in profile drawer (stats, weapons, keywords, equippable upgrades)',
      'Build — Army-list builder with live rank / points / faction / uniqueness validation and shareable links',
      'Collection — Track which products you own',
      'Reference — Keyword glossary, with popovers on weapon keywords throughout the app',
      'Data — Single source of truth: current-edition (2024 "v2") cards from Legion HQ 2',
      'UI — Light and dark themes with a theme toggle',
    ],
  },
]
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-[70] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
        @click.self="$emit('close')"
      >
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="$emit('close')" />

        <div class="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-lg-border bg-lg-surface shadow-2xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-lg-border px-5 py-4">
            <h2 class="font-display text-base font-bold uppercase tracking-widest text-lg-accent">What's New</h2>
            <button
              class="grid h-11 w-11 place-items-center rounded-full bg-lg-dark/60 text-lg-muted transition-colors hover:text-lg-text"
              aria-label="Close"
              @click="$emit('close')"
            >✕</button>
          </div>

          <!-- Entries -->
          <div class="space-y-5 overflow-y-auto px-5 py-4">
            <div v-for="entry in entries" :key="entry.version">
              <div class="mb-1.5 flex items-baseline gap-2">
                <span class="font-display text-xs font-bold text-lg-accent">v{{ entry.version }}</span>
                <span class="text-[10px] text-lg-muted/60">{{ entry.date }}</span>
              </div>
              <ul class="space-y-1">
                <li
                  v-for="change in entry.changes" :key="change"
                  class="flex gap-2 text-sm text-lg-text/70"
                >
                  <span class="flex-shrink-0 text-lg-accent/40">·</span>
                  {{ change }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
