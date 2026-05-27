import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const INTERNSHIP_ENCRYPTION_PREFIX = 'enc:internship:v1'

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function getEncryptionSecret(env = process.env) {
  const secret =
    normalizeEnvValue(env.INTERNSHIP_ENCRYPTION_SECRET) ||
    normalizeEnvValue(env.OPENAI_KEY_ENCRYPTION_SECRET)

  if (!secret) {
    throw new Error(
      'INTERNSHIP_ENCRYPTION_SECRET is required to encrypt or decrypt internship records.'
    )
  }

  return secret
}

function deriveEncryptionKey(secret) {
  return createHash('sha256').update(secret).digest()
}

function isEncryptedInternshipValue(value) {
  return normalizeEnvValue(value).startsWith(`${INTERNSHIP_ENCRYPTION_PREFIX}:`)
}

export function encryptInternshipValue(value, env = process.env) {
  const normalizedValue = typeof value === 'string' ? value : String(value ?? '')
  const secret = getEncryptionSecret(env)
  const key = deriveEncryptionKey(secret)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(normalizedValue, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    INTERNSHIP_ENCRYPTION_PREFIX,
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex')
  ].join(':')
}

export function decryptInternshipValue(value, env = process.env) {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''

  if (!normalizedValue) {
    return ''
  }

  if (!isEncryptedInternshipValue(normalizedValue)) {
    throw new Error('Stored internship record value is not encrypted.')
  }

  const parts = normalizedValue.split(':')

  if (parts.length !== 6 || `${parts[0]}:${parts[1]}:${parts[2]}` !== INTERNSHIP_ENCRYPTION_PREFIX) {
    throw new Error('Stored internship record has an invalid encrypted format.')
  }

  const [, , , ivHex, authTagHex, encryptedHex] = parts

  if (!/^[0-9a-f]+$/i.test(ivHex) || !/^[0-9a-f]+$/i.test(authTagHex) || !/^[0-9a-f]+$/i.test(encryptedHex)) {
    throw new Error('Stored internship record has an invalid encrypted payload.')
  }

  try {
    const secret = getEncryptionSecret(env)
    const key = deriveEncryptionKey(secret)
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final()
    ])

    return decrypted.toString('utf8')
  } catch {
    throw new Error(
      'Failed to decrypt stored internship record. Check INTERNSHIP_ENCRYPTION_SECRET and encrypted values.'
    )
  }
}
