import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DEFAULT_GATEWAY = 'https://eco.taobao.com/router/rest'
const DEFAULT_METHOD = 'taobao.time.get'

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
      const value = trimmedLine.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')

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

function parseArgs(argv) {
  const options = {
    method: process.env.TAOBAO_API_METHOD || DEFAULT_METHOD,
    gateway: process.env.TAOBAO_API_GATEWAY || DEFAULT_GATEWAY,
    session: process.env.TAOBAO_SESSION || '',
    params: {}
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--method') {
      options.method = argv[index + 1] || options.method
      index += 1
      continue
    }

    if (arg === '--gateway') {
      options.gateway = argv[index + 1] || options.gateway
      index += 1
      continue
    }

    if (arg === '--session') {
      options.session = argv[index + 1] || options.session
      index += 1
      continue
    }

    if (arg === '--param') {
      const nextParam = argv[index + 1] || ''
      const separatorIndex = nextParam.indexOf('=')

      if (separatorIndex > 0) {
        options.params[nextParam.slice(0, separatorIndex)] = nextParam.slice(separatorIndex + 1)
      }

      index += 1
    }
  }

  return options
}

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + ' ' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join(':')
}

function signTopParams(params, appSecret) {
  const signPayload = Object.keys(params)
    .filter((key) => key !== 'sign' && params[key] !== undefined && params[key] !== null)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join('')

  return createHash('md5')
    .update(`${appSecret}${signPayload}${appSecret}`, 'utf8')
    .digest('hex')
    .toUpperCase()
}

function assertConfig(appKey, appSecret) {
  const missingKeys = []

  if (!appKey) missingKeys.push('TAOBAO_APP_KEY')
  if (!appSecret) missingKeys.push('TAOBAO_APP_SECRET')

  if (missingKeys.length) {
    throw new Error(`Missing ${missingKeys.join(', ')}. Put them in .env first.`)
  }
}

function redact(value) {
  if (!value || value.length <= 8) {
    return '***'
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

loadDotEnv()

const appKey = process.env.TAOBAO_APP_KEY || process.env.XIAN_YU_APP_KEY || ''
const appSecret = process.env.TAOBAO_APP_SECRET || process.env.XIAN_YU_APP_SECRET || ''
const options = parseArgs(process.argv.slice(2))

assertConfig(appKey, appSecret)

const params = {
  method: options.method,
  app_key: appKey,
  timestamp: formatTimestamp(new Date()),
  format: 'json',
  v: '2.0',
  sign_method: 'md5',
  ...options.params
}

if (options.session) {
  params.session = options.session
}

params.sign = signTopParams(params, appSecret)

const body = new URLSearchParams(params)
const response = await fetch(options.gateway, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
  },
  body
})

const responseText = await response.text()

console.log(`Gateway: ${options.gateway}`)
console.log(`Method: ${options.method}`)
console.log(`App key: ${redact(appKey)}`)
console.log(`HTTP: ${response.status} ${response.statusText}`)

try {
  console.log(JSON.stringify(JSON.parse(responseText), null, 2))
} catch {
  console.log(responseText)
}
