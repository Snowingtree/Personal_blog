import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { decryptStoredOpenAiApiKey } from './openAiKeyCrypto.js'

const validOpenAiApiKeyStorageModes = new Set(['env', 'mysql'])
const validOpenAiApiEndpointStyles = new Set(['responses', 'chat_completions'])
const defaultGenerationConfig = Object.freeze({
  temperature: 0.2,
  topP: 1
})

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function parsePositiveInteger(value, fallbackValue) {
  const normalized = normalizeEnvValue(value)

  if (!normalized) {
    return fallbackValue
  }

  const parsed = Number.parseInt(normalized, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallbackValue
}

function isBigModelBaseUrl(baseUrl) {
  return normalizeEnvValue(baseUrl).toLowerCase().includes('bigmodel.cn')
}

function inferOpenAiApiEndpointStyle(baseUrl) {
  return isBigModelBaseUrl(baseUrl) ? 'chat_completions' : 'responses'
}

function resolveOpenAiApiEndpointStyle(env, baseUrl) {
  const explicitStyle = normalizeEnvValue(env.OPENAI_API_ENDPOINT_STYLE).toLowerCase()

  if (!explicitStyle) {
    return inferOpenAiApiEndpointStyle(baseUrl)
  }

  if (!validOpenAiApiEndpointStyles.has(explicitStyle)) {
    throw new Error('OPENAI_API_ENDPOINT_STYLE must be either "responses" or "chat_completions".')
  }

  return explicitStyle
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

function hasMysqlConnectionConfig(env) {
  return ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_DATABASE'].every((key) =>
    normalizeEnvValue(env[key])
  )
}

function getOpenAiKeyMysqlConnectionConfig(env) {
  const sharedConfig = getMysqlConnectionConfig(env)
  const config = {
    host:
      normalizeEnvValue(env.AI_SETTINGS_MYSQL_HOST) ||
      normalizeEnvValue(env.OPENAI_KEY_MYSQL_HOST) ||
      sharedConfig.host,
    port: parseMysqlPort(
      normalizeEnvValue(env.AI_SETTINGS_MYSQL_PORT) ||
        normalizeEnvValue(env.OPENAI_KEY_MYSQL_PORT) ||
        String(sharedConfig.port),
      'OPENAI_KEY_MYSQL_PORT'
    ),
    user:
      normalizeEnvValue(env.AI_SETTINGS_MYSQL_USER) ||
      normalizeEnvValue(env.OPENAI_KEY_MYSQL_USER) ||
      sharedConfig.user,
    password:
      normalizeEnvValue(env.AI_SETTINGS_MYSQL_PASSWORD) ||
      normalizeEnvValue(env.OPENAI_KEY_MYSQL_PASSWORD) ||
      sharedConfig.password,
    database:
      normalizeEnvValue(env.AI_SETTINGS_MYSQL_DATABASE) ||
      normalizeEnvValue(env.OPENAI_KEY_MYSQL_DATABASE) ||
      sharedConfig.database,
    table:
      normalizeEnvValue(env.AI_SETTINGS_MYSQL_TABLE) ||
      normalizeEnvValue(env.OPENAI_KEY_MYSQL_TABLE) ||
      'ai_provider_configs'
  }

  const missingKeys = getRequiredMysqlConfigKeys(config).map(
    (key) => `OPENAI_KEY_MYSQL_${key.toUpperCase()}`
  )

  if (missingKeys.length > 0) {
    throw new Error(`Missing OpenAI key MySQL config: ${missingKeys.join(', ')}`)
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
        'MySQL OpenAI key storage requires the mysql2 package. Run "npm install mysql2" before enabling it.'
      )
    }

    throw error
  }
}

function normalizeStoredApiKey(value, env) {
  const normalized = decryptStoredOpenAiApiKey(value, env)

  if (!normalized) {
    return ''
  }

  if (normalized.length > 4096 || /[\0\r\n\t]/.test(normalized)) {
    return ''
  }

  return normalized
}

function normalizeStoredBaseUrl(value) {
  const normalized = normalizeEnvValue(value)

  if (!normalized) {
    return ''
  }

  return normalized.replace(/\/$/, '')
}

function resolveOpenAiApiKeyStorageMode(env) {
  const explicitMode = normalizeEnvValue(env.OPENAI_API_KEY_STORAGE).toLowerCase()

  if (!explicitMode) {
    return normalizeEnvValue(env.OPENAI_API_KEY) ? 'env' : hasMysqlConnectionConfig(env) ? 'mysql' : 'env'
  }

  if (!validOpenAiApiKeyStorageModes.has(explicitMode)) {
    throw new Error('OPENAI_API_KEY_STORAGE must be either "env" or "mysql".')
  }

  return explicitMode
}

function createEnvOpenAiApiKeyStore(env) {
  return {
    mode: 'env',
    async readApiKeys() {
      const apiKey = normalizeStoredApiKey(env.OPENAI_API_KEY, env)

      if (!apiKey) {
        const error = new Error('OPENAI_API_KEY is not configured on the server.')
        error.statusCode = 500
        throw error
      }

      return [
        {
          id: 'env:OPENAI_API_KEY',
          name: 'OPENAI_API_KEY',
          aiId: 'env:OPENAI_API_KEY',
          baseUrl: normalizeStoredBaseUrl(env.OPENAI_BASE_URL) || 'https://api.openai.com/v1',
          apiKey
        }
      ]
    }
  }
}

function createMysqlOpenAiApiKeyStore(env) {
  const config = getOpenAiKeyMysqlConnectionConfig(env)
  const tableName = quoteIdentifier(config.table, 'OPENAI_KEY_MYSQL_TABLE')
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

  return {
    mode: 'mysql',
    async readApiKeys() {
      return withConnection(async (connection) => {
        let rows = []

        try {
          ;[rows] = await connection.query(
            `SELECT id, ai_name AS name, ai_id AS aiId, ai_base_url AS aiBaseUrl, api_key AS apiKey
             FROM ${tableName}
             ORDER BY updated_at DESC, id DESC`
          )
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !('code' in error) ||
            error.code !== 'ER_BAD_FIELD_ERROR'
          ) {
            throw error
          }

          try {
            ;[rows] = await connection.query(
              `SELECT id, ai_name AS name, ai_id AS aiId, ai_base_url AS aiBaseUrl, token AS apiKey
               FROM ${tableName}
               ORDER BY updated_at DESC, id DESC`
            )
          } catch (legacyError) {
            if (
              !(legacyError instanceof Error) ||
              !('code' in legacyError) ||
              legacyError.code !== 'ER_BAD_FIELD_ERROR'
            ) {
              throw legacyError
            }

            ;[rows] = await connection.query(
              `SELECT id, name, name AS aiId, '' AS aiBaseUrl, api_key AS apiKey
               FROM ${tableName}
               WHERE is_active = 1
               ORDER BY priority ASC, id ASC`
            )
          }
        }

        const apiKeys = rows
          .map((row) => {
            const aiId = normalizeEnvValue(row.aiId) || String(row.id)

            return {
              id: `mysql:${aiId}`,
              name: normalizeEnvValue(row.name) || aiId || `key-${row.id}`,
              aiId,
              baseUrl: normalizeStoredBaseUrl(row.aiBaseUrl),
              apiKey: normalizeStoredApiKey(row.apiKey, env)
            }
          })
          .filter((item) => item.apiKey)

        if (!apiKeys.length) {
          const error = new Error(
            `OPENAI_API_KEY_STORAGE=mysql but no available API keys were found in table ${config.table}.`
          )
          error.statusCode = 500
          throw error
        }

        return apiKeys
      })
    }
  }
}

function normalizeRequestedModel(value) {
  const normalized = normalizeEnvValue(value)

  if (!normalized) {
    return ''
  }

  if (normalized.length > 120 || /[\0\r\n\t]/.test(normalized)) {
    const error = new Error('model must be a single-line string no longer than 120 characters.')
    error.statusCode = 400
    throw error
  }

  return normalized
}

function normalizeRequestedAiId(value) {
  const normalized = normalizeEnvValue(value)

  if (!normalized) {
    return ''
  }

  if (normalized.length > 120 || /[\0\r\n\t]/.test(normalized)) {
    const error = new Error('aiId must be a single-line string no longer than 120 characters.')
    error.statusCode = 400
    throw error
  }

  return normalized
}

function normalizeRequestedNumberInRange(value, fieldName, { min, max, fallbackValue, precision = 2 }) {
  if (value === undefined || value === null || value === '') {
    return fallbackValue
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    const error = new Error(`${fieldName} must be a finite number.`)
    error.statusCode = 400
    throw error
  }

  if (parsed < min || parsed > max) {
    const error = new Error(`${fieldName} must be between ${min} and ${max}.`)
    error.statusCode = 400
    throw error
  }

  return Number(parsed.toFixed(precision))
}

function normalizeRequestedGenerationConfig(value) {
  if (!value || typeof value !== 'object') {
    return { ...defaultGenerationConfig }
  }

  return {
    temperature: normalizeRequestedNumberInRange(value.temperature, 'generationConfig.temperature', {
      min: 0,
      max: 2,
      fallbackValue: defaultGenerationConfig.temperature,
      precision: 1
    }),
    topP: normalizeRequestedNumberInRange(value.topP, 'generationConfig.topP', {
      min: 0.1,
      max: 1,
      fallbackValue: defaultGenerationConfig.topP,
      precision: 2
    })
  }
}

function createOpenAiApiKeyStore(env) {
  return resolveOpenAiApiKeyStorageMode(env) === 'mysql'
    ? createMysqlOpenAiApiKeyStore(env)
    : createEnvOpenAiApiKeyStore(env)
}

function getOpenAiConfig(env, { requestedModel = '', baseUrlOverride = '' } = {}) {
  const baseUrl = normalizeStoredBaseUrl(baseUrlOverride)
  const model = normalizeRequestedModel(requestedModel)

  if (!baseUrl) {
    const error = new Error('AI base URL is required for the selected AI config.')
    error.statusCode = 500
    throw error
  }

  if (!model) {
    const error = new Error('AI model is required for the selected AI config.')
    error.statusCode = 400
    throw error
  }

  return {
    model,
    baseUrl,
    apiEndpointStyle: resolveOpenAiApiEndpointStyle(env, baseUrl),
    timeoutMs: parsePositiveInteger(env.OPENAI_TIMEOUT_MS, 45000),
    chatMaxOutputTokens: parsePositiveInteger(env.OPENAI_CHAT_MAX_OUTPUT_TOKENS, 520)
  }
}

function extractUsageMetrics(responsePayload) {
  const usage = responsePayload?.usage

  return {
    inputTokens: Number.isFinite(usage?.input_tokens)
      ? usage.input_tokens
      : Number.isFinite(usage?.prompt_tokens)
        ? usage.prompt_tokens
        : null,
    outputTokens: Number.isFinite(usage?.output_tokens)
      ? usage.output_tokens
      : Number.isFinite(usage?.completion_tokens)
        ? usage.completion_tokens
        : null,
    totalTokens: Number.isFinite(usage?.total_tokens) ? usage.total_tokens : null
  }
}

function shouldEnableSampling(generationConfig) {
  return generationConfig.temperature > 0 || generationConfig.topP < 1
}

function buildChatCompletionsGenerationOptions({ generationConfig, baseUrl }) {
  if (!isBigModelBaseUrl(baseUrl)) {
    return {
      temperature: generationConfig.temperature,
      top_p: generationConfig.topP
    }
  }

  return {
    temperature: Math.min(Math.max(generationConfig.temperature, 0), 1),
    top_p: Math.min(Math.max(generationConfig.topP, 0), 1),
    do_sample: shouldEnableSampling(generationConfig)
  }
}

function buildResponsesChatRequestBody({ model, systemPrompt, messages, generationConfig, maxOutputTokens }) {
  return {
    model,
    instructions: systemPrompt,
    max_output_tokens: maxOutputTokens,
    temperature: generationConfig.temperature,
    top_p: generationConfig.topP,
    input: messages.map((item) => ({
      role: item.role,
      content: [
        {
          type: 'input_text',
          text: item.content
        }
      ]
    }))
  }
}

function buildChatCompletionsConversationRequestBody({
  model,
  systemPrompt,
  messages,
  generationConfig,
  maxOutputTokens,
  baseUrl
}) {
  return {
    model,
    ...buildChatCompletionsGenerationOptions({
      generationConfig,
      baseUrl
    }),
    max_tokens: maxOutputTokens,
    thinking: {
      type: 'disabled'
    },
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      ...messages.map((item) => ({
        role: item.role,
        content: item.content
      }))
    ]
  }
}

function extractResponseText(responsePayload) {
  if (!Array.isArray(responsePayload?.output)) {
    const error = new Error('OpenAI did not return any output content.')
    error.statusCode = 502
    throw error
  }

  const chunks = []

  responsePayload.output.forEach((item) => {
    if (item?.type !== 'message' || !Array.isArray(item.content)) {
      return
    }

    item.content.forEach((contentItem) => {
      if (contentItem?.type === 'output_text' && typeof contentItem.text === 'string') {
        chunks.push(contentItem.text)
      }
    })
  })

  const outputText = chunks.join('').trim()

  if (!outputText) {
    const error = new Error('OpenAI returned an empty text response.')
    error.statusCode = 502
    throw error
  }

  return outputText
}

function previewAiPayload(value, maxLength = 600) {
  if (!value) {
    return ''
  }

  const serialized =
    typeof value === 'string'
      ? value
      : (() => {
          try {
            return JSON.stringify(value)
          } catch {
            return ''
          }
        })()

  return serialized.length > maxLength ? `${serialized.slice(0, maxLength)}...` : serialized
}

function extractTextFromMessageContent(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (!value || typeof value !== 'object') {
    return ''
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractTextFromMessageContent(item))
      .join('')
      .trim()
  }

  if (typeof value.text === 'string' && value.text.trim()) {
    return value.text.trim()
  }

  if (typeof value.content === 'string' && value.content.trim()) {
    return value.content.trim()
  }

  if (typeof value.value === 'string' && value.value.trim()) {
    return value.value.trim()
  }

  return previewAiPayload(value)
}

function extractChatCompletionsText(responsePayload) {
  const firstChoice = responsePayload?.choices?.[0]
  const message = firstChoice?.message
  const candidateValues = [
    message?.content,
    message?.tool_calls?.[0]?.function?.arguments,
    message?.function_call?.arguments,
    firstChoice?.text,
    responsePayload?.data?.content
  ]

  for (const candidateValue of candidateValues) {
    const contentText = extractTextFromMessageContent(candidateValue)

    if (contentText) {
      return contentText
    }
  }

  const error = new Error('AI provider did not return any text content.')
  error.statusCode = 502
  error.responsePreview = previewAiPayload({
    id: responsePayload?.id ?? null,
    model: responsePayload?.model ?? null,
    choices: responsePayload?.choices ?? null
  })
  throw error
}

function createAiRequestError(message, { retryable = true } = {}) {
  const error = new Error(message)
  error.statusCode = 502
  error.retryable = retryable
  return error
}

function createAiRequestTimeoutError() {
  return createAiRequestError('AI request timed out.')
}

async function postJsonWithNodeRequest(url, { body, headers, timeoutMs }) {
  const transport = url.protocol === 'https:' ? httpsRequest : httpRequest

  return new Promise((resolve, reject) => {
    const req = transport(
      url,
      {
        method: 'POST',
        headers
      },
      (res) => {
        const chunks = []

        res.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })

        res.on('end', () => {
          const rawText = Buffer.concat(chunks).toString('utf8').trim()
          let payload = {}

          if (rawText) {
            try {
              payload = JSON.parse(rawText)
            } catch {
              payload = {}
            }
          }

          resolve({
            ok: Number(res.statusCode) >= 200 && Number(res.statusCode) < 300,
            status: Number(res.statusCode) || 500,
            payload,
            rawText
          })
        })

        res.on('error', (error) => {
          reject(createAiRequestError(error instanceof Error ? error.message : 'AI request failed.'))
        })
      }
    )

    req.on('error', (error) => {
      reject(createAiRequestError(error instanceof Error ? error.message : 'AI request failed.'))
    })

    req.setTimeout(timeoutMs, () => {
      req.destroy(createAiRequestTimeoutError())
    })

    req.write(body)
    req.end()
  })
}

async function postAiProviderJson(urlString, { body, apiKey, timeoutMs }) {
  const url = new URL(urlString)
  const requestBody = JSON.stringify(body)
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'Content-Length': Buffer.byteLength(requestBody).toString()
  }

  if (typeof fetch === 'function') {
    let response

    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: requestBody,
        signal: AbortSignal.timeout(timeoutMs)
      })
    } catch (error) {
      throw createAiRequestError(
        error instanceof Error && error.name === 'TimeoutError'
          ? 'AI request timed out.'
          : error instanceof Error
            ? error.message
            : 'AI request failed.'
      )
    }

    const rawText = await response.text().catch(() => '')
    let payload = {}

    if (rawText) {
      try {
        payload = JSON.parse(rawText)
      } catch {
        payload = {}
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      payload,
      rawText
    }
  }

  return postJsonWithNodeRequest(url, {
    body: requestBody,
    headers,
    timeoutMs
  })
}

export {
  buildChatCompletionsConversationRequestBody,
  buildResponsesChatRequestBody,
  createOpenAiApiKeyStore,
  extractChatCompletionsText,
  extractResponseText,
  extractUsageMetrics,
  getOpenAiConfig,
  normalizeRequestedAiId,
  normalizeRequestedGenerationConfig,
  normalizeRequestedModel,
  postAiProviderJson
}
