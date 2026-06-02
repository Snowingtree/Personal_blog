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
      </div>

      <div class="thought-composer__publish">
        <span>{{ content.length }}/500</span>
        <button type="button" :disabled="!canPublish" @click="publish">发布</button>
      </div>
    </footer>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'

const emit = defineEmits(['publish', 'notice'])

const MAX_IMAGES = 4
const MAX_IMAGE_SIZE = 1.4 * 1024 * 1024
const MAX_TOTAL_IMAGE_SIZE = 3.4 * 1024 * 1024
const content = ref('')
const images = ref([])
const imageInput = ref(null)

const canPublish = computed(() => Boolean(content.value.trim() || images.value.length))

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

function publish() {
  if (!canPublish.value) {
    return
  }

  emit('publish', {
    content: content.value.trim(),
    images: images.value.map((image) => ({ ...image }))
  })

  content.value = ''
  images.value = []
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
