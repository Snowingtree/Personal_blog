import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { SITE_THEME_KEY } from '../constants/storage'

const THEME_TRANSITION_DURATION = 620
function readStoredTheme() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return window.localStorage.getItem(SITE_THEME_KEY) === 'dark'
  } catch {
    return false
  }
}

const isDarkTheme = ref(readStoredTheme())
const isThemeTransitioning = ref(false)
const transitionTargetIsDark = ref(isDarkTheme.value)
let themeTransitionTimer = 0
let themeTransitionFrame = 0

function persistThemeToStorage(nextValue) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(SITE_THEME_KEY, nextValue ? 'dark' : 'light')
  } catch {
    // Ignore storage failures and keep the in-memory theme state.
  }
}

function clearThemeTransition() {
  if (typeof window === 'undefined') {
    return
  }

  window.clearTimeout(themeTransitionTimer)
  window.cancelAnimationFrame(themeTransitionFrame)
  themeTransitionTimer = 0
  themeTransitionFrame = 0
}

function startThemeTransition(nextValue) {
  if (typeof window === 'undefined') {
    isDarkTheme.value = nextValue
    return
  }

  isThemeTransitioning.value = false
  transitionTargetIsDark.value = nextValue
  clearThemeTransition()

  themeTransitionFrame = window.requestAnimationFrame(() => {
    isThemeTransitioning.value = true
    isDarkTheme.value = nextValue
    persistThemeToStorage(nextValue)
    themeTransitionTimer = window.setTimeout(() => {
      isThemeTransitioning.value = false
      themeTransitionTimer = 0
    }, THEME_TRANSITION_DURATION)
  })
}

function persistTheme(nextValue) {
  const normalizedValue = Boolean(nextValue)

  if (
    normalizedValue === isDarkTheme.value &&
    (!isThemeTransitioning.value || transitionTargetIsDark.value === normalizedValue)
  ) {
    return
  }

  if (typeof window === 'undefined') {
    isDarkTheme.value = normalizedValue
    return
  }

  startThemeTransition(normalizedValue)
}

function toggleTheme() {
  persistTheme(isThemeTransitioning.value ? !transitionTargetIsDark.value : !isDarkTheme.value)
}

export function useSiteTheme() {
  const route = useRoute()
  const shouldUseDarkTheme = computed(() =>
    route.meta?.followSiteTheme !== false && isDarkTheme.value
  )

  return {
    isDarkTheme,
    isThemeTransitioning,
    transitionTargetIsDark,
    shouldUseDarkTheme,
    persistTheme,
    toggleTheme
  }
}
