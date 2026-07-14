const API_BASE_URL = String(import.meta.env.VITE_XIANYU_API_BASE_URL || '').replace(/\/+$/, '');
const configuredTimeout = Number(import.meta.env.VITE_XIANYU_API_TIMEOUT_MS);
const REQUEST_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0
  ? configuredTimeout
  : 15_000;

export function isServerEnabled() {
  return Boolean(API_BASE_URL);
}

export async function uploadCoupon(coupon) {
  if (!API_BASE_URL) {
    return { skipped: true };
  }

  return request('/coupons', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(coupon)
  });
}

export async function fetchCoupons() {
  if (!API_BASE_URL) {
    return [];
  }

  return request('/coupons');
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new Error(message || `服务器请求失败：${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('application/json') ? response.json() : response.text();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('服务器请求超时');
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function readErrorMessage(response) {
  try {
    const text = await response.text();
    if (!text) {
      return '';
    }

    try {
      const body = JSON.parse(text);
      return body.message || body.error || text;
    } catch {
      return text;
    }
  } catch {
    return '';
  }
}
