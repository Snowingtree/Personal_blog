import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { decryptThoughtsImage, encryptThoughtsImage } from './thoughtsCrypto.js'

const MAX_IMAGES = 4
const MAX_IMAGE_SIZE = Math.floor(1.4 * 1024 * 1024)
const MAX_TOTAL_IMAGE_SIZE = Math.floor(3.4 * 1024 * 1024)
const supportedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeImageId(value) {
  const imageId = normalizeEnvValue(value)

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(imageId)) {
    throw new Error('Thought image id is invalid.')
  }

  return imageId
}

function getImageFilePath(imageRoot, imageId) {
  return resolve(imageRoot, `${normalizeImageId(imageId)}.bin`)
}

function hasSupportedFileSignature(mimeType, value) {
  if (mimeType === 'image/jpeg') {
    return value.length >= 3 && value[0] === 0xff && value[1] === 0xd8 && value[2] === 0xff
  }

  if (mimeType === 'image/png') {
    return value.length >= 8 && value.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )
  }

  if (mimeType === 'image/gif') {
    const signature = value.subarray(0, 6).toString('ascii')
    return signature === 'GIF87a' || signature === 'GIF89a'
  }

  return (
    mimeType === 'image/webp' &&
    value.length >= 12 &&
    value.subarray(0, 4).toString('ascii') === 'RIFF' &&
    value.subarray(8, 12).toString('ascii') === 'WEBP'
  )
}

function parseIncomingImage(image) {
  const source = typeof image?.src === 'string' ? image.src.trim() : ''
  const match = source.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/=\r\n]+)$/)

  if (!match) {
    const error = new Error('Thought images must be JPEG, PNG, GIF, or WEBP files.')
    error.statusCode = 400
    throw error
  }

  const [, mimeType, encodedValue] = match
  const value = Buffer.from(encodedValue, 'base64')

  if (!value.length || !hasSupportedFileSignature(mimeType, value)) {
    const error = new Error('Thought image content is invalid.')
    error.statusCode = 400
    throw error
  }

  if (value.length > MAX_IMAGE_SIZE) {
    const error = new Error('A single thought image cannot exceed 1.4 MB.')
    error.statusCode = 400
    throw error
  }

  return {
    mimeType,
    size: value.length,
    value
  }
}

export function createThoughtsImageStorage(env = process.env) {
  const imageRoot = resolve(
    normalizeEnvValue(env.THOUGHTS_IMAGE_DIR) || '/www/wwwroot/wmzh/storage/thought-images'
  )

  async function deleteImage(imageId) {
    try {
      await unlink(getImageFilePath(imageRoot, imageId))
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
        throw error
      }
    }
  }

  return {
    imageRoot,
    async saveImages(images) {
      if (!Array.isArray(images) || !images.length) {
        return []
      }

      if (images.length > MAX_IMAGES) {
        const error = new Error(`A thought can contain at most ${MAX_IMAGES} images.`)
        error.statusCode = 400
        throw error
      }

      const parsedImages = images.map(parseIncomingImage)
      const totalSize = parsedImages.reduce((sum, image) => sum + image.size, 0)

      if (totalSize > MAX_TOTAL_IMAGE_SIZE) {
        const error = new Error('Thought images cannot exceed 3.4 MB in total.')
        error.statusCode = 400
        throw error
      }

      await mkdir(imageRoot, { recursive: true })
      const savedImages = []

      try {
        for (const image of parsedImages) {
          const imageId = randomUUID()
          await writeFile(
            getImageFilePath(imageRoot, imageId),
            encryptThoughtsImage(image.value, env),
            { flag: 'wx' }
          )
          savedImages.push({
            id: imageId,
            mimeType: image.mimeType,
            size: image.size
          })
        }

        return savedImages
      } catch (error) {
        await Promise.allSettled(savedImages.map((image) => deleteImage(image.id)))
        throw error
      }
    },
    async readImage(imageId) {
      const encryptedValue = await readFile(getImageFilePath(imageRoot, imageId))
      return decryptThoughtsImage(encryptedValue, env)
    },
    async deleteImages(images) {
      if (!Array.isArray(images) || !images.length) {
        return
      }

      await Promise.all(images.map((image) => deleteImage(image.id)))
    }
  }
}
