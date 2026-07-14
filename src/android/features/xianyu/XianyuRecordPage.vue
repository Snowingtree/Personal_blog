<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { isServerEnabled, uploadCoupon } from './api';
import {
  FEE_RATE,
  MAX_IMAGE_BYTES,
  STATUS_OPTIONS,
  formatFilenameDate,
  formatMoney,
  formatShortDate,
  getCouponProfit,
  getImageExtension,
  isValidMoney,
  normalizeCoupon,
  statusLabel,
  sumMoney
} from './coupon';
import { listCoupons, removeCoupon, saveCoupon } from './storage';

const ACTION_WIDTH = 216;
const STATS_MONTH_STORAGE_KEY = 'meituan_coupon_stats_month';
const currentDate = new Date();
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

const coupons = ref([]);
const activeTab = ref('records');
const transitionName = ref('slide-left');
const filterStatus = ref('all');
const costPrice = ref('');
const salePrice = ref('');
const description = ref('');
const preview = ref('');
const imageName = ref('');
const topMessage = ref('');
const deleteTarget = ref(null);
const showMonthPicker = ref(false);
const statsYear = ref(currentDate.getFullYear());
const statsMonth = ref(currentDate.getMonth() + 1);
const isBusy = ref(false);
const openRowId = ref('');
const swipeState = ref({
  id: '',
  startX: 0,
  startOffset: 0,
  currentOffset: 0
});
const pageSwipe = ref({
  page: '',
  startX: 0,
  startY: 0
});
const fileInput = ref(null);
let messageTimer = 0;

const normalizedCoupons = computed(() => coupons.value.map(normalizeCoupon));
const filteredCoupons = computed(() => {
  if (filterStatus.value === 'all') {
    return normalizedCoupons.value;
  }

  return normalizedCoupons.value.filter((coupon) => coupon.status === filterStatus.value);
});
const couponCount = computed(() => normalizedCoupons.value.length);
const pendingCount = computed(() => countByStatus('pending'));
const shippingCount = computed(() => countByStatus('shipping'));
const doneCount = computed(() => countByStatus('done'));
const totalCost = computed(() => sumMoney(normalizedCoupons.value, 'costPrice'));
const totalSale = computed(() => sumMoney(normalizedCoupons.value, 'salePrice'));
const totalProfit = computed(() => {
  return normalizedCoupons.value
    .reduce((sum, coupon) => sum + getCouponProfit(coupon), 0)
    .toFixed(2);
});
const statsMonthLabel = computed(() => `${statsYear.value}-${String(statsMonth.value).padStart(2, '0')}`);
const statsYears = computed(() => {
  const years = new Set([
    currentDate.getFullYear() - 1,
    currentDate.getFullYear(),
    currentDate.getFullYear() + 1
  ]);

  normalizedCoupons.value.forEach((coupon) => {
    const date = new Date(coupon.createdAt);
    if (!Number.isNaN(date.getTime())) {
      years.add(date.getFullYear());
    }
  });

  return Array.from(years).sort((a, b) => b - a);
});
const monthlyCoupons = computed(() => {
  return normalizedCoupons.value.filter((coupon) => {
    const date = new Date(coupon.createdAt);
    return (
      !Number.isNaN(date.getTime()) &&
      date.getFullYear() === statsYear.value &&
      date.getMonth() + 1 === statsMonth.value
    );
  });
});
const daysInSelectedMonth = computed(() => new Date(statsYear.value, statsMonth.value, 0).getDate());
const dailyStats = computed(() => {
  const rows = Array.from({ length: daysInSelectedMonth.value }, (_, index) => ({
    day: index + 1,
    label: `${String(statsMonth.value).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`,
    sale: 0,
    profit: 0,
    count: 0
  }));

  monthlyCoupons.value.forEach((coupon) => {
    const date = new Date(coupon.createdAt);
    const row = rows[date.getDate() - 1];
    if (!row) {
      return;
    }

    row.sale += Number(coupon.salePrice || coupon.price || 0);
    row.profit += getCouponProfit(coupon);
    row.count += 1;
  });

  return rows;
});
const dailyReportRows = computed(() => dailyStats.value.filter((row) => row.count > 0).reverse());
const dailyChartMaxValue = computed(() => {
  return Math.max(
    ...dailyStats.value.flatMap((row) => [Math.abs(row.sale), Math.abs(row.profit)]),
    1
  );
});

onMounted(async () => {
  loadStatsSelection();
  await loadCoupons();
});

onBeforeUnmount(() => {
  window.clearTimeout(messageTimer);
});

async function loadCoupons() {
  try {
    coupons.value = await listCoupons();
  } catch (error) {
    setMessage(error.message || '读取本地记录失败');
  }
}

function loadStatsSelection() {
  try {
    const raw = localStorage.getItem(STATS_MONTH_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const saved = JSON.parse(raw);
    if (Number.isInteger(saved.year) && Number.isInteger(saved.month) && saved.month >= 1 && saved.month <= 12) {
      statsYear.value = saved.year;
      statsMonth.value = saved.month;
    }
  } catch {
    localStorage.removeItem(STATS_MONTH_STORAGE_KEY);
  }
}

function saveStatsSelection() {
  localStorage.setItem(
    STATS_MONTH_STORAGE_KEY,
    JSON.stringify({
      year: statsYear.value,
      month: statsMonth.value
    })
  );
}

function setTab(tab, forcedTransition = '') {
  if (tab === activeTab.value) {
    return;
  }

  const tabOrder = ['records', 'add', 'summary', 'settings'];
  const currentIndex = tabOrder.indexOf(activeTab.value);
  const nextIndex = tabOrder.indexOf(tab);
  transitionName.value = forcedTransition || (nextIndex > currentIndex ? 'slide-left' : 'slide-right');
  activeTab.value = tab;
  closeSwipe();
}

function setMessage(text) {
  topMessage.value = text;
  window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => {
    topMessage.value = '';
  }, 2200);
}

function clearMessage() {
  topMessage.value = '';
  window.clearTimeout(messageTimer);
}

function openMonthPicker() {
  showMonthPicker.value = true;
}

function closeMonthPicker() {
  showMonthPicker.value = false;
}

function selectStatsYear(year) {
  statsYear.value = year;
  saveStatsSelection();
}

function selectStatsMonth(month) {
  statsMonth.value = month;
  saveStatsSelection();
}

function chartHeight(value) {
  const amount = Math.abs(Number(value || 0));
  if (amount === 0) {
    return '0%';
  }

  return `${Math.max(8, Math.min(100, (amount / dailyChartMaxValue.value) * 100))}%`;
}

function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    setMessage('请选择图片文件');
    event.target.value = '';
    return;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    setMessage('图片不能超过 15 MB');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== 'string') {
      setMessage('图片读取失败');
      return;
    }

    preview.value = reader.result;
    imageName.value = file.name;
  };
  reader.onerror = () => setMessage('图片读取失败');
  reader.readAsDataURL(file);
}

async function addCoupon() {
  const normalizedCost = costPrice.value.trim();
  const normalizedSale = salePrice.value.trim();

  if (!isValidMoney(normalizedCost)) {
    setMessage('请输入正确的成本价格');
    return;
  }

  if (!isValidMoney(normalizedSale)) {
    setMessage('请输入正确的售价');
    return;
  }

  if (!preview.value) {
    setMessage('请先上传券码图片');
    return;
  }

  isBusy.value = true;

  const coupon = {
    id: createId(),
    description: description.value.trim() || '美团券码',
    costPrice: Number(normalizedCost).toFixed(2),
    salePrice: Number(normalizedSale).toFixed(2),
    price: Number(normalizedSale).toFixed(2),
    status: 'pending',
    imageDataUrl: preview.value,
    imageName: imageName.value || 'coupon.png',
    createdAt: new Date().toISOString(),
    usedAt: ''
  };

  try {
    await saveCoupon(coupon);
    coupons.value = [coupon, ...coupons.value];
    resetForm();

    uploadCoupon(coupon).catch(() => {
      setMessage('已本地保存，服务器同步失败');
    });

    setMessage('券码已保存');
    setTab('records', 'slide-right');
  } catch (error) {
    setMessage(error.message || '保存失败');
  } finally {
    isBusy.value = false;
  }
}

function resetForm() {
  costPrice.value = '';
  salePrice.value = '';
  description.value = '';
  preview.value = '';
  imageName.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

async function completeCoupon(coupon) {
  try {
    await updateCouponStatus(coupon, 'done');
    closeSwipe();
    setMessage('已标记完成');
  } catch (error) {
    setMessage(error.message || '更新状态失败');
  }
}

async function updateCouponStatus(coupon, status) {
  const updated = {
    ...coupon,
    status,
    usedAt: status === 'done' ? coupon.usedAt || new Date().toISOString() : ''
  };

  await saveCoupon(updated);
  coupons.value = coupons.value.map((item) => (item.id === updated.id ? updated : item));
}

function requestDeleteCoupon(coupon) {
  deleteTarget.value = coupon;
  closeSwipe();
}

function cancelDelete() {
  deleteTarget.value = null;
}

async function confirmDeleteCoupon() {
  const coupon = deleteTarget.value;
  if (!coupon) {
    return;
  }

  try {
    await removeCoupon(coupon.id);
    coupons.value = coupons.value.filter((item) => item.id !== coupon.id);
    deleteTarget.value = null;
    closeSwipe();
    setMessage('记录已删除');
  } catch (error) {
    setMessage(error.message || '删除失败');
  }
}

function downloadCouponImage(coupon) {
  const saved = saveImageToPhone(coupon);
  closeSwipe();

  if (saved) {
    setMessage('图片已导出');
  }
}

function saveImageToPhone(coupon) {
  const filename = `meituan-coupon-${formatFilenameDate(coupon.createdAt)}`;

  if (window.AndroidBridge?.saveImage) {
    try {
      const result = window.AndroidBridge.saveImage(coupon.imageDataUrl, filename);
      if (result === 'OK') {
        return true;
      }
      setMessage(result || '保存到手机失败');
      return false;
    } catch {
      setMessage('无法调用手机图片保存功能');
      return false;
    }
  }

  const link = document.createElement('a');
  link.href = coupon.imageDataUrl;
  link.download = `${filename}.${getImageExtension(coupon)}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

function startSwipe(event, coupon) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  if (event.target.closest('button, input, textarea, select')) {
    return;
  }

  const isOpen = openRowId.value === coupon.id;
  swipeState.value = {
    id: coupon.id,
    startX: event.clientX,
    startOffset: isOpen ? -ACTION_WIDTH : 0,
    currentOffset: isOpen ? -ACTION_WIDTH : 0
  };
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function moveSwipe(event) {
  if (!swipeState.value.id) {
    return;
  }

  const delta = event.clientX - swipeState.value.startX;
  const nextOffset = clamp(swipeState.value.startOffset + delta, -ACTION_WIDTH, 0);
  swipeState.value = {
    ...swipeState.value,
    currentOffset: nextOffset
  };
}

function endSwipe() {
  if (!swipeState.value.id) {
    return;
  }

  openRowId.value = swipeState.value.currentOffset < -72 ? swipeState.value.id : '';
  swipeState.value = {
    id: '',
    startX: 0,
    startOffset: 0,
    currentOffset: 0
  };
}

function startPageSwipe(event, page) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  if (!['records', 'add', 'summary'].includes(page)) {
    return;
  }

  if (event.target.closest('button, input, textarea, select, .upload-button, .record-row, .daily-chart')) {
    return;
  }

  pageSwipe.value = {
    page,
    startX: event.clientX,
    startY: event.clientY
  };
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function endPageSwipe(event) {
  if (!pageSwipe.value.page) {
    return;
  }

  const deltaX = event.clientX - pageSwipe.value.startX;
  const deltaY = event.clientY - pageSwipe.value.startY;
  const page = pageSwipe.value.page;
  pageSwipe.value = {
    page: '',
    startX: 0,
    startY: 0
  };

  if (Math.abs(deltaX) < 80 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
    return;
  }

  const visibleTabs = ['records', 'add', 'summary'];
  const currentIndex = visibleTabs.indexOf(page);
  if (currentIndex < 0) {
    return;
  }

  if (deltaX < 0) {
    const nextIndex = (currentIndex + 1) % visibleTabs.length;
    setTab(visibleTabs[nextIndex], 'slide-left');
  }

  if (deltaX > 0) {
    const previousIndex = (currentIndex - 1 + visibleTabs.length) % visibleTabs.length;
    setTab(visibleTabs[previousIndex], 'slide-right');
  }
}

function cancelPageSwipe() {
  pageSwipe.value = {
    page: '',
    startX: 0,
    startY: 0
  };
}

function closeSwipe() {
  openRowId.value = '';
  swipeState.value = {
    id: '',
    startX: 0,
    startOffset: 0,
    currentOffset: 0
  };
}

function rowOffset(coupon) {
  if (swipeState.value.id === coupon.id) {
    return swipeState.value.currentOffset;
  }

  return openRowId.value === coupon.id ? -ACTION_WIDTH : 0;
}

function countByStatus(status) {
  return normalizedCoupons.value.filter((coupon) => coupon.status === status).length;
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

</script>

<template>
  <main class="xianyu-record app-shell">
    <div
      class="page-frame"
      @pointerdown="startPageSwipe($event, activeTab)"
      @pointerup="endPageSwipe"
      @pointercancel="cancelPageSwipe"
      @lostpointercapture="cancelPageSwipe"
    >
      <Transition :name="transitionName" appear>
        <section
          v-if="activeTab === 'records'"
          key="records"
          class="page records-page"
          aria-label="记录"
        >
          <div class="section-title">
            <h1>记录</h1>
            <label class="filter-select">
              <select v-model="filterStatus" aria-label="状态筛选">
                <option value="all">全部</option>
                <option v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>

          <div class="record-list">
            <article v-for="coupon in filteredCoupons" :key="coupon.id" class="record-row">
              <div class="row-actions">
                <button class="action-button danger" type="button" title="删除" aria-label="删除" @click="requestDeleteCoupon(coupon)">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" />
                  </svg>
                </button>
                <button class="action-button success" type="button" title="完成" aria-label="完成" @click="completeCoupon(coupon)">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9.2 16.6 4.9 12.3l1.4-1.4 2.9 2.9 8.5-8.5 1.4 1.4-9.9 9.9Z" />
                  </svg>
                </button>
                <button class="action-button info" type="button" title="导出" aria-label="导出" @click="downloadCouponImage(coupon)">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 4h2v8.2l3.1-3.1 1.4 1.4L12 16l-5.5-5.5 1.4-1.4 3.1 3.1V4Zm-6 14h14v2H5v-2Z" />
                  </svg>
                </button>
              </div>

              <div
                :class="['record-front', { dragging: swipeState.id === coupon.id }]"
                :style="{ transform: `translateX(${rowOffset(coupon)}px)` }"
                @pointerdown="startSwipe($event, coupon)"
                @pointermove="moveSwipe"
                @pointerup="endSwipe"
                @pointercancel="endSwipe"
                @lostpointercapture="endSwipe"
              >
                <div class="record-main">
                  <strong>{{ coupon.description || '美团券码' }}</strong>
                  <span>上传 {{ formatShortDate(coupon.createdAt) }}</span>
                </div>
                <div class="record-meta">
                  <strong>¥{{ formatMoney(coupon.salePrice) }}</strong>
                  <span :class="['status-badge', coupon.status]">{{ statusLabel(coupon.status) }}</span>
                </div>
              </div>
            </article>

            <div v-if="!filteredCoupons.length" class="empty-state">
              <strong>暂无记录</strong>
              <span>{{ couponCount ? '当前筛选没有记录。' : '点底部 + 新增第一张券码。' }}</span>
            </div>
          </div>
        </section>

        <section
          v-else-if="activeTab === 'add'"
          key="add"
          class="page add-page"
          aria-label="新增"
        >
          <div class="section-title">
            <h1>新增</h1>
          </div>

          <div class="price-form">
            <label class="line-field">
              <span>成本价格</span>
              <input v-model="costPrice" inputmode="decimal" autocomplete="off" placeholder="0.00" />
            </label>

            <label class="line-field">
              <span>售价</span>
              <input v-model="salePrice" inputmode="decimal" autocomplete="off" placeholder="0.00" />
            </label>
          </div>

          <label class="field">
            <span>描述</span>
            <textarea v-model="description" rows="3" placeholder="例如：万达美团券、午餐套餐"></textarea>
          </label>

          <div class="action-row">
            <label class="upload-button">
              <input ref="fileInput" type="file" accept="image/*" @change="handleFileChange" />
              <span>{{ preview ? '重新上传' : '上传' }}</span>
            </label>
            <button class="primary-button" type="button" :disabled="isBusy" @click="addCoupon">
              {{ isBusy ? '保存中…' : '保存' }}
            </button>
          </div>

          <div v-if="preview" class="preview-wrap">
            <img :src="preview" alt="待保存的券码预览" />
          </div>
        </section>

        <section
          v-else-if="activeTab === 'summary'"
          key="summary"
          class="page summary-page"
          aria-label="汇总"
        >
          <div class="section-title">
            <h1>汇总</h1>
            <button class="icon-button" type="button" title="设置" aria-label="设置" @click="setTab('settings')">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2h-4l-.4 3a8 8 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5A9 9 0 0 0 4.5 12c0 .5 0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.4 3h4l.4-3a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" />
              </svg>
            </button>
          </div>

          <div class="summary-strip">
            <div>
              <span>总记录</span>
              <strong>{{ couponCount }}</strong>
            </div>
            <div>
              <span>未完成</span>
              <strong>{{ pendingCount }}</strong>
            </div>
            <div>
              <span>待收货</span>
              <strong>{{ shippingCount }}</strong>
            </div>
            <div>
              <span>已完成</span>
              <strong>{{ doneCount }}</strong>
            </div>
          </div>

          <div class="profit-panel">
            <div>
              <span>总成本</span>
              <strong>¥{{ totalCost }}</strong>
            </div>
            <div>
              <span>总售价</span>
              <strong>¥{{ totalSale }}</strong>
            </div>
            <div class="profit-total">
              <span>总利润</span>
              <strong>¥{{ totalProfit }}</strong>
            </div>
          </div>

          <div class="stats-module">
            <button class="stats-header" type="button" @click="openMonthPicker">
              <strong>每日统计</strong>
              <span>{{ statsMonthLabel }}</span>
            </button>

            <div class="daily-chart" aria-label="每日售价和利润统计">
              <div v-for="row in dailyStats" :key="row.day" class="daily-chart-day">
                <div class="daily-bars">
                  <div class="daily-bar sale" :style="{ height: chartHeight(row.sale) }"></div>
                  <div
                    :class="['daily-bar', 'profit', { negative: row.profit < 0 }]"
                    :style="{ height: chartHeight(row.profit) }"
                  ></div>
                </div>
                <span>{{ row.day }}</span>
              </div>
            </div>

            <div class="chart-legend">
              <span><i class="legend-dot sale"></i>售价</span>
              <span><i class="legend-dot profit"></i>利润</span>
            </div>
          </div>

          <div class="daily-report">
            <div class="daily-report-title">
              <strong>日报表</strong>
              <span>{{ statsMonthLabel }} · {{ dailyReportRows.length }} 天</span>
            </div>

            <div v-if="dailyReportRows.length" class="daily-report-list">
              <div v-for="row in dailyReportRows" :key="row.day" class="daily-report-row">
                <div>
                  <strong>{{ row.label }}</strong>
                  <span>{{ row.count }} 条记录</span>
                </div>
                <div>
                  <span>售价</span>
                  <strong>¥{{ formatMoney(row.sale) }}</strong>
                </div>
                <div>
                  <span>利润</span>
                  <strong>¥{{ formatMoney(row.profit) }}</strong>
                </div>
              </div>
            </div>

            <div v-else class="daily-report-empty">
              当前月份暂无记录
            </div>
          </div>
        </section>

        <section v-else key="settings" class="page settings-page" aria-label="设置">
          <div class="section-title">
            <h1>设置</h1>
            <button class="text-button" type="button" @click="setTab('summary', 'slide-right')">返回</button>
          </div>

          <div class="settings-list">
            <div>
              <span>固定手续费</span>
              <strong>{{ (FEE_RATE * 100).toFixed(1) }}%</strong>
            </div>
            <div>
              <span>存储</span>
              <strong>本地</strong>
            </div>
            <div>
              <span>服务器</span>
              <strong>{{ isServerEnabled() ? '已配置' : '未配置' }}</strong>
            </div>
            <div>
              <span>记录</span>
              <strong>{{ couponCount }}</strong>
            </div>
          </div>
        </section>
      </Transition>
    </div>

    <Transition name="message-slide">
      <div v-if="topMessage" class="top-message" role="status" @click="clearMessage">
        {{ topMessage }}
      </div>
    </Transition>

    <Transition name="dialog-fade">
      <div v-if="deleteTarget" class="dialog-backdrop" @click.self="cancelDelete">
        <div class="dialog-box" role="dialog" aria-modal="true" aria-label="删除确认">
          <strong>删除记录</strong>
          <p>确定要删除这条记录吗？删除后不能恢复。</p>
          <div class="dialog-actions">
            <button class="secondary-button" type="button" @click="cancelDelete">取消</button>
            <button class="danger-button" type="button" @click="confirmDeleteCoupon">删除</button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="picker-fade">
      <div v-if="showMonthPicker" class="month-picker-layer">
        <div class="month-picker-header">
          <button type="button" @click="closeMonthPicker">取消</button>
          <strong>选择月份</strong>
          <button type="button" @click="closeMonthPicker">完成</button>
        </div>
        <div class="picker-wheels">
          <div class="picker-column" aria-label="年份">
            <button
              v-for="year in statsYears"
              :key="year"
              type="button"
              :class="{ active: statsYear === year }"
              @click="selectStatsYear(year)"
            >
              {{ year }}
            </button>
          </div>
          <div class="picker-column" aria-label="月份">
            <button
              v-for="month in MONTH_OPTIONS"
              :key="month"
              type="button"
              :class="{ active: statsMonth === month }"
              @click="selectStatsMonth(month)"
            >
              {{ String(month).padStart(2, '0') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <nav class="bottom-nav" aria-label="底部导航">
      <button
        type="button"
        :class="{ active: activeTab === 'records' }"
        :aria-current="activeTab === 'records' ? 'page' : undefined"
        title="记录"
        aria-label="记录"
        @click="setTab('records')"
      >
        <svg class="nav-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3h11a2 2 0 0 1 2 2v16H7a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2Zm1 2a1 1 0 0 0-1 1v11.2c.3-.1.6-.2 1-.2h10V5H7Zm0 14a1 1 0 0 0 0 2h12v-2H7Zm2-11h6v2H9V8Zm0 4h6v2H9v-2Z" />
        </svg>
      </button>
      <button
        type="button"
        class="add-nav"
        :class="{ active: activeTab === 'add' }"
        :aria-current="activeTab === 'add' ? 'page' : undefined"
        title="新增"
        aria-label="新增"
        @click="setTab('add')"
      >
        <svg class="plus-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
        </svg>
      </button>
      <button
        type="button"
        :class="{ active: ['summary', 'settings'].includes(activeTab) }"
        :aria-current="['summary', 'settings'].includes(activeTab) ? 'page' : undefined"
        title="汇总"
        aria-label="汇总"
        @click="setTab('summary')"
      >
        <svg class="nav-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 19h14v2H5v-2Zm1-8h3v6H6v-6Zm5-6h3v12h-3V5Zm5 3h3v9h-3V8Z" />
        </svg>
      </button>
    </nav>
  </main>
</template>

<style scoped src="./styles.css"></style>
