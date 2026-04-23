import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { createAnimeApiMiddleware } from './animeApi.js'
import { createAiApiMiddleware } from './aiApi.js'
import { createAiSettingsApiMiddleware } from './aiSettingsApi.js'
import { createAgentApiMiddleware } from './agentApi.js'
import { createAuthApiMiddleware } from './authApi.js'
import { createBlogCheckinApiMiddleware } from './blogCheckinApi.js'
import { createProtectedApiMiddleware } from './authToken.js'
import { createNotesApiMiddleware } from './notesApi.js'

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function unquoteEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function loadDotEnv() {
  const envPath = resolve(process.cwd(), '.env')

  try {
    const content = readFileSync(envPath, 'utf8')

    content.split(/\r?\n/).forEach((line) => {
      const trimmedLine = line.trim()

      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return
      }

      const separatorIndex = trimmedLine.indexOf('=')

      if (separatorIndex === -1) {
        return
      }

      const key = trimmedLine.slice(0, separatorIndex).trim()
      const value = unquoteEnvValue(trimmedLine.slice(separatorIndex + 1).trim())

      if (key && process.env[key] === undefined) {
        process.env[key] = value
      }
    })
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
      throw error
    }
  }
}

function parsePort(value, fallbackPort) {
  const normalized = normalizeEnvValue(value)

  if (!normalized) {
    return fallbackPort
  }

  const port = Number(normalized)

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('API_PORT must be a positive integer.')
  }

  return port
}

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function applyCorsHeaders(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

loadDotEnv()

const port = parsePort(process.env.API_PORT, 3001)
const host = normalizeEnvValue(process.env.API_HOST) || '127.0.0.1'
const corsOrigin = normalizeEnvValue(process.env.CORS_ORIGIN) || '*'
const blogCheckinMiddleware = createBlogCheckinApiMiddleware(process.env)
const authMiddleware = createAuthApiMiddleware(process.env)
const protectedApiMiddleware = createProtectedApiMiddleware(process.env)
const animeMiddleware = createAnimeApiMiddleware(process.env)
const aiSettingsMiddleware = createAiSettingsApiMiddleware(process.env)
const aiMiddleware = createAiApiMiddleware(process.env)
const agentMiddleware = createAgentApiMiddleware(process.env)
const notesMiddleware = createNotesApiMiddleware(process.env)

const server = createServer(async (req, res) => {
  applyCorsHeaders(res, corsOrigin)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.url?.startsWith('/api/health')) {
    writeJson(res, 200, { ok: true })
    return
  }

  await blogCheckinMiddleware(req, res, async () => {
    await authMiddleware(req, res, async () => {
      await protectedApiMiddleware(req, res, async () => {
        await animeMiddleware(req, res, async () => {
          await aiSettingsMiddleware(req, res, async () => {
            await aiMiddleware(req, res, async () => {
              await agentMiddleware(req, res, async () => {
                await notesMiddleware(req, res, () => {
                  writeJson(res, 404, { message: 'Not found' })
                })
              })
            })
          })
        })
      })
    })
  })
})

server.listen(port, host, () => {
  console.log(`App API listening on http://${host}:${port}`)
})
