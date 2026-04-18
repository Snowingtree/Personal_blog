import { execFile } from 'node:child_process'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { basename, extname, relative, resolve } from 'node:path'

const markdownExtensions = new Set(['.md', '.markdown'])
const GIT_COMMAND_TIMEOUT = 120000

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function toPosixPath(value) {
  return value.replace(/\\/g, '/')
}

function getNotesRepoRoot(env) {
  const configuredPath = normalizeEnvValue(env.NOTE_REPO_PATH)

  if (!configuredPath) {
    throw new Error('NOTE_REPO_PATH is required for the notes repository.')
  }

  return resolve(configuredPath)
}

function normalizeRequestedPath(value) {
  const normalized = toPosixPath(String(value ?? '').trim()).replace(/^\/+/, '')

  if (!normalized || normalized.includes('\0')) {
    throw new Error('A valid path query parameter is required.')
  }

  return normalized
}

function resolveRepoEntry(repoRoot, requestedPath) {
  const normalizedPath = normalizeRequestedPath(requestedPath)
  const absolutePath = resolve(repoRoot, normalizedPath)
  const relativePath = toPosixPath(relative(repoRoot, absolutePath))

  if (
    !relativePath ||
    relativePath.startsWith('..') ||
    relativePath === '.git' ||
    relativePath.startsWith('.git/')
  ) {
    throw new Error('Requested path is outside the notes repository.')
  }

  return {
    absolutePath,
    relativePath
  }
}

function getMimeType(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.gif':
      return 'image/gif'
    case '.svg':
      return 'image/svg+xml'
    case '.webp':
      return 'image/webp'
    case '.bmp':
      return 'image/bmp'
    case '.md':
    case '.markdown':
      return 'text/markdown; charset=utf-8'
    case '.txt':
      return 'text/plain; charset=utf-8'
    default:
      return 'application/octet-stream'
  }
}

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function writeBinary(res, statusCode, body, contentType) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', contentType)
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.end(body)
}

function runCommand(command, args, options = {}) {
  return new Promise((resolveCommand, rejectCommand) => {
    execFile(
      command,
      args,
      {
        cwd: options.cwd,
        timeout: options.timeout ?? 30000,
        maxBuffer: 1024 * 1024
      },
      (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout
          error.stderr = stderr
          rejectCommand(error)
          return
        }

        resolveCommand({
          stdout,
          stderr
        })
      }
    )
  })
}

async function ensureRepoRootExists(repoRoot) {
  let repoStat

  try {
    repoStat = await stat(repoRoot)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      const missingRepoError = new Error(`Configured notes repository path does not exist: ${repoRoot}`)
      missingRepoError.code = 'ENOENT'
      throw missingRepoError
    }

    throw error
  }

  if (!repoStat.isDirectory()) {
    throw new Error(`Configured notes repository path is not a directory: ${repoRoot}`)
  }
}

async function ensureGitRepoRoot(repoRoot) {
  await ensureRepoRootExists(repoRoot)
  await runGitCommand(
    repoRoot,
    ['rev-parse', '--show-toplevel'],
    `Configured notes repository is not a Git repository: ${repoRoot}`
  )
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
    throw new Error('Request body must be valid JSON.')
  }
}

function getErrorStatusCode(error) {
  if (!(error instanceof Error)) {
    return 500
  }

  if (
    error.message.includes('valid JSON') ||
    error.message.includes('path query parameter') ||
    error.message.includes('outside the notes repository') ||
    error.message.includes('Only Markdown files')
  ) {
    return 400
  }

  if ('code' in error && error.code === 'ENOENT') {
    return 404
  }

  return 500
}

function createGitError(message, error) {
  const detail = [error?.stderr, error?.stdout]
    .filter((value) => typeof value === 'string' && value.trim())
    .join('\n')
    .trim()
  const combinedMessage = [error?.message, detail]
    .filter((value) => typeof value === 'string' && value.trim())
    .join('\n')
  const hostnameMatch = combinedMessage.match(/Could not resolve hostname\s+([^:\s]+)/i)

  if (hostnameMatch?.[1]) {
    const hostname = hostnameMatch[1]
    return new Error(
      `${message}\nThe server cannot resolve ${hostname}. Check the server DNS/network settings, or use a reachable Git remote.`
    )
  }

  if (/Permission denied \(publickey\)/i.test(combinedMessage)) {
    return new Error(`${message}\nThe server could not authenticate to the Git remote. Check the configured SSH key.`)
  }

  if (/Repository not found/i.test(combinedMessage)) {
    return new Error(`${message}\nThe Git remote repository was not found. Check the remote URL and repository access.`)
  }

  if (/Connection timed out|Operation timed out|Connection refused/i.test(combinedMessage)) {
    return new Error(`${message}\nThe server could not connect to the Git remote. Check the server network or proxy settings.`)
  }

  return new Error(detail ? `${message}\n${detail}` : message)
}

async function runGitCommand(repoRoot, args, errorMessage) {
  try {
    return await runCommand('git', args, {
      cwd: repoRoot,
      timeout: GIT_COMMAND_TIMEOUT
    })
  } catch (error) {
    throw createGitError(errorMessage, error)
  }
}

async function listGitRemotes(repoRoot) {
  const { stdout } = await runGitCommand(repoRoot, ['remote'], 'Failed to list Git remotes.')

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

async function gitRefExists(repoRoot, ref) {
  try {
    await runCommand('git', ['show-ref', '--verify', '--quiet', ref], {
      cwd: repoRoot,
      timeout: GIT_COMMAND_TIMEOUT
    })
    return true
  } catch {
    return false
  }
}

async function getRemoteHeadRef(repoRoot, remoteName) {
  try {
    const { stdout } = await runGitCommand(
      repoRoot,
      ['symbolic-ref', '--quiet', '--short', `refs/remotes/${remoteName}/HEAD`],
      `Failed to resolve the default branch for remote ${remoteName}.`
    )

    return stdout.trim()
  } catch {
    return ''
  }
}

function getRemoteNameFromUpstream(upstream) {
  const normalizedUpstream = normalizeEnvValue(upstream)
  const separatorIndex = normalizedUpstream.indexOf('/')

  if (separatorIndex <= 0) {
    throw new Error(`Invalid upstream reference: ${normalizedUpstream || '(empty)'}`)
  }

  return normalizedUpstream.slice(0, separatorIndex)
}

async function fetchRepoRemote(repoRoot, remoteName) {
  await runGitCommand(
    repoRoot,
    ['fetch', remoteName, '--prune'],
    `Failed to fetch the latest repository state from remote ${remoteName}.`
  )
}

async function getRepoStatus(repoRoot) {
  const [{ stdout: branch }, { stdout: head }, { stdout: status }] = await Promise.all([
    runGitCommand(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD'], 'Failed to read current branch.'),
    runGitCommand(repoRoot, ['rev-parse', '--short', 'HEAD'], 'Failed to read current commit.'),
    runGitCommand(repoRoot, ['status', '--short'], 'Failed to read repository status.')
  ])

  return {
    branch: branch.trim(),
    head: head.trim(),
    dirty: Boolean(status.trim()),
    changedFiles: status
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  }
}

async function getRepoUpstream(repoRoot, currentBranch = '') {
  try {
    const { stdout } = await runGitCommand(
      repoRoot,
      ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'],
      'Failed to resolve the upstream branch. Make sure the repository branch tracks origin.'
    )

    return stdout.trim()
  } catch (error) {
    const remotes = await listGitRemotes(repoRoot)

    if (!remotes.length) {
      throw new Error('No remote repository is configured for updates.')
    }

    const normalizedBranch = normalizeEnvValue(currentBranch)
    const candidateRemotes = remotes.includes('origin')
      ? ['origin', ...remotes.filter((remoteName) => remoteName !== 'origin')]
      : remotes

    if (normalizedBranch && normalizedBranch !== 'HEAD') {
      for (const remoteName of candidateRemotes) {
        if (await gitRefExists(repoRoot, `refs/remotes/${remoteName}/${normalizedBranch}`)) {
          return `${remoteName}/${normalizedBranch}`
        }
      }

      if (candidateRemotes.length === 1) {
        return `${candidateRemotes[0]}/${normalizedBranch}`
      }
    }

    const remoteHead = await getRemoteHeadRef(repoRoot, candidateRemotes[0])

    if (remoteHead) {
      return remoteHead
    }

    throw createGitError(
      'Failed to resolve the upstream branch. Make sure the repository branch tracks a remote branch or that the remote has a default branch.',
      error
    )
  }
}

async function getRepoDivergence(repoRoot, upstream) {
  const { stdout } = await runGitCommand(
    repoRoot,
    ['rev-list', '--left-right', '--count', `HEAD...${upstream}`],
    'Failed to compare the current branch with its upstream.'
  )
  const [aheadRaw = '0', behindRaw = '0'] = stdout.trim().split(/\s+/)

  return {
    ahead: Number.parseInt(aheadRaw, 10) || 0,
    behind: Number.parseInt(behindRaw, 10) || 0
  }
}

async function updateRepo(repoRoot) {
  const statusBeforeUpdate = await getRepoStatus(repoRoot)
  const upstream = await getRepoUpstream(repoRoot, statusBeforeUpdate.branch)
  const remoteName = getRemoteNameFromUpstream(upstream)
  await fetchRepoRemote(repoRoot, remoteName)
  const divergence = await getRepoDivergence(repoRoot, upstream)

  if (statusBeforeUpdate.dirty) {
    return {
      ...statusBeforeUpdate,
      upstream,
      ...divergence,
      updated: false,
      blockedByDirty: true,
      blockedByDiverged: false,
      upToDate: divergence.behind === 0
    }
  }

  if (divergence.ahead > 0 && divergence.behind > 0) {
    return {
      ...statusBeforeUpdate,
      upstream,
      ...divergence,
      updated: false,
      blockedByDirty: false,
      blockedByDiverged: true,
      upToDate: false
    }
  }

  if (divergence.behind === 0) {
    return {
      ...statusBeforeUpdate,
      upstream,
      ...divergence,
      updated: false,
      blockedByDirty: false,
      blockedByDiverged: false,
      upToDate: true
    }
  }

  await runGitCommand(
    repoRoot,
    ['merge', '--ff-only', upstream],
    'Failed to update repository to the latest commit.'
  )
  const statusAfterUpdate = await getRepoStatus(repoRoot)

  return {
    ...statusAfterUpdate,
    upstream,
    ahead: 0,
    behind: 0,
    updated: true,
    blockedByDirty: false,
    blockedByDiverged: false,
    upToDate: false
  }
}

async function publishRepo(repoRoot, message) {
  await runGitCommand(repoRoot, ['add', '-A'], 'Failed to stage repository changes.')
  const status = await getRepoStatus(repoRoot)

  if (!status.dirty) {
    throw new Error('No repository changes to commit.')
  }

  await runGitCommand(
    repoRoot,
    ['commit', '-m', message],
    'Failed to create Git commit. Check git user.name and user.email on the server.'
  )
  await runGitCommand(repoRoot, ['push'], 'Failed to push commits to GitHub.')
  return getRepoStatus(repoRoot)
}

async function listMarkdownFiles(repoRoot, currentRelativePath = '') {
  const currentPath = currentRelativePath ? resolve(repoRoot, currentRelativePath) : repoRoot
  const entries = await readdir(currentPath, { withFileTypes: true })
  const sortedEntries = [...entries].sort((left, right) =>
    left.name.localeCompare(right.name, 'zh-CN')
  )
  const files = []

  for (const entry of sortedEntries) {
    if (entry.name === '.git') {
      continue
    }

    const nextRelativePath = currentRelativePath
      ? `${currentRelativePath}/${entry.name}`
      : entry.name

    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(repoRoot, nextRelativePath)))
      continue
    }

    if (!entry.isFile() || !markdownExtensions.has(extname(entry.name).toLowerCase())) {
      continue
    }

    const filePath = resolve(repoRoot, nextRelativePath)
    const fileStat = await stat(filePath)
    const pathSegments = toPosixPath(nextRelativePath).split('/')
    const fileName = pathSegments[pathSegments.length - 1]

    files.push({
      path: toPosixPath(nextRelativePath),
      name: basename(fileName, extname(fileName)),
      dir: pathSegments.length > 1 ? pathSegments.slice(0, -1).join('/') : '',
      depth: Math.max(pathSegments.length - 1, 0),
      updatedAt: fileStat.mtime.toISOString()
    })
  }

  return files
}

async function readMarkdownFile(repoRoot, requestedPath) {
  const { absolutePath, relativePath } = resolveRepoEntry(repoRoot, requestedPath)
  const fileExtension = extname(relativePath).toLowerCase()

  if (!markdownExtensions.has(fileExtension)) {
    throw new Error('Only Markdown files can be opened through /api/notes/file.')
  }

  const [content, fileStat] = await Promise.all([readFile(absolutePath, 'utf8'), stat(absolutePath)])

  return {
    path: relativePath,
    content,
    updatedAt: fileStat.mtime.toISOString()
  }
}

async function writeMarkdownFile(repoRoot, requestedPath, content) {
  const { absolutePath, relativePath } = resolveRepoEntry(repoRoot, requestedPath)
  const fileExtension = extname(relativePath).toLowerCase()

  if (!markdownExtensions.has(fileExtension)) {
    throw new Error('Only Markdown files can be saved through /api/notes/file.')
  }

  await writeFile(absolutePath, String(content ?? ''), 'utf8')

  const fileStat = await stat(absolutePath)

  return {
    path: relativePath,
    updatedAt: fileStat.mtime.toISOString()
  }
}

async function readRepoAsset(repoRoot, requestedPath) {
  const { absolutePath } = resolveRepoEntry(repoRoot, requestedPath)
  const [content, fileStat] = await Promise.all([readFile(absolutePath), stat(absolutePath)])

  if (!fileStat.isFile()) {
    throw new Error('Requested asset is not a file.')
  }

  return {
    content,
    contentType: getMimeType(absolutePath)
  }
}

export function createNotesApiMiddleware(env = process.env) {
  const repoRoot = getNotesRepoRoot(env)
  const repoName = basename(repoRoot)

  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/notes')) {
      next()
      return
    }

    const requestUrl = new URL(req.url, 'http://127.0.0.1')

    try {
      if (requestUrl.pathname === '/api/notes/tree') {
        if (req.method !== 'GET') {
          writeJson(res, 405, { message: 'Method not allowed' })
          return
        }

        await ensureRepoRootExists(repoRoot)
        const files = await listMarkdownFiles(repoRoot)
        writeJson(res, 200, {
          source: 'repo',
          rootName: repoName,
          files
        })
        return
      }

      if (requestUrl.pathname === '/api/notes/repo/status') {
        if (req.method !== 'GET') {
          writeJson(res, 405, { message: 'Method not allowed' })
          return
        }

        await ensureGitRepoRoot(repoRoot)
        const status = await getRepoStatus(repoRoot)
        writeJson(res, 200, {
          source: 'repo',
          rootName: repoName,
          ...status
        })
        return
      }

      if (requestUrl.pathname === '/api/notes/repo/update') {
        if (req.method !== 'POST') {
          writeJson(res, 405, { message: 'Method not allowed' })
          return
        }

        await ensureGitRepoRoot(repoRoot)
        const result = await updateRepo(repoRoot)
        writeJson(res, 200, {
          ok: true,
          source: 'repo',
          rootName: repoName,
          ...result
        })
        return
      }

      if (requestUrl.pathname === '/api/notes/repo/publish') {
        if (req.method !== 'POST') {
          writeJson(res, 405, { message: 'Method not allowed' })
          return
        }

        await ensureGitRepoRoot(repoRoot)
        const body = await readJsonBody(req)
        const message = typeof body.message === 'string' ? body.message.trim() : ''

        if (!message) {
          writeJson(res, 400, { message: 'message is required' })
          return
        }

        const result = await publishRepo(repoRoot, message)
        writeJson(res, 200, {
          ok: true,
          source: 'repo',
          rootName: repoName,
          ...result
        })
        return
      }

      if (requestUrl.pathname === '/api/notes/file') {
        if (req.method === 'GET') {
          await ensureRepoRootExists(repoRoot)
          const requestedPath = requestUrl.searchParams.get('path')
          const file = await readMarkdownFile(repoRoot, requestedPath)

          writeJson(res, 200, {
            source: 'repo',
            rootName: repoName,
            ...file
          })
          return
        }

        if (req.method === 'POST') {
          await ensureRepoRootExists(repoRoot)
          const body = await readJsonBody(req)
          const requestedPath = body.path

          if (typeof requestedPath !== 'string' || typeof body.content !== 'string') {
            writeJson(res, 400, { message: 'path and content must be strings' })
            return
          }

          const file = await writeMarkdownFile(repoRoot, requestedPath, body.content)

          writeJson(res, 200, {
            ok: true,
            source: 'repo',
            rootName: repoName,
            ...file
          })
          return
        }

        writeJson(res, 405, { message: 'Method not allowed' })
        return
      }

      if (requestUrl.pathname === '/api/notes/asset') {
        if (req.method !== 'GET') {
          writeJson(res, 405, { message: 'Method not allowed' })
          return
        }

        await ensureRepoRootExists(repoRoot)
        const requestedPath = requestUrl.searchParams.get('path')
        const asset = await readRepoAsset(repoRoot, requestedPath)
        writeBinary(res, 200, asset.content, asset.contentType)
        return
      }

      writeJson(res, 404, { message: 'Not found' })
    } catch (error) {
      writeJson(res, getErrorStatusCode(error), {
        message: error instanceof Error ? error.message : 'Unknown server error'
      })
    }
  }
}
