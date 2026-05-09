<template>
  <div class="td-game">
    <div class="td-game__top">
      <div class="td-game__badge">
        <span class="td-game__badge-icon">塔</span>
        <span class="td-game__badge-text">防</span>
      </div>
      <div class="td-game__stats">
        <span class="td-game__stat td-game__stat--life">♥ {{ lives }}</span>
        <span class="td-game__stat td-game__stat--gold">⬡ {{ gold }}</span>
        <span class="td-game__stat td-game__stat--wave">WAVE {{ wave }}</span>
      </div>
      <button class="td-game__btn" @click="startWave" :disabled="waveActive">
        {{ waveActive ? '进行中...' : '开始波次' }}
      </button>
    </div>

    <div class="td-game__frame">
      <canvas ref="canvasRef" class="td-game__canvas" />
      <div v-if="gameState !== 'playing'" class="td-game__modal">
        <div class="td-game__modal-box">
          <template v-if="gameState === 'lose'">
            <p class="td-game__modal-title">基地沦陷</p>
            <p class="td-game__modal-sub">坚持到第 {{ wave }} 波</p>
          </template>
          <template v-else-if="gameState === 'win'">
            <p class="td-game__modal-title td-game__modal-title--win">全部击退</p>
            <p class="td-game__modal-sub">你赢了！</p>
          </template>
          <template v-else>
            <p class="td-game__modal-title">迷你塔防</p>
            <p class="td-game__modal-sub">在路径旁建塔，消灭所有敌人</p>
          </template>
          <p class="td-game__modal-hint" @click="restart">点击开始</p>
        </div>
      </div>
    </div>

    <div class="td-game__tower-bar">
      <button
        v-for="t in towerTypes"
        :key="t.id"
        class="td-game__tower-btn"
        :class="{ 'is-active': selected === t.id, 'is-disabled': gold < t.cost }"
        @click="selectTower(t.id)"
      >
        <span class="td-game__tower-icon" :style="{ color: t.color }">{{ t.icon }}</span>
        <span class="td-game__tower-name">{{ t.name }}</span>
        <span class="td-game__tower-cost">⬡{{ t.cost }}</span>
      </button>
    </div>

    <div class="td-game__bar">
      <span class="td-game__key">点击空地建塔</span>
      <span class="td-game__key">敌人沿路径前进</span>
      <span class="td-game__key">守住基地</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const COLS = 16, ROWS = 12, CELL = 40
const W = COLS * CELL, H = ROWS * CELL

const canvasRef = ref(null)
const gameState = ref('idle')
const lives = ref(20)
const gold = ref(100)
const wave = ref(0)
const waveActive = ref(false)
const selected = ref('arrow')

let ctx, anim, towers, enemies, projectiles, particles, spawnQueue, spawnTimer, grid

// Path waypoints (col, row)
const WAYPOINTS = [
  { c: 0, r: 5 }, { c: 4, r: 5 }, { c: 4, r: 9 }, { c: 10, r: 9 }, { c: 10, r: 2 }, { c: 15, r: 2 },
]

const towerTypes = [
  { id: 'arrow', name: '箭塔', cost: 30, range: 3.5, damage: 15, rate: 20, color: '#4a9', icon: '↑', splash: 0 },
  { id: 'cannon', name: '炮塔', cost: 60, range: 2.5, damage: 40, rate: 45, color: '#c64', icon: '●', splash: 1.2 },
  { id: 'ice', name: '冰塔', cost: 40, range: 3, damage: 8, rate: 25, color: '#4ae', icon: '❄', splash: 0, slow: 0.5 },
]

const ENEMY_TYPES = [
  { type: 'normal', hp: 60, speed: 1.2, r: 8, color: '#d44', value: 10 },
  { type: 'fast', hp: 35, speed: 2.0, r: 6, color: '#da4', value: 8 },
  { type: 'tank', hp: 160, speed: 0.7, r: 11, color: '#848', value: 20 },
]

function initGrid() {
  // 0 = grass, 1 = path
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  // mark path cells
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const a = WAYPOINTS[i], b = WAYPOINTS[i + 1]
    if (a.c === b.c) {
      const minR = Math.min(a.r, b.r), maxR = Math.max(a.r, b.r)
      for (let r = minR; r <= maxR; r++) grid[r][a.c] = 1
    } else {
      const minC = Math.min(a.c, b.c), maxC = Math.max(a.c, b.c)
      for (let c = minC; c <= maxC; c++) grid[a.r][c] = 1
    }
  }
}

function init() {
  initGrid()
  towers = []; enemies = []; projectiles = []; particles = []
  spawnQueue = []; spawnTimer = 0
  lives.value = 20; gold.value = 100; wave.value = 0
  waveActive.value = false
}

function restart() {
  init()
  gameState.value = 'playing'
  draw()
}

function selectTower(id) {
  if (gold.value >= towerTypes.find(t => t.id === id).cost) selected.value = id
}

function startWave() {
  if (waveActive.value || gameState.value !== 'playing') return
  wave.value++
  waveActive.value = true

  // generate enemies for this wave
  const count = 6 + wave.value * 2
  spawnQueue = []
  for (let i = 0; i < count; i++) {
    let type
    const r = Math.random()
    if (wave.value < 3) type = ENEMY_TYPES[0]
    else if (r < 0.3) type = ENEMY_TYPES[1]
    else if (r < 0.5 && wave.value > 5) type = ENEMY_TYPES[2]
    else type = ENEMY_TYPES[0]

    const hpMult = 1 + (wave.value - 1) * 0.15
    spawnQueue.push({
      ...type,
      hp: Math.round(type.hp * hpMult),
      maxHp: Math.round(type.hp * hpMult),
      wpIdx: 0,
      x: WAYPOINTS[0].c * CELL + CELL / 2,
      y: WAYPOINTS[0].r * CELL + CELL / 2,
      slow: 0,
      slowTimer: 0,
    })
  }
  spawnTimer = 0
}

function spawnEnemy() {
  if (spawnQueue.length === 0) return
  const e = spawnQueue.shift()
  enemies.push(e)
}

function update(dt) {
  // spawn
  if (spawnQueue.length > 0) {
    spawnTimer += dt
    if (spawnTimer >= 30) { spawnTimer = 0; spawnEnemy() }
  }

  // enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i]
    if (e.slowTimer > 0) { e.slowTimer -= dt; if (e.slowTimer <= 0) e.slow = 0 }

    const wp = WAYPOINTS[e.wpIdx + 1]
    if (!wp) {
      // reached end
      lives.value--
      enemies.splice(i, 1)
      if (lives.value <= 0) { gameState.value = 'lose'; return }
      continue
    }

    const tx = wp.c * CELL + CELL / 2, ty = wp.r * CELL + CELL / 2
    const dx = tx - e.x, dy = ty - e.y
    const dist = Math.hypot(dx, dy)
    const spd = e.speed * (1 - e.slow) * dt

    if (dist < spd + 2) {
      e.x = tx; e.y = ty; e.wpIdx++
    } else {
      e.x += (dx / dist) * spd
      e.y += (dy / dist) * spd
    }
  }

  // towers
  towers.forEach(t => {
    t.cooldown = Math.max(0, t.cooldown - dt)
    if (t.cooldown > 0) return

    const range = t.range * CELL
    let target = null, minDist = Infinity
    enemies.forEach(e => {
      const d = Math.hypot(e.x - t.x, e.y - t.y)
      if (d < range && d < minDist) { minDist = d; target = e }
    })

    if (target) {
      t.cooldown = t.rate
      const cfg = towerTypes.find(tt => tt.id === t.type)
      projectiles.push({
        x: t.x, y: t.y,
        tx: target, speed: 5,
        damage: cfg.damage, splash: cfg.splash * CELL,
        slow: cfg.slow || 0, color: cfg.color,
      })
    }
  })

  // projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]
    if (!p.tx || !enemies.includes(p.tx)) { projectiles.splice(i, 1); continue }
    const dx = p.tx.x - p.x, dy = p.tx.y - p.y
    const dist = Math.hypot(dx, dy)
    if (dist < p.speed * dt + 4) {
      // hit
      if (p.splash > 0) {
        enemies.forEach(e => {
          if (Math.hypot(e.x - p.tx.x, e.y - p.tx.y) < p.splash) {
            e.hp -= p.damage
            if (p.slow > 0) { e.slow = p.slow; e.slowTimer = 60 }
          }
        })
        addP(p.tx.x, p.tx.y, '#f80', 6)
      } else {
        p.tx.hp -= p.damage
        if (p.slow > 0) { p.tx.slow = p.slow; p.tx.slowTimer = 60 }
        addP(p.tx.x, p.tx.y, p.color, 3)
      }
      projectiles.splice(i, 1)
    } else {
      p.x += (dx / dist) * p.speed * dt
      p.y += (dy / dist) * p.speed * dt
    }
  }

  // remove dead enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].hp <= 0) {
      gold.value += enemies[i].value
      addP(enemies[i].x, enemies[i].y, '#fa0', 8)
      enemies.splice(i, 1)
    }
  }

  // particles
  particles = particles.filter(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; return p.life > 0 })

  // check wave end
  if (waveActive.value && spawnQueue.length === 0 && enemies.length === 0) {
    waveActive.value = false
    if (wave.value >= 15) gameState.value = 'win'
  }
}

function addP(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 20 + Math.random() * 15, col })
  }
}

// === DRAWING ===
function draw() {
  if (!ctx) return

  // grid
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * CELL, y = r * CELL
      if (grid[r][c] === 1) {
        ctx.fillStyle = '#c8b080'
        ctx.fillRect(x, y, CELL, CELL)
        ctx.fillStyle = 'rgba(0,0,0,0.05)'
        ctx.fillRect(x, y, CELL, CELL)
      } else {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#5a883a' : '#4e7a32'
        ctx.fillRect(x, y, CELL, CELL)
      }
    }
  }

  // path direction arrows
  ctx.fillStyle = 'rgba(0,0,0,0.08)'
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const a = WAYPOINTS[i], b = WAYPOINTS[i + 1]
    const mx = ((a.c + b.c) / 2) * CELL + CELL / 2
    const my = ((a.r + b.r) / 2) * CELL + CELL / 2
    ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(b.c > a.c ? '→' : b.r > a.r ? '↓' : '↑', mx, my)
  }

  // towers
  towers.forEach(t => {
    const cfg = towerTypes.find(tt => tt.id === t.type)
    // base
    ctx.fillStyle = '#555'
    ctx.beginPath(); ctx.arc(t.x, t.y, CELL * 0.38, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = cfg.color
    ctx.beginPath(); ctx.arc(t.x, t.y, CELL * 0.28, 0, Math.PI * 2); ctx.fill()
    // icon
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(cfg.icon, t.x, t.y)
  })

  // enemies
  enemies.forEach(e => {
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath(); ctx.arc(e.x + 2, e.y + 2, e.r, 0, Math.PI * 2); ctx.fill()
    // body
    ctx.fillStyle = e.slow > 0 ? '#6ae' : e.color
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.stroke()
    // hp bar
    const bw = e.r * 2.2, bh = 3
    const bx = e.x - bw / 2, by = e.y - e.r - 6
    ctx.fillStyle = '#300'; ctx.fillRect(bx, by, bw, bh)
    ctx.fillStyle = '#f44'; ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh)
  })

  // projectiles
  projectiles.forEach(p => {
    ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill()
  })

  // particles
  particles.forEach(p => {
    ctx.globalAlpha = Math.min(1, p.life / 15)
    ctx.fillStyle = p.col
    ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill()
  })
  ctx.globalAlpha = 1

  // selected tower preview on hover
  if (gameState.value === 'playing') {
    // nothing here, handled in mousemove
  }
}

function loop() {
  if (gameState.value === 'playing') {
    update(1)
    draw()
    anim = requestAnimationFrame(loop)
  } else {
    draw()
    anim = null
  }
}

// === INTERACTION ===
function onCanvasClick(e) {
  if (gameState.value !== 'playing') return
  const rect = canvasRef.value.getBoundingClientRect()
  const sx = W / rect.width, sy = H / rect.height
  const x = (e.clientX - rect.left) * sx, y = (e.clientY - rect.top) * sy
  const c = Math.floor(x / CELL), r = Math.floor(y / CELL)
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return
  if (grid[r][c] !== 0) return

  // check if tower already here
  const tx = c * CELL + CELL / 2, ty = r * CELL + CELL / 2
  if (towers.some(t => Math.hypot(t.x - tx, t.y - ty) < CELL * 0.5)) return

  const cfg = towerTypes.find(t => t.id === selected.value)
  if (!cfg || gold.value < cfg.cost) return

  gold.value -= cfg.cost
  towers.push({ x: tx, y: ty, type: cfg.id, cooldown: 0, range: cfg.range, rate: cfg.rate })
  draw()
}

onMounted(() => {
  const c = canvasRef.value; c.width = W; c.height = H
  ctx = c.getContext('2d', { alpha: false })
  init(); draw()
  c.addEventListener('click', onCanvasClick)
})
onUnmounted(() => {
  canvasRef.value?.removeEventListener('click', onCanvasClick)
  if (anim) cancelAnimationFrame(anim)
})
</script>

<style scoped>
.td-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
}

.td-game__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 640px;
  flex-wrap: wrap;
  gap: 10px;
}

.td-game__badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.td-game__badge-icon {
  font-size: 26px;
  font-weight: 900;
  color: #e08030;
  text-shadow: 0 0 12px rgba(224,128,48,0.3);
}
.td-game__badge-text {
  font-size: 16px;
  font-weight: 700;
  color: rgba(224,128,48,0.4);
}

.td-game__stats {
  display: flex;
  gap: 8px;
}
.td-game__stat {
  font-size: 14px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 8px;
  font-variant-numeric: tabular-nums;
}
.td-game__stat--life { color: #e44; background: rgba(238,68,68,0.08); }
.td-game__stat--gold { color: #da0; background: rgba(221,170,0,0.08); }
.td-game__stat--wave { color: #4a9; background: rgba(68,170,153,0.08); }

.td-game__btn {
  padding: 7px 18px;
  border-radius: 999px;
  border: 1px solid var(--blog-line);
  background: rgba(255,255,255,0.5);
  color: var(--blog-ink);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.td-game__btn:hover:not(:disabled) { background: rgba(255,255,255,0.8); transform: translateY(-1px); }
.td-game__btn:disabled { opacity: 0.4; cursor: default; }

.td-game__frame {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.06);
}
.td-game__canvas {
  display: block;
  max-width: 100%;
  height: auto;
  cursor: pointer;
}

.td-game__modal {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10,20,10,0.85);
  backdrop-filter: blur(4px);
}
.td-game__modal-box { text-align: center; padding: 28px 40px; }
.td-game__modal-title {
  font-size: 28px;
  font-weight: 900;
  color: #e08030;
  letter-spacing: 0.06em;
  text-shadow: 0 0 20px rgba(224,128,48,0.4);
  margin-bottom: 4px;
}
.td-game__modal-title--win { color: #40b860; text-shadow: 0 0 20px rgba(64,184,96,0.4); }
.td-game__modal-sub { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 6px; }
.td-game__modal-hint {
  font-size: 13px;
  color: rgba(255,255,255,0.3);
  margin-top: 14px;
  cursor: pointer;
  transition: color 0.2s;
}
.td-game__modal-hint:hover { color: rgba(255,255,255,0.7); }

.td-game__tower-bar {
  display: flex;
  gap: 10px;
}
.td-game__tower-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 18px;
  border-radius: 14px;
  border: 1px solid var(--blog-line);
  background: rgba(255,255,255,0.44);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.42);
  color: var(--blog-copy);
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
}
.td-game__tower-btn:hover { transform: translateY(-1px); }
.td-game__tower-btn.is-active {
  border-color: rgba(68,170,153,0.3);
  background: linear-gradient(135deg, rgba(68,170,153,0.1), rgba(224,128,48,0.08)), rgba(255,255,255,0.6);
  box-shadow: 0 6px 16px rgba(0,0,0,0.06);
}
.td-game__tower-btn.is-disabled { opacity: 0.35; cursor: default; }
.td-game__tower-icon { font-size: 22px; }
.td-game__tower-name { font-size: 12px; font-weight: 700; }
.td-game__tower-cost { font-size: 11px; color: #da0; font-weight: 600; }

.td-game__bar { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.td-game__key {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 4px 12px;
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
  border: 1px solid var(--blog-line);
}

:global(.blog-page--dark) .td-game__tower-btn {
  background: rgba(255,255,255,0.04);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
}
:global(.blog-page--dark) .td-game__tower-btn.is-active {
  background: linear-gradient(135deg, rgba(68,170,153,0.15), rgba(224,128,48,0.1)), rgba(255,255,255,0.04);
}
</style>
