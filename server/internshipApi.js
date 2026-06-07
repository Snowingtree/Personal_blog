import { randomUUID } from 'node:crypto'
import { decryptInternshipValue, encryptInternshipValue } from './internshipCrypto.js'

const validCategories = new Set(['daily', 'task', 'study', 'review'])
const validStatuses = new Set(['progress', 'done', 'follow-up'])

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

function quoteIdentifier(value, envKey) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`${envKey} may only contain letters, numbers, and underscores.`)
  }

  return `\`${value}\``
}

function getMysqlConfig(env) {
  const config = {
    host: normalizeEnvValue(env.MYSQL_HOST),
    port: parseMysqlPort(env.MYSQL_PORT),
    user: normalizeEnvValue(env.MYSQL_USER),
    password: normalizeEnvValue(env.MYSQL_PASSWORD),
    database: normalizeEnvValue(env.MYSQL_DATABASE),
    table: normalizeEnvValue(env.INTERNSHIP_MYSQL_TABLE) || 'internship_records'
  }

  const missingKeys = Object.entries({
    MYSQL_HOST: config.host,
    MYSQL_USER: config.user,
    MYSQL_DATABASE: config.database
  })
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingKeys.length > 0) {
    throw new Error(`Missing MySQL config: ${missingKeys.join(', ')}`)
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
        'MySQL internship storage requires the mysql2 package. Run "npm install mysql2" before enabling it.'
      )
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
    throw new Error('Request body must be valid JSON.')
  }
}

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function formatInputDate(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function normalizeRecordDate(value) {
  const normalized = normalizeEnvValue(value)

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized
  }

  return formatInputDate(new Date())
}

function normalizeIsoDateTime(value, fallbackValue) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return fallbackValue
  }

  return date.toISOString()
}

function toMysqlDateTime(value) {
  return new Date(value).toISOString().slice(0, 23).replace('T', ' ')
}

function fromMysqlDateTime(value) {
  if (value instanceof Date) {
    return value.toISOString()
  }

  const normalized = String(value ?? '').trim()

  if (!normalized) {
    return new Date().toISOString()
  }

  const date = new Date(`${normalized.replace(' ', 'T')}Z`)

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString()
  }

  return date.toISOString()
}

function normalizeRecordId(value) {
  const normalized = normalizeEnvValue(value)

  if (/^[A-Za-z0-9_-]{1,64}$/.test(normalized)) {
    return normalized
  }

  return randomUUID()
}

function normalizeUserKey(req) {
  const value = normalizeEnvValue(req.auth?.sub) || normalizeEnvValue(req.auth?.username)

  if (!value) {
    throw new Error('Authenticated user is missing.')
  }

  return value.slice(0, 191)
}

function normalizeIncomingRecord(body, fallbackId = '') {
  const now = new Date().toISOString()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''

  if (!title || !content) {
    const error = new Error('title and content are required.')
    error.statusCode = 400
    throw error
  }

  const category = validCategories.has(body.category) ? body.category : 'daily'
  const status = validStatuses.has(body.status) ? body.status : 'progress'
  const createdAt = normalizeIsoDateTime(body.createdAt, now)
  const updatedAt = normalizeIsoDateTime(body.updatedAt, now)

  return {
    id: normalizeRecordId(fallbackId || body.id),
    title,
    content,
    recordDate: normalizeRecordDate(body.recordDate),
    category,
    status,
    createdAt,
    updatedAt
  }
}

function mapRowToRecord(row, env) {
  const deletedAt = row.deleted_at ? fromMysqlDateTime(row.deleted_at) : ''
  const record = {
    id: String(row.record_id ?? ''),
    title: decryptInternshipValue(String(row.title_cipher ?? ''), env),
    content: decryptInternshipValue(String(row.content_cipher ?? ''), env),
    recordDate: String(row.record_date ?? '').slice(0, 10),
    category: validCategories.has(row.category) ? row.category : 'daily',
    status: validStatuses.has(row.status) ? row.status : 'progress',
    createdAt: fromMysqlDateTime(row.created_at),
    updatedAt: fromMysqlDateTime(row.updated_at)
  }

  if (deletedAt) {
    record.deletedAt = deletedAt
  }

  return record
}

function createMysqlStorage(env) {
  const config = getMysqlConfig(env)
  const tableName = quoteIdentifier(config.table, 'INTERNSHIP_MYSQL_TABLE')
  let poolPromise = null

  async function ensureTable(connection) {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS ${tableName} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_key VARCHAR(191) NOT NULL,
        record_id VARCHAR(64) NOT NULL,
        title_cipher TEXT NOT NULL,
        content_cipher MEDIUMTEXT NOT NULL,
        record_date DATE NOT NULL,
        category VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        deleted_at DATETIME(3) NULL,
        UNIQUE KEY uniq_user_record (user_key, record_id),
        KEY idx_user_record_date (user_key, record_date),
        KEY idx_user_updated_at (user_key, updated_at),
        KEY idx_user_deleted_at (user_key, deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    )

    const [deletedAtColumns] = await connection.query(`SHOW COLUMNS FROM ${tableName} LIKE 'deleted_at'`)

    if (!deletedAtColumns.length) {
      await connection.query(
        `ALTER TABLE ${tableName}
         ADD COLUMN deleted_at DATETIME(3) NULL,
         ADD KEY idx_user_deleted_at (user_key, deleted_at)`
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
          charset: 'utf8mb4',
          dateStrings: true
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
    table: config.table,
    async listRecords(userKey, options = {}) {
      return withConnection(async (connection) => {
        const showDeletedRecords = Boolean(options.deleted)
        const [rows] = await connection.query(
          `SELECT record_id, title_cipher, content_cipher, DATE_FORMAT(record_date, '%Y-%m-%d') AS record_date,
                  category, status, created_at, updated_at, deleted_at
           FROM ${tableName}
           WHERE user_key = ? AND deleted_at IS ${showDeletedRecords ? 'NOT NULL' : 'NULL'}
           ORDER BY ${showDeletedRecords ? 'deleted_at DESC, updated_at DESC' : 'record_date DESC, updated_at DESC'}`,
          [userKey]
        )

        return rows.map((row) => mapRowToRecord(row, env))
      })
    },
    async createRecord(userKey, record) {
      return withConnection(async (connection) => {
        const encryptedTitle = encryptInternshipValue(record.title, env)
        const encryptedContent = encryptInternshipValue(record.content, env)

        await connection.query(
          `INSERT INTO ${tableName}
             (user_key, record_id, title_cipher, content_cipher, record_date, category, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userKey,
            record.id,
            encryptedTitle,
            encryptedContent,
            record.recordDate,
            record.category,
            record.status,
            toMysqlDateTime(record.createdAt),
            toMysqlDateTime(record.updatedAt)
          ]
        )

        return record
      })
    },
    async updateRecord(userKey, recordId, record) {
      return withConnection(async (connection) => {
        const [existingRows] = await connection.query(
          `SELECT created_at FROM ${tableName}
           WHERE user_key = ? AND record_id = ? AND deleted_at IS NULL
           LIMIT 1`,
          [userKey, recordId]
        )

        if (!existingRows.length) {
          return null
        }

        const nextRecord = {
          ...record,
          id: recordId,
          createdAt: fromMysqlDateTime(existingRows[0].created_at),
          updatedAt: new Date().toISOString()
        }

        await connection.query(
          `UPDATE ${tableName}
           SET title_cipher = ?, content_cipher = ?, record_date = ?, category = ?, status = ?, updated_at = ?
           WHERE user_key = ? AND record_id = ? AND deleted_at IS NULL`,
          [
            encryptInternshipValue(nextRecord.title, env),
            encryptInternshipValue(nextRecord.content, env),
            nextRecord.recordDate,
            nextRecord.category,
            nextRecord.status,
            toMysqlDateTime(nextRecord.updatedAt),
            userKey,
            recordId
          ]
        )

        return nextRecord
      })
    },
    async deleteRecord(userKey, recordId, options = {}) {
      return withConnection(async (connection) => {
        if (options.permanent) {
          const [result] = await connection.query(
            `DELETE FROM ${tableName}
             WHERE user_key = ? AND record_id = ? AND deleted_at IS NOT NULL`,
            [userKey, recordId]
          )

          return Number(result?.affectedRows || 0) > 0
        }

        const [existingRows] = await connection.query(
          `SELECT record_id, title_cipher, content_cipher, DATE_FORMAT(record_date, '%Y-%m-%d') AS record_date,
                  category, status, created_at, updated_at, deleted_at
           FROM ${tableName}
           WHERE user_key = ? AND record_id = ? AND deleted_at IS NULL
           LIMIT 1`,
          [userKey, recordId]
        )

        if (!existingRows.length) {
          return null
        }

        const deletedAt = new Date().toISOString()
        const mysqlDeletedAt = toMysqlDateTime(deletedAt)
        const [result] = await connection.query(
          `UPDATE ${tableName}
           SET deleted_at = ?, updated_at = ?
           WHERE user_key = ? AND record_id = ? AND deleted_at IS NULL`,
          [mysqlDeletedAt, mysqlDeletedAt, userKey, recordId]
        )

        if (Number(result?.affectedRows || 0) <= 0) {
          return null
        }

        return mapRowToRecord(
          {
            ...existingRows[0],
            updated_at: mysqlDeletedAt,
            deleted_at: mysqlDeletedAt
          },
          env
        )
      })
    },
    async restoreRecord(userKey, recordId) {
      return withConnection(async (connection) => {
        const [existingRows] = await connection.query(
          `SELECT record_id, title_cipher, content_cipher, DATE_FORMAT(record_date, '%Y-%m-%d') AS record_date,
                  category, status, created_at, updated_at, deleted_at
           FROM ${tableName}
           WHERE user_key = ? AND record_id = ? AND deleted_at IS NOT NULL
           LIMIT 1`,
          [userKey, recordId]
        )

        if (!existingRows.length) {
          return null
        }

        const restoredAt = new Date().toISOString()
        const mysqlRestoredAt = toMysqlDateTime(restoredAt)

        const [result] = await connection.query(
          `UPDATE ${tableName}
           SET deleted_at = NULL, updated_at = ?
           WHERE user_key = ? AND record_id = ? AND deleted_at IS NOT NULL`,
          [mysqlRestoredAt, userKey, recordId]
        )

        if (Number(result?.affectedRows || 0) <= 0) {
          return null
        }

        return mapRowToRecord(
          {
            ...existingRows[0],
            updated_at: mysqlRestoredAt,
            deleted_at: null
          },
          env
        )
      })
    }
  }
}

export function createInternshipApiMiddleware(env = process.env) {
  const storage = createMysqlStorage(env)

  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/internship')) {
      next()
      return
    }

    const requestUrl = new URL(req.url, 'http://127.0.0.1')
    const recordMatch = requestUrl.pathname.match(
      /^\/api\/internship\/records(?:\/([A-Za-z0-9_-]{1,64})(?:\/(restore))?)?$/
    )

    if (!recordMatch) {
      writeJson(res, 404, { message: 'Not found' })
      return
    }

    try {
      const userKey = normalizeUserKey(req)
      const recordId = recordMatch[1] || ''
      const recordAction = recordMatch[2] || ''

      if (req.method === 'GET' && !recordId) {
        const showDeletedRecords =
          requestUrl.searchParams.get('scope') === 'trash' ||
          requestUrl.searchParams.get('deleted') === '1'
        const records = await storage.listRecords(userKey, { deleted: showDeletedRecords })
        writeJson(res, 200, {
          records,
          scope: showDeletedRecords ? 'trash' : 'records',
          source: storage.mode,
          table: storage.table
        })
        return
      }

      if (req.method === 'POST' && !recordId) {
        const body = await readJsonBody(req)
        const record = normalizeIncomingRecord(body)
        const savedRecord = await storage.createRecord(userKey, record)
        writeJson(res, 201, {
          record: savedRecord,
          source: storage.mode
        })
        return
      }

      if (req.method === 'PATCH' && recordId && recordAction === 'restore') {
        const savedRecord = await storage.restoreRecord(userKey, recordId)

        if (!savedRecord) {
          writeJson(res, 404, { message: 'Record not found in trash.' })
          return
        }

        writeJson(res, 200, {
          record: savedRecord,
          source: storage.mode
        })
        return
      }

      if (req.method === 'PUT' && recordId && !recordAction) {
        const body = await readJsonBody(req)
        const record = normalizeIncomingRecord(body, recordId)
        const savedRecord = await storage.updateRecord(userKey, recordId, record)

        if (!savedRecord) {
          writeJson(res, 404, { message: 'Record not found.' })
          return
        }

        writeJson(res, 200, {
          record: savedRecord,
          source: storage.mode
        })
        return
      }

      if (req.method === 'DELETE' && recordId && !recordAction) {
        const permanentlyDelete = requestUrl.searchParams.get('permanent') === '1'
        const deleted = await storage.deleteRecord(userKey, recordId, { permanent: permanentlyDelete })

        if (!deleted) {
          writeJson(res, 404, { message: 'Record not found.' })
          return
        }

        const payload = {
          ok: true,
          source: storage.mode
        }

        if (!permanentlyDelete) {
          payload.record = deleted
        }

        writeJson(res, 200, payload)
        return
      }

      writeJson(res, 405, { message: 'Method not allowed' })
    } catch (error) {
      const statusCode = Number(error?.statusCode || 500)

      console.error('[internship] request failed', {
        method: req.method,
        path: requestUrl.pathname,
        storageMode: storage.mode,
        table: storage.table,
        message: error instanceof Error ? error.message : 'Unknown server error'
      })

      writeJson(res, Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600 ? statusCode : 500, {
        message: error instanceof Error ? error.message : 'Unknown server error'
      })
    }
  }
}
