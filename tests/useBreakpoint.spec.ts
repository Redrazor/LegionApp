import { describe, it, expect } from 'vitest'
import { resolveBreakpoint, TABLET_MIN, DESKTOP_MIN } from '../src/composables/useBreakpoint.ts'

describe('resolveBreakpoint', () => {
  it('classifies mobile below the tablet edge', () => {
    expect(resolveBreakpoint(0)).toBe('mobile')
    expect(resolveBreakpoint(375)).toBe('mobile')
    expect(resolveBreakpoint(TABLET_MIN - 1)).toBe('mobile') // 767
  })

  it('classifies tablet from the tablet edge up to the desktop edge', () => {
    expect(resolveBreakpoint(TABLET_MIN)).toBe('tablet') // 768
    expect(resolveBreakpoint(900)).toBe('tablet')
    expect(resolveBreakpoint(DESKTOP_MIN - 1)).toBe('tablet') // 1023
  })

  it('classifies desktop from the desktop edge up', () => {
    expect(resolveBreakpoint(DESKTOP_MIN)).toBe('desktop') // 1024
    expect(resolveBreakpoint(1440)).toBe('desktop')
    expect(resolveBreakpoint(3840)).toBe('desktop')
  })

  it('uses the expected Tailwind-aligned edges', () => {
    expect(TABLET_MIN).toBe(768)
    expect(DESKTOP_MIN).toBe(1024)
  })
})
