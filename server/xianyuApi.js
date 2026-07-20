import { createHash, randomUUID } from 'node:crypto'
import {
  decryptXianyuImage,
  decryptXianyuValue,
  encryptXianyuImage,
  encryptXianyuValue
} from './xianyuCrypto.js'

const MAX_JSON_BODY_SIZE = 64 * 1024
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_DESCRIPTION_LENGTH = 500
const MAX_FILENAME_LENGTH = 160
const validStatuses = new Set(['pending', 'shipping', 'done'])
const supportedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseMysqlPort(value) {
  const normalized = normalizeEnvValue(value)

  if (!normalized) return 3306

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
    recordTable: normalizeEnvValue(env.XIANYU_MYSQL_RECORD_TABLE) || 'xianyu_records',
    imageTable: normalizeEnvValue(env.XIANYU_MYSQL_IMAGE_TABLE) || 'xianyu_record_images'
  }

  const missingKeys = Object.entries({
    MYSQL_HOST: config.host,
    MYSQL_USER: config.user,
    MYSQL_DATABASE: config.database
  })
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingKeys.length) {
    throw new Error(`Missing MySQL config: ${missingKeys.join(', ')}`)
  }

  return config
}

async function loadMysqlLibrary() {
  try {
    const mysqlModule = await import('mysql2/promise')
    return mysqlModule.default ?? mysqlModule
  } catch (error) {
    if (error instanceof Error && /mysql2|Cannot find package|Cannot find module/.test(error.message)) {
      throw new Error('MySQL Xianyu storage requires the mysql2 package.')
    }

    throw error
  }
}

function createHttpError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

async function readLimitedBody(req, maximumSize, errorMessage) {
  const declaredSize = Number(req.headers['content-length'] || 0)

  if (Number.isFinite(declaredSize) && declaredSize > maximumSize) {
    throw createHttpError(errorMessage, 413)
  }

  const chunks = []
  let receivedSize = 0

  for await (const chunk of req) {
    receivedSize += chunk.length

    if (receivedSize > maximumSize) {
      throw createHttpError(errorMessage, 413)
    }

    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

async function readJsonBody(req) {
  const rawBody = (await readLimitedBody(req, MAX_JSON_BODY_SIZE, '请求数据过大。'))
    .toString('utf8')
    .trim()

  if (!rawBody) return {}

  try {
    return JSON.parse(rawBody)
  } catch {
    throw createHttpError('请求数据格式不正确。', 400)
  }
}

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

function writeImage(res, value, mimeType) {
  res.statusCode = 200
  res.setHeader('Content-Type', mimeType)
  res.setHeader('Content-Length', String(value.length))
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(value)
}

function normalizeRecordId(value) {
  const normalized = normalizeEnvValue(value)

  if (/^[A-Za-z0-9_-]{1,64}$/.test(normalized)) return normalized

  return randomUUID()
}

function normalizeUserKey(req) {
  const value = normalizeEnvValue(req.auth?.sub) || normalizeEnvValue(req.auth?.username)

  if (!value) throw createHttpError('登录状态已失效，请重新登录。', 401)

  return value.slice(0, 191)
}

function normalizeMoney(value, fieldName) {
  const normalized = String(value ?? '').trim()

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw createHttpError(`${fieldName === 'costPrice' ? '成本价格' : '售价'}格式不正确。`, 400)
  }

  const amount = Number(normalized)

  if (!Number.isFinite(amount) || amount > 99_999_999.99) {
    throw createHttpError(`${fieldName === 'costPrice' ? '成本价格' : '售价'}超过允许范围。`, 400)
  }

  return amount.toFixed(2)
}

function normalizeIsoDate(value, fallbackValue = '') {
  if (!value && fallbackValue) return fallbackValue
  if (!value) return ''

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? fallbackValue : date.toISOString()
}

function toMysqlDateTime(value) {
  return new Date(value).toISOString().slice(0, 23).replace('T', ' ')
}

function fromMysqlDateTime(value, fallbackValue = '') {
  if (!value) return fallbackValue
  if (value instanceof Date) return value.toISOString()

  const date = new Date(`${String(value).replace(' ', 'T')}Z`)
  return Number.isNaN(date.getTime()) ? fallbackValue : date.toISOString()
}

function normalizeIncomingRecord(body, fallbackId = '') {
  const now = new Date().toISOString()
  const description = typeof body.description === 'string' ? body.description.trim() : ''

  if (!description) throw createHttpError('记录描述不能为空。', 400)
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw createHttpError(`记录描述不能超过 ${MAX_DESCRIPTION_LENGTH} 个字符。`, 400)
  }

  const status = validStatuses.has(body.status) ? body.status : 'pending'
  const createdAt = normalizeIsoDate(body.createdAt, now)
  const updatedAt = normalizeIsoDate(body.updatedAt, now)
  const usedAt = status === 'done' ? normalizeIsoDate(body.usedAt, updatedAt) : ''

  return {
    id: normalizeRecordId(fallbackId || body.id),
    description,
    costPrice: normalizeMoney(body.costPrice, 'costPrice'),
    salePrice: normalizeMoney(body.salePrice ?? body.price, 'salePrice'),
    status,
    createdAt,
    updatedAt,
    usedAt
  }
}

function normalizeImageMimeType(req) {
  const mimeType = String(req.headers['content-type'] || '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase()

  if (!supportedImageTypes.has(mimeType)) {
    throw createHttpError('图片格式不支持，请使用 JPG、PNG、WebP 或 GIF。', 415)
  }

  return mimeType
}

function normalizeImageFilename(value) {
  const normalized = String(value || 'coupon-image')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/]+/g, '-')
    .trim()
    .slice(0, MAX_FILENAME_LENGTH)

  return normalized || 'coupon-image'
}

function imageMatchesMimeType(value, mimeType) {
  if (mimeType === 'image/jpeg') {
    return value.length >= 3 && value[0] === 0xff && value[1] === 0xd8 && value[2] === 0xff
  }

  if (mimeType === 'image/png') {
    return value.length >= 8 && value.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  }

  if (mimeType === 'image/webp') {
    return value.length >= 12
      && value.subarray(0, 4).toString('ascii') === 'RIFF'
      && value.subarray(8, 12).toString('ascii') === 'WEBP'
  }

  if (mimeType === 'image/gif') {
    const signature = value.subarray(0, 6).toString('ascii')
    return signature === 'GIF87a' || signature === 'GIF89a'
  }

  return false
}

async function readIncomingImage(req, requestUrl) {
  const mimeType = normalizeImageMimeType(req)
  const value = await readLimitedBody(req, MAX_IMAGE_SIZE, '图片不能超过 5MB。')

  if (!value.length || !imageMatchesMimeType(value, mimeType)) {
    throw createHttpError('图片内容与文件格式不一致。', 400)
  }

  return {
    value,
    mimeType,
    originalName: normalizeImageFilename(requestUrl.searchParams.get('filename')),
    sha256: createHash('sha256').update(value).digest('hex')
  }
}

function mapRowToRecord(row, env) {
  const salePrice = Number(row.sale_price || 0).toFixed(2)

  return {
    id: String(row.record_id || ''),
    description: decryptXianyuValue(String(row.description_cipher || ''), env),
    costPrice: Number(row.cost_price || 0).toFixed(2),
    salePrice,
    price: salePrice,
    status: validStatuses.has(row.status) ? row.status : 'pending',
    createdAt: fromMysqlDateTime(row.created_at, new Date().toISOString()),
    updatedAt: fromMysqlDateTime(row.updated_at, new Date().toISOString()),
    usedAt: fromMysqlDateTime(row.used_at, ''),
    hasImage: Boolean(row.image_mime_type),
    imageMimeType: row.image_mime_type || '',
    imageName: row.image_name_cipher
      ? decryptXianyuValue(String(row.image_name_cipher), env)
      : '',
    imageSize: Number(row.image_byte_size || 0)
  }
}

function createMysqlStorage(env) {
  const config = getMysqlConfig(env)
  const recordTableName = quoteIdentifier(config.recordTable, 'XIANYU_MYSQL_RECORD_TABLE')
  const imageTableName = quoteIdentifier(config.imageTable, 'XIANYU_MYSQL_IMAGE_TABLE')
  let poolPromise = null

  async function ensureTables(connection) {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS ${recordTableName} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_key VARCHAR(191) NOT NULL,
        record_id VARCHAR(64) NOT NULL,
        description_cipher TEXT NOT NULL,
        cost_price DECIMAL(10, 2) NOT NULL,
        sale_price DECIMAL(10, 2) NOT NULL,
        status VARCHAR(16) NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        used_at DATETIME(3) NULL,
        UNIQUE KEY uniq_xianyu_user_record (user_key, record_id),
        KEY idx_xianyu_user_updated (user_key, updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    )

    await connection.query(
      `CREATE TABLE IF NOT EXISTS ${imageTableName} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_key VARCHAR(191) NOT NULL,
        record_id VARCHAR(64) NOT NULL,
        mime_type VARCHAR(64) NOT NULL,
        original_name_cipher TEXT NOT NULL,
        byte_size INT UNSIGNED NOT NULL,
        sha256 CHAR(64) NOT NULL,
        image_cipher MEDIUMBLOB NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        UNIQUE KEY uniq_xianyu_image_user_record (user_key, record_id),
        KEY idx_xianyu_image_sha256 (sha256)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    )
  }

  async function getPool() {
    if (!poolPromise) {
      poolPromise = loadMysqlLibrary().then((mysql) => mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        connectionLimit: 10,
        waitForConnections: true,
        charset: 'utf8mb4',
        dateStrings: true
      }))
    }

    return poolPromise
  }

  async function withConnection(handler) {
    const pool = await getPool()
    const connection = await pool.getConnection()

    try {
      await ensureTables(connection)
      return await handler(connection)
    } finally {
      connection.release()
    }
  }

  async function withTransaction(handler) {
    return withConnection(async (connection) => {
      await connection.beginTransaction()

      try {
        const result = await handler(connection)
        await connection.commit()
        return result
      } catch (error) {
        await connection.rollback()
        throw error
      }
    })
  }

  const recordSelect = `
    SELECT r.record_id, r.description_cipher, r.cost_price, r.sale_price, r.status,
           r.created_at, r.updated_at, r.used_at,
           i.mime_type AS image_mime_type,
           i.original_name_cipher AS image_name_cipher,
           i.byte_size AS image_byte_size
    FROM ${recordTableName} r
    LEFT JOIN ${imageTableName} i
      ON i.user_key = r.user_key AND i.record_id = r.record_id`

  async function getRecordWithConnection(connection, userKey, recordId) {
    const [rows] = await connection.query(
      `${recordSelect} WHERE r.user_key = ? AND r.record_id = ? LIMIT 1`,
      [userKey, recordId]
    )

    return rows[0] ? mapRowToRecord(rows[0], env) : null
  }

  return {
    mode: 'mysql',
    recordTable: config.recordTable,
    imageTable: config.imageTable,
    async listRecords(userKey) {
      return withConnection(async (connection) => {
        const [rows] = await connection.query(
          `${recordSelect} WHERE r.user_key = ? ORDER BY r.created_at DESC, r.updated_at DESC`,
          [userKey]
        )

        return rows.map((row) => mapRowToRecord(row, env))
      })
    },
    async upsertRecord(userKey, record) {
      return withConnection(async (connection) => {
        await connection.query(
          `INSERT INTO ${recordTableName}
             (user_key, record_id, description_cipher, cost_price, sale_price, status, created_at, updated_at, used_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             description_cipher = VALUES(description_cipher),
             cost_price = VALUES(cost_price),
             sale_price = VALUES(sale_price),
             status = VALUES(status),
             updated_at = VALUES(updated_at),
             used_at = VALUES(used_at)`,
          [
            userKey,
            record.id,
            encryptXianyuValue(record.description, env),
            record.costPrice,
            record.salePrice,
            record.status,
            toMysqlDateTime(record.createdAt),
            toMysqlDateTime(record.updatedAt),
            record.usedAt ? toMysqlDateTime(record.usedAt) : null
          ]
        )

        return getRecordWithConnection(connection, userKey, record.id)
      })
    },
    async saveImage(userKey, recordId, image) {
      return withTransaction(async (connection) => {
        const [records] = await connection.query(
          `SELECT record_id FROM ${recordTableName} WHERE user_key = ? AND record_id = ? FOR UPDATE`,
          [userKey, recordId]
        )

        if (!records.length) return false

        const now = toMysqlDateTime(new Date())

        await connection.query(
          `INSERT INTO ${imageTableName}
             (user_key, record_id, mime_type, original_name_cipher, byte_size, sha256, image_cipher, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             mime_type = VALUES(mime_type),
             original_name_cipher = VALUES(original_name_cipher),
             byte_size = VALUES(byte_size),
             sha256 = VALUES(sha256),
             image_cipher = VALUES(image_cipher),
             updated_at = VALUES(updated_at)`,
          [
            userKey,
            recordId,
            image.mimeType,
            encryptXianyuValue(image.originalName, env),
            image.value.length,
            image.sha256,
            encryptXianyuImage(image.value, env),
            now,
            now
          ]
        )

        return true
      })
    },
    async readImage(userKey, recordId) {
      return withConnection(async (connection) => {
        const [rows] = await connection.query(
          `SELECT mime_type, image_cipher FROM ${imageTableName}
           WHERE user_key = ? AND record_id = ? LIMIT 1`,
          [userKey, recordId]
        )

        if (!rows.length) return null

        return {
          mimeType: rows[0].mime_type,
          value: decryptXianyuImage(rows[0].image_cipher, env)
        }
      })
    },
    async deleteRecord(userKey, recordId) {
      return withTransaction(async (connection) => {
        await connection.query(
          `DELETE FROM ${imageTableName} WHERE user_key = ? AND record_id = ?`,
          [userKey, recordId]
        )
        const [result] = await connection.query(
          `DELETE FROM ${recordTableName} WHERE user_key = ? AND record_id = ?`,
          [userKey, recordId]
        )

        return result.affectedRows > 0
      })
    }
  }
}

export function createXianyuApiMiddleware(env = process.env) {
  const storage = createMysqlStorage(env)

  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/xianyu')) {
      next()
      return
    }

    const requestUrl = new URL(req.url, 'http://127.0.0.1')
    const recordMatch = requestUrl.pathname.match(
      /^\/api\/xianyu\/records(?:\/([A-Za-z0-9_-]{1,64})(?:\/(image))?)?$/
    )

    if (!recordMatch) {
      writeJson(res, 404, { message: '闲鱼接口不存在。' })
      return
    }

    try {
      const userKey = normalizeUserKey(req)
      const recordId = recordMatch[1] || ''
      const action = recordMatch[2] || ''

      if (req.method === 'GET' && !recordId) {
        const records = await storage.listRecords(userKey)
        writeJson(res, 200, { records, source: storage.mode })
        return
      }

      if ((req.method === 'POST' && !recordId) || (req.method === 'PUT' && recordId && !action)) {
        const body = await readJsonBody(req)
        const record = normalizeIncomingRecord(body, recordId)
        const savedRecord = await storage.upsertRecord(userKey, record)
        writeJson(res, req.method === 'POST' ? 201 : 200, { record: savedRecord, source: storage.mode })
        return
      }

      if (req.method === 'PUT' && recordId && action === 'image') {
        const image = await readIncomingImage(req, requestUrl)
        const saved = await storage.saveImage(userKey, recordId, image)

        if (!saved) {
          writeJson(res, 404, { message: '没有找到这条闲鱼记录。' })
          return
        }

        writeJson(res, 200, { ok: true })
        return
      }

      if (req.method === 'GET' && recordId && action === 'image') {
        const image = await storage.readImage(userKey, recordId)

        if (!image) {
          writeJson(res, 404, { message: '没有找到这张图片。' })
          return
        }

        writeImage(res, image.value, image.mimeType)
        return
      }

      if (req.method === 'DELETE' && recordId && !action) {
        const deleted = await storage.deleteRecord(userKey, recordId)
        writeJson(res, 200, { ok: true, deleted })
        return
      }

      writeJson(res, 405, { message: '服务器暂不支持这个操作。' })
    } catch (error) {
      const statusCode = Number(error?.statusCode || 500)
      const safeStatusCode = Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600
        ? statusCode
        : 500

      console.error('[xianyu] request failed', {
        method: req.method,
        path: requestUrl.pathname,
        recordTable: storage.recordTable,
        imageTable: storage.imageTable,
        message: error instanceof Error ? error.message : 'Unknown server error'
      })

      writeJson(res, safeStatusCode, {
        message: safeStatusCode >= 500
          ? '闲鱼云端服务暂时不可用，请稍后重试。'
          : error instanceof Error
            ? error.message
            : '请求失败，请稍后重试。'
      })
    }
  }
}
