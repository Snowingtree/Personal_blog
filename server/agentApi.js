import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import {
  buildChatCompletionsConversationRequestBody,
  buildResponsesChatRequestBody,
  createOpenAiApiKeyStore,
  extractChatCompletionsText,
  extractResponseText,
  extractUsageMetrics,
  getOpenAiConfig,
  normalizeRequestedAiId,
  normalizeRequestedGenerationConfig,
  normalizeRequestedModel,
  postAiProviderJson
} from './aiProvider.js'

const agentPromptFile = new URL('./prompts/agent-system.txt', import.meta.url)
const agentStorageDirPath = resolve(process.cwd(), 'storage', 'agent', 'sessions')
const agentSessionPrefix = 'agent_session_'
const defaultGenerationConfig = Object.freeze({
  temperature: 0.4,
  topP: 1
})
const defaultTaskStatus = 'in_progress'
const chatHistoryLimit = 10

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
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
    const error = new Error('Request body must be valid JSON.')
    error.statusCode = 400
    throw error
  }
}

async function loadAgentSystemPrompt() {
  const prompt = (await readFile(agentPromptFile, 'utf8')).replace(/\r\n/g, '\n').trim()

  if (!prompt) {
    throw new Error('Agent system prompt is empty.')
  }

  return prompt
}

function getSessionFilePath(sessionId) {
  return resolve(agentStorageDirPath, `${sessionId}.json`)
}

function createSessionId() {
  return `${agentSessionPrefix}${randomUUID().replace(/-/g, '').slice(0, 20)}`
}

function createTaskId() {
  return `task_${randomUUID().replace(/-/g, '').slice(0, 18)}`
}

function normalizeSessionId(value) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    return ''
  }

  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(normalized)) {
    const error = new Error('sessionId is invalid.')
    error.statusCode = 400
    throw error
  }

  return normalized
}

function normalizeMessageText(value, fieldName = 'message') {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    const error = new Error(`${fieldName} is required.`)
    error.statusCode = 400
    throw error
  }

  if (normalized.length > 8000 || /[\0]/.test(normalized)) {
    const error = new Error(`${fieldName} must be a valid text string no longer than 8000 characters.`)
    error.statusCode = 400
    throw error
  }

  return normalized
}

function normalizeOptionalText(value, maxLength = 240) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    return ''
  }

  return normalized.slice(0, maxLength)
}

function createSessionTitleFromText(value) {
  const normalized = normalizeOptionalText(value, 60).replace(/\s+/g, ' ')

  if (!normalized) {
    return '新会话'
  }

  return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized
}

function normalizeStoredMessage(value) {
  const role = value?.role === 'assistant' ? 'assistant' : value?.role === 'user' ? 'user' : ''
  const content = normalizeOptionalText(value?.content, 8000)

  if (!role || !content) {
    return null
  }

  return {
    messageId: normalizeOptionalText(value?.messageId, 80) || `msg_${randomUUID().slice(0, 8)}`,
    role,
    content,
    createdAt: normalizeOptionalText(value?.createdAt, 40) || new Date().toISOString(),
    model: normalizeOptionalText(value?.model, 120),
    usage: {
      inputTokens: Number.isFinite(value?.usage?.inputTokens) ? value.usage.inputTokens : null,
      outputTokens: Number.isFinite(value?.usage?.outputTokens) ? value.usage.outputTokens : null,
      totalTokens: Number.isFinite(value?.usage?.totalTokens) ? value.usage.totalTokens : null
    }
  }
}

function normalizeStoredTask(value, fallbackTitle = '当前任务') {
  if (!value || typeof value !== 'object') {
    return {
      taskId: createTaskId(),
      title: fallbackTitle,
      status: defaultTaskStatus,
      summary: '',
      updatedAt: new Date().toISOString()
    }
  }

  return {
    taskId: normalizeOptionalText(value.taskId, 80) || createTaskId(),
    title: normalizeOptionalText(value.title, 160) || fallbackTitle,
    status: normalizeOptionalText(value.status, 40) || defaultTaskStatus,
    summary: normalizeOptionalText(value.summary, 400),
    updatedAt: normalizeOptionalText(value.updatedAt, 40) || new Date().toISOString()
  }
}

function normalizeStoredSession(value, username) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const sessionId = normalizeSessionId(value.sessionId)
  const owner = normalizeOptionalText(value.username, 120)

  if (!sessionId || !owner || owner !== username) {
    return null
  }

  const title = normalizeOptionalText(value.title, 160) || '新会话'
  const messages = Array.isArray(value.messages)
    ? value.messages.map((item) => normalizeStoredMessage(item)).filter(Boolean)
    : []
  const task = normalizeStoredTask(value.task, title)
  const lastMessage = messages[messages.length - 1] || null

  return {
    sessionId,
    username: owner,
    title,
    status: normalizeOptionalText(value.status, 40) || 'active',
    createdAt: normalizeOptionalText(value.createdAt, 40) || new Date().toISOString(),
    updatedAt: normalizeOptionalText(value.updatedAt, 40) || new Date().toISOString(),
    lastMessageAt:
      normalizeOptionalText(value.lastMessageAt, 40) ||
      lastMessage?.createdAt ||
      normalizeOptionalText(value.updatedAt, 40) ||
      new Date().toISOString(),
    lastAiId: normalizeOptionalText(value.lastAiId, 120),
    lastModel: normalizeOptionalText(value.lastModel, 120),
    messages,
    task
  }
}

async function ensureAgentStorageDir() {
  await mkdir(agentStorageDirPath, { recursive: true })
}

async function readSessionById(sessionId, username) {
  const normalizedSessionId = normalizeSessionId(sessionId)

  try {
    const content = await readFile(getSessionFilePath(normalizedSessionId), 'utf8')
    const parsed = JSON.parse(content)
    const session = normalizeStoredSession(parsed, username)

    if (!session) {
      const error = new Error('Agent session was not found.')
      error.statusCode = 404
      throw error
    }

    return session
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      const missingError = new Error('Agent session was not found.')
      missingError.statusCode = 404
      throw missingError
    }

    throw error
  }
}

async function writeSession(session) {
  await ensureAgentStorageDir()
  await writeFile(getSessionFilePath(session.sessionId), `${JSON.stringify(session, null, 2)}\n`, 'utf8')
}

function serializeSessionSummary(session) {
  return {
    sessionId: session.sessionId,
    title: session.title,
    status: session.status,
    messageCount: session.messages.length,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    lastMessageAt: session.lastMessageAt,
    lastAiId: session.lastAiId,
    lastModel: session.lastModel,
    task: session.task
  }
}

function serializeSessionDetail(session) {
  return {
    ...serializeSessionSummary(session),
    messages: session.messages
  }
}

async function listSessions(username) {
  await ensureAgentStorageDir()
  const entries = await readdir(agentStorageDirPath, { withFileTypes: true })
  const items = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue
    }

    try {
      const content = await readFile(resolve(agentStorageDirPath, entry.name), 'utf8')
      const parsed = JSON.parse(content)
      const session = normalizeStoredSession(parsed, username)

      if (session) {
        items.push(serializeSessionSummary(session))
      }
    } catch (error) {
      console.warn('[agent] failed to read session file, skipping.', {
        fileName: entry.name,
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return items.sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
}

function createEmptySession({ username, title = '' } = {}) {
  const now = new Date().toISOString()
  const resolvedTitle = normalizeOptionalText(title, 160) || '新会话'

  return {
    sessionId: createSessionId(),
    username,
    title: resolvedTitle,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastAiId: '',
    lastModel: '',
    messages: [],
    task: {
      taskId: createTaskId(),
      title: resolvedTitle,
      status: defaultTaskStatus,
      summary: '等待你给出第一个目标，我会围绕当前会话持续推进。',
      updatedAt: now
    }
  }
}

function createSessionMessage(role, content, { model = '', usage = null } = {}) {
  return {
    messageId: `msg_${randomUUID().replace(/-/g, '').slice(0, 18)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    model: normalizeOptionalText(model, 120),
    usage: {
      inputTokens: Number.isFinite(usage?.inputTokens) ? usage.inputTokens : null,
      outputTokens: Number.isFinite(usage?.outputTokens) ? usage.outputTokens : null,
      totalTokens: Number.isFinite(usage?.totalTokens) ? usage.totalTokens : null
    }
  }
}

function inferTaskSummary(message, session) {
  const latestUserMessage = normalizeOptionalText(message, 240)
  const previousTurns = session.messages.filter((item) => item.role === 'user').length

  if (!previousTurns) {
    return `当前正在围绕“${createSessionTitleFromText(latestUserMessage)}”启动任务，可以继续追问细节、补充约束或让我整理输出。`
  }

  return `当前任务继续推进中。最新关注点是“${createSessionTitleFromText(latestUserMessage)}”，可以继续细化步骤、补充上下文或沉淀结果。`
}

function updateSessionTask(session, latestUserMessage) {
  const nextTitle = session.messages.length <= 1
    ? createSessionTitleFromText(latestUserMessage)
    : session.task.title || createSessionTitleFromText(latestUserMessage)

  const now = new Date().toISOString()
  session.title = session.title === '新会话' ? nextTitle : session.title
  session.task = {
    ...normalizeStoredTask(session.task, nextTitle),
    title: nextTitle,
    status: defaultTaskStatus,
    summary: inferTaskSummary(latestUserMessage, session),
    updatedAt: now
  }
}

function createAgentMessagesForProvider(messages) {
  return messages
    .map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: item.content
    }))
    .slice(-chatHistoryLimit)
}

async function requestAgentChatWithFallbackKeys({
  env,
  systemPrompt,
  messages,
  requestedAiId,
  requestedModel,
  generationConfig,
  apiKeyStore
}) {
  const availableApiKeys = await apiKeyStore.readApiKeys()
  const matchedApiKeys = requestedAiId
    ? availableApiKeys.filter((item) => item.aiId === requestedAiId)
    : availableApiKeys

  if (requestedAiId && !matchedApiKeys.length) {
    const error = new Error('Selected AI config was not found.')
    error.statusCode = 404
    throw error
  }

  const usableApiKeys = matchedApiKeys.filter((item) => item.baseUrl && item.apiKey)

  if (!usableApiKeys.length) {
    const error = new Error('No available AI configs have a valid AI base URL.')
    error.statusCode = 500
    throw error
  }

  let lastError = null

  for (let index = 0; index < usableApiKeys.length; index += 1) {
    const candidate = usableApiKeys[index]
    const config = getOpenAiConfig(env, {
      requestedModel,
      baseUrlOverride: candidate.baseUrl
    })
    const useChatCompletions = config.apiEndpointStyle === 'chat_completions'
    const requestBody = useChatCompletions
      ? buildChatCompletionsConversationRequestBody({
          model: config.model,
          systemPrompt,
          messages,
          generationConfig,
          maxOutputTokens: config.chatMaxOutputTokens,
          baseUrl: config.baseUrl
        })
      : buildResponsesChatRequestBody({
          model: config.model,
          systemPrompt,
          messages,
          generationConfig,
          maxOutputTokens: config.chatMaxOutputTokens
        })
    const endpointPath = useChatCompletions ? '/chat/completions' : '/responses'

    try {
      const response = await postAiProviderJson(`${config.baseUrl.replace(/\/$/, '')}${endpointPath}`, {
        body: requestBody,
        apiKey: candidate.apiKey,
        timeoutMs: config.timeoutMs
      })
      const responsePayload = response.payload

      if (!response.ok) {
        const upstreamMessage =
          typeof responsePayload?.error?.message === 'string'
            ? responsePayload.error.message.trim()
            : ''
        const error = new Error(upstreamMessage || `AI request failed with status ${response.status}.`)
        error.statusCode = 502
        error.retryable = response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 500
        throw error
      }

      const replyText = (
        useChatCompletions
          ? extractChatCompletionsText(responsePayload)
          : extractResponseText(responsePayload)
      ).trim()

      if (!replyText) {
        const error = new Error('AI provider returned an empty Agent reply.')
        error.statusCode = 502
        throw error
      }

      return {
        aiId: candidate.aiId,
        reply: replyText,
        model: config.model,
        usage: extractUsageMetrics(responsePayload)
      }
    } catch (error) {
      lastError = error

      if (!(error instanceof Error) || !error.retryable || index >= usableApiKeys.length - 1) {
        throw error
      }

      console.warn('[agent] AI request failed, retrying with next API key.', {
        aiId: candidate.aiId,
        message: error.message
      })
    }
  }

  throw lastError || new Error('Agent AI request failed.')
}

async function buildAgentSystemPrompt(session) {
  const prompt = await loadAgentSystemPrompt()
  const latestTaskTitle = session.task?.title || session.title
  const latestTaskSummary = session.task?.summary || '暂无任务摘要'

  return [
    prompt,
    '',
    `当前会话标题：${session.title}`,
    `当前任务标题：${latestTaskTitle}`,
    `当前任务摘要：${latestTaskSummary}`,
    '请基于当前会话持续推进，不要假装调用并不存在的工具。如果信息不足，先明确提出你还需要什么。'
  ].join('\n')
}

function getAuthenticatedUsername(req) {
  const username = normalizeEnvValue(req.auth?.username)

  if (!username) {
    const error = new Error('Authenticated username is missing.')
    error.statusCode = 401
    throw error
  }

  return username
}

function getErrorStatusCode(error) {
  if (error instanceof Error && Number.isInteger(error.statusCode)) {
    return error.statusCode
  }

  return 500
}

export function createAgentApiMiddleware(env = process.env) {
  const apiKeyStore = createOpenAiApiKeyStore(env)

  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/agent')) {
      next()
      return
    }

    const requestUrl = new URL(req.url, 'http://127.0.0.1')
    const username = getAuthenticatedUsername(req)
    const sessionDetailMatch = requestUrl.pathname.match(/^\/api\/agent\/sessions\/([A-Za-z0-9_-]{8,80})$/)

    try {
      if (requestUrl.pathname === '/api/agent/sessions' && req.method === 'GET') {
        const items = await listSessions(username)
        writeJson(res, 200, { ok: true, items })
        return
      }

      if (requestUrl.pathname === '/api/agent/sessions' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const session = createEmptySession({
          username,
          title: normalizeOptionalText(body.title, 160)
        })

        await writeSession(session)
        writeJson(res, 200, { ok: true, item: serializeSessionDetail(session) })
        return
      }

      if (sessionDetailMatch && req.method === 'GET') {
        const session = await readSessionById(sessionDetailMatch[1], username)
        writeJson(res, 200, { ok: true, item: serializeSessionDetail(session) })
        return
      }

      if (sessionDetailMatch && req.method === 'DELETE') {
        const session = await readSessionById(sessionDetailMatch[1], username)
        const filePath = getSessionFilePath(session.sessionId)
        const fileStat = await stat(filePath)

        if (!fileStat.isFile()) {
          const error = new Error('Agent session was not found.')
          error.statusCode = 404
          throw error
        }

        await rm(filePath, { force: true })
        writeJson(res, 200, { ok: true, deleted: true, sessionId: session.sessionId })
        return
      }

      if (requestUrl.pathname === '/api/agent/chat' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const message = normalizeMessageText(body.message)
        const requestedAiId = normalizeRequestedAiId(body.aiId)
        const requestedModel = normalizeRequestedModel(body.model)
        const generationConfig = normalizeRequestedGenerationConfig(body.generationConfig || defaultGenerationConfig)
        const normalizedSessionId = normalizeSessionId(body.sessionId)
        const session = normalizedSessionId
          ? await readSessionById(normalizedSessionId, username)
          : createEmptySession({
              username,
              title: createSessionTitleFromText(message)
            })

        const userMessage = createSessionMessage('user', message)
        session.messages.push(userMessage)
        updateSessionTask(session, message)

        const providerMessages = createAgentMessagesForProvider(session.messages)
        const systemPrompt = await buildAgentSystemPrompt(session)
        const chatReply = await requestAgentChatWithFallbackKeys({
          env,
          systemPrompt,
          messages: providerMessages,
          requestedAiId,
          requestedModel,
          generationConfig,
          apiKeyStore
        })
        const assistantMessage = createSessionMessage('assistant', chatReply.reply, {
          model: chatReply.model,
          usage: chatReply.usage
        })

        session.messages.push(assistantMessage)
        session.updatedAt = assistantMessage.createdAt
        session.lastMessageAt = assistantMessage.createdAt
        session.lastAiId = chatReply.aiId
        session.lastModel = chatReply.model
        session.status = 'active'

        await writeSession(session)

        writeJson(res, 200, {
          ok: true,
          session: serializeSessionDetail(session),
          reply: assistantMessage,
          task: session.task,
          toolCalls: [],
          artifacts: [
            {
              type: 'task-summary',
              title: session.task.title,
              summary: session.task.summary
            }
          ],
          model: chatReply.model,
          usage: chatReply.usage
        })
        return
      }

      writeJson(res, 404, {
        message: `Agent API route was not found: ${basename(requestUrl.pathname)}`
      })
    } catch (error) {
      console.error('[agent] request failed', {
        path: requestUrl.pathname,
        message: error instanceof Error ? error.message : 'Unknown server error'
      })

      writeJson(res, getErrorStatusCode(error), {
        message: error instanceof Error ? error.message : 'Unknown server error'
      })
    }
  }
}
