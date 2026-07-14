<template>
  <section class="android-page android-photo-page">
    <header class="android-public-header">
      <span class="android-public-header__icon"><Images :size="22" /></span>
      <div>
        <p>PHOTO JOURNAL</p>
        <h1>照片墙</h1>
        <span>用手机浏览、滑动和回看收藏的画面。</span>
      </div>
    </header>

    <section
      v-if="activePhoto"
      class="android-photo-viewer"
      tabindex="0"
      aria-label="照片查看器"
      @keydown.left.prevent="showPrevious"
      @keydown.right.prevent="showNext"
      @pointerdown="handlePointerDown"
      @pointerup="handlePointerUp"
      @pointercancel="resetPointer"
    >
      <div class="android-photo-viewer__image">
        <img
          :key="activePhoto.src"
          :src="activePhoto.src"
          :srcset="activePhoto.srcset"
          sizes="(max-width: 560px) calc(100vw - 92px), min(78vw, 900px)"
          :alt="activePhoto.alt"
          :width="activePhoto.width"
          :height="activePhoto.height"
          fetchpriority="high"
          decoding="async"
        />
      </div>

      <div class="android-photo-viewer__caption">
        <div>
          <small>SELECTED FRAME</small>
          <h2>{{ activePhoto.alt }}</h2>
        </div>
        <strong>{{ paddedIndex }} / {{ paddedTotal }}</strong>
      </div>

      <div class="android-photo-viewer__controls">
        <button type="button" aria-label="上一张" @click="showPrevious">
          <ChevronLeft :size="20" />
        </button>
        <div aria-hidden="true">
          <span
            v-for="(_, index) in photos"
            :key="index"
            :class="{ 'is-active': index === activeIndex }"
          ></span>
        </div>
        <button type="button" aria-label="下一张" @click="showNext">
          <ChevronRight :size="20" />
        </button>
      </div>
    </section>

  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, Images } from 'lucide-vue-next'
import photoWallImages from '../../data/photoWallImages.generated'

const photos = photoWallImages
const activeIndex = ref(0)
const pointerStartX = ref(0)
const activePhoto = computed(() => photos[activeIndex.value] || null)
const paddedIndex = computed(() => String(activeIndex.value + 1).padStart(2, '0'))
const paddedTotal = computed(() => String(photos.length).padStart(2, '0'))

function showPrevious() {
  if (photos.length < 2) return
  activeIndex.value = (activeIndex.value - 1 + photos.length) % photos.length
}

function showNext() {
  if (photos.length < 2) return
  activeIndex.value = (activeIndex.value + 1) % photos.length
}

function handlePointerDown(event) {
  pointerStartX.value = event.clientX
  event.currentTarget?.setPointerCapture?.(event.pointerId)
}

function handlePointerUp(event) {
  const delta = event.clientX - pointerStartX.value
  resetPointer(event)
  if (Math.abs(delta) < 42) return
  delta > 0 ? showPrevious() : showNext()
}

function resetPointer(event) {
  pointerStartX.value = 0
  event?.currentTarget?.releasePointerCapture?.(event.pointerId)
}

</script>

<style scoped>
.android-photo-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.android-public-header {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 10px 3px 8px;
}

.android-public-header__icon {
  flex: 0 0 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: #303338;
  background: #e3e4e6;
}

.android-public-header p {
  margin: 0 0 7px;
  color: #6d7177;
  font-size: 0.68rem;
  font-weight: 850;
  letter-spacing: 0.15em;
}

.android-public-header h1 {
  margin: 0;
  color: #25272a;
  letter-spacing: -0.045em;
}

.android-public-header h1 {
  font-size: clamp(1.8rem, 6vw, 3rem);
  line-height: 1;
}

.android-public-header > div > span {
  display: block;
  margin-top: 9px;
  color: #72767c;
  font-size: 0.82rem;
}

.android-photo-viewer {
  border: 1px solid #dedfe1;
  border-radius: 25px;
  background: #fff;
  box-shadow: 0 14px 38px rgba(35, 36, 39, 0.07);
}

.android-photo-viewer {
  padding: clamp(12px, 3vw, 20px);
  outline: none;
  touch-action: pan-y;
}

.android-photo-viewer__image {
  position: relative;
  width: 100%;
  display: block;
  padding: 0;
  border: 0;
  border-radius: 18px;
  background: #ececeb;
  overflow: hidden;
}

.android-photo-viewer__image img {
  width: 100%;
  height: clamp(250px, 56vw, 590px);
  display: block;
  object-fit: cover;
}

.android-photo-viewer__caption,
.android-photo-viewer__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.android-photo-viewer__caption {
  padding: 16px 4px 8px;
}

.android-photo-viewer__caption small {
  color: #8a8e94;
  font-size: 0.58rem;
  font-weight: 850;
  letter-spacing: 0.14em;
}

.android-photo-viewer__caption h2 {
  margin: 4px 0 0;
  color: #282a2e;
  font-size: 1.05rem;
}

.android-photo-viewer__caption > strong {
  color: #777b81;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
}

.android-photo-viewer__controls {
  padding: 5px 2px 1px;
}

.android-photo-viewer__controls button {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 14px;
  color: #303338;
  background: #edeef0;
}

.android-photo-viewer__controls > div {
  display: flex;
  gap: 5px;
}

.android-photo-viewer__controls > div span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d0d2d5;
  transition: width 160ms ease, background-color 160ms ease;
}

.android-photo-viewer__controls > div span.is-active {
  width: 18px;
  border-radius: 99px;
  background: #3b3e43;
}

@media (max-width: 560px) {
  .android-photo-viewer__image img {
    height: min(58dvh, 430px);
  }
}
</style>
