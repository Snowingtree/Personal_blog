<template>
  <main class="photo-wall-page" :class="{ 'photo-wall-page--dark': shouldUseDarkTheme }">
    <div class="photo-wall-shell">
      <BlogTopbar
        title="Liu An Journal"
        subtitle="Photo Wall"
        :avatar-src="profileAvatar"
        avatar-alt="Homepage avatar"
        tool-label="返回首页"
        tool-to="/"
        :show-theme-toggle="true"
        :is-dark-theme="isDarkTheme"
        github-href="https://github.com/Snowingtree?tab=repositories"
        @toggle-theme="toggleTheme"
      />

      <section
        class="photo-wall-carousel"
        :class="{ 'is-dragging': isDragging }"
        aria-label="Photo wall carousel"
        tabindex="0"
        @keydown.left.prevent="showPrev"
        @keydown.right.prevent="showNext"
        @wheel.prevent="handleWheel"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerCancel"
      >
        <div class="photo-wall-carousel__viewport">
          <div class="photo-wall-carousel__stage">
            <article
              v-for="item in decoratedSlides"
              :key="item.id"
              class="photo-wall-slide"
              :class="`is-${item.position}`"
              :style="item.layerStyle"
            >
              <div class="photo-wall-slide__visual" :style="item.style" />
            </article>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import BlogTopbar from '../../components/blog/BlogTopbar/BlogTopbar.vue'
import profileAvatar from '../../assets/images/headerPH.png'
import { useSiteTheme } from '../../hooks/useSiteTheme'

const photoWallImages = import.meta.glob('../../assets/images/photo-wall/*.{png,jpg,jpeg,webp,avif,gif}', {
  eager: true,
  import: 'default'
})

const imageGlowPalette = [
  'rgba(255, 138, 93, 0.28)',
  'rgba(92, 135, 255, 0.26)',
  'rgba(77, 223, 185, 0.26)',
  'rgba(255, 132, 192, 0.24)',
  'rgba(131, 152, 190, 0.22)'
]

function createGradientSlideStyle(colors, glow, angle = '145deg') {
  return {
    '--wall-glow': glow,
    background: [
      'radial-gradient(circle at top left, rgba(255, 255, 255, 0.34), transparent 28%)',
      `linear-gradient(${angle}, ${colors[0]}, ${colors[1]} 56%, ${colors[2]})`
    ].join(', ')
  }
}

function createImageSlideStyle(src, glow) {
  return {
    '--wall-glow': glow,
    background: `url("${src}") center/contain no-repeat`,
    backgroundColor: 'transparent'
  }
}

function extractPhotoName(path) {
  return path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? path
}

function buildFallbackSlides() {
  return [
    {
      id: '01',
      style: createGradientSlideStyle(['#ffe4be', '#ff9f67', '#ab4338'], 'rgba(255, 138, 93, 0.28)', '152deg')
    },
    {
      id: '02',
      style: createGradientSlideStyle(['#e0ecff', '#7aaeff', '#2747b1'], 'rgba(92, 135, 255, 0.26)', '145deg')
    },
    {
      id: '03',
      style: createGradientSlideStyle(['#dffff0', '#79e4c2', '#0b7d6f'], 'rgba(77, 223, 185, 0.26)', '146deg')
    },
    {
      id: '04',
      style: createGradientSlideStyle(['#ffe1ef', '#ff9bc7', '#8b3879'], 'rgba(255, 132, 192, 0.24)', '140deg')
    },
    {
      id: '05',
      style: createGradientSlideStyle(['#f8fbff', '#cfd9e8', '#7289a1'], 'rgba(131, 152, 190, 0.22)', '150deg')
    }
  ]
}

function buildSlides() {
  const imageEntries = Object.entries(photoWallImages).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  )

  if (imageEntries.length > 0) {
    return imageEntries.map(([path, src], index) => ({
      id: extractPhotoName(path),
      style: createImageSlideStyle(src, imageGlowPalette[index % imageGlowPalette.length])
    }))
  }

  return buildFallbackSlides()
}

function normalizeSlideOffset(index, activeIndex, total) {
  let offset = index - activeIndex

  if (offset > total / 2) {
    offset -= total
  }

  if (offset < -total / 2) {
    offset += total
  }

  return offset
}

function resolveSlidePosition(offset) {
  if (offset === 0) {
    return 'center'
  }

  if (offset === -1) {
    return 'left'
  }

  if (offset === 1) {
    return 'right'
  }

  if (offset === -2) {
    return 'far-left'
  }

  if (offset === 2) {
    return 'far-right'
  }

  return 'hidden'
}

function resolveSlideLayer(position) {
  if (position === 'center') {
    return 5
  }

  if (position === 'left' || position === 'right') {
    return 4
  }

  if (position === 'far-left' || position === 'far-right') {
    return 2
  }

  return 1
}

const slides = buildSlides()
const { isDarkTheme, shouldUseDarkTheme, toggleTheme } = useSiteTheme()
const currentIndex = ref(0)
const dragStartX = ref(0)
const dragDeltaX = ref(0)
const isDragging = ref(false)
const wheelDelta = ref(0)
const isWheelLocked = ref(false)

const WHEEL_THRESHOLD = 34
const WHEEL_IDLE_RESET_MS = 130
const WHEEL_COOLDOWN_MS = 180
let wheelIdleTimer = null
let wheelCooldownTimer = null

const decoratedSlides = computed(() =>
  slides.map((item, index) => {
    const position = resolveSlidePosition(normalizeSlideOffset(index, currentIndex.value, slides.length))

    return {
      ...item,
      position,
      layerStyle: {
        '--slide-layer': resolveSlideLayer(position)
      }
    }
  })
)

function showPrev() {
  if (slides.length <= 1) {
    return
  }

  currentIndex.value = (currentIndex.value - 1 + slides.length) % slides.length
}

function showNext() {
  if (slides.length <= 1) {
    return
  }

  currentIndex.value = (currentIndex.value + 1) % slides.length
}

function clearWheelIdle() {
  if (wheelIdleTimer) {
    clearTimeout(wheelIdleTimer)
    wheelIdleTimer = null
  }
}

function clearWheelCooldown() {
  if (wheelCooldownTimer) {
    clearTimeout(wheelCooldownTimer)
    wheelCooldownTimer = null
  }
}

function resetWheelState() {
  wheelDelta.value = 0
  clearWheelIdle()
}

function scheduleWheelUnlock() {
  clearWheelCooldown()
  wheelCooldownTimer = setTimeout(() => {
    isWheelLocked.value = false
    wheelCooldownTimer = null
    consumeWheel()
  }, WHEEL_COOLDOWN_MS)
}

function consumeWheel() {
  if (slides.length <= 1 || isDragging.value || isWheelLocked.value || Math.abs(wheelDelta.value) < WHEEL_THRESHOLD) {
    return
  }

  const direction = wheelDelta.value > 0 ? 1 : -1
  wheelDelta.value -= direction * WHEEL_THRESHOLD

  if (wheelDelta.value !== 0 && Math.sign(wheelDelta.value) !== direction) {
    wheelDelta.value = 0
  }

  isWheelLocked.value = true

  if (direction > 0) {
    showNext()
  } else {
    showPrev()
  }

  scheduleWheelUnlock()
}

function handleWheel(event) {
  if (isDragging.value) {
    return
  }

  const primaryDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX

  if (!Number.isFinite(primaryDelta) || Math.abs(primaryDelta) < 2) {
    return
  }

  wheelDelta.value += primaryDelta
  clearWheelIdle()
  wheelIdleTimer = setTimeout(() => {
    wheelDelta.value = 0
    wheelIdleTimer = null
  }, WHEEL_IDLE_RESET_MS)

  consumeWheel()
}

function handlePointerDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return
  }

  dragStartX.value = event.clientX
  dragDeltaX.value = 0
  isDragging.value = true
  resetWheelState()
  event.currentTarget?.setPointerCapture?.(event.pointerId)
}

function handlePointerMove(event) {
  if (!isDragging.value) {
    return
  }

  dragDeltaX.value = event.clientX - dragStartX.value
}

function handlePointerUp(event) {
  if (!isDragging.value) {
    return
  }

  dragDeltaX.value = event.clientX - dragStartX.value
  finishDrag(dragDeltaX.value)
  event.currentTarget?.releasePointerCapture?.(event.pointerId)
}

function handlePointerCancel(event) {
  isDragging.value = false
  dragDeltaX.value = 0
  event.currentTarget?.releasePointerCapture?.(event.pointerId)
}

function finishDrag(deltaX) {
  isDragging.value = false
  dragDeltaX.value = 0

  if (Math.abs(deltaX) < 36) {
    return
  }

  resetWheelState()

  if (deltaX > 0) {
    showPrev()
    return
  }

  showNext()
}

onBeforeUnmount(() => {
  clearWheelIdle()
  clearWheelCooldown()
})
</script>
