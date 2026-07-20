import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const VALUE_PREFIX = 'enc:xianyu:v1'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function getEncryptionSecret(env = process.env) {
  const secret = normalizeEnvValue(env.XIANYU_ENCRYPTION_SECRET)

  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('XIANYU_ENCRYPTION_SECRET must contain at least 32 bytes.')
  }

  return secret
}

function deriveEncryptionKey(env) {
  return createHash('sha256').update(getEncryptionSecret(env), 'utf8').digest()
}

export function encryptXianyuValue(value, env = process.env) {
  const normalizedValue = typeof value === 'string' ? value : String(value ?? '')
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', deriveEncryptionKey(env), iv)
  const encrypted = Buffer.concat([cipher.update(normalizedValue, 'utf8'), cipher.final()])

  return [
    VALUE_PREFIX,
    iv.toString('hex'),
    cipher.getAuthTag().toString('hex'),
    encrypted.toString('hex')
  ].join(':')
}

export function decryptXianyuValue(value, env = process.env) {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''
  const parts = normalizedValue.split(':')

  if (
    parts.length !== 6
    || `${parts[0]}:${parts[1]}:${parts[2]}` !== VALUE_PREFIX
    || !/^[0-9a-f]{24}$/i.test(parts[3])
    || !/^[0-9a-f]{32}$/i.test(parts[4])
    || !/^[0-9a-f]*$/i.test(parts[5])
  ) {
    throw new Error('Stored Xianyu value has invalid encrypted data.')
  }

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      deriveEncryptionKey(env),
      Buffer.from(parts[3], 'hex')
    )
    decipher.setAuthTag(Buffer.from(parts[4], 'hex'))

    return Buffer.concat([
      decipher.update(Buffer.from(parts[5], 'hex')),
      decipher.final()
    ]).toString('utf8')
  } catch {
    throw new Error('Failed to decrypt stored Xianyu value.')
  }
}

export function encryptXianyuImage(value, env = process.env) {
  if (!Buffer.isBuffer(value)) {
    throw new Error('Xianyu image must be a Buffer.')
  }

  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', deriveEncryptionKey(env), iv)
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()])

  return Buffer.concat([iv, cipher.getAuthTag(), encrypted])
}

export function decryptXianyuImage(value, env = process.env) {
  if (!Buffer.isBuffer(value) || value.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Stored Xianyu image has invalid encrypted data.')
  }

  try {
    const iv = value.subarray(0, IV_LENGTH)
    const authTag = value.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = value.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
    const decipher = createDecipheriv('aes-256-gcm', deriveEncryptionKey(env), iv)
    decipher.setAuthTag(authTag)

    return Buffer.concat([decipher.update(encrypted), decipher.final()])
  } catch {
    throw new Error('Failed to decrypt stored Xianyu image.')
  }
}
