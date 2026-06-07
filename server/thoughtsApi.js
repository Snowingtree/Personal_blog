import { randomUUID } from 'node:crypto'
import { createThoughtsImageStorage } from './thoughtsImageStorage.js'
import {
  createThoughtsImageSignature,
  decryptThoughtsValue,
  encryptThoughtsValue,
  verifyThoughtsImageSignature
} from './thoughtsCrypto.js'

const MAX_REQUEST_BODY_SIZE = 6 * 1024 * 1024
const MAX_CONTENT_LENGTH = 500
const MAX_COMMENT_LENGTH = 120
const MAX_COMMENTS = 100
const MAX_TAGS = 10
const MAX_TAG_LENGTH = 24
const MAX_BLOG_TAGS = 100
const DEFAULT_BLOG_TAGS = ['前端', 'Vue', 'JavaScript', 'AI', '工作流']
const supportedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

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

function parseImageUrlTtlSeconds(value) {
  const normalized = normalizeEnvValue(value)

  if (!normalized) {
    return 24 * 60 * 60
  }

  const ttlSeconds = Number(normalized)

  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error('THOUGHTS_IMAGE_URL_TTL_SECONDS must be a positive integer.')
  }

  return ttlSeconds
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
    table: normalizeEnvValue(env.THOUGHTS_MYSQL_TABLE) || 'thought_posts',
    tagTable: normalizeEnvValue(env.THOUGHTS_TAGS_MYSQL_TABLE) || 'thought_tags'
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
        'MySQL thoughts storage requires the mysql2 package. Run "npm install mysql2" before enabling it.'
      )
    }

    throw error
  }
}

async function readJsonBody(req) {
  const chunks = []
  let receivedSize = 0

  for await (const chunk of req) {
    receivedSize += chunk.length

    if (receivedSize > MAX_REQUEST_BODY_SIZE) {
      const error = new Error('Thought request body is too large.')
      error.statusCode = 413
      throw error
    }

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

function writeImage(res, value, mimeType) {
  res.statusCode = 200
  res.setHeader('Content-Type', mimeType)
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(value)
}

function toMysqlDateTime(value) {
  return new Date(value).toISOString().slice(0, 23).replace('T', ' ')
}

function fromMysqlDateTime(value) {
  if (value instanceof Date) {
    return value.toISOString()
  }

  const normalized = String(value ?? '').trim()
  const date = new Date(`${normalized.replace(' ', 'T')}Z`)

  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function normalizeId(value, fallbackFactory = randomUUID) {
  const normalized = normalizeEnvValue(value)
  return /^[A-Za-z0-9_-]{1,64}$/.test(normalized) ? normalized : fallbackFactory()
}

function normalizeIsoDateTime(value, fallbackValue = new Date().toISOString()) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallbackValue : date.toISOString()
}

function normalizeComments(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.slice(0, MAX_COMMENTS).reduce((comments, comment) => {
    const content = typeof comment?.content === 'string'
      ? comment.content.trim().slice(0, MAX_COMMENT_LENGTH)
      : ''

    if (content) {
      comments.push({
        id: normalizeId(comment.id),
        author: 'Liu An',
        content,
        createdAt: normalizeIsoDateTime(comment.createdAt)
      })
    }

    return comments
  }, [])
}

function normalizeTagName(value) {
  return typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LENGTH)
    : ''
}

function normalizeTags(value, fallbackValue = [], maxTags = MAX_TAGS) {
  const sourceTags = Array.isArray(value) ? value : fallbackValue

  if (!Array.isArray(sourceTags)) {
    return []
  }

  const seenTags = new Set()
  const tags = []

  sourceTags.forEach((tag) => {
    const normalizedTag = normalizeTagName(tag)
    const tagKey = normalizedTag.toLowerCase()

    if (normalizedTag && !seenTags.has(tagKey) && tags.length < maxTags) {
      seenTags.add(tagKey)
      tags.push(normalizedTag)
    }
  })

  return tags
}

function normalizeStoredImages(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.slice(0, 4).reduce((images, image) => {
    const id = normalizeEnvValue(image?.id)
    const mimeType = normalizeEnvValue(image?.mimeType)
    const size = Number(image?.size)

    if (
      /^[A-Za-z0-9_-]{1,64}$/.test(id) &&
      supportedMimeTypes.has(mimeType) &&
      Number.isInteger(size) &&
      size > 0
    ) {
      images.push({ id, mimeType, size })
    }

    return images
  }, [])
}

function normalizePostPayload(body, existingPayload = null) {
  const content = typeof body?.content === 'string'
    ? body.content.trim().slice(0, MAX_CONTENT_LENGTH)
    : existingPayload?.content || ''
  const images = existingPayload?.images || []

  if (!content && !images.length) {
    const error = new Error('A thought must contain text or at least one image.')
    error.statusCode = 400
    throw error
  }

  return {
    author: 'Liu An',
    authorInitials: 'LA',
    content,
    images,
    tags: normalizeTags(body?.tags, existingPayload?.tags || []),
    comments: normalizeComments(body?.comments),
    deletedAt: existingPayload?.deletedAt || ''
  }
}

function createImageUrl(image, env) {
  const expiresAt = Math.floor(Date.now() / 1000) + parseImageUrlTtlSeconds(
    env.THOUGHTS_IMAGE_URL_TTL_SECONDS
  )
  const signature = createThoughtsImageSignature(image.id, image.mimeType, expiresAt, env)
  const searchParams = new URLSearchParams({
    type: image.mimeType,
    expires: String(expiresAt),
    signature
  })

  return `/api/thoughts/images/${encodeURIComponent(image.id)}?${searchParams.toString()}`
}

function mapPostForResponse(post, env) {
  return {
    id: post.id,
    ...post.payload,
    images: post.payload.images.map((image) => ({
      ...image,
      src: createImageUrl(image, env)
    })),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    deletedAt: post.payload.deletedAt || ''
  }
}

function parseStoredPayload(value, env) {
  const payload = JSON.parse(decryptThoughtsValue(String(value ?? ''), env))

  return {
    author: 'Liu An',
    authorInitials: 'LA',
    content: typeof payload?.content === 'string' ? payload.content : '',
    images: normalizeStoredImages(payload?.images),
    tags: normalizeTags(payload?.tags),
    comments: normalizeComments(payload?.comments),
    deletedAt: payload?.deletedAt ? normalizeIsoDateTime(payload.deletedAt, '') : ''
  }
}

function createMysqlStorage(env) {
  const config = getMysqlConfig(env)
  const tableName = quoteIdentifier(config.table, 'THOUGHTS_MYSQL_TABLE')
  const tagTableName = quoteIdentifier(config.tagTable, 'THOUGHTS_TAGS_MYSQL_TABLE')
  let poolPromise = null

  async function tableExists(connection, table) {
    const [rows] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table]
    )

    return Number(rows?.[0]?.count || 0) > 0
  }

  async function ensureTable(connection) {
    const tagTableExisted = await tableExists(connection, config.tagTable)

    await connection.query(
      `CREATE TABLE IF NOT EXISTS ${tableName} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        post_id VARCHAR(64) NOT NULL,
        payload_cipher MEDIUMTEXT NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        UNIQUE KEY uniq_post_id (post_id),
        KEY idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    )

    await connection.query(
      `CREATE TABLE IF NOT EXISTS ${tagTableName} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        tag_name VARCHAR(${MAX_TAG_LENGTH}) NOT NULL,
        tag_key VARCHAR(${MAX_TAG_LENGTH}) NOT NULL,
        sort_order INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        UNIQUE KEY uniq_tag_key (tag_key),
        KEY idx_sort_order (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    )

    if (!tagTableExisted) {
      await seedDefaultTags(connection)
    }
  }

  async function seedDefaultTags(connection) {
    const now = new Date().toISOString()
    const tags = normalizeTags(DEFAULT_BLOG_TAGS, [], MAX_BLOG_TAGS)

    await Promise.all(
      tags.map((tag, index) => connection.query(
        `INSERT IGNORE INTO ${tagTableName}
          (tag_name, tag_key, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          tag,
          tag.toLowerCase(),
          index,
          toMysqlDateTime(now),
          toMysqlDateTime(now)
        ]
      ))
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

  function mapRowToPost(row) {
    return {
      id: String(row.post_id ?? ''),
      payload: parseStoredPayload(row.payload_cipher, env),
      createdAt: fromMysqlDateTime(row.created_at),
      updatedAt: fromMysqlDateTime(row.updated_at)
    }
  }

  function mapRowToTag(row) {
    return normalizeTagName(row.tag_name)
  }

  return {
    mode: 'mysql',
    table: config.table,
    tagTable: config.tagTable,
    async listTags() {
      return withConnection(async (connection) => {
        const [rows] = await connection.query(
          `SELECT tag_name
           FROM ${tagTableName}
           ORDER BY sort_order ASC, id ASC`
        )

        return normalizeTags(rows.map(mapRowToTag), [], MAX_BLOG_TAGS)
      })
    },
    async createTag(value) {
      const tag = normalizeTagName(value)

      if (!tag) {
        const error = new Error('Tag name is required.')
        error.statusCode = 400
        throw error
      }

      return withConnection(async (connection) => {
        const tagKey = tag.toLowerCase()
        const [existingRows] = await connection.query(
          `SELECT tag_name
           FROM ${tagTableName}
           WHERE tag_key = ?
           LIMIT 1`,
          [tagKey]
        )

        if (existingRows.length) {
          return { tag: mapRowToTag(existingRows[0]), created: false }
        }

        const [countRows] = await connection.query(
          `SELECT COUNT(*) AS count
           FROM ${tagTableName}`
        )

        if (Number(countRows?.[0]?.count || 0) >= MAX_BLOG_TAGS) {
          const error = new Error(`A maximum of ${MAX_BLOG_TAGS} tags is allowed.`)
          error.statusCode = 400
          throw error
        }

        const [orderRows] = await connection.query(
          `SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_order
           FROM ${tagTableName}`
        )
        const now = new Date().toISOString()

        try {
          await connection.query(
            `INSERT INTO ${tagTableName}
              (tag_name, tag_key, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
            [
              tag,
              tagKey,
              Number(orderRows?.[0]?.next_order || 0),
              toMysqlDateTime(now),
              toMysqlDateTime(now)
            ]
          )
        } catch (error) {
          if (error instanceof Error && error.code === 'ER_DUP_ENTRY') {
            return { tag, created: false }
          }

          throw error
        }

        return { tag, created: true }
      })
    },
    async deleteTag(value) {
      const tag = normalizeTagName(value)

      if (!tag) {
        return false
      }

      return withConnection(async (connection) => {
        const [result] = await connection.query(
          `DELETE FROM ${tagTableName}
           WHERE tag_key = ?`,
          [tag.toLowerCase()]
        )

        return Number(result?.affectedRows || 0) > 0
      })
    },
    async listPosts(options = {}) {
      return withConnection(async (connection) => {
        const [rows] = await connection.query(
          `SELECT post_id, payload_cipher, created_at, updated_at
           FROM ${tableName}
           ORDER BY created_at DESC`
        )

        return rows
          .map(mapRowToPost)
          .filter((post) => {
            const isDeleted = Boolean(post.payload.deletedAt)

            if (options.onlyDeleted) {
              return isDeleted
            }

            if (options.includeDeleted) {
              return true
            }

            return !isDeleted
          })
      })
    },
    async getPost(postId) {
      return withConnection(async (connection) => {
        const [rows] = await connection.query(
          `SELECT post_id, payload_cipher, created_at, updated_at
           FROM ${tableName}
           WHERE post_id = ?
           LIMIT 1`,
          [postId]
        )

        return rows.length ? mapRowToPost(rows[0]) : null
      })
    },
    async createPost(payload) {
      return withConnection(async (connection) => {
        const now = new Date().toISOString()
        const post = {
          id: randomUUID(),
          payload,
          createdAt: now,
          updatedAt: now
        }

        await connection.query(
          `INSERT INTO ${tableName} (post_id, payload_cipher, created_at, updated_at)
           VALUES (?, ?, ?, ?)`,
          [
            post.id,
            encryptThoughtsValue(JSON.stringify(post.payload), env),
            toMysqlDateTime(post.createdAt),
            toMysqlDateTime(post.updatedAt)
          ]
        )

        return post
      })
    },
    async updatePost(postId, payload) {
      return withConnection(async (connection) => {
        const updatedAt = new Date().toISOString()
        const [result] = await connection.query(
          `UPDATE ${tableName}
           SET payload_cipher = ?, updated_at = ?
           WHERE post_id = ?`,
          [
            encryptThoughtsValue(JSON.stringify(payload), env),
            toMysqlDateTime(updatedAt),
            postId
          ]
        )

        if (!Number(result?.affectedRows || 0)) {
          return null
        }

        return {
          id: postId,
          payload,
          createdAt: updatedAt,
          updatedAt
        }
      })
    },
    async deletePost(postId) {
      return withConnection(async (connection) => {
        const [result] = await connection.query(
          `DELETE FROM ${tableName} WHERE post_id = ?`,
          [postId]
        )

        return Number(result?.affectedRows || 0) > 0
      })
    },
    async softDeletePost(postId, payload) {
      return this.updatePost(postId, {
        ...payload,
        deletedAt: new Date().toISOString()
      })
    },
    async restorePost(postId, payload) {
      return this.updatePost(postId, {
        ...payload,
        deletedAt: ''
      })
    }
  }
}

function normalizeImageRequest(requestUrl, env) {
  const imageMatch = requestUrl.pathname.match(/^\/api\/thoughts\/images\/([A-Za-z0-9_-]{1,64})$/)

  if (!imageMatch) {
    return null
  }

  const imageId = imageMatch[1]
  const mimeType = normalizeEnvValue(requestUrl.searchParams.get('type'))
  const signature = normalizeEnvValue(requestUrl.searchParams.get('signature'))
  const expiresAt = Number(requestUrl.searchParams.get('expires'))

  if (
    !supportedMimeTypes.has(mimeType) ||
    !Number.isInteger(expiresAt) ||
    expiresAt <= Math.floor(Date.now() / 1000) ||
    !verifyThoughtsImageSignature(imageId, mimeType, expiresAt, signature, env)
  ) {
    const error = new Error('Thought image URL is invalid or expired.')
    error.statusCode = 403
    throw error
  }

  return { imageId, mimeType }
}

function decodePathValue(value) {
  try {
    return decodeURIComponent(String(value || ''))
  } catch {
    const error = new Error('Request path is invalid.')
    error.statusCode = 400
    throw error
  }
}

export function createThoughtsApiMiddleware(env = process.env) {
  const storage = createMysqlStorage(env)
  const imageStorage = createThoughtsImageStorage(env)

  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/thoughts')) {
      next()
      return
    }

    const requestUrl = new URL(req.url, 'http://127.0.0.1')

    try {
      const imageRequest = normalizeImageRequest(requestUrl, env)

      if (imageRequest) {
        if (req.method !== 'GET') {
          writeJson(res, 405, { message: 'Method not allowed' })
          return
        }

        const value = await imageStorage.readImage(imageRequest.imageId)
        writeImage(res, value, imageRequest.mimeType)
        return
      }

      const restoreMatch = requestUrl.pathname.match(
        /^\/api\/thoughts\/posts\/([A-Za-z0-9_-]{1,64})\/restore$/
      )
      const postMatch = requestUrl.pathname.match(
        /^\/api\/thoughts\/posts(?:\/([A-Za-z0-9_-]{1,64}))?$/
      )
      const tagMatch = requestUrl.pathname.match(
        /^\/api\/thoughts\/tags(?:\/([^/]+))?$/
      )

      if (!postMatch && !restoreMatch && !tagMatch) {
        writeJson(res, 404, { message: 'Not found' })
        return
      }

      if (tagMatch) {
        const tagName = tagMatch[1] ? decodePathValue(tagMatch[1]) : ''

        if (req.method === 'GET' && !tagName) {
          const tags = await storage.listTags()
          writeJson(res, 200, {
            tags,
            source: storage.mode,
            table: storage.tagTable
          })
          return
        }

        if (req.method === 'POST' && !tagName) {
          const body = await readJsonBody(req)
          const result = await storage.createTag(body?.tag)
          const tags = await storage.listTags()
          writeJson(res, result.created ? 201 : 200, {
            tag: result.tag,
            tags,
            created: result.created,
            source: storage.mode,
            table: storage.tagTable
          })
          return
        }

        if (req.method === 'DELETE' && tagName) {
          const deleted = await storage.deleteTag(tagName)
          const tags = await storage.listTags()
          writeJson(res, 200, {
            ok: true,
            deleted,
            tags,
            source: storage.mode,
            table: storage.tagTable
          })
          return
        }

        writeJson(res, 405, { message: 'Method not allowed' })
        return
      }

      if (restoreMatch) {
        if (req.method !== 'POST') {
          writeJson(res, 405, { message: 'Method not allowed' })
          return
        }

        const restorePostId = restoreMatch[1]
        const existingPost = await storage.getPost(restorePostId)

        if (!existingPost) {
          writeJson(res, 404, { message: 'Thought not found.' })
          return
        }

        const post = await storage.restorePost(restorePostId, existingPost.payload)

        if (!post) {
          writeJson(res, 404, { message: 'Thought not found.' })
          return
        }

        writeJson(res, 200, {
          post: mapPostForResponse({
            ...post,
            createdAt: existingPost.createdAt
          }, env),
          source: storage.mode
        })
        return
      }

      const postId = postMatch?.[1] || ''

      if (req.method === 'GET' && !postId) {
        const posts = await storage.listPosts({
          onlyDeleted: requestUrl.searchParams.get('view') === 'trash'
        })
        writeJson(res, 200, {
          posts: posts.map((post) => mapPostForResponse(post, env)),
          source: storage.mode,
          table: storage.table
        })
        return
      }

      if (req.method === 'POST' && !postId) {
        const body = await readJsonBody(req)
        const images = await imageStorage.saveImages(body.images)

        try {
          const payload = normalizePostPayload(body, { images })
          const post = await storage.createPost(payload)
          writeJson(res, 201, {
            post: mapPostForResponse(post, env),
            source: storage.mode
          })
        } catch (error) {
          await imageStorage.deleteImages(images)
          throw error
        }
        return
      }

      if (req.method === 'PUT' && postId) {
        const existingPost = await storage.getPost(postId)

        if (!existingPost) {
          writeJson(res, 404, { message: 'Thought not found.' })
          return
        }

        const body = await readJsonBody(req)
        const payload = normalizePostPayload(body, existingPost.payload)
        const post = await storage.updatePost(postId, payload)

        if (!post) {
          writeJson(res, 404, { message: 'Thought not found.' })
          return
        }

        writeJson(res, 200, {
          post: mapPostForResponse({
            ...post,
            createdAt: existingPost.createdAt
          }, env),
          source: storage.mode
        })
        return
      }

      if (req.method === 'DELETE' && postId) {
        const existingPost = await storage.getPost(postId)

        if (!existingPost) {
          writeJson(res, 404, { message: 'Thought not found.' })
          return
        }

        if (requestUrl.searchParams.get('force') === 'true') {
          await storage.deletePost(postId)
          await imageStorage.deleteImages(existingPost.payload.images)
          writeJson(res, 200, {
            ok: true,
            deleted: true,
            source: storage.mode
          })
          return
        }

        await storage.softDeletePost(postId, existingPost.payload)
        writeJson(res, 200, {
          ok: true,
          deleted: false,
          movedToTrash: true,
          source: storage.mode
        })
        return
      }

      writeJson(res, 405, { message: 'Method not allowed' })
    } catch (error) {
      const statusCode = Number(error?.statusCode || (
        error instanceof Error && 'code' in error && error.code === 'ENOENT' ? 404 : 500
      ))

      console.error('[thoughts] request failed', {
        method: req.method,
        path: requestUrl.pathname,
        storageMode: storage.mode,
        table: storage.table,
        tagTable: storage.tagTable,
        message: error instanceof Error ? error.message : 'Unknown server error'
      })

      writeJson(
        res,
        Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600 ? statusCode : 500,
        {
          message: error instanceof Error ? error.message : 'Unknown server error'
        }
      )
    }
  }
}
