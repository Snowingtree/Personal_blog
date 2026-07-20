import http from '../../../utils/http'

const DEFAULT_PUBLIC_API_BASE_URL = 'http://www.wmzh.online'
const configuredBaseUrl = String(
  import.meta.env.VITE_XIANYU_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''
).trim().replace(/\/+$/, '')
const configuredTimeout = Number(import.meta.env.VITE_XIANYU_API_TIMEOUT_MS)
const REQUEST_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0
  ? configuredTimeout
  : 20_000

const chineseErrorRules = [
  [/authentication required|authenticated user is missing|refresh token|authentication token/i, '登录状态已失效，请重新登录'],
  [/image cannot exceed 5\s*mb|request entity too large|payload too large/i, '图片超过服务器允许的 5MB，请换一张较小的图片'],
  [/only jpeg, png, webp and gif images are allowed/i, '图片格式不支持，请使用 JPG、PNG、WebP 或 GIF'],
  [/image content does not match its declared type/i, '图片内容与文件格式不一致，请重新选择图片'],
  [/image not found/i, '云端没有找到这张图片'],
  [/record not found/i, '云端没有找到这条闲鱼记录'],
  [/description is required/i, '记录描述不能为空'],
  [/description cannot exceed/i, '记录描述过长，请缩短后重试'],
  [/costprice must be a valid non-negative amount/i, '成本价格格式不正确'],
  [/saleprice must be a valid non-negative amount/i, '售价格式不正确'],
  [/outside the allowed range/i, '价格超过允许范围'],
  [/request body must be valid json/i, '上传的数据格式不正确'],
  [/request body is too large/i, '上传的数据过大'],
  [/xianyu service is temporarily unavailable|server returned 500/i, '闲鱼云端服务暂时不可用，请稍后重试'],
  [/api request was blocked with 403|forbidden/i, '闲鱼接口被服务器拦截，请检查 Nginx 配置'],
  [/network error|failed to fetch|err_connection|connection refused/i, '网络连接失败，请检查网络后重试'],
  [/timeout|timed out/i, '连接服务器超时，请稍后重试'],
  [/method not allowed/i, '服务器暂不支持这个操作'],
  [/not found/i, '闲鱼接口不存在，请检查服务器配置']
]

function toChineseError(error, fallbackMessage = '闲鱼云端同步失败，请稍后重试') {
  const rawMessage = error instanceof Error ? String(error.message || '').trim() : String(error || '').trim()
  const matchedRule = chineseErrorRules.find(([pattern]) => pattern.test(rawMessage))
  const status = Number(error?.status || error?.statusCode || 0)
  let message = matchedRule?.[1]

  if (!message && /[\u3400-\u9fff]/.test(rawMessage)) {
    message = rawMessage
  }

  if (!message && status === 401) message = '登录状态已失效，请重新登录'
  if (!message && status === 403) message = '闲鱼接口被服务器拦截，请检查 Nginx 配置'
  if (!message && status === 413) message = '上传内容过大，请缩小图片后重试'
  if (!message && status >= 500) message = '闲鱼云端服务暂时不可用，请稍后重试'

  const translatedError = new Error(message || fallbackMessage)
  translatedError.name = 'XianyuApiError'
  translatedError.status = status || undefined
  return translatedError
}

function isSupportedUrl(value) {
  if (!value) {
    return import.meta.env.DEV
  }

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function getXianyuApiBaseUrl() {
  if (configuredBaseUrl) return configuredBaseUrl
  if (import.meta.env.DEV) return ''
  return DEFAULT_PUBLIC_API_BASE_URL
}

export function isServerEnabled() {
  return isSupportedUrl(getXianyuApiBaseUrl())
}

export function getServerDisabledReason() {
  return isServerEnabled() ? '' : '闲鱼同步接口地址无效'
}

function requireSecureServer() {
  if (!isServerEnabled()) {
    throw new Error(getServerDisabledReason())
  }
}

function createRequestConfig(config = {}) {
  const baseURL = getXianyuApiBaseUrl()

  return {
    ...config,
    ...(baseURL ? { baseURL } : {}),
    timeout: REQUEST_TIMEOUT_MS
  }
}

function serializeCoupon(coupon) {
  return {
    id: coupon.id,
    description: coupon.description,
    costPrice: coupon.costPrice,
    salePrice: coupon.salePrice ?? coupon.price,
    status: coupon.status,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt || coupon.createdAt,
    usedAt: coupon.usedAt || ''
  }
}

function dataUrlToBlob(value) {
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i.exec(
    String(value || '')
  )

  if (!match) {
    throw new Error('券码图片格式不受支持')
  }

  const binary = window.atob(match[2].replace(/\s/g, ''))
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: match[1].toLowerCase() })
}

function arrayBufferToDataUrl(value, mimeType) {
  const bytes = new Uint8Array(value)
  const chunkSize = 0x8000
  let binary = ''

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }

  return `data:${mimeType};base64,${window.btoa(binary)}`
}

async function fetchCouponImage(record) {
  try {
    const value = await http.get(
      `/api/xianyu/records/${encodeURIComponent(record.id)}/image`,
      createRequestConfig({ responseType: 'arraybuffer' })
    )

    return arrayBufferToDataUrl(value, record.imageMimeType)
  } catch (error) {
    throw toChineseError(error, '云端图片读取失败，请稍后重试')
  }
}

export async function uploadCoupon(coupon, options = {}) {
  try {
    requireSecureServer()

    const payload = await http.put(
      `/api/xianyu/records/${encodeURIComponent(coupon.id)}`,
      serializeCoupon(coupon),
      createRequestConfig()
    )

    if (options.includeImage !== false && coupon.imageDataUrl) {
      const image = dataUrlToBlob(coupon.imageDataUrl)
      const filename = encodeURIComponent(coupon.imageName || 'coupon-image')

      await http.put(
        `/api/xianyu/records/${encodeURIComponent(coupon.id)}/image?filename=${filename}`,
        image,
        createRequestConfig({
          headers: { 'Content-Type': image.type },
          timeout: Math.max(REQUEST_TIMEOUT_MS, 30_000)
        })
      )
    }

    return payload?.record || serializeCoupon(coupon)
  } catch (error) {
    throw toChineseError(error, '闲鱼记录上传失败，请稍后重试')
  }
}

export async function fetchCoupons() {
  try {
    requireSecureServer()

    const payload = await http.get('/api/xianyu/records', createRequestConfig())
    const records = Array.isArray(payload?.records) ? payload.records : []

    return Promise.all(records.map(async (record) => ({
      ...record,
      imageDataUrl: record.hasImage ? await fetchCouponImage(record) : '',
      imageName: record.imageName || 'coupon-image'
    })))
  } catch (error) {
    throw toChineseError(error, '闲鱼记录同步失败，请稍后重试')
  }
}

export async function deleteCoupon(id) {
  try {
    requireSecureServer()
    return await http.delete(`/api/xianyu/records/${encodeURIComponent(id)}`, createRequestConfig())
  } catch (error) {
    throw toChineseError(error, '云端记录删除失败，请稍后重试')
  }
}
