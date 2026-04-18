<template>
  <section class="note-ai-view">
    <header class="note-ai-view__toolbar">
      <div class="note-ai-view__toolbar-head">
        <span class="section-tag note-ai-view__toolbar-tag">模型切换</span>
      </div>

      <div class="note-ai-view__toolbar-main">
        <div class="note-ai-view__model-picker">
          <label class="note-ai-view__model-field">
            <span class="note-ai-view__model-label">AI 配置</span>
            <select
              v-model="selectedProvider"
              class="note-ai-view__model-input"
              :disabled="isLoading || isLoadingConfigs"
              @change="handleModelSelectionInput"
            >
              <option value="">{{ providerPlaceholder }}</option>
              <option
                v-for="provider in modelProviderOptions"
                :key="provider.value"
                :value="provider.value"
              >
                {{ provider.label }}
              </option>
            </select>
          </label>

          <label class="note-ai-view__model-field">
            <span class="note-ai-view__model-label">模型版本</span>
            <select
              v-model="selectedVersion"
              class="note-ai-view__model-input"
              :disabled="isLoading || isLoadingConfigs || !selectedProvider"
              @change="handleModelSelectionInput"
            >
              <option value="">{{ versionPlaceholder }}</option>
              <option v-for="version in modelVersionOptions" :key="version" :value="version">
                {{ version }}
              </option>
            </select>
          </label>
        </div>

        <div class="note-ai-view__toolbar-actions">
          <button
            type="button"
            class="primary-btn note-ai-view__model-button"
            :disabled="isLoading || isLoadingConfigs"
            @click="applyModelSelection"
          >
            应用模型
          </button>
          <button
            type="button"
            class="secondary-btn note-ai-view__model-button note-ai-view__parameter-toggle"
            :class="{ 'is-active': parameterPanelVisible }"
            :disabled="isLoadingConfigs"
            :aria-expanded="String(parameterPanelVisible)"
            @click.stop="toggleParameterPanel"
          >
            参数设置
          </button>
          <button
            type="button"
            class="secondary-btn note-ai-view__model-button"
            @click="openAiSettings"
          >
            AI 设置
          </button>
        </div>
      </div>

      <Transition name="note-ai-toolbar-panel">
        <div v-if="parameterPanelVisible" class="note-ai-view__parameter-panel">
          <div class="note-ai-view__parameter-head">
            <p class="note-ai-view__parameter-copy">这些参数会直接用于出题和右侧 AI 对话。</p>
            <button
              type="button"
              class="ghost-btn note-ai-view__parameter-reset"
              @click="resetGenerationParameters"
            >
              恢复默认
            </button>
          </div>

          <div class="note-ai-view__parameter-grid">
            <label
              class="note-ai-view__parameter-field note-ai-view__parameter-field--temperature"
              :style="{ '--slider-progress': `${generationTemperaturePercent}%` }"
            >
              <span class="note-ai-view__parameter-label">
                <span class="note-ai-view__parameter-label-main">
                  <span>温度</span>
                  <small>控制出题和回答的发散程度</small>
                </span>
                <strong class="note-ai-view__parameter-value">{{ generationTemperature.toFixed(1) }}</strong>
              </span>

              <div class="note-ai-view__parameter-slider-shell">
                <input
                  v-model.number="generationTemperature"
                  class="note-ai-view__parameter-range"
                  type="range"
                  :min="AI_TEMPERATURE_MIN"
                  :max="effectiveTemperatureMax"
                  :step="AI_TEMPERATURE_STEP"
                />
                <div class="note-ai-view__parameter-scale" aria-hidden="true">
                  <span>稳定</span>
                  <span>平衡</span>
                  <span>发散</span>
                </div>
              </div>

              <span class="note-ai-view__parameter-help">越低越稳定，越高越发散。</span>
            </label>

            <label
              class="note-ai-view__parameter-field note-ai-view__parameter-field--top-p"
              :style="{ '--slider-progress': `${generationTopPPercent}%` }"
            >
              <span class="note-ai-view__parameter-label">
                <span class="note-ai-view__parameter-label-main">
                  <span>Top P</span>
                  <small>控制模型采样时允许进入候选池的范围</small>
                </span>
                <strong class="note-ai-view__parameter-value">{{ generationTopP.toFixed(2) }}</strong>
              </span>

              <div class="note-ai-view__parameter-slider-shell">
                <input
                  v-model.number="generationTopP"
                  class="note-ai-view__parameter-range"
                  type="range"
                  :min="AI_TOP_P_MIN"
                  :max="AI_TOP_P_MAX"
                  :step="AI_TOP_P_STEP"
                />
                <div class="note-ai-view__parameter-scale" aria-hidden="true">
                  <span>聚焦</span>
                  <span>均衡</span>
                  <span>宽松</span>
                </div>
              </div>

              <span class="note-ai-view__parameter-help">控制候选范围，越低越保守。</span>
            </label>
          </div>
        </div>
      </Transition>

      <p
        v-if="toolbarFeedback && !hasPendingModelSelection"
        :class="configLoadError ? 'form-error note-ai-view__toolbar-feedback' : 'note-ai-view__toolbar-feedback'"
      >
        {{ toolbarFeedback }}
      </p>
    </header>

    <div class="note-ai-view__grid">
      <section class="note-ai-view__panel note-ai-view__panel--question">
        <div class="note-ai-view__panel-head">
          <div class="note-ai-view__panel-title">
            <p class="section-tag">Question</p>
            <div class="note-ai-view__panel-title-row">
              <div class="note-ai-view__panel-title-main">
                <h4>当前题目</h4>
              </div>
              <div
                v-if="questionContextPathLabel"
                class="note-ai-view__context-card"
                :title="questionContextPathLabel"
              >
                <code>{{ questionContextPathLabel }}</code>
              </div>
            </div>
          </div>
          <button
            type="button"
            class="note-ai-view__history-button"
            @click="openQuizHistory"
          >
            历史记录
          </button>
        </div>

        <div class="note-ai-view__question-stage">
          <p v-if="!activePath" class="empty-state note-ai-view__status note-ai-view__question-placeholder">
            先在左侧选中一篇 Markdown 笔记，再到这里让 AI 出题。
          </p>
          <p v-else-if="isLoading" class="note-ai-view__status note-ai-view__question-placeholder">
            AI 正在读取笔记并生成题目...
          </p>
          <p
            v-else-if="loadError"
            class="form-error note-ai-view__status note-ai-view__question-placeholder"
          >
            {{ loadError }}
          </p>
          <p
            v-else-if="!currentQuestion"
            class="empty-state note-ai-view__status note-ai-view__question-placeholder"
          >
            还没有生成题目，可以点击“开始出题”手动触发。
          </p>

          <div v-else class="note-ai-view__question-card">
            <div class="note-ai-view__question-head">
              <h4>{{ currentQuestion.prompt }}</h4>
            </div>
          </div>
        </div>

        <div class="note-ai-view__actions">
          <button
            type="button"
            class="secondary-btn"
            :disabled="!currentQuestion || isLoading"
            @click="toggleAnswer"
          >
            {{ answerVisible ? '收起答案' : '显示答案' }}
          </button>
          <button
            type="button"
            class="secondary-btn"
            :disabled="!canStartQuestionRequest"
            @click="reloadContext"
          >
            重新读取上下文
          </button>
          <button
            type="button"
            class="primary-btn"
            :disabled="!canStartQuestionRequest"
            @click="requestNextQuestion"
          >
            {{ questionActionLabel }}
          </button>
        </div>

        <Transition name="note-ai-answer">
          <div v-if="answerVisible && currentQuestion" class="note-ai-view__answer-card">
            <div class="note-ai-view__answer-head">
              <span class="section-tag">Answer</span>
              <strong>{{ currentQuestion.answerTitle }}</strong>
            </div>

            <div class="note-ai-view__answer-body">
              <ul
                v-if="currentQuestion.answerItems.length > 1"
                class="note-ai-view__answer-list"
              >
                <li v-for="item in currentQuestion.answerItems" :key="item">{{ item }}</li>
              </ul>
              <p v-else class="note-ai-view__answer-copy">{{ currentQuestion.answerItems[0] }}</p>
            </div>
          </div>
        </Transition>
      </section>

      <section class="note-ai-view__panel note-ai-view__panel--chat">
          <div class="note-ai-view__panel-head">
            <div class="note-ai-view__chat-head">
              <p class="section-tag">Chat</p>
              <div class="note-ai-view__chat-title-row">
                <span class="note-ai-view__chat-title">{{ chatPanelTitle }}</span>
                <span v-if="appliedModelBadge" class="note-ai-view__chat-model-badge">
                  {{ appliedModelBadge }}
                </span>
              </div>
              <h4>和 AI 对话</h4>
            </div>
            <button
              type="button"
              class="secondary-btn note-ai-view__chat-clear"
              :disabled="isChatLoading || !chatMessages.length"
              @click="clearChatConversation"
            >
              清空对话
            </button>
          </div>

          <div class="note-ai-view__chat-shell">
            <div ref="chatBodyRef" class="note-ai-view__chat-list">
              <div
                v-if="!chatMessages.length && !isChatLoading"
                class="note-ai-view__chat-empty"
              >
                <strong>{{ chatEmptyTitle }}</strong>
                <p>{{ chatEmptyDescription }}</p>
                <span v-if="chatContextSummary" class="note-ai-view__chat-empty-hint">
                  {{ chatContextSummary }}
                </span>
              </div>

              <article
                v-for="item in chatMessages"
                :key="item.id"
                :class="[
                  'note-ai-view__chat-item',
                  item.role === 'user'
                    ? 'note-ai-view__chat-item--user'
                    : 'note-ai-view__chat-item--assistant'
                ]"
              >
                <span class="note-ai-view__chat-role">
                  {{ item.role === 'user' ? '我' : assistantRoleLabel }}
                </span>
                <div class="note-ai-view__chat-bubble">
                  <p>{{ item.content }}</p>
                </div>
              </article>

              <div v-if="isChatLoading" class="note-ai-view__chat-loading">
                AI 正在回复...
              </div>
            </div>

            <p v-if="chatError" class="form-error note-ai-view__chat-error">
              {{ chatError }}
            </p>

            <div class="note-ai-view__chat-form">
              <div class="note-ai-view__chat-input-wrap">
                <textarea
                  ref="chatInputRef"
                  v-model.trim="chatDraft"
                  class="note-ai-view__chat-input"
                  :disabled="isLoadingConfigs"
                  :placeholder="chatInputPlaceholder"
                  @keydown="handleChatInputKeydown"
                />
                <button
                  type="button"
                  class="primary-btn note-ai-view__chat-send"
                  :disabled="!canSendChat"
                  @click="sendChatMessage"
                >
                  {{ isChatLoading ? '发送中...' : '发送' }}
                </button>
              </div>
            </div>
          </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { createMessage } from 'snowingress-my-components'
import { useRouter } from 'vue-router'
import {
  NOTE_AI_MODEL_KEY,
  NOTE_AI_PROVIDER_KEY,
  NOTE_AI_TEMPERATURE_KEY,
  NOTE_AI_TOP_P_KEY
} from '../../../constants/storage'
import http from '../../../utils/http'

const AI_CONFIG_REQUEST_TIMEOUT = 10000
const AI_REQUEST_TIMEOUT = 70000
const CHAT_HISTORY_LIMIT = 6
const QUESTION_HISTORY_LIMIT = 6
const DEFAULT_AI_TEMPERATURE = 0.2
const DEFAULT_AI_TOP_P = 1
const AI_TEMPERATURE_MIN = 0
const AI_TEMPERATURE_MAX = 2
const AI_TEMPERATURE_STEP = 0.1
const AI_TOP_P_MIN = 0.1
const AI_TOP_P_MAX = 1
const AI_TOP_P_STEP = 0.05

const props = defineProps({
  activePath: {
    type: String,
    default: ''
  },
  activeFileTitle: {
    type: String,
    default: ''
  }
})

const router = useRouter()
const initialStoredProvider = readStoredProvider()
const initialStoredModel = readStoredModel()
const initialStoredTemperature = readStoredNumber(NOTE_AI_TEMPERATURE_KEY, DEFAULT_AI_TEMPERATURE, {
  min: AI_TEMPERATURE_MIN,
  max: AI_TEMPERATURE_MAX,
  precision: 1
})
const initialStoredTopP = readStoredNumber(NOTE_AI_TOP_P_KEY, DEFAULT_AI_TOP_P, {
  min: AI_TOP_P_MIN,
  max: AI_TOP_P_MAX,
  precision: 2
})

function readStoredModel() {
  if (typeof localStorage === 'undefined') {
    return ''
  }

  return String(localStorage.getItem(NOTE_AI_MODEL_KEY) || '').trim()
}

function writeStoredModel(value) {
  if (typeof localStorage === 'undefined') {
    return
  }

  const normalized = String(value || '').trim()

  if (!normalized) {
    localStorage.removeItem(NOTE_AI_MODEL_KEY)
    return
  }

  localStorage.setItem(NOTE_AI_MODEL_KEY, normalized)
}

function readStoredProvider() {
  if (typeof localStorage === 'undefined') {
    return ''
  }

  return String(localStorage.getItem(NOTE_AI_PROVIDER_KEY) || '').trim()
}

function writeStoredProvider(value) {
  if (typeof localStorage === 'undefined') {
    return
  }

  const normalized = String(value || '').trim()

  if (!normalized) {
    localStorage.removeItem(NOTE_AI_PROVIDER_KEY)
    return
  }

  localStorage.setItem(NOTE_AI_PROVIDER_KEY, normalized)
}

function normalizeNumericInput(value, fallbackValue, { min, max, precision = 2 } = {}) {
  const parsed = Number(value)
  const normalized = Number.isFinite(parsed) ? parsed : fallbackValue
  const bounded = Math.min(Math.max(normalized, min), max)

  return Number(bounded.toFixed(precision))
}

function toSliderPercent(value, min, max) {
  if (max <= min) {
    return 0
  }

  return Number((((value - min) / (max - min)) * 100).toFixed(2))
}

function readStoredNumber(storageKey, fallbackValue, bounds) {
  if (typeof localStorage === 'undefined') {
    return fallbackValue
  }

  return normalizeNumericInput(localStorage.getItem(storageKey), fallbackValue, bounds)
}

function writeStoredNumber(storageKey, value, bounds) {
  if (typeof localStorage === 'undefined') {
    return
  }

  const normalized = normalizeNumericInput(value, bounds.defaultValue ?? 0, bounds)
  localStorage.setItem(storageKey, String(normalized))
}

function parseAiVersions(value) {
  return [...new Set(
    String(value ?? '')
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean)
  )]
}

function normalizeAiConfigOption(item) {
  const aiId = String(item?.aiId || '').trim()
  const aiBaseUrl = String(item?.aiBaseUrl || '').trim()

  if (!aiId || !item?.hasApiKey || !aiBaseUrl) {
    return null
  }

  const name = String(item?.name || '').trim() || aiId

  return {
    aiId,
    aiBaseUrl,
    name,
    label: name,
    versions: parseAiVersions(item.aiVersions)
  }
}

function isBigModelAiConfig(config) {
  return String(config?.aiBaseUrl || '')
    .trim()
    .toLowerCase()
    .includes('bigmodel.cn')
}

function normalizeQuestionPayload(payload) {
  const answerItems = Array.isArray(payload?.answerItems)
    ? payload.answerItems.map((item) => String(item || '').trim()).filter(Boolean)
    : []

  if (!answerItems.length) {
    answerItems.push('这次没有拿到可用答案，请重新生成。')
  }

  return {
    prompt: String(payload?.prompt || '').trim(),
    focus: String(payload?.focus || '').trim() || '未标注考点',
    difficulty: String(payload?.difficulty || '').trim() || '基础',
    answerTitle: String(payload?.answerTitle || '').trim() || '参考答案',
    answerItems,
    currentPath: String(payload?.currentPath || '').trim(),
    memoryPath: String(payload?.memoryPath || '').trim(),
    model: String(payload?.model || '').trim(),
    usage: {
      inputTokens: Number.isFinite(payload?.usage?.inputTokens) ? payload.usage.inputTokens : null,
      outputTokens: Number.isFinite(payload?.usage?.outputTokens) ? payload.usage.outputTokens : null,
      totalTokens: Number.isFinite(payload?.usage?.totalTokens) ? payload.usage.totalTokens : null
    }
  }
}

function createChatMessage(role, content) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: role === 'assistant' ? 'assistant' : 'user',
    content: String(content || '').trim()
  }
}

function normalizeChatReplyPayload(payload) {
  const reply = String(payload?.reply || '').trim()

  if (!reply) {
    throw new Error('AI 没有返回可展示的回复。')
  }

  return {
    reply,
    model: String(payload?.model || '').trim(),
    usage: {
      inputTokens: Number.isFinite(payload?.usage?.inputTokens) ? payload.usage.inputTokens : null,
      outputTokens: Number.isFinite(payload?.usage?.outputTokens) ? payload.usage.outputTokens : null,
      totalTokens: Number.isFinite(payload?.usage?.totalTokens) ? payload.usage.totalTokens : null
    }
  }
}

function buildChatQuestionContext(question) {
  if (!question) {
    return null
  }

  return {
    prompt: String(question.prompt || '').trim(),
    focus: String(question.focus || '').trim(),
    difficulty: String(question.difficulty || '').trim(),
    answerTitle: String(question.answerTitle || '').trim(),
    answerItems: Array.isArray(question.answerItems)
      ? question.answerItems.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6)
      : []
  }
}

const isLoading = ref(false)
const isLoadingConfigs = ref(false)
const configLoadError = ref('')
const loadError = ref('')
const isChatLoading = ref(false)
const chatError = ref('')
const currentQuestion = ref(null)
const answerVisible = ref(false)
const questionHistory = ref([])
const chatDraft = ref('')
const chatMessages = ref([])
const chatBodyRef = ref(null)
const chatInputRef = ref(null)
const aiConfigOptions = ref([])
const appliedProvider = ref(initialStoredProvider)
const appliedVersion = ref(initialStoredModel)
const selectedProvider = ref(initialStoredProvider)
const selectedVersion = ref(initialStoredModel)
const parameterPanelVisible = ref(false)
const generationTemperature = ref(initialStoredTemperature)
const generationTopP = ref(initialStoredTopP)
const shouldAnnouncePendingModelSelection = ref(false)

const modelProviderOptions = computed(() =>
  aiConfigOptions.value.map((item) => ({
    value: item.aiId,
    label: item.label
  }))
)
const selectedProviderConfig = computed(
  () => aiConfigOptions.value.find((item) => item.aiId === selectedProvider.value) || null
)
const appliedProviderConfig = computed(
  () => aiConfigOptions.value.find((item) => item.aiId === appliedProvider.value) || null
)
const parameterProviderConfig = computed(() => selectedProviderConfig.value || appliedProviderConfig.value)
const effectiveTemperatureMax = computed(() =>
  isBigModelAiConfig(parameterProviderConfig.value) ? 1 : AI_TEMPERATURE_MAX
)
const modelVersionOptions = computed(() => selectedProviderConfig.value?.versions || [])
const resolvedSelectedModel = computed(() => String(selectedVersion.value || '').trim())
const appliedModelVersionOptions = computed(() => appliedProviderConfig.value?.versions || [])
const resolvedAppliedModel = computed(() => String(appliedVersion.value || '').trim())
const hasPendingModelSelection = computed(
  () =>
    selectedProvider.value !== appliedProvider.value ||
    resolvedSelectedModel.value !== resolvedAppliedModel.value
)
const providerPlaceholder = computed(() => {
  if (isLoadingConfigs.value) {
    return '正在读取数据库配置...'
  }

  return modelProviderOptions.value.length ? '请选择 AI 配置' : '数据库里还没有可用 AI 配置'
})
const versionPlaceholder = computed(() => {
  if (!selectedProvider.value) {
    return '请先选择 AI 配置'
  }

  return modelVersionOptions.value.length ? '请选择模型版本' : '该配置还没有模型版本'
})
const canStartQuestionRequest = computed(
  () => Boolean(props.activePath && !isLoading.value && !isLoadingConfigs.value)
)
const canSendChat = computed(
  () => Boolean(chatDraft.value.trim()) && !isChatLoading.value && !isLoadingConfigs.value
)
const resolvedGenerationConfig = computed(() => ({
  temperature: normalizeNumericInput(generationTemperature.value, DEFAULT_AI_TEMPERATURE, {
    min: AI_TEMPERATURE_MIN,
    max: effectiveTemperatureMax.value,
    precision: 1
  }),
  topP: normalizeNumericInput(generationTopP.value, DEFAULT_AI_TOP_P, {
    min: AI_TOP_P_MIN,
    max: AI_TOP_P_MAX,
    precision: 2
  })
}))
const generationTemperaturePercent = computed(() =>
  toSliderPercent(generationTemperature.value, AI_TEMPERATURE_MIN, effectiveTemperatureMax.value)
)
const generationTopPPercent = computed(() =>
  toSliderPercent(generationTopP.value, AI_TOP_P_MIN, AI_TOP_P_MAX)
)
const questionContextPathLabel = computed(() =>
  String(currentQuestion.value?.memoryPath || currentQuestion.value?.currentPath || props.activePath || '').trim()
)
const toolbarFeedback = computed(() => {
  if (configLoadError.value) {
    return configLoadError.value
  }

  if (isLoadingConfigs.value) {
    return '正在从数据库读取 AI 配置...'
  }

  if (!modelProviderOptions.value.length) {
    return '数据库里还没有可用 AI 配置，请先去 AI 设置页补充。'
  }

  if (hasPendingModelSelection.value) {
    return '当前模型变更尚未应用。'
  }

  if (selectedProvider.value && !modelVersionOptions.value.length) {
    return '当前 AI 配置还没有可选模型版本。'
  }

  return ''
})
const questionActionLabel = computed(() => (currentQuestion.value ? '下一题' : '开始出题'))
const appliedModelBadge = computed(() => {
  const providerName = String(appliedProviderConfig.value?.label || '').trim()
  const modelName = resolvedAppliedModel.value

  if (!providerName && !modelName) {
    return ''
  }

  return [providerName, modelName].filter(Boolean).join(' / ')
})
const assistantRoleLabel = computed(() => resolvedAppliedModel.value || 'AI')
const chatPanelTitle = computed(() =>
  appliedModelBadge.value ? `和 ${assistantRoleLabel.value} 对话` : '和模型对话'
)
const chatInputPlaceholder = computed(() =>
  appliedModelBadge.value
    ? `直接向 ${assistantRoleLabel.value} 提问当前笔记、题目或答案细节`
    : '先选择并应用模型，再开始对话'
)

const chatEmptyTitle = computed(() =>
  appliedModelBadge.value ? `和 ${assistantRoleLabel.value} 开始对话` : '先选择并应用模型'
)
const chatEmptyDescription = computed(() => {
  if (!props.activePath) {
    return '先在左侧选择一篇 Markdown 笔记，右侧对话会自动结合当前笔记内容。'
  }

  if (!appliedModelBadge.value) {
    return '模型应用后，就可以在这里围绕当前笔记和题目继续追问。'
  }

  return '可以直接追问当前笔记、刚抽到的题目，或者让 AI 继续展开答案细节。'
})
const chatContextSummary = computed(() => {
  const parts = []

  if (props.activeFileTitle) {
    parts.push(`当前笔记：${props.activeFileTitle}`)
  }

  if (currentQuestion.value?.prompt) {
    parts.push(`当前题目：${String(currentQuestion.value.prompt).trim()}`)
  }

  return parts.join(' ｜ ')
})

let latestRequestId = 0
let latestChatRequestId = 0

function notify(message, type = 'danger') {
  createMessage({
    message,
    type,
    duration: 1800,
    offset: 24
  })
}

function handleModelSelectionInput() {
  shouldAnnouncePendingModelSelection.value = true
}

async function focusChatInput() {
  await nextTick()

  if (!chatInputRef.value || isLoadingConfigs.value) {
    return
  }

  chatInputRef.value.focus()
}

async function scrollChatToBottom() {
  await nextTick()

  if (!chatBodyRef.value) {
    return
  }

  chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
}

function resetChatConversation({ clearDraft = true } = {}) {
  latestChatRequestId += 1
  isChatLoading.value = false
  chatError.value = ''
  chatMessages.value = []

  if (clearDraft) {
    chatDraft.value = ''
  }
}

function ensureQuestionRequestReady() {
  loadError.value = ''

  if (!props.activePath) {
    notify('请先在左侧选择一篇 Markdown 笔记。')
    return false
  }

  if (!modelProviderOptions.value.length) {
    notify('当前没有可用 AI 配置，请先去 AI 设置页补充。')
    return false
  }

  if (hasPendingModelSelection.value) {
    notify('当前模型变更尚未应用，请先点击“应用模型”。')
    return false
  }

  if (!appliedProvider.value) {
    notify('请先选择并应用 AI 配置。')
    return false
  }

  if (!appliedModelVersionOptions.value.length) {
    notify('当前 AI 配置没有可用模型，请重新选择并应用。')
    return false
  }

  if (!resolvedAppliedModel.value) {
    notify('当前没有模型，请先选择模型版本并应用。')
    return false
  }

  return true
}

function ensureModelSelectionCanApply() {
  loadError.value = ''

  if (!modelProviderOptions.value.length) {
    notify('当前没有可用 AI 配置，请先去 AI 设置页补充。')
    return false
  }

  if (!selectedProvider.value) {
    notify('请先选择 AI 配置。')
    return false
  }

  if (!modelVersionOptions.value.length) {
    notify('当前 AI 配置没有可用模型。')
    return false
  }

  if (!resolvedSelectedModel.value) {
    notify('当前没有模型，请先选择模型版本。')
    return false
  }

  return true
}

function syncSelectedConfig() {
  const availableAiIds = new Set(aiConfigOptions.value.map((item) => item.aiId))

  if (selectedProvider.value && !availableAiIds.has(selectedProvider.value)) {
    selectedProvider.value = ''
  }

  if (appliedProvider.value && !availableAiIds.has(appliedProvider.value)) {
    appliedProvider.value = ''
  }

  const versions = selectedProviderConfig.value?.versions || []
  const appliedVersions = appliedProviderConfig.value?.versions || []

  if (!selectedProvider.value) {
    selectedVersion.value = ''
  } else if (!versions.includes(selectedVersion.value)) {
    selectedVersion.value = ''
  }

  if (!appliedProvider.value) {
    appliedVersion.value = ''
  } else if (!appliedVersions.includes(appliedVersion.value)) {
    appliedVersion.value = ''
  }
}

async function loadAiConfigs() {
  isLoadingConfigs.value = true
  configLoadError.value = ''

  try {
    const data = await http.get('/api/ai/configs', {
      timeout: AI_CONFIG_REQUEST_TIMEOUT
    })

    aiConfigOptions.value = (Array.isArray(data.items) ? data.items : [])
      .map((item) => normalizeAiConfigOption(item))
      .filter(Boolean)

    syncSelectedConfig()
  } catch (error) {
    aiConfigOptions.value = []
    configLoadError.value = error instanceof Error ? error.message : '读取 AI 配置失败。'
  } finally {
    isLoadingConfigs.value = false
  }
}

watch(
  () => props.activePath,
  (nextPath, previousPath) => {
    if (nextPath === previousPath) {
      return
    }

    latestRequestId += 1
    isLoading.value = false
    currentQuestion.value = null
    answerVisible.value = false
    loadError.value = ''
    questionHistory.value = []
    resetChatConversation()
  },
  { immediate: true }
)

watch(selectedProvider, (providerKey) => {
  if (!providerKey) {
    selectedVersion.value = ''
    return
  }

  const versions =
    aiConfigOptions.value.find((item) => item.aiId === providerKey)?.versions || []

  if (!versions.includes(selectedVersion.value)) {
    selectedVersion.value = ''
  }
})

watch(
  hasPendingModelSelection,
  (hasPending) => {
    if (!hasPending) {
      shouldAnnouncePendingModelSelection.value = false
      return
    }

    if (!shouldAnnouncePendingModelSelection.value || isLoadingConfigs.value) {
      return
    }

    shouldAnnouncePendingModelSelection.value = false
    notify('当前模型变更尚未应用，请先点击“应用模型”。')
  },
  {
    flush: 'post'
  }
)

watch(appliedProvider, (providerKey) => {
  writeStoredProvider(providerKey)

  if (!providerKey) {
    appliedVersion.value = ''
    return
  }

  const versions =
    aiConfigOptions.value.find((item) => item.aiId === providerKey)?.versions || []

  if (!versions.includes(appliedVersion.value)) {
    appliedVersion.value = ''
  }
})

watch(appliedVersion, (value) => {
  writeStoredModel(value)
})

watch(generationTemperature, (value) => {
  const normalized = normalizeNumericInput(value, DEFAULT_AI_TEMPERATURE, {
    min: AI_TEMPERATURE_MIN,
    max: effectiveTemperatureMax.value,
    precision: 1
  })

  if (normalized !== value) {
    generationTemperature.value = normalized
    return
  }

  writeStoredNumber(NOTE_AI_TEMPERATURE_KEY, normalized, {
    min: AI_TEMPERATURE_MIN,
    max: effectiveTemperatureMax.value,
    precision: 1,
    defaultValue: DEFAULT_AI_TEMPERATURE
  })
})

watch(effectiveTemperatureMax, () => {
  const normalized = normalizeNumericInput(generationTemperature.value, DEFAULT_AI_TEMPERATURE, {
    min: AI_TEMPERATURE_MIN,
    max: effectiveTemperatureMax.value,
    precision: 1
  })

  if (normalized !== generationTemperature.value) {
    generationTemperature.value = normalized
  }
})

watch(generationTopP, (value) => {
  const normalized = normalizeNumericInput(value, DEFAULT_AI_TOP_P, {
    min: AI_TOP_P_MIN,
    max: AI_TOP_P_MAX,
    precision: 2
  })

  if (normalized !== value) {
    generationTopP.value = normalized
    return
  }

  writeStoredNumber(NOTE_AI_TOP_P_KEY, normalized, {
    min: AI_TOP_P_MIN,
    max: AI_TOP_P_MAX,
    precision: 2,
    defaultValue: DEFAULT_AI_TOP_P
  })
})

function toggleAnswer() {
  if (!currentQuestion.value) {
    return
  }

  answerVisible.value = !answerVisible.value
}

function toggleParameterPanel() {
  parameterPanelVisible.value = !parameterPanelVisible.value
}

function normalizeGenerationParameterInputs() {
  generationTemperature.value = resolvedGenerationConfig.value.temperature
  generationTopP.value = resolvedGenerationConfig.value.topP
}

function resetGenerationParameters() {
  generationTemperature.value = DEFAULT_AI_TEMPERATURE
  generationTopP.value = DEFAULT_AI_TOP_P
}

function handleChatInputKeydown(event) {
  if (!event || event.key !== 'Enter') {
    return
  }

  if (event.shiftKey || event.isComposing || event.keyCode === 229) {
    return
  }

  event.preventDefault()
  sendChatMessage()
}

async function sendChatMessage() {
  const userMessage = String(chatDraft.value || '').trim()

  if (isChatLoading.value) {
    return
  }

  if (!userMessage) {
    notify('请输入想问 AI 的内容。')
    return
  }

  if (!ensureQuestionRequestReady()) {
    return
  }

  latestChatRequestId += 1
  const requestId = latestChatRequestId
  const nextMessages = [...chatMessages.value, createChatMessage('user', userMessage)]

  chatMessages.value = nextMessages
  chatDraft.value = ''
  chatError.value = ''
  isChatLoading.value = true
  void focusChatInput()
  await scrollChatToBottom()

  try {
    const data = await http.post(
      '/api/ai/notes-chat',
      {
        currentPath: props.activePath,
        aiId: appliedProvider.value,
        model: resolvedAppliedModel.value,
        generationConfig: resolvedGenerationConfig.value,
        messages: nextMessages.slice(-CHAT_HISTORY_LIMIT).map((item) => ({
          role: item.role,
          content: item.content
        })),
        currentQuestion: buildChatQuestionContext(currentQuestion.value)
      },
      {
        timeout: AI_REQUEST_TIMEOUT
      }
    )

    if (requestId !== latestChatRequestId) {
      return
    }

    const normalizedReply = normalizeChatReplyPayload(data)
    chatMessages.value = [...nextMessages, createChatMessage('assistant', normalizedReply.reply)]
    await scrollChatToBottom()
  } catch (error) {
    if (requestId !== latestChatRequestId) {
      return
    }

    chatDraft.value = userMessage
    chatError.value = error instanceof Error ? error.message : 'AI 对话失败。'
  } finally {
    if (requestId === latestChatRequestId) {
      isChatLoading.value = false
      void focusChatInput()
    }
  }
}

async function requestQuestion(options = {}) {
  if (!ensureQuestionRequestReady()) {
    return
  }

  latestRequestId += 1
  const requestId = latestRequestId
  isLoading.value = true
  loadError.value = ''

  if (options.resetHistory) {
    questionHistory.value = []
  }

  try {
    const data = await http.post(
      '/api/ai/notes-quiz',
      {
        currentPath: props.activePath,
        aiId: appliedProvider.value,
        model: resolvedAppliedModel.value,
        generationConfig: resolvedGenerationConfig.value,
        recentQuestions: options.resetHistory
          ? []
          : questionHistory.value
              .map((item) => ({
                prompt: item.prompt,
                focus: item.focus,
                answerTitle: item.answerTitle
              }))
              .slice(0, QUESTION_HISTORY_LIMIT)
      },
      {
        timeout: AI_REQUEST_TIMEOUT
      }
    )

    if (requestId !== latestRequestId) {
      return
    }

    const normalizedQuestion = normalizeQuestionPayload(data)

    if (!normalizedQuestion.prompt) {
      throw new Error('AI 没有返回可展示的题目。')
    }

    currentQuestion.value = normalizedQuestion
    answerVisible.value = false
    questionHistory.value = [
      {
        id: `${requestId}`,
        prompt: normalizedQuestion.prompt,
        focus: normalizedQuestion.focus,
        answerTitle: normalizedQuestion.answerTitle
      },
      ...questionHistory.value
    ].slice(0, QUESTION_HISTORY_LIMIT)
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    currentQuestion.value = null
    loadError.value = error instanceof Error ? error.message : 'AI 出题失败。'
  } finally {
    if (requestId === latestRequestId) {
      isLoading.value = false
    }
  }
}

function reloadContext() {
  requestQuestion({ resetHistory: true })
}

function applyModelSelection() {
  if (!ensureModelSelectionCanApply()) {
    return
  }

  if (!hasPendingModelSelection.value) {
    notify('当前模型已应用。', 'success')
    return
  }

  appliedProvider.value = selectedProvider.value
  appliedVersion.value = resolvedSelectedModel.value
  shouldAnnouncePendingModelSelection.value = false
  resetChatConversation()
  notify('模型已应用。', 'success')
}

function requestNextQuestion() {
  requestQuestion()
}

function clearChatConversation() {
  resetChatConversation()
}

function openAiSettings() {
  router.push('/ai-settings')
}

function openQuizHistory() {
  router.push({
    name: 'ai-quiz-history'
  })
}

onMounted(() => {
  loadAiConfigs()
})
</script>

<style scoped>
.note-ai-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.note-ai-view__toolbar,
.note-ai-view__panel {
  border-radius: 24px;
  border: 1px solid rgba(18, 52, 78, 0.08);
  background:
    radial-gradient(circle at top right, rgba(49, 191, 165, 0.16), transparent 38%),
    linear-gradient(180deg, rgba(251, 255, 254, 0.98), rgba(240, 250, 247, 0.94));
  box-shadow: 0 20px 46px rgba(18, 52, 78, 0.08);
}

.note-ai-view__toolbar {
  display: grid;
  gap: 14px;
  padding: 14px 18px;
  position: relative;
  overflow: visible;
}

.note-ai-view__toolbar-head {
  display: flex;
  align-items: center;
}

.note-ai-view__toolbar-main {
  display: flex;
  align-items: end;
  gap: 14px;
}

.note-ai-view__toolbar-feedback {
  margin: 0;
  color: #5d768d;
  line-height: 1.6;
}

.note-ai-view__toolbar-tag {
  margin: 0;
  flex-shrink: 0;
}

.note-ai-view__model-picker {
  display: grid;
  grid-template-columns: minmax(180px, 0.42fr) minmax(240px, 0.58fr);
  gap: 12px;
  flex: 1 1 auto;
  min-width: min(100%, 520px);
}

.note-ai-view__model-field {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: #4e6f88;
  font-size: 0.85rem;
  font-weight: 700;
}

.note-ai-view__model-label {
  white-space: nowrap;
  line-height: 1.2;
}

.note-ai-view__model-input {
  appearance: none;
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(18, 52, 78, 0.1);
  border-radius: 14px;
  min-height: 48px;
  padding: 12px 44px 12px 14px;
  background: rgba(244, 251, 255, 0.94);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' fill='none' stroke='%2355798f' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-position: calc(100% - 16px) center;
  background-repeat: no-repeat;
  background-size: 12px 8px;
  color: #12344e;
  font: inherit;
  line-height: 1.4;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.note-ai-view__model-input:focus {
  border-color: rgba(45, 144, 255, 0.5);
  box-shadow: 0 0 0 4px rgba(45, 144, 255, 0.12);
}

.note-ai-view__model-input:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.note-ai-view__toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex: 0 0 auto;
}

.note-ai-view__parameter-toggle.is-active {
  border-color: rgba(28, 175, 145, 0.24);
  background: rgba(28, 175, 145, 0.08);
  color: #176f63;
}

.note-ai-view__model-button {
  min-height: 48px;
  padding: 12px 18px;
  flex-shrink: 0;
}

.note-ai-view__parameter-panel {
  display: grid;
  gap: 10px;
  width: min(320px, calc(100vw - 48px));
  padding: 14px;
  border-radius: 22px;
  border: 1px solid rgba(18, 52, 78, 0.08);
  background:
    radial-gradient(circle at top left, rgba(90, 214, 255, 0.18), transparent 34%),
    radial-gradient(circle at top right, rgba(28, 175, 145, 0.14), transparent 38%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(244, 251, 255, 0.88));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 20px 44px rgba(18, 52, 78, 0.12);
  position: absolute;
  top: calc(100% - 6px);
  right: 138px;
  z-index: 20;
  overflow: hidden;
}

.note-ai-view__parameter-head {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.note-ai-view__parameter-copy {
  display: none;
}

.note-ai-view__parameter-reset {
  flex-shrink: 0;
  min-height: 30px;
  padding: 4px 10px;
  font-size: 0.76rem;
}

.note-ai-view__parameter-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.note-ai-view__parameter-field {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(18, 52, 78, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(244, 250, 255, 0.76));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 12px 26px rgba(18, 52, 78, 0.08);
  --parameter-accent: #1caf91;
  --parameter-accent-soft: rgba(28, 175, 145, 0.22);
  --parameter-accent-glow: rgba(28, 175, 145, 0.32);
  --parameter-track: rgba(18, 52, 78, 0.08);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.note-ai-view__parameter-field:hover {
  transform: translateY(-2px);
  border-color: rgba(18, 52, 78, 0.12);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    0 16px 30px rgba(18, 52, 78, 0.12);
}

.note-ai-view__parameter-field--temperature {
  --parameter-accent: #ff7b54;
  --parameter-accent-soft: rgba(255, 123, 84, 0.24);
  --parameter-accent-glow: rgba(255, 123, 84, 0.32);
}

.note-ai-view__parameter-field--top-p {
  --parameter-accent: #25b99a;
  --parameter-accent-soft: rgba(37, 185, 154, 0.24);
  --parameter-accent-glow: rgba(37, 185, 154, 0.32);
}

.note-ai-view__parameter-label {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.note-ai-view__parameter-label-main {
  color: #12344e;
  font-size: 0.84rem;
  font-weight: 700;
}

.note-ai-view__parameter-label-main small {
  display: none;
}

.note-ai-view__parameter-value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  padding: 6px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--parameter-accent-soft), rgba(255, 255, 255, 0.96));
  color: var(--parameter-accent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 8px 18px rgba(18, 52, 78, 0.08);
  font-size: 0.8rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.note-ai-view__parameter-slider-shell {
  position: relative;
  display: block;
  padding-top: 3px;
}

.note-ai-view__parameter-slider-shell::before,
.note-ai-view__parameter-slider-shell::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 3px;
  height: 18px;
  border-radius: 999px;
  pointer-events: none;
}

.note-ai-view__parameter-slider-shell::before {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(217, 229, 238, 0.52)),
    var(--parameter-track);
  box-shadow:
    inset 0 2px 6px rgba(18, 52, 78, 0.1),
    inset 0 -1px 0 rgba(255, 255, 255, 0.5);
}

.note-ai-view__parameter-slider-shell::after {
  right: auto;
  width: min(100%, max(0%, var(--slider-progress, 0%)));
  background:
    linear-gradient(90deg, var(--parameter-accent), color-mix(in srgb, var(--parameter-accent) 58%, white));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.26),
    0 0 18px var(--parameter-accent-glow);
  animation: note-ai-parameter-glow 2.6s ease-in-out infinite;
}

.note-ai-view__parameter-range {
  width: 100%;
  position: relative;
  z-index: 1;
  margin: 0;
  height: 18px;
  appearance: none;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.note-ai-view__parameter-range:focus {
  outline: none;
}

.note-ai-view__parameter-range::-webkit-slider-runnable-track {
  height: 18px;
  background: transparent;
}

.note-ai-view__parameter-range::-moz-range-track {
  height: 18px;
  border: 0;
  background: transparent;
}

.note-ai-view__parameter-range::-webkit-slider-thumb {
  width: 18px;
  height: 18px;
  margin-top: 0;
  appearance: none;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.96);
  background: var(--parameter-accent);
  box-shadow:
    0 0 0 5px color-mix(in srgb, var(--parameter-accent) 18%, transparent),
    0 10px 20px color-mix(in srgb, var(--parameter-accent) 26%, rgba(18, 52, 78, 0.12));
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.note-ai-view__parameter-range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border: 3px solid rgba(255, 255, 255, 0.96);
  border-radius: 50%;
  background: var(--parameter-accent);
  box-shadow:
    0 0 0 5px color-mix(in srgb, var(--parameter-accent) 18%, transparent),
    0 10px 20px color-mix(in srgb, var(--parameter-accent) 26%, rgba(18, 52, 78, 0.12));
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.note-ai-view__parameter-range:hover::-webkit-slider-thumb,
.note-ai-view__parameter-range:focus-visible::-webkit-slider-thumb {
  transform: scale(1.08);
  box-shadow:
    0 0 0 7px color-mix(in srgb, var(--parameter-accent) 20%, transparent),
    0 12px 24px color-mix(in srgb, var(--parameter-accent) 28%, rgba(18, 52, 78, 0.12));
}

.note-ai-view__parameter-range:hover::-moz-range-thumb,
.note-ai-view__parameter-range:focus-visible::-moz-range-thumb {
  transform: scale(1.08);
  box-shadow:
    0 0 0 7px color-mix(in srgb, var(--parameter-accent) 20%, transparent),
    0 12px 24px color-mix(in srgb, var(--parameter-accent) 28%, rgba(18, 52, 78, 0.12));
}

.note-ai-view__parameter-scale {
  display: none;
}

.note-ai-view__parameter-help {
  display: none;
}

@keyframes note-ai-parameter-glow {
  0%,
  100% {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.26),
      0 0 16px var(--parameter-accent-glow);
  }

  50% {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.34),
      0 0 24px color-mix(in srgb, var(--parameter-accent) 42%, white);
  }
}

.note-ai-view__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
  gap: 16px;
  min-height: 0;
  flex: 1;
}

.note-ai-view__panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  padding: 18px;
}

.note-ai-view__panel--chat {
  height: 100%;
  min-height: 100%;
}

.note-ai-view__panel-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
}

.note-ai-view__panel-head h4 {
  margin: 4px 0 0;
  color: #12344e;
}

.note-ai-view__chat-head > h4 {
  display: none;
}

.note-ai-view__chat-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.note-ai-view__chat-title {
  color: #12344e;
  font-size: 1.02rem;
  font-weight: 700;
  line-height: 1.4;
}

.note-ai-view__chat-model-badge {
  display: inline-flex;
  align-items: center;
  max-width: min(100%, 320px);
  min-width: 0;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(28, 175, 145, 0.16);
  background: rgba(28, 175, 145, 0.1);
  color: #176f63;
  font-size: 0.74rem;
  font-weight: 700;
  line-height: 1.2;
}

.note-ai-view__panel-title {
  min-width: 0;
}

.note-ai-view__panel-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  justify-content: space-between;
  flex-wrap: wrap;
}

.note-ai-view__panel-title-main {
  display: flex;
  align-items: center;
  min-width: 0;
}

.note-ai-view__history-button {
  flex: 0 0 auto;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid rgba(28, 175, 145, 0.2);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(233, 249, 245, 0.98), rgba(214, 243, 236, 0.94));
  color: #176f63;
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 10px 20px rgba(23, 111, 99, 0.08);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease;
}

.note-ai-view__history-button:hover {
  transform: translateY(-1px);
  border-color: rgba(28, 175, 145, 0.32);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    0 14px 24px rgba(23, 111, 99, 0.12);
}

.note-ai-view__history-button:active {
  transform: translateY(0);
}

.note-ai-view__history-button:focus-visible {
  outline: 2px solid rgba(28, 175, 145, 0.26);
  outline-offset: 2px;
}

.note-ai-view__context-card {
  display: inline-flex;
  align-items: center;
  max-width: min(100%, 420px);
  min-width: 0;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(18, 52, 78, 0.09);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.56);
}

.note-ai-view__context-card code {
  display: block;
  margin: 0;
  color: #527087;
  font-size: 0.82rem;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-ai-view__status {
  margin: 0;
  color: #5d768d;
  line-height: 1.68;
}

.note-ai-view__question-card,
.note-ai-view__answer-card {
  border-radius: 18px;
  border: 1px solid rgba(18, 52, 78, 0.08);
  background: rgba(255, 255, 255, 0.82);
}

.note-ai-view__question-stage {
  display: flex;
  justify-content: center;
  min-height: 184px;
}

.note-ai-view__question-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 184px;
  height: 184px;
  max-width: 620px;
  padding: 18px;
  text-align: center;
  overflow: auto;
}

.note-ai-view__question-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 184px;
  height: 184px;
  max-width: 620px;
  padding: 16px 18px;
  overflow: auto;
}

.note-ai-view__question-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.note-ai-view__question-head h4 {
  margin: 0;
  color: #12344e;
  line-height: 1.45;
  font-size: 1.18rem;
  flex: 1;
}

.note-ai-view__answer-card {
  display: grid;
  gap: 12px;
  margin-top: 6px;
  padding: 16px 18px;
  transform-origin: top center;
}

.note-ai-view__answer-body {
  max-height: 220px;
  overflow-y: auto;
  padding-right: 6px;
}

.note-ai-view__answer-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.note-ai-view__answer-head strong {
  color: #12344e;
}

.note-ai-view__answer-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.note-ai-view__answer-list {
  padding-left: 18px;
}

.note-ai-view__answer-list li,
.note-ai-view__answer-copy {
  color: #35556f;
  line-height: 1.72;
}

.note-ai-view__answer-copy {
  margin: 0;
}

.note-ai-view__chat-clear {
  min-height: 38px;
  padding: 8px 14px;
}

.note-ai-view__chat-shell {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  height: 100%;
}

.note-ai-view__chat-list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  min-height: 280px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
}

.note-ai-view__chat-empty {
  display: grid;
  gap: 8px;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px dashed rgba(28, 175, 145, 0.22);
  background: linear-gradient(180deg, rgba(247, 253, 251, 0.96), rgba(255, 255, 255, 0.92));
}

.note-ai-view__chat-empty strong {
  color: #12344e;
  font-size: 1rem;
  line-height: 1.4;
}

.note-ai-view__chat-empty p {
  margin: 0;
  color: #527087;
  line-height: 1.7;
}

.note-ai-view__chat-empty-hint {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(28, 175, 145, 0.1);
  color: #176f63;
  font-size: 0.8rem;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-ai-view__chat-item {
  display: grid;
  gap: 6px;
  max-width: min(100%, 92%);
}

.note-ai-view__chat-item--user {
  align-self: flex-end;
  justify-items: end;
}

.note-ai-view__chat-item--assistant {
  align-self: flex-start;
}

.note-ai-view__chat-role {
  color: #5d768d;
  font-size: 0.76rem;
  font-weight: 700;
}

.note-ai-view__chat-bubble {
  border-radius: 18px;
  padding: 12px 14px;
  line-height: 1.7;
  word-break: break-word;
  border: 1px solid rgba(18, 52, 78, 0.08);
  background: rgba(255, 255, 255, 0.9);
}

.note-ai-view__chat-item--user .note-ai-view__chat-bubble {
  background: linear-gradient(180deg, rgba(28, 175, 145, 0.16), rgba(28, 175, 145, 0.08));
  border-color: rgba(28, 175, 145, 0.16);
}

.note-ai-view__chat-bubble p {
  margin: 0;
  color: #23445c;
  white-space: pre-wrap;
}

.note-ai-view__chat-loading,
.note-ai-view__chat-error {
  margin: 0;
}

.note-ai-view__chat-loading {
  color: #5d768d;
}

.note-ai-view__chat-form {
  display: grid;
  gap: 10px;
  margin-top: auto;
  padding-top: 6px;
}

.note-ai-view__chat-input-wrap {
  position: relative;
}

.note-ai-view__chat-input {
  width: 100%;
  min-height: 104px;
  border: 1px solid rgba(18, 52, 78, 0.1);
  border-radius: 18px;
  padding: 14px 110px 16px 14px;
  background: rgba(255, 255, 255, 0.88);
  color: #12344e;
  font: inherit;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.note-ai-view__chat-input:focus {
  border-color: rgba(45, 144, 255, 0.5);
  box-shadow: 0 0 0 4px rgba(45, 144, 255, 0.12);
}

.note-ai-view__chat-input:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.note-ai-view__chat-send {
  position: absolute;
  right: 12px;
  bottom: 12px;
  min-width: 84px;
  min-height: 38px;
  padding: 8px 14px;
  border-radius: 999px;
  z-index: 1;
}

.note-ai-view__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.note-ai-answer-enter-active,
.note-ai-answer-leave-active {
  transition: opacity 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.note-ai-answer-enter-from,
.note-ai-answer-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

.note-ai-toolbar-panel-enter-active,
.note-ai-toolbar-panel-leave-active {
  transition: opacity 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.note-ai-toolbar-panel-enter-from,
.note-ai-toolbar-panel-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 1180px) {
  .note-ai-view__grid {
    grid-template-columns: 1fr;
  }

  .note-ai-view__parameter-panel {
    right: 0;
  }
}

@media (max-width: 720px) {
  .note-ai-view__toolbar-main {
    flex-direction: column;
    align-items: stretch;
  }

  .note-ai-view__model-picker {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .note-ai-view__model-field {
    grid-template-columns: 1fr;
    align-items: stretch;
    gap: 8px;
  }

  .note-ai-view__toolbar-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .note-ai-view__parameter-panel {
    width: calc(100% - 36px);
    right: 18px;
    top: calc(100% - 2px);
  }

  .note-ai-view__parameter-head {
    display: grid;
  }

  .note-ai-view__question-stage {
    min-height: 164px;
  }

  .note-ai-view__question-card,
  .note-ai-view__question-placeholder {
    min-height: 164px;
    height: 164px;
  }

  .note-ai-view__question-head {
    flex-direction: column;
  }

  .note-ai-view__panel-title-row {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .note-ai-view__context-card {
    max-width: 100%;
    border-radius: 16px;
  }

  .note-ai-view__context-card code {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .note-ai-view__answer-body {
    max-height: 188px;
  }

  .note-ai-view__chat-list {
    min-height: 240px;
    max-height: 320px;
  }

  .note-ai-view__chat-send {
    width: auto;
  }

  .note-ai-view__model-button,
  .note-ai-view__actions > button {
    width: 100%;
  }

  .note-ai-view__actions {
    justify-content: stretch;
  }
}
</style>
