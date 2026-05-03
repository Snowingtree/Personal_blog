<template>
  <div class="feeding-game">
    <div class="feeding-game__top">
      <div class="feeding-game__headline">
        <div class="feeding-game__badge">
          <span class="feeding-game__badge-icon">T</span>
          <span class="feeding-game__badge-text">IDE HUNT</span>
        </div>

        <div class="feeding-game__status">
          <span class="feeding-game__status-label">{{ uiStatusLabel }}</span>
          <p>{{ uiStatusCopy }}</p>
        </div>

        <div class="feeding-game__goal">
          <div class="feeding-game__goal-meta">
            <span>{{ uiTierName }}</span>
            <span>{{ uiGoalText }}</span>
          </div>
          <div class="feeding-game__goal-track">
            <span :style="{ width: `${goalProgress}%` }" />
          </div>
        </div>
      </div>

      <div class="feeding-game__stats">
        <div class="feeding-game__stat feeding-game__stat--score">
          <span class="feeding-game__stat-icon">&#9733;</span>
          <span class="feeding-game__stat-value">{{ score }}</span>
          <span class="feeding-game__stat-label">SCORE</span>
        </div>

        <div class="feeding-game__stat feeding-game__stat--size">
          <span class="feeding-game__stat-icon">&#9673;</span>
          <span class="feeding-game__stat-value">{{ playerSize }}</span>
          <span class="feeding-game__stat-label">SIZE</span>
        </div>

        <div class="feeding-game__stat feeding-game__stat--chain">
          <span class="feeding-game__stat-icon">&#10022;</span>
          <span class="feeding-game__stat-value">x{{ chain }}</span>
          <span class="feeding-game__stat-label">CHAIN</span>
        </div>

        <div class="feeding-game__stat feeding-game__stat--best">
          <span class="feeding-game__stat-icon">&#9651;</span>
          <span class="feeding-game__stat-value">{{ bestScore }}</span>
          <span class="feeding-game__stat-label">BEST</span>
        </div>

        <div class="feeding-game__boost">
          <div class="feeding-game__boost-meta">
            <span>BOOST</span>
            <strong>{{ boostMeter }}%</strong>
          </div>
          <div class="feeding-game__boost-track">
            <span :style="{ width: `${boostMeter}%` }" />
          </div>
        </div>

        <div class="feeding-game__lives">
          <span
            v-for="heart in MAX_HEALTH"
            :key="heart"
            class="feeding-game__heart"
            :class="{ 'is-lost': heart > health }"
          >
            &#9829;
          </span>
        </div>
      </div>
    </div>

    <div class="feeding-game__frame" :class="{ 'is-hit': damageFlash }">
      <canvas
        ref="canvasRef"
        class="feeding-game__canvas"
        @mousemove="onPointerMove"
        @mouseleave="onPointerLeave"
        @touchstart.prevent="onTouchMove"
        @touchmove.prevent="onTouchMove"
        @touchend.prevent="onPointerLeave"
        @touchcancel.prevent="onPointerLeave"
      />

      <div v-if="gameState !== 'playing'" class="feeding-game__modal">
        <div class="feeding-game__modal-box">
          <p class="feeding-game__modal-title">{{ modalTitle }}</p>
          <p class="feeding-game__modal-sub">{{ modalSubtitle }}</p>
          <p v-if="gameState !== 'ready'" class="feeding-game__modal-score">{{ score }} pts</p>
          <p class="feeding-game__modal-hint">{{ modalHint }}</p>
        </div>
      </div>
    </div>

    <div class="feeding-game__bar">
      <div class="feeding-game__actions">
        <button
          type="button"
          class="feeding-game__button feeding-game__button--primary"
          :disabled="gameState === 'playing'"
          @click="handlePrimaryAction"
        >
          {{ uiPrimaryActionText }}
        </button>

        <button
          type="button"
          class="feeding-game__button"
          :disabled="gameState === 'ready' || gameState === 'over' || gameState === 'cleared'"
          @click="togglePause"
        >
          {{ uiPauseText }}
        </button>

        <button type="button" class="feeding-game__button" @click="restart">
          {{ uiRestartText }}
        </button>
      </div>

      <div class="feeding-game__keys">
        <span class="feeding-game__key">Mouse / Touch steer</span>
        <span class="feeding-game__key">WASD fallback</span>
        <span class="feeding-game__key">Space boost</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const BEST_SCORE_KEY = 'vibe-games-feeding-frenzy-best-score'
const W = 900
const H = 560
const WORLD_W = 3200
const WORLD_H = 2000
const DT_BASE = 1000 / 60
const MAX_FISH = 30
const BUBBLE_COUNT = 34
const MAX_HEALTH = 3
const TARGET_SCORE = 180
const INITIAL_RADIUS = 22
const MAX_RADIUS = 88
const BOOST_MAX = 100
const PLAYER_INVINCIBILITY = 92
const POINTER_DEADZONE = 10
const EAT_MARGIN = 1.08

const PLAYER_COLORS = {
  body: '#78e7ff',
  fin: '#27c4ff',
  belly: 'rgba(234, 253, 255, 0.92)',
  eye: '#04263c'
}

const FISH_PALETTES = [
  { body: '#ff8f70', fin: '#ff6848', belly: 'rgba(255, 238, 228, 0.88)', eye: '#3b160d' },
  { body: '#ffd166', fin: '#ffb703', belly: 'rgba(255, 247, 217, 0.9)', eye: '#3d2a00' },
  { body: '#80ed99', fin: '#52b788', belly: 'rgba(232, 255, 239, 0.88)', eye: '#13351b' },
  { body: '#b388ff', fin: '#8f63ff', belly: 'rgba(243, 236, 255, 0.88)', eye: '#231235' },
  { body: '#ff7aa2', fin: '#ff4d85', belly: 'rgba(255, 235, 242, 0.88)', eye: '#3b1322' }
]

const canvasRef = ref(null)
const score = ref(0)
const bestScore = ref(readStoredBestScore())
const health = ref(MAX_HEALTH)
const chain = ref(0)
const boostMeter = ref(BOOST_MAX)
const playerSize = ref(INITIAL_RADIUS)
const damageFlash = ref(false)
const gameState = ref('ready')

const goalProgress = computed(() => Math.min(100, (score.value / TARGET_SCORE) * 100))
const uiTierName = computed(() => tierNameForRadius(playerSize.value))
const uiGoalText = computed(() => {
  if (gameState.value === 'cleared') {
    return '\u6df1\u6d77\u738b\u8005'
  }

  const remain = Math.max(0, TARGET_SCORE - score.value)
  return `Target ${TARGET_SCORE} / Left ${remain}`
})

const uiStatusLabel = computed(() => {
  if (gameState.value === 'playing') return '\u5927\u9c7c\u541e\u98df\u4e2d'
  if (gameState.value === 'paused') return '\u5148\u770b\u9c7c\u7fa4\u8d70\u4f4d'
  if (gameState.value === 'over') return '\u88ab\u5927\u9c7c\u76ef\u4e0a\u4e86'
  if (gameState.value === 'cleared') return '\u8fd9\u7247\u6d77\u57df\u5403\u7a7f\u4e86'
  return '\u51c6\u5907\u4e0b\u6f5c'
})

const uiStatusCopy = computed(() => {
  if (gameState.value === 'playing') {
    return '\u5148\u5403\u6bd4\u81ea\u5df1\u5c0f\u4e00\u5708\u7684\u9c7c\uff0c\u8fde\u5403\u4f1a\u628a\u500d\u7387\u62c9\u8d77\u6765\u3002'
  }
  if (gameState.value === 'paused') {
    return '\u89c2\u5bdf\u5927\u9c7c\u8def\u7ebf\uff0c\u7559\u51fa\u51b2\u523a\u901a\u9053\uff0c\u518d\u53cd\u8fc7\u6765\u5403\u5c0f\u9c7c\u3002'
  }
  if (gameState.value === 'over') {
    return '\u4f60\u88ab\u6bd4\u81ea\u5df1\u5927\u7684\u9c7c\u649e\u6563\u4e86\uff0c\u4e0b\u5c40\u5148\u7a33\u5bb9\u79ef\u518d\u63d0\u901f\u3002'
  }
  if (gameState.value === 'cleared') {
    return '\u8fd9\u4e00\u5c40\u5df2\u7ecf\u957f\u6210\u6df1\u6d77\u9876\u7ea7\u63a0\u98df\u8005\uff0c\u53ef\u4ee5\u518d\u5f00\u4e00\u8f6e\u3002'
  }
  return '\u9f20\u6807\u6216\u624b\u6307\u63a7\u5236\u6e38\u5411\uff0c\u5148\u5403\u5c0f\u9c7c\u957f\u5927\uff0c\u518d\u53bb\u8ffd\u5927\u76ee\u6807\u3002'
})

const modalTitle = computed(() => {
  if (gameState.value === 'paused') return 'PAUSED'
  if (gameState.value === 'over') return 'TOO BIG TO BITE'
  if (gameState.value === 'cleared') return 'TIDE CROWN'
  return 'FEEDING FRENZY'
})

const modalSubtitle = computed(() => {
  if (gameState.value === 'paused') {
    return '\u522b\u628a\u5c3e\u901f\u6d6a\u8d39\u5728\u6b7b\u89d2\uff0c\u770b\u51c6\u5c0f\u9c7c\u7ebf\u518d\u5f00\u5403\u3002'
  }
  if (gameState.value === 'over') {
    return '\u5927\u9c7c\u76f8\u649e\u4f1a\u6389\u547d\uff0c\u8fde\u5403\u79ef\u5206\u624d\u662f\u8fd9\u5c40\u7684\u8282\u594f\u3002'
  }
  if (gameState.value === 'cleared') {
    return '\u4f60\u5df2\u7ecf\u628a\u6d77\u91cc\u8fd9\u4e00\u7247\u5403\u5230\u89c1\u5e95\u4e86\u3002'
  }
  return '\u5403\u6389\u5c0f\u9c7c\u79ef\u5206\uff0c\u906d\u9047\u5927\u9c7c\u65f6\u7528 Space \u52a0\u901f\u62c9\u5f00\u8ddd\u79bb\u3002'
})

const modalHint = computed(() => {
  if (gameState.value === 'paused') return 'Enter / P to resume'
  if (gameState.value === 'over' || gameState.value === 'cleared') return 'Enter to restart'
  return 'Move the mouse or press Enter to start'
})

const uiPrimaryActionText = computed(() => {
  if (gameState.value === 'paused') return '\u7ee7\u7eed'
  if (gameState.value === 'over') return '\u518d\u6765\u4e00\u5c40'
  if (gameState.value === 'cleared') return '\u518d\u5f00\u4e00\u5c40'
  if (gameState.value === 'playing') return '\u6b63\u5728\u6355\u98df'
  return '\u5f00\u59cb'
})

const uiPauseText = computed(() =>
  gameState.value === 'paused' ? '\u7ee7\u7eed' : '\u6682\u505c'
)

const uiRestartText = '\u91cd\u5f00'

let ctx = null
let animFrame = null
let lastFrameTime = 0
let time = 0
let player = null
let camera = { x: 0, y: 0 }
let fishes = []
let particles = []
let bubbles = []
let chainTimer = 0
let flashTimer = null
let keys = {}
let pointer = { x: W / 2, y: H / 2, active: false }

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function lerp(start, end, amount) {
  return start + (end - start) * amount
}

function readStoredBestScore() {
  if (typeof window === 'undefined') {
    return 0
  }

  try {
    const nextValue = Number(window.localStorage.getItem(BEST_SCORE_KEY) ?? 0)
    return Number.isFinite(nextValue) ? nextValue : 0
  } catch {
    return 0
  }
}

function persistBestScore() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore.value))
  } catch {
    // Ignore storage failures and keep the in-memory score.
  }
}

function setBestScore(nextScore) {
  if (nextScore <= bestScore.value) {
    return
  }

  bestScore.value = nextScore
  persistBestScore()
}

function tierNameForRadius(radius) {
  if (radius < 28) return 'Silver Fry'
  if (radius < 36) return 'Current Runner'
  if (radius < 48) return 'Reef Hunter'
  if (radius < 62) return 'Abyss Stalker'
  return 'Tide Sovereign'
}

function createPlayer() {
  return {
    x: WORLD_W * 0.34,
    y: WORLD_H * 0.5,
    vx: 0,
    vy: 0,
    radius: INITIAL_RADIUS,
    energy: BOOST_MAX,
    inv: 0,
    heading: 0
  }
}

function makeBubble() {
  return {
    x: rand(0, WORLD_W),
    y: rand(0, WORLD_H),
    r: rand(3, 14),
    speed: rand(0.25, 0.9),
    drift: rand(-0.2, 0.2),
    alpha: rand(0.12, 0.42),
    wobble: rand(0, Math.PI * 2)
  }
}

function initBubbles() {
  bubbles = Array.from({ length: BUBBLE_COUNT }, () => makeBubble())
}

function createFish() {
  const focusRadius = player?.radius ?? INITIAL_RADIUS
  const roll = Math.random()
  let radius = focusRadius * rand(0.48, 0.84)

  if (roll > 0.6 && roll <= 0.86) {
    radius = focusRadius * rand(0.9, 1.12)
  } else if (roll > 0.86) {
    radius = focusRadius * rand(1.18, 1.82)
  }

  radius = clamp(radius + Math.min(score.value * 0.02, 18), 10, 84)

  const angle = rand(0, Math.PI * 2)
  const distance = rand(420, 940)
  const baseX = player?.x ?? WORLD_W / 2
  const baseY = player?.y ?? WORLD_H / 2
  const x = clamp(baseX + Math.cos(angle) * distance, 70, WORLD_W - 70)
  const y = clamp(baseY + Math.sin(angle) * distance, 70, WORLD_H - 70)
  const palette = FISH_PALETTES[Math.floor(Math.random() * FISH_PALETTES.length)]
  const speedBase = clamp(4.4 - radius * 0.028 + rand(-0.25, 0.3), 1.2, 4.3)

  return {
    x,
    y,
    vx: rand(-1, 1),
    vy: rand(-0.7, 0.7),
    radius,
    baseSpeed: speedBase,
    heading: rand(-Math.PI, Math.PI),
    wanderAngle: rand(-Math.PI, Math.PI),
    wanderTimer: rand(24, 80),
    tailOffset: rand(0, Math.PI * 2),
    palette
  }
}

function refillSchool() {
  while (fishes.length < MAX_FISH) {
    fishes.push(createFish())
  }
}

function addParticles(x, y, color, count, size = 3.2) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x,
      y,
      vx: rand(-2.8, 2.8),
      vy: rand(-2.6, 1.6),
      life: rand(24, 42),
      size: rand(1.4, size),
      color
    })
  }
}

function syncHud() {
  playerSize.value = Math.round(player.radius)
  boostMeter.value = Math.round(player.energy)
}

function resetRunState() {
  score.value = 0
  health.value = MAX_HEALTH
  chain.value = 0
  chainTimer = 0
  damageFlash.value = false
  keys = {}
  pointer = { x: W / 2, y: H / 2, active: false }
  lastFrameTime = 0
}

function initScene() {
  player = createPlayer()
  camera = {
    x: clamp(player.x - W / 2, 0, WORLD_W - W),
    y: clamp(player.y - H / 2, 0, WORLD_H - H)
  }
  fishes = []
  particles = []
  initBubbles()
  refillSchool()
  syncHud()
}

function restart() {
  if (animFrame) {
    cancelAnimationFrame(animFrame)
  }

  animFrame = null
  resetRunState()
  initScene()
  render()
  gameState.value = 'ready'
}

function updatePointer(clientX, clientY) {
  const canvas = canvasRef.value
  if (!canvas) {
    return
  }

  const rect = canvas.getBoundingClientRect()
  pointer.x = ((clientX - rect.left) / rect.width) * W
  pointer.y = ((clientY - rect.top) / rect.height) * H
  pointer.active = true
}

function onPointerMove(event) {
  updatePointer(event.clientX, event.clientY)
}

function onTouchMove(event) {
  const touch = event.touches[0]
  if (!touch) {
    return
  }

  updatePointer(touch.clientX, touch.clientY)
}

function onPointerLeave() {
  pointer.active = false
}

function steerVector() {
  let dx = 0
  let dy = 0

  if (keys.ArrowLeft || keys.a || keys.A) dx -= 1
  if (keys.ArrowRight || keys.d || keys.D) dx += 1
  if (keys.ArrowUp || keys.w || keys.W) dy -= 1
  if (keys.ArrowDown || keys.s || keys.S) dy += 1

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy) || 1
    return { x: dx / len, y: dy / len }
  }

  if (!pointer.active || !player) {
    return { x: 0, y: 0 }
  }

  const worldTargetX = camera.x + pointer.x
  const worldTargetY = camera.y + pointer.y
  const vx = worldTargetX - player.x
  const vy = worldTargetY - player.y
  const length = Math.hypot(vx, vy)

  if (length < POINTER_DEADZONE) {
    return { x: 0, y: 0 }
  }

  return { x: vx / length, y: vy / length }
}

function isBoosting() {
  return (keys[' '] || keys.Shift) && player.energy > 6
}

function flashDamageState() {
  damageFlash.value = true

  if (flashTimer) {
    clearTimeout(flashTimer)
  }

  flashTimer = setTimeout(() => {
    damageFlash.value = false
    flashTimer = null
  }, 260)
}

function finishRun(nextState) {
  gameState.value = nextState
  setBestScore(score.value)
  render()
}

function takeDamage(source) {
  if (!player || player.inv > 0 || gameState.value !== 'playing') {
    return
  }

  health.value -= 1
  chain.value = 0
  chainTimer = 0
  player.inv = PLAYER_INVINCIBILITY
  player.radius = Math.max(INITIAL_RADIUS, player.radius * 0.9)
  player.energy = Math.min(BOOST_MAX, player.energy + 24)
  syncHud()

  const pushAngle = Math.atan2(player.y - source.y, player.x - source.x)
  player.vx = Math.cos(pushAngle) * 7.5
  player.vy = Math.sin(pushAngle) * 7.5

  addParticles(player.x, player.y, '#ffd6d6', 18, 4.4)
  flashDamageState()

  if (health.value <= 0) {
    finishRun('over')
  }
}

function eatFish(index) {
  const fish = fishes[index]
  const basePoints = Math.max(4, Math.round(fish.radius * 1.5))
  chain.value = chainTimer > 0 ? Math.min(chain.value + 1, 9) : 1
  chainTimer = 96
  score.value += basePoints * Math.max(1, chain.value)
  player.radius = clamp(player.radius + fish.radius * 0.045, INITIAL_RADIUS, MAX_RADIUS)
  player.energy = Math.min(BOOST_MAX, player.energy + 5)
  syncHud()
  setBestScore(score.value)
  addParticles(fish.x, fish.y, fish.palette.belly, 10, 4)
  fishes[index] = createFish()

  if (score.value >= TARGET_SCORE) {
    finishRun('cleared')
  }
}

function updatePlayer(dt) {
  const input = steerVector()
  const boosting = isBoosting()
  const baseSpeed = clamp(5.2 - (player.radius - INITIAL_RADIUS) * 0.04, 2.35, 5.2)
  const speed = baseSpeed * (boosting ? 1.5 : 1)
  const steering = input.x !== 0 || input.y !== 0 ? 1 - Math.pow(boosting ? 0.74 : 0.8, dt) : 1 - Math.pow(0.9, dt)
  const targetVx = input.x * speed
  const targetVy = input.y * speed * 0.82

  player.vx = lerp(player.vx, targetVx, steering)
  player.vy = lerp(player.vy, targetVy, steering)

  if (input.x === 0 && input.y === 0) {
    player.vx *= Math.pow(0.985, dt)
    player.vy *= Math.pow(0.985, dt)
  }

  if (boosting) {
    player.energy = Math.max(0, player.energy - 1.4 * dt)
    addParticles(
      player.x - Math.cos(player.heading) * player.radius * 0.9,
      player.y - Math.sin(player.heading) * player.radius * 0.9,
      'rgba(159, 239, 255, 0.9)',
      1,
      2.2
    )
  } else {
    player.energy = Math.min(BOOST_MAX, player.energy + 0.66 * dt)
  }

  player.x = clamp(player.x + player.vx * dt, 40, WORLD_W - 40)
  player.y = clamp(player.y + player.vy * dt, 50, WORLD_H - 50)

  if (Math.abs(player.vx) > 0.05 || Math.abs(player.vy) > 0.05) {
    player.heading = Math.atan2(player.vy, player.vx)
  }

  if (player.inv > 0) {
    player.inv = Math.max(0, player.inv - dt)
  }

  syncHud()
}

function updateFishes(dt) {
  for (let i = 0; i < fishes.length; i += 1) {
    const fish = fishes[i]
    const dx = player.x - fish.x
    const dy = player.y - fish.y
    const dist = Math.hypot(dx, dy)

    fish.wanderTimer -= dt
    if (fish.wanderTimer <= 0) {
      fish.wanderTimer = rand(26, 90)
      fish.wanderAngle += rand(-1.1, 1.1)
    }

    let targetAngle = fish.wanderAngle

    if (dist < 320) {
      if (fish.radius < player.radius * 0.92) {
        targetAngle = Math.atan2(-dy, -dx) + rand(-0.36, 0.36)
      } else if (fish.radius > player.radius * 1.08) {
        targetAngle = Math.atan2(dy, dx) + rand(-0.22, 0.22)
      }
    }

    if (fish.x < 110) targetAngle = 0
    if (fish.x > WORLD_W - 110) targetAngle = Math.PI
    if (fish.y < 100) targetAngle = Math.PI / 2
    if (fish.y > WORLD_H - 100) targetAngle = -Math.PI / 2

    const swimSpeed = fish.baseSpeed * (fish.radius < player.radius * 0.92 ? 1.08 : 0.96)
    const steer = 1 - Math.pow(0.84, dt)
    const targetVx = Math.cos(targetAngle) * swimSpeed
    const targetVy = Math.sin(targetAngle) * swimSpeed * 0.82

    fish.vx = lerp(fish.vx, targetVx, steer)
    fish.vy = lerp(fish.vy, targetVy, steer)
    fish.x += fish.vx * dt
    fish.y += fish.vy * dt
    fish.heading = Math.atan2(fish.vy, fish.vx)

    if (
      fish.x < -220 ||
      fish.x > WORLD_W + 220 ||
      fish.y < -220 ||
      fish.y > WORLD_H + 220 ||
      dist > 1400
    ) {
      fishes[i] = createFish()
      continue
    }

    const collideRadius = player.radius * 0.78 + fish.radius * 0.72
    if (dx * dx + dy * dy > collideRadius * collideRadius) {
      continue
    }

    if (player.radius >= fish.radius * EAT_MARGIN) {
      eatFish(i)
      if (gameState.value !== 'playing') {
        return
      }
    } else if (fish.radius > player.radius * 1.02) {
      takeDamage(fish)
      if (gameState.value !== 'playing') {
        return
      }
    } else {
      const push = Math.atan2(dy, dx)
      player.vx += Math.cos(push) * 0.35
      player.vy += Math.sin(push) * 0.35
      fish.vx -= Math.cos(push) * 0.25
      fish.vy -= Math.sin(push) * 0.25
    }
  }
}

function updateParticles(dt) {
  particles = particles.filter((particle) => {
    particle.x += particle.vx * dt
    particle.y += particle.vy * dt
    particle.vy -= 0.03 * dt
    particle.life -= dt
    particle.size *= Math.pow(0.985, dt)
    return particle.life > 0 && particle.size > 0.35
  })
}

function updateBubbles(dt) {
  for (let i = 0; i < bubbles.length; i += 1) {
    const bubble = bubbles[i]
    bubble.y -= bubble.speed * dt
    bubble.x += Math.sin(time * 0.0007 + bubble.wobble) * bubble.drift * dt * 6

    if (bubble.y < -40) {
      bubbles[i] = {
        ...makeBubble(),
        x: rand(Math.max(0, camera.x - 120), Math.min(WORLD_W, camera.x + W + 120)),
        y: camera.y + H + rand(20, 180)
      }
    }
  }
}

function updateCamera(dt) {
  const targetX = clamp(player.x - W * 0.42, 0, WORLD_W - W)
  const targetY = clamp(player.y - H * 0.5, 0, WORLD_H - H)
  const follow = 1 - Math.pow(0.87, dt)
  camera.x = lerp(camera.x, targetX, follow)
  camera.y = lerp(camera.y, targetY, follow)
}

function update(dt) {
  if (!player) {
    return
  }

  updatePlayer(dt)
  updateFishes(dt)
  if (gameState.value !== 'playing') {
    return
  }

  if (chainTimer > 0) {
    chainTimer = Math.max(0, chainTimer - dt)
  } else if (chain.value !== 0) {
    chain.value = 0
  }

  updateParticles(dt)
  updateBubbles(dt)
  refillSchool()
  updateCamera(dt)
}

function drawBackdrop() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H)
  gradient.addColorStop(0, '#03152a')
  gradient.addColorStop(0.3, '#0a2c52')
  gradient.addColorStop(0.7, '#0c4f77')
  gradient.addColorStop(1, '#06233f')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, W, H)

  for (let i = 0; i < 4; i += 1) {
    const beamX = ((i * 220 + time * 0.015) % (W + 220)) - 110
    const beam = ctx.createLinearGradient(beamX, 0, beamX + 160, H)
    beam.addColorStop(0, 'rgba(180, 240, 255, 0.2)')
    beam.addColorStop(1, 'rgba(180, 240, 255, 0)')
    ctx.fillStyle = beam
    ctx.beginPath()
    ctx.moveTo(beamX, 0)
    ctx.lineTo(beamX + 120, 0)
    ctx.lineTo(beamX + 210, H)
    ctx.lineTo(beamX + 40, H)
    ctx.closePath()
    ctx.fill()
  }

  const seaFloor = ctx.createLinearGradient(0, H - 120, 0, H)
  seaFloor.addColorStop(0, 'rgba(8, 33, 49, 0)')
  seaFloor.addColorStop(1, 'rgba(4, 13, 24, 0.72)')
  ctx.fillStyle = seaFloor
  ctx.fillRect(0, H - 160, W, 160)
}

function drawPlants() {
  const startX = Math.floor(camera.x / 90) * 90 - 90
  for (let x = startX; x < camera.x + W + 120; x += 90) {
    const sx = x - camera.x
    const height = 28 + ((x / 37) % 1) * 54
    const sway = Math.sin(time * 0.0016 + x * 0.01) * 10

    ctx.strokeStyle = 'rgba(84, 206, 168, 0.32)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(sx, H)
    ctx.quadraticCurveTo(sx + sway * 0.4, H - height * 0.55, sx + sway, H - height)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(27, 119, 102, 0.38)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(sx + 8, H)
    ctx.quadraticCurveTo(sx + 6 + sway * 0.3, H - height * 0.45, sx + 4 + sway * 0.7, H - height * 0.84)
    ctx.stroke()
  }
}

function drawBubbles() {
  for (let i = 0; i < bubbles.length; i += 1) {
    const bubble = bubbles[i]
    const sx = bubble.x - camera.x
    const sy = bubble.y - camera.y
    if (sx < -30 || sx > W + 30 || sy < -40 || sy > H + 40) {
      continue
    }

    ctx.globalAlpha = bubble.alpha
    ctx.strokeStyle = '#d6f4ff'
    ctx.lineWidth = 1.3
    ctx.beginPath()
    ctx.arc(sx, sy, bubble.r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = bubble.alpha * 0.4
    ctx.fillStyle = '#d6f4ff'
    ctx.beginPath()
    ctx.arc(sx - bubble.r * 0.3, sy - bubble.r * 0.3, bubble.r * 0.26, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

function drawFishBody(fish, sx, sy, isPlayer = false) {
  const bodyRadius = fish.radius
  const bodyWidth = bodyRadius * 2.15
  const bodyHeight = bodyRadius * 1.18
  const tailSwing = Math.sin(time * 0.01 + fish.tailOffset) * bodyRadius * 0.22
  const colors = isPlayer ? PLAYER_COLORS : fish.palette

  ctx.save()
  ctx.translate(sx, sy)
  ctx.rotate(fish.heading)

  if (isPlayer && fish.inv > 0 && Math.floor(time / 90) % 2 === 0) {
    ctx.globalAlpha = 0.42
  }

  if (isPlayer) {
    ctx.globalAlpha = 0.18
    ctx.fillStyle = '#8cecff'
    ctx.beginPath()
    ctx.ellipse(0, 0, bodyWidth * 0.6, bodyHeight * 0.72, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  ctx.fillStyle = colors.fin
  ctx.beginPath()
  ctx.moveTo(-bodyWidth * 0.5, 0)
  ctx.lineTo(-bodyWidth * 0.92, -bodyHeight * 0.44 + tailSwing)
  ctx.lineTo(-bodyWidth * 0.92, bodyHeight * 0.44 + tailSwing)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(-bodyWidth * 0.08, -bodyHeight * 0.18)
  ctx.lineTo(-bodyWidth * 0.28, -bodyHeight * 0.72)
  ctx.lineTo(bodyWidth * 0.06, -bodyHeight * 0.36)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(-bodyWidth * 0.06, bodyHeight * 0.18)
  ctx.lineTo(-bodyWidth * 0.26, bodyHeight * 0.7)
  ctx.lineTo(bodyWidth * 0.04, bodyHeight * 0.34)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = colors.body
  ctx.beginPath()
  ctx.ellipse(0, 0, bodyWidth * 0.52, bodyHeight * 0.52, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = colors.belly
  ctx.beginPath()
  ctx.ellipse(bodyWidth * 0.04, bodyHeight * 0.12, bodyWidth * 0.34, bodyHeight * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = colors.fin
  ctx.beginPath()
  ctx.moveTo(bodyWidth * 0.12, 0)
  ctx.lineTo(bodyWidth * 0.34, -bodyHeight * 0.22)
  ctx.lineTo(bodyWidth * 0.34, bodyHeight * 0.22)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(bodyWidth * 0.24, -bodyHeight * 0.08, Math.max(3, bodyRadius * 0.13), 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = colors.eye
  ctx.beginPath()
  ctx.arc(bodyWidth * 0.28, -bodyHeight * 0.08, Math.max(1.4, bodyRadius * 0.06), 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
  ctx.globalAlpha = 1
}

function drawParticles() {
  for (let i = 0; i < particles.length; i += 1) {
    const particle = particles[i]
    const sx = particle.x - camera.x
    const sy = particle.y - camera.y
    if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) {
      continue
    }

    ctx.globalAlpha = Math.min(1, particle.life / 24)
    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.arc(sx, sy, particle.size, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalAlpha = 1
}

function drawReticle() {
  if (!pointer.active) {
    return
  }

  const pulse = 7 + Math.sin(time * 0.012) * 2
  ctx.strokeStyle = 'rgba(222, 249, 255, 0.5)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(pointer.x, pointer.y, pulse, 0, Math.PI * 2)
  ctx.stroke()
}

function render() {
  if (!ctx || !player) {
    return
  }

  drawBackdrop()
  drawPlants()
  drawBubbles()

  for (let i = 0; i < fishes.length; i += 1) {
    const fish = fishes[i]
    const sx = fish.x - camera.x
    const sy = fish.y - camera.y
    if (sx < -120 || sx > W + 120 || sy < -120 || sy > H + 120) {
      continue
    }

    drawFishBody(fish, sx, sy)
  }

  drawParticles()
  drawFishBody(player, player.x - camera.x, player.y - camera.y, true)
  drawReticle()
}

function loop(ts) {
  time = ts
  const dt = lastFrameTime ? Math.min((ts - lastFrameTime) / DT_BASE, 3) : 1
  lastFrameTime = ts
  update(dt)
  render()

  if (gameState.value === 'playing') {
    animFrame = requestAnimationFrame(loop)
  } else {
    animFrame = null
  }
}

function start() {
  if (gameState.value === 'playing') {
    return
  }

  gameState.value = 'playing'
  lastFrameTime = 0

  if (!animFrame) {
    animFrame = requestAnimationFrame(loop)
  }
}

function togglePause() {
  if (gameState.value === 'ready' || gameState.value === 'over' || gameState.value === 'cleared') {
    return
  }

  if (gameState.value === 'playing') {
    gameState.value = 'paused'
    keys = {}
    return
  }

  start()
}

function handlePrimaryAction() {
  if (gameState.value === 'ready' || gameState.value === 'paused') {
    start()
    return
  }

  if (gameState.value === 'over' || gameState.value === 'cleared') {
    restart()
    start()
  }
}

function isMovementKey(key) {
  return [
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'w',
    'a',
    's',
    'd',
    'W',
    'A',
    'S',
    'D',
    ' ',
    'Shift'
  ].includes(key)
}

function onKeyDown(event) {
  if (isMovementKey(event.key) || event.key === 'Enter') {
    event.preventDefault()
  }

  if (event.key === 'Enter') {
    handlePrimaryAction()
    return
  }

  if (event.key === 'p' || event.key === 'P') {
    togglePause()
    return
  }

  if (event.key === 'r' || event.key === 'R') {
    restart()
    return
  }

  keys[event.key] = true

  if (gameState.value === 'ready' && isMovementKey(event.key)) {
    start()
  }
}

function onKeyUp(event) {
  keys[event.key] = false
}

onMounted(() => {
  const canvas = canvasRef.value
  canvas.width = W
  canvas.height = H
  ctx = canvas.getContext('2d', { alpha: false })
  initScene()
  render()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  if (animFrame) {
    cancelAnimationFrame(animFrame)
  }
  if (flashTimer) {
    clearTimeout(flashTimer)
  }
})
</script>

<style scoped>
.feeding-game {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.feeding-game__top {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  width: 100%;
}

.feeding-game__headline {
  display: grid;
  gap: 12px;
  max-width: 460px;
}

.feeding-game__badge {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.feeding-game__badge-icon {
  font-size: 30px;
  font-weight: 900;
  color: #7ee8ff;
  letter-spacing: -0.04em;
  text-shadow: 0 0 24px rgba(126, 232, 255, 0.45);
}

.feeding-game__badge-text {
  color: rgba(126, 232, 255, 0.7);
  letter-spacing: 0.22em;
  font-size: 17px;
  font-weight: 700;
}

.feeding-game__status {
  display: grid;
  gap: 4px;
}

.feeding-game__status-label {
  color: var(--blog-ink);
  font-size: 0.98rem;
  font-weight: 700;
}

.feeding-game__status p {
  margin: 0;
  color: var(--blog-muted);
  line-height: 1.7;
}

.feeding-game__goal {
  display: grid;
  gap: 8px;
}

.feeding-game__goal-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--blog-ink);
  font-size: 0.84rem;
  font-weight: 700;
}

.feeding-game__goal-meta span:last-child {
  color: var(--blog-muted);
  font-weight: 600;
}

.feeding-game__goal-track {
  position: relative;
  width: 100%;
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0.08)),
    rgba(6, 52, 84, 0.28);
}

.feeding-game__goal-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2ed6ff, #7cf6db);
  box-shadow: 0 0 22px rgba(46, 214, 255, 0.36);
}

.feeding-game__stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: stretch;
}

.feeding-game__stat,
.feeding-game__boost,
.feeding-game__lives {
  border-radius: 16px;
  border: 1px solid rgba(77, 152, 199, 0.16);
  background: rgba(255, 255, 255, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.38);
}

.feeding-game__stat {
  min-width: 92px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 10px 12px;
}

.feeding-game__stat--score {
  background: rgba(255, 214, 102, 0.12);
}

.feeding-game__stat--size {
  background: rgba(115, 219, 255, 0.12);
}

.feeding-game__stat--chain {
  background: rgba(180, 136, 255, 0.12);
}

.feeding-game__stat--best {
  background: rgba(112, 255, 210, 0.12);
}

.feeding-game__stat-icon {
  font-size: 12px;
  color: #169ac5;
}

.feeding-game__stat-value {
  color: var(--blog-ink);
  font-size: 1.02rem;
  font-weight: 800;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.feeding-game__stat-label {
  color: var(--text-secondary);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.feeding-game__boost {
  min-width: 150px;
  padding: 10px 12px;
  display: grid;
  gap: 8px;
}

.feeding-game__boost-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--blog-ink);
  font-size: 0.78rem;
  font-weight: 700;
}

.feeding-game__boost-meta strong {
  color: #0c86ab;
  font-size: 0.82rem;
}

.feeding-game__boost-track {
  position: relative;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(6, 52, 84, 0.18);
}

.feeding-game__boost-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #14b8ff, #a1fff0);
}

.feeding-game__lives {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 14px;
}

.feeding-game__heart {
  font-size: 20px;
  color: #ff667d;
  text-shadow: 0 0 10px rgba(255, 102, 125, 0.24);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.feeding-game__heart.is-lost {
  opacity: 0.18;
  transform: scale(0.78);
  text-shadow: none;
}

.feeding-game__frame {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(19, 92, 138, 0.12);
  box-shadow: 0 24px 44px rgba(12, 58, 96, 0.18);
}

.feeding-game__frame.is-hit {
  animation: feeding-hit 0.26s ease;
}

@keyframes feeding-hit {
  0%,
  100% {
    transform: translate(0);
  }

  20% {
    transform: translate(-5px, 2px);
  }

  40% {
    transform: translate(5px, -2px);
  }

  60% {
    transform: translate(-3px, 2px);
  }

  80% {
    transform: translate(3px, -1px);
  }
}

.feeding-game__canvas {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  background: #08223d;
  cursor: crosshair;
}

.feeding-game__modal {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(4, 20, 36, 0.72);
  backdrop-filter: blur(8px);
}

.feeding-game__modal-box {
  display: grid;
  gap: 8px;
  padding: 34px 44px;
  text-align: center;
}

.feeding-game__modal-title {
  margin: 0;
  color: #dffaff;
  font-size: 2.2rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-shadow: 0 0 26px rgba(126, 232, 255, 0.3);
}

.feeding-game__modal-sub {
  margin: 0;
  color: rgba(233, 247, 255, 0.78);
  line-height: 1.7;
  max-width: 28rem;
}

.feeding-game__modal-score {
  margin: 8px 0 0;
  color: #84f4d1;
  font-size: 2rem;
  font-weight: 900;
}

.feeding-game__modal-hint {
  margin: 10px 0 0;
  color: rgba(227, 245, 255, 0.46);
  font-size: 0.86rem;
}

.feeding-game__bar {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
}

.feeding-game__actions,
.feeding-game__keys {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.feeding-game__button {
  border: 1px solid var(--blog-line);
  border-radius: 999px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--blog-ink);
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.feeding-game__button:hover {
  transform: translateY(-1px);
  border-color: rgba(20, 184, 255, 0.28);
}

.feeding-game__button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}

.feeding-game__button--primary {
  color: #f6fffd;
  border-color: transparent;
  background: linear-gradient(135deg, #0bb4ff, #5bf0d0);
  box-shadow: 0 16px 28px rgba(11, 180, 255, 0.22);
}

.feeding-game__key {
  color: var(--text-secondary);
  font-size: 0.76rem;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--blog-line);
  background: rgba(255, 255, 255, 0.04);
}

@media (max-width: 980px) {
  .feeding-game__top {
    flex-direction: column;
  }

  .feeding-game__headline,
  .feeding-game__stats {
    width: 100%;
    max-width: none;
  }

  .feeding-game__stats {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .feeding-game__modal-box {
    padding: 28px 24px;
  }

  .feeding-game__modal-title {
    font-size: 1.8rem;
  }
}
</style>
