import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useArmyStore } from '../stores/army.ts'
import { useUnitsStore } from '../stores/units.ts'
import { useUpgradesStore } from '../stores/upgrades.ts'
import { useBattleForcesStore } from '../stores/battleForces.ts'
import { validateArmy } from '../utils/army.ts'

/** Reactive army validation bound to the current draft + loaded catalogues. */
export function useArmyValidation() {
  const armyStore = useArmyStore()
  const { draft } = storeToRefs(armyStore)
  const unitsStore = useUnitsStore()
  const upgradesStore = useUpgradesStore()
  const bfStore = useBattleForcesStore()

  const battleForce = computed(() =>
    draft.value.battleForce ? bfStore.byId.get(draft.value.battleForce) ?? null : null,
  )

  const validation = computed(() =>
    validateArmy(draft.value, unitsStore.byId, upgradesStore.byId, battleForce.value),
  )

  const pointsRemaining = computed(() => draft.value.gameSize - validation.value.points)

  return { validation, pointsRemaining, battleForce }
}
