import { randomUUID } from 'node:crypto'

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
    table: normalizeEnvValue(env.QUANSHANG_MYSQL_TABLE) || 'quanshang_items'
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
        'MySQL quanshang storage requires the mysql2 package. Run "npm install mysql2" before enabling it.'
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

function normalizeItemId(value) {
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

function normalizeMoney(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : 0
}

function normalizeIncomingItem(body, fallbackId = '') {
  const price = normalizeMoney(body.price)
  const originalPrice = normalizeMoney(body.originalPrice)
  const name = normalizeEnvValue(body.name).slice(0, 191)
  const code = normalizeEnvValue(body.code).replace(/\s+/g, '').slice(0, 32)

  if (price <= 0 || originalPrice <= 0) {
    const error = new Error('price and originalPrice are required and must be greater than 0.')
    error.statusCode = 400
    throw error
  }

  return {
    id: normalizeItemId(fallbackId || body.id),
    name,
    code,
    price,
    originalPrice,
    sold: false,
    createdAt: new Date().toISOString()
  }
}

function createMysqlStorage(env) {
  const config = getMysqlConfig(env)
  const tableName = quoteIdentifier(config.table, 'QUANSHANG_MYSQL_TABLE')
  let poolPromise = null

  async function ensureTable(connection) {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS ${tableName} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_key VARCHAR(191) NOT NULL,
        item_id VARCHAR(64) NOT NULL,
        name VARCHAR(191) NOT NULL DEFAULT '',
        code VARCHAR(32) NOT NULL DEFAULT '',
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        original_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        sold TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL,
        UNIQUE KEY uniq_user_item (user_key, item_id),
        KEY idx_user_created (user_key, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    )

    // 兼容旧表：若缺少列则补充
    const ensureColumns = [
      { name: 'name', ddl: "name VARCHAR(191) NOT NULL DEFAULT '' AFTER item_id" },
      { name: 'code', ddl: "code VARCHAR(32) NOT NULL DEFAULT '' AFTER name" }
    ]

    for (const column of ensureColumns) {
      try {
        const [columns] = await connection.query(
          `SELECT COLUMN_NAME FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
          [config.database, config.table, column.name]
        )

        if (!columns || columns.length === 0) {
          await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${column.ddl}`)
        }
      } catch {
        // 列迁移失败（如数据库权限不足）时忽略，避免阻塞主流程
      }
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

  function mapRowToItem(row) {
    return {
      id: String(row.item_id ?? ''),
      name: String(row.name ?? ''),
      code: String(row.code ?? ''),
      price: Number(row.price ?? 0),
      originalPrice: Number(row.original_price ?? 0),
      sold: Boolean(row.sold),
      createdAt: fromMysqlDateTime(row.created_at)
    }
  }

  return {
    mode: 'mysql',
    table: config.table,
    async listItems(userKey) {
      return withConnection(async (connection) => {
        const [rows] = await connection.query(
          `SELECT item_id, name, code, price, original_price, sold, created_at
           FROM ${tableName}
           WHERE user_key = ?
           ORDER BY created_at DESC, id DESC`,
          [userKey]
        )

        return rows.map(mapRowToItem)
      })
    },
    async createItem(userKey, item) {
      return withConnection(async (connection) => {
        await connection.query(
          `INSERT INTO ${tableName} (user_key, item_id, name, code, price, original_price, sold, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
          [userKey, item.id, item.name, item.code, item.price, item.originalPrice, toMysqlDateTime(item.createdAt)]
        )

        return item
      })
    },
    async markSold(userKey, itemId) {
      return withConnection(async (connection) => {
        const [result] = await connection.query(
          `UPDATE ${tableName}
           SET sold = 1
           WHERE user_key = ? AND item_id = ?`,
          [userKey, itemId]
        )

        return Number(result?.affectedRows || 0) > 0
      })
    },
    async deleteItem(userKey, itemId) {
      return withConnection(async (connection) => {
        const [result] = await connection.query(
          `DELETE FROM ${tableName}
           WHERE user_key = ? AND item_id = ?`,
          [userKey, itemId]
        )

        return Number(result?.affectedRows || 0) > 0
      })
    }
  }
}

export function createQuanshangApiMiddleware(env = process.env) {
  const storage = createMysqlStorage(env)

  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/quanshang')) {
      next()
      return
    }

    const requestUrl = new URL(req.url, 'http://127.0.0.1')
    const itemMatch = requestUrl.pathname.match(
      /^\/api\/quanshang\/items(?:\/([A-Za-z0-9_-]{1,64}))?(?:\/sold)?$/
    )

    if (!itemMatch) {
      writeJson(res, 404, { message: 'Not found' })
      return
    }

    try {
      const userKey = normalizeUserKey(req)
      const itemId = itemMatch[1] || ''
      const isSoldAction = requestUrl.pathname.endsWith('/sold')

      if (req.method === 'GET' && !itemId && !isSoldAction) {
        const items = await storage.listItems(userKey)
        writeJson(res, 200, { items, source: storage.mode, table: storage.table })
        return
      }

      if (req.method === 'POST' && !itemId && !isSoldAction) {
        const body = await readJsonBody(req)
        const item = normalizeIncomingItem(body)
        const savedItem = await storage.createItem(userKey, item)
        writeJson(res, 201, { item: savedItem, source: storage.mode })
        return
      }

      if (req.method === 'PATCH' && itemId && isSoldAction) {
        const updated = await storage.markSold(userKey, itemId)

        if (!updated) {
          writeJson(res, 404, { message: 'Item not found.' })
          return
        }

        writeJson(res, 200, { ok: true, source: storage.mode })
        return
      }

      if (req.method === 'DELETE' && itemId && !isSoldAction) {
        const deleted = await storage.deleteItem(userKey, itemId)

        if (!deleted) {
          writeJson(res, 404, { message: 'Item not found.' })
          return
        }

        writeJson(res, 200, { ok: true, source: storage.mode })
        return
      }

      writeJson(res, 405, { message: 'Method not allowed' })
    } catch (error) {
      const statusCode = Number(error?.statusCode || 500)

      console.error('[quanshang] request failed', {
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
