<template>
  <div class="mine-game">
    <div class="mine-game__top">
      <div class="mine-game__badge">
        <span class="mine-game__badge-icon">扫</span>
        <span class="mine-game__badge-text">雷</span>
      </div>
      <div class="mine-game__controls">
        <button
          v-for="d in difficulties"
          :key="d.id"
          class="mine-game__diff"
          :class="{ 'is-active': diff === d.id }"
          @click="changeDiff(d.id)"
        >{{ d.label }}</button>
      </div>
      <div class="mine-game__info">
        <span class="mine-game__counter">{{ minesLeft }}</span>
        <span class="mine-game__timer">{{ timeStr }}</span>
      </div>
    </div>

    <div class="mine-game__frame">
      <canvas ref="canvasRef" class="mine-game__canvas" />
      <div v-if="gameState !== 'playing'" class="mine-game__modal">
        <div class="mine-game__modal-box">
          <template v-if="gameState === 'win'">
            <p class="mine-game__modal-title mine-game__modal-title--win">扫雷成功</p>
            <p class="mine-game__modal-sub">用时 {{ timeStr }}</p>
          </template>
          <template v-else-if="gameState === 'lose'">
            <p class="mine-game__modal-title">踩雷了</p>
            <p class="mine-game__modal-sub">再试一次？</p>
          </template>
          <template v-else>
            <p class="mine-game__modal-title">扫雷</p>
            <p class="mine-game__modal-sub">经典逻辑推理游戏</p>
          </template>
          <p class="mine-game__modal-hint" @click="startGame">点击开始</p>
        </div>
      </div>
    </div>

    <div class="mine-game__bar">
      <span class="mine-game__key">左键揭开</span>
      <span class="mine-game__key">右键标旗</span>
      <span class="mine-game__key">揭开所有安全格获胜</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const difficulties = [
  { id: 'easy', cols: 9, rows: 9, mines: 10, label: '简单' },
  { id: 'medium', cols: 16, rows: 16, mines: 40, label: '中等' },
  { id: 'hard', cols: 30, rows: 16, mines: 99, label: '困难' },
]

const canvasRef = ref(null)
const diff = ref('easy')
const gameState = ref('idle')
const flagCount = ref(0)
const timer = ref(0)

let ctx, grid, cellSize, revealed, flagged, exploded, firstClick, timerInterval, W, H

const minesLeft = computed(() => {
  const d = difficulties.find(d => d.id === diff.value)
  return d.mines - flagCount.value
})
const timeStr = computed(() => {
  const m = Math.floor(timer.value / 60)
  const s = timer.value % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

function getDiff() { return difficulties.find(d => d.id === diff.value) }

function initGrid() {
  const d = getDiff()
  grid = Array.from({ length: d.rows }, () => Array(d.cols).fill(0))
  revealed = Array.from({ length: d.rows }, () => Array(d.cols).fill(false))
  flagged = Array.from({ length: d.rows }, () => Array(d.cols).fill(false))
  exploded = false
  firstClick = true
  flagCount.value = 0
  timer.value = 0
  clearInterval(timerInterval)
}

function placeMines(safeC, safeR) {
  const d = getDiff()
  let placed = 0
  while (placed < d.mines) {
    const c = Math.floor(Math.random() * d.cols)
    const r = Math.floor(Math.random() * d.rows)
    if (grid[r][c] === -1) continue
    if (Math.abs(c - safeC) <= 1 && Math.abs(r - safeR) <= 1) continue
    grid[r][c] = -1
    placed++
  }
  // compute numbers
  for (let r = 0; r < d.rows; r++) {
    for (let c = 0; c < d.cols; c++) {
      if (grid[r][c] === -1) continue
      let count = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < d.rows && nc >= 0 && nc < d.cols && grid[nr][nc] === -1) count++
        }
      }
      grid[r][c] = count
    }
  }
}

function reveal(c, r) {
  const d = getDiff()
  if (c < 0 || c >= d.cols || r < 0 || r >= d.rows) return
  if (revealed[r][c] || flagged[r][c]) return
  revealed[r][c] = true
  if (grid[r][c] === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        reveal(c + dc, r + dr)
      }
    }
  }
}

function checkWin() {
  const d = getDiff()
  for (let r = 0; r < d.rows; r++) {
    for (let c = 0; c < d.cols; c++) {
      if (grid[r][c] !== -1 && !revealed[r][c]) return false
    }
  }
  return true
}

function onClick(e) {
  if (gameState.value !== 'playing') return
  const pos = cellPos(e)
  if (!pos) return
  const { c, r } = pos
  if (flagged[r][c]) return
  if (revealed[r][c]) return

  if (firstClick) {
    firstClick = false
    placeMines(c, r)
    timerInterval = setInterval(() => timer.value++, 1000)
  }

  if (grid[r][c] === -1) {
    // lose
    revealed[r][c] = true
    exploded = true
    const d = getDiff()
    for (let rr = 0; rr < d.rows; rr++)
      for (let cc = 0; cc < d.cols; cc++)
        if (grid[rr][cc] === -1) revealed[rr][cc] = true
    clearInterval(timerInterval)
    gameState.value = 'lose'
    draw()
    return
  }

  reveal(c, r)
  if (checkWin()) {
    clearInterval(timerInterval)
    gameState.value = 'win'
  }
  draw()
}

function onRightClick(e) {
  e.preventDefault()
  if (gameState.value !== 'playing') return
  const pos = cellPos(e)
  if (!pos) return
  const { c, r } = pos
  if (revealed[r][c]) return
  flagged[r][c] = !flagged[r][c]
  flagCount.value += flagged[r][c] ? 1 : -1
  draw()
}

function cellPos(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  const sx = W / rect.width, sy = H / rect.height
  const x = (e.clientX - rect.left) * sx, y = (e.clientY - rect.top) * sy
  const c = Math.floor(x / cellSize), r = Math.floor(y / cellSize)
  const d = getDiff()
  if (c < 0 || c >= d.cols || r < 0 || r >= d.rows) return null
  return { c, r }
}

// === DRAWING ===
function draw() {
  if (!ctx) return
  const d = getDiff()

  // background
  ctx.fillStyle = '#c0c0c0'
  ctx.fillRect(0, 0, W, H)

  for (let r = 0; r < d.rows; r++) {
    for (let c = 0; c < d.cols; c++) {
      const x = c * cellSize, y = r * cellSize

      if (revealed[r][c]) {
        ctx.fillStyle = grid[r][c] === -1 && exploded ? '#ff4040' : '#d8d8d8'
        ctx.fillRect(x, y, cellSize, cellSize)
        ctx.strokeStyle = '#a0a0a0'; ctx.lineWidth = 0.5
        ctx.strokeRect(x, y, cellSize, cellSize)

        if (grid[r][c] === -1) {
          // mine
          ctx.fillStyle = '#222'
          ctx.beginPath(); ctx.arc(x + cellSize/2, y + cellSize/2, cellSize * 0.25, 0, Math.PI * 2); ctx.fill()
          // spikes
          ctx.strokeStyle = '#222'; ctx.lineWidth = 2
          for (let a = 0; a < 8; a++) {
            const angle = (a / 8) * Math.PI * 2
            ctx.beginPath()
            ctx.moveTo(x + cellSize/2 + Math.cos(angle) * cellSize * 0.15, y + cellSize/2 + Math.sin(angle) * cellSize * 0.15)
            ctx.lineTo(x + cellSize/2 + Math.cos(angle) * cellSize * 0.32, y + cellSize/2 + Math.sin(angle) * cellSize * 0.32)
            ctx.stroke()
          }
        } else if (grid[r][c] > 0) {
          // number
          const colors = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080']
          ctx.fillStyle = colors[grid[r][c]] || '#000'
          ctx.font = `bold ${Math.round(cellSize * 0.6)}px sans-serif`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText(grid[r][c], x + cellSize/2, y + cellSize/2 + 1)
        }
      } else {
        // unrevealed - 3D raised effect
        ctx.fillStyle = '#c0c0c0'
        ctx.fillRect(x, y, cellSize, cellSize)
        ctx.fillStyle = '#ffffff'
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cellSize, y); ctx.lineTo(x + cellSize - 3, y + 3); ctx.lineTo(x + 3, y + 3); ctx.lineTo(x + 3, y + cellSize - 3); ctx.lineTo(x, y + cellSize); ctx.closePath(); ctx.fill()
        ctx.fillStyle = '#808080'
        ctx.beginPath(); ctx.moveTo(x + cellSize, y); ctx.lineTo(x + cellSize, y + cellSize); ctx.lineTo(x, y + cellSize); ctx.lineTo(x + 3, y + cellSize - 3); ctx.lineTo(x + cellSize - 3, y + cellSize - 3); ctx.lineTo(x + cellSize - 3, y + 3); ctx.closePath(); ctx.fill()

        if (flagged[r][c]) {
          // flag
          ctx.fillStyle = '#ff2020'
          ctx.beginPath()
          ctx.moveTo(x + cellSize * 0.3, y + cellSize * 0.2)
          ctx.lineTo(x + cellSize * 0.7, y + cellSize * 0.4)
          ctx.lineTo(x + cellSize * 0.3, y + cellSize * 0.6)
          ctx.closePath()
          ctx.fill()
          ctx.strokeStyle = '#222'; ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(x + cellSize * 0.3, y + cellSize * 0.2)
          ctx.lineTo(x + cellSize * 0.3, y + cellSize * 0.8)
          ctx.stroke()
        }
      }
    }
  }
}

function startGame() {
  initGrid()
  gameState.value = 'playing'
  draw()
}

function changeDiff(id) {
  diff.value = id
  gameState.value = 'idle'
  initGrid()
  resizeCanvas()
  draw()
}

function resizeCanvas() {
  const d = getDiff()
  const maxW = 700
  cellSize = Math.floor(Math.min(maxW / d.cols, 36))
  W = cellSize * d.cols
  H = cellSize * d.rows
  if (canvasRef.value) {
    canvasRef.value.width = W
    canvasRef.value.height = H
    ctx = canvasRef.value.getContext('2d', { alpha: false })
  }
}

onMounted(() => {
  resizeCanvas()
  initGrid()
  draw()
  canvasRef.value.addEventListener('click', onClick)
  canvasRef.value.addEventListener('contextmenu', onRightClick)
})
onUnmounted(() => {
  canvasRef.value?.removeEventListener('click', onClick)
  canvasRef.value?.removeEventListener('contextmenu', onRightClick)
  clearInterval(timerInterval)
})
</script>

<style scoped>
.mine-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
}

.mine-game__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 700px;
  flex-wrap: wrap;
  gap: 10px;
}

.mine-game__badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.mine-game__badge-icon {
  font-size: 26px;
  font-weight: 900;
  color: #e06030;
  text-shadow: 0 0 12px rgba(224,96,48,0.3);
}
.mine-game__badge-text {
  font-size: 16px;
  font-weight: 700;
  color: rgba(224,96,48,0.4);
}

.mine-game__controls {
  display: flex;
  gap: 6px;
}
.mine-game__diff {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--blog-line);
  background: rgba(255,255,255,0.4);
  color: var(--blog-copy);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.mine-game__diff:hover { background: rgba(255,255,255,0.7); }
.mine-game__diff.is-active {
  background: linear-gradient(135deg, rgba(224,96,48,0.12), rgba(224,96,48,0.06));
  border-color: rgba(224,96,48,0.25);
  color: #e06030;
}

.mine-game__info {
  display: flex;
  gap: 10px;
  align-items: center;
}
.mine-game__counter, .mine-game__timer {
  font-size: 18px;
  font-weight: 800;
  color: #e06030;
  font-variant-numeric: tabular-nums;
  padding: 4px 12px;
  background: rgba(224,96,48,0.06);
  border-radius: 8px;
  border: 1px solid rgba(224,96,48,0.1);
  min-width: 48px;
  text-align: center;
}

.mine-game__frame {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.06);
}
.mine-game__canvas {
  display: block;
  max-width: 100%;
  height: auto;
  cursor: pointer;
}

.mine-game__modal {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20,20,20,0.82);
  backdrop-filter: blur(4px);
}
.mine-game__modal-box { text-align: center; padding: 28px 40px; }
.mine-game__modal-title {
  font-size: 28px;
  font-weight: 900;
  color: #e06030;
  letter-spacing: 0.06em;
  text-shadow: 0 0 20px rgba(224,96,48,0.4);
  margin-bottom: 4px;
}
.mine-game__modal-title--win { color: #40b860; text-shadow: 0 0 20px rgba(64,184,96,0.4); }
.mine-game__modal-sub { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 6px; }
.mine-game__modal-hint {
  font-size: 13px;
  color: rgba(255,255,255,0.3);
  margin-top: 14px;
  cursor: pointer;
  transition: color 0.2s;
}
.mine-game__modal-hint:hover { color: rgba(255,255,255,0.7); }

.mine-game__bar { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.mine-game__key {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 4px 12px;
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
  border: 1px solid var(--blog-line);
}

:global(.blog-page--dark) .mine-game__diff {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.08);
  color: #ccc;
}
:global(.blog-page--dark) .mine-game__diff.is-active {
  background: rgba(224,96,48,0.12);
  border-color: rgba(224,96,48,0.2);
  color: #f08050;
}
</style>
