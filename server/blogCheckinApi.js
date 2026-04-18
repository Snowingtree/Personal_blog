import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const blogCheckinFilePath = resolve(process.cwd(), 'blog-checkins.json')
const validStorageModes = new Set(['file', 'mysql'])

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

function hasMysqlConfig(env) {
  return ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_DATABASE'].every((key) =>
    normalizeEnvValue(env[key])
  )
}

function resolveStorageMode(env) {
  const explicitMode = normalizeEnvValue(env.BLOG_CHECKIN_STORAGE).toLowerCase()

  if (explicitMode) {
    if (!validStorageModes.has(explicitMode)) {
      throw new Error('BLOG_CHECKIN_STORAGE must be either "file" or "mysql".')
    }

    return explicitMode
  }

  return hasMysqlConfig(env) ? 'mysql' : 'file'
}

function getCheckinTimeZone(env) {
  const timeZone = normalizeEnvValue(env.BLOG_CHECKIN_TIME_ZONE) || 'Asia/Shanghai'

  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
  } catch {
    throw new Error('BLOG_CHECKIN_TIME_ZONE must be a valid IANA time zone.')
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

function normalizeCheckinDates(value) {
  const entries = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray(value.dates)
      ? value.dates
      : []

  return [...new Set(entries.map((item) => String(item ?? '').trim()).filter(Boolean))]
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item))
    .sort()
}

function getMysqlConfig(env) {
  const config = {
    host: normalizeEnvValue(env.MYSQL_HOST),
    port: parseMysqlPort(env.MYSQL_PORT),
    user: normalizeEnvValue(env.MYSQL_USER),
    password: normalizeEnvValue(env.MYSQL_PASSWORD),
    database: normalizeEnvValue(env.MYSQL_DATABASE),
    table: normalizeEnvValue(env.BLOG_CHECKIN_MYSQL_TABLE) || 'blog_checkins'
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
        'MySQL blog check-in storage requires the mysql2 package. Run "npm install mysql2" before enabling MySQL.'
      )
    }

    throw error
  }
}

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function createFileStorage() {
  return {
    mode: 'file',
    async readDates() {
      try {
        const content = await readFile(blogCheckinFilePath, 'utf8')
        return normalizeCheckinDates(JSON.parse(content))
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          return []
        }

        throw error
      }
    },
    async writeToday(dateKey) {
      const currentDates = await this.readDates()

      if (currentDates.includes(dateKey)) {
        return {
          inserted: false,
          dates: currentDates
        }
      }

      const nextDates = normalizeCheckinDates([...currentDates, dateKey])
      await writeFile(blogCheckinFilePath, `${JSON.stringify(nextDates, null, 2)}\n`, 'utf8')

      return {
        inserted: true,
        dates: nextDates
      }
    }
  }
}

function createMysqlStorage(env) {
  const config = getMysqlConfig(env)
  const tableName = quoteIdentifier(config.table, 'BLOG_CHECKIN_MYSQL_TABLE')
  let poolPromise = null

  async function ensureTable(connection) {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS ${tableName} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        checkin_date DATE NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_checkin_date (checkin_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    )
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
    async readDates() {
      return withConnection(async (connection) => {
        const [rows] = await connection.query(
          `SELECT DATE_FORMAT(checkin_date, '%Y-%m-%d') AS checkinDate
           FROM ${tableName}
           ORDER BY checkin_date ASC`
        )

        return normalizeCheckinDates(rows.map((row) => row.checkinDate))
      })
    },
    async writeToday(dateKey) {
      return withConnection(async (connection) => {
        const [result] = await connection.query(
          `INSERT IGNORE INTO ${tableName} (checkin_date) VALUES (?)`,
          [dateKey]
        )
        const [rows] = await connection.query(
          `SELECT DATE_FORMAT(checkin_date, '%Y-%m-%d') AS checkinDate
           FROM ${tableName}
           ORDER BY checkin_date ASC`
        )

        return {
          inserted: Number(result?.affectedRows || 0) > 0,
          dates: normalizeCheckinDates(rows.map((row) => row.checkinDate))
        }
      })
    }
  }
}

function createBlogCheckinStorage(env) {
  const mode = resolveStorageMode(env)
  return mode === 'mysql' ? createMysqlStorage(env) : createFileStorage()
}

export function createBlogCheckinApiMiddleware(env = process.env) {
  const storage = createBlogCheckinStorage(env)
  const timeZone = getCheckinTimeZone(env)

  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/blog/checkins')) {
      next()
      return
    }

    const requestUrl = new URL(req.url, 'http://127.0.0.1')

    if (requestUrl.pathname !== '/api/blog/checkins') {
      writeJson(res, 404, { message: 'Not found' })
      return
    }

    try {
      const today = formatDateKey(new Date(), timeZone)

      if (req.method === 'GET') {
        const dates = await storage.readDates()
        writeJson(res, 200, {
          dates,
          today,
          source: storage.mode,
          timeZone
        })
        return
      }

      if (req.method === 'POST') {
        const result = await storage.writeToday(today)
        writeJson(res, 200, {
          ok: true,
          inserted: result.inserted,
          dates: result.dates,
          today,
          source: storage.mode,
          timeZone
        })
        return
      }

      writeJson(res, 405, { message: 'Method not allowed' })
    } catch (error) {
      writeJson(res, 500, {
        message: error instanceof Error ? error.message : 'Unknown server error'
      })
    }
  }
}
