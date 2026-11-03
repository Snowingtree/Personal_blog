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
      <section class="xianyu-card xianyu-form">
        <Transition name="fade" mode="out-in">
          <div v-if="activeTab === 'xianyu'" key="xianyu-form" class="xianyu-form-body">
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

          <div v-else key="quan-stats" class="xianyu-form-body">
            <h2>售卖统计</h2>

            <div class="xianyu-quan-stats">
              <div class="xianyu-quan-stat">
                <span>已售出</span>
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
        </Transition>
      </section>

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
              <span>{{ quanItems.length }} 张</span>
            </div>

            <p v-if="quanLoading" class="xianyu-empty">加载中…</p>
            <p v-else-if="quanError" class="xianyu-empty xianyu-empty--error">{{ quanError }}</p>
            <p v-else-if="!quanItems.length" class="xianyu-empty">暂无券数据</p>

            <ul v-else class="xianyu-quan-list">
              <li
                v-for="(item, index) in quanItems"
                :key="item.id"
                class="xianyu-quan-item"
                :class="{ 'xianyu-quan-item--alt': index % 2 === 1 }"
              >
                <img class="xianyu-quan-item__img" :src="getQuanImage(item)" alt="券图片" />
                <div class="xianyu-quan-item__info">
                  <strong class="xianyu-quan-item__name">{{ item.name || '未命名' }}</strong>
                  <span class="xianyu-quan-item__price">¥{{ formatMoney(item.price) }}</span>
                  <span class="xianyu-quan-item__original">原价 ¥{{ formatMoney(item.originalPrice) }}</span>
                </div>
              </li>
            </ul>
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

const MOCK_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#e5e7e3"/><text x="100" y="116" font-size="52" text-anchor="middle" fill="#8a8f8b" font-family="sans-serif">券</text></svg>'
)

const quanItems = ref([])
const quanLoading = ref(false)
const quanError = ref('')

const canSubmit = computed(() => url.value.trim() !== '' && name.value.trim() !== '')

const quanStats = computed(() => {
  const soldItems = quanItems.value.filter((item) => item.sold)
  const soldCount = soldItems.length
  const unsoldCount = quanItems.value.length - soldCount
  const totalRevenue = soldItems.reduce((sum, item) => sum + Number(item.price || 0), 0)
  const totalCost = soldItems.reduce((sum, item) => sum + Number(item.originalPrice || 0), 0)
  const profit = totalRevenue - totalCost

  return { soldCount, unsoldCount, totalRevenue, totalCost, profit }
})

function formatMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  return number.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function getQuanImage(item) {
  try {
    const stored = localStorage.getItem(`quanshang-image-${item.id}`)
    if (stored) return stored
  } catch {}
  return MOCK_IMAGE
}

async function loadQuanItems() {
  quanLoading.value = true
  quanError.value = ''

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

.xianyu-form-body {
  display: grid;
  gap: 16px;
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

.xianyu-quan-list {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  border: 1px solid #e7e7e7;
  border-radius: 12px;
}

.xianyu-quan-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: #ffffff;
}

.xianyu-quan-item + .xianyu-quan-item {
  border-top: 1px solid #d7d7d7;
}

.xianyu-quan-item--alt {
  background: #f6f6f6;
}

.xianyu-quan-item__img {
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 10px;
  background: #eceeeb;
}

.xianyu-quan-item__info {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.xianyu-quan-item__name {
  overflow: hidden;
  color: #171717;
  font-size: 0.88rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xianyu-quan-item__price {
  color: #d14c3e;
  font-size: 0.94rem;
  font-weight: 800;
}

.xianyu-quan-item__original {
  color: #9a9a9a;
  font-size: 0.74rem;
  text-decoration: line-through;
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
