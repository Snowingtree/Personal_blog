import { createHmac, timingSafeEqual } from 'node:crypto'

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseTokenTtlSeconds(value, fallbackSeconds, envKey) {
  const normalized = normalizeEnvValue(value)

  if (!normalized) {
    return fallbackSeconds
  }

  const ttlSeconds = Number(normalized)

  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error(`${envKey} must be a positive integer.`)
  }

  return ttlSeconds
}

function getAccessTokenTtlSeconds(env) {
  const explicitAccessTtl = normalizeEnvValue(env.AUTH_ACCESS_TOKEN_TTL_SECONDS)

  return parseTokenTtlSeconds(
    explicitAccessTtl || env.AUTH_TOKEN_TTL_SECONDS,
    24 * 60 * 60,
    explicitAccessTtl ? 'AUTH_ACCESS_TOKEN_TTL_SECONDS' : 'AUTH_TOKEN_TTL_SECONDS'
  )
}

function getRefreshTokenTtlSeconds(env) {
  return parseTokenTtlSeconds(
    env.AUTH_REFRESH_TOKEN_TTL_SECONDS,
    30 * 24 * 60 * 60,
    'AUTH_REFRESH_TOKEN_TTL_SECONDS'
  )
}

function getTokenSecret(env) {
  const explicitSecret = normalizeEnvValue(env.AUTH_TOKEN_SECRET)

  if (explicitSecret) {
    return explicitSecret
  }

  const derivedSecret = [
    normalizeEnvValue(env.AUTH_MYSQL_PASSWORD),
    normalizeEnvValue(env.MYSQL_PASSWORD),
    normalizeEnvValue(env.AUTH_MYSQL_DATABASE),
    normalizeEnvValue(env.MYSQL_DATABASE),
    normalizeEnvValue(env.AUTH_USER_TABLE)
  ]
    .filter(Boolean)
    .join(':')

  return derivedSecret || 'vibe-coding-development-secret'
}

function toBase64Url(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromBase64Url(value) {
  const normalized = String(value)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const paddingLength = (4 - (normalized.length % 4)) % 4
  const padded = `${normalized}${'='.repeat(paddingLength)}`

  return Buffer.from(padded, 'base64').toString('utf8')
}

function createSignature(value, secret) {
  return createHmac('sha256', secret)
    .update(value)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function readBearerToken(req) {
  const headerValue = req.headers.authorization

  if (typeof headerValue !== 'string') {
    return ''
  }

  const [scheme, token] = headerValue.trim().split(/\s+/, 2)
  return /^Bearer$/i.test(scheme) && token ? token : ''
}

function verifyTokenType(payload, expectedType) {
  const normalizedExpectedType = normalizeEnvValue(expectedType)

  if (!normalizedExpectedType) {
    return
  }

  const actualType = normalizeEnvValue(payload?.typ)

  if (!actualType && normalizedExpectedType === 'access') {
    return
  }

  if (actualType !== normalizedExpectedType) {
    throw new Error('Authentication token type is not allowed for this request.')
  }
}

export function createAuthToken(user, env = process.env, options = {}) {
  const tokenType = normalizeEnvValue(options.type) || 'access'
  const ttlSeconds =
    Number.isInteger(options.ttlSeconds) && options.ttlSeconds > 0
      ? options.ttlSeconds
      : tokenType === 'refresh'
        ? getRefreshTokenTtlSeconds(env)
        : getAccessTokenTtlSeconds(env)
  const secret = getTokenSecret(env)
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = {
    sub: user?.id == null ? String(user?.username ?? '') : String(user.id),
    username: String(user?.username ?? ''),
    typ: tokenType,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds
  }
  const encodedHeader = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const signature = createSignature(unsignedToken, secret)

  return {
    token: `${unsignedToken}.${signature}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    expiresIn: ttlSeconds
  }
}

export function createAuthTokenPair(user, env = process.env) {
  const accessToken = createAuthToken(user, env, { type: 'access' })
  const refreshToken = createAuthToken(user, env, { type: 'refresh' })

  return {
    token: accessToken.token,
    accessToken: accessToken.token,
    access_token: accessToken.token,
    expiresAt: accessToken.expiresAt,
    expires_in: accessToken.expiresIn,
    refreshToken: refreshToken.token,
    refresh_token: refreshToken.token,
    refreshExpiresAt: refreshToken.expiresAt,
    refresh_expires_in: refreshToken.expiresIn,
    token_type: 'Bearer'
  }
}

export function verifyAuthToken(token, env = process.env, options = {}) {
  const [encodedHeader, encodedPayload, signature] = String(token).split('.')

  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error('Malformed authentication token.')
  }

  const secret = getTokenSecret(env)
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const expectedSignature = createSignature(unsignedToken, secret)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    signatureBuffer.length !== expectedBuffer.length
    || !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid authentication token signature.')
  }

  const header = JSON.parse(fromBase64Url(encodedHeader))
  const payload = JSON.parse(fromBase64Url(encodedPayload))

  if (header?.alg !== 'HS256' || header?.typ !== 'JWT') {
    throw new Error('Unsupported authentication token.')
  }

  if (!payload?.exp || Number(payload.exp) <= Math.floor(Date.now() / 1000)) {
    throw new Error('Authentication token has expired.')
  }

  verifyTokenType(payload, options.expectedType)

  return payload
}

export function verifyAuthRefreshToken(token, env = process.env) {
  return verifyAuthToken(token, env, { expectedType: 'refresh' })
}

export function createProtectedApiMiddleware(env = process.env) {
  return (req, res, next) => {
    const requestPath = req.url || ''
    const isSignedThoughtsImageRequest = requestPath.startsWith('/api/thoughts/images/')

    if (
      (
        !requestPath.startsWith('/api/anime')
        && !requestPath.startsWith('/api/notes')
        && !requestPath.startsWith('/api/ai')
        && !requestPath.startsWith('/api/agent')
        && !requestPath.startsWith('/api/internship')
        && !requestPath.startsWith('/api/thoughts')
      )
      || isSignedThoughtsImageRequest
    ) {
      next()
      return
    }

    const token = readBearerToken(req)

    if (!token) {
      writeJson(res, 401, { message: 'Authentication required.' })
      return
    }

    try {
      req.auth = verifyAuthToken(token, env, { expectedType: 'access' })
      next()
    } catch (error) {
      writeJson(res, 401, {
        message: error instanceof Error ? error.message : 'Invalid authentication token.'
      })
    }
  }
}
