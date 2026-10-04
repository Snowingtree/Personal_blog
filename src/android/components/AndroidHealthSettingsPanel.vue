<template>
  <div class="health-settings-panel">
    <section class="health-settings-panel__card">
      <header class="health-settings-panel__heading">
        <div>
          <p>HEALTH</p>
          <h3>健康设置</h3>
        </div>
        <HeartPulse :size="20" />
      </header>

      <div class="health-settings-panel__row">
        <div>
          <strong>健康记录</strong>
          <span>饮水、饮食、运动和体重使用独立的健康数据。</span>
        </div>
        <small>独立</small>
      </div>

      <div class="health-settings-panel__row">
        <div>
          <strong>饮食图片</strong>
          <span>图片压缩后保存到安卓应用的私有存储。</span>
        </div>
        <small>已启用</small>
      </div>

      <div class="health-settings-panel__row health-settings-panel__row--action">
        <div>
          <strong>服务器备份</strong>
          <span :class="{ 'is-error': failed }">{{ backupLabel }}</span>
        </div>
        <button type="button" class="health-settings-panel__action" :disabled="uploading" @click="backupHealthData">
          {{ uploading ? '上传中' : '上传备份' }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { HeartPulse } from 'lucide-vue-next'
import { readLastHealthBackupAt, uploadHealthBackup } from '../healthBackup'
import { useHealthRecords } from '../useHealthRecords'

const { records } = useHealthRecords()
const uploading = ref(false)
const feedback = ref('')
const failed = ref(false)
const lastBackupAt = ref(readLastHealthBackupAt())
const backupLabel = computed(() => {
  if (uploading.value) return '正在上传健康记录…'
  if (feedback.value) return feedback.value
  if (lastBackupAt.value) return `上次备份：${lastBackupAt.value.replace('T', ' ').slice(0, 16)}`
  return '服务器只保存一份健康数据副本。'
})

async function backupHealthData() {
  if (uploading.value) return
  uploading.value = true
  feedback.value = ''
  failed.value = false
  try {
    const result = await uploadHealthBackup(records.value)
    lastBackupAt.value = result.uploadedAt
    feedback.value = `备份完成：${result.recordCount || 0} 条记录`
  } catch (error) {
    feedback.value = error?.message || '健康数据备份失败，请稍后重试。'
    failed.value = true
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.health-settings-panel { display: grid; gap: 12px; }
.health-settings-panel__card { padding: 17px; border: 1px solid var(--android-line); border-radius: 19px; background: var(--android-surface); box-shadow: var(--android-shadow); }
.health-settings-panel__heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 13px; color: var(--android-accent); }
.health-settings-panel__heading p { margin: 0 0 4px; color: var(--android-text-faint); font-size: .56rem; font-weight: 800; letter-spacing: .12em; }
.health-settings-panel__heading h3 { margin: 0; color: var(--android-text-strong); font-size: 1rem; }
.health-settings-panel__row { min-height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 0; border-top: 1px solid var(--android-line); }
.health-settings-panel__row > div { min-width: 0; display: grid; gap: 5px; }
.health-settings-panel__row strong { color: var(--android-text-strong); font-size: .82rem; }
.health-settings-panel__row span { color: var(--android-muted); font-size: .7rem; line-height: 1.6; }
.health-settings-panel__row span.is-error { color: #b34736; }
.health-settings-panel__row small { flex: 0 0 auto; color: var(--android-accent); font-size: .68rem; font-weight: 800; }
.health-settings-panel__row--action { align-items: center; }
.health-settings-panel__action { flex: 0 0 auto; min-height: 38px; padding: 0 12px; border: 0; border-radius: 10px; color: var(--android-accent-contrast); background: var(--android-accent); font: inherit; font-size: .7rem; font-weight: 750; cursor: pointer; }
.health-settings-panel__action:disabled { opacity: .55; cursor: wait; }
</style>
