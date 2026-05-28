import axios from 'axios'
import {
  AUTH_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_TOKEN_KEY,
  NOTE_AUTH_KEY,
  NOTE_USERNAME_KEY,
  USERNAME_KEY
} from '../constants/storage'
import { canUsePrivateAppOrigin, getPrivateAppBaseUrl } from './privateAccess'

const EXPLICIT_API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '')
const EXPLICIT_PRIVATE_APP_BASE_URL = String(import.meta.env.VITE_PRIVATE_APP_BASE_URL || '')
  .trim()
  .replace(/\/$/, '')
const PRIVATE_ROUTE_PREFIXES = [
  '/login',
  '/display',
  '/internship',
  '/tools',
  '/notes',
  '/notes-login',
  '/ai-settings',
  '/ai-quiz-history'
]

function isPrivateRoutePath(pathname) {
  const normalizedPath = String(pathname || '').trim()

  if (!normalizedPath) {
    return false
  }

  return PRIVATE_ROUTE_PREFIXES.some((prefix) => (
    normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  ))
}

function resolveApiBaseUrl() {
  if (EXPLICIT_API_BASE_URL) {
    return EXPLICIT_API_BASE_URL
  }

  if (typeof window === 'undefined') {
    return ''
  }

  if (isPrivateRoutePath(window.location.pathname)) {
    if (EXPLICIT_PRIVATE_APP_BASE_URL) {
      return EXPLICIT_PRIVATE_APP_BASE_URL
    }

    if (canUsePrivateAppOrigin()) {
      return getPrivateAppBaseUrl()
    }
  }

  return ''
}

function clearStoredAuth() {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
  localStorage.removeItem(NOTE_AUTH_KEY)
  localStorage.removeItem(NOTE_USERNAME_KEY)
}

function getStoredToken(storageKey) {
  if (typeof localStorage === 'undefined') {
    return ''
  }

  return String(localStorage.getItem(storageKey) || '').trim()
}

function writeStoredAuthTokens({ token, refreshToken, user } = {}) {
  if (typeof localStorage === 'undefined') {
    return
  }

  const normalizedToken = String(token || '').trim()
  const normalizedRefreshToken = String(refreshToken || '').trim()
  const username = typeof user?.username === 'string' ? user.username.trim() : ''

  if (normalizedToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, normalizedToken)
  }

  if (normalizedRefreshToken) {
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, normalizedRefreshToken)
  }

  localStorage.setItem(AUTH_KEY, 'true')
  localStorage.setItem(NOTE_AUTH_KEY, 'true')

  if (username) {
    localStorage.setItem(USERNAME_KEY, username)
    localStorage.setItem(NOTE_USERNAME_KEY, username)
  }
}

function isAuthRequest(url, pathname) {
  return String(url || '').includes(pathname)
}

function isLoginRequest(url) {
  return isAuthRequest(url, '/api/login')
}

function createRefreshAuthError(message, { shouldClearAuth = false, isStale = false } = {}) {
  const error = new Error(message)

  error.name = 'RefreshAuthError'
  error.shouldClearAuth = shouldClearAuth
  error.isStale = isStale

  return error
}

function shouldClearAuthAfterRefreshError(error) {
  return Boolean(error && typeof error === 'object' && error.shouldClearAuth)
}

let refreshAccessTokenPromise = null

export async function refreshAccessToken() {
  if (refreshAccessTokenPromise) {
    return refreshAccessTokenPromise
  }

  refreshAccessTokenPromise = (async () => {
    const currentRefreshToken = getStoredToken(AUTH_REFRESH_TOKEN_KEY)

    if (!currentRefreshToken) {
      throw createRefreshAuthError('Refresh token is missing.', {
        shouldClearAuth: true
      })
    }

    let response

    try {
      response = await axios.post(
        '/api/login',
        {
          refresh_token: currentRefreshToken
        },
        {
          baseURL: resolveApiBaseUrl(),
          timeout: 10000,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        }
      )
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw createRefreshAuthError('Refresh token is invalid or expired.', {
          shouldClearAuth: true
        })
      }

      throw error
    }

    const data = response.data || {}
    const nextToken = String(data.token || data.accessToken || data.access_token || '').trim()
    const nextRefreshToken = String(data.refreshToken || data.refresh_token || '').trim()

    if (!nextToken) {
      throw new Error('Refresh response did not include an auth token.')
    }

    if (getStoredToken(AUTH_REFRESH_TOKEN_KEY) !== currentRefreshToken) {
      throw createRefreshAuthError('Refresh token changed while refresh was in flight.', {
        isStale: true
      })
    }

    writeStoredAuthTokens({
      token: nextToken,
      refreshToken: nextRefreshToken || currentRefreshToken,
      user: data.user
    })

    return nextToken
  })()

  try {
    return await refreshAccessTokenPromise
  } finally {
    refreshAccessTokenPromise = null
  }
}

function createHttpError(error) {
  const responseData = error.response?.data
  const responseMessage =
    typeof responseData === 'string'
      ? responseData.trim() && !responseData.trim().startsWith('<')
        ? responseData.trim()
        : ''
      : responseData?.message
  const message =
    responseMessage ||
    (error.response?.status === 403
      ? `API request was blocked with 403: ${error.config?.url || ''}. The request did not reach the Node API service. Check whether Nginx forwards /api to Node and restart the Node service after uploading server files.`
      : '') ||
    (error.response?.status === 500
      ? 'Server returned 500. Check the Node service logs for the exact auth error.'
      : error.message || 'Request failed')
  const normalizedError = new Error(message)

  normalizedError.name = 'HttpError'
  normalizedError.status = error.response?.status
  normalizedError.data = error.response?.data

  return normalizedError
}

const http = axios.create({
  timeout: 10000
})

http.interceptors.request.use(
  (config) => {
    if (!config.baseURL) {
      config.baseURL = resolveApiBaseUrl()
    }

    const headers = axios.AxiosHeaders.from(config.headers)

    headers.set('Accept', 'application/json')

    const token = getStoredToken(AUTH_TOKEN_KEY)

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const hasRequestBody = config.data !== undefined && config.data !== null

    if (hasRequestBody && !(config.data instanceof FormData) && !headers.getContentType()) {
      headers.set('Content-Type', 'application/json')
    }

    config.headers = headers
    return config
  },
  (error) => Promise.reject(error)
)

http.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (axios.isAxiosError(error)) {
      const originalConfig = error.config || {}
      const requestUrl = String(originalConfig.url || '')

      if (
        error.response?.status === 401
        && !originalConfig.__isRetryAfterRefresh
        && !isLoginRequest(requestUrl)
      ) {
        try {
          const nextToken = await refreshAccessToken()

          if (getStoredToken(AUTH_TOKEN_KEY) !== nextToken) {
            return Promise.reject(createHttpError(error))
          }

          const headers = axios.AxiosHeaders.from(originalConfig.headers)
          headers.set('Authorization', `Bearer ${nextToken}`)
          originalConfig.headers = headers
          originalConfig.__isRetryAfterRefresh = true
          return http.request(originalConfig)
        } catch (refreshError) {
          if (shouldClearAuthAfterRefreshError(refreshError)) {
            clearStoredAuth()

            if (typeof window !== 'undefined') {
              const nextLocation = '/notes-login'
              const nextUrl = new URL(nextLocation, window.location.origin).toString()

              if (window.location.href !== nextUrl) {
                window.location.assign(nextUrl)
              }
            }
          }
        }
      } else if (
        error.response?.status === 401
        && !isLoginRequest(requestUrl)
      ) {
        clearStoredAuth()

        if (typeof window !== 'undefined') {
          const nextLocation = '/notes-login'
          const nextUrl = new URL(nextLocation, window.location.origin).toString()

          if (window.location.href !== nextUrl) {
            window.location.assign(nextUrl)
          }
        }
      }

      return Promise.reject(createHttpError(error))
    }

    return Promise.reject(error instanceof Error ? error : new Error('Request failed'))
  }
)

export default http
