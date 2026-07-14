const DB_NAME = 'meituan_coupon_record';
const DB_VERSION = 1;
const STORE_NAME = 'coupons';
const BACKUP_KEY = 'meituan_coupon_record_backup_v1';

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

async function listCouponsFromDb() {
  const coupons = await withStore('readonly', (store) => store.getAll());
  return sortCoupons(Array.isArray(coupons) ? coupons : []);
}

async function restoreCouponsToDb(coupons) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    coupons.forEach((coupon) => store.put(coupon));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('恢复本地记录失败'));
    transaction.onabort = () => reject(transaction.error || new Error('恢复本地记录失败'));
  });
}

export async function listCoupons() {
  const backupCoupons = readBackup();

  try {
    const coupons = await listCouponsFromDb();

    if (!coupons.length && backupCoupons.length) {
      await restoreCouponsToDb(backupCoupons);
      return backupCoupons;
    }

    writeBackup(coupons);
    return coupons;
  } catch {
    return backupCoupons;
  }
}

export async function saveCoupon(coupon) {
  try {
    await withStore('readwrite', (store) => store.put(coupon));
    writeBackup(await listCouponsFromDb());
    return coupon;
  } catch (error) {
    const coupons = readBackup();
    const nextCoupons = sortCoupons([
      coupon,
      ...coupons.filter((item) => item.id !== coupon.id)
    ]);

    if (!writeBackup(nextCoupons)) {
      throw error;
    }

    return coupon;
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

