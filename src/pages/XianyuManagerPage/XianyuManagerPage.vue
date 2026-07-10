<template>
  <main class="xianyu-page">
    <section v-if="!authenticated" class="xianyu-login">
      <div class="xianyu-login__brand-panel">
        <RouterLink class="xianyu-login__home" to="/">
          <House :size="18" />
          <span>返回首页</span>
        </RouterLink>

        <div class="xianyu-login__identity">
          <span class="xianyu-brand-mark" aria-hidden="true">
            <Fish :size="34" :stroke-width="1.8" />
          </span>
          <p>SELLER CONSOLE</p>
          <h1>闲鱼商品管理</h1>
        </div>

        <p class="xianyu-login__version">Personal workspace · 2026</p>
      </div>

      <div class="xianyu-login__form-panel">
        <form class="xianyu-login__form" @submit.prevent="handleLogin">
          <div class="xianyu-login__heading">
            <span>管理后台</span>
            <h2>欢迎回来</h2>
          </div>

          <label class="xianyu-field">
            <span>账号</span>
            <div class="xianyu-input-wrap">
              <UserRound :size="18" aria-hidden="true" />
              <input
                v-model.trim="loginForm.username"
                type="text"
                autocomplete="username"
                placeholder="请输入账号"
              />
            </div>
          </label>

          <label class="xianyu-field">
            <span>密码</span>
            <div class="xianyu-input-wrap">
              <LockKeyhole :size="18" aria-hidden="true" />
              <input
                v-model="loginForm.password"
                type="password"
                autocomplete="current-password"
                placeholder="请输入密码"
              />
            </div>
          </label>

          <p v-if="loginError" class="xianyu-error" role="alert">{{ loginError }}</p>

          <button class="xianyu-primary xianyu-login__submit" type="submit">
            <span>登录后台</span>
            <ArrowRight :size="18" />
          </button>
        </form>
      </div>
    </section>

    <section v-else class="xianyu-admin">
      <button
        v-if="sidebarOpen"
        class="xianyu-sidebar-backdrop"
        type="button"
        aria-label="关闭菜单"
        @click="sidebarOpen = false"
      />

      <aside class="xianyu-sidebar" :class="{ 'is-open': sidebarOpen }">
        <div class="xianyu-sidebar__brand">
          <span class="xianyu-brand-mark" aria-hidden="true">
            <Fish :size="27" :stroke-width="1.9" />
          </span>
          <div>
            <strong>闲鱼管理</strong>
            <small>Seller Console</small>
          </div>
          <button
            class="xianyu-icon-button xianyu-sidebar__close"
            type="button"
            title="关闭菜单"
            aria-label="关闭菜单"
            @click="sidebarOpen = false"
          >
            <X :size="19" />
          </button>
        </div>

        <div class="xianyu-sidebar__section-label">工作台</div>
        <nav class="xianyu-sidebar__nav" aria-label="闲鱼管理导航">
          <button
            v-for="item in navigationItems"
            :key="item.id"
            type="button"
            :class="{ 'is-active': activeSection === item.id }"
            @click="selectSection(item.id)"
          >
            <component :is="item.icon" :size="18" :stroke-width="1.8" />
            <span>{{ item.label }}</span>
            <ChevronRight :size="15" class="xianyu-sidebar__chevron" />
          </button>
        </nav>

        <div class="xianyu-sidebar__spacer" />

        <div class="xianyu-sidebar__footer">
          <RouterLink to="/">
            <House :size="17" />
            <span>返回博客</span>
          </RouterLink>
          <button type="button" @click="handleLogout">
            <LogOut :size="17" />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      <div class="xianyu-workspace">
        <header class="xianyu-topbar">
          <div class="xianyu-topbar__left">
            <button
              class="xianyu-icon-button xianyu-menu-button"
              type="button"
              title="打开菜单"
              aria-label="打开菜单"
              @click="sidebarOpen = true"
            >
              <Menu :size="20" />
            </button>
            <div class="xianyu-topbar__title">
              <span>闲鱼管理</span>
              <ChevronRight :size="14" aria-hidden="true" />
              <strong>{{ currentSection.label }}</strong>
            </div>
          </div>

          <div class="xianyu-topbar__actions">
            <span class="xianyu-sync-state">最近刷新：{{ lastSyncLabel }}</span>
            <button
              class="xianyu-secondary-button"
              type="button"
              :disabled="isSyncing"
              @click="refreshData"
            >
              <RefreshCw :size="16" :class="{ 'is-spinning': isSyncing }" />
              <span>{{ isSyncing ? '刷新中' : '刷新数据' }}</span>
            </button>
            <span class="xianyu-topbar__avatar" title="当前用户：admin">A</span>
          </div>
        </header>

        <div class="xianyu-content">
          <div class="xianyu-page-head">
            <div>
              <p>{{ currentDateLabel }}</p>
              <h1>{{ currentSection.title }}</h1>
            </div>
            <button
              v-if="activeSection !== 'overview'"
              class="xianyu-primary"
              type="button"
              @click="openCreateItem"
            >
              <Plus :size="18" />
              <span>新增商品</span>
            </button>
          </div>

          <section class="xianyu-stats" aria-label="经营统计">
            <article
              v-for="card in statCards"
              :key="card.label"
              :class="`xianyu-stat--${card.tone}`"
            >
              <div class="xianyu-stat__topline">
                <span class="xianyu-stat__icon" aria-hidden="true">
                  <component :is="card.icon" :size="19" :stroke-width="1.8" />
                </span>
                <small>{{ card.detail }}</small>
              </div>
              <span>{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
            </article>
          </section>

          <section v-if="activeSection === 'overview'" class="xianyu-overview-panel">
            <header class="xianyu-overview-panel__head">
              <div>
                <h2>经营概况汇总</h2>
                <p>这里只看金额结果，不展示商品明细。</p>
              </div>
              <strong :class="{ 'is-loss': operationMetrics.netProfit < 0 }">
                {{ formatCurrency(operationMetrics.netProfit) }}
              </strong>
            </header>

            <div class="xianyu-overview-grid">
              <article v-for="item in overviewRows" :key="item.label">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.detail }}</small>
              </article>
            </div>
          </section>

          <section v-else class="xianyu-data-panel">
            <header class="xianyu-data-panel__head">
              <div>
                <h2>{{ tableHeading }}</h2>
                <p>共 {{ visibleItems.length }} 条记录</p>
              </div>
              <button class="xianyu-primary xianyu-data-panel__add" type="button" @click="openCreateItem">
                <Plus :size="17" />
                <span>新增商品</span>
              </button>
            </header>

            <div v-if="activeSection === 'products'" class="xianyu-table-tools">
              <div class="xianyu-filter-tabs" role="group" aria-label="商品状态筛选">
                <button
                  v-for="option in filterOptions"
                  :key="option.value"
                  type="button"
                  :class="{ 'is-active': activeFilter === option.value }"
                  @click="activeFilter = option.value"
                >
                  <span>{{ option.label }}</span>
                  <small>{{ getFilterCount(option.value) }}</small>
                </button>
              </div>

              <label class="xianyu-search" aria-label="搜索商品">
                <Search :size="17" aria-hidden="true" />
                <input v-model.trim="keyword" type="search" placeholder="搜索商品、买家或备注" />
              </label>
            </div>

            <div class="xianyu-table-wrap">
              <table class="xianyu-table">
                <colgroup>
                  <col class="xianyu-col-product" />
                  <col class="xianyu-col-status" />
                  <col class="xianyu-col-money" />
                  <col class="xianyu-col-profit" />
                  <col class="xianyu-col-buyer" />
                  <col class="xianyu-col-date" />
                  <col class="xianyu-col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">商品信息</th>
                    <th scope="col">状态</th>
                    <th scope="col">售价</th>
                    <th scope="col">成本 / 利润</th>
                    <th scope="col">买家</th>
                    <th scope="col">上架日期</th>
                    <th scope="col" class="xianyu-table__actions-head">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in visibleItems" :key="item.id">
                    <td class="xianyu-product-cell">
                      <span class="xianyu-product-thumb" aria-hidden="true">
                        <Package :size="20" :stroke-width="1.7" />
                      </span>
                      <div>
                        <strong>{{ item.title }}</strong>
                        <small>{{ item.note || '暂无备注' }}</small>
                      </div>
                    </td>
                    <td data-label="状态">
                      <span class="xianyu-status" :class="`xianyu-status--${item.status}`">
                        {{ getStatusLabel(item.status) }}
                      </span>
                    </td>
                    <td data-label="售价" class="xianyu-money">{{ formatCurrency(item.price) }}</td>
                    <td data-label="成本 / 利润" class="xianyu-profit-cell">
                      <strong>{{ formatCurrency(item.price - item.cost) }}</strong>
                      <small>成本 {{ formatCurrency(item.cost) }}</small>
                    </td>
                    <td data-label="买家">{{ item.buyer || '—' }}</td>
                    <td data-label="上架日期">{{ item.listedAt }}</td>
                    <td class="xianyu-row-actions">
                      <button
                        class="xianyu-icon-button"
                        type="button"
                        title="编辑商品"
                        aria-label="编辑商品"
                        @click="startEditItem(item)"
                      >
                        <Pencil :size="16" />
                      </button>
                      <button
                        class="xianyu-icon-button xianyu-icon-button--danger"
                        type="button"
                        title="删除商品"
                        aria-label="删除商品"
                        @click="requestRemoveItem(item)"
                      >
                        <Trash2 :size="16" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div v-if="!visibleItems.length" class="xianyu-empty">
                <PackageSearch :size="28" aria-hidden="true" />
                <strong>没有匹配的商品</strong>
                <span>调整筛选条件或新增一件商品</span>
              </div>
            </div>

            <footer class="xianyu-table-footer">
              <span>显示 {{ visibleItems.length }} / {{ items.length }} 条</span>
              <span>数据仅保留在当前页面会话</span>
            </footer>
          </section>
        </div>
      </div>

      <div v-if="editorOpen" class="xianyu-drawer-layer" @click.self="closeEditor">
        <aside class="xianyu-drawer" role="dialog" aria-modal="true" :aria-label="editorTitle">
          <form class="xianyu-drawer__form" @submit.prevent="handleSaveItem">
            <header class="xianyu-drawer__head">
              <div>
                <span>商品资料</span>
                <h2>{{ editorTitle }}</h2>
              </div>
              <button
                class="xianyu-icon-button"
                type="button"
                title="关闭"
                aria-label="关闭"
                @click="closeEditor"
              >
                <X :size="19" />
              </button>
            </header>

            <div class="xianyu-drawer__body">
              <label class="xianyu-field">
                <span>商品名称</span>
                <input v-model.trim="draft.title" type="text" placeholder="输入商品名称" />
              </label>

              <div class="xianyu-form-grid">
                <label class="xianyu-field">
                  <span>售价</span>
                  <input v-model.number="draft.price" type="number" min="0" step="1" />
                </label>
                <label class="xianyu-field">
                  <span>成本</span>
                  <input v-model.number="draft.cost" type="number" min="0" step="1" />
                </label>
              </div>

              <div class="xianyu-form-grid">
                <label class="xianyu-field">
                  <span>状态</span>
                  <select v-model="draft.status">
                    <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
                <label class="xianyu-field">
                  <span>上架日期</span>
                  <input v-model="draft.listedAt" type="date" />
                </label>
              </div>

              <label class="xianyu-field">
                <span>买家 / 意向人</span>
                <input v-model.trim="draft.buyer" type="text" placeholder="选填" />
              </label>

              <label class="xianyu-field">
                <span>备注</span>
                <textarea v-model.trim="draft.note" rows="5" placeholder="记录议价、物流或售后信息" />
              </label>

              <p v-if="formError" class="xianyu-error" role="alert">{{ formError }}</p>
            </div>

            <footer class="xianyu-drawer__footer">
              <button class="xianyu-secondary-button" type="button" @click="closeEditor">取消</button>
              <button class="xianyu-primary" type="submit">
                <CircleCheckBig :size="17" />
                <span>{{ editingId ? '保存修改' : '添加商品' }}</span>
              </button>
            </footer>
          </form>
        </aside>
      </div>

      <div v-if="pendingDeleteItem" class="xianyu-modal-layer" @click.self="cancelRemoveItem">
        <section class="xianyu-confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
          <span class="xianyu-confirm__icon" aria-hidden="true">
            <Trash2 :size="22" />
          </span>
          <div>
            <h2 id="delete-title">删除商品</h2>
            <p>确认删除“{{ pendingDeleteItem.title }}”吗？</p>
          </div>
          <footer>
            <button class="xianyu-secondary-button" type="button" @click="cancelRemoveItem">取消</button>
            <button class="xianyu-danger-button" type="button" @click="confirmRemoveItem">确认删除</button>
          </footer>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowRight,
  BadgeDollarSign,
  ChevronRight,
  CircleCheckBig,
  Fish,
  HandCoins,
  House,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircleMore,
  Package,
  PackageCheck,
  PackageSearch,
  Pencil,
  Plus,
  RefreshCw,
  ReceiptText,
  Search,
  ShoppingBag,
  TrendingDown,
  Trash2,
  UserRound,
  X
} from 'lucide-vue-next'

const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'admin123'

const statusOptions = [
  { value: 'listed', label: '在售' },
  { value: 'negotiating', label: '沟通中' },
  { value: 'sold', label: '已售出' },
  { value: 'archived', label: '下架' }
]

const filterOptions = [
  { value: 'all', label: '全部' },
  ...statusOptions
]

const navigationItems = [
  { id: 'overview', label: '经营概况', title: '经营概况', icon: LayoutDashboard },
  { id: 'products', label: '商品管理', title: '商品管理', icon: ShoppingBag },
  { id: 'sales', label: '成交记录', title: '成交记录', icon: HandCoins }
]

const initialItems = [
  {
    id: 'xy_001',
    title: '机械键盘 87 键',
    price: 168,
    cost: 89,
    status: 'listed',
    buyer: '',
    listedAt: '2026-07-09',
    note: '已拍细节图，优先同城自提。'
  },
  {
    id: 'xy_002',
    title: '显示器支架',
    price: 69,
    cost: 35,
    status: 'negotiating',
    buyer: '小陈',
    listedAt: '2026-07-08',
    note: '对方想包邮，等晚点确认。'
  },
  {
    id: 'xy_003',
    title: '闲置蓝牙耳机',
    price: 99,
    cost: 0,
    status: 'sold',
    buyer: '同城买家',
    listedAt: '2026-07-06',
    note: '已面交，保留聊天记录。'
  }
]

const authenticated = ref(false)
const loginError = ref('')
const formError = ref('')
const activeSection = ref('overview')
const activeFilter = ref('all')
const keyword = ref('')
const editingId = ref('')
const editorOpen = ref(false)
const sidebarOpen = ref(false)
const pendingDeleteItem = ref(null)
const isSyncing = ref(false)
const lastSyncLabel = ref('刚刚')
const items = ref(initialItems.map((item) => ({ ...item })))
let syncTimer = null

const loginForm = reactive({
  username: '',
  password: ''
})

const draft = reactive(createEmptyDraft())

const currentDateLabel = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short'
}).format(new Date())

const currentSection = computed(() => (
  navigationItems.find((item) => item.id === activeSection.value) || navigationItems[1]
))

const matchingItems = computed(() => {
  const normalizedKeyword = keyword.value.toLowerCase()

  return items.value.filter((item) => {
    if (activeFilter.value !== 'all' && item.status !== activeFilter.value) {
      return false
    }

    if (!normalizedKeyword) {
      return true
    }

    return [item.title, item.buyer, item.note]
      .join(' ')
      .toLowerCase()
      .includes(normalizedKeyword)
  })
})

const visibleItems = computed(() => {
  if (activeSection.value === 'sales') {
    return matchingItems.value.filter((item) => item.status === 'sold')
  }

  if (activeSection.value === 'overview') {
    return matchingItems.value.slice(0, 5)
  }

  return matchingItems.value
})

const tableHeading = computed(() => {
  if (activeSection.value === 'sales') return '已成交商品'
  if (activeSection.value === 'overview') return '最近商品'
  return '商品列表'
})

const editorTitle = computed(() => editingId.value ? '编辑商品' : '新增商品')

const operationMetrics = computed(() => {
  const soldItems = items.value.filter((item) => item.status === 'sold')
  const unsoldItems = items.value.filter((item) => item.status !== 'sold')
  const soldAmount = soldItems.reduce((sum, item) => sum + Number(item.price || 0), 0)
  const soldCost = soldItems.reduce((sum, item) => sum + Number(item.cost || 0), 0)
  const totalCost = items.value.reduce((sum, item) => sum + Number(item.cost || 0), 0)
  const unsoldCost = unsoldItems.reduce((sum, item) => sum + Number(item.cost || 0), 0)
  const earnedAmount = soldItems.reduce((sum, item) => {
    const profit = Number(item.price || 0) - Number(item.cost || 0)
    return profit > 0 ? sum + profit : sum
  }, 0)
  const lossAmount = soldItems.reduce((sum, item) => {
    const profit = Number(item.price || 0) - Number(item.cost || 0)
    return profit < 0 ? sum + Math.abs(profit) : sum
  }, 0)
  const lossCount = soldItems.filter((item) => Number(item.price || 0) < Number(item.cost || 0)).length

  return {
    earnedAmount,
    lossAmount,
    lossCount,
    netProfit: soldAmount - soldCost,
    soldAmount,
    soldCost,
    soldCount: soldItems.length,
    totalCost,
    unsoldCost
  }
})

const statCards = computed(() => {
  const listedCount = items.value.filter((item) => item.status === 'listed').length
  const negotiatingCount = items.value.filter((item) => item.status === 'negotiating').length
  const metrics = operationMetrics.value

  if (activeSection.value === 'overview') {
    return [
      {
        label: '已赚',
        value: formatCurrency(metrics.earnedAmount),
        detail: '成交中的盈利部分',
        tone: 'green',
        icon: HandCoins
      },
      {
        label: '已亏',
        value: formatCurrency(metrics.lossAmount),
        detail: metrics.lossCount ? `${metrics.lossCount} 笔亏损` : '暂无亏损',
        tone: 'rose',
        icon: TrendingDown
      },
      {
        label: '登记成本',
        value: formatCurrency(metrics.totalCost),
        detail: '所有商品成本合计',
        tone: 'amber',
        icon: ReceiptText
      },
      {
        label: '卖出金额',
        value: formatCurrency(metrics.soldAmount),
        detail: `${metrics.soldCount} 笔已售出`,
        tone: 'blue',
        icon: BadgeDollarSign
      }
    ]
  }

  return [
    {
      label: '在售商品',
      value: `${listedCount} 件`,
      detail: `共 ${items.value.length} 件`,
      tone: 'green',
      icon: PackageCheck
    },
    {
      label: '待沟通',
      value: `${negotiatingCount} 件`,
      detail: '需要继续跟进',
      tone: 'amber',
      icon: MessageCircleMore
    },
    {
      label: '成交金额',
      value: formatCurrency(metrics.soldAmount),
      detail: `${metrics.soldCount} 笔成交`,
      tone: 'blue',
      icon: BadgeDollarSign
    },
    {
      label: '已实现利润',
      value: formatCurrency(metrics.netProfit),
      detail: '扣除登记成本',
      tone: 'rose',
      icon: HandCoins
    }
  ]
})

const overviewRows = computed(() => {
  const metrics = operationMetrics.value

  return [
    {
      label: '卖了多少',
      value: formatCurrency(metrics.soldAmount),
      detail: `${metrics.soldCount} 笔成交收入`
    },
    {
      label: '成本多少',
      value: formatCurrency(metrics.totalCost),
      detail: `已售成本 ${formatCurrency(metrics.soldCost)}，未售成本 ${formatCurrency(metrics.unsoldCost)}`
    },
    {
      label: '赚了多少',
      value: formatCurrency(metrics.earnedAmount),
      detail: '只统计已售商品中大于成本的部分'
    },
    {
      label: '亏了多少',
      value: formatCurrency(metrics.lossAmount),
      detail: metrics.lossCount ? `${metrics.lossCount} 笔成交低于成本` : '目前没有亏损成交'
    }
  ]
})

function createEmptyDraft() {
  return {
    title: '',
    price: 0,
    cost: 0,
    status: 'listed',
    buyer: '',
    listedAt: new Date().toISOString().slice(0, 10),
    note: ''
  }
}

function assignDraft(nextDraft) {
  Object.assign(draft, nextDraft)
}

function resetDraft() {
  editingId.value = ''
  formError.value = ''
  assignDraft(createEmptyDraft())
}

function handleLogin() {
  if (
    loginForm.username === ADMIN_USERNAME &&
    loginForm.password === ADMIN_PASSWORD
  ) {
    authenticated.value = true
    loginError.value = ''
    loginForm.password = ''
    return
  }

  loginError.value = '账号或密码不正确。'
}

function handleLogout() {
  authenticated.value = false
  loginForm.username = ''
  loginForm.password = ''
  sidebarOpen.value = false
  editorOpen.value = false
  pendingDeleteItem.value = null
  resetDraft()
}

function selectSection(sectionId) {
  activeSection.value = sectionId
  activeFilter.value = 'all'
  keyword.value = ''
  sidebarOpen.value = false
}

function openCreateItem() {
  resetDraft()
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
  resetDraft()
}

function normalizeDraftItem() {
  const title = draft.title.trim()

  if (!title) {
    formError.value = '商品名称不能为空。'
    return null
  }

  return {
    title,
    price: Math.max(0, Number(draft.price) || 0),
    cost: Math.max(0, Number(draft.cost) || 0),
    status: draft.status,
    buyer: draft.buyer.trim(),
    listedAt: draft.listedAt || new Date().toISOString().slice(0, 10),
    note: draft.note.trim()
  }
}

function handleSaveItem() {
  const nextItem = normalizeDraftItem()

  if (!nextItem) {
    return
  }

  if (editingId.value) {
    items.value = items.value.map((item) => (
      item.id === editingId.value ? { ...item, ...nextItem } : item
    ))
  } else {
    items.value = [
      {
        id: `xy_${Date.now()}`,
        ...nextItem
      },
      ...items.value
    ]
  }

  editorOpen.value = false
  resetDraft()
}

function startEditItem(item) {
  editingId.value = item.id
  formError.value = ''
  assignDraft({
    title: item.title,
    price: item.price,
    cost: item.cost,
    status: item.status,
    buyer: item.buyer,
    listedAt: item.listedAt,
    note: item.note
  })
  editorOpen.value = true
}

function requestRemoveItem(item) {
  pendingDeleteItem.value = item
}

function cancelRemoveItem() {
  pendingDeleteItem.value = null
}

function confirmRemoveItem() {
  if (!pendingDeleteItem.value) return

  const itemId = pendingDeleteItem.value.id
  items.value = items.value.filter((item) => item.id !== itemId)

  if (editingId.value === itemId) {
    closeEditor()
  }

  pendingDeleteItem.value = null
}

function refreshData() {
  if (isSyncing.value) return

  isSyncing.value = true
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    isSyncing.value = false
    lastSyncLabel.value = '刚刚'
  }, 650)
}

function getStatusLabel(status) {
  return statusOptions.find((option) => option.value === status)?.label || '未知'
}

function getFilterCount(status) {
  if (status === 'all') return items.value.length
  return items.value.filter((item) => item.status === status).length
}

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  }).format(Number(value) || 0)
}

onBeforeUnmount(() => {
  clearTimeout(syncTimer)
})
</script>

<style scoped>
.xianyu-page,
.xianyu-page * {
  box-sizing: border-box;
}

.xianyu-page {
  --mono-ink: #111827;
  --mono-copy: #374151;
  --mono-muted: #6b7280;
  --mono-line: rgba(17, 24, 39, 0.08);
  --mono-line-strong: rgba(17, 24, 39, 0.14);
  --mono-soft: #f6f7f9;
  --mono-soft-strong: #eceff3;
  --mono-surface: #ffffff;
  width: 100%;
  height: 100dvh;
  min-height: 640px;
  overflow: hidden;
  color: var(--mono-ink);
  background: #f7f8fa;
  font-family:
    Inter, "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
}

button,
input,
select,
textarea {
  font: inherit;
}

button,
a {
  -webkit-tap-highlight-color: transparent;
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid rgba(17, 24, 39, 0.14);
  outline-offset: 2px;
}

.xianyu-login {
  display: grid;
  grid-template-columns: minmax(320px, 0.78fr) minmax(480px, 1.22fr);
  width: 100%;
  height: 100%;
  background: #ffffff;
}

.xianyu-login__brand-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: 38px 44px;
  color: var(--mono-ink);
  background: #f1f3f5;
}

.xianyu-login__brand-panel::after {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 45%;
  height: 5px;
  background: var(--mono-ink);
  content: "";
}

.xianyu-login__home {
  display: inline-flex;
  gap: 9px;
  align-items: center;
  width: fit-content;
  color: var(--mono-copy);
  font-size: 0.88rem;
  font-weight: 650;
  text-decoration: none;
}

.xianyu-login__home:hover {
  color: var(--mono-ink);
}

.xianyu-login__identity {
  display: grid;
  gap: 12px;
  align-content: center;
  max-width: 420px;
}

.xianyu-brand-mark {
  display: inline-grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 8px;
  color: #ffffff;
  background: var(--mono-ink);
}

.xianyu-login__identity p,
.xianyu-login__version,
.xianyu-login__heading span,
.xianyu-page-head p,
.xianyu-drawer__head span {
  margin: 0;
  letter-spacing: 0;
}

.xianyu-login__identity p {
  color: var(--mono-muted);
  font-size: 0.76rem;
  font-weight: 800;
}

.xianyu-login__identity h1 {
  max-width: 360px;
  margin: 0;
  font-size: 2.65rem;
  line-height: 1.12;
  letter-spacing: 0;
}

.xianyu-login__version {
  color: #9ca3af;
  font-size: 0.78rem;
}

.xianyu-login__form-panel {
  display: grid;
  place-items: center;
  min-width: 0;
  padding: 40px;
}

.xianyu-login__form {
  display: grid;
  gap: 22px;
  width: min(380px, 100%);
}

.xianyu-login__heading {
  display: grid;
  gap: 7px;
  margin-bottom: 12px;
}

.xianyu-login__heading span,
.xianyu-drawer__head span {
  color: var(--mono-muted);
  font-size: 0.78rem;
  font-weight: 750;
}

.xianyu-login__heading h2 {
  margin: 0;
  font-size: 2rem;
  line-height: 1.2;
  letter-spacing: 0;
}

.xianyu-field {
  display: grid;
  gap: 8px;
  color: var(--mono-copy);
  font-size: 0.86rem;
  font-weight: 700;
}

.xianyu-input-wrap {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--mono-line-strong);
  border-radius: 6px;
  color: var(--mono-muted);
  background: var(--mono-surface);
}

.xianyu-input-wrap:focus-within {
  border-color: rgba(17, 24, 39, 0.38);
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
}

.xianyu-input-wrap input {
  min-width: 0;
  height: 42px;
  padding: 0;
  border: 0;
  color: var(--mono-ink);
  outline: none;
}

.xianyu-field > input,
.xianyu-field > select,
.xianyu-field > textarea {
  width: 100%;
  border: 1px solid var(--mono-line-strong);
  border-radius: 6px;
  padding: 10px 12px;
  color: var(--mono-ink);
  background: var(--mono-surface);
  outline: none;
}

.xianyu-field > input,
.xianyu-field > select {
  min-height: 42px;
}

.xianyu-field > textarea {
  resize: vertical;
  line-height: 1.6;
}

.xianyu-field > input:focus,
.xianyu-field > select:focus,
.xianyu-field > textarea:focus {
  border-color: rgba(17, 24, 39, 0.38);
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
}

.xianyu-error {
  margin: -6px 0 0;
  color: #bb2938;
  font-size: 0.84rem;
  font-weight: 650;
}

.xianyu-primary,
.xianyu-secondary-button,
.xianyu-danger-button {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0 14px;
  cursor: pointer;
  font-weight: 750;
}

.xianyu-primary {
  color: #ffffff;
  border-color: var(--mono-ink);
  background: var(--mono-ink);
}

.xianyu-primary:hover {
  border-color: var(--mono-copy);
  background: var(--mono-copy);
}

.xianyu-login__submit {
  min-height: 46px;
  justify-content: space-between;
  margin-top: 4px;
  padding: 0 18px;
}

.xianyu-admin {
  position: relative;
  display: grid;
  grid-template-columns: 224px minmax(0, 1fr);
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f7f8fa;
}

.xianyu-sidebar {
  z-index: 40;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  padding: 16px 12px;
  color: var(--mono-copy);
  border-right: 1px solid var(--mono-line);
  background: var(--mono-surface);
}

.xianyu-sidebar__brand {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 54px;
  padding: 0 8px 14px;
  border-bottom: 1px solid var(--mono-line);
}

.xianyu-sidebar__brand .xianyu-brand-mark {
  width: 38px;
  height: 38px;
  border-radius: 6px;
}

.xianyu-sidebar__brand div {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.xianyu-sidebar__brand strong {
  overflow: hidden;
  font-size: 0.92rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xianyu-sidebar__brand small {
  color: var(--mono-muted);
  font-size: 0.68rem;
  letter-spacing: 0;
}

.xianyu-sidebar__section-label {
  padding: 22px 10px 8px;
  color: #9ca3af;
  font-size: 0.68rem;
  font-weight: 800;
}

.xianyu-sidebar__nav {
  display: grid;
  gap: 4px;
}

.xianyu-sidebar__nav button,
.xianyu-sidebar__footer a,
.xianyu-sidebar__footer button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 42px;
  border: 0;
  border-radius: 6px;
  padding: 0 11px;
  color: var(--mono-copy);
  background: transparent;
  cursor: pointer;
  font-size: 0.86rem;
  font-weight: 650;
  text-align: left;
  text-decoration: none;
}

.xianyu-sidebar__nav button:hover,
.xianyu-sidebar__footer a:hover,
.xianyu-sidebar__footer button:hover {
  color: var(--mono-ink);
  background: var(--mono-soft-strong);
}

.xianyu-sidebar__nav button.is-active {
  color: var(--mono-ink);
  background: #e5e7eb;
  box-shadow: inset 3px 0 0 var(--mono-ink);
}

.xianyu-sidebar__chevron {
  opacity: 0.48;
}

.xianyu-sidebar__spacer {
  flex: 1;
}

.xianyu-topbar__avatar {
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  color: #ffffff;
  background: var(--mono-ink);
  font-weight: 850;
}

.xianyu-sidebar__footer {
  display: grid;
  gap: 2px;
}

.xianyu-sidebar__footer a,
.xianyu-sidebar__footer button {
  grid-template-columns: auto minmax(0, 1fr);
}

.xianyu-sidebar__close,
.xianyu-menu-button,
.xianyu-sidebar-backdrop {
  display: none;
}

.xianyu-workspace {
  display: grid;
  grid-template-rows: 64px minmax(0, 1fr);
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.xianyu-topbar {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: 0 24px;
  border-bottom: 1px solid var(--mono-line);
  background: var(--mono-surface);
}

.xianyu-topbar__left,
.xianyu-topbar__actions,
.xianyu-topbar__title {
  display: flex;
  align-items: center;
}

.xianyu-topbar__left,
.xianyu-topbar__actions {
  gap: 12px;
  min-width: 0;
}

.xianyu-topbar__title {
  gap: 7px;
  min-width: 0;
  color: var(--mono-muted);
  font-size: 0.82rem;
}

.xianyu-topbar__title strong {
  overflow: hidden;
  color: var(--mono-ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xianyu-sync-state {
  color: var(--mono-muted);
  font-size: 0.76rem;
  white-space: nowrap;
}

.xianyu-secondary-button {
  color: var(--mono-copy);
  border-color: var(--mono-line-strong);
  background: var(--mono-soft);
}

.xianyu-secondary-button:hover {
  color: var(--mono-ink);
  border-color: rgba(17, 24, 39, 0.24);
  background: var(--mono-soft-strong);
}

.xianyu-secondary-button:disabled {
  cursor: wait;
  opacity: 0.68;
}

.xianyu-topbar__avatar {
  width: 34px;
  height: 34px;
  font-size: 0.76rem;
}

.xianyu-content {
  min-width: 0;
  overflow: auto;
  padding: 24px;
  background: #f7f8fa;
}

.xianyu-page-head {
  display: flex;
  gap: 20px;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;
}

.xianyu-page-head p {
  margin-bottom: 5px;
  color: var(--mono-muted);
  font-size: 0.78rem;
  font-weight: 650;
}

.xianyu-page-head h1 {
  margin: 0;
  color: var(--mono-ink);
  font-size: 1.65rem;
  line-height: 1.2;
  letter-spacing: 0;
}

.xianyu-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.xianyu-stats article {
  position: relative;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  grid-template-rows: auto auto;
  grid-template-areas:
    "icon label"
    "icon value";
  column-gap: 10px;
  row-gap: 2px;
  min-width: 0;
  min-height: 84px;
  align-content: center;
  padding: 10px 14px;
  overflow: hidden;
  border: 1px solid var(--mono-line);
  border-radius: 8px;
  background: var(--mono-surface);
  box-shadow: 0 10px 24px rgba(17, 24, 39, 0.035);
}

.xianyu-stats article::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  content: "";
}

.xianyu-stat--green::before {
  background: #374151;
}

.xianyu-stat--amber::before {
  background: #6b7280;
}

.xianyu-stat--blue::before {
  background: #4b5563;
}

.xianyu-stat--rose::before {
  background: #9ca3af;
}

.xianyu-stat__topline {
  grid-area: icon;
  display: grid;
  align-items: center;
  align-self: center;
  min-width: 0;
}

.xianyu-stat__icon {
  display: inline-grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 6px;
  color: var(--mono-copy);
  background: var(--mono-soft-strong);
}

.xianyu-stat__topline small {
  display: none;
}

.xianyu-stats article > span {
  grid-area: label;
  align-self: end;
  color: var(--mono-muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.xianyu-stats strong {
  grid-area: value;
  align-self: start;
  overflow: hidden;
  color: var(--mono-ink);
  font-size: 1.3rem;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xianyu-overview-panel {
  min-width: 0;
  border: 1px solid var(--mono-line);
  border-radius: 8px;
  background: var(--mono-surface);
  box-shadow: 0 12px 28px rgba(17, 24, 39, 0.04);
}

.xianyu-overview-panel__head {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  min-height: 76px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--mono-line);
}

.xianyu-overview-panel__head div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.xianyu-overview-panel__head h2,
.xianyu-overview-panel__head p {
  margin: 0;
}

.xianyu-overview-panel__head h2 {
  color: var(--mono-ink);
  font-size: 1rem;
  letter-spacing: 0;
}

.xianyu-overview-panel__head p {
  color: var(--mono-muted);
  font-size: 0.76rem;
}

.xianyu-overview-panel__head > strong {
  color: #1f6f43;
  font-size: 1.45rem;
  white-space: nowrap;
}

.xianyu-overview-panel__head > strong.is-loss {
  color: #b82c3b;
}

.xianyu-overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.xianyu-overview-grid article {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 18px;
  border-right: 1px solid var(--mono-line);
}

.xianyu-overview-grid article:last-child {
  border-right: 0;
}

.xianyu-overview-grid span {
  color: var(--mono-muted);
  font-size: 0.72rem;
  font-weight: 750;
}

.xianyu-overview-grid strong {
  color: var(--mono-ink);
  font-size: 1.18rem;
  line-height: 1.25;
}

.xianyu-overview-grid small {
  color: var(--mono-muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.xianyu-data-panel {
  min-width: 0;
  border: 1px solid var(--mono-line);
  border-radius: 8px;
  background: var(--mono-surface);
  box-shadow: 0 12px 28px rgba(17, 24, 39, 0.04);
}

.xianyu-data-panel__head {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  min-height: 68px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--mono-line);
}

.xianyu-data-panel__head div {
  display: grid;
  gap: 3px;
}

.xianyu-data-panel__head h2,
.xianyu-data-panel__head p {
  margin: 0;
}

.xianyu-data-panel__head h2 {
  font-size: 1rem;
  letter-spacing: 0;
}

.xianyu-data-panel__head p {
  color: var(--mono-muted);
  font-size: 0.74rem;
}

.xianyu-data-panel__add {
  display: none;
}

.xianyu-table-tools {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--mono-line);
}

.xianyu-filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.xianyu-filter-tabs button {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  min-height: 34px;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0 10px;
  color: var(--mono-copy);
  background: transparent;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 700;
}

.xianyu-filter-tabs button:hover {
  color: var(--mono-ink);
  background: var(--mono-soft-strong);
}

.xianyu-filter-tabs button.is-active {
  color: #ffffff;
  border-color: var(--mono-ink);
  background: var(--mono-ink);
}

.xianyu-filter-tabs small {
  display: inline-grid;
  min-width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 10px;
  color: var(--mono-muted);
  background: var(--mono-soft-strong);
  font-size: 0.68rem;
}

.xianyu-filter-tabs button.is-active small {
  color: var(--mono-ink);
  background: #ffffff;
}

.xianyu-search {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  width: min(300px, 100%);
  min-height: 36px;
  padding: 0 11px;
  border: 1px solid var(--mono-line-strong);
  border-radius: 6px;
  color: var(--mono-muted);
  background: var(--mono-surface);
}

.xianyu-search:focus-within {
  border-color: rgba(17, 24, 39, 0.38);
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
}

.xianyu-search input {
  min-width: 0;
  height: 34px;
  border: 0;
  color: var(--mono-ink);
  outline: none;
}

.xianyu-table-wrap {
  min-width: 0;
  overflow-x: auto;
}

.xianyu-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  table-layout: fixed;
}

.xianyu-col-product {
  width: 30%;
}

.xianyu-col-status {
  width: 9%;
}

.xianyu-col-money,
.xianyu-col-profit {
  width: 12%;
}

.xianyu-col-buyer {
  width: 12%;
}

.xianyu-col-date {
  width: 14%;
}

.xianyu-col-actions {
  width: 86px;
}

.xianyu-table th,
.xianyu-table td {
  padding: 13px 14px;
  border-bottom: 1px solid var(--mono-line);
  color: var(--mono-copy);
  font-size: 0.79rem;
  text-align: left;
  vertical-align: middle;
}

.xianyu-table th {
  height: 42px;
  color: var(--mono-muted);
  background: var(--mono-soft);
  font-size: 0.7rem;
  font-weight: 800;
  white-space: nowrap;
}

.xianyu-table tbody tr:hover {
  background: #fafafa;
}

.xianyu-table tbody tr:last-child td {
  border-bottom: 0;
}

.xianyu-product-cell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 11px;
  align-items: center;
}

.xianyu-product-thumb {
  display: inline-grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid var(--mono-line);
  border-radius: 6px;
  color: var(--mono-copy);
  background: var(--mono-soft);
}

.xianyu-product-cell div,
.xianyu-profit-cell {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.xianyu-product-cell strong,
.xianyu-product-cell small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xianyu-product-cell strong,
.xianyu-money,
.xianyu-profit-cell strong {
  color: var(--mono-ink);
  font-weight: 750;
}

.xianyu-product-cell small,
.xianyu-profit-cell small {
  color: var(--mono-muted);
  font-size: 0.7rem;
}

.xianyu-status {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 24px;
  border-radius: 12px;
  padding: 0 8px;
  font-size: 0.68rem;
  font-weight: 800;
  white-space: nowrap;
}

.xianyu-status--listed {
  color: #207048;
  background: #e8f5ed;
}

.xianyu-status--negotiating {
  color: #8b5b05;
  background: #fff2d3;
}

.xianyu-status--sold {
  color: #215f92;
  background: #e6f1fb;
}

.xianyu-status--archived {
  color: #626d78;
  background: #eceff2;
}

.xianyu-table__actions-head {
  text-align: right !important;
}

.xianyu-row-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.xianyu-icon-button {
  display: inline-grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--mono-line-strong);
  border-radius: 6px;
  padding: 0;
  color: var(--mono-copy);
  background: var(--mono-surface);
  cursor: pointer;
}

.xianyu-icon-button:hover {
  color: var(--mono-ink);
  border-color: rgba(17, 24, 39, 0.24);
  background: var(--mono-soft-strong);
}

.xianyu-icon-button--danger {
  color: #bd3443;
  border-color: #f0d6d9;
  background: #fffafa;
}

.xianyu-icon-button--danger:hover {
  color: #a32332;
  border-color: #e5aeb4;
  background: #fff1f2;
}

.xianyu-sidebar__close.xianyu-icon-button,
.xianyu-menu-button.xianyu-icon-button {
  display: none;
}

.xianyu-empty {
  display: grid;
  gap: 7px;
  min-height: 260px;
  place-items: center;
  align-content: center;
  color: #9ca3af;
  text-align: center;
}

.xianyu-empty strong {
  color: var(--mono-copy);
  font-size: 0.9rem;
}

.xianyu-empty span {
  font-size: 0.76rem;
}

.xianyu-table-footer {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  min-height: 46px;
  padding: 0 16px;
  border-top: 1px solid var(--mono-line);
  color: var(--mono-muted);
  font-size: 0.7rem;
}

.xianyu-drawer-layer,
.xianyu-modal-layer {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(17, 24, 39, 0.32);
}

.xianyu-drawer-layer {
  display: flex;
  justify-content: flex-end;
}

.xianyu-drawer {
  width: min(460px, 100%);
  height: 100%;
  background: var(--mono-surface);
  box-shadow: -16px 0 40px rgba(17, 24, 39, 0.14);
}

.xianyu-drawer__form {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100%;
}

.xianyu-drawer__head,
.xianyu-drawer__footer {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--mono-line);
}

.xianyu-drawer__head div {
  display: grid;
  gap: 3px;
}

.xianyu-drawer__head h2,
.xianyu-confirm h2,
.xianyu-confirm p {
  margin: 0;
}

.xianyu-drawer__head h2,
.xianyu-confirm h2 {
  font-size: 1.05rem;
  letter-spacing: 0;
}

.xianyu-drawer__body {
  display: grid;
  gap: 17px;
  align-content: start;
  overflow-y: auto;
  padding: 20px;
}

.xianyu-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.xianyu-drawer__footer {
  justify-content: flex-end;
  border-top: 1px solid var(--mono-line);
  border-bottom: 0;
}

.xianyu-modal-layer {
  display: grid;
  place-items: center;
  padding: 20px;
}

.xianyu-confirm {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  width: min(420px, 100%);
  padding: 20px;
  border-radius: 8px;
  background: var(--mono-surface);
  box-shadow: 0 18px 50px rgba(17, 24, 39, 0.16);
}

.xianyu-confirm__icon {
  display: inline-grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 6px;
  color: #b82c3b;
  background: #fff0f2;
}

.xianyu-confirm div {
  display: grid;
  gap: 7px;
}

.xianyu-confirm p {
  color: var(--mono-muted);
  font-size: 0.84rem;
  line-height: 1.5;
}

.xianyu-confirm footer {
  display: flex;
  grid-column: 1 / -1;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}

.xianyu-danger-button {
  color: #ffffff;
  border-color: #b82c3b;
  background: #b82c3b;
}

.xianyu-danger-button:hover {
  background: #a32332;
}

.is-spinning {
  animation: xianyu-spin 0.75s linear infinite;
}

@keyframes xianyu-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1180px) {
  .xianyu-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .xianyu-overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .xianyu-overview-grid article:nth-child(2n) {
    border-right: 0;
  }

  .xianyu-overview-grid article:nth-child(n + 3) {
    border-top: 1px solid var(--mono-line);
  }
}

@media (max-width: 900px) {
  .xianyu-admin {
    grid-template-columns: minmax(0, 1fr);
  }

  .xianyu-sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: min(280px, calc(100vw - 52px));
    transform: translateX(-102%);
    transition: transform 180ms ease;
  }

  .xianyu-sidebar.is-open {
    transform: translateX(0);
  }

  .xianyu-sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 35;
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: rgba(17, 24, 39, 0.32);
  }

  .xianyu-sidebar__close.xianyu-icon-button,
  .xianyu-menu-button.xianyu-icon-button {
    display: inline-grid;
  }

  .xianyu-workspace {
    grid-template-rows: 58px minmax(0, 1fr);
  }

  .xianyu-topbar {
    padding: 0 16px;
  }
}

@media (max-width: 720px) {
  .xianyu-page {
    min-height: 560px;
  }

  .xianyu-login {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .xianyu-login__brand-panel {
    min-height: 220px;
    padding: 24px;
  }

  .xianyu-login__identity {
    gap: 8px;
    margin: 28px 0;
  }

  .xianyu-login__identity h1 {
    font-size: 2rem;
  }

  .xianyu-login__version {
    display: none;
  }

  .xianyu-login__form-panel {
    min-height: 420px;
    padding: 34px 24px;
  }

  .xianyu-topbar__title > span,
  .xianyu-topbar__title > svg,
  .xianyu-sync-state,
  .xianyu-topbar__avatar {
    display: none;
  }

  .xianyu-topbar__actions .xianyu-secondary-button span {
    display: none;
  }

  .xianyu-topbar__actions .xianyu-secondary-button {
    width: 36px;
    min-height: 36px;
    padding: 0;
  }

  .xianyu-content {
    padding: 16px 12px 28px;
  }

  .xianyu-page-head {
    align-items: center;
    margin-bottom: 14px;
  }

  .xianyu-page-head h1 {
    font-size: 1.35rem;
  }

  .xianyu-page-head > .xianyu-primary {
    display: none;
  }

  .xianyu-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 12px;
  }

  .xianyu-stats article {
    min-height: 80px;
    padding: 9px 12px;
  }

  .xianyu-stats strong {
    font-size: 1.2rem;
  }

  .xianyu-data-panel {
    border: 0;
    background: transparent;
  }

  .xianyu-overview-panel {
    border-radius: 8px;
  }

  .xianyu-overview-panel__head {
    align-items: flex-start;
  }

  .xianyu-overview-panel__head > strong {
    font-size: 1.18rem;
  }

  .xianyu-data-panel__head,
  .xianyu-table-tools,
  .xianyu-table-footer {
    border: 1px solid var(--mono-line);
    background: var(--mono-surface);
  }

  .xianyu-data-panel__head {
    border-radius: 8px 8px 0 0;
  }

  .xianyu-data-panel__add {
    display: inline-flex;
  }

  .xianyu-table-tools {
    display: grid;
    gap: 10px;
    border-top: 0;
    border-radius: 0 0 8px 8px;
  }

  .xianyu-filter-tabs {
    flex-wrap: nowrap;
    max-width: 100%;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .xianyu-filter-tabs button {
    flex: 0 0 auto;
  }

  .xianyu-search {
    width: 100%;
  }

  .xianyu-table-wrap {
    overflow: visible;
    margin-top: 10px;
  }

  .xianyu-table,
  .xianyu-table tbody {
    display: grid;
    min-width: 0;
    gap: 8px;
  }

  .xianyu-table colgroup,
  .xianyu-table thead {
    display: none;
  }

  .xianyu-table tr {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--mono-line);
    border-radius: 8px;
    background: var(--mono-surface);
  }

  .xianyu-table td {
    display: grid;
    gap: 4px;
    padding: 0;
    border: 0 !important;
  }

  .xianyu-table td:not(.xianyu-product-cell):not(.xianyu-row-actions)::before {
    color: #929ca7;
    content: attr(data-label);
    font-size: 0.66rem;
    font-weight: 700;
  }

  .xianyu-product-cell,
  .xianyu-row-actions {
    grid-column: 1 / -1;
  }

  .xianyu-product-cell {
    grid-template-columns: auto minmax(0, 1fr) !important;
    padding-bottom: 12px !important;
    border-bottom: 1px solid var(--mono-line) !important;
  }

  .xianyu-row-actions {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding-top: 4px !important;
  }

  .xianyu-row-actions .xianyu-icon-button {
    width: 100%;
  }

  .xianyu-table-footer {
    margin-top: 10px;
    border-radius: 8px;
  }
}

@media (max-width: 420px) {
  .xianyu-form-grid {
    grid-template-columns: 1fr;
  }

  .xianyu-overview-panel__head {
    display: grid;
  }

  .xianyu-overview-grid {
    grid-template-columns: 1fr;
  }

  .xianyu-overview-grid article {
    border-right: 0;
  }

  .xianyu-overview-grid article:nth-child(n + 2) {
    border-top: 1px solid var(--mono-line);
  }

  .xianyu-data-panel__head {
    align-items: flex-start;
  }

  .xianyu-data-panel__add span {
    display: none;
  }

  .xianyu-data-panel__add {
    width: 36px;
    min-height: 36px;
    padding: 0;
  }

  .xianyu-table-footer {
    display: grid;
    gap: 4px;
    justify-content: stretch;
    min-height: 58px;
    padding: 10px 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .xianyu-sidebar {
    transition: none;
  }

  .is-spinning {
    animation: none;
  }
}
</style>
