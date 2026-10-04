const MAX_IMAGE_EDGE = 1280
const WEBP_QUALITY = 0.78

function nativeBridge() {
  return typeof window !== 'undefined' && window.AndroidBridge && typeof window.AndroidBridge.saveHealthImage === 'function'
    ? window.AndroidBridge
    : null
}

function imageUrl(id) {
  return `${window.location.origin}/health-images/${encodeURIComponent(id)}`
}

function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file).then(bitmap => ({ source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }))
  }

  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(sourceUrl)
      resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => {} })
    }
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl)
      reject(new Error('图片无法读取。'))
    }
    image.src = sourceUrl
  })
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片压缩失败。')), 'image/webp', WEBP_QUALITY)
  })
}

function blobDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('图片读取失败。'))
    reader.readAsDataURL(blob)
  })
}

export async function compressHealthImage(file) {
  const decoded = await decodeImage(file)
  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(decoded.width, decoded.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(decoded.width * scale))
    canvas.height = Math.max(1, Math.round(decoded.height * scale))
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('图片处理不可用。')
    context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height)
    return await canvasBlob(canvas)
  } finally {
    decoded.close()
  }
}

export async function prepareHealthImage(file) {
  const blob = await compressHealthImage(file)
  return {
    id: `temporary-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: file.name,
    blob,
    url: URL.createObjectURL(blob),
    persistent: false
  }
}

export async function persistHealthImage(image) {
  const bridge = nativeBridge()
  if (!bridge) return image

  const id = String(bridge.saveHealthImage(await blobDataUrl(image.blob)) || '')
  if (!id) throw new Error('安卓图片保存失败，请重试。')
  return { id, name: image.name, url: imageUrl(id), persistent: true }
}

export async function saveHealthImage(file) {
  const image = await prepareHealthImage(file)
  return persistHealthImage(image)
}

export function deleteHealthImage(image) {
  if (!image) return
  const bridge = nativeBridge()
  if (image.persistent && bridge && typeof bridge.deleteHealthImage === 'function') {
    bridge.deleteHealthImage(String(image.id))
  }
  if (typeof image.url === 'string' && image.url.startsWith('blob:')) {
    URL.revokeObjectURL(image.url)
  }
}

export function healthImageUrl(id) {
  return imageUrl(id)
}
