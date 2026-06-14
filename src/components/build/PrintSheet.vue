<script setup lang="ts">
import type { ArmySheet } from '../../utils/army.ts'
import type { BattleCardSubtype } from '../../types/index.ts'
import { imageUrl } from '../../utils/imageUrl.ts'

// A clean, print-only army sheet. Hidden on screen (.print-sheet); replaces the app
// when printing (see style.css). Uses explicit black/white colours rather than theme
// tokens so it's legible on paper in either theme. Teleported to <body> so it sits
// outside #app, which the print stylesheet hides.
defineProps<{ sheet: ArmySheet; valid: boolean }>()

const SUBTYPE_LABEL: Record<BattleCardSubtype, string> = {
  primary: 'Primary Objective',
  secondary: 'Secondary Objective',
  advantage: 'Advantage',
}
const SUBTYPE_VAR: Record<BattleCardSubtype, string> = {
  primary: '--color-obj-primary',
  secondary: '--color-obj-secondary',
  advantage: '--color-obj-advantage',
}
function deckGroups(sheet: ArmySheet) {
  return (['primary', 'secondary', 'advantage'] as BattleCardSubtype[])
    .map((s) => ({ subtype: s, cards: sheet.battleDeck.filter((c) => c.subtype === s) }))
    .filter((g) => g.cards.length)
}
</script>

<template>
  <Teleport to="body">
    <div class="print-sheet" style="color: #000; background: #fff; padding: 24px; font-family: system-ui, sans-serif;">
      <!-- Header -->
      <h1 style="font-size: 22px; font-weight: 800; margin: 0;">{{ sheet.name }}</h1>
      <p style="margin: 4px 0 0; font-size: 13px; color: #333;">
        {{ sheet.factionName }}
        <template v-if="sheet.battleForceName"> · {{ sheet.battleForceName }}</template>
        · {{ sheet.formatName }}
        · {{ sheet.points }} / {{ sheet.cap }} pts
        · {{ sheet.activations }} activations
        · {{ valid ? 'Legal' : 'Illegal' }}
      </p>
      <hr style="margin: 12px 0; border: none; border-top: 1px solid #999;" />

      <!-- Units by rank -->
      <section v-for="r in sheet.ranks" :key="r.rank" style="margin-bottom: 14px; break-inside: avoid;">
        <h2 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin: 0 0 6px;">{{ r.label }}</h2>
        <div v-for="(u, i) in r.units" :key="i" style="margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 14px; font-weight: 600;">
            <span style="display: flex; align-items: center; gap: 8px;">
              <img v-if="u.portrait" :src="imageUrl(u.portrait)" alt="" style="width: 28px; height: 28px; border-radius: 9999px; object-fit: cover; flex: none;" />
              <span><template v-if="u.qty > 1">{{ u.qty }}× </template>{{ u.name }}<span v-if="u.title" style="font-weight: 400; font-style: italic; color: #555;"> — {{ u.title }}</span></span>
            </span>
            <span style="white-space: nowrap;">{{ u.cost }}</span>
          </div>
          <ul v-if="u.upgrades.length" style="margin: 2px 0 0; padding-left: 36px; font-size: 12px; color: #444;">
            <li v-for="(up, j) in u.upgrades" :key="j"><span style="color: #888;">[{{ up.slot }}]</span> {{ up.name }} <span style="color: #888;">({{ up.cost }})</span></li>
          </ul>
        </div>
      </section>

      <!-- Command hand -->
      <section v-if="sheet.commandHand.length" style="margin-bottom: 14px; break-inside: avoid;">
        <h2 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin: 0 0 6px;">Command Hand</h2>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; columns: 2; list-style: none;">
          <li v-for="(c, i) in sheet.commandHand" :key="i">
            <span style="letter-spacing: 1px; color: #000;" :aria-label="`${c.pip} pip`">{{ '●'.repeat(c.pip) }}</span>
            {{ c.name }}
          </li>
        </ul>
      </section>

      <!-- Battle deck -->
      <section v-if="sheet.showBattleDeck && sheet.battleDeck.length" style="break-inside: avoid;">
        <h2 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin: 0 0 6px;">Battle Deck</h2>
        <div v-for="g in deckGroups(sheet)" :key="g.subtype" style="margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 700;" :style="{ color: `var(${SUBTYPE_VAR[g.subtype]})` }">{{ SUBTYPE_LABEL[g.subtype] }}:</span>
          <span style="font-size: 13px;"> {{ g.cards.map((c) => c.name).join(', ') }}</span>
        </div>
      </section>
    </div>
  </Teleport>
</template>
