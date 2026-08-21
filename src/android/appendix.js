import { ANDROID_APPENDIX_ENABLED_KEY } from '../constants/storage'

export const ANDROID_APPENDIX_SETTING_CHANGE_EVENT = 'android:appendix-setting-change'

export function readAndroidAppendixEnabled() {
  if (typeof localStorage === 'undefined') {
    return false
  }

  return localStorage.getItem(ANDROID_APPENDIX_ENABLED_KEY) === 'true'
}

export function saveAndroidAppendixEnabled(enabled) {
  const normalizedEnabled = Boolean(enabled)

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(ANDROID_APPENDIX_ENABLED_KEY, String(normalizedEnabled))
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(ANDROID_APPENDIX_SETTING_CHANGE_EVENT, {
        detail: { enabled: normalizedEnabled }
      })
    )
  }

  return normalizedEnabled
}
