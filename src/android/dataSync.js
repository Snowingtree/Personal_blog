import http from '../utils/http'
import {
  getAndroidCache,
  getAndroidCacheBucket,
  pruneAndroidCacheBucket,
  setAndroidCache
} from './offlineCache'
import {
  extractNoteAssetPaths,
  loadNoteAssetBlob,
  NOTE_ASSET_CACHE_BUCKET
} from '../utils/noteAssets'

export const NOTE_META_CACHE_BUCKET = 'notes-meta'
export const NOTE_FILE_CACHE_BUCKET = 'notes-files'
const NOTE_REPO_UPDATE_TIMEOUT = 130000

function createSyncState() {
  return {
    syncedAt: new Date().toISOString()
  }
}

async function syncNoteFiles(files) {
  const cachedEntries = await getAndroidCacheBucket(NOTE_FILE_CACHE_BUCKET)
  const cachedFiles = new Map(cachedEntries.map((entry) => [entry.key, entry.value]))
  const pendingFiles = files.filter((file) => {
    const cachedFile = cachedFiles.get(file.path)
    return !cachedFile || cachedFile.updatedAt !== file.updatedAt
  })
  let nextIndex = 0

  async function syncWorker() {
    while (nextIndex < pendingFiles.length) {
      const file = pendingFiles[nextIndex]
      nextIndex += 1
      const data = await http.get('/api/notes/file', {
        params: { path: file.path }
      })

      await setAndroidCache(NOTE_FILE_CACHE_BUCKET, file.path, {
        path: typeof data.path === 'string' ? data.path : file.path,
        content: typeof data.content === 'string' ? data.content : '',
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : file.updatedAt
      })
    }
  }

  await Promise.all([syncWorker(), syncWorker()])
  await pruneAndroidCacheBucket(
    NOTE_FILE_CACHE_BUCKET,
    files.map((file) => file.path)
  )

  return pendingFiles.length
}

async function syncNoteAssets() {
  const cachedFiles = await getAndroidCacheBucket(NOTE_FILE_CACHE_BUCKET)
  const assetPaths = [
    ...new Set(
      cachedFiles.flatMap((entry) => (
        extractNoteAssetPaths(entry.value?.content, entry.value?.path || entry.key)
      ))
    )
  ]
  let nextIndex = 0
  let syncedCount = 0
  let failedCount = 0

  async function syncWorker() {
    while (nextIndex < assetPaths.length) {
      const assetPath = assetPaths[nextIndex]
      nextIndex += 1

      try {
        await loadNoteAssetBlob(assetPath, {
          useAndroidCache: true,
          refresh: false,
          allowNetwork: true
        })
        syncedCount += 1
      } catch {
        failedCount += 1
      }
    }
  }

  await Promise.all([syncWorker(), syncWorker(), syncWorker(), syncWorker()])
  await pruneAndroidCacheBucket(NOTE_ASSET_CACHE_BUCKET, assetPaths)

  return {
    assetCount: assetPaths.length,
    syncedCount,
    failedCount
  }
}

function assertRepoReadyForDownload(repoUpdate) {
  if (repoUpdate?.blockedByDirty) {
    const remoteSummary = Number(repoUpdate.behind) > 0
      ? `，GitHub 还有 ${repoUpdate.behind} 个新提交`
      : ''

    throw new Error(`服务器笔记仓库有未提交修改${remoteSummary}，请先在服务器提交或清理后再更新。`)
  }

  if (repoUpdate?.blockedByDiverged) {
    throw new Error(
      `服务器与 GitHub 的笔记历史已分叉（服务器 ${repoUpdate.ahead ?? 0} 个、GitHub ${repoUpdate.behind ?? 0} 个新提交），请先在服务器处理后再更新。`
    )
  }
}

export async function syncAndroidNotesCache() {
  const repoUpdate = await http.post('/api/notes/repo/update', undefined, {
    timeout: NOTE_REPO_UPDATE_TIMEOUT
  })
  assertRepoReadyForDownload(repoUpdate)

  const [treeData, repoStatusData] = await Promise.all([
    http.get('/api/notes/tree'),
    http.get('/api/notes/repo/status')
  ])
  const files = Array.isArray(treeData.files)
    ? treeData.files.filter((file) => file && typeof file.path === 'string')
    : []

  await Promise.all([
    setAndroidCache(NOTE_META_CACHE_BUCKET, 'tree', {
      files,
      cachedAt: new Date().toISOString()
    }),
    setAndroidCache(NOTE_META_CACHE_BUCKET, 'repo-status', {
      branch: typeof repoStatusData.branch === 'string' ? repoStatusData.branch : '',
      head: typeof repoStatusData.head === 'string' ? repoStatusData.head : '',
      changedFiles: Array.isArray(repoStatusData.changedFiles) ? repoStatusData.changedFiles : []
    })
  ])

  const updatedFileCount = await syncNoteFiles(files)
  const assetSyncResult = await syncNoteAssets()
  const syncState = createSyncState()
  await setAndroidCache(NOTE_META_CACHE_BUCKET, 'last-sync', syncState)

  return {
    syncedAt: syncState.syncedAt,
    fileCount: files.length,
    updatedFileCount,
    imageCount: assetSyncResult.assetCount,
    updatedImageCount: assetSyncResult.syncedCount,
    failedImageCount: assetSyncResult.failedCount,
    repositoryUpdated: Boolean(repoUpdate?.updated),
    repositoryHead: typeof repoStatusData.head === 'string' ? repoStatusData.head : ''
  }
}
