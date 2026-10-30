import { readonly, ref } from 'vue'

const STORAGE_KEY = 'android-app-mode'
let initialMode = 'personal'
try {
  if (localStorage.getItem(STORAGE_KEY) === 'life') initialMode = 'life'
} catch {}

const mode = ref(initialMode)
export const androidAppMode = readonly(mode)

export function setAndroidAppMode(value) {
  mode.value = value === 'life' ? 'life' : 'personal'
  try {
    localStorage.setItem(STORAGE_KEY, mode.value)
  } catch {}
}
