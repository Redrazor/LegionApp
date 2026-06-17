import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useArmyStore } from '../stores/army.ts'
import { useUnitsStore } from '../stores/units.ts'
import { useUpgradesStore } from '../stores/upgrades.ts'
import { useBattleForcesStore } from '../stores/battleForces.ts'
import { useCommandsStore } from '../stores/commands.ts'
import { useBattleCardsStore } from '../stores/battleCards.ts'
import { validateArmy, defaultBattleForceId } from '../utils/army.ts'

/** Reactive army validation bound to the current draft + loaded catalogues. */
export function useArmyValidation() {
  const armyStore = useArmyStore()
  const { draft } = storeToRefs(armyStore)
  const unitsStore = useUnitsStore()
  const upgradesStore = useUpgradesStore()
  const bfStore = useBattleForcesStore()
  const commandsStore = useCommandsStore()
  const battleCardsStore = useBattleCardsStore()

  // Resolve the active battle force, falling back to the faction's default (Mandalorian
  // armies are always the Mandalorian Clans battle force even when none is set explicitly).
  const battleForce = computed(() => {
    const id = draft.value.battleForce ?? defaultBattleForceId(draft.value.faction)
    return id ? bfStore.byId.get(id) ?? null : null
  })

  const validation = computed(() =>
    validateArmy(draft.value, unitsStore.byId, upgradesStore.byId, battleForce.value, commandsStore.byId, battleCardsStore.byId),
  )

  const pointsRemaining = computed(() => draft.value.gameSize - validation.value.points)

  return { validation, pointsRemaining, battleForce }
}
