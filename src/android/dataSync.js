import http from '../utils/http'
import {
  getAndroidCache,
  getAndroidCacheBucket,
  pruneAndroidCacheBucket,
  setAndroidCache
} from './offlineCache'

export const NOTE_META_CACHE_BUCKET = 'notes-meta'
export const NOTE_FILE_CACHE_BUCKET = 'notes-files'
export const INTERNSHIP_CACHE_BUCKET = 'internship'

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

export async function syncAndroidNotesCache() {
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
  const syncState = createSyncState()
  await setAndroidCache(NOTE_META_CACHE_BUCKET, 'last-sync', syncState)

  return {
    syncedAt: syncState.syncedAt,
    fileCount: files.length,
    updatedFileCount
  }
}

async function executeInternshipOperation(operation) {
  const recordId = encodeURIComponent(operation.recordId || operation.record?.id || '')

  if (operation.type === 'create') {
    await http.post('/api/internship/records', operation.record)
    return
  }

  if (operation.type === 'update') {
    await http.put(`/api/internship/records/${recordId}`, operation.record)
    return
  }

  if (operation.type === 'delete') {
    await http.delete(`/api/internship/records/${recordId}`)
    return
  }

  if (operation.type === 'restore') {
    await http.patch(`/api/internship/records/${recordId}/restore`)
    return
  }

  if (operation.type === 'delete-permanently') {
    await http.delete(`/api/internship/records/${recordId}?permanent=1`)
  }
}

async function flushInternshipOperations() {
  const cachedOperations = await getAndroidCache(INTERNSHIP_CACHE_BUCKET, 'pending-operations')
  const pendingOperations = Array.isArray(cachedOperations)
    ? cachedOperations.filter((operation) => operation && typeof operation.type === 'string')
    : []
  let syncedCount = 0

  while (pendingOperations.length) {
    await executeInternshipOperation(pendingOperations[0])
    pendingOperations.shift()
    syncedCount += 1
    await setAndroidCache(
      INTERNSHIP_CACHE_BUCKET,
      'pending-operations',
      pendingOperations
    )
  }

  return syncedCount
}

export async function syncAndroidInternshipCache() {
  const pendingOperationCount = await flushInternshipOperations()
  const [recordsData, trashData] = await Promise.all([
    http.get('/api/internship/records'),
    http.get('/api/internship/records?scope=trash')
  ])
  const records = Array.isArray(recordsData.records) ? recordsData.records : []
  const trashRecords = Array.isArray(trashData.records) ? trashData.records : []
  const syncState = createSyncState()

  await Promise.all([
    setAndroidCache(INTERNSHIP_CACHE_BUCKET, 'records', records),
    setAndroidCache(INTERNSHIP_CACHE_BUCKET, 'trash', trashRecords),
    setAndroidCache(INTERNSHIP_CACHE_BUCKET, 'last-sync', syncState)
  ])

  return {
    syncedAt: syncState.syncedAt,
    recordCount: records.length,
    trashCount: trashRecords.length,
    pendingOperationCount
  }
}
