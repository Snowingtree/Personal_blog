import {
  AUTH_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_TOKEN_KEY,
  NOTE_AUTH_KEY,
  NOTE_USERNAME_KEY,
  USERNAME_KEY
} from '../constants/storage'

const IS_ANDROID_APP = import.meta.env.MODE === 'android'

function getAuthKeyByScope(scope) {
  if (scope === 'tools') {
    return ''
  }

  if (scope === 'notes') {
    return NOTE_AUTH_KEY
  }

  return AUTH_KEY
}

function getLoginRouteByScope(scope) {
  if (scope === 'tools') {
    return 'login'
  }

  if (isUnifiedPrivateAuthScope(scope)) {
    return 'notes-login'
  }

  return 'login'
}

function isUnifiedPrivateAuthScope(scope) {
  return scope === 'anime' || scope === 'notes' || scope === 'tools'
}

export function siteAuthGuard(to) {
  const authToken = localStorage.getItem(AUTH_TOKEN_KEY)
  const refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY)
  const hasAccessToken = typeof authToken === 'string' && authToken.trim().length > 0
  const hasRefreshToken = typeof refreshToken === 'string' && refreshToken.trim().length > 0
  const hasToken = hasAccessToken || hasRefreshToken

  if (!hasToken) {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(USERNAME_KEY)
    localStorage.removeItem(NOTE_AUTH_KEY)
    localStorage.removeItem(NOTE_USERNAME_KEY)
  }

  const animeAuthenticated = hasToken && localStorage.getItem(AUTH_KEY) === 'true'
  const notesAuthenticated = hasToken && localStorage.getItem(NOTE_AUTH_KEY) === 'true'
  const hasAnyPrivateAppAuth = animeAuthenticated || notesAuthenticated

  if (to.name === 'login' && hasAnyPrivateAppAuth) {
    return { name: IS_ANDROID_APP ? 'notes' : 'tool-selector' }
  }

  if (to.name === 'notes-login' && hasAnyPrivateAppAuth) {
    return { name: IS_ANDROID_APP ? 'notes' : 'tool-selector' }
  }

  const isAuthenticated =
    isUnifiedPrivateAuthScope(to.meta.authScope)
      ? hasAnyPrivateAppAuth
      : hasToken && localStorage.getItem(getAuthKeyByScope(to.meta.authScope)) === 'true'

  if (to.meta.requiresAuth && !isAuthenticated) {
    const loginRoute = { name: getLoginRouteByScope(to.meta.authScope) }

    if (IS_ANDROID_APP) {
      loginRoute.query = { redirect: to.fullPath }
    }

    return loginRoute
  }

  return true
}
