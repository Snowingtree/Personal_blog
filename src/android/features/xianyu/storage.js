import { migrateLegacyShippingCoupon } from './coupon';

const DB_NAME = 'meituan_coupon_record';
const DB_VERSION = 1;
const STORE_NAME = 'coupons';
const BACKUP_KEY = 'meituan_coupon_record_backup_v1';
const STATS_MONTH_STORAGE_KEY = 'meituan_coupon_stats_month';

let dbPromise;

function openDb() {
  if (dbPromise) {
    return dbPromise;
  }

  const opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        if (dbPromise === opening) {
          dbPromise = undefined;
        }
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error || new Error('无法打开本地数据库'));
    request.onblocked = () => reject(new Error('本地数据库正在被其他页面占用'));
  });

  dbPromise = opening;
  opening.catch(() => {
    if (dbPromise === opening) {
      dbPromise = undefined;
    }
  });

  return opening;
}

async function withStore(mode, action) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let requestResult;

    try {
      const request = action(store);
      request.onsuccess = () => {
        requestResult = request.result;
      };
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
      return;
    }

    transaction.oncomplete = () => resolve(requestResult);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function sortCoupons(coupons) {
  return [...coupons].sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt));
}

function dateValue(value) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function readBackup() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) {
      return [];
    }

    const coupons = JSON.parse(raw);
    return Array.isArray(coupons) ? sortCoupons(coupons) : [];
  } catch {
    return [];
  }
}

function writeBackup(coupons) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(sortCoupons(coupons)));
    return true;
  } catch {
    return false;
  }
}

function readLegacyMigrationPayload() {
  const raw = window.__LEGACY_RECORD_DATA__;
  if (typeof raw !== 'string' || !raw) {
    return { found: false, coupons: [], statsMonth: '' };
  }

  try {
    const payload = JSON.parse(raw);
    if (Array.isArray(payload)) {
      return { found: true, coupons: payload, statsMonth: '' };
    }

    return {
      found: true,
      coupons: Array.isArray(payload?.coupons) ? payload.coupons : [],
      statsMonth: typeof payload?.statsMonth === 'string' ? payload.statsMonth : ''
    };
  } catch {
    return { found: false, coupons: [], statsMonth: '' };
  }
}

function clearLegacyMigrationPayload() {
  try {
    delete window.__LEGACY_RECORD_DATA__;
    window.AndroidBridge?.clearLegacyRecordData?.();
  } catch {
    // The imported records are already stored locally, so bridge cleanup can be retried later.
  }
}

function recordTimestamp(coupon) {
  const timestamp = new Date(coupon.updatedAt || coupon.usedAt || coupon.createdAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function mergeCouponCollections(...collections) {
  const couponsById = new Map();

  collections.flat().forEach((coupon) => {
    if (!coupon?.id) return;

    const current = couponsById.get(coupon.id);
    if (!current || recordTimestamp(coupon) >= recordTimestamp(current)) {
      couponsById.set(coupon.id, coupon);
    }
  });

  return sortCoupons(Array.from(couponsById.values()));
}

async function listCouponsFromDb() {
  const coupons = await withStore('readonly', (store) => store.getAll());
  return sortCoupons(Array.isArray(coupons) ? coupons : []);
}

async function replaceCouponsInDb(coupons) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.clear();
    coupons.forEach((coupon) => store.put(coupon));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('更新本地记录失败'));
    transaction.onabort = () => reject(transaction.error || new Error('更新本地记录失败'));
  });
}

function filterCoupons(coupons, options = {}) {
  return options.includeDeleted ? coupons : coupons.filter((coupon) => !coupon.deletedAt);
}

function migrateLegacyStatuses(coupons) {
  const completedAt = new Date().toISOString();
  let changed = false;
  const migratedCoupons = coupons.map((coupon) => {
    const migratedCoupon = migrateLegacyShippingCoupon(coupon, completedAt);
    if (migratedCoupon !== coupon) {
      changed = true;
    }
    return migratedCoupon;
  });

  return {
    coupons: sortCoupons(migratedCoupons),
    changed
  };
}

export async function listCoupons(options = {}) {
  const legacyPayload = readLegacyMigrationPayload();
  if (legacyPayload.statsMonth && !localStorage.getItem(STATS_MONTH_STORAGE_KEY)) {
    localStorage.setItem(STATS_MONTH_STORAGE_KEY, legacyPayload.statsMonth);
  }

  const backupMigration = migrateLegacyStatuses(
    mergeCouponCollections(readBackup(), legacyPayload.coupons)
  );
  const backupCoupons = backupMigration.coupons;
  if (backupMigration.changed || legacyPayload.coupons.length) {
    writeBackup(backupCoupons);
  }

  try {
    const databaseMigration = migrateLegacyStatuses(await listCouponsFromDb());
    const coupons = mergeCouponCollections(databaseMigration.coupons, backupCoupons);

    if (
      legacyPayload.found
      || databaseMigration.changed
      || databaseMigration.coupons.length !== coupons.length
    ) {
      await replaceCouponsInDb(coupons);
    }

    writeBackup(coupons);
    if (legacyPayload.found) {
      clearLegacyMigrationPayload();
    }
    return filterCoupons(coupons, options);
  } catch {
    return filterCoupons(backupCoupons, options);
  }
}

export async function replaceCoupons(coupons) {
  const normalizedCoupons = migrateLegacyStatuses(
    Array.isArray(coupons) ? coupons : []
  ).coupons;

  try {
    await replaceCouponsInDb(normalizedCoupons);
    writeBackup(normalizedCoupons);
  } catch (error) {
    if (!writeBackup(normalizedCoupons)) {
      throw error;
    }
  }

  return normalizedCoupons;
}

export async function saveCoupon(coupon) {
  const normalizedCoupon = migrateLegacyShippingCoupon(coupon, new Date().toISOString());

  try {
    await withStore('readwrite', (store) => store.put(normalizedCoupon));
    writeBackup(await listCouponsFromDb());
    return normalizedCoupon;
  } catch (error) {
    const coupons = readBackup();
    const nextCoupons = sortCoupons([
      normalizedCoupon,
      ...coupons.filter((item) => item.id !== normalizedCoupon.id)
    ]);

    if (!writeBackup(nextCoupons)) {
      throw error;
    }

    return normalizedCoupon;
  }
}

export async function removeCoupon(id) {
  try {
    await withStore('readwrite', (store) => store.delete(id));
    writeBackup(await listCouponsFromDb());
  } catch (error) {
    const nextCoupons = readBackup().filter((item) => item.id !== id);
    if (!writeBackup(nextCoupons)) {
      throw error;
    }
  }
}
