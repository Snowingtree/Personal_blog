import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const healthBackupRoot = resolve(process.cwd(), 'storage', 'health', 'backups')
const maxImageBytes = 2 * 1024 * 1024
const maxBackupBytes = 8 * 1024 * 1024
const imageIdPattern = /^[A-Za-z0-9_-]{1,100}\.(webp|jpg|jpeg|png)$/i
const deviceIdPattern = /^[A-Za-z0-9_-]{8,100}$/

function normalizeText(value, maxLength = 200) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

async function readJsonBody(req) {
  const chunks = []
  let byteLength = 0

  for await (const chunk of req) {
    byteLength += chunk.length
    if (byteLength > maxBackupBytes) {
      const error = new Error('Backup payload is too large.')
      error.statusCode = 413
      throw error
    }
    chunks.push(chunk)
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim()
  if (!rawBody) return {}

  try {
    return JSON.parse(rawBody)
  } catch {
    const error = new Error('Request body must be valid JSON.')
    error.statusCode = 400
    throw error
  }
}

function getUserDirectory(req) {
  const identity = normalizeText(req.auth?.username || req.auth?.sub, 160)
  if (!identity) {
    const error = new Error('Authentication required.')
    error.statusCode = 401
    throw error
  }

  const userKey = createHash('sha256').update(identity).digest('hex').slice(0, 32)
  return resolve(healthBackupRoot, userKey)
}

function normalizeDeviceId(value) {
  const deviceId = normalizeText(value, 100)
  if (!deviceIdPattern.test(deviceId)) {
    const error = new Error('deviceId is invalid.')
    error.statusCode = 400
    throw error
  }
  return deviceId
}

function normalizeImageId(value) {
  const imageId = normalizeText(value, 100)
  if (!imageIdPattern.test(imageId)) {
    const error = new Error('imageId is invalid.')
    error.statusCode = 400
    throw error
  }
  return imageId
}

function getDeviceDirectory(req, deviceId) {
  return resolve(getUserDirectory(req), deviceId)
}

async function atomicWrite(filePath, content) {
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`
  await writeFile(temporaryPath, content)
  await rename(temporaryPath, filePath)
}

function normalizeBackupRecords(records) {
  if (!Array.isArray(records) || records.length > 20000) {
    const error = new Error('records must be an array with at most 20000 items.')
    error.statusCode = 400
    throw error
  }
  return records
}

function normalizeBackupImages(images) {
  if (!Array.isArray(images) || images.length > 5000) {
    const error = new Error('images must be an array with at most 5000 items.')
    error.statusCode = 400
    throw error
  }
  return images.map(image => ({
    id: normalizeImageId(image?.id),
    name: normalizeText(image?.name, 200)
  }))
}

export function createHealthBackupApiMiddleware() {
  return async (req, res, next) => {
    const requestPath = String(req.url || '').split('?')[0]
    if (!requestPath.startsWith('/api/health/backup')) {
      next()
      return
    }

    try {
      const queryDeviceId = normalizeText(new URL(req.url, 'http://localhost').searchParams.get('deviceId'), 100)

      if (requestPath === '/api/health/backup/images' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const deviceId = normalizeDeviceId(body.deviceId || queryDeviceId)
        const deviceDirectory = getDeviceDirectory(req, deviceId)

        const imageId = normalizeImageId(body.imageId)
        const encoded = normalizeText(body.data, maxImageBytes * 2)
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
          const error = new Error('Image data must be base64.')
          error.statusCode = 400
          throw error
        }

        const bytes = Buffer.from(encoded, 'base64')
        if (!bytes.length || bytes.length > maxImageBytes) {
          const error = new Error('Image is empty or too large.')
          error.statusCode = 413
          throw error
        }

        const imageDirectory = resolve(deviceDirectory, 'images')
        await mkdir(imageDirectory, { recursive: true })
        const imagePath = resolve(imageDirectory, imageId)
        await writeFile(imagePath, bytes, { flag: 'wx' }).catch(error => {
          if (error?.code !== 'EEXIST') throw error
        })
        writeJson(res, 200, { ok: true, imageId, size: bytes.length })
        return
      }

      if (requestPath === '/api/health/backup' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const deviceId = normalizeDeviceId(body.deviceId || queryDeviceId)
        const deviceDirectory = getDeviceDirectory(req, deviceId)

        const records = normalizeBackupRecords(body.records)
        const images = normalizeBackupImages(body.images || [])
        const backup = {
          schemaVersion: Number(body.schemaVersion) || 1,
          backupId: normalizeText(body.backupId, 120) || randomUUID(),
          deviceId,
          exportedAt: normalizeText(body.exportedAt, 50) || new Date().toISOString(),
          uploadedAt: new Date().toISOString(),
          records,
          images
        }

        await mkdir(deviceDirectory, { recursive: true })
        await atomicWrite(resolve(deviceDirectory, 'latest.json'), `${JSON.stringify(backup, null, 2)}\n`)
        writeJson(res, 200, {
          ok: true,
          backupId: backup.backupId,
          uploadedAt: backup.uploadedAt,
          recordCount: records.length,
          imageCount: images.length
        })
        return
      }

      if (requestPath === '/api/health/backup' && req.method === 'GET') {
        const deviceId = normalizeDeviceId(queryDeviceId)
        const deviceDirectory = getDeviceDirectory(req, deviceId)
        try {
          const backup = JSON.parse(await readFile(resolve(deviceDirectory, 'latest.json'), 'utf8'))
          writeJson(res, 200, backup)
        } catch (error) {
          if (error?.code === 'ENOENT') {
            writeJson(res, 404, { message: 'No health backup found.' })
            return
          }
          throw error
        }
        return
      }

      writeJson(res, 405, { message: 'Method not allowed.' })
    } catch (error) {
      writeJson(res, error?.statusCode || 500, {
        message: error instanceof Error ? error.message : 'Health backup failed.'
      })
    }
  }
}
