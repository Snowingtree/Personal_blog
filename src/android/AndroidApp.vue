<template>
  <div class="android-shell">
    <main
      class="android-shell__content"
      :class="`android-shell__content--${route.meta.androidSurface || 'legacy'}`"
    >
      <div
        ref="routeStageRef"
        class="android-route-stage"
        :class="{
          'android-route-stage--workspace': isWorkspaceRoute,
          'is-workspace-dragging': workspaceDragging,
          'is-workspace-settling': workspaceSettling
        }"
        :style="workspaceSwipeStyle"
        @touchstart="handleWorkspaceTouchStart"
        @touchmove="handleWorkspaceTouchMove"
        @touchend="handleWorkspaceTouchEnd"
        @touchcancel="handleWorkspaceTouchCancel"
      >
        <RouterView v-slot="{ Component }">
          <Transition
            :name="routeTransitionName"
            :mode="routeTransitionMode"
            @after-enter="finishWorkspaceTransition"
            @enter-cancelled="finishWorkspaceTransition"
          >
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </div>
    </main>
    <AndroidBottomNav :appendix-enabled="appendixEnabled" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AndroidBottomNav from './components/AndroidBottomNav.vue'
import {
  ANDROID_APPENDIX_SETTING_CHANGE_EVENT,
  readAndroidAppendixEnabled
} from './appendix'
import {
  ANDROID_THEME_CHANGE_EVENT,
  applyAndroidTheme,
  readAndroidTheme
} from './theme'

const route = useRoute()
const router = useRouter()
const appendixEnabled = ref(readAndroidAppendixEnabled())
const routeStageRef = ref(null)
const workspaceDragging = ref(false)
const workspaceSettling = ref(false)
const workspaceSwipeOffset = ref(0)
const workspaceTransitionDirection = ref('')
const isWorkspaceRoute = computed(() => route.name === 'notes' || route.name === 'appendix')
const routeTransitionName = computed(() =>
  workspaceTransitionDirection.value
    ? `android-workspace-${workspaceTransitionDirection.value}`
    : 'android-route'
)
const routeTransitionMode = computed(() =>
  workspaceTransitionDirection.value ? undefined : 'out-in'
)
const workspaceSwipeStyle = computed(() => ({
  '--android-workspace-swipe-x': `${workspaceSwipeOffset.value}px`
}))

const WORKSPACE_SWIPE_START_THRESHOLD = 10
const WORKSPACE_SWIPE_DIRECTION_RATIO = 1.2
const WORKSPACE_SWIPE_FAST_DISTANCE = 36
const WORKSPACE_SWIPE_FAST_VELOCITY = 0.5
const WORKSPACE_SWIPE_EDGE_GUARD = 20
const WORKSPACE_SWIPE_EXCLUDED_SELECTOR = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '.md-editor-code',
  '.md-editor-code-block',
  'pre',
  'code',
  'table',
  '.note-mobile-directory-dialog',
  '.note-repo-update-dialog',
  '.note-dialog'
].join(',')

let workspaceTouchId = -1
let workspaceTouchStartX = 0
let workspaceTouchStartY = 0
let workspaceTouchStartedAt = 0
let workspaceTouchAxis = ''
let workspaceSwipeDirection = ''
let workspaceSwipeTarget = ''
let workspaceSwipeRawDistance = 0
let workspaceSettleTimerId = 0

function resetWorkspaceTouchTracking() {
  workspaceTouchId = -1
  workspaceTouchStartX = 0
  workspaceTouchStartY = 0
  workspaceTouchStartedAt = 0
  workspaceTouchAxis = ''
  workspaceSwipeDirection = ''
  workspaceSwipeTarget = ''
  workspaceSwipeRawDistance = 0
}

function findWorkspaceTouch(touchList) {
  return Array.from(touchList || []).find((touch) => touch.identifier === workspaceTouchId)
}

function settleWorkspaceSwipe() {
  window.clearTimeout(workspaceSettleTimerId)
  workspaceDragging.value = false
  workspaceSettling.value = true
  workspaceSwipeOffset.value = 0
  resetWorkspaceTouchTracking()

  workspaceSettleTimerId = window.setTimeout(() => {
    workspaceSettling.value = false
  }, 190)
}

function finishWorkspaceTransition() {
  window.clearTimeout(workspaceSettleTimerId)
  workspaceTransitionDirection.value = ''
  workspaceDragging.value = false
  workspaceSettling.value = false
  workspaceSwipeOffset.value = 0
  resetWorkspaceTouchTracking()
}

function handleWorkspaceTouchStart(event) {
  if (event.touches.length !== 1) {
    if (workspaceTouchId >= 0) {
      handleWorkspaceTouchCancel()
    }

    return
  }

  if (
    !isWorkspaceRoute.value
    || workspaceDragging.value
    || workspaceSettling.value
    || workspaceTransitionDirection.value
  ) {
    return
  }

  const direction = route.name === 'notes' && appendixEnabled.value
    ? 'next'
    : route.name === 'appendix'
      ? 'previous'
      : ''

  if (!direction) {
    return
  }

  const targetElement = event.target instanceof Element ? event.target : null

  if (targetElement?.closest(WORKSPACE_SWIPE_EXCLUDED_SELECTOR)) {
    return
  }

  const stageRect = routeStageRef.value?.getBoundingClientRect?.()
  const touch = event.touches[0]
  const localX = stageRect ? touch.clientX - stageRect.left : touch.clientX
  const stageWidth = stageRect?.width || window.innerWidth

  if (localX <= WORKSPACE_SWIPE_EDGE_GUARD || localX >= stageWidth - WORKSPACE_SWIPE_EDGE_GUARD) {
    return
  }

  workspaceTouchId = touch.identifier
  workspaceTouchStartX = touch.clientX
  workspaceTouchStartY = touch.clientY
  workspaceTouchStartedAt = performance.now()
  workspaceTouchAxis = ''
  workspaceSwipeDirection = direction
  workspaceSwipeTarget = direction === 'next' ? '/appendix' : '/notes'
  workspaceSwipeRawDistance = 0
  workspaceSwipeOffset.value = 0
}

function handleWorkspaceTouchMove(event) {
  if (workspaceTouchId < 0 || !workspaceSwipeDirection) {
    return
  }

  if (event.touches.length !== 1) {
    handleWorkspaceTouchCancel()
    return
  }

  const touch = findWorkspaceTouch(event.touches)

  if (!touch) {
    return
  }

  const deltaX = touch.clientX - workspaceTouchStartX
  const deltaY = touch.clientY - workspaceTouchStartY
  const absoluteX = Math.abs(deltaX)
  const absoluteY = Math.abs(deltaY)

  if (!workspaceTouchAxis) {
    if (absoluteX < WORKSPACE_SWIPE_START_THRESHOLD && absoluteY < WORKSPACE_SWIPE_START_THRESHOLD) {
      return
    }

    if (absoluteX <= absoluteY * WORKSPACE_SWIPE_DIRECTION_RATIO) {
      workspaceTouchAxis = 'vertical'
      return
    }

    workspaceTouchAxis = 'horizontal'
  }

  if (workspaceTouchAxis !== 'horizontal') {
    return
  }

  const movingTowardTarget = workspaceSwipeDirection === 'next' ? deltaX < 0 : deltaX > 0

  if (!movingTowardTarget) {
    workspaceSwipeRawDistance = 0
    workspaceSwipeOffset.value = 0
    return
  }

  if (event.cancelable) {
    event.preventDefault()
  }

  const stageWidth = routeStageRef.value?.getBoundingClientRect?.().width || window.innerWidth
  const rawDistance = Math.min(Math.abs(deltaX), stageWidth)
  const freeDistance = stageWidth * 0.42
  const visualDistance = rawDistance <= freeDistance
    ? rawDistance
    : freeDistance + (rawDistance - freeDistance) * 0.12

  workspaceDragging.value = true
  workspaceSwipeRawDistance = rawDistance
  workspaceSwipeOffset.value = workspaceSwipeDirection === 'next'
    ? -visualDistance
    : visualDistance
}

function handleWorkspaceTouchEnd(event) {
  if (workspaceTouchId < 0) {
    return
  }

  const changedTouch = findWorkspaceTouch(event.changedTouches)

  if (!changedTouch) {
    return
  }

  if (!workspaceDragging.value) {
    workspaceSwipeOffset.value = 0
    resetWorkspaceTouchTracking()
    return
  }

  const stageWidth = routeStageRef.value?.getBoundingClientRect?.().width || window.innerWidth
  const distance = workspaceSwipeRawDistance
  const duration = Math.max(performance.now() - workspaceTouchStartedAt, 1)
  const velocity = distance / duration
  const completionDistance = Math.min(96, Math.max(64, stageWidth * 0.22))
  const shouldNavigate = distance >= completionDistance
    || (distance >= WORKSPACE_SWIPE_FAST_DISTANCE && velocity >= WORKSPACE_SWIPE_FAST_VELOCITY)

  if (!shouldNavigate) {
    settleWorkspaceSwipe()
    return
  }

  const target = workspaceSwipeTarget
  workspaceTransitionDirection.value = workspaceSwipeDirection
  workspaceDragging.value = false
  workspaceSettling.value = false
  resetWorkspaceTouchTracking()

  void router.push(target)
    .then((failure) => {
      if (failure) {
        workspaceTransitionDirection.value = ''
        settleWorkspaceSwipe()
      }
    })
    .catch(() => {
      workspaceTransitionDirection.value = ''
      settleWorkspaceSwipe()
    })
}

function handleWorkspaceTouchCancel() {
  if (workspaceDragging.value) {
    settleWorkspaceSwipe()
    return
  }

  workspaceSwipeOffset.value = 0
  resetWorkspaceTouchTracking()
}

function syncMotionPreference(event) {
  const enabled =
    typeof event?.detail?.enabled === 'boolean'
      ? event.detail.enabled
      : localStorage.getItem('android-reduced-motion') === 'true'

  document.documentElement.classList.toggle('android-reduced-motion', enabled)
}

function syncThemePreference(event) {
  applyAndroidTheme(event?.detail?.theme ?? readAndroidTheme())
}

function syncAppendixPreference(event) {
  const enabled = typeof event?.detail?.enabled === 'boolean'
    ? event.detail.enabled
    : readAndroidAppendixEnabled()

  appendixEnabled.value = enabled

  if (!enabled && (workspaceDragging.value || workspaceSettling.value)) {
    finishWorkspaceTransition()
  }

  if (!enabled && route.name === 'appendix') {
    void router.replace('/notes')
  }
}

onMounted(() => {
  document.documentElement.classList.add('is-android-app')
  document.body.classList.add('is-android-app')

  window.addEventListener('android-motion-setting-change', syncMotionPreference)
  window.addEventListener(ANDROID_THEME_CHANGE_EVENT, syncThemePreference)
  window.addEventListener(ANDROID_APPENDIX_SETTING_CHANGE_EVENT, syncAppendixPreference)
  syncMotionPreference()
  syncThemePreference()
  syncAppendixPreference()
})

onBeforeUnmount(() => {
  window.clearTimeout(workspaceSettleTimerId)
  window.removeEventListener('android-motion-setting-change', syncMotionPreference)
  window.removeEventListener(ANDROID_THEME_CHANGE_EVENT, syncThemePreference)
  window.removeEventListener(ANDROID_APPENDIX_SETTING_CHANGE_EVENT, syncAppendixPreference)
  document.documentElement.classList.remove('is-android-app')
  document.documentElement.classList.remove('android-reduced-motion')
  document.documentElement.removeAttribute('data-android-theme')
  document.body.classList.remove('is-android-app')
})
</script>
