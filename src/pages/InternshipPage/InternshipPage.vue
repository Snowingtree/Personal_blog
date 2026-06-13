<template>
  <main v-if="privateAppAvailable" class="internship-page">
    <section class="internship-shell">
      <section class="internship-board" aria-label="实习记录列表">
        <div class="internship-board__head">
          <div>
            <h1>{{ boardTitle }}</h1>
          </div>
          <div class="internship-board__actions">
            <button type="button" class="internship-logout" @click="handleBackToTools">返回</button>
            <button
              type="button"
              class="internship-trash-button"
              :class="{ 'is-active': activeBoardView === 'trash' }"
              :aria-label="activeBoardView === 'trash' ? '返回实习记录' : '打开回收站'"
              :title="activeBoardView === 'trash' ? '返回实习记录' : '回收站'"
              @click="toggleTrashView"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M6 6l1 15h10l1-15" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </button>
            <button
              type="button"
              class="internship-add-button"
              aria-label="添加实习记录"
              @click="openCreateDialog"
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </div>

        <div class="internship-board__content">
          <Transition name="internship-board-fade" mode="out-in">
          <section
            v-if="activeBoardView === 'management'"
            key="management"
            class="internship-management-view"
            aria-label="实习管理"
          >
            <section class="internship-contributions" aria-label="年度实习记录">
              <header>
                <strong>年度记录</strong>
                <span>{{ internshipContributionTotal }} records</span>
              </header>

              <div class="internship-contributions__years-list">
                <section
                  v-for="yearStats in internshipContributionYears"
                  :key="yearStats.year"
                  class="internship-contributions__year"
                >
                  <div class="internship-contributions__year-row">
                    <div class="internship-contributions__chart" :style="{ '--week-count': yearStats.weeks.length }">
                    <div class="internship-contributions__months" aria-hidden="true">
                      <span
                        v-for="month in yearStats.monthLabels"
                        :key="month.key"
                        :style="{ gridColumn: `${month.weekIndex + 1} / span ${month.span}` }"
                      >
                        {{ month.label }}
                      </span>
                    </div>

                    <div class="internship-contributions__body">
                      <div class="internship-contributions__weekdays" aria-hidden="true">
                        <span></span>
                        <span>Mon</span>
                        <span></span>
                        <span>Wed</span>
                        <span></span>
                        <span>Fri</span>
                        <span></span>
                      </div>

                      <div class="internship-contributions__weeks" aria-label="年度实习记录热力图">
                        <div v-for="week in yearStats.weeks" :key="week.key" class="internship-contributions__week">
                          <button
                            v-for="day in week.days"
                            :key="day.key"
                            type="button"
                            class="internship-contributions__day"
                            :class="{
                              'is-outside-range': !day.isInRange,
                              'is-selected': selectedContributionDateKey === day.key
                            }"
                            :data-level="day.level"
                            :data-tooltip="day.tooltip"
                            :aria-label="day.title"
                            :aria-pressed="selectedContributionDateKey === day.key"
                            :disabled="!day.isInRange"
                            @click="selectContributionDay(day)"
                          ></button>
                        </div>
                      </div>
                    </div>

                    <div class="internship-contributions__legend" aria-hidden="true">
                      <span>Less</span>
                      <i data-level="0"></i>
                      <i data-level="1"></i>
                      <i data-level="2"></i>
                      <i data-level="3"></i>
                      <i data-level="4"></i>
                      <span>More</span>
                    </div>
                    </div>

                    <aside class="internship-contributions__year-side" aria-label="年度">
                      <button
                        type="button"
                        class="internship-contributions__year-button"
                        :class="{ 'is-active': selectedContributionYear === yearStats.year }"
                        @click="selectContributionYear(yearStats.year)"
                      >
                        <strong>{{ yearStats.year }}</strong>
                        <span>{{ yearStats.total }}</span>
                      </button>
                    </aside>
                  </div>
                </section>
              </div>

              <Transition name="internship-contribution-details">
                <section
                  v-if="selectedContributionDateKey"
                  class="internship-contributions__details"
                  aria-label="选中日期实习记录"
                >
                  <header>
                    <div>
                      <span>选中日期</span>
                      <strong>{{ selectedContributionDateLabel }}</strong>
                    </div>
                    <span>{{ selectedContributionRecords.length }} records</span>
                  </header>

                  <div v-if="selectedContributionRecords.length" class="internship-contributions__details-list">
                    <button
                      v-for="record in selectedContributionRecords"
                      :key="record.id"
                      type="button"
                      class="internship-contributions__details-item"
                      @click="openRecordDetail(record)"
                    >
                      <span class="internship-contributions__details-main">
                        <strong>{{ record.title }}</strong>
                        <span>{{ getRecordPreview(record.content) }}</span>
                      </span>
                      <span class="internship-contributions__details-meta">
                        <span>{{ getCategoryLabel(record.category) }}</span>
                        <span :class="['internship-record__status', `is-${record.status}`]">
                          {{ getStatusLabel(record.status) }}
                        </span>
                      </span>
                    </button>
                  </div>

                  <p v-else class="internship-contributions__details-empty">
                    当天没有实习记录
                  </p>
                </section>
              </Transition>
            </section>
          </section>

          <section v-else key="records" class="internship-board__records-view" aria-label="实习记录内容">
            <div
              class="internship-board__toolbar"
              :class="{ 'has-trash-action': activeBoardView === 'trash' }"
            >
              <label class="internship-search">
                <span>搜索</span>
                <input v-model.trim="searchQuery" type="search" placeholder="标题、内容、类型或状态" />
              </label>

              <div class="internship-filter">
                <span>类型</span>
                <span
                  class="internship-select-wrap"
                  :class="{ 'is-open': openSelectMenu === 'activeCategory' }"
                  @focusout="handleSelectFocusout($event, 'activeCategory')"
                >
                  <button
                    type="button"
                    class="internship-select-trigger"
                    aria-haspopup="listbox"
                    :aria-expanded="openSelectMenu === 'activeCategory'"
                    @click="toggleSelectMenu('activeCategory')"
                    @keydown.escape.stop="closeSelectMenu('activeCategory')"
                  >
                    <span>{{ getCategoryFilterLabel(activeCategory) }}</span>
                  </button>
                  <Transition name="internship-select-menu">
                    <span v-if="openSelectMenu === 'activeCategory'" class="internship-select-menu" role="listbox">
                      <button
                        v-for="option in categoryFilterOptions"
                        :key="option.value"
                        type="button"
                        class="internship-select-option"
                        :class="{ 'is-selected': activeCategory === option.value }"
                        role="option"
                        :aria-selected="activeCategory === option.value"
                        @mousedown.prevent
                        @click="selectActiveCategory(option.value)"
                      >
                        {{ option.label }}
                      </button>
                    </span>
                  </Transition>
                </span>
              </div>

              <div class="internship-filter internship-filter--status">
                <span>状态</span>
                <span
                  class="internship-select-wrap"
                  :class="{ 'is-open': openSelectMenu === 'activeStatus' }"
                  @focusout="handleSelectFocusout($event, 'activeStatus')"
                >
                  <button
                    type="button"
                    class="internship-select-trigger"
                    aria-haspopup="listbox"
                    :aria-expanded="openSelectMenu === 'activeStatus'"
                    @click="toggleSelectMenu('activeStatus')"
                    @keydown.escape.stop="closeSelectMenu('activeStatus')"
                  >
                    <span>{{ getStatusFilterLabel(activeStatus) }}</span>
                  </button>
                  <Transition name="internship-select-menu">
                    <span v-if="openSelectMenu === 'activeStatus'" class="internship-select-menu" role="listbox">
                      <button
                        v-for="option in statusFilterOptions"
                        :key="option.value"
                        type="button"
                        class="internship-select-option"
                        :class="{ 'is-selected': activeStatus === option.value }"
                        role="option"
                        :aria-selected="activeStatus === option.value"
                        @mousedown.prevent
                        @click="selectActiveStatus(option.value)"
                      >
                        {{ option.label }}
                      </button>
                    </span>
                  </Transition>
                </span>
              </div>

              <button
                v-if="activeBoardView === 'trash'"
                type="button"
                class="internship-clear-trash internship-clear-trash--toolbar"
                :disabled="deletedRecordsLoading || trashClearing || !deletedRecords.length"
                title="清空回收站"
                @click="requestClearTrash"
              >
                清空
              </button>
            </div>

            <div class="internship-list-switcher">
              <Transition name="internship-board-fade">
              <div v-if="activeBoardView === 'records'" key="records" class="internship-records">
                <article
                  v-for="record in filteredRecords"
                  :key="record.id"
                  class="internship-record"
                  @click="handleRecordDetailClick(record)"
                  @dblclick="openRecordDetail(record)"
                >
                  <div class="internship-record__head">
                    <h2>{{ record.title }}</h2>

                    <div class="internship-record__meta">
                      <time :datetime="record.createdAt">{{ formatDate(record.createdAt) }}</time>
                      <span>{{ getCategoryLabel(record.category) }}</span>
                      <span :class="['internship-record__status', `is-${record.status}`]">
                        {{ getStatusLabel(record.status) }}
                      </span>
                    </div>
                  </div>

                  <div class="internship-record__body">
                    <p class="internship-record__content">{{ getRecordPreview(record.content) }}</p>
                    <div class="internship-record__actions" @click.stop @dblclick.stop>
                      <button type="button" @click="startEditing(record)">编辑</button>
                      <button type="button" @click="requestRemoveRecord(record)">删除</button>
                    </div>
                  </div>
                </article>

                <p v-if="!filteredRecords.length" class="internship-empty">
                  {{ records.length ? '没有匹配的实习记录' : '暂无实习记录' }}
                </p>
              </div>

              <div v-else key="trash" class="internship-records" aria-label="回收站列表">
                <p v-if="deletedRecordsLoading" class="internship-empty">正在读取回收站...</p>
                <template v-else-if="filteredDeletedRecords.length">
                  <article
                    v-for="record in filteredDeletedRecords"
                    :key="record.id"
                    class="internship-record"
                    @click="handleRecordDetailClick(record)"
                    @dblclick="openRecordDetail(record)"
                  >
                    <div class="internship-record__head">
                      <h2>{{ record.title }}</h2>

                      <div class="internship-record__meta">
                        <time :datetime="record.deletedAt">删除于 {{ formatDateTime(record.deletedAt) }}</time>
                        <span>{{ getCategoryLabel(record.category) }}</span>
                        <span :class="['internship-record__status', `is-${record.status}`]">
                          {{ getStatusLabel(record.status) }}
                        </span>
                      </div>
                    </div>

                    <div class="internship-record__body">
                      <p class="internship-record__content">{{ getRecordPreview(record.content) }}</p>
                      <div class="internship-record__actions" @click.stop @dblclick.stop>
                        <button type="button" class="internship-secondary" @click="restoreDeletedRecord(record)">恢复</button>
                        <button type="button" class="internship-danger" @click="removeDeletedRecord(record.id)">移除</button>
                      </div>
                    </div>
                  </article>
                </template>

                <p v-else class="internship-empty">
                  {{ deletedRecords.length ? '没有匹配的回收站记录' : '回收站为空' }}
                </p>
              </div>
              </Transition>
            </div>
          </section>
          </Transition>
        </div>
      </section>

      <aside class="internship-summary" aria-label="实习概览">
        <template v-for="card in statCards" :key="card.key">
          <button
            v-if="card.key === 'total'"
            type="button"
            class="internship-stat internship-stat--button"
            :class="{ 'is-active': activeBoardView === 'management' }"
            @click="openManagementView"
          >
            <div class="internship-stat__head">
              <span>{{ card.label }}</span>
            </div>
            <strong>{{ card.value }}</strong>
          </button>
          <article v-else class="internship-stat">
            <div class="internship-stat__head">
              <span>{{ card.label }}</span>
            </div>
            <strong>{{ card.value }}</strong>
          </article>
        </template>
      </aside>
    </section>

    <Transition name="internship-window">
      <div
        v-if="draftDialogOpen"
        class="internship-modal"
        role="presentation"
        @click.self="closeDraftDialog"
      >
        <section
          class="internship-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="internship-dialog-title"
        >
          <div class="internship-dialog__head">
            <div>
              <h2 id="internship-dialog-title">{{ editingId ? '编辑记录' : '添加实习记录' }}</h2>
              <div v-if="editingId" class="internship-dialog__meta">
                <time :datetime="draftCreatedAt">创建于 {{ formatDateTime(draftCreatedAt) }}</time>
                <time :datetime="draftUpdatedAt">编辑于 {{ formatDateTime(draftUpdatedAt) }}</time>
              </div>
            </div>
            <div class="internship-dialog__actions">
              <button
                type="submit"
                form="internship-record-form"
                class="internship-dialog__save"
                :disabled="draftSaving"
                :aria-label="draftSaving ? '保存中' : (editingId ? '更新记录' : '保存记录')"
                :title="draftSaving ? '保存中' : (editingId ? '更新记录' : '保存记录')"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 4h12l2 2v14H5V4Z" />
                  <path d="M8 4v6h8V4" />
                  <path d="M8 16h8v4H8v-4Z" />
                </svg>
              </button>
              <button type="button" class="internship-dialog__close" aria-label="关闭" @click="closeDraftDialog">
                ×
              </button>
            </div>
          </div>

          <form id="internship-record-form" class="internship-form" @submit.prevent="handleSave">
            <div class="internship-form__left">
              <label class="internship-field internship-field--wide">
                <span>标题</span>
                <input v-model.trim="draftTitle" type="text" placeholder="例如：第 1 周周报" />
              </label>

              <label class="internship-field">
                <span>日期</span>
                <input v-model="draftDate" type="date" />
              </label>

              <div class="internship-field">
                <span>类型</span>
                <span
                  class="internship-select-wrap"
                  :class="{ 'is-open': openSelectMenu === 'draftCategory' }"
                  @focusout="handleSelectFocusout($event, 'draftCategory')"
                >
                  <button
                    type="button"
                    class="internship-select-trigger"
                    aria-haspopup="listbox"
                    :aria-expanded="openSelectMenu === 'draftCategory'"
                    @click="toggleSelectMenu('draftCategory')"
                    @keydown.escape.stop="closeSelectMenu('draftCategory')"
                  >
                    <span>{{ getCategoryLabel(draftCategory) }}</span>
                  </button>
                  <Transition name="internship-select-menu">
                    <span v-if="openSelectMenu === 'draftCategory'" class="internship-select-menu" role="listbox">
                      <button
                        v-for="option in categoryOptions"
                        :key="option.value"
                        type="button"
                        class="internship-select-option"
                        :class="{ 'is-selected': draftCategory === option.value }"
                        role="option"
                        :aria-selected="draftCategory === option.value"
                        @mousedown.prevent
                        @click="selectDraftCategory(option.value)"
                      >
                      {{ option.label }}
                      </button>
                    </span>
                  </Transition>
                </span>
              </div>

              <div class="internship-field">
                <span>状态</span>
                <span
                  class="internship-select-wrap internship-select-wrap--up"
                  :class="{ 'is-open': openSelectMenu === 'draftStatus' }"
                  @focusout="handleSelectFocusout($event, 'draftStatus')"
                >
                  <button
                    type="button"
                    class="internship-select-trigger"
                    aria-haspopup="listbox"
                    :aria-expanded="openSelectMenu === 'draftStatus'"
                    @click="toggleSelectMenu('draftStatus')"
                    @keydown.escape.stop="closeSelectMenu('draftStatus')"
                  >
                    <span>{{ getStatusLabel(draftStatus) }}</span>
                  </button>
                  <Transition name="internship-select-menu">
                    <span v-if="openSelectMenu === 'draftStatus'" class="internship-select-menu" role="listbox">
                      <button
                        v-for="option in statusOptions"
                        :key="option.value"
                        type="button"
                        class="internship-select-option"
                        :class="{ 'is-selected': draftStatus === option.value }"
                        role="option"
                        :aria-selected="draftStatus === option.value"
                        @mousedown.prevent
                        @click="selectDraftStatus(option.value)"
                      >
                      {{ option.label }}
                      </button>
                    </span>
                  </Transition>
                </span>
              </div>
            </div>

            <label class="internship-form__record">
              <span>记录</span>
              <textarea
                :value="draftContent"
                rows="10"
                placeholder="记录任务、问题、解决方案、复盘或待办"
                spellcheck="false"
                @keydown="handleDraftContentKeydown"
                @input="handleDraftContentInput"
              ></textarea>
            </label>
          </form>
        </section>
      </div>
    </Transition>

    <Transition name="internship-window">
      <div
        v-if="deleteTargetRecord"
        class="internship-modal"
        role="presentation"
        @click.self="closeDeleteConfirm"
      >
        <section
          class="internship-dialog internship-confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="internship-delete-title"
        >
          <div class="internship-dialog__head">
            <div>
              <h2 id="internship-delete-title">确认删除</h2>
            </div>
            <button type="button" class="internship-dialog__close" aria-label="关闭" @click="closeDeleteConfirm">
              ×
            </button>
          </div>

          <div class="internship-confirm">
            <p>删除后会先放入回收站，可从回收站恢复。</p>
            <strong>{{ deleteTargetRecord.title }}</strong>
            <div class="internship-confirm__actions">
              <button type="button" class="internship-secondary" @click="closeDeleteConfirm">取消</button>
              <button type="button" class="internship-danger" @click="confirmRemoveRecord">确认删除</button>
            </div>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="internship-window">
      <div
        v-if="clearTrashConfirmOpen"
        class="internship-modal"
        role="presentation"
        @click.self="closeClearTrashConfirm"
      >
        <section
          class="internship-dialog internship-confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="internship-clear-trash-title"
        >
          <div class="internship-dialog__head">
            <div>
              <h2 id="internship-clear-trash-title">清空回收站</h2>
            </div>
            <button
              type="button"
              class="internship-dialog__close"
              aria-label="关闭"
              :disabled="trashClearing"
              @click="closeClearTrashConfirm"
            >
              ×
            </button>
          </div>

          <div class="internship-confirm">
            <p>清空后这些记录会被永久删除，无法恢复。</p>
            <strong>共 {{ deletedRecords.length }} 条回收站记录</strong>
            <div class="internship-confirm__actions">
              <button
                type="button"
                class="internship-secondary"
                :disabled="trashClearing"
                @click="closeClearTrashConfirm"
              >
                取消
              </button>
              <button
                type="button"
                class="internship-danger"
                :disabled="trashClearing"
                @click="confirmClearTrash"
              >
                {{ trashClearing ? '清空中...' : '确认清空' }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="internship-window">
      <div
        v-if="detailRecord"
        class="internship-modal"
        role="presentation"
        @click.self="closeRecordDetail"
      >
        <section
          class="internship-dialog internship-detail-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="internship-detail-dialog-title"
        >
          <div class="internship-dialog__head internship-detail-dialog__head">
            <div>
              <h2 id="internship-detail-dialog-title">记录详情</h2>
            </div>
            <div class="internship-dialog__actions">
              <button
                v-if="!detailRecordIsDeleted"
                type="button"
                class="internship-dialog__edit"
                aria-label="编辑记录"
                title="编辑"
                @click="editRecordFromDetail"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" />
                  <path d="M13.5 6.5l4 4" />
                </svg>
              </button>
              <button type="button" class="internship-dialog__close" aria-label="关闭" @click="closeRecordDetail">
                ×
              </button>
            </div>
          </div>

          <article class="internship-detail">
            <header class="internship-detail__head">
              <h3>{{ detailRecord.title }}</h3>
              <div class="internship-detail__meta">
                <time :datetime="detailRecord.recordDate">{{ formatRecordDate(detailRecord.recordDate) }}</time>
                <span>{{ getCategoryLabel(detailRecord.category) }}</span>
                <span :class="['internship-record__status', `is-${detailRecord.status}`]">
                  {{ getStatusLabel(detailRecord.status) }}
                </span>
                <time :datetime="detailRecord.createdAt">创建于 {{ formatDateTime(detailRecord.createdAt) }}</time>
                <time :datetime="detailRecord.updatedAt">编辑于 {{ formatDateTime(detailRecord.updatedAt) }}</time>
              </div>
            </header>
            <pre class="internship-detail__content">{{ detailRecord.content }}</pre>
          </article>
        </section>
      </div>
    </Transition>

  </main>

  <main v-else class="auth-layout">
    <PrivateAccessLoadingOverlay :state="privateAppChecking ? 'checking' : 'denied'" />
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createMessage } from 'snowingress-my-components'
import { useRouter } from 'vue-router'
import PrivateAccessLoadingOverlay from '../../components/PrivateAccessLoadingOverlay/PrivateAccessLoadingOverlay.vue'
import { INTERNSHIP_RECORDS_KEY, INTERNSHIP_TRASH_RECORDS_KEY } from '../../constants/storage'
import { usePrivateAppAccess } from '../../hooks/usePrivateAppAccess'
import http from '../../utils/http'

const router = useRouter()
const { privateAppAvailable, privateAppChecking } = usePrivateAppAccess()
const INTERNSHIP_BACKGROUND_CLASS = 'is-internship-page'
const DRAFT_CONTENT_TAB = '\t'
const currentContributionYear = new Date().getFullYear()

const categoryOptions = [
  { value: 'daily', label: '日报' },
  { value: 'task', label: '任务' },
  { value: 'study', label: '学习' },
  { value: 'review', label: '复盘' }
]

const categoryFilterOptions = [
  { value: 'all', label: '全部' },
  ...categoryOptions
]

const statusOptions = [
  { value: 'progress', label: '进行中' },
  { value: 'done', label: '已完成' },
  { value: 'follow-up', label: '待跟进' }
]

const statusFilterOptions = [
  { value: 'all', label: '全部' },
  ...statusOptions
]

const draftTitle = ref('')
const draftContent = ref('')
const draftDate = ref(formatInputDate(new Date()))
const draftCategory = ref('daily')
const draftStatus = ref('progress')
const draftCreatedAt = ref('')
const draftUpdatedAt = ref('')
const editingId = ref('')
const draftDialogOpen = ref(false)
const draftSaving = ref(false)
const deleteTargetRecord = ref(null)
const clearTrashConfirmOpen = ref(false)
const trashClearing = ref(false)
const detailRecord = ref(null)
const activeBoardView = ref('records')
const selectedContributionDateKey = ref('')
const selectedContributionYear = ref(currentContributionYear)
const searchQuery = ref('')
const activeStatus = ref('all')
const activeCategory = ref('all')
const openSelectMenu = ref('')
const records = ref(readStoredRecords())
const deletedRecords = ref([])
const recordsLoaded = ref(false)
const deletedRecordsLoading = ref(false)
let detailClickRecordId = ''
let detailClickTimer = null

function syncInternshipBackground(enabled) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle(INTERNSHIP_BACKGROUND_CLASS, enabled)
  document.body.classList.toggle(INTERNSHIP_BACKGROUND_CLASS, enabled)
}

onMounted(() => {
  syncInternshipBackground(true)
})

onBeforeUnmount(() => {
  syncInternshipBackground(false)

  if (detailClickTimer) {
    window.clearTimeout(detailClickTimer)
  }
})

watch(
  privateAppAvailable,
  (available) => {
    if (available && !recordsLoaded.value) {
      recordsLoaded.value = true
      loadInternshipData()
    }
  },
  { immediate: true }
)

const sortedRecords = computed(() => (
  [...records.value].sort((left, right) => {
    const dateDelta = new Date(right.recordDate).getTime() - new Date(left.recordDate).getTime()
    return dateDelta || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  })
))

const filteredRecords = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()

  return sortedRecords.value.filter((record) => {
    if (activeStatus.value !== 'all' && record.status !== activeStatus.value) {
      return false
    }

    if (activeCategory.value !== 'all' && record.category !== activeCategory.value) {
      return false
    }

    if (!keyword) {
      return true
    }

    const searchableText = [
      record.title,
      record.content,
      getCategoryLabel(record.category),
      getStatusLabel(record.status)
    ].join(' ').toLowerCase()

    return searchableText.includes(keyword)
  })
})

const sortedDeletedRecords = computed(() => (
  [...deletedRecords.value].sort((left, right) => (
    new Date(right.deletedAt).getTime() - new Date(left.deletedAt).getTime()
  ))
))

const filteredDeletedRecords = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()

  return sortedDeletedRecords.value.filter((record) => {
    if (activeStatus.value !== 'all' && record.status !== activeStatus.value) {
      return false
    }

    if (activeCategory.value !== 'all' && record.category !== activeCategory.value) {
      return false
    }

    if (!keyword) {
      return true
    }

    const searchableText = [
      record.title,
      record.content,
      getCategoryLabel(record.category),
      getStatusLabel(record.status)
    ].join(' ').toLowerCase()

    return searchableText.includes(keyword)
  })
})

const detailRecordIsDeleted = computed(() => (
  Boolean(detailRecord.value && deletedRecords.value.some((record) => record.id === detailRecord.value.id))
))
const boardTitle = computed(() => activeBoardView.value === 'management' ? '管理' : '实习')
const internshipContributionTotal = computed(() => records.value.length)
const internshipContributionYears = computed(() => createInternshipContributionYears(records.value))
const selectedContributionDateLabel = computed(() => formatContributionDateKey(selectedContributionDateKey.value))
const selectedContributionRecords = computed(() => {
  const dateKey = selectedContributionDateKey.value

  if (!dateKey) {
    return []
  }

  return sortedRecords.value.filter((record) => getRecordContributionDateKey(record) === dateKey)
})

const statCards = computed(() => [
  {
    key: 'total',
    label: '总记录',
    value: records.value.length
  },
  {
    key: 'progress',
    label: '进行中',
    value: records.value.filter((record) => record.status === 'progress').length
  },
  {
    key: 'follow-up',
    label: '待跟进',
    value: records.value.filter((record) => record.status === 'follow-up').length
  },
  {
    key: 'week',
    label: '本周',
    value: records.value.filter((record) => isThisWeek(record.recordDate)).length
  }
])

function notify(message, type = 'success') {
  createMessage({
    message,
    type,
    duration: 1000,
    offset: 24
  })
}

function readStoredRecords() {
  const storedValue = localStorage.getItem(INTERNSHIP_RECORDS_KEY)

  if (!storedValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(storedValue)

    if (Array.isArray(parsedValue)) {
      return parsedValue.reduce((validRecords, item) => {
        const normalizedRecord = normalizeRecord(item)

        if (normalizedRecord) {
          validRecords.push(normalizedRecord)
        }

        return validRecords
      }, [])
    }
  } catch {
    localStorage.removeItem(INTERNSHIP_RECORDS_KEY)
  }

  return []
}

function readStoredDeletedRecords() {
  const storedValue = localStorage.getItem(INTERNSHIP_TRASH_RECORDS_KEY)

  if (!storedValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(storedValue)

    if (Array.isArray(parsedValue)) {
      return parsedValue.reduce((validRecords, item) => {
        const normalizedRecord = normalizeDeletedRecord(item)

        if (normalizedRecord) {
          validRecords.push(normalizedRecord)
        }

        return validRecords
      }, [])
    }
  } catch {
    localStorage.removeItem(INTERNSHIP_TRASH_RECORDS_KEY)
  }

  return []
}

function normalizeRecord(item) {
  if (
    !item
    || typeof item.id !== 'string'
    || typeof item.title !== 'string'
    || typeof item.content !== 'string'
  ) {
    return null
  }

  const now = new Date().toISOString()
  const updatedAt = normalizeDateValue(item.updatedAt) || now
  const createdAt = normalizeDateValue(item.createdAt) || updatedAt
  const recordDate = normalizeInputDate(item.recordDate) || formatInputDate(updatedAt)
  const category = categoryOptions.some((option) => option.value === item.category) ? item.category : 'daily'
  const status = statusOptions.some((option) => option.value === item.status) ? item.status : 'progress'

  return {
    id: item.id,
    title: item.title,
    content: item.content,
    recordDate,
    category,
    status,
    createdAt,
    updatedAt
  }
}

function normalizeDeletedRecord(item) {
  const normalizedRecord = normalizeRecord(item)

  if (!normalizedRecord) {
    return null
  }

  return {
    ...normalizedRecord,
    deletedAt: normalizeDateValue(item.deletedAt) || new Date().toISOString()
  }
}

function normalizeRecords(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.reduce((validRecords, item) => {
    const normalizedRecord = normalizeRecord(item)

    if (normalizedRecord) {
      validRecords.push(normalizedRecord)
    }

    return validRecords
  }, [])
}

function normalizeDeletedRecords(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.reduce((validRecords, item) => {
    const normalizedRecord = normalizeDeletedRecord(item)

    if (normalizedRecord) {
      validRecords.push(normalizedRecord)
    }

    return validRecords
  }, [])
}

async function loadInternshipData() {
  await loadRecords()
  await loadDeletedRecords()
}

async function loadRecords() {
  const localRecords = readStoredRecords()

  try {
    const data = await http.get('/api/internship/records')
    const databaseRecords = normalizeRecords(data.records)

    if (!databaseRecords.length && localRecords.length) {
      const migratedRecords = []

      for (const record of localRecords) {
        const result = await http.post('/api/internship/records', record)
        const migratedRecord = normalizeRecord(result.record)

        if (migratedRecord) {
          migratedRecords.push(migratedRecord)
        }
      }

      records.value = migratedRecords
      localStorage.removeItem(INTERNSHIP_RECORDS_KEY)
      notify('本地记录已迁移到数据库')
      return
    }

    records.value = databaseRecords
    localStorage.removeItem(INTERNSHIP_RECORDS_KEY)
  } catch (error) {
    notify(error instanceof Error ? error.message : '实习记录加载失败', 'danger')
  }
}

async function migrateDeletedRecordsToDatabase(localDeletedRecords) {
  const migratedRecords = []

  for (const record of localDeletedRecords) {
    try {
      await http.post('/api/internship/records', record)
      const result = await http.delete(`/api/internship/records/${encodeURIComponent(record.id)}`)
      const deletedRecord = normalizeDeletedRecord(result.record)

      if (deletedRecord) {
        migratedRecords.push(deletedRecord)
      }
    } catch {
      // Keep migration best-effort so one legacy item cannot block database loading.
    }
  }

  return migratedRecords
}

async function loadDeletedRecords() {
  const localDeletedRecords = readStoredDeletedRecords()
  deletedRecordsLoading.value = true

  try {
    const data = await http.get('/api/internship/records?scope=trash')
    const databaseDeletedRecords = normalizeDeletedRecords(data.records)

    if (!databaseDeletedRecords.length && localDeletedRecords.length) {
      const migratedRecords = await migrateDeletedRecordsToDatabase(localDeletedRecords)

      if (migratedRecords.length) {
        deletedRecords.value = migratedRecords

        if (migratedRecords.length === localDeletedRecords.length) {
          localStorage.removeItem(INTERNSHIP_TRASH_RECORDS_KEY)
        }

        notify('本地回收站已迁移到数据库')
        return
      }
    }

    deletedRecords.value = databaseDeletedRecords

    if (!localDeletedRecords.length || databaseDeletedRecords.length) {
      localStorage.removeItem(INTERNSHIP_TRASH_RECORDS_KEY)
    }
  } catch (error) {
    notify(error instanceof Error ? error.message : '回收站加载失败', 'danger')
  } finally {
    deletedRecordsLoading.value = false
  }
}

function resetDraft() {
  draftTitle.value = ''
  draftContent.value = ''
  draftDate.value = formatInputDate(new Date())
  draftCategory.value = 'daily'
  draftStatus.value = 'progress'
  draftCreatedAt.value = ''
  draftUpdatedAt.value = ''
  editingId.value = ''
}

function openCreateDialog() {
  closeSelectMenu()
  activeBoardView.value = 'records'
  resetDraft()
  draftDialogOpen.value = true
}

function closeDraftDialog() {
  closeSelectMenu()
  draftDialogOpen.value = false
  resetDraft()
}

function handleDraftContentInput(event) {
  draftContent.value = event.target?.value ?? ''
}

function handleDraftContentKeydown(event) {
  if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey) {
    return
  }

  const textarea = event.currentTarget

  if (!textarea || typeof textarea.value !== 'string' || typeof textarea.setSelectionRange !== 'function') {
    return
  }

  event.preventDefault()

  const selectionStart = textarea.selectionStart ?? textarea.value.length
  const selectionEnd = textarea.selectionEnd ?? selectionStart
  const nextValue = [
    textarea.value.slice(0, selectionStart),
    DRAFT_CONTENT_TAB,
    textarea.value.slice(selectionEnd)
  ].join('')
  const nextCursorPosition = selectionStart + DRAFT_CONTENT_TAB.length

  draftContent.value = nextValue
  textarea.value = nextValue
  textarea.setSelectionRange(nextCursorPosition, nextCursorPosition)
}

async function handleSave() {
  if (draftSaving.value) {
    return
  }

  if (!draftTitle.value || !draftContent.value.trim()) {
    notify('标题和记录都需要填写', 'danger')
    return
  }

  draftSaving.value = true
  const currentEditingId = editingId.value
  const now = new Date().toISOString()
  const nextRecord = {
    id: currentEditingId || `${Date.now()}`,
    title: draftTitle.value,
    content: draftContent.value,
    recordDate: normalizeInputDate(draftDate.value) || formatInputDate(new Date()),
    category: draftCategory.value,
    status: draftStatus.value,
    createdAt: currentEditingId ? (draftCreatedAt.value || now) : now,
    updatedAt: now
  }

  try {
    if (currentEditingId) {
      const result = await http.put(`/api/internship/records/${encodeURIComponent(currentEditingId)}`, nextRecord)
      const savedRecord = normalizeRecord(result.record)

      if (savedRecord) {
        records.value = records.value.map((record) => (
          record.id === currentEditingId ? savedRecord : record
        ))
      }

      notify('更新成功')
      closeDraftDialog()
      return
    }

    const result = await http.post('/api/internship/records', nextRecord)
    const savedRecord = normalizeRecord(result.record)

    if (savedRecord) {
      records.value = [savedRecord, ...records.value]
    }

    notify('保存成功')
    closeDraftDialog()
  } catch (error) {
    notify(error instanceof Error ? error.message : '保存失败', 'danger')
  } finally {
    draftSaving.value = false
  }
}

function startEditing(record) {
  closeSelectMenu()
  activeBoardView.value = 'records'
  editingId.value = record.id
  draftTitle.value = record.title
  draftContent.value = record.content
  draftDate.value = record.recordDate
  draftCategory.value = record.category
  draftStatus.value = record.status
  draftCreatedAt.value = record.createdAt
  draftUpdatedAt.value = record.updatedAt
  draftDialogOpen.value = true
}

function editRecordFromDetail() {
  const record = detailRecord.value

  if (!record) {
    return
  }

  closeRecordDetail()
  startEditing(record)
}

function requestRemoveRecord(record) {
  closeSelectMenu()
  deleteTargetRecord.value = record
}

function handleRecordDetailClick(record) {
  if (detailClickRecordId === record.id && detailClickTimer) {
    window.clearTimeout(detailClickTimer)
    detailClickRecordId = ''
    detailClickTimer = null
    openRecordDetail(record)
    return
  }

  if (detailClickTimer) {
    window.clearTimeout(detailClickTimer)
  }

  detailClickRecordId = record.id
  detailClickTimer = window.setTimeout(() => {
    detailClickRecordId = ''
    detailClickTimer = null
  }, 360)
}

function openRecordDetail(record) {
  closeSelectMenu()
  detailRecord.value = record
}

function closeRecordDetail() {
  detailRecord.value = null
}

function closeDeleteConfirm() {
  deleteTargetRecord.value = null
}

function requestClearTrash() {
  closeSelectMenu()

  if (!deletedRecords.value.length) {
    notify('回收站已经为空')
    return
  }

  clearTrashConfirmOpen.value = true
}

function openManagementView() {
  closeSelectMenu()
  activeBoardView.value = activeBoardView.value === 'management' ? 'records' : 'management'
}

function selectContributionDay(day) {
  if (!day?.isInRange) {
    return
  }

  selectedContributionDateKey.value = day.key
  selectedContributionYear.value = Number(String(day.key).slice(0, 4)) || selectedContributionYear.value
}

function selectContributionYear(year) {
  selectedContributionYear.value = year
  selectedContributionDateKey.value = ''
}

function closeClearTrashConfirm() {
  if (trashClearing.value) {
    return
  }

  clearTrashConfirmOpen.value = false
}

async function toggleTrashView() {
  closeSelectMenu()

  if (activeBoardView.value === 'trash') {
    activeBoardView.value = 'records'
    return
  }

  activeBoardView.value = 'trash'
  await loadDeletedRecords()
}

async function confirmRemoveRecord() {
  const record = deleteTargetRecord.value

  if (!record) {
    return
  }

  try {
    const recordId = record.id
    const result = await http.delete(`/api/internship/records/${encodeURIComponent(recordId)}`)
    const deletedRecord = normalizeDeletedRecord(result.record)

    records.value = records.value.filter((record) => record.id !== recordId)

    if (deletedRecord) {
      deletedRecords.value = [
        deletedRecord,
        ...deletedRecords.value.filter((item) => item.id !== deletedRecord.id)
      ]
    }

    if (editingId.value === recordId) {
      closeDraftDialog()
    }

    closeDeleteConfirm()
    notify('已移入回收站')
  } catch (error) {
    notify(error instanceof Error ? error.message : '删除失败', 'danger')
  }
}

async function restoreDeletedRecord(record) {
  try {
    const result = await http.patch(`/api/internship/records/${encodeURIComponent(record.id)}/restore`)
    const savedRecord = normalizeRecord(result.record)

    if (savedRecord) {
      records.value = [
        savedRecord,
        ...records.value.filter((item) => item.id !== savedRecord.id)
      ]
    }

    deletedRecords.value = deletedRecords.value.filter((item) => item.id !== record.id)
    notify('已恢复')
  } catch (error) {
    notify(error instanceof Error ? error.message : '恢复失败', 'danger')
  }
}

async function removeDeletedRecord(recordId) {
  try {
    await http.delete(`/api/internship/records/${encodeURIComponent(recordId)}?permanent=1`)
    deletedRecords.value = deletedRecords.value.filter((record) => record.id !== recordId)
    notify('已从回收站移除')
  } catch (error) {
    notify(error instanceof Error ? error.message : '移除失败', 'danger')
  }
}

async function confirmClearTrash() {
  if (trashClearing.value) {
    return
  }

  const recordIds = deletedRecords.value.map((record) => record.id)

  if (!recordIds.length) {
    clearTrashConfirmOpen.value = false
    notify('回收站已经为空')
    return
  }

  trashClearing.value = true

  try {
    const results = await Promise.allSettled(
      recordIds.map((recordId) => (
        http.delete(`/api/internship/records/${encodeURIComponent(recordId)}?permanent=1`)
      ))
    )
    const removedIds = recordIds.filter((recordId, index) => (
      results[index]?.status === 'fulfilled'
    ))
    const failedCount = recordIds.length - removedIds.length

    if (removedIds.length) {
      const removedIdSet = new Set(removedIds)
      deletedRecords.value = deletedRecords.value.filter((record) => !removedIdSet.has(record.id))
    }

    if (failedCount) {
      notify(`已清空 ${removedIds.length} 条，${failedCount} 条失败`, 'danger')
      return
    }

    clearTrashConfirmOpen.value = false
    notify('回收站已清空')
  } catch (error) {
    notify(error instanceof Error ? error.message : '清空失败', 'danger')
  } finally {
    trashClearing.value = false
  }
}

function getCategoryLabel(value) {
  return categoryOptions.find((option) => option.value === value)?.label || '记录'
}

function getCategoryFilterLabel(value) {
  return categoryFilterOptions.find((option) => option.value === value)?.label || '全部'
}

function getStatusFilterLabel(value) {
  return statusFilterOptions.find((option) => option.value === value)?.label || '全部'
}

function getStatusLabel(value) {
  return statusOptions.find((option) => option.value === value)?.label || '进行中'
}

function getRecordPreview(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/^[\t \u00a0\u3000]+/, ''))
    .join(' ')
    .replace(/^[\t \u00a0\u3000]+/, '')
}

function createInternshipContributionYears(sourceRecords) {
  const currentYear = new Date().getFullYear()
  const yearCounts = new Map()
  let earliestYear = currentYear

  sourceRecords.forEach((record) => {
    const recordDate = getRecordContributionDate(record)

    if (Number.isNaN(recordDate.getTime())) {
      return
    }

    const year = recordDate.getFullYear()
    earliestYear = Math.min(earliestYear, year)
    yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
  })

  return Array.from({ length: currentYear - earliestYear + 1 }, (_, index) => {
    const year = currentYear - index
    const weeks = createInternshipContributionWeeks(sourceRecords, year)

    return {
      year,
      total: yearCounts.get(year) || 0,
      weeks,
      monthLabels: createContributionMonthLabels(weeks)
    }
  })
}

function createInternshipContributionWeeks(sourceRecords, selectedYear) {
  const rangeStart = startOfLocalDay(new Date(selectedYear, 0, 1))
  const rangeEnd = startOfLocalDay(new Date(selectedYear, 11, 31))
  const calendarStart = addLocalDays(rangeStart, -rangeStart.getDay())
  const calendarEnd = addLocalDays(rangeEnd, 6 - rangeEnd.getDay())
  const recordCounts = new Map()

  sourceRecords.forEach((record) => {
    const recordDate = getRecordContributionDate(record)

    if (Number.isNaN(recordDate.getTime()) || recordDate < rangeStart || recordDate > rangeEnd) {
      return
    }

    const dateKey = getLocalDateKey(recordDate)
    recordCounts.set(dateKey, (recordCounts.get(dateKey) || 0) + 1)
  })

  const weeks = []

  for (let weekStart = calendarStart; weekStart <= calendarEnd; weekStart = addLocalDays(weekStart, 7)) {
    const days = []

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = addLocalDays(weekStart, dayIndex)
      const isInRange = date >= rangeStart && date <= rangeEnd
      const dateKey = getLocalDateKey(date)
      const count = isInRange ? recordCounts.get(dateKey) || 0 : 0
      const dateLabel = formatContributionDate(date)
      const tooltipDateLabel = formatContributionTooltipDate(date)
      const tooltipCountLabel = count === 1 ? '1 record' : `${count} records`

      days.push({
        key: dateKey,
        count,
        isInRange,
        level: isInRange ? getContributionLevel(count) : 0,
        monthKey: `${date.getFullYear()}-${date.getMonth()}`,
        monthLabel: getContributionMonthLabel(date),
        tooltip: `${tooltipCountLabel} on ${tooltipDateLabel}.`,
        title: count ? `${dateLabel}：${count} 条记录` : `${dateLabel}：无记录`
      })
    }

    weeks.push({
      key: getLocalDateKey(weekStart),
      days
    })
  }

  return weeks
}

function createContributionMonthLabels(weeks) {
  const labels = []
  const seenMonths = new Set()

  weeks.forEach((week, weekIndex) => {
    const visibleDay = week.days.find((day) => day.isInRange)

    if (!visibleDay || seenMonths.has(visibleDay.monthKey)) {
      return
    }

    seenMonths.add(visibleDay.monthKey)
    labels.push({
      key: visibleDay.monthKey,
      label: visibleDay.monthLabel,
      weekIndex,
      span: 1
    })
  })

  return labels.map((label, index) => ({
    ...label,
    span: Math.max((labels[index + 1]?.weekIndex || weeks.length) - label.weekIndex, 1)
  })).filter((label, index) => index === 0 || label.span >= 3)
}

function getRecordContributionDate(record) {
  if (record?.recordDate) {
    const date = startOfLocalDay(new Date(`${record.recordDate}T00:00:00`))

    if (!Number.isNaN(date.getTime())) {
      return date
    }
  }

  return startOfLocalDay(new Date(record?.createdAt))
}

function getRecordContributionDateKey(record) {
  const date = getRecordContributionDate(record)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return getLocalDateKey(date)
}

function startOfLocalDay(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function addLocalDays(value, amount) {
  const date = new Date(value)
  date.setDate(date.getDate() + amount)
  return date
}

function getLocalDateKey(value) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0')
  ].join('-')
}

function formatContributionDateKey(value) {
  const [year, month, day] = String(value || '').split('-')

  if (!year || !month || !day) {
    return ''
  }

  return `${year}/${month}/${day}`
}

function getContributionLevel(count) {
  if (count <= 0) {
    return 0
  }

  if (count === 1) {
    return 1
  }

  if (count === 2) {
    return 2
  }

  if (count <= 4) {
    return 3
  }

  return 4
}

function getContributionMonthLabel(value) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][value.getMonth()]
}

function formatContributionTooltipDate(value) {
  const monthLabel = getContributionMonthLabel(value)
  const day = value.getDate()
  return `${monthLabel} ${day}${getOrdinalSuffix(day)}`
}

function getOrdinalSuffix(value) {
  if (value % 100 >= 11 && value % 100 <= 13) {
    return 'th'
  }

  if (value % 10 === 1) {
    return 'st'
  }

  if (value % 10 === 2) {
    return 'nd'
  }

  if (value % 10 === 3) {
    return 'rd'
  }

  return 'th'
}

function formatContributionDate(value) {
  return `${value.getFullYear()}/${String(value.getMonth() + 1).padStart(2, '0')}/${String(value.getDate()).padStart(2, '0')}`
}

function toggleSelectMenu(name) {
  openSelectMenu.value = openSelectMenu.value === name ? '' : name
}

function closeSelectMenu(name = '') {
  if (!name || openSelectMenu.value === name) {
    openSelectMenu.value = ''
  }
}

function handleSelectFocusout(event, name) {
  const nextTarget = event.relatedTarget

  if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
    return
  }

  closeSelectMenu(name)
}

function selectActiveCategory(value) {
  activeCategory.value = value
  closeSelectMenu('activeCategory')
}

function selectActiveStatus(value) {
  activeStatus.value = value
  closeSelectMenu('activeStatus')
}

function selectDraftCategory(value) {
  draftCategory.value = value
  closeSelectMenu('draftCategory')
}

function selectDraftStatus(value) {
  draftStatus.value = value
  closeSelectMenu('draftStatus')
}

function formatDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function formatDateTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function formatRecordDate(value) {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  }).format(date)
}

function formatInputDate(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return formatInputDate(new Date())
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeInputDate(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return ''
  }

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return value
}

function normalizeDateValue(value) {
  if (typeof value !== 'string') {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return value
}

function isThisWeek(value) {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return false
  }

  const today = new Date()
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  return date >= weekStart && date < weekEnd
}

function handleBackToTools() {
  router.push('/tools')
}
</script>

<style scoped>
.internship-page {
  --internship-ink: #111827;
  --internship-copy: #374151;
  --internship-muted: #6b7280;
  --internship-line: rgba(17, 24, 39, 0.08);
  --internship-line-strong: rgba(17, 24, 39, 0.16);
  --internship-soft: #f6f7f9;
  --internship-soft-strong: #eceff3;
  --internship-accent: #b4232f;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  gap: 0;
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  padding: 14px;
  color: var(--internship-ink);
  background: #f7f8fa;
  overflow: hidden;
}

.internship-logout,
.internship-trash-button,
.internship-add-button,
.internship-dialog__close,
.internship-dialog__edit,
.internship-dialog__save,
.internship-primary,
.internship-secondary,
.internship-danger,
.internship-record__actions button {
  border: 1px solid var(--internship-line);
  border-radius: 14px;
  color: var(--internship-copy);
  background: #ffffff;
  cursor: pointer;
  text-decoration: none;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.internship-logout,
.internship-trash-button,
.internship-add-button,
.internship-dialog__close,
.internship-dialog__edit,
.internship-dialog__save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 16px;
  font-weight: 700;
}

.internship-add-button {
  width: 48px;
  min-width: 48px;
  padding: 0;
  border-color: #111827;
  border-radius: 16px;
  color: #ffffff;
  background: #111827;
  box-shadow: 0 14px 26px rgba(17, 24, 39, 0.16);
}

.internship-trash-button {
  position: relative;
  width: 44px;
  min-width: 44px;
  padding: 0;
}

.internship-trash-button.is-active {
  border-color: #111827;
  color: #ffffff;
  background: #111827;
  box-shadow: 0 12px 24px rgba(17, 24, 39, 0.14);
}

.internship-trash-button svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.internship-add-button span {
  font-size: 1.7rem;
  line-height: 1;
  transform: translateY(-1px);
}

.internship-dialog__close,
.internship-dialog__edit,
.internship-dialog__save {
  width: 42px;
  min-width: 42px;
  padding: 0;
  font-size: 1.45rem;
  line-height: 1;
}

.internship-dialog__save {
  border-color: #111827;
  color: #ffffff;
  background: #111827;
  box-shadow: 0 12px 24px rgba(17, 24, 39, 0.14);
}

.internship-dialog__edit {
  color: var(--internship-ink);
  background: var(--internship-soft);
}

.internship-dialog__edit svg,
.internship-dialog__save svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.internship-primary,
.internship-secondary,
.internship-danger,
.internship-record__actions button {
  padding: 10px 16px;
  font-weight: 700;
}

.internship-logout:hover,
.internship-trash-button:hover,
.internship-add-button:hover,
.internship-dialog__close:hover,
.internship-dialog__edit:hover,
.internship-dialog__save:hover,
.internship-primary:hover,
.internship-secondary:hover,
.internship-danger:hover,
.internship-record__actions button:hover {
  transform: translateY(-1px);
  border-color: var(--internship-line-strong);
  box-shadow: 0 12px 28px rgba(17, 24, 39, 0.08);
}

.internship-dialog__save:disabled {
  opacity: 0.52;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.internship-dialog__save:disabled:hover {
  border-color: #111827;
  background: #111827;
  transform: none;
  box-shadow: none;
}

.internship-summary {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  min-height: 0;
  align-content: start;
  align-self: stretch;
}

.internship-stat {
  display: grid;
  gap: 8px;
  min-width: 0;
  min-height: 92px;
  align-content: center;
  border: 1px solid var(--internship-line);
  border-radius: 18px;
  padding: 18px;
  background: #ffffff;
  box-shadow:
    0 18px 40px rgba(17, 24, 39, 0.06),
    0 3px 10px rgba(17, 24, 39, 0.03);
}

.internship-stat--button {
  width: 100%;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.internship-stat--button:hover {
  transform: translateY(-1px);
  border-color: var(--internship-line-strong);
  box-shadow:
    0 22px 46px rgba(17, 24, 39, 0.09),
    0 5px 14px rgba(17, 24, 39, 0.05);
}

.internship-stat--button.is-active {
  border-color: rgba(17, 24, 39, 0.34);
  background: #f9fafb;
  box-shadow: inset 4px 0 0 #111827, 0 18px 40px rgba(17, 24, 39, 0.07);
}

.internship-stat__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.internship-stat span {
  min-width: 0;
  color: var(--internship-muted);
  font-size: 0.9rem;
  font-weight: 700;
}

.internship-clear-trash {
  flex: 0 0 auto;
  border: 1px solid rgba(180, 35, 47, 0.2);
  border-radius: 999px;
  padding: 5px 9px;
  color: #b4232f;
  background: rgba(255, 228, 230, 0.58);
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease,
    color 160ms ease,
    opacity 160ms ease;
}

.internship-clear-trash:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(180, 35, 47, 0.42);
  background: rgba(255, 228, 230, 0.86);
  box-shadow: 0 10px 20px rgba(180, 35, 47, 0.12);
}

.internship-clear-trash:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.internship-stat strong {
  color: var(--internship-ink);
  font-size: 2.25rem;
  line-height: 1;
}

.internship-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(150px, 178px);
  gap: 14px;
  width: 100%;
  height: 100%;
  min-height: 0;
  align-items: stretch;
}

.internship-board,
.internship-record,
.internship-dialog {
  border: 1px solid var(--internship-line);
  border-radius: 18px;
  background: #ffffff;
  box-shadow:
    0 18px 40px rgba(17, 24, 39, 0.07),
    0 3px 10px rgba(17, 24, 39, 0.04);
}

.internship-form,
.internship-form__left,
.internship-form__record,
.internship-field,
.internship-records {
  display: grid;
  gap: 16px;
}

.internship-form {
  --internship-dialog-body-height: clamp(420px, 52vh, 560px);
  grid-template-columns: minmax(260px, 0.86fr) minmax(0, 1.14fr);
  align-items: stretch;
  min-height: var(--internship-dialog-body-height);
}

.internship-form__left {
  grid-auto-rows: auto;
  align-content: start;
  gap: 18px;
  min-height: var(--internship-dialog-body-height);
}

.internship-form__record {
  grid-template-rows: auto minmax(0, 1fr);
  min-height: var(--internship-dialog-body-height);
}

.internship-field {
  grid-template-columns: 48px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.internship-form__left .internship-field {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-content: start;
  align-items: stretch;
  gap: 10px;
}

.internship-field--textarea {
  align-items: start;
}

.internship-records {
  min-height: 0;
  align-content: start;
  gap: 10px;
  padding-right: 4px;
  overflow: auto;
}

.internship-records::-webkit-scrollbar,
.internship-dialog::-webkit-scrollbar {
  width: 8px;
}

.internship-records::-webkit-scrollbar-thumb,
.internship-dialog::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.18);
}

.internship-records::-webkit-scrollbar-track,
.internship-dialog::-webkit-scrollbar-track {
  background: transparent;
}

.internship-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.internship-field > span:first-child,
.internship-form__record > span:first-child,
.internship-search > span:first-child,
.internship-filter > span:first-child {
  color: var(--internship-copy);
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
}

.internship-field input,
.internship-field textarea,
.internship-field select,
.internship-form__record textarea,
.internship-search input,
.internship-filter select,
.internship-select-trigger {
  width: 100%;
  border: 1px solid var(--internship-line);
  border-radius: 14px;
  padding: 12px 14px;
  color: var(--internship-ink);
  background: var(--internship-soft);
  outline: none;
}

.internship-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.internship-select-trigger::after {
  content: '';
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  margin-left: 12px;
  border-right: 2px solid var(--internship-ink);
  border-bottom: 2px solid var(--internship-ink);
  transform: translateY(-2px) rotate(45deg);
  transform-origin: 50% 50%;
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 160ms ease;
}

.internship-select-wrap.is-open .internship-select-trigger {
  border-color: rgba(17, 24, 39, 0.38);
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(17, 24, 39, 0.08);
}

.internship-select-wrap.is-open .internship-select-trigger::after {
  border-color: #111827;
  transform: translateY(3px) rotate(225deg);
}

.internship-field select,
.internship-filter select {
  display: block;
  min-height: 48px;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-right: 46px;
  cursor: pointer;
  line-height: 1.25;
  background-image: none;
}

.internship-field select::-ms-expand,
.internship-filter select::-ms-expand {
  display: none;
}

.internship-select-wrap {
  position: relative;
  display: block;
  width: 100%;
}

.internship-select-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  left: 0;
  z-index: 60;
  display: grid;
  gap: 4px;
  max-height: 240px;
  padding: 6px;
  border: 1px solid var(--internship-line);
  border-radius: 14px;
  background: #ffffff;
  box-shadow:
    0 18px 42px rgba(17, 24, 39, 0.14),
    0 4px 12px rgba(17, 24, 39, 0.08);
  overflow: auto;
  transform-origin: top center;
}

.internship-select-wrap--up .internship-select-menu {
  top: auto;
  bottom: calc(100% + 8px);
  transform-origin: bottom center;
}

.internship-select-option {
  width: 100%;
  border: 0;
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--internship-copy);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  text-align: left;
  transition:
    color 140ms ease,
    background-color 140ms ease,
    transform 140ms ease;
}

.internship-select-option:hover,
.internship-select-option:focus-visible {
  color: var(--internship-ink);
  background: var(--internship-soft);
  outline: none;
  transform: translateX(2px);
}

.internship-select-option.is-selected {
  color: #ffffff;
  background: #111827;
}

.internship-select-menu-enter-active {
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.internship-select-menu-leave-active {
  transition:
    opacity 130ms ease,
    transform 150ms cubic-bezier(0.4, 0, 1, 1);
}

.internship-select-menu-enter-from,
.internship-select-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.internship-select-wrap--up .internship-select-menu-enter-from,
.internship-select-wrap--up .internship-select-menu-leave-to {
  transform: translateY(8px) scale(0.98);
}

.internship-select-menu-enter-to,
.internship-select-menu-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.internship-field textarea,
.internship-form__record textarea {
  min-height: clamp(220px, 34vh, 360px);
  resize: vertical;
}

.internship-form__record textarea {
  min-height: clamp(320px, 44vh, 500px);
  height: 100%;
  font-family: Consolas, 'Courier New', monospace;
  white-space: pre-wrap;
  tab-size: 4;
}

.internship-field--textarea > span:first-child {
  padding-top: 13px;
}

.internship-field input:focus,
.internship-field textarea:focus,
.internship-form__record textarea:focus,
.internship-field select:focus,
.internship-search input:focus,
.internship-filter select:focus,
.internship-select-trigger:focus-visible {
  border-color: rgba(17, 24, 39, 0.38);
  box-shadow: 0 0 0 4px rgba(17, 24, 39, 0.08);
}

.internship-actions,
.internship-record__actions,
.internship-confirm__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.internship-primary {
  border-color: #111827;
  color: #ffffff;
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
  box-shadow: 0 14px 26px rgba(17, 24, 39, 0.16);
}

.internship-danger {
  border-color: rgba(185, 28, 28, 0.2);
  color: #991b1b;
  background: #fff1f2;
}

.internship-board {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
  padding: 18px;
  overflow: hidden;
}

.internship-board__content {
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
}

.internship-board__records-view {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
}

.internship-management-view {
  min-height: 0;
  overflow: auto;
}

.internship-management-view::-webkit-scrollbar {
  width: 8px;
}

.internship-management-view::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.18);
}

.internship-contributions {
  --internship-contribution-gap: 2px;
  --internship-contribution-label-width: 32px;
  --internship-contribution-year-width: 86px;
  min-width: 0;
  border: 1px solid #e2e5e9;
  border-radius: 8px;
  background: #ffffff;
  overflow: visible;
}

.internship-contributions > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #edf0f2;
  padding: 11px 14px;
}

.internship-contributions > header strong {
  color: #3d4a5f;
  font-size: 0.88rem;
}

.internship-contributions > header span {
  min-width: 0;
  overflow: hidden;
  color: #9aa2ad;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.internship-contributions__years-list {
  display: grid;
  gap: 0;
}

.internship-contributions__year + .internship-contributions__year {
  border-top: 1px solid #edf0f2;
}

.internship-contributions__year-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--internship-contribution-year-width);
  align-items: start;
  gap: 16px;
  padding: 14px;
}

.internship-contributions__year-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px 0;
}

.internship-contributions__year-head strong {
  color: #253246;
  font-size: 0.92rem;
}

.internship-contributions__year-head span {
  color: #87909e;
  font-size: 0.76rem;
}

.internship-contributions__chart {
  min-width: 0;
  overflow: visible;
  padding: 0;
}

.internship-contributions__months {
  display: grid;
  margin-left: calc(var(--internship-contribution-label-width) + 8px);
  grid-template-columns: repeat(var(--week-count), minmax(0, 1fr));
  gap: var(--internship-contribution-gap);
  color: #677386;
  font-size: 0.72rem;
  line-height: 1;
}

.internship-contributions__months span {
  min-width: 0;
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}

.internship-contributions__body {
  display: flex;
  min-width: 0;
  gap: 8px;
  margin-top: 7px;
}

.internship-contributions__weekdays {
  display: grid;
  width: var(--internship-contribution-label-width);
  flex: 0 0 auto;
  grid-template-rows: repeat(7, minmax(7px, 1fr));
  gap: var(--internship-contribution-gap);
  color: #677386;
  font-size: 0.72rem;
  line-height: 1;
  text-align: right;
}

.internship-contributions__weekdays span {
  display: grid;
  align-items: center;
}

.internship-contributions__weeks {
  position: relative;
  display: grid;
  min-width: 0;
  flex: 1;
  grid-template-columns: repeat(var(--week-count), minmax(0, 1fr));
  gap: var(--internship-contribution-gap);
}

.internship-contributions__week {
  display: grid;
  gap: var(--internship-contribution-gap);
}

.internship-contributions__day,
.internship-contributions__legend i {
  display: block;
  width: 100%;
  min-width: 0;
  aspect-ratio: 1;
  border-radius: 3px;
  background: #ebedf0;
  box-shadow: inset 0 0 0 1px rgba(27, 31, 36, 0.04);
}

.internship-contributions__day {
  position: relative;
  border: 0;
  padding: 0;
  appearance: none;
  cursor: default;
}

.internship-contributions__day:not(:disabled) {
  cursor: pointer;
}

.internship-contributions__day:not(:disabled):hover {
  box-shadow:
    inset 0 0 0 1px rgba(27, 31, 36, 0.08),
    0 0 0 2px rgba(17, 24, 39, 0.08);
}

.internship-contributions__day.is-selected {
  z-index: 2;
  box-shadow:
    inset 0 0 0 1px rgba(27, 31, 36, 0.1),
    0 0 0 2px rgba(9, 105, 218, 0.22);
  transform: scale(1.04);
}

.internship-contributions__day::before,
.internship-contributions__day::after {
  position: absolute;
  left: 50%;
  z-index: 4;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 4px);
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}

.internship-contributions__day::before {
  bottom: calc(100% + 9px);
  max-width: 240px;
  border-radius: 6px;
  background: #24292f;
  color: #ffffff;
  content: attr(data-tooltip);
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1;
  padding: 8px 10px;
  text-align: center;
  white-space: nowrap;
}

.internship-contributions__day::after {
  bottom: calc(100% + 4px);
  border: 5px solid transparent;
  border-top-color: #24292f;
  content: "";
}

.internship-contributions__day:hover::before,
.internship-contributions__day:hover::after,
.internship-contributions__day:focus-visible::before,
.internship-contributions__day:focus-visible::after {
  opacity: 1;
  transform: translate(-50%, 0);
}

.internship-contributions__legend i {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
}

.internship-contributions__day[data-level="1"],
.internship-contributions__legend i[data-level="1"] {
  background: #9be9a8;
}

.internship-contributions__day[data-level="2"],
.internship-contributions__legend i[data-level="2"] {
  background: #40c463;
}

.internship-contributions__day[data-level="3"],
.internship-contributions__legend i[data-level="3"] {
  background: #30a14e;
}

.internship-contributions__day[data-level="4"],
.internship-contributions__legend i[data-level="4"] {
  background: #216e39;
}

.internship-contributions__day.is-outside-range {
  opacity: 0;
  pointer-events: none;
}

.internship-contributions__legend {
  display: flex;
  width: calc(100% - var(--internship-contribution-label-width) - 8px);
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 12px;
  margin-left: calc(var(--internship-contribution-label-width) + 8px);
  color: #677386;
  font-size: 0.72rem;
}

.internship-contributions__year-side {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: flex-end;
}

.internship-contributions__year-button {
  display: grid;
  width: 100%;
  min-height: 40px;
  align-content: center;
  gap: 2px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 7px 10px;
  color: #5f6b7a;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.internship-contributions__year-button:hover {
  border-color: #d8dee4;
  background: #f6f8fa;
}

.internship-contributions__year-button.is-active {
  border-color: #0969da;
  color: #ffffff;
  background: #0969da;
  box-shadow: 0 8px 18px rgba(9, 105, 218, 0.18);
}

.internship-contributions__year-button strong {
  font-size: 0.86rem;
  line-height: 1;
}

.internship-contributions__year-button span {
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
  opacity: 0.78;
}

.internship-contributions__details {
  display: grid;
  gap: 10px;
  border-top: 1px solid #edf0f2;
  padding: 12px 14px 14px;
  background: #ffffff;
}

.internship-contributions__details > header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.internship-contributions__details > header div {
  display: grid;
  gap: 3px;
}

.internship-contributions__details > header span {
  color: #87909e;
  font-size: 0.72rem;
  font-weight: 700;
}

.internship-contributions__details > header strong {
  color: #253246;
  font-size: 0.94rem;
}

.internship-contributions__details-list {
  display: grid;
  gap: 7px;
}

.internship-contributions__details-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 1px solid #edf0f2;
  border-radius: 8px;
  padding: 9px 10px;
  color: inherit;
  background: #f9fafb;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.internship-contributions__details-item:hover {
  border-color: rgba(17, 24, 39, 0.18);
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(17, 24, 39, 0.06);
  transform: translateY(-1px);
}

.internship-contributions__details-main {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.internship-contributions__details-main strong,
.internship-contributions__details-main span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.internship-contributions__details-main strong {
  color: #253246;
  font-size: 0.86rem;
}

.internship-contributions__details-main span {
  color: #6b7280;
  font-size: 0.78rem;
  line-height: 1.3;
}

.internship-contributions__details-meta {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
}

.internship-contributions__details-meta > span {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  border-radius: 999px;
  padding: 3px 8px;
  color: var(--internship-copy);
  background: var(--internship-soft);
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.internship-contributions__details-empty {
  margin: 0;
  border: 1px dashed #d8dde3;
  border-radius: 8px;
  padding: 12px;
  color: #87909e;
  background: #f9fafb;
  font-size: 0.82rem;
  text-align: center;
}

.internship-contribution-details-enter-active,
.internship-contribution-details-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.internship-contribution-details-enter-from,
.internship-contribution-details-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.internship-list-switcher {
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
}

.internship-list-switcher > .internship-records {
  grid-area: 1 / 1;
  min-height: 0;
}

.internship-board-fade-enter-active,
.internship-board-fade-leave-active {
  transition: opacity 360ms ease;
  will-change: opacity;
}

.internship-board-fade-leave-active {
  position: absolute;
  inset: 0;
  width: 100%;
  pointer-events: none;
}

.internship-board-fade-enter-from,
.internship-board-fade-leave-to {
  opacity: 0;
}

.internship-board-fade-enter-to,
.internship-board-fade-leave-from {
  opacity: 1;
}

.internship-board__head,
.internship-dialog__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.internship-dialog__head {
  align-items: center;
}

.internship-board__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.internship-dialog__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.internship-board__head h1,
.internship-dialog__head h2 {
  margin: 0;
  color: var(--internship-ink);
  line-height: 1;
}

.internship-board__head h1 {
  font-size: clamp(1.7rem, 3vw, 2.35rem);
}

.internship-dialog__head h2 {
  font-size: 1.55rem;
}

.internship-dialog__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.internship-dialog__meta time {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: 999px;
  padding: 4px 9px;
  color: var(--internship-muted);
  background: var(--internship-soft);
  font-size: 0.76rem;
  font-weight: 700;
}

.internship-board__toolbar {
  display: grid;
  grid-template-columns: minmax(160px, 240px) minmax(190px, 240px) minmax(190px, 240px);
  align-items: center;
  justify-content: start;
  gap: 14px;
}

.internship-board__toolbar.has-trash-action {
  grid-template-columns: minmax(160px, 240px) minmax(190px, 240px) minmax(190px, 240px) auto;
}

.internship-search,
.internship-filter {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.internship-clear-trash--toolbar {
  align-self: stretch;
  margin-left: auto;
  min-width: 72px;
  border-radius: 14px;
  padding: 0 16px;
  border-color: rgba(180, 35, 47, 0.2);
  color: #b4232f;
  background: rgba(255, 228, 230, 0.58);
  font-weight: 700;
}

.internship-clear-trash--toolbar:hover:not(:disabled) {
  border-color: rgba(180, 35, 47, 0.42);
  background: rgba(255, 228, 230, 0.86);
}

.internship-clear-trash--toolbar:disabled {
  opacity: 0.42;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.internship-record {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  animation: internship-item-enter 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
  cursor: pointer;
}

.internship-record__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.internship-record__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  gap: 6px;
}

.internship-record__meta span,
.internship-record__meta time {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: 999px;
  padding: 3px 8px;
  color: var(--internship-copy);
  background: var(--internship-soft);
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
}

.internship-record__meta time {
  color: var(--internship-muted);
}

.internship-record__status.is-progress {
  color: #111827;
  background: #e5e7eb;
}

.internship-record__status.is-done {
  color: #14532d;
  background: #dcfce7;
}

.internship-record__status.is-follow-up {
  color: #9f1239;
  background: #ffe4e6;
}

.internship-record h2 {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  color: var(--internship-ink);
  font-size: 1.08rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.internship-record__body {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.internship-record__content {
  display: block;
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  color: var(--internship-copy);
  font-size: 0.92rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: pre;
}

.internship-record__actions {
  flex: 0 0 auto;
  flex-wrap: nowrap;
  gap: 6px;
}

.internship-record__actions button {
  border-radius: 10px;
  padding: 7px 10px;
  font-size: 0.78rem;
}

.internship-modal {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgba(17, 24, 39, 0.42);
  overflow: auto;
}

.internship-dialog {
  width: min(1080px, calc(100vw - 44px));
  max-height: calc(100vh - 44px);
  padding: 24px 26px 26px;
  overflow: visible;
  transform-origin: top right;
  box-shadow:
    0 28px 72px rgba(17, 24, 39, 0.24),
    0 8px 24px rgba(17, 24, 39, 0.12);
}

.internship-dialog .internship-form {
  gap: 22px;
  margin-top: 20px;
}

.internship-confirm-dialog {
  width: min(520px, calc(100vw - 44px));
}

.internship-confirm {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.internship-confirm p {
  margin: 0;
  color: var(--internship-copy);
  line-height: 1.7;
}

.internship-confirm strong {
  display: block;
  min-width: 0;
  border: 1px solid var(--internship-line);
  border-radius: 14px;
  padding: 12px 14px;
  color: var(--internship-ink);
  background: var(--internship-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.internship-detail-dialog {
  width: min(920px, calc(100vw - 44px));
}

.internship-detail-dialog__head {
  justify-content: space-between;
}

.internship-detail {
  display: grid;
  gap: 16px;
  margin-top: 14px;
}

.internship-detail__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}

.internship-detail__head h3 {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  color: var(--internship-ink);
  font-size: 1.22rem;
  line-height: 1.32;
  overflow-wrap: anywhere;
}

.internship-detail__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex: 0 1 auto;
  gap: 8px;
}

.internship-detail__meta span,
.internship-detail__meta time {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  border-radius: 999px;
  padding: 4px 9px;
  color: var(--internship-copy);
  background: var(--internship-soft);
  font-size: 0.78rem;
  font-weight: 700;
}

.internship-detail__content {
  max-height: min(52vh, 520px);
  margin: 0;
  border: 1px solid var(--internship-line);
  border-radius: 16px;
  padding: 16px;
  color: var(--internship-copy);
  background: var(--internship-soft);
  font-family: Consolas, 'Courier New', monospace;
  font-size: 0.92rem;
  line-height: 1.75;
  overflow: auto;
  tab-size: 4;
  white-space: pre-wrap;
}

@keyframes internship-item-enter {
  from {
    opacity: 0;
    transform: translate3d(0, 6px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.internship-window-enter-active,
.internship-window-leave-active {
  transition: opacity 180ms ease;
}

.internship-window-enter-active .internship-dialog {
  transition:
    opacity 220ms ease,
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.internship-window-leave-active .internship-dialog {
  transition:
    opacity 160ms ease,
    transform 200ms cubic-bezier(0.4, 0, 1, 1);
}

.internship-window-enter-from,
.internship-window-leave-to {
  opacity: 0;
}

.internship-window-enter-from .internship-dialog {
  opacity: 0;
  transform: translate3d(18px, -18px, 0) scale(0.88);
}

.internship-window-leave-to .internship-dialog {
  opacity: 0;
  transform: translate3d(14px, -14px, 0) scale(0.9);
}

.internship-window-enter-to,
.internship-window-leave-from {
  opacity: 1;
}

.internship-window-enter-to .internship-dialog,
.internship-window-leave-from .internship-dialog {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
}

.internship-empty {
  margin: 0;
  border: 1px dashed var(--internship-line-strong);
  border-radius: 18px;
  padding: 44px 20px;
  color: var(--internship-muted);
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .internship-board-fade-enter-active,
  .internship-board-fade-leave-active,
  .internship-window-enter-active,
  .internship-window-leave-active,
  .internship-window-enter-active .internship-dialog,
  .internship-window-leave-active .internship-dialog {
    transition-duration: 1ms;
  }

  .internship-record {
    animation: none;
  }

  .internship-window-enter-from .internship-dialog,
  .internship-window-leave-to .internship-dialog {
    transform: none;
  }
}

@media (max-width: 980px) {
  .internship-page {
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }

  .internship-summary {
    order: -1;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    align-content: start;
    align-self: start;
  }

  .internship-stat {
    min-height: 76px;
    border-radius: 16px;
    padding: 14px 12px;
  }

  .internship-stat span {
    font-size: 0.82rem;
  }

  .internship-stat strong {
    font-size: 1.9rem;
  }

  .internship-shell {
    grid-template-columns: 1fr;
    height: auto;
    align-content: start;
  }

  .internship-board,
  .internship-records {
    overflow: visible;
  }
}

@media (max-width: 640px) {
  .internship-page {
    padding: 12px;
  }

  .internship-form,
  .internship-form-grid,
  .internship-board__toolbar {
    grid-template-columns: 1fr;
  }

  .internship-board__toolbar.has-trash-action {
    grid-template-columns: 1fr;
  }

  .internship-summary {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .internship-stat {
    min-height: 62px;
    gap: 4px;
    border-radius: 14px;
    padding: 10px 6px;
    box-shadow:
      0 10px 22px rgba(17, 24, 39, 0.05),
      0 2px 6px rgba(17, 24, 39, 0.03);
  }

  .internship-stat span {
    min-width: 0;
    font-size: clamp(0.62rem, 2.6vw, 0.76rem);
    line-height: 1.15;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .internship-stat strong {
    font-size: clamp(1.05rem, 7vw, 1.5rem);
    text-align: center;
  }

  .internship-board__head,
  .internship-dialog__head {
    align-items: center;
  }

  .internship-modal {
    padding: 12px;
  }

  .internship-dialog {
    max-height: calc(100vh - 24px);
    min-height: auto;
    width: 100%;
    padding: 18px;
  }

  .internship-form,
  .internship-form__left,
  .internship-form__record {
    min-height: auto;
  }

  .internship-form__left {
    grid-template-rows: auto;
  }

  .internship-form__left .internship-field {
    align-content: start;
  }

  .internship-form__record textarea {
    min-height: 260px;
  }

  .internship-record__head {
    flex-direction: column;
    gap: 10px;
  }

  .internship-record__meta {
    justify-content: flex-start;
  }

  .internship-record__body {
    gap: 8px;
  }

  .internship-detail__head {
    flex-direction: column;
    gap: 10px;
  }

  .internship-detail__meta {
    justify-content: flex-start;
  }

  .internship-confirm__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .internship-confirm__actions button {
    width: 100%;
  }
}
</style>
