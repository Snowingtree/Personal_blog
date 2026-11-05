<template>
  <section class="android-page android-home android-life-page">
    <section class="android-profile-hero">
      <div class="android-profile-hero__avatar-wrap">
        <img :src="profileAvatar" alt="Liu An 的头像" class="android-profile-hero__avatar" />
        <span class="android-profile-hero__online" aria-label="持续更新中" />
      </div>

      <div class="android-profile-hero__copy">
        <p class="android-profile-hero__eyebrow">生活主页</p>
        <h1>Liu An</h1>

        <ul class="android-profile-hero__tags" aria-label="个人方向">
          <li>前端开发</li>
          <li>AI 实验</li>
          <li>日常记录</li>
        </ul>
      </div>

      <button
        type="button"
        class="android-profile-mode-switch"
        aria-label="返回主页"
        @click="goHome"
      >
        <ToggleRight :size="17" />
        <span>主页</span>
      </button>
    </section>

    <section class="android-quanshang-card">
      <div class="android-quanshang-heading">
        <Ticket :size="18" />
        <div class="android-quanshang-heading__title">
          <small>QUANSHANG</small>
          <h2>新增券</h2>
        </div>
      </div>

      <div class="android-quanshang-form">
        <div class="android-quanshang-upload">
          <input
            ref="imageInput"
            class="android-quanshang-file"
            type="file"
            accept="image/*"
            @change="handleImagePick"
          />
          <button
            type="button"
            class="android-quanshang-upload__btn"
            :class="{ 'is-filled': !!draftImage }"
            @click="imageInput?.click()"
          >
            <ImageUp v-if="!draftImage" :size="20" />
            <img v-else :src="draftImage" alt="券图片预览" />
          </button>

          <label class="android-quanshang-field android-quanshang-upload__name">
            <span>名称</span>
            <input v-model="draftName" type="text" placeholder="例如 麦当劳代金券" autocomplete="off" />
          </label>
        </div>

        <div class="android-quanshang-fields">
          <label class="android-quanshang-field">
            <span>售价（元）</span>
            <input v-model.number="draftPrice" type="number" min="0" step="0.01" placeholder="例如 88" />
          </label>
          <label class="android-quanshang-field">
            <span>原价（元）</span>
            <input v-model.number="draftOriginalPrice" type="number" min="0" step="0.01" placeholder="例如 128" />
          </label>
        </div>

        <button
          type="button"
          class="android-quanshang-add"
          :disabled="!canSubmit || saving"
          @click="addItem"
        >
          {{ saving ? '保存中…' : '保存' }}
        </button>

        <p v-if="formError" class="android-quanshang-error" role="alert">{{ formError }}</p>
        <p v-if="saved" class="android-quanshang-saved">已保存，去「券商」页查看</p>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ImageUp, Ticket, ToggleRight } from 'lucide-vue-next'
import profileAvatar from '../../assets/images/headerPH.png'
import { setAndroidAppMode } from '../appMode'
import http from '../../utils/http'

const IMAGE_PREFIX = 'quanshang-image-'
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

const imageInput = ref(null)
const draftImage = ref('')
const draftName = ref('')
const draftPrice = ref(null)
const draftOriginalPrice = ref(null)
const formError = ref('')
const saved = ref(false)
const saving = ref(false)

const canSubmit = computed(() =>
  !!draftImage.value
  && draftName.value.trim() !== ''
  && Number(draftPrice.value) > 0
  && Number(draftOriginalPrice.value) > 0
)

function handleImagePick(event) {
  const file = event.target.files?.[0]
  event.target.value = ''

  if (!file) return

  if (!file.type.startsWith('image/')) {
    formError.value = '请选择图片文件。'
    return
  }

  if (file.size > MAX_IMAGE_BYTES) {
    formError.value = '图片不能超过 2MB。'
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    draftImage.value = typeof reader.result === 'string' ? reader.result : ''
    formError.value = ''
  }
  reader.readAsDataURL(file)
}

async function addItem() {
  if (!canSubmit.value || saving.value) {
    if (!canSubmit.value) {
      formError.value = '请上传券图片，并填写名称、售价和原价。'
    }
    return
  }

  saving.value = true
  formError.value = ''

  const itemId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  try {
    localStorage.setItem(IMAGE_PREFIX + itemId, draftImage.value)
  } catch {
    formError.value = '图片保存失败：本地存储已满。'
    saving.value = false
    return
  }

  try {
    await http.post('/api/quanshang/items', {
      id: itemId,
      name: draftName.value.trim(),
      price: Number(draftPrice.value),
      originalPrice: Number(draftOriginalPrice.value)
    })

    draftImage.value = ''
    draftName.value = ''
    draftPrice.value = null
    draftOriginalPrice.value = null
    saved.value = true
    window.setTimeout(() => {
      saved.value = false
    }, 2000)
  } catch (err) {
    localStorage.removeItem(IMAGE_PREFIX + itemId)
    formError.value = err instanceof Error ? err.message : '保存失败，请稍后重试'
  } finally {
    saving.value = false
  }
}

function goHome() {
  setAndroidAppMode('personal')
}
</script>

<style scoped>
.android-profile-mode-switch {
  position: absolute;
  top: 50%;
  right: 18px;
  transform: translateY(-50%);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid var(--android-line-strong);
  border-radius: 999px;
  color: var(--android-accent-contrast);
  background: var(--android-accent);
  font: inherit;
  font-size: 0.68rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 7px 16px var(--android-accent-shadow);
}

.android-quanshang-card {
  padding: 17px;
  border: 1px solid var(--android-line);
  border-radius: 19px;
  background: var(--android-surface);
  box-shadow: var(--android-shadow);
}

.android-quanshang-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 13px;
  color: var(--android-accent);
}

.android-quanshang-heading__title small {
  color: var(--android-text-faint);
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.android-quanshang-heading__title h2 {
  margin: 2px 0 0;
  color: var(--android-text-strong);
  font-size: 1rem;
}

.android-quanshang-form {
  display: grid;
  gap: 16px;
}

.android-quanshang-upload {
  display: flex;
  align-items: center;
  gap: 12px;
}

.android-quanshang-upload__name {
  flex: 1;
  min-width: 0;
}

.android-quanshang-file {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.android-quanshang-upload__btn {
  flex: 0 0 72px;
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px dashed var(--android-line-strong);
  border-radius: 14px;
  color: var(--android-text-faint);
  background: var(--android-surface-muted);
  cursor: pointer;
}

.android-quanshang-upload__btn.is-filled {
  border-style: solid;
}

.android-quanshang-upload__btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.android-quanshang-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.android-quanshang-field {
  display: grid;
  gap: 7px;
}

.android-quanshang-field span {
  color: var(--android-text-soft);
  font-size: 0.72rem;
  font-weight: 700;
}

.android-quanshang-field input {
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--android-line-strong);
  border-radius: 11px;
  color: var(--android-ink);
  background: var(--android-surface);
  font: inherit;
  font-size: 0.9rem;
  outline: none;
  -moz-appearance: textfield;
}

.android-quanshang-field :deep(input::-webkit-outer-spin-button),
.android-quanshang-field :deep(input::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}

.android-quanshang-field input:focus {
  border-color: var(--android-accent);
}

.android-quanshang-add {
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  color: var(--android-accent-contrast);
  background: var(--android-accent);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 750;
  cursor: pointer;
}

.android-quanshang-add:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.android-quanshang-error {
  margin: 0;
  color: #d14c3e;
  font-size: 0.76rem;
}

.android-quanshang-saved {
  margin: 0;
  color: #1d9e75;
  font-size: 0.76rem;
}

@media (max-width: 560px) {
  .android-life-page .android-profile-hero {
    padding-right: 86px;
  }

  .android-quanshang-fields {
    grid-template-columns: 1fr;
  }
}
</style>
