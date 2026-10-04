import http from '../utils/http'
import { AUTH_REFRESH_TOKEN_KEY, AUTH_TOKEN_KEY } from '../constants/storage'
import { healthImageUrl } from './healthImages'

const DEVICE_ID_KEY = 'android-health-backup-device-id'
const BACKUP_TIME_KEY = 'android-health-last-backup-at'

function getDeviceId() {
  const stored = String(localStorage.getItem(DEVICE_ID_KEY) || '').trim()
  if (stored) return stored

  const next = globalThis.crypto?.randomUUID?.() || `android-${Date.now()}-${Math.random().toString(16).slice(2)}`
  localStorage.setItem(DEVICE_ID_KEY, next)
  return next
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      const comma = dataUrl.indexOf(',')
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : '')
    }
    reader.onerror = () => reject(new Error('读取图片备份失败。'))
    reader.readAsDataURL(blob)
  })
}

function collectImageMetadata(records) {
  const images = new Map()
  for (const record of records) {
    for (const image of Array.isArray(record?.images) ? record.images : []) {
      if (!image?.id || images.has(image.id)) continue
      images.set(image.id, { id: image.id, name: image.name || '' })
    }
  }
  return [...images.values()]
}

export function readLastHealthBackupAt() {
  return String(localStorage.getItem(BACKUP_TIME_KEY) || '')
}

export async function uploadHealthBackup(records, onProgress = () => {}) {
  const accessToken = String(localStorage.getItem(AUTH_TOKEN_KEY) || '').trim()
  const refreshToken = String(localStorage.getItem(AUTH_REFRESH_TOKEN_KEY) || '').trim()
  if (!accessToken && !refreshToken) {
    throw new Error('请先登录后再上传健康备份。')
  }

  const deviceId = getDeviceId()
  const images = collectImageMetadata(records)
  const uploadedImages = []

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index]
    const response = await fetch(healthImageUrl(image.id), { cache: 'no-store' })
    if (!response.ok) throw new Error(`读取本地图片失败：${image.name || image.id}`)
    const blob = await response.blob()
    const data = await blobToBase64(blob)
    await http.post('/api/health/backup/images', {
      deviceId,
      imageId: image.id,
      mime: blob.type || 'image/webp',
      data
    })
    uploadedImages.push(image)
    onProgress({ current: index + 1, total: images.length, image })
  }

  const backup = await http.post('/api/health/backup', {
    schemaVersion: 1,
    backupId: globalThis.crypto?.randomUUID?.() || `backup-${Date.now()}`,
    deviceId,
    exportedAt: new Date().toISOString(),
    records,
    images: uploadedImages
  })
  const uploadedAt = String(backup?.uploadedAt || new Date().toISOString())
  localStorage.setItem(BACKUP_TIME_KEY, uploadedAt)
  return { ...backup, uploadedAt }
}
