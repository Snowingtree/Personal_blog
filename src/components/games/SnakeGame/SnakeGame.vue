<template>
  <div class="snake-game">
    <div class="snake-game__top">
      <div class="snake-game__headline">
        <div class="snake-game__badge">
          <span class="snake-game__badge-icon">S</span>
          <span class="snake-game__badge-text">NAKE</span>
        </div>
        <div class="snake-game__status">
          <span class="snake-game__status-label">{{ stateLabel }}</span>
          <p>{{ stateCopy }}</p>
        </div>
      </div>

      <div class="snake-game__scores">
        <div class="snake-game__score-card">
          <span class="snake-game__score-num">{{ score }}</span>
          <span class="snake-game__score-lbl">SCORE</span>
        </div>
        <div class="snake-game__score-card snake-game__score-card--best">
          <span class="snake-game__score-num">{{ bestScore }}</span>
          <span class="snake-game__score-lbl">BEST</span>
        </div>
      </div>
    </div>

    <div class="snake-game__frame" :class="{ 'is-shaking': shaking }">
      <canvas ref="canvasRef" class="snake-game__canvas" />
      <div
        v-for="pop in scorePopups"
        :key="pop.id"
        class="snake-game__score-pop"
        :style="{ left: `${pop.x}px`, top: `${pop.y}px` }"
      >
        +{{ pop.val }}
      </div>

      <div v-if="gameState !== 'playing'" class="snake-game__modal">
        <div class="snake-game__modal-box">
          <template v-if="gameState === 'over'">
            <p class="snake-game__modal-title">GAME OVER</p>
            <p class="snake-game__modal-score">{{ score }} 分</p>
            <p v-if="isNewBestRun" class="snake-game__modal-best">新的最高分</p>
          </template>
          <template v-else-if="gameState === 'paused'">
            <p class="snake-game__modal-title">PAUSED</p>
          </template>
          <template v-else>
            <p class="snake-game__modal-title">SNAKE</p>
            <p class="snake-game__modal-sub">把路线盘干净，再让速度慢慢抬起来。</p>
          </template>
          <p class="snake-game__modal-hint">{{ modalHint }}</p>
        </div>
      </div>
    </div>

    <div class="snake-game__footer">
      <div class="snake-game__chips">
        <span class="snake-game__chip">长度 {{ snakeLen }}</span>
        <span class="snake-game__chip">速度 {{ speedLabel }}</span>
        <span class="snake-game__chip">方向键 / WASD</span>
      </div>

      <div class="snake-game__actions">
        <button
          type="button"
          class="snake-game__button snake-game__button--primary"
          :disabled="gameState === 'playing'"
          @click="handlePrimaryAction"
        >
          {{ primaryActionLabel }}
        </button>
        <button
          type="button"
          class="snake-game__button"
          :disabled="gameState === 'ready' || gameState === 'over'"
          @click="togglePause"
        >
          {{ gameState === 'paused' ? '继续' : '暂停' }}
        </button>
        <button type="button" class="snake-game__button" @click="restart()">重开</button>
      </div>
    </div>

    <div class="snake-game__bar">
      <span class="snake-game__info">Enter 开始</span>
      <span class="snake-game__info">P / 空格 暂停</span>
      <span class="snake-game__info">撞墙或撞到自己结束</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const BEST_SCORE_KEY = 'vibe-games-snake-best'
const GRID = 20
const CELL = 26
const SIZE = GRID * CELL
const INITIAL_SNAKE = [
  { x: 5, y: 10 },
  { x: 4, y: 10 },
  { x: 3, y: 10 }
]

const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  W: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
  A: { x: -1, y: 0 },
  D: { x: 1, y: 0 }
}

const canvasRef = ref(null)
const score = ref(0)
const bestScore = ref(readStoredBestScore())
const snakeLen = ref(3)
const gameState = ref('ready')
const scorePopups = ref([])
const shaking = ref(false)
const isNewBestRun = ref(false)

const speedMs = computed(() =>
  Math.max(78, 146 - Math.floor(score.value / 20) * 6 - (snakeLen.value - 3) * 2)
)
const speedLabel = computed(() => `${(1000 / speedMs.value).toFixed(1)} 格/秒`)

const stateLabel = computed(() => {
  if (gameState.value === 'playing') return '节奏已接上'
  if (gameState.value === 'paused') return '暂时停表'
  if (gameState.value === 'over') return '失误出局'
  return '准备开局'
})

const stateCopy = computed(() => {
  if (gameState.value === 'playing') return '先把线路留出来，再去吃下一颗。'
  if (gameState.value === 'paused') return '继续前先看一眼头部走向。'
  if (gameState.value === 'over') return '下一局优先抢中段空间。'
  return '方向键起手，前几口先不要把自己逼进角落。'
})

const modalHint = computed(() => {
  if (gameState.value === 'over') return '按 Enter 或方向键立即重开'
  if (gameState.value === 'paused') return '按 P / 空格或点继续按钮恢复'
  return '按方向键开始，P 或空格可以暂停'
})

const primaryActionLabel = computed(() => {
  if (gameState.value === 'playing') return '进行中'
  if (gameState.value === 'over') return '再来一局'
  if (gameState.value === 'paused') return '继续'
  return '开始'
})

let ctx = null
let snake = []
let food = null
let dir = { x: 1, y: 0 }
let queuedDir = null
let particles = []
let trail = []
let foodAnim = 0
let popupId = 0
let animationFrame = 0
let lastFrameTime = 0
let moveAccumulator = 0

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
    // Ignore storage failures and keep the in-memory best score.
  }
}

function setBestScore(nextScore) {
  if (nextScore <= bestScore.value) {
    return
  }

  bestScore.value = nextScore
  isNewBestRun.value = true
  persistBestScore()
}

function cloneDirection(nextDirection) {
  return { x: nextDirection.x, y: nextDirection.y }
}

function isSameDirection(left, right) {
  return left.x === right.x && left.y === right.y
}

function isOppositeDirection(left, right) {
  return left.x === -right.x && left.y === -right.y
}

function queueDirection(nextDirection) {
  const compareDirection = queuedDir ?? dir

  if (
    isSameDirection(nextDirection, compareDirection) ||
    isOppositeDirection(nextDirection, compareDirection)
  ) {
    return
  }

  queuedDir = cloneDirection(nextDirection)
}

function resetBoard() {
  snake = INITIAL_SNAKE.map((segment) => ({ ...segment }))
  dir = { x: 1, y: 0 }
  queuedDir = null
  particles = []
  trail = []
  foodAnim = 0
  popupId = 0
  moveAccumulator = 0
  lastFrameTime = 0
  scorePopups.value = []
  score.value = 0
  snakeLen.value = snake.length
  isNewBestRun.value = false
  placeFood()
}

function placeFood() {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`))
  let candidate = null

  do {
    candidate = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID)
    }
  } while (occupied.has(`${candidate.x},${candidate.y}`))

  food = candidate
  foodAnim = 0
}

function spawnBurst(x, y, color, count) {
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 5 + 2

    particles.push({
      x: x * CELL + CELL / 2,
      y: y * CELL + CELL / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color,
      r: Math.random() * 3 + 1.5
    })
  }
}

function updateEffects(deltaMs) {
  const deltaFactor = deltaMs / 16

  trail = trail.filter((item) => {
    item.life -= 0.06 * deltaFactor
    return item.life > 0
  })

  particles = particles.filter((particle) => {
    particle.x += particle.vx * deltaFactor
    particle.y += particle.vy * deltaFactor
    particle.vx *= Math.pow(0.96, deltaFactor)
    particle.vy *= Math.pow(0.96, deltaFactor)
    particle.life -= 0.03 * deltaFactor
    particle.r *= Math.pow(0.985, deltaFactor)
    return particle.life > 0
  })
}

function draw() {
  if (!ctx) {
    return
  }

  const background = ctx.createLinearGradient(0, 0, SIZE, SIZE)
  background.addColorStop(0, '#08111f')
  background.addColorStop(0.55, '#101d34')
  background.addColorStop(1, '#18264a')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, SIZE, SIZE)

  for (let x = 0; x <= GRID; x += 1) {
    for (let y = 0; y <= GRID; y += 1) {
      ctx.fillStyle = 'rgba(120, 175, 255, 0.06)'
      ctx.beginPath()
      ctx.arc(x * CELL, y * CELL, 1.05, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  foodAnim += 0.06
  const pulse = Math.sin(foodAnim) * 0.2 + 1
  const foodX = food.x * CELL + CELL / 2
  const foodY = food.y * CELL + CELL / 2
  const foodRadius = (CELL / 2 - 3) * pulse

  ctx.shadowColor = '#ff7fa7'
  ctx.shadowBlur = 24
  const foodGradient = ctx.createRadialGradient(foodX - 2, foodY - 2, 1, foodX, foodY, foodRadius)
  foodGradient.addColorStop(0, '#ffbfd1')
  foodGradient.addColorStop(0.55, '#ff7fa7')
  foodGradient.addColorStop(1, '#f14a84')
  ctx.fillStyle = foodGradient
  ctx.beginPath()
  ctx.arc(foodX, foodY, foodRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)'
  ctx.beginPath()
  ctx.arc(foodX - 3, foodY - 4, foodRadius * 0.28, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = `rgba(255, 127, 167, ${0.16 + Math.sin(foodAnim) * 0.08})`
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(foodX, foodY, foodRadius + 6 + Math.sin(foodAnim) * 2, 0, Math.PI * 2)
  ctx.stroke()

  trail.forEach((item) => {
    ctx.globalAlpha = item.life * 0.18
    ctx.fillStyle = '#4fc3f7'
    ctx.beginPath()
    ctx.roundRect(item.x * CELL + 4, item.y * CELL + 4, CELL - 8, CELL - 8, 5)
    ctx.fill()
  })
  ctx.globalAlpha = 1

  snake.forEach((segment, index) => {
    const isHead = index === 0
    const ratio = index / Math.max(1, snake.length - 1)

    if (isHead) {
      ctx.shadowColor = '#4fc3f7'
      ctx.shadowBlur = 20
      const headGradient = ctx.createRadialGradient(
        segment.x * CELL + CELL / 2 - 2,
        segment.y * CELL + CELL / 2 - 2,
        2,
        segment.x * CELL + CELL / 2,
        segment.y * CELL + CELL / 2,
        CELL / 2
      )
      headGradient.addColorStop(0, '#96e0ff')
      headGradient.addColorStop(0.52, '#4fc3f7')
      headGradient.addColorStop(1, '#0579ca')
      ctx.fillStyle = headGradient
      ctx.beginPath()
      ctx.roundRect(segment.x * CELL + 1, segment.y * CELL + 1, CELL - 2, CELL - 2, 8)
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)'
      ctx.beginPath()
      ctx.roundRect(segment.x * CELL + 4, segment.y * CELL + 3, CELL - 8, CELL * 0.35, 4)
      ctx.fill()

      const eyeOffsetX = dir.x !== 0 ? dir.x * 5 : 0
      const eyeOffsetY = dir.y !== 0 ? dir.y * 5 : 0
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(segment.x * CELL + CELL / 2 + eyeOffsetX - 5, segment.y * CELL + CELL / 2 + eyeOffsetY - 4, 3.5, 0, Math.PI * 2)
      ctx.arc(segment.x * CELL + CELL / 2 + eyeOffsetX + 5, segment.y * CELL + CELL / 2 + eyeOffsetY - 4, 3.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#08111f'
      ctx.beginPath()
      ctx.arc(segment.x * CELL + CELL / 2 + eyeOffsetX - 4, segment.y * CELL + CELL / 2 + eyeOffsetY - 3, 1.8, 0, Math.PI * 2)
      ctx.arc(segment.x * CELL + CELL / 2 + eyeOffsetX + 6, segment.y * CELL + CELL / 2 + eyeOffsetY - 3, 1.8, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const red = Math.round(8 + ratio * 30)
      const green = Math.round(126 + ratio * 72)
      const blue = Math.round(194 + ratio * 46)

      ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`
      ctx.beginPath()
      ctx.roundRect(segment.x * CELL + 2, segment.y * CELL + 2, CELL - 4, CELL - 4, 6)
      ctx.fill()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
      ctx.beginPath()
      ctx.roundRect(segment.x * CELL + 4, segment.y * CELL + 3, CELL - 8, CELL * 0.35, 3)
      ctx.fill()
    }
  })

  particles.forEach((particle) => {
    ctx.globalAlpha = particle.life
    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

function tick() {
  if (queuedDir) {
    dir = cloneDirection(queuedDir)
    queuedDir = null
  }

  const nextHead = {
    x: snake[0].x + dir.x,
    y: snake[0].y + dir.y
  }

  if (
    nextHead.x < 0 ||
    nextHead.x >= GRID ||
    nextHead.y < 0 ||
    nextHead.y >= GRID ||
    snake.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y)
  ) {
    endGame()
    return
  }

  snake.unshift(nextHead)
  trail.push({ x: nextHead.x, y: nextHead.y, life: 1 })

  if (nextHead.x === food.x && nextHead.y === food.y) {
    score.value += 10
    snakeLen.value = snake.length
    setBestScore(score.value)
    spawnBurst(food.x, food.y, '#ff7fa7', 16)

    const rect = canvasRef.value.getBoundingClientRect()
    const scale = rect.width / SIZE
    const popupIdSnapshot = popupId
    scorePopups.value.push({
      id: popupIdSnapshot,
      x: food.x * CELL * scale,
      y: food.y * CELL * scale,
      val: 10
    })
    popupId += 1

    window.setTimeout(() => {
      scorePopups.value = scorePopups.value.filter((popup) => popup.id !== popupIdSnapshot)
    }, 780)

    placeFood()
  } else {
    snake.pop()
    snakeLen.value = snake.length
  }
}

function startGame() {
  if (gameState.value === 'playing') {
    return
  }

  if (gameState.value === 'over') {
    restart('playing')
    return
  }

  gameState.value = 'playing'
  lastFrameTime = 0
  moveAccumulator = 0
}

function pauseGame() {
  if (gameState.value !== 'playing') {
    return
  }

  gameState.value = 'paused'
  moveAccumulator = 0
}

function togglePause() {
  if (gameState.value === 'playing') {
    pauseGame()
    return
  }

  if (gameState.value === 'paused') {
    startGame()
  }
}

function endGame() {
  gameState.value = 'over'
  setBestScore(score.value)
  spawnBurst(snake[0].x, snake[0].y, '#4fc3f7', 26)
  shaking.value = true
  window.setTimeout(() => {
    shaking.value = false
  }, 380)
}

function restart(nextState = 'ready') {
  resetBoard()
  gameState.value = nextState
  if (nextState === 'playing') {
    lastFrameTime = 0
  }
}

function handlePrimaryAction() {
  if (gameState.value === 'ready') {
    startGame()
    return
  }

  if (gameState.value === 'paused') {
    startGame()
    return
  }

  if (gameState.value === 'over') {
    restart('playing')
  }
}

function handleDirectionInput(nextDirection) {
  if (gameState.value === 'over') {
    restart('playing')
  }

  queueDirection(nextDirection)

  if (gameState.value === 'ready') {
    startGame()
  }
}

function onKey(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    handlePrimaryAction()
    return
  }

  if (event.key === 'p' || event.key === 'P' || event.key === ' ') {
    event.preventDefault()
    if (event.key === ' ' && gameState.value === 'ready') {
      startGame()
      return
    }

    togglePause()
    return
  }

  const mappedDirection = DIRECTIONS[event.key]
  if (!mappedDirection) {
    return
  }

  event.preventDefault()
  handleDirectionInput(mappedDirection)
}

function animate(timestamp) {
  const deltaMs = lastFrameTime ? Math.min(timestamp - lastFrameTime, 42) : 16
  lastFrameTime = timestamp

  if (gameState.value === 'playing') {
    moveAccumulator += deltaMs

    while (moveAccumulator >= speedMs.value) {
      moveAccumulator -= speedMs.value
      tick()

      if (gameState.value !== 'playing') {
        moveAccumulator = 0
        break
      }
    }
  }

  updateEffects(deltaMs)
  draw()
  animationFrame = window.requestAnimationFrame(animate)
}

onMounted(() => {
  const canvas = canvasRef.value
  canvas.width = SIZE
  canvas.height = SIZE
  ctx = canvas.getContext('2d')
  resetBoard()
  draw()
  animationFrame = window.requestAnimationFrame(animate)
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame)
  }
})
</script>

<style scoped>
.snake-game {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.snake-game__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  width: 100%;
}

.snake-game__headline {
  display: grid;
  gap: 10px;
}

.snake-game__badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.snake-game__badge-icon {
  font-size: 28px;
  font-weight: 900;
  color: #4fc3f7;
  letter-spacing: -0.02em;
  text-shadow: 0 0 20px rgba(79, 195, 247, 0.4);
}

.snake-game__badge-text {
  font-size: 18px;
  font-weight: 700;
  color: rgba(79, 195, 247, 0.54);
  letter-spacing: 0.15em;
}

.snake-game__status {
  display: grid;
  gap: 4px;
}

.snake-game__status-label {
  color: var(--blog-ink);
  font-size: 0.96rem;
  font-weight: 700;
}

.snake-game__status p {
  margin: 0;
  color: var(--blog-muted);
  line-height: 1.6;
}

.snake-game__scores {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.snake-game__score-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 98px;
  padding: 8px 18px;
  background: rgba(79, 195, 247, 0.06);
  border: 1px solid rgba(79, 195, 247, 0.1);
  border-radius: 14px;
}

.snake-game__score-card--best {
  background: rgba(255, 127, 167, 0.08);
  border-color: rgba(255, 127, 167, 0.16);
}

.snake-game__score-num {
  font-size: 24px;
  font-weight: 900;
  color: #4fc3f7;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.snake-game__score-card--best .snake-game__score-num {
  color: #ff7fa7;
}

.snake-game__score-lbl {
  margin-top: 4px;
  color: var(--blog-muted);
  font-size: 0.68rem;
  letter-spacing: 0.22em;
}

.snake-game__frame {
  position: relative;
  width: min(100%, 520px);
  border-radius: 18px;
  overflow: hidden;
  box-shadow:
    0 18px 40px rgba(8, 17, 31, 0.14),
    0 0 0 1px rgba(79, 195, 247, 0.08),
    inset 0 0 0 1px rgba(255, 255, 255, 0.02);
}

.snake-game__canvas {
  display: block;
  width: 100%;
  height: auto;
}

.snake-game__modal {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(7, 12, 28, 0.82);
  backdrop-filter: blur(10px);
}

.snake-game__modal-box {
  display: grid;
  gap: 10px;
  padding: 32px 40px;
  text-align: center;
}

.snake-game__modal-title {
  margin: 0;
  font-size: clamp(2.3rem, 8vw, 3.7rem);
  font-weight: 900;
  color: #4fc3f7;
  letter-spacing: 0.08em;
  text-shadow: 0 0 30px rgba(79, 195, 247, 0.5);
}

.snake-game__modal-score {
  margin: 0;
  color: #ffffff;
  font-size: 2.8rem;
  font-weight: 900;
}

.snake-game__modal-best {
  margin: 0;
  color: #ff7fa7;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.snake-game__modal-sub,
.snake-game__modal-hint {
  margin: 0;
}

.snake-game__modal-sub {
  color: rgba(255, 255, 255, 0.5);
}

.snake-game__modal-hint {
  color: rgba(255, 255, 255, 0.36);
  line-height: 1.65;
}

.snake-game__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.snake-game__chips,
.snake-game__bar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.snake-game__chip,
.snake-game__info {
  padding: 8px 12px;
  border: 1px solid var(--blog-line);
  border-radius: 999px;
  color: var(--blog-copy);
  background: rgba(255, 255, 255, 0.04);
  font-size: 0.84rem;
}

.snake-game__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.snake-game__button {
  border: 1px solid var(--blog-line);
  border-radius: 999px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--blog-ink);
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.snake-game__button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(79, 195, 247, 0.28);
}

.snake-game__button:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.snake-game__button--primary {
  border-color: transparent;
  color: #eaf9ff;
  background: linear-gradient(135deg, #1487d7 0%, #4fc3f7 100%);
  box-shadow: 0 14px 28px rgba(20, 135, 215, 0.24);
}

.snake-game__frame.is-shaking {
  animation: snake-shake 0.4s ease;
}

@keyframes snake-shake {
  0%,
  100% {
    transform: translate(0);
  }

  10% {
    transform: translate(-4px, 2px);
  }

  20% {
    transform: translate(4px, -2px);
  }

  30% {
    transform: translate(-3px, 3px);
  }

  40% {
    transform: translate(3px, -1px);
  }

  50% {
    transform: translate(-2px, 2px);
  }

  60% {
    transform: translate(2px, -2px);
  }

  70% {
    transform: translate(-1px, 1px);
  }

  80% {
    transform: translate(1px, -1px);
  }
}

.snake-game__score-pop {
  position: absolute;
  z-index: 2;
  color: #ff7fa7;
  font-size: 18px;
  font-weight: 900;
  text-shadow: 0 0 10px rgba(255, 127, 167, 0.5);
  pointer-events: none;
  animation: snake-pop 0.78s ease forwards;
}

@keyframes snake-pop {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  50% {
    opacity: 1;
    transform: translateY(-28px) scale(1.16);
  }

  100% {
    opacity: 0;
    transform: translateY(-48px) scale(0.82);
  }
}

@media (max-width: 860px) {
  .snake-game__top,
  .snake-game__footer {
    display: grid;
  }

  .snake-game__scores {
    justify-content: flex-start;
  }
}

@media (max-width: 620px) {
  .snake-game__modal-box {
    padding: 24px 26px;
  }

  .snake-game__score-card {
    min-width: 84px;
  }

  .snake-game__actions {
    width: 100%;
  }

  .snake-game__button {
    flex: 1;
    justify-content: center;
  }
}
</style>
