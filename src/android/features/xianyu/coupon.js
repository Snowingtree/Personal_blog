export const FEE_RATE = 0.006;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export const STATUS_OPTIONS = Object.freeze([
  { value: 'pending', label: '未完成' },
  { value: 'done', label: '已完成' }
]);

const STATUS_LABELS = Object.fromEntries(
  STATUS_OPTIONS.map((item) => [item.value, item.label])
);

export function migrateLegacyShippingCoupon(coupon = {}, completedAt = '') {
  if (coupon.status !== 'shipping') {
    return coupon;
  }

  return {
    ...coupon,
    status: 'done',
    usedAt: coupon.usedAt || completedAt
  };
}

export function normalizeCoupon(coupon = {}) {
  const migratedCoupon = migrateLegacyShippingCoupon(coupon);
  const status = migratedCoupon.status || (migratedCoupon.usedAt ? 'done' : 'pending');
  const salePrice = migratedCoupon.salePrice ?? migratedCoupon.price ?? '0.00';

  return {
    ...migratedCoupon,
    status,
    costPrice: migratedCoupon.costPrice ?? '0.00',
    salePrice,
    price: salePrice
  };
}

export function getCouponProfit(coupon) {
  const sale = toFiniteNumber(coupon.salePrice ?? coupon.price);
  const cost = toFiniteNumber(coupon.costPrice);
  return sale - cost - getCouponFee(coupon);
}

export function getCouponFee(coupon) {
  const sale = toFiniteNumber(coupon.salePrice ?? coupon.price);
  return sale * FEE_RATE;
}

export function sumCompletedProfit(items) {
  return items
    .filter((coupon) => normalizeCoupon(coupon).status === 'done')
    .reduce((sum, coupon) => sum + getCouponProfit(coupon), 0)
    .toFixed(2);
}

export function sumMoney(items, key) {
  return items
    .reduce((sum, coupon) => sum + toFiniteNumber(coupon[key]), 0)
    .toFixed(2);
}

export function isValidMoney(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return false;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0;
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || STATUS_LABELS.pending;
}

export function formatShortDate(value) {
  return formatDateWithOptions(value, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatMoney(value) {
  return toFiniteNumber(value).toFixed(2);
}

export function formatFilenameDate(value) {
  const date = toValidDate(value) || new Date();
  return date.toISOString().replace(/[:.]/g, '-');
}

export function getImageExtension(coupon) {
  const mimeMatch = /^data:image\/(png|jpe?g|webp|gif);/i.exec(coupon.imageDataUrl || '');
  if (mimeMatch) {
    return mimeMatch[1].toLowerCase().replace('jpeg', 'jpg');
  }

  const filenameMatch = /\.(png|jpe?g|webp|gif)$/i.exec(coupon.imageName || '');
  return filenameMatch ? filenameMatch[1].toLowerCase().replace('jpeg', 'jpg') : 'png';
}

function formatDateWithOptions(value, options) {
  const date = toValidDate(value);
  if (!date) {
    return '-';
  }

  return new Intl.DateTimeFormat('zh-CN', options).format(date);
}

function toValidDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toFiniteNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}
