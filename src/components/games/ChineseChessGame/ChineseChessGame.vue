<template>
  <div class="chess-game">
    <div class="chess-game__top">
      <div class="chess-game__badge">
        <span class="chess-game__badge-icon">棋</span>
        <span class="chess-game__badge-text">局</span>
      </div>
      <div class="chess-game__turn" :class="{ 'is-red': currentPlayer === 'red' }">
        <span class="chess-game__turn-dot" />
        <span>{{ statusText }}</span>
      </div>
      <button class="chess-game__btn" @click="restart">重新开始</button>
    </div>

    <div class="chess-game__board-wrap">
      <canvas ref="canvasRef" class="chess-game__canvas" />
    </div>

    <div class="chess-game__bottom">
      <span class="chess-game__key">点击选子，再点落子</span>
      <span class="chess-game__key">红方先行</span>
      <span class="chess-game__key">将死或困毙获胜</span>
    </div>

    <div v-if="gameState !== 'playing'" class="chess-game__modal">
      <div class="chess-game__modal-box">
        <template v-if="gameState === 'red-win'">
          <p class="chess-game__modal-title">红方胜</p>
          <p class="chess-game__modal-sub">恭喜，你赢了！</p>
        </template>
        <template v-else-if="gameState === 'black-win'">
          <p class="chess-game__modal-title">黑方胜</p>
          <p class="chess-game__modal-sub">再接再厉！</p>
        </template>
        <template v-else>
          <p class="chess-game__modal-title">中国象棋</p>
          <p class="chess-game__modal-sub">经典博弈，红方先行</p>
        </template>
        <p class="chess-game__modal-hint" @click="startGame">点击开始</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const CELL = 56
const PAD = 44
const COLS = 9
const ROWS = 10
const W = PAD * 2 + (COLS - 1) * CELL
const H = PAD * 2 + (ROWS - 1) * CELL
const PIECE_R = CELL * 0.42

const canvasRef = ref(null)
const gameState = ref('idle')
const currentPlayer = ref('red')
const selectedPos = ref(null)
const checkInfo = ref(null)

let ctx, board, validMoves, animPieces, aiTimer

const PIECE_NAMES = {
  K: { red: '帅', black: '将' },
  A: { red: '仕', black: '士' },
  E: { red: '相', black: '象' },
  N: { red: '马', black: '马' },
  R: { red: '车', black: '车' },
  C: { red: '炮', black: '炮' },
  P: { red: '兵', black: '卒' },
}

const PIECE_VALUES = { R: 100, C: 50, N: 45, P: 20, E: 12, A: 12, K: 10000 }

const POS_BONUS = {
  P: [
    [0,0,0,0,0,0,0,0,0],
    [90,90,110,120,120,120,110,90,90],
    [90,90,110,120,120,120,110,90,90],
    [70,90,110,110,110,110,110,90,70],
    [70,70,70,70,70,70,70,70,70],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
  ],
  N: [
    [40,50,40,40,40,40,40,50,40],
    [40,60,80,60,60,60,80,60,40],
    [50,60,80,80,90,80,80,60,50],
    [40,60,80,90,80,90,80,60,40],
    [40,60,80,80,90,80,80,60,40],
    [40,60,80,80,90,80,80,60,40],
    [40,60,80,90,80,90,80,60,40],
    [50,60,80,80,90,80,80,60,50],
    [40,60,80,60,60,60,80,60,40],
    [40,50,40,40,40,40,40,50,40],
  ],
  R: [
    [100,100,100,110,110,110,100,100,100],
    [110,120,100,110,120,110,100,120,110],
    [100,110,100,110,110,110,100,110,100],
    [100,100,100,100,100,100,100,100,100],
    [100,100,100,100,100,100,100,100,100],
    [100,100,100,100,100,100,100,100,100],
    [100,100,100,100,100,100,100,100,100],
    [100,100,100,100,100,100,100,100,100],
    [110,120,100,110,120,110,100,120,110],
    [100,100,100,110,110,110,100,100,100],
  ],
}

const statusText = computed(() => {
  if (gameState.value === 'red-win') return '红方胜'
  if (gameState.value === 'black-win') return '黑方胜'
  if (checkInfo.value) return currentPlayer.value === 'red' ? '将军！请应将' : 'AI思考中...'
  return currentPlayer.value === 'red' ? '红方走棋' : 'AI思考中...'
})

// === HELPERS ===
function inBoard(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS }
function inPalace(c, r, side) {
  if (c < 3 || c > 5) return false
  return side === 'red' ? r >= 7 && r <= 9 : r >= 0 && r <= 2
}

function get(c, r) { return board[r]?.[c] ?? null }
function set(c, r, v) { board[r][c] = v }

function cloneBoard() { return board.map(row => [...row]) }

function findKing(side) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const p = get(c, r)
      if (p && p.type === 'K' && p.side === side) return { c, r }
    }
  return null
}

function kingsFacing() {
  const rk = findKing('red'), bk = findKing('black')
  if (!rk || !bk || rk.c !== bk.c) return false
  const minR = Math.min(rk.r, bk.r), maxR = Math.max(rk.r, bk.r)
  for (let r = minR + 1; r < maxR; r++) {
    if (get(rk.c, r)) return false
  }
  return true
}

// === MOVE GENERATION ===
function pseudoMoves(side) {
  const moves = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = get(c, r)
      if (!p || p.side !== side) continue
      const ms = pieceMoves(c, r, p)
      ms.forEach(m => moves.push(m))
    }
  }
  return moves
}

function pieceMoves(c, r, p) {
  const moves = []
  const side = p.side
  const add = (tc, tr) => {
    if (!inBoard(tc, tr)) return
    const t = get(tc, tr)
    if (t && t.side === side) return
    moves.push({ fc: c, fr: r, tc, tr })
  }

  switch (p.type) {
    case 'K':
      for (const [dc, dr] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const nc = c + dc, nr = r + dr
        if (inPalace(nc, nr, side)) add(nc, nr)
      }
      break

    case 'A':
      for (const [dc, dr] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
        const nc = c + dc, nr = r + dr
        if (inPalace(nc, nr, side)) add(nc, nr)
      }
      break

    case 'E':
      for (const [dc, dr] of [[2,2],[2,-2],[-2,2],[-2,-2]]) {
        const nc = c + dc, nr = r + dr
        const bc = c + dc / 2, br = r + dr / 2
        if (!inBoard(nc, nr)) continue
        if (side === 'red' && nr < 5) continue
        if (side === 'black' && nr > 4) continue
        if (get(bc, br)) continue
        add(nc, nr)
      }
      break

    case 'N':
      for (const [dc, dr, bc, br] of [
        [1,2,0,1],[1,-2,0,-1],[-1,2,0,1],[-1,-2,0,-1],
        [2,1,1,0],[2,-1,1,0],[-2,1,-1,0],[-2,-1,-1,0],
      ]) {
        if (get(c + bc, r + br)) continue
        add(c + dc, r + dr)
      }
      break

    case 'R':
      for (const [dc, dr] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        for (let i = 1; i < 10; i++) {
          const nc = c + dc * i, nr = r + dr * i
          if (!inBoard(nc, nr)) break
          const t = get(nc, nr)
          if (t) { if (t.side !== side) moves.push({ fc: c, fr: r, tc: nc, tr: nr }); break }
          moves.push({ fc: c, fr: r, tc: nc, tr: nr })
        }
      }
      break

    case 'C':
      for (const [dc, dr] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        let jumped = false
        for (let i = 1; i < 10; i++) {
          const nc = c + dc * i, nr = r + dr * i
          if (!inBoard(nc, nr)) break
          const t = get(nc, nr)
          if (!jumped) {
            if (t) jumped = true
            else moves.push({ fc: c, fr: r, tc: nc, tr: nr })
          } else {
            if (t) {
              if (t.side !== side) moves.push({ fc: c, fr: r, tc: nc, tr: nr })
              break
            }
          }
        }
      }
      break

    case 'P': {
      const dir = side === 'red' ? -1 : 1
      const crossed = side === 'red' ? r <= 4 : r >= 5
      add(c, r + dir)
      if (crossed) { add(c + 1, r); add(c - 1, r) }
      break
    }
  }
  return moves
}

function isCheck(side, b) {
  const saved = board
  board = b
  const king = findKing(side)
  if (!king) { board = saved; return true }
  const opp = side === 'red' ? 'black' : 'red'
  const moves = pseudoMoves(opp)
  const inCheck = moves.some(m => m.tc === king.c && m.tr === king.r)
  board = saved
  return inCheck
}

function legalMoves(side) {
  const moves = pseudoMoves(side)
  return moves.filter(m => {
    const saved = cloneBoard()
    applyMove(m)
    const legal = !isCheck(side, board) && !kingsFacing()
    board = saved
    return legal
  })
}

function isCheckmate(side) {
  return legalMoves(side).length === 0
}

function applyMove(m) {
  const p = get(m.fc, m.fr)
  set(m.tc, m.tr, p)
  set(m.fc, m.fr, null)
}

// === AI ===
function evaluateBoard(side) {
  let score = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = get(c, r)
      if (!p) continue
      const val = PIECE_VALUES[p.type] || 0
      let posBonus = 0
      const bonusMap = POS_BONUS[p.type]
      if (bonusMap) {
        const br = p.side === 'red' ? r : 9 - r
        posBonus = (bonusMap[br]?.[c] || 0) * 0.1
      }
      const total = val + posBonus
      score += p.side === side ? total : -total
    }
  }
  return score
}

function aiMove() {
  const side = 'black'
  const moves = legalMoves(side)
  if (moves.length === 0) return

  // 1. check if can capture king
  for (const m of moves) {
    const t = get(m.tc, m.tr)
    if (t && t.type === 'K') { doMove(m); return }
  }

  // 2. if in check, prioritize escaping
  const inCheck = isCheck(side, board)

  // 3. score each move
  let best = -Infinity, bestMoves = []
  for (const m of moves) {
    const saved = cloneBoard()
    const captured = get(m.tc, m.tr)
    applyMove(m)

    let score = evaluateBoard(side)
    if (captured) score += PIECE_VALUES[captured.type] * 0.5
    if (isCheck('red', board)) score += 30
    if (inCheck && !isCheck(side, board)) score += 50

    // positional: move toward center/attack
    score += (4 - Math.abs(m.tc - 4)) * 2

    board = saved

    if (score > best) { best = score; bestMoves = [m] }
    else if (score === best) bestMoves.push(m)
  }

  const m = bestMoves[Math.floor(Math.random() * bestMoves.length)]
  doMove(m)
}

function doMove(m) {
  const captured = get(m.tc, m.tr)
  applyMove(m)
  selectedPos.value = null
  validMoves = []

  if (captured?.type === 'K') {
    gameState.value = currentPlayer.value === 'red' ? 'red-win' : 'black-win'
    draw()
    return
  }

  currentPlayer.value = currentPlayer.value === 'red' ? 'black' : 'red'
  checkInfo.value = isCheck(currentPlayer.value, board)

  if (isCheckmate(currentPlayer.value)) {
    gameState.value = currentPlayer.value === 'red' ? 'black-win' : 'red-win'
  }

  draw()

  if (gameState.value === 'playing' && currentPlayer.value === 'black') {
    clearTimeout(aiTimer)
    aiTimer = setTimeout(aiMove, 250)
  }
}

// === DRAWING ===
function cx(c) { return PAD + c * CELL }
function cy(r) { return PAD + r * CELL }

function drawBoard() {
  // wood background
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#e8c88a'); g.addColorStop(0.5, '#dbb870'); g.addColorStop(1, '#d0a860')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)

  // subtle grain
  ctx.strokeStyle = 'rgba(160,120,60,0.15)'; ctx.lineWidth = 1
  for (let i = 0; i < 20; i++) {
    const y = (i * 31 + 7) % H
    ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(W * 0.3, y + 4, W * 0.7, y - 3, W, y + 2); ctx.stroke()
  }

  // border
  ctx.strokeStyle = '#5a3a10'; ctx.lineWidth = 3
  ctx.strokeRect(PAD - 10, PAD - 10, (COLS - 1) * CELL + 20, (ROWS - 1) * CELL + 20)
  ctx.strokeStyle = '#8a6a30'; ctx.lineWidth = 1
  ctx.strokeRect(PAD - 12, PAD - 12, (COLS - 1) * CELL + 24, (ROWS - 1) * CELL + 24)

  // grid lines
  ctx.strokeStyle = '#5a3a10'; ctx.lineWidth = 1
  for (let r = 0; r < ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(cx(0), cy(r)); ctx.lineTo(cx(8), cy(r)); ctx.stroke()
  }
  // vertical lines - break at river
  for (let c = 0; c < COLS; c++) {
    if (c === 0 || c === 8) {
      ctx.beginPath(); ctx.moveTo(cx(c), cy(0)); ctx.lineTo(cx(c), cy(9)); ctx.stroke()
    } else {
      ctx.beginPath(); ctx.moveTo(cx(c), cy(0)); ctx.lineTo(cx(c), cy(4)); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx(c), cy(5)); ctx.lineTo(cx(c), cy(9)); ctx.stroke()
    }
  }

  // palace diagonals
  ctx.strokeStyle = 'rgba(90,58,16,0.6)'
  ctx.beginPath(); ctx.moveTo(cx(3), cy(0)); ctx.lineTo(cx(5), cy(2)); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx(5), cy(0)); ctx.lineTo(cx(3), cy(2)); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx(3), cy(7)); ctx.lineTo(cx(5), cy(9)); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx(5), cy(7)); ctx.lineTo(cx(3), cy(9)); ctx.stroke()

  // river text
  ctx.fillStyle = 'rgba(90,58,16,0.5)'
  ctx.font = 'bold 22px serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const riverY = (cy(4) + cy(5)) / 2
  ctx.fillText('楚  河', cx(2), riverY)
  ctx.fillText('汉  界', cx(6), riverY)

  // position markers
  const markers = [
    [2,1],[6,1],[2,7],[6,7], // cannons
    [1,2],[7,2],[1,6],[7,6], // soldiers
    [0,3],[2,3],[4,3],[6,3],[8,3],
    [0,6],[2,6],[4,6],[6,6],[8,6],
  ]
  markers.forEach(([c, r]) => drawMarker(c, r))

  // column labels
  ctx.fillStyle = 'rgba(90,58,16,0.5)'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  const labelsR = ['九','八','七','六','五','四','三','二','一']
  const labelsB = ['1','2','3','4','5','6','7','8','9']
  for (let c = 0; c < 9; c++) {
    ctx.fillText(labelsR[c], cx(c), H - PAD + 22)
    ctx.fillText(labelsB[c], cx(c), PAD - 20)
  }
}

function drawMarker(c, r) {
  const x = cx(c), y = cy(r)
  const s = 4, g = 2
  ctx.strokeStyle = 'rgba(90,58,16,0.5)'; ctx.lineWidth = 1
  const dirs = c > 0 ? [[-1,-1],[-1,1]] : []
  const dirs2 = c < 8 ? [[1,-1],[1,1]] : []
  ;[...dirs, ...dirs2].forEach(([dc, dr]) => {
    ctx.beginPath(); ctx.moveTo(x + dc * g, y + dr * (g + s)); ctx.lineTo(x + dc * g, y + dr * g); ctx.lineTo(x + dc * (g + s), y + dr * g); ctx.stroke()
  })
}

function drawPiece(c, r, piece) {
  const x = cx(c), y = cy(r)
  const isRed = piece.side === 'red'

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.beginPath(); ctx.arc(x + 2, y + 2, PIECE_R, 0, Math.PI * 2); ctx.fill()

  // piece body
  const pg = ctx.createRadialGradient(x - PIECE_R * 0.3, y - PIECE_R * 0.3, PIECE_R * 0.1, x, y, PIECE_R)
  pg.addColorStop(0, '#fff8e8'); pg.addColorStop(0.7, '#f0e0c0'); pg.addColorStop(1, '#d8c8a0')
  ctx.fillStyle = pg
  ctx.beginPath(); ctx.arc(x, y, PIECE_R, 0, Math.PI * 2); ctx.fill()

  // border ring
  ctx.strokeStyle = isRed ? '#b03020' : '#1a1a2a'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(x, y, PIECE_R - 2, 0, Math.PI * 2); ctx.stroke()
  ctx.strokeStyle = isRed ? '#c04030' : '#2a2a3a'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.arc(x, y, PIECE_R - 5, 0, Math.PI * 2); ctx.stroke()

  // text
  ctx.fillStyle = isRed ? '#c02010' : '#1a1a2a'
  ctx.font = `bold ${Math.round(PIECE_R * 1.1)}px serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(PIECE_NAMES[piece.type][piece.side], x, y + 1)
}

function drawSelection() {
  if (!selectedPos.value) return
  const { c, r } = selectedPos.value
  const x = cx(c), y = cy(r)

  // highlight selected
  ctx.strokeStyle = '#f0d040'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(x, y, PIECE_R + 3, 0, Math.PI * 2); ctx.stroke()

  // valid moves
  validMoves.forEach(m => {
    const tx = cx(m.tc), ty = cy(m.tr)
    const t = get(m.tc, m.tr)
    if (t) {
      ctx.strokeStyle = 'rgba(240,80,60,0.7)'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.arc(tx, ty, PIECE_R + 3, 0, Math.PI * 2); ctx.stroke()
    } else {
      ctx.fillStyle = 'rgba(80,180,80,0.5)'
      ctx.beginPath(); ctx.arc(tx, ty, 6, 0, Math.PI * 2); ctx.fill()
    }
  })
}

function drawCheck() {
  if (!checkInfo.value) return
  const king = findKing(currentPlayer.value)
  if (!king) return
  const x = cx(king.c), y = cy(king.r)
  ctx.strokeStyle = 'rgba(255,40,40,0.7)'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(x, y, PIECE_R + 5, 0, Math.PI * 2); ctx.stroke()
}

function draw() {
  if (!ctx) return
  drawBoard()
  drawCheck()
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = get(c, r)
      if (p) drawPiece(c, r, p)
    }
  }
  drawSelection()
}

// === INTERACTION ===
function boardPos(clientX, clientY) {
  const rect = canvasRef.value.getBoundingClientRect()
  const sx = W / rect.width, sy = H / rect.height
  const x = (clientX - rect.left) * sx, y = (clientY - rect.top) * sy
  const c = Math.round((x - PAD) / CELL)
  const r = Math.round((y - PAD) / CELL)
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null
  return { c, r }
}

function onClick(e) {
  if (gameState.value !== 'playing' || currentPlayer.value !== 'red') return
  const pos = boardPos(e.clientX, e.clientY)
  if (!pos) return

  const piece = get(pos.c, pos.r)

  if (selectedPos.value) {
    const mv = validMoves.find(m => m.tc === pos.c && m.tr === pos.r)
    if (mv) { doMove(mv); return }
    if (piece && piece.side === 'red') {
      selectedPos.value = pos
      validMoves = legalMoves('red').filter(m => m.fc === pos.c && m.fr === pos.r)
      draw()
      return
    }
    selectedPos.value = null; validMoves = []; draw()
    return
  }

  if (piece && piece.side === 'red') {
    selectedPos.value = pos
    validMoves = legalMoves('red').filter(m => m.fc === pos.c && m.fr === pos.r)
    draw()
  }
}

// === GAME CONTROL ===
function initBoard() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  const setup = [
    { type: 'R', c: 0, r: 0 }, { type: 'N', c: 1, r: 0 }, { type: 'E', c: 2, r: 0 }, { type: 'A', c: 3, r: 0 }, { type: 'K', c: 4, r: 0 }, { type: 'A', c: 5, r: 0 }, { type: 'E', c: 6, r: 0 }, { type: 'N', c: 7, r: 0 }, { type: 'R', c: 8, r: 0 },
    { type: 'C', c: 1, r: 2 }, { type: 'C', c: 7, r: 2 },
    { type: 'P', c: 0, r: 3 }, { type: 'P', c: 2, r: 3 }, { type: 'P', c: 4, r: 3 }, { type: 'P', c: 6, r: 3 }, { type: 'P', c: 8, r: 3 },
    { type: 'P', c: 0, r: 6 }, { type: 'P', c: 2, r: 6 }, { type: 'P', c: 4, r: 6 }, { type: 'P', c: 6, r: 6 }, { type: 'P', c: 8, r: 6 },
    { type: 'C', c: 1, r: 7 }, { type: 'C', c: 7, r: 7 },
    { type: 'R', c: 0, r: 9 }, { type: 'N', c: 1, r: 9 }, { type: 'E', c: 2, r: 9 }, { type: 'A', c: 3, r: 9 }, { type: 'K', c: 4, r: 9 }, { type: 'A', c: 5, r: 9 }, { type: 'E', c: 6, r: 9 }, { type: 'N', c: 7, r: 9 }, { type: 'R', c: 8, r: 9 },
  ]
  setup.forEach(s => {
    const side = s.r <= 4 ? 'black' : 'red'
    set(s.c, s.r, { type: s.type, side })
  })
}

function startGame() {
  initBoard()
  currentPlayer.value = 'red'
  selectedPos.value = null
  validMoves = []
  checkInfo.value = null
  gameState.value = 'playing'
  draw()
}

function restart() {
  clearTimeout(aiTimer)
  gameState.value = 'idle'
  initBoard()
  currentPlayer.value = 'red'
  selectedPos.value = null
  validMoves = []
  checkInfo.value = null
  draw()
}

onMounted(() => {
  const c = canvasRef.value
  c.width = W; c.height = H
  ctx = c.getContext('2d', { alpha: false })
  initBoard()
  draw()
  c.addEventListener('click', onClick)
})
onUnmounted(() => {
  canvasRef.value?.removeEventListener('click', onClick)
  clearTimeout(aiTimer)
})
</script>

<style scoped>
.chess-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  position: relative;
}

.chess-game__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 536px;
}

.chess-game__badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.chess-game__badge-icon {
  font-size: 26px;
  font-weight: 900;
  color: #c04030;
  text-shadow: 0 0 12px rgba(192,64,48,0.3);
}
.chess-game__badge-text {
  font-size: 18px;
  font-weight: 700;
  color: rgba(192,64,48,0.45);
}

.chess-game__turn {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2a;
  padding: 6px 16px;
  border-radius: 999px;
  background: rgba(26,26,42,0.06);
  border: 1px solid rgba(26,26,42,0.1);
}
.chess-game__turn.is-red { color: #c02010; background: rgba(192,32,16,0.06); border-color: rgba(192,32,16,0.12); }
.chess-game__turn-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #1a1a2a;
}
.chess-game__turn.is-red .chess-game__turn-dot { background: #c02010; }

.chess-game__btn {
  padding: 6px 18px;
  border-radius: 999px;
  border: 1px solid var(--blog-line);
  background: rgba(255,255,255,0.5);
  color: var(--blog-ink);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.chess-game__btn:hover {
  background: rgba(255,255,255,0.8);
  transform: translateY(-1px);
}

.chess-game__board-wrap {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 30px rgba(90,58,16,0.15), 0 0 0 1px rgba(90,58,16,0.1);
}
.chess-game__canvas {
  display: block;
  max-width: 100%;
  height: auto;
  cursor: pointer;
}

.chess-game__bottom {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.chess-game__key {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 4px 12px;
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
  border: 1px solid var(--blog-line);
}

.chess-game__modal {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20,16,10,0.85);
  backdrop-filter: blur(6px);
  border-radius: 12px;
  z-index: 10;
}
.chess-game__modal-box { text-align: center; padding: 32px 48px; }
.chess-game__modal-title {
  font-size: 32px;
  font-weight: 900;
  color: #e0b050;
  letter-spacing: 0.06em;
  text-shadow: 0 0 24px rgba(224,176,80,0.4);
  margin-bottom: 4px;
}
.chess-game__modal-sub { font-size: 14px; color: rgba(255,255,255,0.45); margin-bottom: 8px; }
.chess-game__modal-hint {
  font-size: 14px;
  color: rgba(255,255,255,0.35);
  margin-top: 20px;
  cursor: pointer;
  transition: color 0.2s;
}
.chess-game__modal-hint:hover { color: rgba(255,255,255,0.7); }

:global(.blog-page--dark) .chess-game__turn {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.08);
  color: #ddd;
}
:global(.blog-page--dark) .chess-game__turn.is-red { color: #e06050; background: rgba(224,96,80,0.1); border-color: rgba(224,96,80,0.15); }
:global(.blog-page--dark) .chess-game__btn {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.1);
  color: #ccc;
}
:global(.blog-page--dark) .chess-game__btn:hover { background: rgba(255,255,255,0.1); }
</style>
