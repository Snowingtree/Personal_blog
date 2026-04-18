import { decryptStoredOpenAiApiKey, encryptOpenAiApiKey } from './openAiKeyCrypto.js'
import { randomUUID } from 'node:crypto'

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseMysqlPort(value, envKey) {
  const normalized = normalizeEnvValue(value)

  if (!normalized) {
    return 3306
  }

  const port = Number(normalized)

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`${envKey} must be a positive integer.`)
  }

  return port
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
    port: parseMysqlPort(env.MYSQL_PORT, 'MYSQL_PORT'),
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

function getAiSettingsMysqlConfig(env) {
  const sharedConfig = getMysqlConnectionConfig(env)
  const config = {
    host: normalizeEnvValue(env.AI_SETTINGS_MYSQL_HOST) || sharedConfig.host,
    port: parseMysqlPort(
      normalizeEnvValue(env.AI_SETTINGS_MYSQL_PORT) || String(sharedConfig.port),
      'AI_SETTINGS_MYSQL_PORT'
    ),
    user: normalizeEnvValue(env.AI_SETTINGS_MYSQL_USER) || sharedConfig.user,
    password: normalizeEnvValue(env.AI_SETTINGS_MYSQL_PASSWORD) || sharedConfig.password,
    database: normalizeEnvValue(env.AI_SETTINGS_MYSQL_DATABASE) || sharedConfig.database,
    table: normalizeEnvValue(env.AI_SETTINGS_MYSQL_TABLE) || 'ai_provider_configs'
  }

  const missingKeys = getRequiredMysqlConfigKeys(config).map(
    (key) => `AI_SETTINGS_MYSQL_${key.toUpperCase()}`
  )

  if (missingKeys.length > 0) {
    throw new Error(`Missing AI settings MySQL config: ${missingKeys.join(', ')}`)
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
        'AI settings storage requires the mysql2 package. Run "npm install mysql2" before enabling it.'
      )
    }

    throw error
  }
}

function hasEncryptionSecret(env) {
  return Boolean(normalizeEnvValue(env.OPENAI_KEY_ENCRYPTION_SECRET))
}

function validateSingleLineValue(value, fieldName, maxLength) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    const error = new Error(`${fieldName} is required.`)
    error.statusCode = 400
    throw error
  }

  if (normalized.length > maxLength || /[\0\r\n\t]/.test(normalized)) {
    const error = new Error(
      `${fieldName} must be a single-line string no longer than ${maxLength} characters.`
    )
    error.statusCode = 400
    throw error
  }

  return normalized
}

function generateAiId() {
  return `ai_${randomUUID().replace(/-/g, '').slice(0, 20)}`
}

function validateApiKey(value, { allowEmpty = false } = {}) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    if (allowEmpty) {
      return ''
    }

    const error = new Error('API_KEY is required.')
    error.statusCode = 400
    throw error
  }

  if (normalized.length > 4096 || /[\0\r\n\t]/.test(normalized)) {
    const error = new Error(
      'API_KEY must be a single-line string no longer than 4096 characters.'
    )
    error.statusCode = 400
    throw error
  }

  return normalized
}

function validateAiVersions(value, { allowEmpty = false } = {}) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    if (allowEmpty) {
      return ''
    }

    const error = new Error('AI versions are required.')
    error.statusCode = 400
    throw error
  }

  if (normalized.length > 1000 || /[\0\r\n\t]/.test(normalized)) {
    const error = new Error(
      'AI versions must be a single-line comma-separated string no longer than 1000 characters.'
    )
    error.statusCode = 400
    throw error
  }

  return normalized
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(', ')
}

function validateAiBaseUrl(value, { allowEmpty = false } = {}) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    if (allowEmpty) {
      return ''
    }

    const error = new Error('AI base URL is required.')
    error.statusCode = 400
    throw error
  }

  if (normalized.length > 2048 || /[\0\r\n\t]/.test(normalized)) {
    const error = new Error(
      'AI base URL must be a single-line URL no longer than 2048 characters.'
    )
    error.statusCode = 400
    throw error
  }

  let parsedUrl

  try {
    parsedUrl = new URL(normalized)
  } catch {
    const error = new Error('AI base URL must be a valid http(s) URL.')
    error.statusCode = 400
    throw error
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    const error = new Error('AI base URL must start with http:// or https://.')
    error.statusCode = 400
    throw error
  }

  return normalized.replace(/\/$/, '')
}

function maskApiKey(value) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    return ''
  }

  if (normalized.length <= 7) {
    return '******'
  }

  return `${normalized.slice(0, 3)}******${normalized.slice(-4)}`
}

function serializeConfigRow(row, env) {
  const rawApiKey = decryptStoredOpenAiApiKey(row.apiKey, env)

  return {
    configId: Number(row.id),
    name: String(row.aiName ?? ''),
    aiId: String(row.aiId ?? ''),
    aiVersions: String(row.aiVersions ?? ''),
    aiBaseUrl: String(row.aiBaseUrl ?? '').trim(),
    apiKeyPreview: maskApiKey(rawApiKey),
    hasApiKey: Boolean(rawApiKey),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? ''),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt ?? '')
  }
}

function normalizeStoredApiKey(value, env) {
  return hasEncryptionSecret(env) ? encryptOpenAiApiKey(value, env) : value
}

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
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
    const error = new Error('Request body must be valid JSON.')
    error.statusCode = 400
    throw error
  }
}

function getErrorStatusCode(error) {
  if (!(error instanceof Error)) {
    return 500
  }

  if ('statusCode' in error && Number.isInteger(error.statusCode)) {
    return error.statusCode
  }

  if ('code' in error && error.code === 'ER_DUP_ENTRY') {
    return 409
  }

  return 500
}

export function createAiSettingsApiMiddleware(env = process.env) {
  const config = getAiSettingsMysqlConfig(env)
  const tableName = quoteIdentifier(config.table, 'AI_SETTINGS_MYSQL_TABLE')
  let poolPromise = null

  async function hasColumn(connection, columnName) {
    const [rows] = await connection.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName])
    return Array.isArray(rows) && rows.length > 0
  }

  async function ensureTable(connection) {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS ${tableName} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ai_name VARCHAR(120) NOT NULL,
        ai_id VARCHAR(120) NOT NULL,
        ai_versions VARCHAR(1000) NOT NULL DEFAULT '',
        ai_base_url VARCHAR(2048) NOT NULL DEFAULT '',
        api_key TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_ai_id (ai_id),
        KEY idx_ai_name (ai_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    )

    const [hasApiVersionsColumn, hasAiBaseUrlColumn, hasApiKeyColumn, hasLegacyTokenColumn] = await Promise.all([
      hasColumn(connection, 'ai_versions'),
      hasColumn(connection, 'ai_base_url'),
      hasColumn(connection, 'api_key'),
      hasColumn(connection, 'token')
    ])

    if (!hasApiVersionsColumn) {
      await connection.query(
        `ALTER TABLE ${tableName} ADD COLUMN ai_versions VARCHAR(1000) NOT NULL DEFAULT '' AFTER ai_id`
      )
    }

    if (!hasAiBaseUrlColumn) {
      await connection.query(
        `ALTER TABLE ${tableName} ADD COLUMN ai_base_url VARCHAR(2048) NOT NULL DEFAULT '' AFTER ai_versions`
      )
    }

    if (!hasApiKeyColumn && hasLegacyTokenColumn) {
      await connection.query(
        `ALTER TABLE ${tableName} CHANGE COLUMN token api_key TEXT NOT NULL`
      )
    }
  }

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

  async function withConnection(handler) {
    const pool = await getPool()
    const connection = await pool.getConnection()

    try {
      await ensureTable(connection)
      return await handler(connection)
    } finally {
      connection.release()
    }
  }

  async function listConfigs(connection) {
    const [rows] = await connection.query(
      `SELECT
        id,
        ai_name AS aiName,
        ai_id AS aiId,
        ai_versions AS aiVersions,
        ai_base_url AS aiBaseUrl,
        api_key AS apiKey,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM ${tableName}
      ORDER BY updated_at DESC, id DESC`
    )

    return Array.isArray(rows) ? rows.map((row) => serializeConfigRow(row, env)) : []
  }

  async function readConfigById(connection, configId) {
    const [rows] = await connection.query(
      `SELECT
        id,
        ai_name AS aiName,
        ai_id AS aiId,
        ai_versions AS aiVersions,
        ai_base_url AS aiBaseUrl,
        api_key AS apiKey,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM ${tableName}
      WHERE id = ?
      LIMIT 1`,
      [configId]
    )

    const row = Array.isArray(rows) ? rows[0] : null

    if (!row) {
      const error = new Error('AI config was not found.')
      error.statusCode = 404
      throw error
    }

    return serializeConfigRow(row, env)
  }

  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/ai/configs')) {
      next()
      return
    }

    const requestUrl = new URL(req.url, 'http://127.0.0.1')
    const pathnameMatch = requestUrl.pathname.match(/^\/api\/ai\/configs(?:\/(\d+))?$/)

    if (!pathnameMatch) {
      writeJson(res, 404, { message: 'Not found' })
      return
    }

    const configId = pathnameMatch[1] ? Number.parseInt(pathnameMatch[1], 10) : null

    try {
      if (requestUrl.pathname === '/api/ai/configs' && req.method === 'GET') {
        const items = await withConnection((connection) => listConfigs(connection))
        writeJson(res, 200, { items })
        return
      }

      if (requestUrl.pathname === '/api/ai/configs' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const name = validateSingleLineValue(body.name, 'name', 120)
        const aiId = generateAiId()
        const aiVersions = validateAiVersions(body.aiVersions)
        const aiBaseUrl = validateAiBaseUrl(body.aiBaseUrl ?? body.baseUrl)
        const apiKey = validateApiKey(body.apiKey ?? body.token)

        const item = await withConnection(async (connection) => {
          const [result] = await connection.query(
            `INSERT INTO ${tableName} (ai_name, ai_id, ai_versions, ai_base_url, api_key) VALUES (?, ?, ?, ?, ?)`,
            [name, aiId, aiVersions, aiBaseUrl, normalizeStoredApiKey(apiKey, env)]
          )

          return readConfigById(connection, result.insertId)
        })

        writeJson(res, 200, { ok: true, item })
        return
      }

      if (configId !== null && req.method === 'PUT') {
        const body = await readJsonBody(req)
        const name = validateSingleLineValue(body.name, 'name', 120)
        const aiVersions = validateAiVersions(body.aiVersions, { allowEmpty: true })
        const aiBaseUrl = validateAiBaseUrl(body.aiBaseUrl ?? body.baseUrl)
        const apiKey = validateApiKey(body.apiKey ?? body.token, { allowEmpty: true })

        const item = await withConnection(async (connection) => {
          const updates = ['ai_name = ?', 'ai_versions = ?', 'ai_base_url = ?']
          const values = [name, aiVersions, aiBaseUrl]

          if (apiKey) {
            updates.push('api_key = ?')
            values.push(normalizeStoredApiKey(apiKey, env))
          }

          values.push(configId)

          const [result] = await connection.query(
            `UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = ?`,
            values
          )

          if (!result?.affectedRows) {
            const error = new Error('AI config was not found.')
            error.statusCode = 404
            throw error
          }

          return readConfigById(connection, configId)
        })

        writeJson(res, 200, { ok: true, item })
        return
      }

      if (configId !== null && req.method === 'DELETE') {
        await withConnection(async (connection) => {
          const [result] = await connection.query(`DELETE FROM ${tableName} WHERE id = ?`, [configId])

          if (!result?.affectedRows) {
            const error = new Error('AI config was not found.')
            error.statusCode = 404
            throw error
          }
        })

        writeJson(res, 200, { ok: true })
        return
      }

      writeJson(res, 405, { message: 'Method not allowed' })
    } catch (error) {
      writeJson(res, getErrorStatusCode(error), {
        message:
          error instanceof Error && 'code' in error && error.code === 'ER_DUP_ENTRY'
            ? 'AI ID already exists.'
            : error instanceof Error
              ? error.message
              : 'Unknown server error'
      })
    }
  }
}
