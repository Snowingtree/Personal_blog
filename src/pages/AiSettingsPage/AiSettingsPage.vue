<template>
  <main v-if="privateAppAvailable" class="display-layout ai-settings-layout">
    <AppHeader
      :tag="headerTag"
      :title="headerTitle"
      :description="headerDescription"
      :show-user="false"
      logout-label="返回选择"
      @logout="handleBackToTools"
    />

    <div class="content-grid ai-settings-grid">
      <section class="panel-card ai-settings-card">
        <div class="panel-head">
          <div>
            <p class="section-tag">{{ formSectionTag }}</p>
            <h2>{{ formTitle }}</h2>
          </div>
        </div>

        <form class="ai-settings-form" @submit.prevent="handleSubmit">
          <label class="field ai-settings-form__field">
            <span>AI 名称</span>
            <input
              v-model.trim="form.name"
              type="text"
              maxlength="120"
              placeholder="例如：智谱"
            />
          </label>

          <label class="field ai-settings-form__field">
            <span>AI 版本</span>
            <input
              v-model.trim="form.aiVersions"
              type="text"
              maxlength="1000"
              placeholder="例如：glm-4.5-air, glm-4.6, glm-4.7"
            />
          </label>

          <label class="field ai-settings-form__field">
            <span>API_KEY</span>
            <input
              v-model.trim="form.apiKey"
              type="password"
              maxlength="4096"
              :placeholder="apiKeyPlaceholder"
            />
          </label>

          <label class="field ai-settings-form__field">
            <span>接口地址</span>
            <input
              v-model.trim="form.aiBaseUrl"
              type="url"
              maxlength="2048"
              required
              placeholder="例如：https://open.bigmodel.cn/api/paas/v4"
            />
          </label>

          <div class="ai-settings-form-actions">
            <button type="submit" class="primary-btn" :disabled="submitting">
              {{ submitButtonLabel }}
            </button>
            <button type="button" class="ghost-btn" :disabled="submitting" @click="resetForm">
              {{ resetButtonLabel }}
            </button>
            <button
              type="button"
              class="secondary-btn ai-settings-form-actions__back"
              :disabled="submitting"
              @click="handleBackToDisplay"
            >
              {{ backButtonLabel }}
            </button>
          </div>
        </form>
      </section>

      <section class="panel-card ai-settings-card">
        <div class="panel-head">
          <div>
            <p class="section-tag">{{ listSectionTag }}</p>
            <h2>{{ listTitle }}</h2>
          </div>

          <button type="button" class="ghost-btn" :disabled="loading" @click="loadConfigs">
            {{ refreshButtonLabel }}
          </button>
        </div>

        <p v-if="loading" class="ai-settings-empty">{{ loadingLabel }}</p>
        <p v-else-if="configs.length === 0" class="ai-settings-empty">{{ emptyLabel }}</p>

        <div v-else class="ai-settings-table-wrap">
          <table class="ai-settings-table">
            <thead>
              <tr>
                <th>AI 名称</th>
                <th>AI 版本</th>
                <th>AI ID</th>
                <th>接口地址</th>
                <th>API_KEY</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in configs" :key="item.configId">
                <td>{{ item.name }}</td>
                <td class="ai-settings-versions">{{ item.aiVersions || '-' }}</td>
                <td><code>{{ item.aiId }}</code></td>
                <td class="ai-settings-versions">{{ item.aiBaseUrl || '-' }}</td>
                <td class="ai-settings-api-key">{{ item.apiKeyPreview || '-' }}</td>
                <td>{{ formatDate(item.updatedAt) }}</td>
                <td>
                  <div class="ai-settings-row-actions">
                    <button type="button" class="secondary-btn" @click="startEditing(item)">
                      编辑
                    </button>
                    <button type="button" class="danger-btn" @click="handleDelete(item)">
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>

  <main v-else class="auth-layout">
    <PrivateAccessLoadingOverlay :state="privateAppChecking ? 'checking' : 'denied'" />
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { createMessage } from 'snowingress-my-components'
import { useRouter } from 'vue-router'
import AppHeader from '../../components/AppHeader/AppHeader.vue'
import PrivateAccessLoadingOverlay from '../../components/PrivateAccessLoadingOverlay/PrivateAccessLoadingOverlay.vue'
import { usePrivateAppAccess } from '../../hooks/usePrivateAppAccess'
import http from '../../utils/http'

const router = useRouter()
const { privateAppAvailable, privateAppChecking } = usePrivateAppAccess()
const loading = ref(false)
const submitting = ref(false)
const editingConfigId = ref(null)
const configs = ref([])
const form = reactive({
  name: '',
  aiVersions: '',
  aiBaseUrl: '',
  apiKey: ''
})

const headerTag = '后台管理'
const headerTitle = 'AI 设置'
const headerDescription = ''
const backButtonLabel = '返回工具'
const formSectionTag = 'AI Config'
const listSectionTag = 'Config List'
const listTitle = '已入库配置'
const refreshButtonLabel = '刷新列表'
const loadingLabel = '正在读取 AI 配置...'
const emptyLabel = '还没有 AI 配置，先在左侧新增一条。'
const resetButtonLabel = '清空表单'

const formTitle = computed(() => (editingConfigId.value ? '编辑 AI 配置' : '新增 AI 配置'))
const submitButtonLabel = computed(() => (editingConfigId.value ? '保存修改' : '新增配置'))
const apiKeyPlaceholder = computed(() =>
  editingConfigId.value ? '留空则保持当前 API_KEY 不变' : '请输入可用的 API_KEY'
)

function notify(message, type = 'success') {
  createMessage({
    message,
    type,
    duration: 1200,
    offset: 24
  })
}

function resetForm() {
  editingConfigId.value = null
  form.name = ''
  form.aiVersions = ''
  form.aiBaseUrl = ''
  form.apiKey = ''
}

function formatDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

async function loadConfigs() {
  loading.value = true

  try {
    const data = await http.get('/api/ai/configs')
    configs.value = Array.isArray(data.items) ? data.items : []
  } catch (error) {
    notify(error instanceof Error ? error.message : '读取 AI 配置失败。', 'danger')
  } finally {
    loading.value = false
  }
}

function startEditing(item) {
  editingConfigId.value = item.configId
  form.name = item.name
  form.aiVersions = item.aiVersions || ''
  form.aiBaseUrl = item.aiBaseUrl || ''
  form.apiKey = ''
}

async function handleSubmit() {
  submitting.value = true

  try {
    if (editingConfigId.value) {
      await http.put(`/api/ai/configs/${editingConfigId.value}`, {
        name: form.name,
        aiVersions: form.aiVersions,
        aiBaseUrl: form.aiBaseUrl,
        apiKey: form.apiKey
      })
      notify('AI 配置已更新')
    } else {
      await http.post('/api/ai/configs', {
        name: form.name,
        aiVersions: form.aiVersions,
        aiBaseUrl: form.aiBaseUrl,
        apiKey: form.apiKey
      })
      notify('AI 配置已新增')
    }

    resetForm()
    await loadConfigs()
  } catch (error) {
    notify(error instanceof Error ? error.message : '保存 AI 配置失败。', 'danger')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(item) {
  if (
    typeof window !== 'undefined' &&
    !window.confirm(`确认删除 AI 配置“${item.name}”吗？`)
  ) {
    return
  }

  try {
    await http.delete(`/api/ai/configs/${item.configId}`)

    if (editingConfigId.value === item.configId) {
      resetForm()
    }

    notify('AI 配置已删除')
    await loadConfigs()
  } catch (error) {
    notify(error instanceof Error ? error.message : '删除 AI 配置失败。', 'danger')
  }
}

function handleBackToDisplay() {
  router.push('/notes')
}

function handleBackToTools() {
  router.push('/tools')
}

onMounted(async () => {
  if (!privateAppAvailable.value) {
    return
  }

  await loadConfigs()
})
</script>
