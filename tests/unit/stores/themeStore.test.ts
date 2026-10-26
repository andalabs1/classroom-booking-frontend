import { describe, expect, it, vi } from 'vitest'

describe('theme preference persistence', () => {
  it('starts light, persists toggles, and restores the selected mode', async () => {
    vi.resetModules()
    const { useThemeStore } = await import('../../../src/shared/stores/themeStore')
    expect(useThemeStore.getState().mode).toBe('light')
    useThemeStore.getState().toggle()
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(JSON.parse(localStorage.getItem('classroom-theme') ?? 'null').state.mode).toBe('dark')
    vi.resetModules()
    const { useThemeStore: restored } = await import('../../../src/shared/stores/themeStore')
    expect(restored.getState().mode).toBe('dark')
    restored.getState().toggle()
    expect(restored.getState().mode).toBe('light')
  })
})
