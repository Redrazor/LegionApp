<script setup lang="ts">
// The Legion Player Marker sigils, drawn as SVG so they stay crisp at any size and theme
// with the app: the Blue player's twin-bracket "clam" mark and the Red player's numeral 7.
// Traced from the official player-marker tokens.
withDefaults(defineProps<{ variant: 'blue' | 'red'; size?: number; label?: string }>(), { size: 28 })
</script>

<template>
  <span
    class="pm" :class="variant"
    :style="{ width: `${size}px`, height: `${size}px` }"
    :role="label ? 'img' : undefined" :aria-label="label" :aria-hidden="label ? undefined : 'true'"
  >
    <svg viewBox="0 0 200 200">
      <template v-if="variant === 'blue'">
        <polygon points="26,86 50,60 150,60 174,86 150,78 50,78" />
        <rect x="78" y="92" width="44" height="16" rx="3" />
        <polygon points="26,114 50,140 150,140 174,114 150,122 50,122" />
      </template>
      <template v-else>
        <polygon points="50,54 152,54 152,76 50,76" />
        <polygon points="112,74 152,74 120,150 94,150" />
      </template>
    </svg>
  </span>
</template>

<style scoped>
.pm {
  display: inline-grid;
  place-items: center;
  flex: none;
  border-radius: 50%;
  box-shadow:
    0 0 0 2px #07090c,
    inset 0 1px 2px rgba(255, 255, 255, 0.18),
    inset 0 -3px 6px rgba(0, 0, 0, 0.35);
}
.pm.blue { background: radial-gradient(120% 120% at 34% 26%, #3b7fd6, #1f5fb0 46%, #16467f); }
.pm.red { background: radial-gradient(120% 120% at 34% 26%, #c24a42, #9e2b25 46%, #6f1c18); }
.pm svg { width: 64%; height: 64%; fill: #eaf0f7; }
</style>
