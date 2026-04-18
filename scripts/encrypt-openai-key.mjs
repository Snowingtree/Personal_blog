import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { encryptOpenAiApiKey } from '../server/openAiKeyCrypto.js'

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

loadDotEnv()

const apiKey = String(process.argv[2] || '').trim()

if (!apiKey) {
  console.error('Usage: npm run encrypt:openai-key -- <plain-api-key>')
  process.exit(1)
}

console.log(encryptOpenAiApiKey(apiKey, process.env))

