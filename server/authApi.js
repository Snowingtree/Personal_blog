import bcrypt from 'bcryptjs'
import { createAuthTokenPair, verifyAuthRefreshToken } from './authToken.js'

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseMysqlPort(value) {
  const normalized = normalizeEnvValue(value)

  if (!normalized) {
    return 3306
  }

  const port = Number(normalized)

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('MYSQL_PORT must be a positive integer.')
  }

  return port
}

function parsePositiveInteger(value, fallbackValue, envKey) {
  const normalized = normalizeEnvValue(value)

  if (!normalized) {
    return fallbackValue
  }

  const parsedValue = Number(normalized)

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${envKey} must be a positive integer.`)
  }

  return parsedValue
}

function getLoginRateLimitConfig(env) {
  return {
    ipMaxAttempts: parsePositiveInteger(
      env.AUTH_LOGIN_RATE_LIMIT_IP_MAX_ATTEMPTS,
      12,
      'AUTH_LOGIN_RATE_LIMIT_IP_MAX_ATTEMPTS'
    ),
    accountMaxAttempts: parsePositiveInteger(
      env.AUTH_LOGIN_RATE_LIMIT_ACCOUNT_MAX_ATTEMPTS,
      5,
      'AUTH_LOGIN_RATE_LIMIT_ACCOUNT_MAX_ATTEMPTS'
    ),
    windowMs:
      parsePositiveInteger(
        env.AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS,
        600,
        'AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS'
      ) * 1000,
    blockMs:
      parsePositiveInteger(
        env.AUTH_LOGIN_RATE_LIMIT_BLOCK_SECONDS,
        900,
        'AUTH_LOGIN_RATE_LIMIT_BLOCK_SECONDS'
      ) * 1000
  }
}

function quoteIdentifier(value, envKey) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`${envKey} may only contain letters, numbers, and underscores.`)
  }

  return `\`${value}\``
}

function getRequiredMysqlConfigKeys(config) {
  return Object.entries({
    host: config.host,
    user: config.user,
    database: config.database
  })
    .filter(([, value]) => !value)
    .map(([key]) => key)
}

function getMysqlConnectionConfig(env) {
  const config = {
    host: normalizeEnvValue(env.MYSQL_HOST),
    port: parseMysqlPort(env.MYSQL_PORT),
    user: normalizeEnvValue(env.MYSQL_USER),
    password: normalizeEnvValue(env.MYSQL_PASSWORD),
    database: normalizeEnvValue(env.MYSQL_DATABASE)
  }

  const missingKeys = getRequiredMysqlConfigKeys(config).map((key) => `MYSQL_${key.toUpperCase()}`)

  if (missingKeys.length > 0) {
    throw new Error(`Missing MySQL config: ${missingKeys.join(', ')}`)
  }

  return config
}

function getAuthMysqlConnectionConfig(env) {
  const sharedConfig = getMysqlConnectionConfig(env)
  const config = {
    host: normalizeEnvValue(env.AUTH_MYSQL_HOST) || sharedConfig.host,
    port: parseMysqlPort(normalizeEnvValue(env.AUTH_MYSQL_PORT) || String(sharedConfig.port)),
    user: normalizeEnvValue(env.AUTH_MYSQL_USER) || sharedConfig.user,
    password: normalizeEnvValue(env.AUTH_MYSQL_PASSWORD) || sharedConfig.password,
    database: normalizeEnvValue(env.AUTH_MYSQL_DATABASE) || sharedConfig.database
  }

  const missingKeys = getRequiredMysqlConfigKeys(config).map(
    (key) => `AUTH_MYSQL_${key.toUpperCase()}`
  )

  if (missingKeys.length > 0) {
    throw new Error(`Missing auth MySQL config: ${missingKeys.join(', ')}`)
  }

  return config
}

async function loadMysqlLibrary() {
  try {
    const mysqlModule = await import('mysql2/promise')
    return mysqlModule.default ?? mysqlModule
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('mysql2') ||
        error.message.includes('Cannot find package') ||
        error.message.includes('Cannot find module'))
    ) {
      throw new Error(
        'MySQL auth requires the mysql2 package. Run "npm install mysql2" before enabling MySQL auth.'
      )
    }

    throw error
  }
}

function getAuthConfig(env) {
  return {
    ...getAuthMysqlConnectionConfig(env),
    table: normalizeEnvValue(env.AUTH_USER_TABLE) || 'users',
    idColumn: normalizeEnvValue(env.AUTH_USER_ID_COLUMN) || 'id',
    usernameColumn: normalizeEnvValue(env.AUTH_USERNAME_COLUMN) || 'username',
    passwordColumn: normalizeEnvValue(env.AUTH_PASSWORD_COLUMN) || 'password'
  }
}

function normalizeStoredPasswordHash(value) {
  if (typeof value !== 'string') {
    return ''
  }

  const normalized = value.trim()

  if (normalized.startsWith('$2y$') || normalized.startsWith('$2x$')) {
    return `$2b$${normalized.slice(4)}`
  }

  return normalized
}

function normalizeClientIp(value) {
  const normalized = normalizeEnvValue(value)

  if (!normalized) {
    return 'unknown'
  }

  if (normalized === '::1') {
    return '127.0.0.1'
  }

  if (normalized.startsWith('::ffff:')) {
    return normalized.slice(7)
  }

  return normalized
}

function getClientIp(req) {
  const forwardedHeader = req.headers['x-forwarded-for']
  const forwardedValue = Array.isArray(forwardedHeader) ? forwardedHeader[0] : forwardedHeader

  if (typeof forwardedValue === 'string' && forwardedValue.trim()) {
    return normalizeClientIp(forwardedValue.split(',')[0])
  }

  return normalizeClientIp(req.socket?.remoteAddress)
}

function normalizeLoginIdentifier(value) {
  return String(value ?? '').trim().toLowerCase()
}

function createRateLimitEntry(now) {
  return {
    count: 0,
    windowStartedAt: now,
    blockedUntil: 0
  }
}

function readRateLimitEntry(store, key, now, windowMs) {
  const entry = store.get(key)

  if (!entry) {
    return null
  }

  if (entry.blockedUntil > now) {
    return entry
  }

  if (entry.blockedUntil > 0 || now - entry.windowStartedAt >= windowMs) {
    store.delete(key)
    return null
  }

  return entry
}

function registerRateLimitFailure(store, key, now, maxAttempts, windowMs, blockMs) {
  const entry = readRateLimitEntry(store, key, now, windowMs) || createRateLimitEntry(now)
  entry.count += 1

  if (entry.count >= maxAttempts) {
    entry.blockedUntil = now + blockMs
  }

  store.set(key, entry)
  return entry
}

function clearRateLimitEntry(store, key) {
  store.delete(key)
}

function pruneRateLimitStore(store, now, retentionMs) {
  if (store.size < 500) {
    return
  }

  store.forEach((entry, key) => {
    const lastRelevantTimestamp = Math.max(entry.windowStartedAt, entry.blockedUntil || 0)

    if (lastRelevantTimestamp + retentionMs <= now) {
      store.delete(key)
    }
  })
}

function getRetryAfterSeconds(entry, now) {
  return Math.max(1, Math.ceil((entry.blockedUntil - now) / 1000))
}

function writeRateLimitExceeded(res, retryAfterSeconds) {
  res.setHeader('Retry-After', String(retryAfterSeconds))
  writeJson(res, 429, {
    message: 'Too many login attempts. Please try again later.',
    retryAfterSeconds
  })
}

async function readJsonBody(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim()

  if (!rawBody) {
    return {}
  }

  try {
    return JSON.parse(rawBody)
  } catch {
    throw new Error('Request body must be valid JSON.')
  }
}

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function readRefreshTokenFromBody(body) {
  const refreshToken =
    typeof body?.refreshToken === 'string'
      ? body.refreshToken
      : typeof body?.refresh_token === 'string'
        ? body.refresh_token
        : ''

  return refreshToken.trim()
}

export function createAuthApiMiddleware(env = process.env) {
  const config = getAuthConfig(env)
  const loginRateLimitConfig = getLoginRateLimitConfig(env)
  const userTable = quoteIdentifier(config.table, 'AUTH_USER_TABLE')
  const idColumn = quoteIdentifier(config.idColumn, 'AUTH_USER_ID_COLUMN')
  const usernameColumn = quoteIdentifier(config.usernameColumn, 'AUTH_USERNAME_COLUMN')
  const passwordColumn = quoteIdentifier(config.passwordColumn, 'AUTH_PASSWORD_COLUMN')
  let poolPromise = null
  const loginRateLimitStore = new Map()

  async function getPool() {
    if (!poolPromise) {
      poolPromise = loadMysqlLibrary().then((mysql) =>
        mysql.createPool({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          database: config.database,
          connectionLimit: 10,
          waitForConnections: true,
          charset: 'utf8mb4'
        })
      )
    }

    return poolPromise
  }

  async function findUserByUsername(username) {
    const pool = await getPool()
    const [rows] = await pool.query(
      `SELECT ${idColumn} AS id, ${usernameColumn} AS username, ${passwordColumn} AS password
       FROM ${userTable}
       WHERE ${usernameColumn} = ?
       LIMIT 1`,
      [username]
    )

    return Array.isArray(rows) ? rows[0] : null
  }

  async function handleRefreshTokenRequest(body, res) {
    const refreshToken = readRefreshTokenFromBody(body)

    if (!refreshToken) {
      writeJson(res, 401, { message: 'Refresh token is required.' })
      return
    }

    let refreshPayload = null

    try {
      refreshPayload = verifyAuthRefreshToken(refreshToken, env)
    } catch (error) {
      writeJson(res, 401, {
        message: error instanceof Error ? error.message : 'Invalid or expired refresh token.'
      })
      return
    }

    const refreshUsername =
      typeof refreshPayload?.username === 'string' ? refreshPayload.username.trim() : ''

    if (!refreshUsername) {
      writeJson(res, 401, { message: 'Invalid or expired refresh token.' })
      return
    }

    const user = await findUserByUsername(refreshUsername)

    if (!user || typeof user.username !== 'string') {
      writeJson(res, 401, { message: 'Invalid or expired refresh token.' })
      return
    }

    const userPayload = {
      id: user.id ?? null,
      username: String(user.username ?? refreshUsername)
    }

    writeJson(res, 200, {
      ok: true,
      ...createAuthTokenPair(userPayload, env),
      user: userPayload
    })
  }

  return async (req, res, next) => {
    const requestPath = new URL(req.url || '/', 'http://127.0.0.1').pathname
    const isLoginRequest = requestPath === '/api/login'

    if (!isLoginRequest) {
      next()
      return
    }

    if (req.method !== 'POST') {
      writeJson(res, 405, { message: 'Method not allowed' })
      return
    }

    try {
      const body = await readJsonBody(req)

      if (readRefreshTokenFromBody(body)) {
        await handleRefreshTokenRequest(body, res)
        return
      }

      const submittedUsername = typeof body.username === 'string' ? body.username.trim() : ''
      const password = typeof body.password === 'string' ? body.password : ''

      if (!submittedUsername || !password) {
        writeJson(res, 400, { message: 'username and password are required' })
        return
      }

      const username = submittedUsername

      const now = Date.now()
      const clientIp = getClientIp(req)
      const normalizedUsername = normalizeLoginIdentifier(username)
      const ipRateLimitKey = `login:ip:${clientIp}`
      const accountRateLimitKey = `login:account:${clientIp}:${normalizedUsername}`

      pruneRateLimitStore(
        loginRateLimitStore,
        now,
        Math.max(loginRateLimitConfig.windowMs, loginRateLimitConfig.blockMs) * 2
      )

      const activeRateLimitEntry =
        readRateLimitEntry(
          loginRateLimitStore,
          accountRateLimitKey,
          now,
          loginRateLimitConfig.windowMs
        ) ||
        readRateLimitEntry(
          loginRateLimitStore,
          ipRateLimitKey,
          now,
          loginRateLimitConfig.windowMs
        )

      if (activeRateLimitEntry?.blockedUntil > now) {
        writeRateLimitExceeded(res, getRetryAfterSeconds(activeRateLimitEntry, now))
        return
      }

      const user = await findUserByUsername(username)

      if (!user || typeof user.password !== 'string') {
        const ipEntry = registerRateLimitFailure(
          loginRateLimitStore,
          ipRateLimitKey,
          now,
          loginRateLimitConfig.ipMaxAttempts,
          loginRateLimitConfig.windowMs,
          loginRateLimitConfig.blockMs
        )
        const accountEntry = registerRateLimitFailure(
          loginRateLimitStore,
          accountRateLimitKey,
          now,
          loginRateLimitConfig.accountMaxAttempts,
          loginRateLimitConfig.windowMs,
          loginRateLimitConfig.blockMs
        )

        console.warn('[auth] user not found', {
          database: config.database,
          table: config.table,
          username
        })

        if (accountEntry.blockedUntil > now || ipEntry.blockedUntil > now) {
          writeRateLimitExceeded(
            res,
            getRetryAfterSeconds(
              accountEntry.blockedUntil > now ? accountEntry : ipEntry,
              now
            )
          )
          return
        }

        writeJson(res, 401, { message: 'Invalid username or password' })
        return
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        normalizeStoredPasswordHash(user.password)
      )

      if (!isPasswordValid) {
        const ipEntry = registerRateLimitFailure(
          loginRateLimitStore,
          ipRateLimitKey,
          now,
          loginRateLimitConfig.ipMaxAttempts,
          loginRateLimitConfig.windowMs,
          loginRateLimitConfig.blockMs
        )
        const accountEntry = registerRateLimitFailure(
          loginRateLimitStore,
          accountRateLimitKey,
          now,
          loginRateLimitConfig.accountMaxAttempts,
          loginRateLimitConfig.windowMs,
          loginRateLimitConfig.blockMs
        )

        console.warn('[auth] password mismatch', {
          database: config.database,
          table: config.table,
          username
        })

        if (accountEntry.blockedUntil > now || ipEntry.blockedUntil > now) {
          writeRateLimitExceeded(
            res,
            getRetryAfterSeconds(
              accountEntry.blockedUntil > now ? accountEntry : ipEntry,
              now
            )
          )
          return
        }

        writeJson(res, 401, { message: 'Invalid username or password' })
        return
      }

      clearRateLimitEntry(loginRateLimitStore, accountRateLimitKey)

      const userPayload = {
        id: user.id ?? null,
        username: String(user.username ?? username)
      }

      writeJson(res, 200, {
        ok: true,
        ...createAuthTokenPair(userPayload, env),
        user: userPayload
      })
    } catch (error) {
      const statusCode = Number(error?.statusCode || 500)
      const safeStatusCode = Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600
        ? statusCode
        : 500

      console.error('[auth] login failed', {
        message: error instanceof Error ? error.message : 'Unknown server error',
        stack: error instanceof Error ? error.stack : undefined
      })

      writeJson(res, safeStatusCode, {
        message: safeStatusCode >= 500
          ? 'Authentication service is temporarily unavailable.'
          : error instanceof Error
            ? error.message
            : 'Authentication failed.'
      })
    }
  }
}
