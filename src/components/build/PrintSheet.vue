<script setup lang="ts">
import type { ArmySheet, ArmySheetCard, ArmySheetKeyword, PrintOptions } from '../../utils/army.ts'
import type { BattleCardSubtype } from '../../types/index.ts'
import { imageUrl } from '../../utils/imageUrl.ts'

// A clean, print-only army sheet. Hidden on screen (.print-sheet); replaces the app
// when printing (see style.css). Uses explicit black/white colours rather than theme
// tokens so it's legible on paper in either theme. Teleported to <body> so it sits
// outside #app, which the print stylesheet hides. The roster always prints; `options`
// (from the Print Options modal) gates the optional reference + card-image sections.
const props = defineProps<{ sheet: ArmySheet; valid: boolean; options: PrintOptions }>()

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

// Expand a deduped card list into the images to print. `perCopy` repeats each by its
// qty (proxy cut-out sets); otherwise one image of each, labelled ×N where qty > 1.
function cardImages(cards: ArmySheetCard[], perCopy: boolean) {
  const out: { name: string; cardImage: string | null; badge: string; keywords?: ArmySheetKeyword[] }[] = []
  for (const c of cards) {
    if (!c.cardImage) continue
    if (perCopy) for (let i = 0; i < c.qty; i++) out.push({ ...c, badge: '' })
    else out.push({ ...c, badge: c.qty > 1 ? `×${c.qty}` : '' })
  }
  return out
}
const showBattleDeckText = () => props.options.battleDeck && props.sheet.showBattleDeck && props.sheet.battleDeck.length > 0
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
      <section v-if="options.commandHand && sheet.commandHand.length" style="margin-bottom: 14px; break-inside: avoid;">
        <h2 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin: 0 0 6px;">Command Hand</h2>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; columns: 2; list-style: none;">
          <li v-for="(c, i) in sheet.commandHand" :key="i">
            <span style="letter-spacing: 1px; color: #000;" :aria-label="`${c.pip} pip`">{{ '●'.repeat(c.pip) }}</span>
            {{ c.name }}
          </li>
        </ul>
      </section>

      <!-- Battle deck -->
      <section v-if="showBattleDeckText()" style="margin-bottom: 14px; break-inside: avoid;">
        <h2 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin: 0 0 6px;">{{ sheet.isReconDeck ? 'Recon Battle Cards' : 'Battle Deck' }}</h2>
        <div v-for="g in deckGroups(sheet)" :key="g.subtype" style="margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 700;" :style="{ color: `var(${SUBTYPE_VAR[g.subtype]})` }">{{ SUBTYPE_LABEL[g.subtype] }}:</span>
          <span style="font-size: 13px;"> {{ g.cards.map((c) => c.name).join(', ') }}</span>
        </div>
      </section>

      <!-- Doctrines ("Choose N of the following") -->
      <section v-if="sheet.doctrines.length" style="margin-bottom: 14px; break-inside: avoid;">
        <h2 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin: 0 0 6px;">Doctrines</h2>
        <dl style="margin: 0; font-size: 12px; line-height: 1.4;">
          <div v-for="(d, i) in sheet.doctrines" :key="i" style="margin-bottom: 5px; break-inside: avoid;">
            <dt style="display: inline; font-weight: 700;">{{ d.name }}.</dt>
            <dd style="display: inline; margin: 0 0 0 4px; color: #333;">{{ d.text }}</dd>
          </div>
        </dl>
      </section>

      <!-- Keyword reference (army-wide alphabetical list). When unit cards are ALSO
           printed, the keywords move under each card instead (see Unit Cards below),
           so this global section is suppressed. -->
      <section v-if="options.keywordReference && !options.unitCards && sheet.keywords.length" style="margin-bottom: 14px;">
        <h2 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin: 0 0 6px;">Keyword Reference</h2>
        <dl style="margin: 0; font-size: 11px; line-height: 1.4;">
          <div v-for="(k, i) in sheet.keywords" :key="i" style="margin-bottom: 5px; break-inside: avoid;">
            <dt style="display: inline; font-weight: 700;">{{ k.name }}.</dt>
            <dd style="display: inline; margin: 0 0 0 4px; color: #333;">{{ k.text }}</dd>
          </div>
        </dl>
      </section>

      <!-- Card-image sections (proxy / print-and-play) -->
      <section v-if="options.unitCards && cardImages(sheet.unitCards, options.perCopy).length" style="break-before: page;">
        <h2 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin: 0 0 8px;">Unit Cards</h2>

        <!-- With the keyword reference on: card + its own keywords side-by-side, one
             unit per block. Each block avoids breaking, so a long keyword list pushes
             that unit onto its own page rather than clipping. -->
        <template v-if="options.keywordReference">
          <div
            v-for="(c, i) in cardImages(sheet.unitCards, options.perCopy)"
            :key="i"
            style="display: flex; gap: 14px; align-items: flex-start; margin-bottom: 16px; break-inside: avoid;"
          >
            <figure class="ps-card" style="flex: none;">
              <img :src="imageUrl(c.cardImage!)" :alt="c.name" />
              <figcaption v-if="c.badge" style="position: absolute; top: 4px; right: 4px; background: #000; color: #fff; font-size: 11px; font-weight: 700; padding: 1px 5px; border-radius: 4px;">{{ c.badge }}</figcaption>
            </figure>
            <dl v-if="c.keywords && c.keywords.length" style="margin: 0; flex: 1; font-size: 11px; line-height: 1.4;">
              <div v-for="(k, j) in c.keywords" :key="j" style="margin-bottom: 5px; break-inside: avoid;">
                <dt :style="`display: inline; font-weight: 700;${k.fromUpgrade ? ' font-style: italic;' : ''}`">{{ k.name }}.</dt>
                <span v-if="k.fromUpgrade" style="display: inline-block; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #000; border: 1px solid #999; border-radius: 3px; padding: 0 3px; margin-left: 4px; vertical-align: 1px;">from upgrade</span>
                <dd style="display: inline; margin: 0 0 0 4px; color: #333;">{{ k.text }}</dd>
              </div>
            </dl>
          </div>
        </template>

        <!-- Without the keyword reference: playing-card-sized cards, wrapped. -->
        <div v-else class="ps-card-grid">
          <figure v-for="(c, i) in cardImages(sheet.unitCards, options.perCopy)" :key="i" class="ps-card">
            <img :src="imageUrl(c.cardImage!)" :alt="c.name" />
            <figcaption v-if="c.badge" style="position: absolute; top: 4px; right: 4px; background: #000; color: #fff; font-size: 11px; font-weight: 700; padding: 1px 5px; border-radius: 4px;">{{ c.badge }}</figcaption>
          </figure>
        </div>
      </section>

      <section v-if="options.upgradeCards && cardImages(sheet.upgradeCards, options.perCopy).length" style="break-before: page;">
        <h2 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin: 0 0 8px;">Upgrade Cards</h2>
        <div class="ps-card-grid">
          <figure v-for="(c, i) in cardImages(sheet.upgradeCards, options.perCopy)" :key="i" class="ps-card">
            <img :src="imageUrl(c.cardImage!)" :alt="c.name" />
            <figcaption v-if="c.badge" style="position: absolute; top: 4px; right: 4px; background: #000; color: #fff; font-size: 11px; font-weight: 700; padding: 1px 5px; border-radius: 4px;">{{ c.badge }}</figcaption>
          </figure>
        </div>
      </section>

      <section v-if="options.commandCards && sheet.commandHand.some((c) => c.cardImage)" style="break-before: page;">
        <h2 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin: 0 0 8px;">Command Cards</h2>
        <div class="ps-card-grid">
          <figure v-for="(c, i) in sheet.commandHand.filter((x) => x.cardImage)" :key="i" class="ps-card">
            <img :src="imageUrl(c.cardImage!)" :alt="c.name" />
          </figure>
        </div>
      </section>

      <section v-if="options.battleDeckCards && sheet.showBattleDeck && sheet.battleDeck.some((c) => c.cardImage)" style="break-before: page;">
        <h2 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin: 0 0 8px;">{{ sheet.isReconDeck ? 'Recon Battle Cards' : 'Battle-Deck Cards' }}</h2>
        <!-- Secondary & advantage cards are playing-card sized. -->
        <div class="ps-card-grid">
          <figure v-for="(c, i) in sheet.battleDeck.filter((x) => x.cardImage && x.subtype !== 'primary')" :key="i" class="ps-card">
            <img :src="imageUrl(c.cardImage!)" :alt="c.name" />
          </figure>
        </div>
        <!-- Primary objectives fold the deployment "map" in, so they're taller than a playing
             card — printed at the playing-card WIDTH with natural height (as close to card-size
             as their shape allows), wrapping like the rest. -->
        <div v-if="sheet.battleDeck.some((x) => x.cardImage && x.subtype === 'primary')" class="ps-card-grid" style="margin-top: 4mm;">
          <figure v-for="(c, i) in sheet.battleDeck.filter((x) => x.cardImage && x.subtype === 'primary')" :key="`p${i}`" class="ps-card ps-card-tall">
            <img :src="imageUrl(c.cardImage!)" :alt="c.name" />
          </figure>
        </div>
      </section>
    </div>
  </Teleport>
</template>
