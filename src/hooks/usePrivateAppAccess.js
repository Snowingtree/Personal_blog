import { onMounted, ref } from 'vue'
import {
  detectPrivateAppReachability,
  isPrivateAppHost,
  resolvePrivateAppUrl,
  setRuntimePrivateAppAccess
} from '../utils/privateAccess'

const IS_ANDROID_APP = import.meta.env.MODE === 'android'

export function usePrivateAppAccess() {
  const privateAppAvailable = ref(IS_ANDROID_APP || isPrivateAppHost())
  const privateAppChecking = ref(!privateAppAvailable.value)

  onMounted(async () => {
    if (IS_ANDROID_APP) {
      setRuntimePrivateAppAccess(true)
      privateAppAvailable.value = true
      privateAppChecking.value = false
      return
    }

    const isCurrentHostPrivate = isPrivateAppHost()

    if (privateAppAvailable.value) {
      setRuntimePrivateAppAccess(true)
      privateAppChecking.value = false
      return
    }

    setRuntimePrivateAppAccess(false)
    const reachable = await detectPrivateAppReachability()

    if (
      reachable
      && !isCurrentHostPrivate
      && typeof window !== 'undefined'
    ) {
      const nextLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`
      window.location.replace(resolvePrivateAppUrl(nextLocation))
      return
    }

    privateAppAvailable.value = reachable
    privateAppChecking.value = false
  })

  return {
    privateAppAvailable,
    privateAppChecking
  }
}
