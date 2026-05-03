<template>
  <div class="gomoku-game">
    <div class="gomoku-game__top">
      <div class="gomoku-game__headline">
        <div class="gomoku-game__badge">
          <span class="gomoku-game__badge-icon">G</span>
          <span class="gomoku-game__badge-text">OMOKU</span>
        </div>
        <div class="gomoku-game__status-copy">
          <span class="gomoku-game__status-label">{{ statusText }}</span>
          <p>{{ detailText }}</p>
        </div>
      </div>

      <div class="gomoku-game__stats">
        <div class="gomoku-game__stat">
          <span class="gomoku-game__stat-num">{{ moveCount }}</span>
          <span class="gomoku-game__stat-label">手数</span>
        </div>
        <div class="gomoku-game__stat">
          <span class="gomoku-game__stat-num">{{ turnLabel }}</span>
          <span class="gomoku-game__stat-label">回合</span>
        </div>
      </div>
    </div>

    <div class="gomoku-game__hud">
      <div class="gomoku-game__player" :class="{ 'is-active': gameState === 'playing' && currentPlayer === 1 && !winner && !aiThinking }">
        <span class="gomoku-game__stone gomoku-game__stone--black"></span>
        <div class="gomoku-game__player-info">
          <strong>玩家</strong>
          <span>黑棋 · 先手</span>
        </div>
      </div>

      <div class="gomoku-game__player" :class="{ 'is-active': aiThinking || (gameState === 'playing' && currentPlayer === 2 && !winner) }">
        <span class="gomoku-game__stone gomoku-game__stone--white"></span>
        <div class="gomoku-game__player-info">
          <strong>电脑</strong>
          <span>白棋 · 应手</span>
        </div>
      </div>
    </div>

    <div class="gomoku-game__frame">
      <canvas ref="canvasRef" class="gomoku-game__canvas" />
    </div>

    <div class="gomoku-game__footer">
      <div class="gomoku-game__actions">
        <button type="button" class="gomoku-game__button gomoku-game__button--primary" @click="restartGame(false)">
          重新开始
        </button>
        <button type="button" class="gomoku-game__button" @click="restartGame(true)">
          电脑先手
        </button>
      </div>

      <div class="gomoku-game__tips">
        <span class="gomoku-game__tip">鼠标落子</span>
        <span class="gomoku-game__tip">红点标记最近一步</span>
        <span class="gomoku-game__tip">AI 会优先冲五和堵四</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const N = 15
const CELL = 34
const PAD = 30
const CV = (N - 1) * CELL + PAD * 2
const CENTER = Math.floor(N / 2)

const canvasRef = ref(null)
const gameState = ref('ready')
const currentPlayer = ref(1)
const winner = ref(0)
const moveCount = ref(0)
const aiThinking = ref(false)

const statusText = computed(() => {
  if (winner.value === 1) return '你赢了'
  if (winner.value === 2) return '电脑获胜'
  if (gameState.value === 'draw') return '平局'
  if (gameState.value === 'ready') return '点击棋盘开始'
  return aiThinking.value ? '电脑思考中' : currentPlayer.value === 1 ? '轮到你落子' : '电脑回合'
})

const detailText = computed(() => {
  if (winner.value === 1) return '这一局压住了节奏，后手已经来不及补防。'
  if (winner.value === 2) return 'AI 这局先抢到了冲四节奏，下一把可以更早争中心。'
  if (gameState.value === 'draw') return '棋面铺满了，双方都没把五连线先做出来。'
  if (gameState.value === 'ready') return '现在会高亮最近一步，并且优先考虑中心和关键堵点。'
  return aiThinking.value ? '它会先检查有没有直接成五或必须立刻挡住的位置。' : '优先抢中心，再找活三和冲四的延伸。'
})

const turnLabel = computed(() => {
  if (winner.value === 1) return '玩家'
  if (winner.value === 2) return '电脑'
  if (gameState.value === 'draw') return '平局'
  if (aiThinking.value) return '电脑'
  return currentPlayer.value === 1 ? '玩家' : '电脑'
})

let ctx = null
let board = []
let hoverPos = null
let winLine = null
let lastMove = null
let boardBackdrop = null
let ripples = []
let winParticles = []
let animationFrame = 0
let aiTimer = 0

function makeBoard() {
  return Array.from({ length: N }, () => Array(N).fill(0))
}

function drawBoardBase(targetCtx) {
  const wood = targetCtx.createLinearGradient(0, 0, CV, CV)
  wood.addColorStop(0, '#ead49b')
  wood.addColorStop(0.3, '#dbbd77')
  wood.addColorStop(0.62, '#cca15a')
  wood.addColorStop(1, '#b68543')
  targetCtx.fillStyle = wood
  targetCtx.fillRect(0, 0, CV, CV)

  targetCtx.globalAlpha = 0.06
  for (let index = 0; index < 48; index += 1) {
    const y = index * (CV / 48) + Math.sin(index * 0.7) * 4
    targetCtx.strokeStyle = '#835d17'
    targetCtx.lineWidth = 1.5
    targetCtx.beginPath()
    targetCtx.moveTo(0, y)
    targetCtx.bezierCurveTo(
      CV * 0.28,
      y + Math.sin(index) * 6,
      CV * 0.72,
      y - Math.sin(index + 1) * 6,
      CV,
      y
    )
    targetCtx.stroke()
  }
  targetCtx.globalAlpha = 1

  targetCtx.strokeStyle = '#9c7328'
  targetCtx.lineWidth = 4
  targetCtx.strokeRect(PAD - 10, PAD - 10, (N - 1) * CELL + 20, (N - 1) * CELL + 20)

  targetCtx.strokeStyle = '#c59d4a'
  targetCtx.lineWidth = 2
  targetCtx.strokeRect(PAD - 7, PAD - 7, (N - 1) * CELL + 14, (N - 1) * CELL + 14)

  targetCtx.strokeStyle = 'rgba(78, 50, 18, 0.56)'
  targetCtx.lineWidth = 1
  for (let index = 0; index < N; index += 1) {
    const point = PAD + index * CELL
    targetCtx.beginPath()
    targetCtx.moveTo(PAD, point)
    targetCtx.lineTo(PAD + (N - 1) * CELL, point)
    targetCtx.stroke()

    targetCtx.beginPath()
    targetCtx.moveTo(point, PAD)
    targetCtx.lineTo(point, PAD + (N - 1) * CELL)
    targetCtx.stroke()
  }

  const starPoints = [
    [3, 3],
    [3, 11],
    [7, 7],
    [11, 3],
    [11, 11]
  ]
  starPoints.forEach(([row, col]) => {
    targetCtx.fillStyle = 'rgba(78, 50, 18, 0.68)'
    targetCtx.beginPath()
    targetCtx.arc(PAD + col * CELL, PAD + row * CELL, 4.5, 0, Math.PI * 2)
    targetCtx.fill()
  })

  targetCtx.fillStyle = 'rgba(78, 50, 18, 0.35)'
  targetCtx.font = 'bold 10px sans-serif'
  targetCtx.textAlign = 'center'
  for (let index = 0; index < N; index += 1) {
    targetCtx.fillText(String.fromCharCode(65 + index), PAD + index * CELL, PAD - 16)
    targetCtx.fillText(String(N - index), PAD - 18, PAD + index * CELL + 4)
  }
}

function ensureBoardBackdrop() {
  if (boardBackdrop) {
    return
  }

  boardBackdrop = document.createElement('canvas')
  boardBackdrop.width = CV
  boardBackdrop.height = CV
  const targetCtx = boardBackdrop.getContext('2d')
  drawBoardBase(targetCtx)
}

function drawStone(row, col, player, isLast = false, isWinningStone = false) {
  const x = PAD + col * CELL
  const y = PAD + row * CELL
  const radius = CELL / 2 - 3

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
  ctx.beginPath()
  ctx.arc(x + 2, y + 3, radius, 0, Math.PI * 2)
  ctx.fill()

  const gradient = ctx.createRadialGradient(x - radius * 0.28, y - radius * 0.28, radius * 0.1, x, y, radius)
  if (player === 1) {
    gradient.addColorStop(0, '#575757')
    gradient.addColorStop(0.36, '#353535')
    gradient.addColorStop(0.72, '#202020')
    gradient.addColorStop(1, '#111111')
  } else {
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.32, '#f6f6f6')
    gradient.addColorStop(0.72, '#e2e2e2')
    gradient.addColorStop(1, '#c5c5c5')
  }
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = player === 1 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.58)'
  ctx.beginPath()
  ctx.arc(x - radius * 0.24, y - radius * 0.24, radius * 0.34, 0, Math.PI * 2)
  ctx.fill()

  if (isLast && !isWinningStone) {
    ctx.fillStyle = '#e53935'
    ctx.shadowColor = '#e53935'
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }

  if (isWinningStone) {
    ctx.strokeStyle = '#e53935'
    ctx.lineWidth = 3
    ctx.shadowColor = '#e53935'
    ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(229, 57, 53, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, radius + 8, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function drawHover() {
  if (!hoverPos || gameState.value !== 'playing' || aiThinking.value || winner.value || currentPlayer.value !== 1) {
    return
  }

  const [row, col] = hoverPos
  if (board[row][col]) {
    return
  }

  const x = PAD + col * CELL
  const y = PAD + row * CELL
  const pulse = 0.26 + Math.sin(Date.now() * 0.006) * 0.1
  const lineStart = PAD
  const lineEnd = PAD + (N - 1) * CELL

  ctx.strokeStyle = 'rgba(84, 56, 22, 0.18)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(lineStart, y)
  ctx.lineTo(lineEnd, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, lineStart)
  ctx.lineTo(x, lineEnd)
  ctx.stroke()

  ctx.globalAlpha = pulse
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, CELL / 2 - 3)
  gradient.addColorStop(0, '#636363')
  gradient.addColorStop(1, '#3b3b3b')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, CELL / 2 - 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawRipples() {
  ripples = ripples.filter((ripple) => {
    ripple.r += 2
    ripple.life -= 0.04
    if (ripple.life <= 0) {
      return false
    }

    ctx.strokeStyle = `rgba(${ripple.color}, ${ripple.life * 0.6})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(ripple.x, ripple.y, ripple.r, 0, Math.PI * 2)
    ctx.stroke()
    return true
  })
}

function drawWinParticles() {
  winParticles = winParticles.filter((particle) => {
    particle.x += particle.vx
    particle.y += particle.vy
    particle.vy += 0.15
    particle.life -= 0.015
    particle.r *= 0.98
    if (particle.life <= 0) {
      return false
    }

    ctx.globalAlpha = particle.life
    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2)
    ctx.fill()
    return true
  })
  ctx.globalAlpha = 1
}

function draw() {
  if (!ctx) {
    return
  }

  ensureBoardBackdrop()
  ctx.clearRect(0, 0, CV, CV)
  ctx.drawImage(boardBackdrop, 0, 0)

  for (let row = 0; row < N; row += 1) {
    for (let col = 0; col < N; col += 1) {
      if (!board[row][col]) {
        continue
      }

      const isLast = lastMove && lastMove[0] === row && lastMove[1] === col
      const isWinningStone =
        winLine && winLine.some(([winRow, winCol]) => winRow === row && winCol === col)
      drawStone(row, col, board[row][col], isLast, isWinningStone)
    }
  }

  drawRipples()
  drawWinParticles()
  drawHover()
}

function scheduleDraw() {
  if (animationFrame) {
    return
  }

  animationFrame = window.requestAnimationFrame(() => {
    animationFrame = 0
    draw()
    if (ripples.length > 0 || winParticles.length > 0) {
      scheduleDraw()
    }
  })
}

function checkWin(row, col, player) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ]

  for (const [deltaRow, deltaCol] of directions) {
    const line = [[row, col]]

    for (let step = 1; step < 5; step += 1) {
      const nextRow = row + deltaRow * step
      const nextCol = col + deltaCol * step
      if (
        nextRow < 0 ||
        nextRow >= N ||
        nextCol < 0 ||
        nextCol >= N ||
        board[nextRow][nextCol] !== player
      ) {
        break
      }
      line.push([nextRow, nextCol])
    }

    for (let step = 1; step < 5; step += 1) {
      const nextRow = row - deltaRow * step
      const nextCol = col - deltaCol * step
      if (
        nextRow < 0 ||
        nextRow >= N ||
        nextCol < 0 ||
        nextCol >= N ||
        board[nextRow][nextCol] !== player
      ) {
        break
      }
      line.push([nextRow, nextCol])
    }

    if (line.length >= 5) {
      return line
    }
  }

  return null
}

function evaluateLine(count, openEnds) {
  if (count >= 5) return 100000
  if (count === 4) return openEnds === 2 ? 12000 : openEnds === 1 ? 1800 : 0
  if (count === 3) return openEnds === 2 ? 1800 : openEnds === 1 ? 220 : 0
  if (count === 2) return openEnds === 2 ? 180 : openEnds === 1 ? 24 : 0
  if (count === 1) return openEnds === 2 ? 18 : 0
  return 0
}

function evaluatePosition(row, col, player) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ]
  let total = 0

  for (const [deltaRow, deltaCol] of directions) {
    let count = 1
    let openEnds = 0

    for (let step = 1; step <= 5; step += 1) {
      const nextRow = row + deltaRow * step
      const nextCol = col + deltaCol * step
      if (nextRow < 0 || nextRow >= N || nextCol < 0 || nextCol >= N) {
        break
      }
      if (board[nextRow][nextCol] === player) {
        count += 1
      } else {
        if (!board[nextRow][nextCol]) {
          openEnds += 1
        }
        break
      }
    }

    for (let step = 1; step <= 5; step += 1) {
      const nextRow = row - deltaRow * step
      const nextCol = col - deltaCol * step
      if (nextRow < 0 || nextRow >= N || nextCol < 0 || nextCol >= N) {
        break
      }
      if (board[nextRow][nextCol] === player) {
        count += 1
      } else {
        if (!board[nextRow][nextCol]) {
          openEnds += 1
        }
        break
      }
    }

    total += evaluateLine(count, openEnds)
  }

  return total
}

function getCandidateMoves() {
  if (moveCount.value === 0) {
    return [[CENTER, CENTER]]
  }

  const candidates = []

  for (let row = 0; row < N; row += 1) {
    for (let col = 0; col < N; col += 1) {
      if (board[row][col]) {
        continue
      }

      let nearStone = false
      for (let deltaRow = -2; deltaRow <= 2 && !nearStone; deltaRow += 1) {
        for (let deltaCol = -2; deltaCol <= 2 && !nearStone; deltaCol += 1) {
          if (!deltaRow && !deltaCol) {
            continue
          }
          const nextRow = row + deltaRow
          const nextCol = col + deltaCol
          if (
            nextRow >= 0 &&
            nextRow < N &&
            nextCol >= 0 &&
            nextCol < N &&
            board[nextRow][nextCol]
          ) {
            nearStone = true
          }
        }
      }

      if (nearStone) {
        candidates.push([row, col])
      }
    }
  }

  return candidates.length ? candidates : [[CENTER, CENTER]]
}

function countNearbyStones(row, col) {
  let total = 0
  for (let deltaRow = -2; deltaRow <= 2; deltaRow += 1) {
    for (let deltaCol = -2; deltaCol <= 2; deltaCol += 1) {
      if (!deltaRow && !deltaCol) {
        continue
      }
      const nextRow = row + deltaRow
      const nextCol = col + deltaCol
      if (
        nextRow >= 0 &&
        nextRow < N &&
        nextCol >= 0 &&
        nextCol < N &&
        board[nextRow][nextCol]
      ) {
        total += 1
      }
    }
  }
  return total
}

function findCriticalMove(player) {
  const candidates = getCandidateMoves()

  for (const [row, col] of candidates) {
    board[row][col] = player
    const hasWinLine = checkWin(row, col, player)
    board[row][col] = 0
    if (hasWinLine) {
      return [row, col]
    }
  }

  return null
}

function selectAiMove() {
  const winningMove = findCriticalMove(2)
  if (winningMove) {
    return winningMove
  }

  const blockingMove = findCriticalMove(1)
  if (blockingMove) {
    return blockingMove
  }

  const candidates = getCandidateMoves()
  let bestScore = -Infinity
  let bestMoves = []

  for (const [row, col] of candidates) {
    const attack = evaluatePosition(row, col, 2) * 1.16
    const defend = evaluatePosition(row, col, 1) * 0.94
    const centerBias = 18 - (Math.abs(row - CENTER) + Math.abs(col - CENTER))
    const nearbyBias = countNearbyStones(row, col) * 12
    const score = attack + defend + centerBias + nearbyBias + Math.random() * 0.01

    if (score > bestScore) {
      bestScore = score
      bestMoves = [[row, col]]
    } else if (score === bestScore) {
      bestMoves.push([row, col])
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)]
}

function spawnWinParticles() {
  if (!winLine) {
    return
  }

  const colors = ['#ffd700', '#ff6b9d', '#4fc3f7', '#76ff03', '#d500f9']
  winLine.forEach(([row, col]) => {
    const x = PAD + col * CELL
    const y = PAD + row * CELL
    for (let index = 0; index < 8; index += 1) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 4 + 2
      winParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        r: Math.random() * 3 + 2
      })
    }
  })
}

function applyMove(row, col, player) {
  board[row][col] = player
  lastMove = [row, col]
  moveCount.value += 1
  ripples.push({
    x: PAD + col * CELL,
    y: PAD + row * CELL,
    r: CELL / 2,
    life: 1,
    color: '200,160,80'
  })

  const nextWinLine = checkWin(row, col, player)
  if (nextWinLine) {
    winner.value = player
    winLine = nextWinLine
    spawnWinParticles()
    scheduleDraw()
    return true
  }

  if (moveCount.value >= N * N) {
    gameState.value = 'draw'
    scheduleDraw()
    return true
  }

  scheduleDraw()
  return false
}

function runAiTurn() {
  aiThinking.value = true
  scheduleDraw()

  aiTimer = window.setTimeout(() => {
    const [row, col] = selectAiMove()
    const finished = applyMove(row, col, 2)
    aiThinking.value = false

    if (!finished) {
      currentPlayer.value = 1
    }
  }, 220)
}

function getBoardPosition(event) {
  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = CV / rect.width
  const scaleY = CV / rect.height
  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY
  const col = Math.round((x - PAD) / CELL)
  const row = Math.round((y - PAD) / CELL)

  return row >= 0 && row < N && col >= 0 && col < N ? [row, col] : null
}

function handleClick(event) {
  if (gameState.value === 'draw' || winner.value || aiThinking.value || currentPlayer.value !== 1) {
    return
  }

  if (gameState.value === 'ready') {
    gameState.value = 'playing'
  }

  const position = getBoardPosition(event)
  if (!position) {
    return
  }

  const [row, col] = position
  if (board[row][col]) {
    return
  }

  const finished = applyMove(row, col, 1)
  if (finished) {
    return
  }

  currentPlayer.value = 2
  runAiTurn()
}

function handleMove(event) {
  hoverPos = getBoardPosition(event)
  scheduleDraw()
}

function handleLeave() {
  hoverPos = null
  scheduleDraw()
}

function onKey(event) {
  if (event.key === 'r' || event.key === 'R') {
    restartGame(false)
  }
}

function restartGame(computerFirst) {
  window.clearTimeout(aiTimer)
  aiThinking.value = false
  gameState.value = 'ready'
  currentPlayer.value = 1
  winner.value = 0
  moveCount.value = 0
  board = makeBoard()
  hoverPos = null
  winLine = null
  lastMove = null
  ripples = []
  winParticles = []

  if (computerFirst) {
    gameState.value = 'playing'
    applyMove(CENTER, CENTER, 2)
  }

  scheduleDraw()
}

onMounted(() => {
  const canvas = canvasRef.value
  canvas.width = CV
  canvas.height = CV
  ctx = canvas.getContext('2d')
  board = makeBoard()
  ensureBoardBackdrop()
  draw()
  canvas.addEventListener('click', handleClick)
  canvas.addEventListener('mousemove', handleMove)
  canvas.addEventListener('mouseleave', handleLeave)
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.clearTimeout(aiTimer)
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame)
  }
  canvasRef.value?.removeEventListener('click', handleClick)
  canvasRef.value?.removeEventListener('mousemove', handleMove)
  canvasRef.value?.removeEventListener('mouseleave', handleLeave)
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.gomoku-game {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.gomoku-game__top,
.gomoku-game__hud,
.gomoku-game__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}

.gomoku-game__headline {
  display: grid;
  gap: 10px;
}

.gomoku-game__badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.gomoku-game__badge-icon {
  color: #c8a050;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: -0.02em;
  text-shadow: 0 0 15px rgba(200, 160, 80, 0.3);
}

.gomoku-game__badge-text {
  color: rgba(200, 160, 80, 0.54);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.15em;
}

.gomoku-game__status-copy {
  display: grid;
  gap: 4px;
}

.gomoku-game__status-label {
  color: var(--blog-ink);
  font-size: 0.96rem;
  font-weight: 700;
}

.gomoku-game__status-copy p {
  margin: 0;
  color: var(--blog-muted);
  line-height: 1.6;
}

.gomoku-game__stats {
  display: flex;
  gap: 10px;
}

.gomoku-game__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 86px;
  padding: 8px 14px;
  border: 1px solid rgba(200, 160, 80, 0.12);
  border-radius: 14px;
  background: rgba(200, 160, 80, 0.08);
}

.gomoku-game__stat-num {
  color: #8b6518;
  font-size: 22px;
  font-weight: 900;
  line-height: 1.1;
}

.gomoku-game__stat-label {
  margin-top: 4px;
  color: var(--blog-muted);
  font-size: 0.68rem;
  letter-spacing: 0.2em;
}

.gomoku-game__player {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid transparent;
  border-radius: 16px;
  transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

.gomoku-game__player.is-active {
  border-color: rgba(200, 160, 80, 0.28);
  background: rgba(200, 160, 80, 0.08);
  box-shadow: 0 10px 22px rgba(139, 105, 20, 0.08);
}

.gomoku-game__stone {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.gomoku-game__stone--black {
  background: radial-gradient(circle at 35% 35%, #555, #222, #111);
}

.gomoku-game__stone--white {
  background: radial-gradient(circle at 35% 35%, #fff, #f0f0f0, #ccc);
}

.gomoku-game__player-info {
  display: grid;
  gap: 2px;
}

.gomoku-game__player-info strong {
  color: var(--blog-ink);
  font-size: 0.94rem;
}

.gomoku-game__player-info span {
  color: var(--blog-muted);
  font-size: 0.82rem;
}

.gomoku-game__frame {
  width: min(100%, 536px);
  border-radius: 14px;
  overflow: hidden;
  box-shadow:
    0 16px 36px rgba(139, 105, 20, 0.18),
    0 0 0 1px rgba(139, 105, 20, 0.12);
}

.gomoku-game__canvas {
  display: block;
  width: 100%;
  height: auto;
  cursor: pointer;
}

.gomoku-game__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.gomoku-game__button {
  border: 1px solid var(--blog-line);
  border-radius: 999px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--blog-ink);
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.gomoku-game__button:hover {
  transform: translateY(-1px);
  border-color: rgba(200, 160, 80, 0.28);
}

.gomoku-game__button--primary {
  border-color: transparent;
  color: #fffaf2;
  background: linear-gradient(135deg, #8f6423 0%, #c8a050 100%);
  box-shadow: 0 14px 28px rgba(143, 100, 35, 0.22);
}

.gomoku-game__tips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.gomoku-game__tip {
  padding: 8px 12px;
  border: 1px solid var(--blog-line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--blog-copy);
  font-size: 0.84rem;
}

@media (max-width: 900px) {
  .gomoku-game__top,
  .gomoku-game__hud,
  .gomoku-game__footer {
    display: grid;
  }

  .gomoku-game__tips {
    justify-content: flex-start;
  }
}
</style>
