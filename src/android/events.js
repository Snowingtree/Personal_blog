export const ANDROID_TOGGLE_NOTES_DIRECTORY_EVENT = 'android:toggle-notes-directory'

export function toggleAndroidNotesDirectory() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new Event(ANDROID_TOGGLE_NOTES_DIRECTORY_EVENT))
}
