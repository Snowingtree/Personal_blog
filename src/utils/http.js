import axios from 'axios'
import {
  AGENT_AUTH_KEY,
  AGENT_USERNAME_KEY,
  AUTH_KEY,
  AUTH_TOKEN_KEY,
  NOTE_AUTH_KEY,
  NOTE_USERNAME_KEY,
  USERNAME_KEY
} from '../constants/storage'
import { canUsePrivateAppOrigin, getPrivateApiBaseUrl } from './privateAccess'

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
      return getPrivateApiBaseUrl()
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
  localStorage.removeItem(USERNAME_KEY)
  localStorage.removeItem(NOTE_AUTH_KEY)
  localStorage.removeItem(NOTE_USERNAME_KEY)
  localStorage.removeItem(AGENT_AUTH_KEY)
  localStorage.removeItem(AGENT_USERNAME_KEY)
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
      ? `API request was blocked with 403: ${error.config?.url || ''}. The request did not reach the Node API service. Check the /api reverse proxy or set VITE_API_BASE_URL / VITE_PRIVATE_APP_BASE_URL to the backend origin.`
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

    const token = localStorage.getItem(AUTH_TOKEN_KEY)

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
  (error) => {
    if (axios.isAxiosError(error)) {
      if (
        error.response?.status === 401
        && !String(error.config?.url || '').includes('/api/login')
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
