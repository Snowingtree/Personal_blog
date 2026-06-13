<template>
  <section class="thought-composer" aria-label="发布碎碎念">
    <div class="thought-composer__head">
      <span class="thought-composer__avatar" aria-hidden="true">LA</span>
      <div>
        <strong>写点什么</strong>
        <p>记录这一刻的想法</p>
      </div>
    </div>

    <textarea
      v-model="content"
      rows="4"
      maxlength="500"
      @keydown="handleTextareaKeydown"
      @keyup="handleTextareaKeyup"
      placeholder="分享此刻的想法..."
      aria-label="动态内容"
    ></textarea>

    <div v-if="images.length" class="thought-composer__images">
      <figure v-for="(image, index) in images" :key="image.id">
        <img :src="image.src" :alt="`待发布图片 ${index + 1}`" />
        <button type="button" :aria-label="`移除图片 ${index + 1}`" @click="removeImage(index)">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </figure>
    </div>

    <footer class="thought-composer__footer">
      <div>
        <input
          ref="imageInput"
          class="thought-composer__file"
          type="file"
          accept="image/*"
          multiple
          @change="handleImageSelection"
        />
        <button
          type="button"
          class="thought-composer__image-button"
          aria-label="添加图片"
          title="添加图片"
          @click="imageInput?.click()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9" r="1.5" />
            <path d="m21 15-5-5L5 20" />
          </svg>
          <span>图片</span>
        </button>
        <span>{{ images.length }}/{{ MAX_IMAGES }}</span>
        <button
          type="button"
          class="thought-composer__image-button thought-composer__tag-button"
          aria-label="选择标签"
          title="选择标签"
          @click="openTagPicker"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6v5.2c0 .6.2 1.1.6 1.5l6.7 6.7c.8.8 2 .8 2.8 0l5.3-5.3c.8-.8.8-2 0-2.8L12.7 4.6c-.4-.4-.9-.6-1.5-.6H6c-1.1 0-2 .9-2 2Z" />
            <circle cx="8.5" cy="8.5" r="1.4" />
          </svg>
          <span>标签</span>
        </button>
      </div>

      <div class="thought-composer__publish">
        <span>{{ content.length }}/500</span>
        <button type="button" :disabled="!canPublish || isPublishLocked" @click="publish">
          {{ isPublishLocked ? '保存中' : '发布' }}
        </button>
      </div>
    </footer>

    <Transition name="thought-composer-tag-dialog">
      <div v-if="isTagPickerOpen" class="thought-composer__tag-mask" @click.self="closeTagPicker">
        <section class="thought-composer__tag-dialog" role="dialog" aria-modal="true" aria-labelledby="thought-composer-tag-title">
          <header>
            <h3 id="thought-composer-tag-title">选择标签</h3>
            <button type="button" aria-label="关闭标签选择" title="关闭" @click="closeTagPicker">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div v-if="tagOptions.length" class="thought-composer__tag-options" aria-label="可选标签">
            <button
              v-for="tag in tagOptions"
              :key="tag"
              type="button"
              :class="{ 'is-selected': isTagSelected(tag) }"
              :aria-pressed="isTagSelected(tag)"
              @click="toggleTag(tag)"
            >
              <span>{{ tag }}</span>
            </button>
          </div>

          <p v-else class="thought-composer__tag-empty">暂无标签</p>

          <footer>
            <span>{{ selectedTags.length }} 个已选</span>
            <button type="button" @click="closeTagPicker">完成</button>
          </footer>
        </section>
      </div>
    </Transition>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const emit = defineEmits(['publish', 'notice', 'dismiss'])
const props = defineProps({
  availableTags: {
    type: Array,
    default: () => []
  },
  publishing: {
    type: Boolean,
    default: false
  }
})

const MAX_IMAGES = 4
const MAX_TAGS = 10
const MAX_IMAGE_SIZE = 1.4 * 1024 * 1024
const MAX_TOTAL_IMAGE_SIZE = 3.4 * 1024 * 1024
const content = ref('')
const images = ref([])
const selectedTags = ref([])
const isTagPickerOpen = ref(false)
const imageInput = ref(null)
const handledEnterKeydown = ref(false)
const localPublishing = ref(false)

const canPublish = computed(() => Boolean(content.value.trim() || images.value.length))
const isPublishLocked = computed(() => props.publishing || localPublishing.value)
const tagOptions = computed(() => {
  const seenTags = new Set()
  const nextTags = []

  props.availableTags.forEach((tag) => {
    const normalizedTag = normalizeComposerTag(tag)
    const tagKey = normalizedTag.toLowerCase()

    if (normalizedTag && !seenTags.has(tagKey)) {
      seenTags.add(tagKey)
      nextTags.push(normalizedTag)
    }
  })

  return nextTags
})
const selectedTagKeys = computed(() => new Set(selectedTags.value.map((tag) => tag.toLowerCase())))

watch(
  () => props.publishing,
  (publishing) => {
    if (!publishing) {
      localPublishing.value = false
    }
  }
)

function createId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

async function handleImageSelection(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''

  if (!files.length) {
    return
  }

  const availableSlots = MAX_IMAGES - images.value.length

  if (availableSlots <= 0) {
    emit('notice', `最多添加 ${MAX_IMAGES} 张图片`)
    return
  }

  const selectedFiles = files.slice(0, availableSlots)
  const oversizedFile = selectedFiles.find((file) => file.size > MAX_IMAGE_SIZE)

  if (oversizedFile) {
    emit('notice', '单张图片不能超过 1.4 MB')
    return
  }

  const existingSize = images.value.reduce((sum, image) => sum + image.size, 0)
  const selectedSize = selectedFiles.reduce((sum, file) => sum + file.size, 0)

  if (existingSize + selectedSize > MAX_TOTAL_IMAGE_SIZE) {
    emit('notice', '单条动态的图片总大小不能超过 3.4 MB')
    return
  }

  try {
    const nextImages = await Promise.all(
      selectedFiles.map(async (file) => ({
        id: createId(),
        name: file.name,
        size: file.size,
        src: await readFileAsDataUrl(file)
      }))
    )

    images.value = [...images.value, ...nextImages]

    if (files.length > selectedFiles.length) {
      emit('notice', `最多添加 ${MAX_IMAGES} 张图片`)
    }
  } catch (error) {
    emit('notice', error instanceof Error ? error.message : '图片读取失败')
  }
}

function removeImage(index) {
  images.value = images.value.filter((_, imageIndex) => imageIndex !== index)
}

function normalizeComposerTag(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24)
}

function openTagPicker() {
  isTagPickerOpen.value = true
}

function closeTagPicker() {
  isTagPickerOpen.value = false
}

function isTagSelected(tag) {
  return selectedTagKeys.value.has(normalizeComposerTag(tag).toLowerCase())
}

function toggleTag(tag) {
  const normalizedTag = normalizeComposerTag(tag)
  const tagKey = normalizedTag.toLowerCase()

  if (!normalizedTag) {
    return
  }

  if (selectedTagKeys.value.has(tagKey)) {
    selectedTags.value = selectedTags.value.filter((item) => item.toLowerCase() !== tagKey)
    return
  }

  if (selectedTags.value.length >= MAX_TAGS) {
    emit('notice', `最多选择 ${MAX_TAGS} 个标签`)
    return
  }

  selectedTags.value = [...selectedTags.value, normalizedTag]
}

function isPlainEnterKey(event) {
  return (
    event.key === 'Enter' &&
    !event.shiftKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey
  )
}

function handleTextareaKeydown(event) {
  handledEnterKeydown.value = false

  if (!isPlainEnterKey(event)) {
    return
  }

  if (event.isComposing || event.keyCode === 229) {
    return
  }

  event.preventDefault()
  handledEnterKeydown.value = true
  submitFromEnter()
}

function handleTextareaKeyup(event) {
  if (!isPlainEnterKey(event)) {
    return
  }

  if (handledEnterKeydown.value) {
    handledEnterKeydown.value = false
    return
  }

  event.preventDefault()
  submitFromEnter()
}

function submitFromEnter() {
  if (isPublishLocked.value) {
    return
  }

  if (canPublish.value) {
    publish()
    return
  }

  emit('dismiss')
}

function publish() {
  if (!canPublish.value || isPublishLocked.value) {
    return
  }

  localPublishing.value = true

  emit('publish', {
    content: content.value.trim(),
    images: images.value.map((image) => ({ ...image })),
    tags: [...selectedTags.value],
    reset
  })
}

function reset() {
  content.value = ''
  images.value = []
  selectedTags.value = []
  isTagPickerOpen.value = false
  localPublishing.value = false
}
</script>

<style scoped>
.thought-composer {
  border: 1px solid #e2e5e9;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(17, 24, 39, 0.05);
  padding: 18px;
}

.thought-composer__head,
.thought-composer__footer,
.thought-composer__footer > div,
.thought-composer__publish,
.thought-composer__image-button {
  display: flex;
  align-items: center;
}

.thought-composer__head {
  gap: 12px;
}

.thought-composer__avatar {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 50%;
  background: #1f2937;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 800;
}

.thought-composer__head strong {
  color: #1f2937;
  font-size: 0.95rem;
}

.thought-composer__head p {
  margin: 2px 0 0;
  color: #8a919b;
  font-size: 0.76rem;
}

textarea {
  width: 100%;
  min-height: 114px;
  margin-top: 15px;
  resize: vertical;
  border: 0;
  outline: 0;
  background: #f7f8fa;
  color: #303641;
  font: inherit;
  font-size: 0.94rem;
  line-height: 1.75;
  padding: 13px 14px;
}

textarea::placeholder {
  color: #abb1ba;
}

.thought-composer__images {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.thought-composer__images figure {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  margin: 0;
  border-radius: 4px;
  background: #eef0f3;
}

.thought-composer__images img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thought-composer__images button {
  position: absolute;
  top: 5px;
  right: 5px;
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgba(17, 24, 39, 0.72);
  color: #ffffff;
  cursor: pointer;
}

.thought-composer__images svg,
.thought-composer__image-button svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.thought-composer__footer {
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
}

.thought-composer__footer > div,
.thought-composer__publish {
  gap: 10px;
}

.thought-composer__footer span {
  color: #9aa1ab;
  font-size: 0.76rem;
}

.thought-composer__file {
  display: none;
}

.thought-composer__image-button {
  gap: 6px;
  border: 0;
  background: transparent;
  color: #596273;
  cursor: pointer;
  font-size: 0.86rem;
  font-weight: 700;
  padding: 5px 0;
}

.thought-composer__tag-mask {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  background: rgba(17, 24, 39, 0.34);
  padding: 20px;
}

.thought-composer__tag-dialog {
  width: min(100%, 420px);
  border: 1px solid #e1e5ea;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(17, 24, 39, 0.2);
  padding: 18px;
}

.thought-composer__tag-dialog header,
.thought-composer__tag-dialog footer,
.thought-composer__tag-dialog header > button,
.thought-composer__tag-dialog footer > button,
.thought-composer__tag-options button {
  display: flex;
  align-items: center;
}

.thought-composer__tag-dialog header,
.thought-composer__tag-dialog footer {
  justify-content: space-between;
  gap: 14px;
}

.thought-composer__tag-dialog h3,
.thought-composer__tag-empty {
  margin: 0;
}

.thought-composer__tag-dialog h3 {
  color: #273142;
  font-size: 1rem;
}

.thought-composer__tag-dialog header > button {
  width: 32px;
  height: 32px;
  justify-content: center;
  border: 1px solid #e1e5ea;
  border-radius: 5px;
  background: #ffffff;
  color: #718096;
  cursor: pointer;
  padding: 0;
}

.thought-composer__tag-dialog header > button:hover {
  background: #f5f6f8;
}

.thought-composer__tag-dialog svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.thought-composer__tag-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.thought-composer__tag-options button {
  min-height: 34px;
  border: 1px solid #dce1e7;
  border-radius: 999px;
  background: #ffffff;
  color: #4a5568;
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0 13px;
}

.thought-composer__tag-options button.is-selected {
  border-color: #253246;
  background: #253246;
  color: #ffffff;
}

.thought-composer__tag-empty {
  margin-top: 18px;
  color: #8a929e;
  font-size: 0.82rem;
}

.thought-composer__tag-dialog footer {
  margin-top: 18px;
  border-top: 1px solid #eef1f5;
  padding-top: 14px;
}

.thought-composer__tag-dialog footer span {
  color: #8a929e;
  font-size: 0.8rem;
}

.thought-composer__tag-dialog footer > button {
  justify-content: center;
  border: 0;
  border-radius: 5px;
  background: #253246;
  color: #ffffff;
  cursor: pointer;
  font-size: 0.84rem;
  font-weight: 800;
  padding: 8px 16px;
}

.thought-composer-tag-dialog-enter-active,
.thought-composer-tag-dialog-leave-active {
  transition: opacity 170ms ease;
}

.thought-composer-tag-dialog-enter-active .thought-composer__tag-dialog,
.thought-composer-tag-dialog-leave-active .thought-composer__tag-dialog {
  transition:
    opacity 170ms ease,
    transform 170ms ease;
}

.thought-composer-tag-dialog-enter-from,
.thought-composer-tag-dialog-leave-to,
.thought-composer-tag-dialog-enter-from .thought-composer__tag-dialog,
.thought-composer-tag-dialog-leave-to .thought-composer__tag-dialog {
  opacity: 0;
}

.thought-composer-tag-dialog-enter-from .thought-composer__tag-dialog,
.thought-composer-tag-dialog-leave-to .thought-composer__tag-dialog {
  transform: scale(0.97) translateY(5px);
}

.thought-composer__publish button {
  min-width: 70px;
  border: 0;
  border-radius: 4px;
  background: #253246;
  color: #ffffff;
  cursor: pointer;
  font-size: 0.86rem;
  font-weight: 700;
  padding: 9px 16px;
}

.thought-composer__publish button:disabled {
  cursor: default;
  opacity: 0.42;
}

@media (max-width: 640px) {
  .thought-composer {
    padding: 14px;
  }

  .thought-composer__images {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
