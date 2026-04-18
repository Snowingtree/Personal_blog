import { randomInt } from 'node:crypto'
import { appendFile, mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { basename, extname, posix, relative, resolve } from 'node:path'
import { decryptStoredOpenAiApiKey } from './openAiKeyCrypto.js'

const markdownExtensions = new Set(['.md', '.markdown'])
const validOpenAiApiKeyStorageModes = new Set(['env', 'mysql'])
const validOpenAiApiEndpointStyles = new Set(['responses', 'chat_completions'])
const memoryFileName = '背过.md'
const defaultGenerationConfig = Object.freeze({
  temperature: 0.2,
  topP: 1
})
const promptTemplateFiles = {
  notesQuizChatCompletionsSystem: new URL('./prompts/notes-quiz-chat-completions-system.txt', import.meta.url),
  notesQuizResponsesInstructions: new URL('./prompts/notes-quiz-responses-instructions.txt', import.meta.url),
  notesQuizUser: new URL('./prompts/notes-quiz-user.txt', import.meta.url),
  notesChatSystem: new URL('./prompts/notes-chat-system.txt', import.meta.url)
}
const quizHistoryDirPath = resolve(process.cwd(), 'storage', 'ai', 'quiz-history')
const defaultQuizHistoryTimeZone = 'Asia/Shanghai'
const defaultQuizHistoryPromptLimit = 12

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

async function loadPromptTemplate(templateKey) {
  const templateFile = promptTemplateFiles[templateKey]

  if (!templateFile) {
    throw new Error(`Unknown prompt template: ${templateKey}`)
  }

  const template = (await readFile(templateFile, 'utf8')).replace(/\r\n/g, '\n').trim()

  if (!template) {
    throw new Error(`Prompt template is empty: ${templateKey}`)
  }

  return template
}

function renderPromptTemplate(template, variables) {
  return template.replace(/{{\s*([A-Za-z0-9_]+)\s*}}/g, (_, key) => {
    if (!Object.prototype.hasOwnProperty.call(variables, key)) {
      throw new Error(`Prompt template variable is missing: ${key}`)
    }

    return String(variables[key] ?? '')
  })
}

function toPosixPath(value) {
  return value.replace(/\\/g, '/')
}

function parsePositiveInteger(value, fallbackValue) {
  const normalized = normalizeEnvValue(value)

  if (!normalized) {
    return fallbackValue
  }

  const parsed = Number.parseInt(normalized, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallbackValue
}

function getQuizHistoryTimeZone(env) {
  const timeZone = normalizeEnvValue(env.OPENAI_QUIZ_HISTORY_TIME_ZONE) || defaultQuizHistoryTimeZone

  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
  } catch {
    throw new Error('OPENAI_QUIZ_HISTORY_TIME_ZONE must be a valid IANA time zone.')
  }

  return timeZone
}

function formatDateKey(value, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = formatter
    .formatToParts(value)
    .filter((part) => part.type !== 'literal')
    .reduce((result, part) => {
      result[part.type] = part.value
      return result
    }, {})

  return `${parts.year}-${parts.month}-${parts.day}`
}

function getQuizHistoryPromptLimit(env) {
  return parsePositiveInteger(env.OPENAI_QUIZ_HISTORY_PROMPT_LIMIT, defaultQuizHistoryPromptLimit)
}

function getDailyQuizHistoryFilePath(dateKey) {
  return resolve(quizHistoryDirPath, `${dateKey}.jsonl`)
}

function normalizeQuizHistoryDateKey(value, { allowEmpty = true } = {}) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    if (allowEmpty) {
      return ''
    }

    const error = new Error('date is required.')
    error.statusCode = 400
    throw error
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const error = new Error('date must use YYYY-MM-DD format.')
    error.statusCode = 400
    throw error
  }

  return normalized
}

function normalizeOptionalRequestedPath(value, fieldName = 'currentPath') {
  const normalized = toPosixPath(String(value ?? '').trim()).replace(/^\/+/, '')

  if (!normalized) {
    return ''
  }

  if (normalized.includes('\0')) {
    const error = new Error(`${fieldName} must be a valid path.`)
    error.statusCode = 400
    throw error
  }

  return normalized
}

function normalizeQuizHistoryQuestion(value) {
  const prompt = String(value?.prompt || '').trim()

  if (!prompt) {
    return null
  }

  return {
    prompt
  }
}

function normalizeQuizHistoryEntry(value) {
  const question = normalizeQuizHistoryQuestion(value)

  if (!question) {
    return null
  }

  return {
    ...question,
    createdAt: String(value?.createdAt || '').trim()
  }
}

function buildQuizQuestionComparisonText(value) {
  const normalized = normalizeQuizHistoryQuestion(value)

  if (!normalized) {
    return ''
  }

  return normalized.prompt
}

function createQuizQuestionFingerprint(value) {
  return normalizeComparableText(buildQuizQuestionComparisonText(value)).slice(0, 512)
}

function buildQuizHistoryDedupKey(value) {
  const fingerprint = createQuizQuestionFingerprint(value)

  if (fingerprint) {
    return fingerprint
  }

  return buildQuizQuestionComparisonText(value).toLowerCase()
}

function mergeQuizQuestionHistory(...questionLists) {
  const mergedQuestions = []
  const seenKeys = new Set()

  questionLists.forEach((questionList) => {
    if (!Array.isArray(questionList)) {
      return
    }

    questionList.forEach((item) => {
      const normalizedQuestion = normalizeQuizHistoryQuestion(item)

      if (!normalizedQuestion) {
        return
      }

      const dedupKey = buildQuizHistoryDedupKey(normalizedQuestion)

      if (dedupKey && seenKeys.has(dedupKey)) {
        return
      }

      if (dedupKey) {
        seenKeys.add(dedupKey)
      }

      mergedQuestions.push(normalizedQuestion)
    })
  })

  return mergedQuestions
}

async function readDailyQuizHistoryEntries(env, { currentPath = '' } = {}) {
  const timeZone = getQuizHistoryTimeZone(env)
  const dateKey = formatDateKey(new Date(), timeZone)
  return readQuizHistoryEntriesByDateKey(dateKey, { timeZone, currentPath })
}

async function readQuizHistoryEntriesByDateKey(dateKey, { timeZone = '', currentPath = '' } = {}) {
  const normalizedDateKey = normalizeQuizHistoryDateKey(dateKey, { allowEmpty: false })
  const filePath = getDailyQuizHistoryFilePath(normalizedDateKey)
  const normalizedCurrentPath = normalizeOptionalRequestedPath(currentPath)

  try {
    const content = await readFile(filePath, 'utf8')
    const entries = []
    const lines = content.split(/\r?\n/).filter(Boolean)

    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = lines[index]

      try {
        const parsedValue = JSON.parse(line)
        const normalizedEntry = normalizeQuizHistoryEntry(parsedValue)

        if (!normalizedEntry) {
          continue
        }

        if (normalizedCurrentPath && normalizedEntry.currentPath !== normalizedCurrentPath) {
          continue
        }

        entries.push(normalizedEntry)
      } catch (error) {
        console.warn('[ai] failed to parse quiz history line, skipping.', {
          filePath,
          lineNumber: index + 1,
          message: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return {
      dateKey: normalizedDateKey,
      timeZone,
      filePath,
      entries
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {
        dateKey: normalizedDateKey,
        timeZone,
        filePath,
        entries: []
      }
    }

    throw error
  }
}

async function readDailyQuizHistory(env) {
  const dailyHistory = await readDailyQuizHistoryEntries(env)

  return {
    ...dailyHistory,
    questions: mergeQuizQuestionHistory(dailyHistory.entries)
  }
}

async function listQuizHistoryDateSummaries() {
  try {
    const entries = await readdir(quizHistoryDirPath, { withFileTypes: true })
    const dateKeys = entries
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const matchedDateKey = entry.name.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/)
        return matchedDateKey ? matchedDateKey[1] : ''
      })
      .filter(Boolean)
      .sort((left, right) => right.localeCompare(left))

    return Promise.all(
      dateKeys.map(async (dateKey) => {
        const dailyHistory = await readQuizHistoryEntriesByDateKey(dateKey)

        return {
          dateKey,
          count: dailyHistory.entries.length
        }
      })
    )
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return []
    }

    throw error
  }
}

function createQuizHistoryEntry(question) {
  const normalizedQuestion = normalizeQuizPayload(question)

  return {
    prompt: normalizedQuestion.prompt,
    createdAt: new Date().toISOString()
  }
}

function shouldPersistQuizHistoryEntry(question) {
  const normalizedQuestion = normalizeQuizHistoryQuestion(question)

  return Boolean(normalizedQuestion?.prompt) && !/^Please regenerate a different quiz question\.?$/i.test(normalizedQuestion.prompt)
}

async function appendDailyQuizHistoryEntry(dateKey, entry) {
  await mkdir(quizHistoryDirPath, { recursive: true })
  await appendFile(getDailyQuizHistoryFilePath(dateKey), `${JSON.stringify(entry)}\n`, 'utf8')
}

async function deleteQuizHistoryByDateKey(dateKey) {
  const normalizedDateKey = normalizeQuizHistoryDateKey(dateKey, { allowEmpty: false })
  const filePath = getDailyQuizHistoryFilePath(normalizedDateKey)

  try {
    await unlink(filePath)
    return {
      deleted: true,
      dateKey: normalizedDateKey
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {
        deleted: false,
        dateKey: normalizedDateKey
      }
    }

    throw error
  }
}

async function deleteQuizHistoryEntryByCreatedAt(dateKey, createdAt) {
  const normalizedDateKey = normalizeQuizHistoryDateKey(dateKey, { allowEmpty: false })
  const normalizedCreatedAt = String(createdAt ?? '').trim()

  if (!normalizedCreatedAt) {
    const error = new Error('createdAt is required.')
    error.statusCode = 400
    throw error
  }

  const filePath = getDailyQuizHistoryFilePath(normalizedDateKey)

  try {
    const content = await readFile(filePath, 'utf8')
    const nextLines = []
    let deleted = false

    content
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => {
        if (deleted) {
          nextLines.push(line)
          return
        }

        try {
          const parsedValue = JSON.parse(line)

          if (String(parsedValue?.createdAt || '').trim() === normalizedCreatedAt) {
            deleted = true
            return
          }
        } catch {
          nextLines.push(line)
          return
        }

        nextLines.push(line)
      })

    if (!deleted) {
      return {
        deleted: false,
        dateKey: normalizedDateKey,
        createdAt: normalizedCreatedAt
      }
    }

    if (!nextLines.length) {
      await unlink(filePath).catch(() => {})
    } else {
      await writeFile(filePath, `${nextLines.join('\n')}\n`, 'utf8')
    }

    return {
      deleted: true,
      dateKey: normalizedDateKey,
      createdAt: normalizedCreatedAt
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {
        deleted: false,
        dateKey: normalizedDateKey,
        createdAt: normalizedCreatedAt
      }
    }

    throw error
  }
}

function isBigModelBaseUrl(baseUrl) {
  return normalizeEnvValue(baseUrl).toLowerCase().includes('bigmodel.cn')
}

function inferOpenAiApiEndpointStyle(baseUrl) {
  if (isBigModelBaseUrl(baseUrl)) {
    return 'chat_completions'
  }

  return 'responses'
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

function normalizeConversationText(value, fieldName, maxLength = 4000) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    return ''
  }

  if (normalized.includes('\0')) {
    const error = new Error(`${fieldName} contains invalid characters.`)
    error.statusCode = 400
    throw error
  }

  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized
}

function normalizeRequestedChatMessages(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      const role = item?.role === 'assistant' ? 'assistant' : item?.role === 'user' ? 'user' : ''
      const content = normalizeConversationText(item?.content, 'messages.content', 6000)

      if (!role || !content) {
        return null
      }

      return {
        role,
        content
      }
    })
    .filter(Boolean)
    .slice(-10)
}

function normalizeRequestedQuestionContext(value) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const prompt = normalizeConversationText(value.prompt, 'currentQuestion.prompt', 2000)

  if (!prompt) {
    return null
  }

  return {
    prompt,
    focus: normalizeConversationText(value.focus, 'currentQuestion.focus', 1000),
    difficulty: normalizeConversationText(value.difficulty, 'currentQuestion.difficulty', 80),
    answerTitle: normalizeConversationText(value.answerTitle, 'currentQuestion.answerTitle', 120),
    answerItems: Array.isArray(value.answerItems)
      ? value.answerItems
          .map((item) => normalizeConversationText(item, 'currentQuestion.answerItems', 1200))
          .filter(Boolean)
          .slice(0, 6)
      : []
  }
}

function normalizeRequestedRecentQuestions(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        const prompt = normalizeConversationText(item, 'recentQuestions.prompt', 2000)
        return prompt ? { prompt, focus: '', answerTitle: '' } : null
      }

      if (!item || typeof item !== 'object') {
        return null
      }

      const prompt = normalizeConversationText(item.prompt, 'recentQuestions.prompt', 2000)
      const focus = normalizeConversationText(item.focus, 'recentQuestions.focus', 1000)
      const answerTitle = normalizeConversationText(item.answerTitle, 'recentQuestions.answerTitle', 120)

      if (!prompt && !focus && !answerTitle) {
        return null
      }

      return {
        prompt,
        focus,
        answerTitle
      }
    })
    .filter(Boolean)
    .slice(0, 8)
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

function getNotesRepoRoot(env) {
  const configuredPath = normalizeEnvValue(env.NOTE_REPO_PATH)

  if (!configuredPath) {
    const error = new Error('NOTE_REPO_PATH is required for the notes repository.')
    error.statusCode = 500
    throw error
  }

  return resolve(configuredPath)
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
    currentFileMaxChars: parsePositiveInteger(env.OPENAI_CURRENT_FILE_MAX_CHARS, 12000),
    memoryFileMaxChars: parsePositiveInteger(env.OPENAI_MEMORY_FILE_MAX_CHARS, 8000),
    quizMemoryFileMaxChars: parsePositiveInteger(env.OPENAI_QUIZ_MEMORY_FILE_MAX_CHARS, 2200),
    chatCurrentFileMaxChars: parsePositiveInteger(env.OPENAI_CHAT_CURRENT_FILE_MAX_CHARS, 3200),
    chatMemoryFileMaxChars: parsePositiveInteger(env.OPENAI_CHAT_MEMORY_FILE_MAX_CHARS, 1200),
    chatMaxOutputTokens: parsePositiveInteger(env.OPENAI_CHAT_MAX_OUTPUT_TOKENS, 520)
  }
}

function normalizeRequestedPath(value) {
  const normalized = toPosixPath(String(value ?? '').trim()).replace(/^\/+/, '')

  if (!normalized || normalized.includes('\0')) {
    const error = new Error('currentPath must be a valid Markdown file path.')
    error.statusCode = 400
    throw error
  }

  return normalized
}

function resolveRepoEntry(repoRoot, requestedPath) {
  const normalizedPath = normalizeRequestedPath(requestedPath)
  const absolutePath = resolve(repoRoot, normalizedPath)
  const relativePath = toPosixPath(relative(repoRoot, absolutePath))

  if (
    !relativePath ||
    relativePath.startsWith('..') ||
    relativePath === '.git' ||
    relativePath.startsWith('.git/')
  ) {
    const error = new Error('Requested path is outside the notes repository.')
    error.statusCode = 400
    throw error
  }

  return {
    absolutePath,
    relativePath
  }
}

async function ensureRepoRootExists(repoRoot) {
  let repoStat

  try {
    repoStat = await stat(repoRoot)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      const missingRepoError = new Error(`Configured notes repository path does not exist: ${repoRoot}`)
      missingRepoError.code = 'ENOENT'
      missingRepoError.statusCode = 404
      throw missingRepoError
    }

    throw error
  }

  if (!repoStat.isDirectory()) {
    const error = new Error(`Configured notes repository path is not a directory: ${repoRoot}`)
    error.statusCode = 500
    throw error
  }
}

async function ensureExistingFile(absolutePath) {
  try {
    const fileStat = await stat(absolutePath)
    return fileStat.isFile()
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
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

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function getErrorStatusCode(error) {
  if (error instanceof Error && Number.isInteger(error.statusCode)) {
    return error.statusCode
  }

  if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
    return 404
  }

  return 500
}

async function readMarkdownFile(repoRoot, requestedPath) {
  const { absolutePath, relativePath } = resolveRepoEntry(repoRoot, requestedPath)
  const fileExtension = extname(relativePath).toLowerCase()

  if (!markdownExtensions.has(fileExtension)) {
    const error = new Error('Only Markdown files can be used for AI questioning.')
    error.statusCode = 400
    throw error
  }

  const [content, fileStat] = await Promise.all([readFile(absolutePath, 'utf8'), stat(absolutePath)])

  return {
    path: relativePath,
    name: basename(relativePath),
    content,
    updatedAt: fileStat.mtime.toISOString()
  }
}

async function findFirstMemoryFile(repoRoot, currentRelativePath = '') {
  const currentAbsolutePath = currentRelativePath ? resolve(repoRoot, currentRelativePath) : repoRoot
  const entries = await readdir(currentAbsolutePath, { withFileTypes: true })
  const sortedEntries = [...entries].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))

  for (const entry of sortedEntries) {
    if (entry.name === '.git') {
      continue
    }

    const nextRelativePath = currentRelativePath
      ? `${currentRelativePath}/${entry.name}`
      : entry.name

    if (entry.isFile() && entry.name === memoryFileName) {
      return toPosixPath(nextRelativePath)
    }

    if (entry.isDirectory()) {
      const matchedPath = await findFirstMemoryFile(repoRoot, nextRelativePath)

      if (matchedPath) {
        return matchedPath
      }
    }
  }

  return ''
}

async function findNearestMemoryFile(repoRoot, currentRelativePath) {
  const normalizedPath = normalizeRequestedPath(currentRelativePath)

  if (posix.basename(normalizedPath) === memoryFileName) {
    return normalizedPath
  }

  let cursorDir = posix.dirname(normalizedPath)

  while (cursorDir && cursorDir !== '.') {
    const candidate = posix.join(cursorDir, memoryFileName)

    if (await ensureExistingFile(resolveRepoEntry(repoRoot, candidate).absolutePath)) {
      return candidate
    }

    cursorDir = posix.dirname(cursorDir)
  }

  if (await ensureExistingFile(resolveRepoEntry(repoRoot, memoryFileName).absolutePath)) {
    return memoryFileName
  }

  return ''
}

function clipContext(value, maxChars, label) {
  const normalized = String(value || '').trim()

  if (!normalized || normalized.length <= maxChars) {
    return normalized
  }

  return `${normalized.slice(0, maxChars)}\n\n[${label} 已截断，原文更长]`
}

function resolveAuxiliaryMemoryFile(currentFile, memoryFile) {
  if (!memoryFile?.path || memoryFile.path === currentFile.path) {
    return null
  }

  return memoryFile
}

function stripMarkdownDecorators(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~|]/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim()
}

function normalizeComparableText(value) {
  return stripMarkdownDecorators(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '')
}

function extractComparisonTokens(value) {
  const normalized = stripMarkdownDecorators(value).toLowerCase()
  const tokens = new Set()
  const latinMatches = normalized.match(/[a-z0-9][a-z0-9+._/#-]{1,}/g) || []
  const chineseMatches = normalized.match(/[\u4e00-\u9fff]{2,}/g) || []

  latinMatches.forEach((item) => {
    tokens.add(item)
  })

  chineseMatches.forEach((segment) => {
    tokens.add(segment)

    const maxWindowSize = segment.length >= 6 ? 4 : Math.min(3, segment.length)

    for (let windowSize = 2; windowSize <= maxWindowSize; windowSize += 1) {
      for (let index = 0; index <= segment.length - windowSize; index += 1) {
        tokens.add(segment.slice(index, index + windowSize))
      }
    }
  })

  return tokens
}

function calculateTokenOverlap(leftTokens, rightTokens) {
  if (!leftTokens.size || !rightTokens.size) {
    return 0
  }

  let sharedCount = 0

  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      sharedCount += 1
    }
  })

  return sharedCount / Math.min(leftTokens.size, rightTokens.size)
}

function takeBoundedTextSlice(value, maxChars) {
  const normalized = String(value || '').trim()

  if (!normalized || normalized.length <= maxChars) {
    return normalized
  }

  const minimumBreakpoint = Math.floor(maxChars * 0.55)
  const breakpointCandidates = [
    normalized.lastIndexOf('\n\n', maxChars),
    normalized.lastIndexOf('\n', maxChars),
    normalized.lastIndexOf('。', maxChars),
    normalized.lastIndexOf('！', maxChars),
    normalized.lastIndexOf('？', maxChars),
    normalized.lastIndexOf('；', maxChars),
    normalized.lastIndexOf(';', maxChars),
    normalized.lastIndexOf('，', maxChars),
    normalized.lastIndexOf(',', maxChars),
    normalized.lastIndexOf('、', maxChars),
    normalized.lastIndexOf('.', maxChars)
  ]
  const breakpoint = breakpointCandidates
    .filter((index) => index >= minimumBreakpoint)
    .sort((left, right) => right - left)[0]

  if (Number.isInteger(breakpoint) && breakpoint > 0) {
    return normalized.slice(0, breakpoint).trim()
  }

  return normalized.slice(0, maxChars).trim()
}

function splitIntoBoundedChunks(value, maxChars) {
  const normalized = String(value || '').replace(/\r\n/g, '\n').trim()

  if (!normalized) {
    return []
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
  const chunks = []
  let currentChunk = ''

  const pushChunk = (chunkValue) => {
    const nextChunk = String(chunkValue || '').trim()

    if (nextChunk) {
      chunks.push(nextChunk)
    }
  }

  for (const block of blocks) {
    const nextChunk = currentChunk ? `${currentChunk}\n\n${block}` : block

    if (nextChunk.length <= maxChars) {
      currentChunk = nextChunk
      continue
    }

    if (currentChunk) {
      pushChunk(currentChunk)
      currentChunk = ''
    }

    if (block.length <= maxChars) {
      currentChunk = block
      continue
    }

    let remainingBlock = block

    while (remainingBlock.length > maxChars) {
      const slice = takeBoundedTextSlice(remainingBlock, maxChars)

      pushChunk(slice)
      remainingBlock = remainingBlock.slice(slice.length).trim()
    }

    currentChunk = remainingBlock
  }

  if (currentChunk) {
    pushChunk(currentChunk)
  }

  return chunks
}

function extractMarkdownSections(value) {
  const lines = String(value || '').replace(/\r\n/g, '\n').split('\n')
  const sections = []
  let currentTitle = ''
  let currentLines = []

  const pushSection = () => {
    const content = currentLines.join('\n').trim()

    if (!content) {
      return
    }

    sections.push({
      title: currentTitle,
      content
    })
  }

  for (const line of lines) {
    const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/)

    if (headingMatch) {
      if (currentLines.length) {
        pushSection()
      }

      currentTitle = stripMarkdownDecorators(headingMatch[2])
      currentLines = [line]
      continue
    }

    currentLines.push(line)
  }

  if (currentLines.length) {
    pushSection()
  }

  return sections
}

function buildQuizSourceChunks(content, maxChars) {
  const normalized = String(content || '').trim()

  if (!normalized) {
    return []
  }

  const sections = extractMarkdownSections(normalized)
  const sectionChunks = []

  sections.forEach((section, sectionIndex) => {
    const boundedChunks = splitIntoBoundedChunks(section.content, maxChars)
    const baseTitle = section.title || `Section ${sectionIndex + 1}`

    boundedChunks.forEach((chunkContent, chunkIndex) => {
      const title =
        boundedChunks.length > 1 ? `${baseTitle} (part ${chunkIndex + 1})` : baseTitle

      sectionChunks.push({
        title,
        content: chunkContent,
        comparisonText: `${title}\n${chunkContent.slice(0, 320)}`
      })
    })
  })

  if (sectionChunks.length >= 2) {
    return sectionChunks
  }

  const fallbackChunks = splitIntoBoundedChunks(normalized, maxChars)

  return fallbackChunks.map((chunkContent, chunkIndex) => ({
    title: fallbackChunks.length > 1 ? `Section ${chunkIndex + 1}` : '',
    content: chunkContent,
    comparisonText: chunkContent.slice(0, 320)
  }))
}

function formatRecentQuestionLine(item, index) {
  const parts = []

  if (item?.prompt) {
    parts.push(item.prompt)
  }

  if (item?.focus) {
    parts.push(`Focus: ${item.focus}`)
  }

  if (item?.answerTitle) {
    parts.push(`Answer: ${item.answerTitle}`)
  }

  return `${index + 1}. ${parts.join(' | ')}`
}

function scoreChunkOverlapWithRecentQuestions(chunk, recentQuestions) {
  if (!recentQuestions.length) {
    return 0
  }

  const chunkText = String(chunk?.comparisonText || '')
  const chunkNormalized = normalizeComparableText(chunkText)
  const chunkTokens = extractComparisonTokens(chunkText)
  let maxScore = 0

  recentQuestions.forEach((item) => {
    const recentText = [item.prompt, item.focus, item.answerTitle].filter(Boolean).join(' ')
    const recentNormalized = normalizeComparableText(recentText)

    if (
      chunkNormalized &&
      recentNormalized &&
      Math.min(chunkNormalized.length, recentNormalized.length) >= 6 &&
      (chunkNormalized.includes(recentNormalized) || recentNormalized.includes(chunkNormalized))
    ) {
      maxScore = 1
      return
    }

    maxScore = Math.max(
      maxScore,
      calculateTokenOverlap(chunkTokens, extractComparisonTokens(recentText))
    )
  })

  return maxScore
}

function selectQuizSourceChunk(
  currentFile,
  recentQuestions,
  maxChars,
  attemptIndex = 0,
  randomSeed = 0
) {
  const sourceMaxChars = Math.max(1000, Math.min(maxChars, 2600))
  const chunks = buildQuizSourceChunks(currentFile.content, sourceMaxChars)

  if (!chunks.length) {
    return null
  }

  const scoredChunks = chunks
    .map((chunk, chunkIndex) => ({
      chunk,
      chunkIndex,
      overlapScore: scoreChunkOverlapWithRecentQuestions(chunk, recentQuestions),
      preferredLengthDelta: Math.abs(chunk.content.length - Math.min(sourceMaxChars, 1500))
    }))
    .sort((left, right) => {
      if (left.overlapScore !== right.overlapScore) {
        return left.overlapScore - right.overlapScore
      }

      if (left.preferredLengthDelta !== right.preferredLengthDelta) {
        return left.preferredLengthDelta - right.preferredLengthDelta
      }

      return left.chunkIndex - right.chunkIndex
    })

  const minimumOverlapScore = scoredChunks[0]?.overlapScore ?? 0
  const candidatePool = recentQuestions.length
    ? scoredChunks.filter((item) => item.overlapScore <= minimumOverlapScore + 0.18)
    : scoredChunks
  const rotationSeed = randomSeed + recentQuestions.length + attemptIndex

  return candidatePool[rotationSeed % candidatePool.length]?.chunk || scoredChunks[0]?.chunk || null
}

function buildQuizCurrentFileContext(
  currentFile,
  recentQuestions,
  maxChars,
  attemptIndex = 0,
  randomSeed = 0
) {
  const selectedChunk = selectQuizSourceChunk(
    currentFile,
    recentQuestions,
    maxChars,
    attemptIndex,
    randomSeed
  )

  if (!selectedChunk) {
    return clipContext(currentFile.content, maxChars, 'current file')
  }

  const chunkHeader = selectedChunk.title
    ? `[Focused section]\n${selectedChunk.title}\n\n`
    : '[Focused section]\n\n'

  return clipContext(`${chunkHeader}${selectedChunk.content}`, maxChars, 'current file section')
}

function buildChatReferenceText(currentQuestion, messages) {
  const latestUserMessages = Array.isArray(messages)
    ? messages
        .filter((item) => item?.role === 'user' && item?.content)
        .slice(-2)
        .map((item) => item.content)
    : []

  return [
    currentQuestion?.prompt || '',
    currentQuestion?.focus || '',
    currentQuestion?.difficulty || '',
    currentQuestion?.answerTitle || '',
    ...(Array.isArray(currentQuestion?.answerItems) ? currentQuestion.answerItems.slice(0, 3) : []),
    ...latestUserMessages
  ]
    .filter(Boolean)
    .join(' ')
}

function selectChatSourceChunk(currentFile, currentQuestion, messages, maxChars) {
  const sourceMaxChars = Math.max(900, Math.min(maxChars, 2200))
  const chunks = buildQuizSourceChunks(currentFile.content, sourceMaxChars)

  if (!chunks.length) {
    return null
  }

  const referenceText = buildChatReferenceText(currentQuestion, messages)
  const referenceTokens = extractComparisonTokens(referenceText)
  const referenceNormalized = normalizeComparableText(referenceText)

  if (!referenceText.trim()) {
    return chunks[0]
  }

  const scoredChunks = chunks
    .map((chunk, chunkIndex) => {
      const chunkText = String(chunk?.comparisonText || '')
      const chunkNormalized = normalizeComparableText(chunkText)
      let overlapScore = calculateTokenOverlap(referenceTokens, extractComparisonTokens(chunkText))

      if (
        referenceNormalized &&
        chunkNormalized &&
        Math.min(referenceNormalized.length, chunkNormalized.length) >= 6 &&
        (chunkNormalized.includes(referenceNormalized) || referenceNormalized.includes(chunkNormalized))
      ) {
        overlapScore += 0.5
      }

      return {
        chunk,
        chunkIndex,
        overlapScore,
        preferredLengthDelta: Math.abs(chunk.content.length - Math.min(sourceMaxChars, 1400))
      }
    })
    .sort((left, right) => {
      if (left.overlapScore !== right.overlapScore) {
        return right.overlapScore - left.overlapScore
      }

      if (left.preferredLengthDelta !== right.preferredLengthDelta) {
        return left.preferredLengthDelta - right.preferredLengthDelta
      }

      return left.chunkIndex - right.chunkIndex
    })

  return scoredChunks[0]?.chunk || chunks[0]
}

function buildChatCurrentFileContext(currentFile, currentQuestion, messages, maxChars) {
  const selectedChunk = selectChatSourceChunk(currentFile, currentQuestion, messages, maxChars)

  if (!selectedChunk) {
    return clipContext(currentFile.content, maxChars, 'current file')
  }

  const chunkHeader = selectedChunk.title
    ? `[Relevant section]\n${selectedChunk.title}\n\n`
    : '[Relevant section]\n\n'

  return clipContext(`${chunkHeader}${selectedChunk.content}`, maxChars, 'chat context section')
}

function isQuizTooSimilarToRecentQuestions(quiz, recentQuestions) {
  if (!quiz || !recentQuestions.length) {
    return false
  }

  const quizText = [quiz.prompt, quiz.focus, quiz.answerTitle].filter(Boolean).join(' ')
  const quizNormalized = normalizeComparableText(quizText)
  const quizTokens = extractComparisonTokens(quizText)

  return recentQuestions.some((item) => {
    const recentText = [item.prompt, item.focus, item.answerTitle].filter(Boolean).join(' ')
    const recentNormalized = normalizeComparableText(recentText)

    if (
      quizNormalized &&
      recentNormalized &&
      Math.min(quizNormalized.length, recentNormalized.length) >= 6 &&
      (quizNormalized === recentNormalized ||
        quizNormalized.includes(recentNormalized) ||
        recentNormalized.includes(quizNormalized))
    ) {
      return true
    }

    return calculateTokenOverlap(quizTokens, extractComparisonTokens(recentText)) >= 0.72
  })
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

async function buildPrompt({
  currentFile,
  memoryFile,
  recentQuestions,
  config,
  attemptIndex = 0,
  randomSeed = 0
}) {
  const template = await loadPromptTemplate('notesQuizUser')
  const auxiliaryMemoryFile = resolveAuxiliaryMemoryFile(currentFile, memoryFile)
  const currentFileContent = buildQuizCurrentFileContext(
    currentFile,
    recentQuestions,
    config.currentFileMaxChars,
    attemptIndex,
    randomSeed
  )
  const memoryFileContent = auxiliaryMemoryFile
    ? clipContext(auxiliaryMemoryFile.content, Math.min(config.memoryFileMaxChars, config.quizMemoryFileMaxChars), '背过.md')
    : ''
  const recentQuestionLines = recentQuestions.length
    ? recentQuestions.map((item, index) => formatRecentQuestionLine(item, index)).join('\n')
    : '无'

  return renderPromptTemplate(template, {
    currentFilePath: currentFile.path,
    memoryFilePath: auxiliaryMemoryFile?.path || '未提供独立背过.md（与当前文件相同或未找到）',
    recentQuestionLines,
    currentFileContent: currentFileContent || '（空）',
    memoryFileContent: memoryFileContent || '（未提供）'
  }).trim()
}

async function buildChatSystemPrompt({ currentFile, memoryFile, currentQuestion, messages, config }) {
  const template = await loadPromptTemplate('notesChatSystem')
  const auxiliaryMemoryFile = resolveAuxiliaryMemoryFile(currentFile, memoryFile)
  const currentFileContent = buildChatCurrentFileContext(
    currentFile,
    currentQuestion,
    messages,
    config.chatCurrentFileMaxChars
  )
  const memoryFileContent = auxiliaryMemoryFile
    ? clipContext(auxiliaryMemoryFile.content, Math.min(config.memoryFileMaxChars, config.chatMemoryFileMaxChars), '背过.md')
    : ''
  const questionBlock = currentQuestion
    ? [
        '当前题目：',
        currentQuestion.prompt,
        currentQuestion.focus ? `考点：${currentQuestion.focus}` : '',
        currentQuestion.difficulty ? `难度：${currentQuestion.difficulty}` : '',
        currentQuestion.answerItems.length
          ? `参考答案：${currentQuestion.answerItems.join('；')}`
          : ''
      ]
        .filter(Boolean)
        .join('\n')
    : '当前还没有题目。'

  return renderPromptTemplate(template, {
    currentFilePath: currentFile.path,
    memoryFilePath: auxiliaryMemoryFile?.path || '未提供独立背过.md（与当前文件相同或未找到）',
    questionBlock,
    currentFileContent: currentFileContent || '（空）',
    memoryFileContent: memoryFileContent || '（未提供）'
  }).trim()
}

function buildRequestBody({ model, prompt, instructions, generationConfig }) {
  return {
    model,
    instructions,
    max_output_tokens: 700,
    temperature: generationConfig.temperature,
    top_p: generationConfig.topP,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: prompt
          }
        ]
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'notes_quiz',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: '直接展示给用户的问题正文，不要加题号。'
            },
            focus: {
              type: 'string',
              description: '这道题考察的核心点，简短中文。'
            },
            difficulty: {
              type: 'string',
              enum: ['基础', '进阶', '综合']
            },
            answerTitle: {
              type: 'string',
              description: '答案区域的小标题。'
            },
            answerItems: {
              type: 'array',
              items: {
                type: 'string'
              },
              minItems: 1,
              maxItems: 6
            }
          },
          required: ['prompt', 'focus', 'difficulty', 'answerTitle', 'answerItems'],
          additionalProperties: false
        }
      }
    }
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

function buildChatCompletionsRequestBody({ model, prompt, systemPrompt, generationConfig, baseUrl }) {
  return {
    model,
    ...buildChatCompletionsGenerationOptions({
      generationConfig,
      baseUrl
    }),
    max_tokens: 700,
    thinking: {
      type: 'disabled'
    },
    response_format: {
      type: 'json_object'
    },
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: prompt
      }
    ]
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
    const contentText = value
      .map((item) => extractTextFromMessageContent(item))
      .join('')
      .trim()

    return contentText
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

  const serializedObject = previewAiPayload(value)
  return serializedObject
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

function stripJsonFence(value) {
  return String(value || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

function parseQuizText(outputText) {
  return normalizeQuizPayload(JSON.parse(stripJsonFence(outputText)))
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

function normalizeQuizPayload(value) {
  const answerItems = Array.isArray(value?.answerItems)
    ? value.answerItems
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .slice(0, 6)
    : []

  const normalized = {
    prompt: String(value?.prompt || '').trim(),
    focus: String(value?.focus || '').trim(),
    difficulty: String(value?.difficulty || '').trim() || '基础',
    answerTitle: String(value?.answerTitle || '').trim() || '参考答案',
    answerItems
  }

  if (!normalized.prompt) {
    const error = new Error('AI provider returned an invalid quiz payload: prompt is missing.')
    error.statusCode = 502
    throw error
  }

  if (!normalized.focus) {
    normalized.focus = '未标注考点'
  }

  if (!normalized.answerItems.length) {
    normalized.answerItems.push('请重新生成，本次没有拿到可用答案。')
  }

  return normalized
}

function isRetryableOpenAiStatus(statusCode) {
  return (
    statusCode === 401 ||
    statusCode === 403 ||
    statusCode === 408 ||
    statusCode === 409 ||
    statusCode === 429 ||
    statusCode >= 500
  )
}

function rotateApiKeys(apiKeys, cursor) {
  if (apiKeys.length <= 1) {
    return apiKeys
  }

  const startIndex = ((cursor % apiKeys.length) + apiKeys.length) % apiKeys.length
  return [...apiKeys.slice(startIndex), ...apiKeys.slice(0, startIndex)]
}

async function requestOpenAiQuiz({
  currentFile,
  memoryFile,
  recentQuestions,
  historyQuestions,
  config,
  apiKey,
  generationConfig
}) {
  const [chatCompletionsSystemPrompt, responsesInstructions] = await Promise.all([
    loadPromptTemplate('notesQuizChatCompletionsSystem'),
    loadPromptTemplate('notesQuizResponsesInstructions')
  ])
  const useChatCompletions = config.apiEndpointStyle === 'chat_completions'
  const endpointPath = useChatCompletions ? '/chat/completions' : '/responses'
  const maxAttempts = historyQuestions.length ? 3 : 1
  const randomSeed = randomInt(0, 1_000_000)
  let lastRepeatedQuiz = null
  const rejectedQuestions = []

  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
    const effectivePromptQuestions = [...rejectedQuestions, ...recentQuestions].slice(0, 8)
    const effectiveHistoryQuestions = mergeQuizQuestionHistory(rejectedQuestions, historyQuestions)
    const prompt = await buildPrompt({
      currentFile,
      memoryFile,
      recentQuestions: effectivePromptQuestions,
      config,
      attemptIndex,
      randomSeed
    })
    const requestBody = useChatCompletions
      ? buildChatCompletionsRequestBody({
          model: config.model,
          prompt,
          systemPrompt: chatCompletionsSystemPrompt,
          generationConfig,
          baseUrl: config.baseUrl
        })
      : buildRequestBody({
          model: config.model,
          prompt,
          instructions: responsesInstructions,
          generationConfig
        })
    const response = await postAiProviderJson(`${config.baseUrl.replace(/\/$/, '')}${endpointPath}`, {
      body: requestBody,
      apiKey,
      timeoutMs: config.timeoutMs
    })
    const responsePayload = response.payload

    if (!response.ok) {
      const upstreamMessage =
        typeof responsePayload?.error?.message === 'string'
          ? responsePayload.error.message.trim()
          : ''
      const error = new Error(upstreamMessage || `AI request failed with status ${response.status}.`)
      error.statusCode = 502
      error.retryable = isRetryableOpenAiStatus(response.status)
      error.upstreamStatus = response.status
      throw error
    }

    const parsedText = useChatCompletions
      ? extractChatCompletionsText(responsePayload)
      : extractResponseText(responsePayload)
    const parsedPayload = parseQuizText(parsedText)
    const quizResult = {
      ...parsedPayload,
      model: config.model,
      usage: extractUsageMetrics(responsePayload)
    }

    if (!isQuizTooSimilarToRecentQuestions(parsedPayload, effectiveHistoryQuestions)) {
      return quizResult
    }

    lastRepeatedQuiz = quizResult
    rejectedQuestions.unshift({
      prompt: parsedPayload.prompt,
      focus: parsedPayload.focus,
      answerTitle: parsedPayload.answerTitle
    })
    console.warn('[ai] notes-quiz candidate repeated a recent quiz prompt, retrying.', {
      currentPath: currentFile.path,
      model: config.model,
      attempt: attemptIndex + 1
    })
  }

  return lastRepeatedQuiz || {
    prompt: 'Please regenerate a different quiz question.',
    focus: 'Fallback',
    difficulty: '鍩虹',
    answerTitle: 'Reference Answer',
    answerItems: ['The AI kept returning a repeated quiz question. Please try again.'],
    model: config.model,
    usage: null
  }
}

async function requestOpenAiQuizWithFallbackKeys({
  currentFile,
  memoryFile,
  recentQuestions,
  historyQuestions,
  env,
  requestedModel,
  apiKeys,
  generationConfig
}) {
  let lastError = null

  for (let index = 0; index < apiKeys.length; index += 1) {
    const candidate = apiKeys[index]
    const config = getOpenAiConfig(env, {
      requestedModel,
      baseUrlOverride: candidate.baseUrl
    })

    try {
      return await requestOpenAiQuiz({
        currentFile,
        memoryFile,
        recentQuestions,
        historyQuestions,
        config,
        apiKey: candidate.apiKey,
        generationConfig
      })
    } catch (error) {
      lastError = error

      if (!(error instanceof Error) || !error.retryable || index >= apiKeys.length - 1) {
        throw error
      }

      console.warn('[ai] OpenAI request failed, retrying with next API key.', {
        keyName: candidate.name,
        upstreamStatus: error.upstreamStatus ?? null,
        message: error.message
      })
    }
  }

  throw lastError || new Error('OpenAI request failed.')
}

async function requestOpenAiNoteChat({
  currentFile,
  memoryFile,
  currentQuestion,
  messages,
  config,
  apiKey,
  generationConfig
}) {
  const systemPrompt = await buildChatSystemPrompt({
    currentFile,
    memoryFile,
    currentQuestion,
    messages,
    config
  })
  const useChatCompletions = config.apiEndpointStyle === 'chat_completions'
  const requestBody = useChatCompletions
      ? buildChatCompletionsConversationRequestBody({
          model: config.model,
          systemPrompt,
          messages,
          generationConfig,
          maxOutputTokens: config.chatMaxOutputTokens,
          baseUrl: config.baseUrl
        })
      : buildResponsesChatRequestBody({
          model: config.model,
          systemPrompt,
          messages,
          generationConfig,
          maxOutputTokens: config.chatMaxOutputTokens
        })
  const endpointPath = useChatCompletions ? '/chat/completions' : '/responses'
  const response = await postAiProviderJson(`${config.baseUrl.replace(/\/$/, '')}${endpointPath}`, {
    body: requestBody,
    apiKey,
    timeoutMs: config.timeoutMs
  })
  const responsePayload = response.payload

  if (!response.ok) {
    const upstreamMessage =
      typeof responsePayload?.error?.message === 'string'
        ? responsePayload.error.message.trim()
        : ''
    const error = new Error(upstreamMessage || `AI request failed with status ${response.status}.`)
    error.statusCode = 502
    error.retryable = isRetryableOpenAiStatus(response.status)
    error.upstreamStatus = response.status
    throw error
  }

  const reply = (
    useChatCompletions ? extractChatCompletionsText(responsePayload) : extractResponseText(responsePayload)
  ).trim()

  if (!reply) {
    const error = new Error('AI provider returned an empty chat reply.')
    error.statusCode = 502
    throw error
  }

  return {
    reply,
    model: config.model,
    usage: extractUsageMetrics(responsePayload)
  }
}

async function requestOpenAiNoteChatWithFallbackKeys({
  currentFile,
  memoryFile,
  currentQuestion,
  messages,
  env,
  requestedModel,
  apiKeys,
  generationConfig
}) {
  let lastError = null

  for (let index = 0; index < apiKeys.length; index += 1) {
    const candidate = apiKeys[index]
    const config = getOpenAiConfig(env, {
      requestedModel,
      baseUrlOverride: candidate.baseUrl
    })

    try {
      return await requestOpenAiNoteChat({
        currentFile,
        memoryFile,
        currentQuestion,
        messages,
        config,
        apiKey: candidate.apiKey,
        generationConfig
      })
    } catch (error) {
      lastError = error

      if (!(error instanceof Error) || !error.retryable || index >= apiKeys.length - 1) {
        throw error
      }

      console.warn('[ai] OpenAI chat request failed, retrying with next API key.', {
        keyName: candidate.name,
        upstreamStatus: error.upstreamStatus ?? null,
        message: error.message
      })
    }
  }

  throw lastError || new Error('OpenAI chat request failed.')
}

export function createAiApiMiddleware(env = process.env) {
  const repoRoot = getNotesRepoRoot(env)
  const repoName = basename(repoRoot)
  const apiKeyStore = createOpenAiApiKeyStore(env)
  let apiKeyRotationCursor = 0

  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/ai')) {
      next()
      return
    }

    const requestUrl = new URL(req.url, 'http://127.0.0.1')

    try {
      const isNotesQuizRequest = requestUrl.pathname === '/api/ai/notes-quiz'
      const isNotesChatRequest = requestUrl.pathname === '/api/ai/notes-chat'
      const isQuizHistoryRequest = requestUrl.pathname === '/api/ai/quiz-history'

      if (!isNotesQuizRequest && !isNotesChatRequest && !isQuizHistoryRequest) {
        writeJson(res, 404, { message: 'Not found' })
        return
      }

      if (isQuizHistoryRequest) {
        if (req.method === 'DELETE') {
          const requestedDateKey = normalizeQuizHistoryDateKey(requestUrl.searchParams.get('date'), {
            allowEmpty: false
          })
          const requestedCreatedAt = String(requestUrl.searchParams.get('createdAt') || '').trim()
          const deletedResult = requestedCreatedAt
            ? await deleteQuizHistoryEntryByCreatedAt(requestedDateKey, requestedCreatedAt)
            : await deleteQuizHistoryByDateKey(requestedDateKey)

          writeJson(res, 200, {
            ok: true,
            view: 'delete',
            ...deletedResult
          })
          return
        }

        if (req.method !== 'GET') {
          writeJson(res, 405, { message: 'Method not allowed' })
          return
        }

        const requestedDateKey = normalizeQuizHistoryDateKey(requestUrl.searchParams.get('date'))

        if (!requestedDateKey) {
          const dateSummaries = await listQuizHistoryDateSummaries()

          writeJson(res, 200, {
            ok: true,
            view: 'dates',
            todayDateKey: formatDateKey(new Date(), getQuizHistoryTimeZone(env)),
            count: dateSummaries.length,
            items: dateSummaries
          })
          return
        }

        const dailyQuizHistory = await readQuizHistoryEntriesByDateKey(requestedDateKey, {
          timeZone: getQuizHistoryTimeZone(env)
        })

        writeJson(res, 200, {
          ok: true,
          view: 'detail',
          dateKey: dailyQuizHistory.dateKey,
          timeZone: dailyQuizHistory.timeZone,
          count: dailyQuizHistory.entries.length,
          items: dailyQuizHistory.entries
        })
        return
      }

      if (req.method !== 'POST') {
        writeJson(res, 405, { message: 'Method not allowed' })
        return
      }

      await ensureRepoRootExists(repoRoot)
      const body = await readJsonBody(req)
      const currentPath = normalizeRequestedPath(body.currentPath)
      const requestedAiId = normalizeRequestedAiId(body.aiId)
      const requestedModel = normalizeRequestedModel(body.model)
      const generationConfig = normalizeRequestedGenerationConfig(body.generationConfig)
      const recentQuestions = normalizeRequestedRecentQuestions(body.recentQuestions)
      const chatMessages = normalizeRequestedChatMessages(body.messages)
      const currentQuestion = normalizeRequestedQuestionContext(body.currentQuestion)
      const dailyQuizHistory = isNotesQuizRequest ? await readDailyQuizHistory(env) : null
      const memoryPath = await findNearestMemoryFile(repoRoot, currentPath)
      const availableApiKeys = await apiKeyStore.readApiKeys()
      const requestedApiKeys = requestedAiId
        ? availableApiKeys.filter((item) => item.aiId === requestedAiId)
        : availableApiKeys

      if (requestedAiId && !requestedApiKeys.length) {
        const error = new Error('Selected AI config was not found.')
        error.statusCode = 404
        throw error
      }

      const usableApiKeys = requestedApiKeys.filter((item) => item.baseUrl)

      if (requestedAiId && requestedApiKeys.length && !usableApiKeys.length) {
        const error = new Error('Selected AI config is missing AI base URL.')
        error.statusCode = 400
        throw error
      }

      if (!usableApiKeys.length) {
        const error = new Error('No available AI configs have a valid AI base URL.')
        error.statusCode = 500
        throw error
      }

      const apiKeys = rotateApiKeys(usableApiKeys, apiKeyRotationCursor)
      const activeConfig = getOpenAiConfig(env, {
        requestedModel,
        baseUrlOverride: apiKeys[0]?.baseUrl
      })
      const logLabel = isNotesQuizRequest ? 'notes-quiz' : 'notes-chat'
      const historyQuestions = isNotesQuizRequest
        ? mergeQuizQuestionHistory(dailyQuizHistory?.questions || [], recentQuestions)
        : []
      const promptRecentQuestions = isNotesQuizRequest
        ? historyQuestions.slice(0, getQuizHistoryPromptLimit(env))
        : recentQuestions

      console.info(`[ai] ${logLabel} request received`, {
        currentPath,
        memoryPath,
        aiId: requestedAiId || null,
        model: activeConfig.model,
        temperature: generationConfig.temperature,
        topP: generationConfig.topP,
        recentQuestionCount: recentQuestions.length || null,
        promptRecentQuestionCount: isNotesQuizRequest ? promptRecentQuestions.length || null : null,
        dailyQuizHistoryCount: isNotesQuizRequest ? dailyQuizHistory?.questions.length || null : null,
        quizHistoryDateKey: isNotesQuizRequest ? dailyQuizHistory?.dateKey || null : null,
        apiEndpointStyle: activeConfig.apiEndpointStyle,
        baseUrl: activeConfig.baseUrl,
        apiKeyCount: apiKeys.length,
        messageCount: chatMessages.length || null
      })

      apiKeyRotationCursor += 1

      const currentFile = await readMarkdownFile(repoRoot, currentPath)
      const memoryFile = memoryPath ? await readMarkdownFile(repoRoot, memoryPath) : null

      if (isNotesQuizRequest) {
        const quiz = await requestOpenAiQuizWithFallbackKeys({
          currentFile,
          memoryFile,
          recentQuestions: promptRecentQuestions,
          historyQuestions,
          env,
          requestedModel,
          apiKeys,
          generationConfig
        })

        if (shouldPersistQuizHistoryEntry(quiz)) {
          await appendDailyQuizHistoryEntry(
            dailyQuizHistory.dateKey,
            createQuizHistoryEntry(quiz)
          )
        }

        console.info('[ai] notes-quiz request succeeded', {
          currentPath: currentFile.path,
          memoryPath: memoryFile?.path || null,
          model: quiz.model,
          dailyQuizHistoryCount: historyQuestions.length + (shouldPersistQuizHistoryEntry(quiz) ? 1 : 0),
          inputTokens: quiz.usage?.inputTokens ?? null,
          outputTokens: quiz.usage?.outputTokens ?? null
        })

        writeJson(res, 200, {
          ok: true,
          source: 'openai',
          rootName: repoName,
          currentPath: currentFile.path,
          memoryPath: memoryFile?.path || '',
          ...quiz
        })
        return
      }

      if (!chatMessages.length) {
        const error = new Error('Chat messages are required.')
        error.statusCode = 400
        throw error
      }

      const chatReply = await requestOpenAiNoteChatWithFallbackKeys({
        currentFile,
        memoryFile,
        currentQuestion,
        messages: chatMessages,
        env,
        requestedModel,
        apiKeys,
        generationConfig
      })

      console.info('[ai] notes-chat request succeeded', {
        currentPath: currentFile.path,
        memoryPath: memoryFile?.path || null,
        model: chatReply.model,
        inputTokens: chatReply.usage?.inputTokens ?? null,
        outputTokens: chatReply.usage?.outputTokens ?? null
      })

      writeJson(res, 200, {
        ok: true,
        source: 'openai',
        rootName: repoName,
        currentPath: currentFile.path,
        memoryPath: memoryFile?.path || '',
        ...chatReply
      })
    } catch (error) {
      const logLabel = requestUrl.pathname === '/api/ai/notes-chat' ? 'notes-chat' : 'notes-quiz'

      console.error(`[ai] ${logLabel} request failed`, {
        message: error instanceof Error ? error.message : 'Unknown server error',
        statusCode: error instanceof Error && Number.isInteger(error.statusCode) ? error.statusCode : null,
        upstreamStatus:
          error instanceof Error && 'upstreamStatus' in error && Number.isInteger(error.upstreamStatus)
            ? error.upstreamStatus
            : null,
        responsePreview:
          error instanceof Error && 'responsePreview' in error && typeof error.responsePreview === 'string'
            ? error.responsePreview
            : null
      })
      writeJson(res, getErrorStatusCode(error), {
        message: error instanceof Error ? error.message : 'Unknown server error'
      })
    }
  }
}
