import { describe, it, expect } from 'vitest'
import { randomPlayerName } from '../src/utils/playerName.ts'

describe('randomPlayerName', () => {
  it('is deterministic given the rng (first adjective + first noun)', () => {
    expect(randomPlayerName(() => 0)).toBe('Reckless Nerf-Herder')
  })

  it('produces an "Adjective Noun" shape', () => {
    const name = randomPlayerName(() => 0.5)
    expect(name).toMatch(/^\S.* \S/)
    expect(name.split(' ').length).toBeGreaterThanOrEqual(2)
  })

  it('varies with the rng seed', () => {
    expect(randomPlayerName(() => 0)).not.toBe(randomPlayerName(() => 0.99))
  })

  it('never indexes out of bounds at rand()→~1', () => {
    // Math.random() is [0,1); a value just under 1 must still land on a valid entry.
    const name = randomPlayerName(() => 0.9999999)
    expect(name).toBeTruthy()
    expect(name).not.toMatch(/undefined/)
  })
})
