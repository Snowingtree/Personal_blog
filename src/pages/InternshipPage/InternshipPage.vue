<template>
  <main v-if="privateAppAvailable" class="internship-page">
    <header class="internship-topbar">
      <RouterLink class="internship-back" to="/tools" aria-label="返回工具选择">←</RouterLink>
      <button type="button" class="internship-logout" @click="handleLogout">退出登录</button>
    </header>

    <section class="internship-shell">
      <div class="internship-editor">
        <div class="internship-editor__head">
          <p>方片 Q</p>
          <h1>实习</h1>
        </div>

        <form class="internship-form" @submit.prevent="handleSave">
          <label class="internship-field">
            <span>标题</span>
            <input v-model.trim="draftTitle" type="text" placeholder="例如：第 1 周周报" />
          </label>

          <label class="internship-field">
            <span>记录</span>
            <textarea v-model.trim="draftContent" rows="9" placeholder="记录实习任务、问题、复盘或待办"></textarea>
          </label>

          <div class="internship-actions">
            <button v-if="editingId" type="button" class="internship-secondary" @click="resetDraft">取消</button>
            <button type="submit" class="internship-primary">{{ editingId ? '更新' : '保存' }}</button>
          </div>
        </form>
      </div>

      <div class="internship-records" aria-label="实习记录">
        <article v-for="record in sortedRecords" :key="record.id" class="internship-record">
          <div>
            <h2>{{ record.title }}</h2>
            <time :datetime="record.updatedAt">{{ formatDate(record.updatedAt) }}</time>
          </div>
          <p>{{ record.content }}</p>
          <div class="internship-record__actions">
            <button type="button" @click="startEditing(record)">编辑</button>
            <button type="button" @click="removeRecord(record.id)">删除</button>
          </div>
        </article>

        <p v-if="!records.length" class="internship-empty">暂无实习记录</p>
      </div>
    </section>
  </main>

  <main v-else class="auth-layout">
    <PrivateAccessLoadingOverlay :state="privateAppChecking ? 'checking' : 'denied'" />
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { createMessage } from 'snowingress-my-components'
import { RouterLink, useRouter } from 'vue-router'
import PrivateAccessLoadingOverlay from '../../components/PrivateAccessLoadingOverlay/PrivateAccessLoadingOverlay.vue'
import {
  AUTH_KEY,
  AUTH_TOKEN_KEY,
  INTERNSHIP_RECORDS_KEY,
  NOTE_AUTH_KEY,
  NOTE_USERNAME_KEY,
  USERNAME_KEY
} from '../../constants/storage'
import { usePrivateAppAccess } from '../../hooks/usePrivateAppAccess'

const router = useRouter()
const { privateAppAvailable, privateAppChecking } = usePrivateAppAccess()

const draftTitle = ref('')
const draftContent = ref('')
const editingId = ref('')
const records = ref(readStoredRecords())

const sortedRecords = computed(() => (
  [...records.value].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
))

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
        if (
          !item
          || typeof item.id !== 'string'
          || typeof item.title !== 'string'
          || typeof item.content !== 'string'
        ) {
          return validRecords
        }

        const updatedAt = normalizeDateValue(item.updatedAt)
        const createdAt = normalizeDateValue(item.createdAt) || updatedAt

        if (!updatedAt) {
          return validRecords
        }

        validRecords.push({
          ...item,
          createdAt,
          updatedAt
        })
        return validRecords
      }, [])
    }
  } catch {
    localStorage.removeItem(INTERNSHIP_RECORDS_KEY)
  }

  return []
}

function persistRecords(nextRecords) {
  records.value = nextRecords
  localStorage.setItem(INTERNSHIP_RECORDS_KEY, JSON.stringify(nextRecords))
}

function resetDraft() {
  draftTitle.value = ''
  draftContent.value = ''
  editingId.value = ''
}

function handleSave() {
  if (!draftTitle.value || !draftContent.value) {
    notify('标题和记录都需要填写', 'danger')
    return
  }

  const now = new Date().toISOString()

  if (editingId.value) {
    persistRecords(records.value.map((record) => (
      record.id === editingId.value
        ? {
          ...record,
          title: draftTitle.value,
          content: draftContent.value,
          updatedAt: now
        }
        : record
    )))
    notify('更新成功')
    resetDraft()
    return
  }

  persistRecords([
    {
      id: `${Date.now()}`,
      title: draftTitle.value,
      content: draftContent.value,
      createdAt: now,
      updatedAt: now
    },
    ...records.value
  ])
  notify('保存成功')
  resetDraft()
}

function startEditing(record) {
  editingId.value = record.id
  draftTitle.value = record.title
  draftContent.value = record.content
}

function removeRecord(recordId) {
  persistRecords(records.value.filter((record) => record.id !== recordId))

  if (editingId.value === recordId) {
    resetDraft()
  }

  notify('已删除')
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

function handleLogout() {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(NOTE_AUTH_KEY)
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
  localStorage.removeItem(NOTE_USERNAME_KEY)
  router.push('/notes-login')
}
</script>

<style scoped>
.internship-page {
  min-height: 100vh;
  padding: 24px max(16px, calc((100vw - 1180px) / 2)) 48px;
  color: #1f2933;
  background: #ffffff;
}

.internship-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.internship-back,
.internship-logout,
.internship-primary,
.internship-secondary,
.internship-record__actions button {
  border: 1px solid rgba(31, 41, 51, 0.14);
  border-radius: 999px;
  color: #1f2933;
  background: #ffffff;
  cursor: pointer;
  text-decoration: none;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.internship-back {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  font-size: 1.25rem;
  line-height: 1;
}

.internship-logout,
.internship-primary,
.internship-secondary,
.internship-record__actions button {
  padding: 10px 16px;
  font-weight: 700;
}

.internship-back:hover,
.internship-logout:hover,
.internship-primary:hover,
.internship-secondary:hover,
.internship-record__actions button:hover {
  transform: translateY(-1px);
  border-color: rgba(31, 41, 51, 0.26);
  box-shadow: 0 12px 28px rgba(15, 23, 32, 0.1);
}

.internship-shell {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}

.internship-editor,
.internship-record {
  border: 1px solid rgba(31, 41, 51, 0.12);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 20px 46px rgba(15, 23, 32, 0.1);
}

.internship-editor {
  position: sticky;
  top: 24px;
  padding: 24px;
}

.internship-editor__head {
  margin-bottom: 22px;
}

.internship-editor__head p,
.internship-record time {
  margin: 0;
  color: #b4232f;
  font-size: 0.86rem;
  font-weight: 800;
}

.internship-editor__head h1 {
  margin: 6px 0 0;
  font-size: clamp(2.2rem, 6vw, 3.4rem);
  line-height: 1;
}

.internship-form,
.internship-field,
.internship-records {
  display: grid;
  gap: 16px;
}

.internship-field span {
  color: #4b5563;
  font-size: 0.92rem;
  font-weight: 700;
}

.internship-field input,
.internship-field textarea {
  width: 100%;
  border: 1px solid rgba(31, 41, 51, 0.14);
  border-radius: 14px;
  padding: 12px 14px;
  color: #1f2933;
  background: #f9fafb;
  outline: none;
  resize: vertical;
}

.internship-field input:focus,
.internship-field textarea:focus {
  border-color: rgba(180, 35, 47, 0.46);
  box-shadow: 0 0 0 4px rgba(180, 35, 47, 0.08);
}

.internship-actions,
.internship-record__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.internship-primary {
  border-color: #b4232f;
  color: #ffffff;
  background: #b4232f;
}

.internship-record {
  display: grid;
  gap: 14px;
  padding: 20px;
}

.internship-record h2 {
  margin: 0 0 4px;
  font-size: 1.18rem;
}

.internship-record p {
  margin: 0;
  color: #374151;
  white-space: pre-wrap;
}

.internship-empty {
  margin: 0;
  border: 1px dashed rgba(31, 41, 51, 0.18);
  border-radius: 18px;
  padding: 44px 20px;
  color: #6b7280;
  text-align: center;
}

@media (max-width: 860px) {
  .internship-shell {
    grid-template-columns: 1fr;
  }

  .internship-editor {
    position: static;
  }
}
</style>
