import { ref } from 'vue'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'legion-theme'

function read(): Theme {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  return v === 'light' ? 'light' : 'dark'
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle('light', theme === 'light')
}

const theme = ref<Theme>(read())

/** App-wide light/dark theme. Default dark; persisted to localStorage. */
export function useTheme() {
  function set(t: Theme) {
    theme.value = t
    localStorage.setItem(STORAGE_KEY, t)
    apply(t)
  }
  function toggle() {
    set(theme.value === 'dark' ? 'light' : 'dark')
  }
  function init() {
    apply(theme.value)
  }
  return { theme, set, toggle, init }
}
