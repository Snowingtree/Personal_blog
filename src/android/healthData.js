import {
  ANDROID_DIET_LOG_KEY,
  ANDROID_HEALTH_LOG_KEY
} from '../constants/storage'

function getStorageValue(key, fallback) {
  if (typeof localStorage === 'undefined') {
    return fallback
  }

  try {
    const value = JSON.parse(localStorage.getItem(key) || '')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback
  } catch {
    return fallback
  }
}

function setStorageValue(key, value) {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(key, JSON.stringify(value))
}

export function formatAndroidDateKey(value = new Date()) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function createAndroidRecentDays(count = 7) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - index)

    return {
      key: formatAndroidDateKey(date),
      date,
      isToday: index === 0
    }
  })
}

export function readAndroidHealthLogs() {
  return getStorageValue(ANDROID_HEALTH_LOG_KEY, {})
}

export function saveAndroidHealthLogs(value) {
  setStorageValue(ANDROID_HEALTH_LOG_KEY, value)
  return value
}

export function readAndroidDietLogs() {
  return getStorageValue(ANDROID_DIET_LOG_KEY, {})
}

export function saveAndroidDietLogs(value) {
  setStorageValue(ANDROID_DIET_LOG_KEY, value)
  return value
}
