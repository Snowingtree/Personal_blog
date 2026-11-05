<template>
  <main class="xianyu-page">
    <header class="xianyu-header">
      <button type="button" class="xianyu-back" @click="goBack">
        <span aria-hidden="true">‹</span>
        返回
      </button>
      <h1>咸鱼</h1>

      <nav class="xianyu-tabs" aria-label="列表切换">
        <button
          type="button"
          class="xianyu-tab"
          :class="{ 'is-active': activeTab === 'xianyu' }"
          @click="activeTab = 'xianyu'"
        >
          咸鱼列表
        </button>
        <button
          type="button"
          class="xianyu-tab"
          :class="{ 'is-active': activeTab === 'quan' }"
          @click="activeTab = 'quan'"
        >
          券列表
        </button>
      </nav>
    </header>

    <div class="xianyu-layout">
      <Transition name="fade" mode="out-in">
        <section v-if="activeTab === 'xianyu'" key="xianyu-form" class="xianyu-card xianyu-form">
          <div class="xianyu-form-body">
            <h2>新增</h2>

            <label class="xianyu-field">
              <span>url</span>
              <input
                v-model="url"
                type="text"
                placeholder="请输入 url"
                autocomplete="off"
              />
            </label>

            <label class="xianyu-field">
              <span>名称</span>
              <input
                v-model="name"
                type="text"
                placeholder="请输入名称"
                autocomplete="off"
              />
            </label>

            <button
              type="button"
              class="xianyu-add"
              :disabled="!canSubmit || submitting"
              @click="handleAdd"
            >
              {{ submitting ? '新增中…' : '新增' }}
            </button>

            <p v-if="error" class="xianyu-error" role="alert">{{ error }}</p>
          </div>
        </section>

        <div v-else key="quan-stats" class="xianyu-quan-side">
          <section class="xianyu-card xianyu-form">
            <div class="xianyu-form-body">
              <h2>搜索</h2>

              <div class="xianyu-quan-search">
                <input
                  v-model="quanSearch"
                  type="text"
                  placeholder="搜索名称"
                  autocomplete="off"
                />
                <select v-model="quanSoldFilter">
                  <option value="all">全部</option>
                  <option value="sold">已完成</option>
                  <option value="unsold">待售</option>
                </select>
              </div>
            </div>
          </section>

          <section class="xianyu-card xianyu-form">
            <div class="xianyu-form-body">
              <h2>售卖统计</h2>

              <div class="xianyu-quan-stats">
                <div class="xianyu-quan-stat">
                  <span>已完成</span>
                  <strong>{{ quanStats.soldCount }} 张</strong>
                </div>
                <div class="xianyu-quan-stat">
                  <span>待售</span>
                  <strong>{{ quanStats.unsoldCount }} 张</strong>
                </div>
                <div class="xianyu-quan-stat">
                  <span>总销售额</span>
                  <strong>¥{{ formatMoney(quanStats.totalRevenue) }}</strong>
                </div>
                <div class="xianyu-quan-stat">
                  <span>总原价</span>
                  <strong>¥{{ formatMoney(quanStats.totalCost) }}</strong>
                </div>
                <div class="xianyu-quan-stat xianyu-quan-stat--profit">
                  <span>利润</span>
                  <strong>¥{{ formatMoney(quanStats.profit) }}</strong>
                </div>
              </div>
            </div>
          </section>
        </div>
      </Transition>

      <section class="xianyu-card xianyu-list-card">
        <Transition name="fade" mode="out-in">
          <div v-if="activeTab === 'xianyu'" key="xianyu-list" class="xianyu-list-pane">
            <div class="xianyu-list-heading">
              <h2>列表</h2>
              <span>{{ items.length }} 条</span>
            </div>

            <p v-if="loading" class="xianyu-empty">加载中…</p>
            <p v-else-if="!items.length" class="xianyu-empty">暂无数据，先在左侧添加一条吧。</p>

            <div v-else class="xianyu-table-wrap">
              <table class="xianyu-table">
                <colgroup>
                  <col class="xianyu-col-name" />
                  <col />
                  <col class="xianyu-col-action" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">名称</th>
                    <th scope="col">url</th>
                    <th scope="col">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, index) in items"
                    :key="item.id"
                    :class="{ 'xianyu-row--alt': index % 2 === 1 }"
                  >
                    <td class="xianyu-cell xianyu-cell--name" :title="item.name">{{ item.name }}</td>
                    <td class="xianyu-cell xianyu-cell--url">
                      <a
                        :href="item.url"
                        :title="item.url"
                        target="_blank"
                        rel="noopener noreferrer"
                      >{{ item.url }}</a>
                    </td>
                    <td class="xianyu-cell xianyu-cell--action">
                      <button
                        type="button"
                        class="xianyu-item__remove"
                        :aria-label="`删除 ${item.name}`"
                        title="删除"
                        @click="removeItem(item.id)"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="!loading && items.length" class="xianyu-table-foot">
              共 {{ items.length }} 条 · 已全部显示
            </div>
          </div>

          <div v-else key="quan-list" class="xianyu-list-pane">
            <div class="xianyu-list-heading">
              <h2>券列表</h2>
              <span>{{ filteredQuanItems.length }} 张</span>
            </div>

            <p v-if="quanLoading" class="xianyu-empty">加载中…</p>
            <p v-else-if="quanError" class="xianyu-empty xianyu-empty--error">{{ quanError }}</p>
            <p v-else-if="!filteredQuanItems.length" class="xianyu-empty">暂无数据</p>

            <div v-else class="xianyu-quan-table-wrap">
              <table class="xianyu-quan-table">
                <colgroup>
                  <col class="xianyu-quan-col-name" />
                  <col />
                  <col />
                  <col />
                  <col />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">名称</th>
                    <th scope="col">原价</th>
                    <th scope="col">售价</th>
                    <th scope="col">利润</th>
                    <th scope="col">状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, index) in filteredQuanItems"
                    :key="item.id"
                    :class="{
                      'xianyu-quan-row--alt': index % 2 === 1,
                      'xianyu-quan-row--sold': item.sold
                    }"
                  >
                    <td class="xianyu-quan-cell xianyu-quan-cell--name">{{ item.name || '未命名' }}</td>
                    <td class="xianyu-quan-cell">¥{{ formatMoney(item.originalPrice) }}</td>
                    <td class="xianyu-quan-cell">¥{{ formatMoney(item.price) }}</td>
                    <td class="xianyu-quan-cell xianyu-quan-cell--profit">¥{{ formatMoney(profitOf(item)) }}</td>
                    <td class="xianyu-quan-cell xianyu-quan-cell--status" :class="{ 'is-sold': item.sold }">
                      {{ item.sold ? '已售出' : '待售' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Transition>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import http from '../../utils/http'

const router = useRouter()
const url = ref('')
const name = ref('')
const items = ref([])
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const activeTab = ref('xianyu')

const isUat = import.meta.env.MODE === 'uat'

const MOCK_XIANYU_ITEMS = [
  { id: 'x1', name: '索尼 A7M4 相机', url: 'https://www.goofish.com/item?id=1' },
  { id: 'x2', name: '罗技 GPW 鼠标', url: 'https://www.goofish.com/item?id=2' },
  { id: 'x3', name: '任天堂 Switch OLED', url: 'https://www.goofish.com/item?id=3' }
]

const MOCK_QUAN_ITEMS = [
  { id: 'q1', name: '麦当劳代金券', price: 88, originalPrice: 60, sold: true, createdAt: '2026-11-01T10:00:00.000Z' },
  { id: 'q2', name: '肯德基 50 元券', price: 45, originalPrice: 30, sold: true, createdAt: '2026-11-02T10:00:00.000Z' },
  { id: 'q3', name: '星巴克 100 元券', price: 199, originalPrice: 150, sold: false, createdAt: '2026-11-03T10:00:00.000Z' }
]

const quanItems = ref([])
const quanLoading = ref(false)
const quanError = ref('')
const quanSearch = ref('')
const quanSoldFilter = ref('all')

const canSubmit = computed(() => url.value.trim() !== '' && name.value.trim() !== '')

const FEE_RATE = 0.006

const quanStats = computed(() => {
  const soldItems = quanItems.value.filter((item) => item.sold)
  const soldCount = soldItems.length
  const unsoldCount = quanItems.value.length - soldCount
  const totalRevenue = soldItems.reduce((sum, item) => sum + Number(item.price || 0), 0)
  const totalCost = soldItems.reduce((sum, item) => sum + Number(item.originalPrice || 0), 0)
  const totalFee = totalRevenue * FEE_RATE
  const profit = totalRevenue - totalCost - totalFee

  return { soldCount, unsoldCount, totalRevenue, totalCost, profit }
})

const filteredQuanItems = computed(() => {
  const keyword = quanSearch.value.trim()

  return quanItems.value
    .filter((item) => {
      const matchName = !keyword || (item.name || '').toLowerCase().includes(keyword.toLowerCase())
      const matchSold =
        quanSoldFilter.value === 'all'
        || (quanSoldFilter.value === 'sold' && item.sold)
        || (quanSoldFilter.value === 'unsold' && !item.sold)

      return matchName && matchSold
    })
    .sort((a, b) => Number(Boolean(a.sold)) - Number(Boolean(b.sold)))
})

function formatMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  return number.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function profitOf(item) {
  const price = Number(item.price || 0)
  const originalPrice = Number(item.originalPrice || 0)
  return price - originalPrice - price * FEE_RATE
}

async function loadQuanItems() {
  quanLoading.value = true
  quanError.value = ''

  if (isUat) {
    quanItems.value = [...MOCK_QUAN_ITEMS]
    quanLoading.value = false
    return
  }

  try {
    const data = await http.get('/api/quanshang/items')
    quanItems.value = Array.isArray(data.items) ? data.items : []
  } catch (err) {
    quanItems.value = []
    quanError.value = err instanceof Error ? err.message : '加载失败，请稍后重试'
  } finally {
    quanLoading.value = false
  }
}

async function loadItems() {
  loading.value = true
  error.value = ''

  if (isUat) {
    items.value = [...MOCK_XIANYU_ITEMS]
    loading.value = false
    return
  }

  try {
    const data = await http.get('/api/xianyu/items')
    items.value = Array.isArray(data.items) ? data.items : []
  } catch (err) {
    items.value = []
    error.value = err instanceof Error ? err.message : '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function handleAdd() {
  if (!canSubmit.value || submitting.value) return

  submitting.value = true
  error.value = ''

  if (isUat) {
    items.value.unshift({
      id: `mock-${Date.now()}`,
      name: name.value.trim(),
      url: url.value.trim()
    })
    url.value = ''
    name.value = ''
    submitting.value = false
    return
  }

  try {
    const data = await http.post('/api/xianyu/items', {
      url: url.value.trim(),
      name: name.value.trim()
    })

    if (data.item) {
      items.value.unshift(data.item)
    }

    url.value = ''
    name.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : '新增失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

async function removeItem(id) {
  error.value = ''

  if (isUat) {
    items.value = items.value.filter((item) => item.id !== id)
    return
  }

  try {
    await http.delete(`/api/xianyu/items/${id}`)
    items.value = items.value.filter((item) => item.id !== id)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除失败，请稍后重试'
  }
}

function goBack() {
  router.push('/tools')
}

onMounted(() => {
  loadItems()
  loadQuanItems()
})
</script>

<style scoped>
.xianyu-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 32px 32px 32px;
  color: #171717;
  background: #ffffff;
  overflow: hidden;
}

.xianyu-header {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 28px;
  flex: 0 0 auto;
}

.xianyu-header h1 {
  margin: 0;
  font-size: 1.9rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.xianyu-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid #e7e7e7;
  border-radius: 10px;
  color: #171717;
  background: #ffffff;
  font: inherit;
  font-size: 0.86rem;
  cursor: pointer;
  transition: background-color 160ms ease;
}

.xianyu-back:hover {
  background: #f4f4f4;
}

.xianyu-back span {
  font-size: 1.3rem;
  line-height: 1;
}

.xianyu-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0 auto;
  padding: 4px;
  border: 1px solid #e7e7e7;
  border-radius: 999px;
  background: #f5f5f5;
}

.xianyu-tab {
  min-height: 34px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  color: #6b6b6b;
  background: transparent;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 160ms ease, background-color 160ms ease;
}

.xianyu-tab.is-active {
  color: #ffffff;
  background: #171717;
}

.xianyu-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 24px;
  align-items: stretch;
}

.xianyu-card {
  border: 1px solid #e7e7e7;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.05);
}

.xianyu-card h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 750;
}

.xianyu-form {
  align-self: start;
  padding: 22px;
}

.xianyu-quan-side {
  align-self: start;
  display: grid;
  gap: 16px;
}

.xianyu-form-body {
  display: grid;
  gap: 16px;
}

.xianyu-quan-search {
  display: grid;
  gap: 10px;
}

.xianyu-quan-search input,
.xianyu-quan-search select {
  width: 100%;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid #dedede;
  border-radius: 10px;
  color: #171717;
  background: #ffffff;
  font: inherit;
  font-size: 0.88rem;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.xianyu-quan-search input::placeholder {
  color: #a3a3a3;
}

.xianyu-quan-search input:focus,
.xianyu-quan-search select:focus {
  border-color: #9b9b9b;
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.06);
}

.xianyu-quan-stats {
  display: grid;
  gap: 10px;
}

.xianyu-quan-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #ededed;
  border-radius: 10px;
  background: #fafafa;
}

.xianyu-quan-stat span {
  color: #6b6b6b;
  font-size: 0.82rem;
}

.xianyu-quan-stat strong {
  color: #171717;
  font-size: 0.95rem;
  font-weight: 800;
}

.xianyu-quan-stat--profit {
  border-color: #f0d4d1;
  background: #fdf3f2;
}

.xianyu-quan-stat--profit strong {
  color: #d14c3e;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.xianyu-field {
  display: grid;
  gap: 8px;
}

.xianyu-field span {
  font-size: 0.82rem;
  font-weight: 700;
  color: #4f4f4f;
}

.xianyu-field input {
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid #dedede;
  border-radius: 10px;
  color: #171717;
  background: #ffffff;
  font: inherit;
  font-size: 0.92rem;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.xianyu-field input::placeholder {
  color: #a3a3a3;
}

.xianyu-field input:focus {
  border-color: #9b9b9b;
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.06);
}

.xianyu-add {
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  color: #ffffff;
  background: #171717;
  font: inherit;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 160ms ease, transform 160ms ease;
}

.xianyu-add:hover:not(:disabled) {
  opacity: 0.88;
}

.xianyu-add:active:not(:disabled) {
  transform: scale(0.99);
}

.xianyu-add:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.xianyu-error {
  margin: 0;
  color: #d14c3e;
  font-size: 0.82rem;
  line-height: 1.5;
}

.xianyu-list-card {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 22px;
}

.xianyu-list-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.xianyu-list-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex: 0 0 auto;
}

.xianyu-list-heading span {
  color: #8a8a8a;
  font-size: 0.78rem;
}

.xianyu-empty {
  flex: 1;
  margin: 0;
  display: grid;
  place-items: center;
  color: #9a9a9a;
  font-size: 0.88rem;
  text-align: center;
}

.xianyu-empty--error {
  color: #d14c3e;
  padding: 0 12px;
  line-height: 1.5;
}

.xianyu-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid #e7e7e7;
  border-radius: 12px;
}

.xianyu-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  font-size: 0.88rem;
}

.xianyu-col-name {
  width: 30%;
}

.xianyu-col-action {
  width: 84px;
}

.xianyu-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 13px 16px;
  border-bottom: 1px solid #e0e0e0;
  color: #5c5c5c;
  background: #f7f7f7;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: left;
  white-space: nowrap;
  user-select: none;
}

.xianyu-table thead th:last-child {
  text-align: center;
}

.xianyu-table tbody tr {
  background: #ffffff;
  transition: background-color 120ms ease;
}

.xianyu-table tbody tr.xianyu-row--alt {
  background: #f6f6f6;
}

.xianyu-table tbody tr:hover {
  background: #ededed;
}

.xianyu-cell {
  padding: 13px 16px;
  border-bottom: 1px solid #d7d7d7;
  vertical-align: middle;
}

.xianyu-cell--name {
  overflow: hidden;
  color: #171717;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xianyu-cell--url {
  overflow: hidden;
  color: #8a8a8a;
  font-size: 0.84rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xianyu-cell--url a {
  color: inherit;
  text-decoration: none;
}

.xianyu-cell--url a:hover {
  color: #171717;
  text-decoration: underline;
}

.xianyu-cell--action {
  text-align: center;
}

.xianyu-table-foot {
  flex: 0 0 auto;
  margin-top: 12px;
  padding: 9px 16px;
  border-radius: 8px;
  color: #9a9a9a;
  background: #f7f7f7;
  font-size: 0.76rem;
  text-align: center;
  user-select: none;
}

.xianyu-item__remove {
  width: 30px;
  height: 30px;
  display: inline-grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #9a9a9a;
  background: transparent;
  font: inherit;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  transition: color 140ms ease, background-color 140ms ease, border-color 140ms ease;
}

.xianyu-item__remove:hover {
  color: #d14c3e;
  border-color: #e7e7e7;
  background: #ffffff;
}

.xianyu-quan-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid #e7e7e7;
  border-radius: 12px;
}

.xianyu-quan-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  font-size: 0.88rem;
}

.xianyu-quan-col-name {
  width: 34%;
}

.xianyu-quan-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  color: #5c5c5c;
  background: #f7f7f7;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: left;
  white-space: nowrap;
  user-select: none;
}

.xianyu-quan-table thead th:not(:first-child) {
  text-align: right;
}

.xianyu-quan-table tbody tr {
  background: #ffffff;
  transition: background-color 120ms ease;
}

.xianyu-quan-table tbody tr.xianyu-quan-row--alt {
  background: #f6f6f6;
}

.xianyu-quan-table tbody tr.xianyu-quan-row--sold {
  background: #fdf3f2;
}

.xianyu-quan-table tbody tr:hover {
  background: #ededed;
}

.xianyu-quan-cell {
  padding: 12px 16px;
  border-bottom: 1px solid #d7d7d7;
  vertical-align: middle;
}

.xianyu-quan-cell--name {
  overflow: hidden;
  color: #171717;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xianyu-quan-cell:not(:first-child) {
  text-align: right;
  color: #4f4f4f;
  font-variant-numeric: tabular-nums;
}

.xianyu-quan-cell--profit {
  color: #d14c3e;
  font-weight: 700;
}

.xianyu-quan-table .xianyu-quan-cell--status {
  color: #9a9a9a;
  font-weight: 600;
}

.xianyu-quan-table .xianyu-quan-cell--status.is-sold {
  color: #d14c3e;
  font-weight: 700;
}

@media (max-width: 760px) {
  .xianyu-page {
    width: 100%;
    height: auto;
    min-height: 100vh;
    padding: 24px 16px 40px;
    overflow: visible;
  }

  .xianyu-layout {
    grid-template-columns: 1fr;
  }

  .xianyu-list-card {
    max-height: 60vh;
  }
}
</style>
