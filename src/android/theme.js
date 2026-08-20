import { ANDROID_THEME_KEY } from '../constants/storage'

export const ANDROID_THEME_CHANGE_EVENT = 'android:theme-change'
export const DEFAULT_ANDROID_THEME = 'gray'
export const ANDROID_THEME_OPTIONS = Object.freeze([
  {
    value: 'gray',
    label: '灰白',
    description: '简洁克制的中性灰。'
  },
  {
    value: 'warm',
    label: '暖白',
    description: '柔和温暖的米色调。'
  }
])

const VALID_ANDROID_THEMES = new Set(
  ANDROID_THEME_OPTIONS.map((theme) => theme.value)
)

export function normalizeAndroidTheme(theme) {
  return VALID_ANDROID_THEMES.has(theme) ? theme : DEFAULT_ANDROID_THEME
}

export function readAndroidTheme() {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_ANDROID_THEME
  }

  try {
    return normalizeAndroidTheme(localStorage.getItem(ANDROID_THEME_KEY))
  } catch {
    return DEFAULT_ANDROID_THEME
  }
}

export function applyAndroidTheme(theme) {
  const normalizedTheme = normalizeAndroidTheme(theme)

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.androidTheme = normalizedTheme
  }

  return normalizedTheme
}

export function saveAndroidTheme(theme) {
  const normalizedTheme = normalizeAndroidTheme(theme)

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(ANDROID_THEME_KEY, normalizedTheme)
    } catch {
      // Keep the selected theme for the current session when storage is unavailable.
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(ANDROID_THEME_CHANGE_EVENT, {
        detail: { theme: normalizedTheme }
      })
    )
  }

  return normalizedTheme
}
