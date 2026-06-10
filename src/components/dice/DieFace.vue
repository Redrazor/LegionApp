<script setup lang="ts">
import { computed } from 'vue'
import type { DieType, DieColor, AttackFace, DefenseFace } from '../../utils/dice.ts'

// The Hit / Crit / Surge / Block glyph outlines below are traced from the
// Star Wars: Legion symbol font by Owen-A (github.com/Owen-A/Legion-font,
// MIT licensed) so the symbols match the real dice. Each is pre-transformed
// to fit the 64×64 die. Symbols are © Atomic Mass Games / Lucasfilm.

const props = defineProps<{
  type: DieType
  color: DieColor
  face: AttackFace | DefenseFace
  size?: number
}>()

// Intrinsic die-body colours (the physical dice, not theme tokens).
const BODY: Record<DieColor, string> = {
  red: '#b32d2d',
  black: '#1b1b1f',
  white: '#e7e7ec',
}
const bg = computed(() => BODY[props.color])
// White dice need dark symbols for contrast; red/black get white symbols.
const sym = computed(() => (props.color === 'white' ? '#1b1b1f' : '#ffffff'))

const GLYPH: Record<string, { t: string; d: string }> = {
  hit: {
    t: 'translate(32 32) scale(0.06583 -0.06583) translate(-369 -238.5)',
    d: 'M369 536Q378 522 386.5 509.5Q395 497 405.0 486.0Q415 475 428.5 466.5Q442 458 460 452Q460 452 465 450Q468 448 473 448Q485 448 502.5 455.0Q520 462 540.0 473.0Q560 484 580.5 496.5Q601 509 620.5 521.0Q640 533 658 542Q676 552 688 557Q683 543 672.0 523.5Q661 504 648.0 481.5Q635 459 621.5 436.0Q608 413 598.0 392.5Q588 372 583 356Q578 340 582 330Q587 312 596.0 298.5Q605 285 616.0 274.5Q627 264 640.0 256.0Q653 248 667 238Q653 229 640.0 220.5Q627 212 616.0 202.0Q605 192 596.5 179.0Q588 166 582 148Q578 138 583.0 121.0Q588 104 598.0 83.5Q608 63 621.5 40.5Q635 18 648.0 -4.5Q661 -27 671.5 -46.5Q682 -66 688 -80Q676 -76 658.0 -66.0Q640 -56 620.5 -44.0Q601 -32 580.5 -19.0Q560 -6 540.0 4.0Q520 14 503.0 21.0Q486 28 473 28Q465 28 460 26Q442 20 428.5 11.0Q415 2 405.0 -9.0Q395 -20 386.5 -33.0Q378 -46 369 -60Q360 -46 351.0 -33.0Q342 -20 332.0 -9.0Q322 2 309.0 11.0Q296 20 278 26Q272 28 264 28Q252 28 235.0 21.0Q218 14 198.0 4.0Q178 -6 157.0 -19.0Q136 -32 116.5 -44.0Q97 -56 79.5 -66.0Q62 -76 50 -80Q54 -66 65.5 -46.5Q77 -27 90.0 -4.5Q103 18 116.5 40.5Q130 63 140.0 83.5Q150 104 155.0 121.0Q160 138 156 148Q150 166 141.0 179.0Q132 192 121.0 202.0Q110 212 97.0 221.0Q84 230 70 238Q84 247 97.0 255.5Q110 264 121.0 274.5Q132 285 141 298Q150 312 156 330Q160 340 155.0 356.0Q150 372 140.0 392.5Q130 413 116.5 436.0Q103 459 90.0 481.5Q77 504 66 524Q54 543 50 557Q62 553 79.5 543.0Q97 533 116.5 521.0Q136 509 157.0 496.5Q178 484 198.0 473.0Q218 462 235.0 455.0Q252 448 264 448Q268 448 272 450Q276 451 278 452Q296 458 309.0 466.5Q322 475 332.0 486.0Q342 497 351.0 509.5Q360 522 369 536Z',
  },
  crit: {
    t: 'translate(32 32) scale(0.05 -0.05) translate(-446.5 -254)',
    d: 'M564 528Q624 524 676 518Q728 510 766 504Q810 496 846 489Q830 435 808 374Q788 322 757.5 255.5Q727 189 686 119Q646 49 603.5 -9.5Q561 -68 526 -112L614 194L721 274L614 356ZM282 193 368 -112Q350 -92 331.0 -66.0Q312 -40 291.0 -11.0Q270 18 249.0 51.0Q228 84 208 119Q166 189 136.0 255.5Q106 322 86 374Q62 434 47 489Q82 496 128 504Q166 510 218.0 517.0Q270 524 330 528L282 357L172 274ZM534 218 447 -166 362 216 282 274 362 332 447 674 534 332 612 274Z',
  },
  surge: {
    t: 'translate(32 32) scale(0.0566 -0.0566) translate(-397 -222.5)',
    d: 'M421 105 26 -148 280 244 263 358 376 339 768 593 516 200 532 86ZM86 93Q74 123 66.0 155.5Q58 188 58 222Q58 258 66 293Q76 328 90 360Q99 382 102.5 406.5Q106 431 102 455L90 530L166 519Q174 518 179.0 517.0Q184 516 192 516Q210 516 227.0 519.0Q244 522 260 531Q292 545 327.0 552.5Q362 560 398 560Q432 560 464.0 553.0Q496 546 528 534L358 426L164 456L196 262ZM710 351Q722 319 729.0 287.5Q736 256 736 222Q736 186 728.0 152.0Q720 118 706 86Q696 64 693.0 39.0Q690 14 694 -10L706 -86L630 -74Q622 -73 617.0 -72.5Q612 -72 604 -72Q588 -72 570 -74Q552 -78 536 -86Q504 -100 469.0 -108.0Q434 -116 398 -116Q364 -116 332 -108Q300 -102 270 -90L442 17L631 -10L600 179Z',
  },
  block: {
    t: 'translate(32 32) scale(0.0531 -0.0531) translate(-442.5 -171.5)',
    d: 'M441 -194Q395 -140 365 -97Q341 -74 328 -57Q309 -31 288.5 -2.5Q268 26 247.0 59.0Q226 92 207 126Q165 195 135.5 261.0Q106 327 86 378Q62 438 47 492Q82 499 128 507Q165 513 217 520L327 531Q379 537 436.5 537.0Q494 537 527 534L559 531Q618 527 670 521Q725 512 759 507Q802 499 838 492Q822 439 800 378Q781 327 750.5 261.0Q720 195 680 126Q640 57 598 -1L521 -102Q502 -127 482.0 -150.0Q462 -173 452 -183Z',
  },
}

const glyph = computed(() => GLYPH[props.face])
</script>

<template>
  <svg
    :width="size ?? 64"
    :height="size ?? 64"
    viewBox="0 0 64 64"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Die body: tall hexagon for the attack d8, rounded square for the defense d6 -->
    <polygon
      v-if="type === 'attack'"
      points="32,2 60,16 60,48 32,62 4,48 4,16"
      :fill="bg"
      stroke="rgba(255,255,255,0.28)"
      stroke-width="1.5"
    />
    <rect
      v-else
      x="3" y="3" width="58" height="58" rx="10"
      :fill="bg"
      stroke="rgba(255,255,255,0.28)"
      stroke-width="1.5"
    />

    <!-- Symbol: traced Legion glyph for hit/crit/surge/block -->
    <path v-if="glyph" :transform="glyph.t" :d="glyph.d" :fill="sym" fill-rule="nonzero" />

    <!-- Blank: faint dot -->
    <circle v-else-if="face === 'blank'" cx="32" cy="32" r="4.5" :fill="sym" opacity="0.3" />
  </svg>
</template>
