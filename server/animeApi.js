import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const animeFilePath = resolve(process.cwd(), 'anime.txt')
const validStorageModes = new Set(['file', 'mysql'])

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseAnimeContent(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.replace(/^\uFEFF/, '').trim())
    .filter((line) => !/^[A-Z]$/i.test(line))
    .filter(Boolean)
}

function serializeAnimeItems(items) {
  if (!items.length) {
    return ''
  }

  return `${items.join('\r\n')}\r\n`
}

function parseGroupedAnimeContent(content) {
  const groups = new Map()
  let currentLetter = ''

  content
    .split(/\r?\n/)
    .map((line) => line.replace(/^\uFEFF/, '').trim())
    .filter(Boolean)
    .forEach((line) => {
      if (/^[A-Z]$/i.test(line)) {
        currentLetter = line.toUpperCase()

        if (!groups.has(currentLetter)) {
          groups.set(currentLetter, [])
        }

        return
      }

      if (!currentLetter) {
        currentLetter = '#'
        groups.set(currentLetter, groups.get(currentLetter) ?? [])
      }

      groups.get(currentLetter).push(line)
    })

  return [...groups.entries()].map(([letter, items]) => ({
    letter,
    items
  }))
}

function serializeGroupedAnimeContent(groups) {
  const rows = []

  groups.forEach(({ letter, items }) => {
    if (/^[A-Z]$/i.test(letter)) {
      rows.push(letter.toUpperCase())
    }

    items.forEach((item) => rows.push(item))
  })

  return rows.length > 0 ? `${rows.join('\r\n')}\r\n` : ''
}

function normalizeMysqlGroupItems(value, letter) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
      return []
    }

    try {
      const parsed = JSON.parse(trimmedValue)

      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item ?? '').trim()).filter(Boolean)
      }
    } catch {
      throw new Error(`Invalid JSON stored in data column for letter "${letter}".`)
    }
  }

  return []
}

function hasMysqlConfig(env) {
  return ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_DATABASE'].every((key) =>
    normalizeEnvValue(env[key])
  )
}

function resolveStorageMode(env) {
  const explicitMode = normalizeEnvValue(env.ANIME_STORAGE).toLowerCase()

  if (explicitMode) {
    if (!validStorageModes.has(explicitMode)) {
      throw new Error('ANIME_STORAGE must be either "file" or "mysql".')
    }

    return explicitMode
  }

  return hasMysqlConfig(env) ? 'mysql' : 'file'
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

function quoteIdentifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error('MYSQL_TABLE may only contain letters, numbers, and underscores.')
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
    table: normalizeEnvValue(env.MYSQL_TABLE) || 'anime_items'
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
        'MySQL storage requires the mysql2 package. Run "npm install mysql2" before enabling MySQL.'
      )
    }

    throw error
  }
}

function createFileStorage() {
  return {
    mode: 'file',
    async readContent() {
      return readFile(animeFilePath, 'utf8')
    },
    async writeContent(content) {
      await writeFile(animeFilePath, content, 'utf8')
    }
  }
}

function createMysqlStorage(env) {
  const config = getMysqlConfig(env)
  const tableName = quoteIdentifier(config.table)
  let poolPromise = null

  async function ensureTable(connection) {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS ${tableName} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        letter VARCHAR(8) NOT NULL,
        data JSON NOT NULL
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
    async readContent() {
      return withConnection(async (connection) => {
        const [rows] = await connection.query(
          `SELECT letter, data FROM ${tableName} ORDER BY letter ASC, id ASC`
        )

        const groups = rows.map((row) => ({
          letter: String(row.letter ?? '').trim().toUpperCase(),
          items: normalizeMysqlGroupItems(row.data, row.letter)
        }))

        return serializeGroupedAnimeContent(groups)
      })
    },
    async writeContent(content) {
      const groups = parseGroupedAnimeContent(content)

      await withConnection(async (connection) => {
        await connection.beginTransaction()

        try {
          await connection.query(`DELETE FROM ${tableName}`)

          if (groups.length > 0) {
            const placeholders = groups.map(() => '(?, ?)').join(', ')
            const values = groups.flatMap(({ letter, items }) => [letter, JSON.stringify(items)])

            await connection.query(
              `INSERT INTO ${tableName} (letter, data) VALUES ${placeholders}`,
              values
            )
          }

          await connection.commit()
        } catch (error) {
          await connection.rollback()
          throw error
        }
      })
    }
  }
}

function createAnimeStorage(env) {
  const mode = resolveStorageMode(env)
  return mode === 'mysql' ? createMysqlStorage(env) : createFileStorage()
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

export function createAnimeApiMiddleware(env = process.env) {
  const storage = createAnimeStorage(env)
  const mysqlTable = normalizeEnvValue(env.MYSQL_TABLE) || 'anime_items'

  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/anime')) {
      next()
      return
    }

    try {
      if (req.method === 'GET') {
        console.info('[anime] request received', {
          method: req.method,
          storageMode: storage.mode,
          table: storage.mode === 'mysql' ? mysqlTable : null
        })
        const content = await storage.readContent()
        console.info('[anime] request succeeded', {
          method: req.method,
          storageMode: storage.mode,
          table: storage.mode === 'mysql' ? mysqlTable : null
        })
        writeJson(res, 200, { content, source: storage.mode })
        return
      }

      if (req.method === 'POST') {
        console.info('[anime] request received', {
          method: req.method,
          storageMode: storage.mode,
          table: storage.mode === 'mysql' ? mysqlTable : null
        })
        const body = await readJsonBody(req)

        if (typeof body.content !== 'string') {
          writeJson(res, 400, { message: 'content must be a string' })
          return
        }

        await storage.writeContent(body.content)
        console.info('[anime] request succeeded', {
          method: req.method,
          storageMode: storage.mode,
          table: storage.mode === 'mysql' ? mysqlTable : null
        })
        writeJson(res, 200, { ok: true, source: storage.mode })
        return
      }

      writeJson(res, 405, { message: 'Method not allowed' })
    } catch (error) {
      console.error('[anime] request failed', {
        method: req.method,
        storageMode: storage.mode,
        table: storage.mode === 'mysql' ? mysqlTable : null,
        message: error instanceof Error ? error.message : 'Unknown server error'
      })
      writeJson(res, 500, {
        message: error instanceof Error ? error.message : 'Unknown server error'
      })
    }
  }
}

export function createAnimeApiPlugin(env = process.env) {
  const middleware = createAnimeApiMiddleware(env)

  return {
    name: 'anime-data-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    }
  }
}
