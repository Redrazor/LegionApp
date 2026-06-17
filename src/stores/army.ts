import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Army, ArmyUnit, BattleForce, CompactArmy, Faction, Unit, Upgrade } from '../types/index.ts'
import { toCompact, fromCompact, pruneOrphanedUpgrades, defaultBattleForceId } from '../utils/army.ts'

function emptyArmy(): Army {
  return { name: '', faction: null, battleForce: null, gameSize: 1000, units: [], commandHand: [], battleDeck: [] }
}

let uidCounter = 0
function nextUid(): string {
  return `u${Date.now().toString(36)}${(uidCounter++).toString(36)}`
}

export const useArmyStore = defineStore(
  'army',
  () => {
    // Working draft
    const draft = ref<Army>(emptyArmy())
    // Saved armies (compact form) + index of the loaded one (-1 = unsaved)
    const saved = ref<CompactArmy[]>([])
    const activeIndex = ref(-1)

    function setFaction(faction: Faction) {
      if (draft.value.faction !== faction) {
        // Switching faction clears incompatible units and the command hand (both are
        // faction-bound). Mandalorian armies are always built as the Mandalorian Clans
        // battle force; others default to no battle force.
        if (draft.value.units.length > 0) draft.value.units = []
        draft.value.battleForce = defaultBattleForceId(faction)
        draft.value.commandHand = []
      }
      draft.value.faction = faction
    }

    /**
     * Select (or clear, with null) the army's battle force. Deliberately does NOT
     * clear units — switching battle force keeps the list and lets validation flag
     * any now-ineligible units, so the user can fix rather than lose their work.
     */
    function setBattleForce(linkId: string | null) {
      draft.value.battleForce = linkId
    }

    /** Add a command card to the hand if absent, else remove it (deck-builder toggle). */
    function toggleCommandCard(cardId: string) {
      // Legacy drafts persisted before command hands existed have no array yet.
      if (!draft.value.commandHand) draft.value.commandHand = []
      const hand = draft.value.commandHand
      const i = hand.indexOf(cardId)
      if (i >= 0) hand.splice(i, 1)
      else hand.push(cardId)
    }

    function clearCommandHand() {
      draft.value.commandHand = []
    }

    /** Add a battle card to the deck if absent, else remove it (deck-builder toggle). */
    function toggleBattleCard(cardId: string) {
      if (!draft.value.battleDeck) draft.value.battleDeck = []
      const deck = draft.value.battleDeck
      const i = deck.indexOf(cardId)
      if (i >= 0) deck.splice(i, 1)
      else deck.push(cardId)
    }

    function clearBattleDeck() {
      draft.value.battleDeck = []
    }

    function setGameSize(size: number) {
      draft.value.gameSize = size
    }

    function setName(name: string) {
      draft.value.name = name
    }

    function addUnit(unitId: string) {
      draft.value.units.push({ uid: nextUid(), unitId, upgrades: [] })
    }

    function removeUnit(uid: string) {
      draft.value.units = draft.value.units.filter((u) => u.uid !== uid)
    }

    /** Duplicate a unit (incl. its current upgrade loadout) as a new instance. */
    function addCopy(uid: string) {
      const src = findUnit(uid)
      if (!src) return
      draft.value.units.push({
        uid: nextUid(),
        unitId: src.unitId,
        upgrades: src.upgrades.map((u) => ({ ...u })),
      })
    }

    function findUnit(uid: string): ArmyUnit | undefined {
      return draft.value.units.find((u) => u.uid === uid)
    }

    /**
     * Equip an upgrade into the Nth slot of `slotType` for the given army unit.
     * When `reconcile` (the unit + battle force + upgrade catalogue) is supplied,
     * prune any upgrades left in slots that no longer exist — e.g. removing the
     * upgrade that granted a slot also drops whatever was sitting in it.
     */
    function setUpgrade(
      uid: string,
      slot: string,
      slotIndex: number,
      upgradeId: string | null,
      reconcile?: { unit: Unit; bf: BattleForce | null; upgradesById: Map<string, Upgrade> },
    ) {
      const au = findUnit(uid)
      if (!au) return
      const key = `${slot}#${slotIndex}`
      au.upgrades = au.upgrades.filter((u) => u.slot !== key)
      if (upgradeId) au.upgrades.push({ slot: key, upgradeId })
      if (reconcile) {
        au.upgrades = pruneOrphanedUpgrades(reconcile.unit, reconcile.bf, au.upgrades, reconcile.upgradesById)
      }
    }

    function upgradeInSlot(uid: string, slot: string, slotIndex: number): string | null {
      const au = findUnit(uid)
      if (!au) return null
      return au.upgrades.find((u) => u.slot === `${slot}#${slotIndex}`)?.upgradeId ?? null
    }

    function newArmy() {
      draft.value = emptyArmy()
      activeIndex.value = -1
    }

    function loadDraft(army: Army) {
      draft.value = army
    }

    function saveCurrent(): number {
      const compact = toCompact(draft.value)
      if (!compact.n) compact.n = `Untitled army`
      draft.value.name = compact.n
      if (activeIndex.value >= 0 && saved.value[activeIndex.value]) {
        saved.value[activeIndex.value] = compact
        return activeIndex.value
      }
      saved.value.push(compact)
      activeIndex.value = saved.value.length - 1
      return activeIndex.value
    }

    function loadSaved(index: number) {
      const c = saved.value[index]
      if (!c) return
      draft.value = fromCompact(c)
      activeIndex.value = index
    }

    function deleteSaved(index: number) {
      saved.value.splice(index, 1)
      if (activeIndex.value === index) activeIndex.value = -1
      else if (activeIndex.value > index) activeIndex.value--
    }

    function renameSaved(index: number, name: string) {
      if (saved.value[index]) saved.value[index].n = name
      if (activeIndex.value === index) draft.value.name = name
    }

    const isDirty = computed(() => draft.value.units.length > 0)

    return {
      draft, saved, activeIndex, isDirty,
      setFaction, setBattleForce, toggleCommandCard, clearCommandHand,
      toggleBattleCard, clearBattleDeck, setGameSize, setName,
      addUnit, removeUnit, addCopy, findUnit, setUpgrade, upgradeInSlot,
      newArmy, loadDraft, saveCurrent, loadSaved, deleteSaved, renameSaved,
    }
  },
  {
    persist: {
      // Persist the saved-armies list and which one is active; draft persists too.
      paths: ['saved', 'activeIndex', 'draft'],
    } as never,
  },
)
