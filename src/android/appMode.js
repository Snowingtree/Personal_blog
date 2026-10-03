import { readonly, ref } from 'vue'

const STORAGE_KEY = 'android-app-mode'
let initialMode = 'personal'
try {
  if (localStorage.getItem(STORAGE_KEY) === 'health') initialMode = 'health'
} catch {}

const mode = ref(initialMode)
export const androidAppMode = readonly(mode)

export function setAndroidAppMode(value) {
  mode.value = value === 'health' ? 'health' : 'personal'
  try {
    localStorage.setItem(STORAGE_KEY, mode.value)
  } catch {}
}
