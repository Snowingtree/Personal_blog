<template>
  <div class="tetris-game">
    <div class="tetris-game__top">
      <div class="tetris-game__headline">
        <div class="tetris-game__badge">
          <span class="tetris-game__badge-icon">T</span>
          <span class="tetris-game__badge-text">ETRIS</span>
        </div>
        <div class="tetris-game__status">
          <span class="tetris-game__status-label">{{ stateLabel }}</span>
          <p>{{ stateCopy }}</p>
        </div>
      </div>

      <div class="tetris-game__stats">
        <div class="tetris-game__stat">
          <span class="tetris-game__stat-n">{{ score }}</span>
          <span class="tetris-game__stat-l">SCORE</span>
        </div>
        <div class="tetris-game__stat">
          <span class="tetris-game__stat-n">{{ bestScore }}</span>
          <span class="tetris-game__stat-l">BEST</span>
        </div>
        <div class="tetris-game__stat">
          <span class="tetris-game__stat-n">{{ level }}</span>
          <span class="tetris-game__stat-l">LV</span>
        </div>
        <div class="tetris-game__stat">
          <span class="tetris-game__stat-n">{{ lines }}</span>
          <span class="tetris-game__stat-l">LINES</span>
        </div>
      </div>
    </div>

    <div class="tetris-game__layout">
      <div class="tetris-game__frame" :class="{ 'is-shaking': shaking, 'is-levelup': levelUp }">
        <canvas ref="canvasRef" class="tetris-game__canvas" />
        <div
          v-for="pop in scorePopups"
          :key="pop.id"
          class="tetris-game__score-pop"
          :style="{ left: '50%', top: `${pop.y}%` }"
        >
          +{{ pop.val }}
        </div>

        <div v-if="gameState !== 'playing'" class="tetris-game__modal">
          <div class="tetris-game__modal-box">
            <template v-if="gameState === 'over'">
              <p class="tetris-game__modal-title">GAME OVER</p>
              <p class="tetris-game__modal-score">{{ score }}</p>
            </template>
            <template v-else-if="gameState === 'paused'">
              <p class="tetris-game__modal-title">PAUSED</p>
            </template>
            <template v-else>
              <p class="tetris-game__modal-title">TETRIS</p>
              <p class="tetris-game__modal-sub">先稳住地基，再找连续消行的窗口。</p>
            </template>
            <p class="tetris-game__modal-hint">{{ modalHint }}</p>
          </div>
        </div>
      </div>

      <div class="tetris-game__side">
        <div class="tetris-game__side-box">
          <span class="tetris-game__side-lbl">NEXT</span>
          <canvas ref="nextRef" class="tetris-game__preview" />
        </div>
        <div class="tetris-game__side-box">
          <span class="tetris-game__side-lbl">HOLD</span>
          <canvas ref="holdRef" class="tetris-game__preview" />
        </div>

        <div class="tetris-game__actions">
          <button
            type="button"
            class="tetris-game__button tetris-game__button--primary"
            :disabled="gameState === 'playing'"
            @click="handlePrimaryAction"
          >
            {{ primaryActionLabel }}
          </button>
          <button type="button" class="tetris-game__button" @click="togglePause">
            {{ gameState === 'paused' ? '继续' : '暂停' }}
          </button>
          <button type="button" class="tetris-game__button" @click="restartGame()">重开</button>
        </div>
      </div>
    </div>

    <div class="tetris-game__footer">
      <div class="tetris-game__chips">
        <span class="tetris-game__chip">节奏 {{ paceLabel }}</span>
        <span class="tetris-game__chip">锁定延迟 {{ lockDelayLabel }}</span>
        <span class="tetris-game__chip">7-Bag 发牌</span>
      </div>

      <div class="tetris-game__bar">
        <span class="tetris-game__key">← → 移动</span>
        <span class="tetris-game__key">↑ / X 顺时针</span>
        <span class="tetris-game__key">Z 逆时针</span>
        <span class="tetris-game__key">↓ 软降</span>
        <span class="tetris-game__key">Space 硬降</span>
        <span class="tetris-game__key">C 暂存</span>
        <span class="tetris-game__key">P 暂停</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const BEST_SCORE_KEY = 'vibe-games-tetris-best'
const COLS = 10
const ROWS = 20
const CELL = 30
const LOCK_DELAY = 420
const PREVIEW_SIZE = 22

const canvasRef = ref(null)
const nextRef = ref(null)
const holdRef = ref(null)
const score = ref(0)
const bestScore = ref(readStoredBestScore())
const level = ref(1)
const lines = ref(0)
const gameState = ref('ready')
const scorePopups = ref([])
const shaking = ref(false)
const levelUp = ref(false)

const stateLabel = computed(() => {
  if (gameState.value === 'playing') return '堆叠进行中'
  if (gameState.value === 'paused') return '先看局面'
  if (gameState.value === 'over') return '堆叠失守'
  return '准备开局'
})

const stateCopy = computed(() => {
  if (gameState.value === 'playing') return '保留平整地基，硬降时机比速度更重要。'
  if (gameState.value === 'paused') return '看准井口和高差，再决定恢复后的第一步。'
  if (gameState.value === 'over') return '下一局先稳住中央，不要过早封死侧边。'
  return '现在支持硬降、锁定延迟和更稳定的发牌序列。'
})

const modalHint = computed(() => {
  if (gameState.value === 'over') return '按 Enter 立即重开，P 可以暂停'
  if (gameState.value === 'paused') return '按 P 或继续按钮恢复'
  return '按 Enter 开始，Space 是硬降，P 暂停'
})

const primaryActionLabel = computed(() => {
  if (gameState.value === 'playing') return '进行中'
  if (gameState.value === 'over') return '再来一局'
  if (gameState.value === 'paused') return '继续'
  return '开始'
})

const paceLabel = computed(() => `${Math.max(1, Math.round(1000 / getSpeed()))} 格/秒`)
const lockDelayLabel = `${LOCK_DELAY}ms`

const SHAPES = [
  { b: [[0, 1], [1, 1], [2, 1], [3, 1]], c: '#00e5ff', n: 'I' },
  { b: [[0, 0], [1, 0], [0, 1], [1, 1]], c: '#ffea00', n: 'O' },
  { b: [[1, 0], [0, 1], [1, 1], [2, 1]], c: '#d500f9', n: 'T' },
  { b: [[1, 0], [2, 0], [0, 1], [1, 1]], c: '#76ff03', n: 'S' },
  { b: [[0, 0], [1, 0], [1, 1], [2, 1]], c: '#ff1744', n: 'Z' },
  { b: [[0, 0], [0, 1], [1, 1], [2, 1]], c: '#2979ff', n: 'J' },
  { b: [[2, 0], [0, 1], [1, 1], [2, 1]], c: '#ff9100', n: 'L' }
]

let ctx = null
let nextCtx = null
let holdCtx = null
let board = []
let cur = null
let nextPiece = null
let holdPiece = null
let canHold = true
let animationFrame = 0
let dropAccumulator = 0
let lastFrameTime = 0
let flashLines = []
let flashFrames = 0
let particles = []
let popupId = 0
let groundedMs = 0
let bag = []

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
  persistBestScore()
}

function makeBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function refillBag() {
  bag = [...SHAPES]
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]]
  }
}

function nextShape() {
  if (!bag.length) {
    refillBag()
  }

  return normalizePiece(bag.pop())
}

function normalizePiece(shape) {
  return {
    b: shape.b.map(([x, y]) => [x, y]),
    c: shape.c,
    n: shape.n,
    x: Math.floor(COLS / 2) - 2,
    y: -1
  }
}

function clonePiece(piece) {
  return {
    ...piece,
    b: piece.b.map(([x, y]) => [x, y])
  }
}

function hits(piece, targetBoard) {
  return piece.b.some(([bx, by]) => {
    const x = piece.x + bx
    const y = piece.y + by

    return x < 0 || x >= COLS || y >= ROWS || (y >= 0 && targetBoard[y][x])
  })
}

function lockPiece(piece, targetBoard) {
  piece.b.forEach(([bx, by]) => {
    const x = piece.x + bx
    const y = piece.y + by

    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
      targetBoard[y][x] = piece.c
    }
  })
}

function getFilledLines(targetBoard) {
  const result = []

  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (targetBoard[row].every((cell) => cell !== null)) {
      result.push(row)
    }
  }

  if (result.length) {
    flashLines = result
    flashFrames = 12
  }

  return result
}

function ghostY() {
  let nextY = cur.y

  while (!hits({ ...cur, y: nextY + 1 }, board)) {
    nextY += 1
  }

  return nextY
}

function lighten(hex, percentage) {
  let red = parseInt(hex.slice(1, 3), 16)
  let green = parseInt(hex.slice(3, 5), 16)
  let blue = parseInt(hex.slice(5, 7), 16)

  red = Math.min(255, red + Math.round((255 - red) * percentage / 100))
  green = Math.min(255, green + Math.round((255 - green) * percentage / 100))
  blue = Math.min(255, blue + Math.round((255 - blue) * percentage / 100))

  return `rgb(${red}, ${green}, ${blue})`
}

function darken(hex, percentage) {
  let red = parseInt(hex.slice(1, 3), 16)
  let green = parseInt(hex.slice(3, 5), 16)
  let blue = parseInt(hex.slice(5, 7), 16)

  red = Math.max(0, red - Math.round(red * percentage / 100))
  green = Math.max(0, green - Math.round(green * percentage / 100))
  blue = Math.max(0, blue - Math.round(blue * percentage / 100))

  return `rgb(${red}, ${green}, ${blue})`
}

function drawBlock(x, y, color, size = CELL, ghost = false) {
  if (ghost) {
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.25
    ctx.strokeRect(x * size + 3, y * size + 3, size - 6, size - 6)
    ctx.globalAlpha = 1
    return
  }

  const gradient = ctx.createLinearGradient(x * size, y * size, x * size, y * size + size)
  gradient.addColorStop(0, lighten(color, 30))
  gradient.addColorStop(0.52, color)
  gradient.addColorStop(1, darken(color, 25))

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.roundRect(x * size + 1, y * size + 1, size - 2, size - 2, 5)
  ctx.fill()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.beginPath()
  ctx.roundRect(x * size + 3, y * size + 2, size - 6, (size - 4) * 0.4, 3)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 1
  ctx.strokeRect(x * size + 2, y * size + 2, size - 4, size - 4)
}

function drawPreviewBlock(targetCtx, x, y, color, size) {
  const gradient = targetCtx.createLinearGradient(x * size, y * size, x * size, y * size + size)
  gradient.addColorStop(0, lighten(color, 20))
  gradient.addColorStop(1, darken(color, 15))

  targetCtx.fillStyle = gradient
  targetCtx.beginPath()
  targetCtx.roundRect(x * size + 1, y * size + 1, size - 2, size - 2, 3)
  targetCtx.fill()

  targetCtx.fillStyle = 'rgba(255, 255, 255, 0.15)'
  targetCtx.beginPath()
  targetCtx.roundRect(x * size + 2, y * size + 2, size - 4, (size - 4) * 0.4, 2)
  targetCtx.fill()
}

function drawPreview(targetCtx, piece, canvas) {
  if (!targetCtx || !canvas) {
    return
  }

  targetCtx.clearRect(0, 0, canvas.width, canvas.height)
  targetCtx.fillStyle = '#090b1c'
  targetCtx.fillRect(0, 0, canvas.width, canvas.height)

  if (!piece) {
    return
  }

  const xs = piece.b.map(([x]) => x)
  const ys = piece.b.map(([, y]) => y)
  const width = Math.max(...xs) - Math.min(...xs) + 1
  const height = Math.max(...ys) - Math.min(...ys) + 1
  const offsetX = (4 - width) / 2 - Math.min(...xs)
  const offsetY = (4 - height) / 2 - Math.min(...ys)

  piece.b.forEach(([bx, by]) => {
    drawPreviewBlock(targetCtx, bx + offsetX, by + offsetY, piece.c, PREVIEW_SIZE)
  })
}

function rotateBlocks(blocks, direction = 1) {
  const size = Math.max(...blocks.flat()) + 1

  return blocks.map(([x, y]) =>
    direction === 1 ? [size - 1 - y, x] : [y, size - 1 - x]
  )
}

function updatePreviewPanels() {
  drawPreview(nextCtx, nextPiece, nextRef.value)
  drawPreview(holdCtx, holdPiece, holdRef.value)
}

function spawnPiece() {
  cur = nextPiece ?? nextShape()
  nextPiece = nextShape()
  canHold = true
  groundedMs = 0
  updatePreviewPanels()

  if (hits(cur, board)) {
    endGame()
  }
}

function movePiece(deltaX, deltaY) {
  const nextPieceState = clonePiece(cur)
  nextPieceState.x += deltaX
  nextPieceState.y += deltaY

  if (hits(nextPieceState, board)) {
    return false
  }

  cur = nextPieceState

  if (!hits({ ...cur, y: cur.y + 1 }, board)) {
    groundedMs = 0
  }

  return true
}

function clearLineEffects(clearedLines, color) {
  clearedLines.forEach((row) => {
    for (let column = 0; column < COLS; column += 1) {
      for (let index = 0; index < 4; index += 1) {
        particles.push({
          x: column * CELL + CELL / 2,
          y: row * CELL + CELL / 2,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10 - 3,
          life: 1,
          color,
          r: Math.random() * 3 + 1
        })
      }
    }
  })
}

function finalizePiece() {
  lockPiece(cur, board)
  groundedMs = 0
  const clearedLines = getFilledLines(board)

  if (clearedLines.length) {
    clearLineEffects(clearedLines, cur.c)
    const points = [0, 100, 300, 500, 800]
    const gainedScore = (points[clearedLines.length] || 0) * level.value
    const previousLevel = level.value

    score.value += gainedScore
    lines.value += clearedLines.length
    level.value = Math.floor(lines.value / 10) + 1
    setBestScore(score.value)

    scorePopups.value.push({
      id: popupId,
      y: 28 + clearedLines.length * 5,
      val: gainedScore
    })
    const popupIdSnapshot = popupId
    popupId += 1

    window.setTimeout(() => {
      scorePopups.value = scorePopups.value.filter((popup) => popup.id !== popupIdSnapshot)
    }, 900)

    shaking.value = true
    window.setTimeout(() => {
      shaking.value = false
    }, 300)

    if (level.value > previousLevel) {
      levelUp.value = true
      window.setTimeout(() => {
        levelUp.value = false
      }, 620)
    }
  }

  spawnPiece()
}

function hardDrop() {
  if (gameState.value !== 'playing') {
    return
  }

  let distanceDropped = 0

  while (movePiece(0, 1)) {
    distanceDropped += 1
  }

  if (distanceDropped > 0) {
    score.value += distanceDropped * 2
    setBestScore(score.value)
  }

  finalizePiece()
}

function softDrop() {
  if (gameState.value !== 'playing') {
    return
  }

  if (movePiece(0, 1)) {
    score.value += 1
    setBestScore(score.value)
  }
}

function rotateCurrent(direction = 1) {
  if (!cur) {
    return false
  }

  const rotatedBlocks = rotateBlocks(cur.b, direction)
  const kicks = [0, -1, 1, -2, 2]

  for (const kick of kicks) {
    const nextPieceState = {
      ...cur,
      x: cur.x + kick,
      b: rotatedBlocks.map(([x, y]) => [x, y])
    }

    if (hits(nextPieceState, board)) {
      continue
    }

    cur = nextPieceState

    if (!hits({ ...cur, y: cur.y + 1 }, board)) {
      groundedMs = 0
    }

    return true
  }

  return false
}

function getPieceByName(name) {
  return normalizePiece(SHAPES.find((shape) => shape.n === name))
}

function holdCurrent() {
  if (gameState.value !== 'playing' || !canHold) {
    return
  }

  canHold = false

  if (holdPiece) {
    const previousHold = holdPiece
    holdPiece = getPieceByName(cur.n)
    cur = getPieceByName(previousHold.n)
  } else {
    holdPiece = getPieceByName(cur.n)
    cur = nextPiece
    nextPiece = nextShape()
  }

  groundedMs = 0
  updatePreviewPanels()

  if (hits(cur, board)) {
    endGame()
  }
}

function getSpeed() {
  return Math.max(60, 820 - (level.value - 1) * 62)
}

function draw() {
  if (!ctx) {
    return
  }

  const width = COLS * CELL
  const height = ROWS * CELL
  const background = ctx.createLinearGradient(0, 0, 0, height)
  background.addColorStop(0, '#080918')
  background.addColorStop(1, '#141732')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
  ctx.lineWidth = 1
  for (let x = 0; x <= COLS; x += 1) {
    ctx.beginPath()
    ctx.moveTo(x * CELL, 0)
    ctx.lineTo(x * CELL, height)
    ctx.stroke()
  }

  for (let y = 0; y <= ROWS; y += 1) {
    ctx.beginPath()
    ctx.moveTo(0, y * CELL)
    ctx.lineTo(width, y * CELL)
    ctx.stroke()
  }

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLS; column += 1) {
      if (!board[row][column]) {
        continue
      }

      if (flashLines.includes(row) && flashFrames > 0) {
        ctx.globalAlpha = flashFrames / 12
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(column * CELL, row * CELL, CELL, CELL)
        ctx.globalAlpha = 1
      } else {
        drawBlock(column, row, board[row][column])
      }
    }
  }

  if (cur && gameState.value === 'playing') {
    const nextGhostY = ghostY()
    if (nextGhostY !== cur.y) {
      cur.b.forEach(([bx, by]) => {
        drawBlock(cur.x + bx, nextGhostY + by, cur.c, CELL, true)
      })
    }
  }

  if (cur && gameState.value !== 'over') {
    cur.b.forEach(([bx, by]) => {
      drawBlock(cur.x + bx, cur.y + by, cur.c)
    })
  }

  particles.forEach((particle) => {
    ctx.globalAlpha = particle.life
    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

function updateParticles(deltaMs) {
  const deltaFactor = deltaMs / 16
  particles = particles.filter((particle) => {
    particle.x += particle.vx * deltaFactor
    particle.y += particle.vy * deltaFactor
    particle.vy += 0.2 * deltaFactor
    particle.life -= 0.03 * deltaFactor
    particle.r *= Math.pow(0.98, deltaFactor)
    return particle.life > 0
  })
}

function applyFlashedLines() {
  if (flashFrames > 0) {
    flashFrames -= 1

    if (flashFrames === 0) {
      ;[...flashLines]
        .sort((left, right) => left - right)
        .forEach((row) => {
          board.splice(row, 1)
          board.unshift(Array(COLS).fill(null))
        })

      flashLines = []
    }
  }
}

function startGame() {
  if (gameState.value === 'playing') {
    return
  }

  if (gameState.value === 'over') {
    restartGame(true)
    return
  }

  gameState.value = 'playing'
  lastFrameTime = 0
  dropAccumulator = 0
}

function pauseGame() {
  if (gameState.value !== 'playing') {
    return
  }

  gameState.value = 'paused'
}

function togglePause() {
  if (gameState.value === 'ready' || gameState.value === 'over') {
    return
  }

  if (gameState.value === 'playing') {
    pauseGame()
    return
  }

  startGame()
}

function endGame() {
  gameState.value = 'over'
  setBestScore(score.value)
}

function resetGameState() {
  board = makeBoard()
  cur = null
  nextPiece = nextShape()
  holdPiece = null
  canHold = true
  dropAccumulator = 0
  flashLines = []
  flashFrames = 0
  particles = []
  popupId = 0
  groundedMs = 0
  score.value = 0
  level.value = 1
  lines.value = 0
  scorePopups.value = []
  spawnPiece()
  updatePreviewPanels()
  draw()
}

function restartGame(autoStart = false) {
  resetGameState()
  gameState.value = autoStart ? 'playing' : 'ready'
  lastFrameTime = 0
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
    restartGame(true)
  }
}

function loop(timestamp) {
  const deltaMs = lastFrameTime ? Math.min(timestamp - lastFrameTime, 48) : 16
  lastFrameTime = timestamp

  if (gameState.value === 'playing') {
    if (flashFrames > 0) {
      applyFlashedLines()
    } else {
      dropAccumulator += deltaMs
      const speed = getSpeed()

      while (dropAccumulator >= speed) {
        dropAccumulator -= speed
        if (!movePiece(0, 1)) {
          dropAccumulator = 0
          break
        }
      }

      const isGrounded = cur ? hits({ ...cur, y: cur.y + 1 }, board) : false
      groundedMs = isGrounded ? groundedMs + deltaMs : 0

      if (isGrounded && groundedMs >= LOCK_DELAY) {
        finalizePiece()
      }
    }
  } else if (flashFrames > 0) {
    applyFlashedLines()
  }

  updateParticles(deltaMs)
  draw()
  animationFrame = window.requestAnimationFrame(loop)
}

function onKey(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    handlePrimaryAction()
    return
  }

  if (event.key === 'p' || event.key === 'P') {
    event.preventDefault()
    if (gameState.value === 'playing' || gameState.value === 'paused') {
      togglePause()
    }
    return
  }

  if (event.key === 'c' || event.key === 'C') {
    event.preventDefault()
    holdCurrent()
    return
  }

  if (event.key === ' ') {
    event.preventDefault()
    if (gameState.value === 'playing') {
      hardDrop()
    }
    return
  }

  if (gameState.value === 'ready' && ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'x', 'X', 'z', 'Z'].includes(event.key)) {
    startGame()
  }

  if (gameState.value !== 'playing') {
    return
  }

  if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault()
  }

  switch (event.key) {
    case 'ArrowLeft':
      movePiece(-1, 0)
      break
    case 'ArrowRight':
      movePiece(1, 0)
      break
    case 'ArrowDown':
      softDrop()
      break
    case 'ArrowUp':
    case 'x':
    case 'X':
      rotateCurrent(1)
      break
    case 'z':
    case 'Z':
      rotateCurrent(-1)
      break
    default:
      break
  }
}

onMounted(() => {
  const boardCanvas = canvasRef.value
  boardCanvas.width = COLS * CELL
  boardCanvas.height = ROWS * CELL
  ctx = boardCanvas.getContext('2d')

  const nextCanvas = nextRef.value
  nextCanvas.width = 4 * PREVIEW_SIZE + 4
  nextCanvas.height = 4 * PREVIEW_SIZE + 4
  nextCtx = nextCanvas.getContext('2d')

  const holdCanvas = holdRef.value
  holdCanvas.width = 4 * PREVIEW_SIZE + 4
  holdCanvas.height = 4 * PREVIEW_SIZE + 4
  holdCtx = holdCanvas.getContext('2d')

  restartGame(false)
  animationFrame = window.requestAnimationFrame(loop)
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
.tetris-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  width: 100%;
}

.tetris-game__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  width: 100%;
}

.tetris-game__headline {
  display: grid;
  gap: 10px;
}

.tetris-game__badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.tetris-game__badge-icon {
  font-size: 28px;
  font-weight: 900;
  color: #d500f9;
  letter-spacing: -0.02em;
  text-shadow: 0 0 20px rgba(213, 0, 249, 0.4);
}

.tetris-game__badge-text {
  font-size: 18px;
  font-weight: 700;
  color: rgba(213, 0, 249, 0.52);
  letter-spacing: 0.15em;
}

.tetris-game__status {
  display: grid;
  gap: 4px;
}

.tetris-game__status-label {
  color: var(--blog-ink);
  font-size: 0.96rem;
  font-weight: 700;
}

.tetris-game__status p {
  margin: 0;
  color: var(--blog-muted);
  line-height: 1.6;
}

.tetris-game__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  min-width: min(100%, 420px);
}

.tetris-game__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid rgba(213, 0, 249, 0.12);
  border-radius: 14px;
  background: rgba(213, 0, 249, 0.06);
}

.tetris-game__stat-n {
  color: #d500f9;
  font-size: 22px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.tetris-game__stat-l {
  margin-top: 4px;
  color: var(--blog-muted);
  font-size: 0.68rem;
  letter-spacing: 0.2em;
}

.tetris-game__layout {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

.tetris-game__frame {
  position: relative;
  width: min(100%, 300px);
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 16px 34px rgba(213, 0, 249, 0.12),
    0 0 0 1px rgba(213, 0, 249, 0.08);
}

.tetris-game__canvas {
  display: block;
  width: 100%;
  height: auto;
}

.tetris-game__modal {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(9, 9, 24, 0.88);
  backdrop-filter: blur(10px);
}

.tetris-game__modal-box {
  display: grid;
  gap: 10px;
  padding: 32px 36px;
  text-align: center;
}

.tetris-game__modal-title,
.tetris-game__modal-score,
.tetris-game__modal-sub,
.tetris-game__modal-hint {
  margin: 0;
}

.tetris-game__modal-title {
  color: #d500f9;
  font-size: clamp(2.2rem, 7vw, 3.4rem);
  font-weight: 900;
  letter-spacing: 0.08em;
  text-shadow: 0 0 30px rgba(213, 0, 249, 0.5);
}

.tetris-game__modal-score {
  color: #ffffff;
  font-size: 3rem;
  font-weight: 900;
}

.tetris-game__modal-sub {
  color: rgba(255, 255, 255, 0.48);
}

.tetris-game__modal-hint {
  color: rgba(255, 255, 255, 0.34);
  line-height: 1.65;
}

.tetris-game__side {
  display: grid;
  gap: 12px;
  min-width: 160px;
}

.tetris-game__side-box,
.tetris-game__actions {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid rgba(213, 0, 249, 0.08);
  border-radius: 14px;
  background: rgba(213, 0, 249, 0.04);
}

.tetris-game__side-lbl {
  color: var(--blog-muted);
  font-size: 0.68rem;
  letter-spacing: 0.18em;
}

.tetris-game__preview {
  width: 92px;
  height: 92px;
  border-radius: 8px;
}

.tetris-game__actions {
  padding: 0;
  border: 0;
  background: transparent;
}

.tetris-game__button {
  border: 1px solid var(--blog-line);
  border-radius: 999px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--blog-ink);
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.tetris-game__button:hover {
  transform: translateY(-1px);
  border-color: rgba(213, 0, 249, 0.24);
}

.tetris-game__button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}

.tetris-game__button--primary {
  border-color: transparent;
  color: #fff7ff;
  background: linear-gradient(135deg, #9900bd 0%, #d500f9 100%);
  box-shadow: 0 14px 26px rgba(153, 0, 189, 0.22);
}

.tetris-game__footer {
  display: grid;
  gap: 12px;
}

.tetris-game__chips,
.tetris-game__bar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tetris-game__chip,
.tetris-game__key {
  padding: 8px 12px;
  border: 1px solid var(--blog-line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--blog-copy);
  font-size: 0.84rem;
}

.tetris-game__frame.is-shaking {
  animation: tetris-shake 0.3s ease;
}

.tetris-game__frame.is-levelup {
  box-shadow:
    0 16px 34px rgba(213, 0, 249, 0.16),
    0 0 0 1px rgba(213, 0, 249, 0.08),
    0 0 44px rgba(213, 0, 249, 0.22);
  animation: tetris-levelup 0.62s ease;
}

@keyframes tetris-shake {
  0%,
  100% {
    transform: translate(0);
  }

  15% {
    transform: translate(-3px, 2px);
  }

  30% {
    transform: translate(3px, -2px);
  }

  45% {
    transform: translate(-2px, 3px);
  }

  60% {
    transform: translate(2px, -1px);
  }

  75% {
    transform: translate(-1px, 1px);
  }
}

@keyframes tetris-levelup {
  0% {
    box-shadow:
      0 16px 34px rgba(213, 0, 249, 0.16),
      0 0 0 1px rgba(213, 0, 249, 0.08),
      0 0 58px rgba(213, 0, 249, 0.34);
  }

  50% {
    box-shadow:
      0 16px 34px rgba(213, 0, 249, 0.16),
      0 0 0 1px rgba(213, 0, 249, 0.08),
      0 0 82px rgba(213, 0, 249, 0.46);
  }

  100% {
    box-shadow:
      0 16px 34px rgba(213, 0, 249, 0.16),
      0 0 0 1px rgba(213, 0, 249, 0.08),
      0 0 44px rgba(213, 0, 249, 0.22);
  }
}

.tetris-game__score-pop {
  position: absolute;
  z-index: 2;
  transform: translateX(-50%);
  color: #d500f9;
  font-size: 24px;
  font-weight: 900;
  text-shadow: 0 0 15px rgba(213, 0, 249, 0.6);
  pointer-events: none;
  white-space: nowrap;
  animation: tetris-pop 0.9s ease forwards;
}

@keyframes tetris-pop {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(0.82);
  }

  30% {
    opacity: 1;
    transform: translateX(-50%) translateY(-18px) scale(1.26);
  }

  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-56px) scale(0.64);
  }
}

@media (max-width: 960px) {
  .tetris-game__top,
  .tetris-game__layout {
    display: grid;
  }

  .tetris-game__stats {
    min-width: 0;
  }

  .tetris-game__side {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    min-width: 0;
  }
}

@media (max-width: 620px) {
  .tetris-game__stats,
  .tetris-game__side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tetris-game__preview {
    width: 100%;
    height: auto;
    aspect-ratio: 1 / 1;
  }

  .tetris-game__modal-box {
    padding: 24px 24px;
  }
}
</style>
