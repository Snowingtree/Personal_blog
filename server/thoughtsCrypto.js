import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from 'node:crypto'

const THOUGHTS_ENCRYPTION_PREFIX = 'enc:thoughts:v1'
const IMAGE_IV_LENGTH = 12
const IMAGE_AUTH_TAG_LENGTH = 16

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function getEncryptionSecret(env = process.env) {
  const secret =
    normalizeEnvValue(env.THOUGHTS_ENCRYPTION_SECRET) ||
    normalizeEnvValue(env.OPENAI_KEY_ENCRYPTION_SECRET)

  if (!secret) {
    throw new Error(
      'THOUGHTS_ENCRYPTION_SECRET is required to encrypt or decrypt thoughts.'
    )
  }

  return secret
}

function deriveEncryptionKey(secret) {
  return createHash('sha256').update(secret).digest()
}

function createImageSignatureValue(imageId, mimeType, expiresAt) {
  return `${imageId}:${mimeType}:${expiresAt}`
}

function toBase64Url(value) {
  return value
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function encryptThoughtsValue(value, env = process.env) {
  const normalizedValue = typeof value === 'string' ? value : String(value ?? '')
  const key = deriveEncryptionKey(getEncryptionSecret(env))
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(normalizedValue, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    THOUGHTS_ENCRYPTION_PREFIX,
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex')
  ].join(':')
}

export function decryptThoughtsValue(value, env = process.env) {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''

  if (!normalizedValue.startsWith(`${THOUGHTS_ENCRYPTION_PREFIX}:`)) {
    throw new Error('Stored thought payload is not encrypted.')
  }

  const parts = normalizedValue.split(':')

  if (parts.length !== 6 || `${parts[0]}:${parts[1]}:${parts[2]}` !== THOUGHTS_ENCRYPTION_PREFIX) {
    throw new Error('Stored thought payload has an invalid encrypted format.')
  }

  const [, , , ivHex, authTagHex, encryptedHex] = parts

  if (
    !/^[0-9a-f]+$/i.test(ivHex) ||
    !/^[0-9a-f]+$/i.test(authTagHex) ||
    !/^[0-9a-f]*$/i.test(encryptedHex)
  ) {
    throw new Error('Stored thought payload has invalid encrypted data.')
  }

  try {
    const key = deriveEncryptionKey(getEncryptionSecret(env))
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final()
    ])

    return decrypted.toString('utf8')
  } catch {
    throw new Error(
      'Failed to decrypt stored thought payload. Check THOUGHTS_ENCRYPTION_SECRET.'
    )
  }
}

export function encryptThoughtsImage(value, env = process.env) {
  const key = deriveEncryptionKey(getEncryptionSecret(env))
  const iv = randomBytes(IMAGE_IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()])

  return Buffer.concat([iv, cipher.getAuthTag(), encrypted])
}

export function decryptThoughtsImage(value, env = process.env) {
  if (!Buffer.isBuffer(value) || value.length < IMAGE_IV_LENGTH + IMAGE_AUTH_TAG_LENGTH) {
    throw new Error('Stored thought image has invalid encrypted data.')
  }

  try {
    const key = deriveEncryptionKey(getEncryptionSecret(env))
    const iv = value.subarray(0, IMAGE_IV_LENGTH)
    const authTag = value.subarray(IMAGE_IV_LENGTH, IMAGE_IV_LENGTH + IMAGE_AUTH_TAG_LENGTH)
    const encrypted = value.subarray(IMAGE_IV_LENGTH + IMAGE_AUTH_TAG_LENGTH)
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    return Buffer.concat([decipher.update(encrypted), decipher.final()])
  } catch {
    throw new Error(
      'Failed to decrypt stored thought image. Check THOUGHTS_ENCRYPTION_SECRET.'
    )
  }
}

export function createThoughtsImageSignature(imageId, mimeType, expiresAt, env = process.env) {
  return toBase64Url(
    createHmac('sha256', getEncryptionSecret(env))
      .update(createImageSignatureValue(imageId, mimeType, expiresAt))
      .digest()
  )
}

export function verifyThoughtsImageSignature(
  imageId,
  mimeType,
  expiresAt,
  signature,
  env = process.env
) {
  const expectedSignature = createThoughtsImageSignature(imageId, mimeType, expiresAt, env)
  const signatureBuffer = Buffer.from(String(signature || ''))
  const expectedBuffer = Buffer.from(expectedSignature)

  return (
    signatureBuffer.length === expectedBuffer.length &&
    timingSafeEqual(signatureBuffer, expectedBuffer)
  )
}
