import { NOTE_USERNAME_KEY, USERNAME_KEY } from '../constants/storage'

const DB_NAME = 'personal_blog_android_offline'
const DB_VERSION = 1
const STORE_NAME = 'entries'
const SCOPE_INDEX = 'scope'

let dbPromise

function getCacheOwner() {
  if (typeof localStorage === 'undefined') {
    return 'default'
  }

  return String(
    localStorage.getItem(NOTE_USERNAME_KEY)
      || localStorage.getItem(USERNAME_KEY)
      || 'default'
  ).trim() || 'default'
}

function createScope(owner, bucket) {
  return JSON.stringify([owner, String(bucket || '')])
}

function createEntryId(owner, bucket, key) {
  return JSON.stringify([owner, String(bucket || ''), String(key || '')])
}

function openDatabase() {
  if (dbPromise) {
    return dbPromise
  }

  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable.'))
  }

  const opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex(SCOPE_INDEX, 'scope', { unique: false })
      }
    }

    request.onsuccess = () => {
      const database = request.result

      database.onversionchange = () => {
        database.close()

        if (dbPromise === opening) {
          dbPromise = undefined
        }
      }

      resolve(database)
    }
    request.onerror = () => reject(request.error || new Error('无法打开安卓本机缓存。'))
    request.onblocked = () => reject(new Error('安卓本机缓存正在被占用。'))
  })

  dbPromise = opening
  opening.catch(() => {
    if (dbPromise === opening) {
      dbPromise = undefined
    }
  })

  return opening
}

async function requestFromStore(mode, action) {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    let result

    try {
      const request = action(store)
      request.onsuccess = () => {
        result = request.result
      }
      request.onerror = () => reject(request.error || new Error('安卓本机缓存操作失败。'))
    } catch (error) {
      reject(error)
      return
    }

    transaction.oncomplete = () => resolve(result)
    transaction.onerror = () => reject(transaction.error || new Error('安卓本机缓存事务失败。'))
    transaction.onabort = () => reject(transaction.error || new Error('安卓本机缓存事务已取消。'))
  })
}

export async function getAndroidCache(bucket, key) {
  const owner = getCacheOwner()
  const entry = await requestFromStore('readonly', (store) => (
    store.get(createEntryId(owner, bucket, key))
  ))

  return entry?.value ?? null
}

export async function setAndroidCache(bucket, key, value) {
  const owner = getCacheOwner()
  const normalizedBucket = String(bucket || '')
  const normalizedKey = String(key || '')

  await requestFromStore('readwrite', (store) => store.put({
    id: createEntryId(owner, normalizedBucket, normalizedKey),
    scope: createScope(owner, normalizedBucket),
    owner,
    bucket: normalizedBucket,
    key: normalizedKey,
    value,
    cachedAt: new Date().toISOString()
  }))

  return value
}

export async function getAndroidCacheBucket(bucket) {
  const owner = getCacheOwner()
  const entries = await requestFromStore('readonly', (store) => (
    store.index(SCOPE_INDEX).getAll(createScope(owner, bucket))
  ))

  return Array.isArray(entries)
    ? entries.map((entry) => ({
        key: entry.key,
        value: entry.value,
        cachedAt: entry.cachedAt
      }))
    : []
}

export async function deleteAndroidCache(bucket, key) {
  const owner = getCacheOwner()
  await requestFromStore('readwrite', (store) => (
    store.delete(createEntryId(owner, bucket, key))
  ))
}

export async function pruneAndroidCacheBucket(bucket, allowedKeys) {
  const allowedKeySet = new Set(Array.from(allowedKeys || [], (key) => String(key)))
  const entries = await getAndroidCacheBucket(bucket)
  const staleEntries = entries.filter((entry) => !allowedKeySet.has(String(entry.key)))

  await Promise.all(staleEntries.map((entry) => deleteAndroidCache(bucket, entry.key)))
}
