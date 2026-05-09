<template>
  <div class="spider-game">
    <div class="spider-game__top">
      <div class="spider-game__badge">
        <span class="spider-game__badge-icon">♠</span>
        <span class="spider-game__badge-text">蜘蛛纸牌</span>
      </div>
      <div class="spider-game__controls">
        <button
          v-for="d in difficulties"
          :key="d.id"
          class="spider-game__diff"
          :class="{ 'is-active': diff === d.id }"
          @click="changeDiff(d.id)"
        >{{ d.label }}</button>
      </div>
      <div class="spider-game__info">
        <span class="spider-game__stat">完成 {{ completed }}/8</span>
        <span class="spider-game__stat">剩余 {{ stockLeft }}</span>
      </div>
    </div>

    <div class="spider-game__frame" ref="frameRef">
      <canvas ref="canvasRef" class="spider-game__canvas" @click="onClick" />
      <div v-if="gameState !== 'playing'" class="spider-game__modal">
        <div class="spider-game__modal-box">
          <template v-if="gameState === 'win'">
            <p class="spider-game__modal-title spider-game__modal-title--win">恭喜通关</p>
            <p class="spider-game__modal-sub">你完成了蜘蛛纸牌！</p>
          </template>
          <template v-else>
            <p class="spider-game__modal-title">蜘蛛纸牌</p>
            <p class="spider-game__modal-sub">经典纸牌游戏</p>
          </template>
          <p class="spider-game__modal-hint" @click="startGame">点击开始</p>
        </div>
      </div>
    </div>

    <div class="spider-game__bar">
      <span class="spider-game__key">点击选牌</span>
      <span class="spider-game__key">点击目标列移牌</span>
      <span class="spider-game__key">右下角发牌</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const SUIT_COLORS = { '♠': '#1a1a2a', '♥': '#c02020', '♦': '#c02020', '♣': '#1a1a2a' }

const COLS = 10
const CARD_W = 72
const CARD_H = 100
const COL_GAP = 8
const FACE_DOWN_OFFSET = 18
const FACE_UP_OFFSET = 28
const PAD_X = 14
const PAD_Y = 14
const STOCK_X_OFFSET = 8
const STOCK_Y_OFFSET = 8

const canvasRef = ref(null)
const frameRef = ref(null)
const diff = ref(1)
const gameState = ref('idle')
const completed = ref(0)

let ctx, tableau, stock, selected, W, H

const difficulties = [
  { id: 1, label: '单花色', suits: 1 },
  { id: 2, label: '双花色', suits: 2 },
  { id: 4, label: '四花色', suits: 4 },
]

const stockLeft = computed(() => stock ? stock.length / 10 : 0)

function makeDecks(numSuits) {
  const suits = SUITS.slice(0, numSuits)
  const decks = []
  for (let d = 0; d < 8; d++) {
    for (const suit of suits) {
      for (let r = 0; r < 13; r++) {
        decks.push({ suit, rank: r, faceUp: false })
      }
    }
  }
  // for 2 suits: 8 decks × 2 suits × 13 = 208, but we need 104
  // standard spider: 2 decks total
  // 1 suit: 8×1 suit = 104
  // 2 suits: 4×2 suits = 104
  // 4 suits: 2×4 suits = 104
  return decks
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function deal() {
  const numSuits = difficulties.find(d => d.id === diff.value).suits
  let decksPerSuit
  if (numSuits === 1) decksPerSuit = 8
  else if (numSuits === 2) decksPerSuit = 4
  else decksPerSuit = 2

  const cards = []
  const suits = SUITS.slice(0, numSuits)
  for (let d = 0; d < decksPerSuit; d++) {
    for (const suit of suits) {
      for (let r = 0; r < 13; r++) {
        cards.push({ suit, rank: r, faceUp: false })
      }
    }
  }
  shuffle(cards)

  // 54 cards to tableau (4 cols × 6 + 6 cols × 5)
  tableau = Array.from({ length: COLS }, () => [])
  let idx = 0
  for (let c = 0; c < 4; c++) {
    for (let i = 0; i < 6; i++) {
      cards[idx].faceUp = i === 5
      tableau[c].push(cards[idx++])
    }
  }
  for (let c = 4; c < 10; c++) {
    for (let i = 0; i < 5; i++) {
      cards[idx].faceUp = i === 4
      tableau[c].push(cards[idx++])
    }
  }

  // remaining 50 cards = stock (5 groups of 10)
  stock = cards.slice(idx)
}

function getSameSuitSeq(col, startIdx) {
  // returns the longest same-suit descending sequence starting at startIdx
  const cards = tableau[col]
  if (startIdx >= cards.length) return []
  const seq = [cards[startIdx]]
  for (let i = startIdx + 1; i < cards.length; i++) {
    const prev = cards[i - 1], cur = cards[i]
    if (cur.faceUp && cur.suit === prev.suit && cur.rank === prev.rank - 1) {
      seq.push(cur)
    } else break
  }
  return seq
}

function canPlace(card, targetCol) {
  const target = tableau[targetCol]
  if (target.length === 0) return true
  const top = target[target.length - 1]
  return top.faceUp && top.rank === card.rank + 1
}

function tryComplete(col) {
  const cards = tableau[col]
  if (cards.length < 13) return false
  // check if last 13 cards are K→A same suit, all face up
  const start = cards.length - 13
  for (let i = start; i < cards.length; i++) {
    if (!cards[i].faceUp) return false
  }
  const suit = cards[start].suit
  for (let i = 0; i < 13; i++) {
    if (cards[start + i].suit !== suit || cards[start + i].rank !== 12 - i) return false
  }
  // remove the sequence
  tableau[col].splice(start, 13)
  completed.value++
  if (tableau[col].length > 0) tableau[col][tableau[col].length - 1].faceUp = true
  if (completed.value >= 8) gameState.value = 'win'
  return true
}

function dealStock() {
  if (stock.length === 0) return false
  // check all columns have at least one card
  for (let c = 0; c < COLS; c++) {
    if (tableau[c].length === 0) return false
  }
  for (let c = 0; c < COLS; c++) {
    const card = stock.pop()
    card.faceUp = true
    tableau[c].push(card)
  }
  // check for completed sequences after dealing
  for (let c = 0; c < COLS; c++) tryComplete(c)
  return true
}

function onClick(e) {
  if (gameState.value !== 'playing') return
  const pos = getClickPos(e)
  if (!pos) return

  const { col, idx, isStock } = pos

  // stock area clicked
  if (isStock && stock.length > 0) {
    dealStock()
    selected = null
    draw()
    return
  }

  if (col < 0 || col >= COLS) return
  const cards = tableau[col]

  if (selected) {
    // try to move selected to this column
    if (selected.col === col) {
      // deselect
      selected = null
      draw()
      return
    }
    const srcCards = tableau[selected.col]
    const seq = getSameSuitSeq(selected.col, selected.idx)
    if (seq.length === 0) { selected = null; draw(); return }
    if (!canPlace(seq[0], col)) { selected = null; draw(); return }

    // move
    const moved = srcCards.splice(selected.idx)
    tableau[col].push(...moved)

    // flip new top card
    if (srcCards.length > 0) srcCards[srcCards.length - 1].faceUp = true

    selected = null
    tryComplete(col)
    draw()
    return
  }

  // select a face-up card
  if (idx < cards.length && cards[idx].faceUp) {
    const seq = getSameSuitSeq(col, idx)
    if (seq.length > 0) {
      selected = { col, idx }
    }
    draw()
  }
}

function getClickPos(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  const sx = W / rect.width, sy = H / rect.height
  const x = (e.clientX - rect.left) * sx, y = (e.clientY - rect.top) * sy

  // check stock area
  const stockX = W - (CARD_W + STOCK_X_OFFSET)
  const stockY = H - (CARD_H + STOCK_Y_OFFSET)
  if (x >= stockX && x <= stockX + CARD_W && y >= stockY && y <= stockY + CARD_H) {
    return { isStock: true }
  }

  // find column (right to left for overlap)
  for (let c = COLS - 1; c >= 0; c--) {
    const colX = PAD_X + c * (CARD_W + COL_GAP)
    if (x < colX || x > colX + CARD_W) continue

    const col = tableau[c]
    if (col.length === 0) {
      if (y >= PAD_Y && y <= PAD_Y + CARD_H) return { col: c, idx: 0 }
      continue
    }

    // find card from bottom
    for (let i = col.length - 1; i >= 0; i--) {
      const cardY = getCardY(c, i)
      if (y >= cardY && y <= cardY + (i < col.length - 1 ? (col[i].faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET) : CARD_H)) {
        return { col: c, idx: i }
      }
    }
    // clicked below all cards
    const lastY = getCardY(c, col.length - 1) + CARD_H
    if (y > lastY - CARD_H) return { col: c, idx: col.length - 1 }
  }
  return null
}

function getCardY(col, idx) {
  const cards = tableau[col]
  let y = PAD_Y
  for (let i = 0; i < idx; i++) {
    y += cards[i].faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET
  }
  return y
}

// === DRAWING ===
function draw() {
  if (!ctx) return

  // green felt background
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#1a6b3a'); bg.addColorStop(0.5, '#1e7840'); bg.addColorStop(1, '#166030')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

  // subtle pattern
  ctx.fillStyle = 'rgba(0,0,0,0.03)'
  for (let y = 0; y < H; y += 20) {
    for (let x = (y % 40 === 0 ? 0 : 10); x < W; x += 20) {
      ctx.fillRect(x, y, 1, 1)
    }
  }

  // columns
  for (let c = 0; c < COLS; c++) {
    const colX = PAD_X + c * (CARD_W + COL_GAP)
    // empty column placeholder
    if (tableau[c].length === 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5
      roundRect(ctx, colX, PAD_Y, CARD_W, CARD_H, 6)
      ctx.stroke()
    }

    // draw cards
    for (let i = 0; i < tableau[c].length; i++) {
      const card = tableau[c][i]
      const cardY = getCardY(c, i)
      const isSelected = selected && selected.col === c && i >= selected.idx
      drawCard(colX, cardY, card, isSelected)
    }
  }

  // stock pile
  drawStock()
}

function drawCard(x, y, card, highlight) {
  if (card.faceUp) {
    // white card
    ctx.fillStyle = highlight ? '#fffff0' : '#fff'
    roundRectFill(ctx, x, y, CARD_W, CARD_H, 5)
    ctx.strokeStyle = highlight ? '#f0c040' : '#bbb'; ctx.lineWidth = highlight ? 2 : 1
    roundRect(ctx, x, y, CARD_W, CARD_H, 5); ctx.stroke()

    // rank and suit
    const color = SUIT_COLORS[card.suit]
    ctx.fillStyle = color
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.fillText(RANKS[card.rank], x + 6, y + 6)
    ctx.font = '14px sans-serif'
    ctx.fillText(card.suit, x + 6, y + 24)

    // center suit
    ctx.font = '28px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(card.suit, x + CARD_W / 2, y + CARD_H / 2 + 2)

    // bottom right (inverted)
    ctx.save()
    ctx.translate(x + CARD_W - 6, y + CARD_H - 6)
    ctx.rotate(Math.PI)
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.fillText(RANKS[card.rank], 0, 0)
    ctx.restore()
  } else {
    // face down - pattern
    ctx.fillStyle = '#2060a0'
    roundRectFill(ctx, x, y, CARD_W, CARD_H, 5)
    ctx.strokeStyle = '#184878'; ctx.lineWidth = 1
    roundRect(ctx, x, y, CARD_W, CARD_H, 5); ctx.stroke()

    // cross-hatch pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1
    for (let d = -CARD_H; d < CARD_W + CARD_H; d += 10) {
      ctx.beginPath()
      ctx.moveTo(x + Math.max(0, d), y + Math.max(0, -d))
      ctx.lineTo(x + Math.min(CARD_W, d + CARD_H), y + Math.min(CARD_H, CARD_W - d))
      ctx.stroke()
    }
    // border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5
    roundRect(ctx, x + 4, y + 4, CARD_W - 8, CARD_H - 8, 3); ctx.stroke()
  }
}

function drawStock() {
  const stockX = W - (CARD_W + STOCK_X_OFFSET)
  const stockY = H - (CARD_H + STOCK_Y_OFFSET)

  if (stock.length > 0) {
    // draw stack indicator
    const groups = Math.ceil(stock.length / 10)
    for (let i = 0; i < Math.min(groups, 3); i++) {
      ctx.fillStyle = '#2060a0'
      roundRectFill(ctx, stockX - i * 3, stockY - i * 3, CARD_W, CARD_H, 5)
      ctx.strokeStyle = '#184878'; ctx.lineWidth = 1
      roundRect(ctx, stockX - i * 3, stockY - i * 3, CARD_W, CARD_H, 5); ctx.stroke()
    }
    // count
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(`${Math.ceil(stock.length / 10)}`, stockX + CARD_W / 2, stockY + CARD_H / 2)
  } else {
    // empty
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1
    roundRect(ctx, stockX, stockY, CARD_W, CARD_H, 5); ctx.stroke()
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function roundRectFill(ctx, x, y, w, h, r) {
  roundRect(ctx, x, y, w, h, r)
  ctx.fill()
}

function calcHeight() {
  let maxH = PAD_Y + CARD_H + 20
  for (let c = 0; c < COLS; c++) {
    const cards = tableau[c]
    let h = PAD_Y + CARD_H
    for (let i = 0; i < cards.length - 1; i++) {
      h += cards[i].faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET
    }
    maxH = Math.max(maxH, h + STOCK_Y_OFFSET + CARD_H + 20)
  }
  return maxH
}

function resizeCanvas() {
  W = PAD_X * 2 + COLS * CARD_W + (COLS - 1) * COL_GAP
  H = Math.max(520, calcHeight())
  if (canvasRef.value) {
    canvasRef.value.width = W
    canvasRef.value.height = H
    ctx = canvasRef.value.getContext('2d', { alpha: false })
  }
}

function startGame() {
  deal()
  completed.value = 0
  selected = null
  gameState.value = 'playing'
  resizeCanvas()
  draw()
}

function changeDiff(id) {
  diff.value = id
  gameState.value = 'idle'
  deal()
  completed.value = 0
  selected = null
  resizeCanvas()
  draw()
}

onMounted(() => {
  deal()
  resizeCanvas()
  draw()
})
</script>

<style scoped>
.spider-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
}

.spider-game__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 820px;
  flex-wrap: wrap;
  gap: 10px;
}

.spider-game__badge {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.spider-game__badge-icon {
  font-size: 26px;
  color: #30a050;
  text-shadow: 0 0 12px rgba(48,160,80,0.3);
}
.spider-game__badge-text {
  font-size: 16px;
  font-weight: 700;
  color: rgba(48,160,80,0.45);
}

.spider-game__controls {
  display: flex;
  gap: 6px;
}
.spider-game__diff {
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
.spider-game__diff:hover { background: rgba(255,255,255,0.7); }
.spider-game__diff.is-active {
  background: linear-gradient(135deg, rgba(48,160,80,0.12), rgba(48,160,80,0.06));
  border-color: rgba(48,160,80,0.25);
  color: #30a050;
}

.spider-game__info {
  display: flex;
  gap: 10px;
}
.spider-game__stat {
  font-size: 14px;
  font-weight: 700;
  color: #30a050;
  padding: 4px 12px;
  background: rgba(48,160,80,0.06);
  border-radius: 8px;
  border: 1px solid rgba(48,160,80,0.1);
}

.spider-game__frame {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.08);
  max-width: 100%;
}
.spider-game__canvas {
  display: block;
  max-width: 100%;
  height: auto;
  cursor: pointer;
}

.spider-game__modal {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10,30,20,0.85);
  backdrop-filter: blur(4px);
}
.spider-game__modal-box { text-align: center; padding: 28px 40px; }
.spider-game__modal-title {
  font-size: 28px;
  font-weight: 900;
  color: #30a050;
  letter-spacing: 0.06em;
  text-shadow: 0 0 20px rgba(48,160,80,0.4);
  margin-bottom: 4px;
}
.spider-game__modal-title--win { color: #f0c040; text-shadow: 0 0 20px rgba(240,192,64,0.4); }
.spider-game__modal-sub { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 6px; }
.spider-game__modal-hint {
  font-size: 13px;
  color: rgba(255,255,255,0.3);
  margin-top: 14px;
  cursor: pointer;
  transition: color 0.2s;
}
.spider-game__modal-hint:hover { color: rgba(255,255,255,0.7); }

.spider-game__bar { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.spider-game__key {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 4px 12px;
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
  border: 1px solid var(--blog-line);
}

:global(.blog-page--dark) .spider-game__diff {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.08);
  color: #ccc;
}
:global(.blog-page--dark) .spider-game__diff.is-active {
  background: rgba(48,160,80,0.12);
  border-color: rgba(48,160,80,0.2);
  color: #50c070;
}
</style>
