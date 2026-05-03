<template>
  <main class="blog-page blog-page--games" :class="{ 'blog-page--dark': shouldUseDarkTheme }">
    <div class="blog-shell">
      <BlogTopbar
        title="Liu An Journal"
        :avatar-src="profileAvatar"
        avatar-alt="Homepage avatar"
        tool-label="首页"
        tool-to="/"
        :show-theme-toggle="true"
        :is-dark-theme="isDarkTheme"
        github-href="https://github.com/Snowingtree?tab=repositories"
        @toggle-theme="toggleTheme"
      />

      <section class="blog-surface games-hero">
        <div class="games-hero__copy">
          <p class="blog-profile-card__eyebrow">GAMES LAB</p>
          <h1>小游戏实验室</h1>
          <p class="games-hero__lead">
            这一页专门放节奏、棋盘和平台跳跃类原型。先把手感做顺，再慢慢叠加玩法。
          </p>
        </div>

        <div class="games-hero__stats">
          <article v-for="stat in heroStats" :key="stat.label" class="games-hero__stat">
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.label }}</span>
            <p>{{ stat.copy }}</p>
          </article>
        </div>
      </section>

      <section class="blog-surface games-browser">
        <div class="games-browser__head">
          <div class="games-browser__summary">
            <p class="games-browser__eyebrow">{{ activeGameMeta.kicker }}</p>
            <h2>{{ activeGameMeta.name }}</h2>
            <p>{{ activeGameMeta.summary }}</p>
          </div>

          <ul class="games-browser__meta">
            <li v-for="meta in activeGameMeta.meta" :key="meta">{{ meta }}</li>
          </ul>
        </div>

        <nav class="games-tab-bar" role="tablist" aria-label="小游戏切换">
          <button
            v-for="game in games"
            :key="game.id"
            class="games-tab-bar__item"
            :class="{ 'is-active': activeGame === game.id }"
            role="tab"
            :aria-selected="activeGame === game.id"
            @click="switchGame(game.id)"
          >
            <span class="games-tab-bar__title">{{ game.name }}</span>
            <span class="games-tab-bar__note">{{ game.note }}</span>
          </button>
        </nav>
      </section>

      <section class="blog-surface games-content" role="tabpanel" :aria-label="activeGameMeta.name">
        <SnakeGame v-if="activeGame === 'snake'" />
        <TetrisGame v-else-if="activeGame === 'tetris'" />
        <GomokuGame v-else-if="activeGame === 'gomoku'" />
        <AdventureGame v-else-if="activeGame === 'adventure'" />
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import profileAvatar from '../../assets/images/headerPH.png'
import BlogTopbar from '../../components/blog/BlogTopbar/BlogTopbar.vue'
import AdventureGame from '../../components/games/AdventureGame/AdventureGame.vue'
import GomokuGame from '../../components/games/GomokuGame/GomokuGame.vue'
import SnakeGame from '../../components/games/SnakeGame/SnakeGame.vue'
import TetrisGame from '../../components/games/TetrisGame/TetrisGame.vue'
import { useSiteTheme } from '../../hooks/useSiteTheme'

const ACTIVE_GAME_KEY = 'vibe-games-active-tab'

const { isDarkTheme, shouldUseDarkTheme, toggleTheme } = useSiteTheme()

const heroStats = [
  {
    value: '4',
    label: '当前原型',
    copy: '街机、棋盘和平台跳跃先并行打磨。'
  },
  {
    value: 'Keyboard',
    label: '操作方式',
    copy: '先把键盘反馈、响应和节奏做顺。'
  },
  {
    value: 'Single Session',
    label: '设计目标',
    copy: '每局都要能快速开局，不拖泥带水。'
  },
  {
    value: 'Ongoing',
    label: '迭代状态',
    copy: '优先修视觉层级和基础手感。'
  }
]

/* const legacyGames = [
  {
    id: 'snake',
    name: '贪吃蛇',
    note: '节奏反应',
    kicker: 'ARCADE REACTION',
    summary: '更强调转向反馈和逐步提速，让每次吃到食物都能明显把局面往前推一步。',
    meta: ['方向键 / WASD', '短局高频', '越长越快']
  },
  {
    id: 'tetris',
    name: '俄罗斯方块',
    note: '堆叠控场',
    kicker: 'STACK CONTROL',
    summary: '把核心手感放在旋转、硬降和锁定延迟上，减少“按了但没有接住”的挫败感。',
    meta: ['Enter 开始', 'Space 硬降', 'P 暂停']
  },
  {
    id: 'gomoku',
    name: '五子棋',
    note: '攻防判断',
    kicker: 'BOARD TACTICS',
    summary: '突出落点提示、最近一步和 AI 防守逻辑，让棋局读起来更清楚，不靠猜。',
    meta: ['鼠标落子', 'AI 应手', '先手可切换']
  },
  {
    id: 'adventure',
    name: '冒险岛',
    note: '平台跳跃',
    kicker: 'MOMENTUM PLATFORMER',
    summary: '重点修加速度、缓冲跳和复活点，让移动不再发飘，失误也不会直接断节奏。',
    meta: ['方向键移动', '跳跃缓冲', '中途可暂停']
  }
]

] */

const games = [
  {
    id: 'snake',
    name: '\u8d2a\u5403\u86c7',
    note: '\u8282\u594f\u53cd\u5e94',
    kicker: 'ARCADE REACTION',
    summary: '\u7528\u66f4\u7a33\u7684\u8f6c\u5411\u53cd\u9988\u548c\u901f\u5ea6\u722c\u5347\uff0c\u8ba9\u6bcf\u4e00\u53e3\u90fd\u80fd\u660e\u663e\u628a\u5c40\u9762\u5f80\u524d\u63a8\u3002',
    meta: ['\u65b9\u5411\u952e / WASD', '\u77ed\u5c40\u9ad8\u9891', '\u8d8a\u957f\u8d8a\u5feb']
  },
  {
    id: 'tetris',
    name: '\u4fc4\u7f57\u65af\u65b9\u5757',
    note: '\u5806\u53e0\u63a7\u573a',
    kicker: 'STACK CONTROL',
    summary: '\u628a\u65cb\u8f6c\u3001\u786c\u964d\u548c\u9501\u5b9a\u5ef6\u8fdf\u8c03\u5230\u66f4\u987a\uff0c\u51cf\u5c11\u201c\u6309\u4e86\u4f46\u6ca1\u63a5\u4f4f\u201d\u7684\u843d\u5dee\u611f\u3002',
    meta: ['Enter \u5f00\u59cb', 'Space \u786c\u964d', 'P \u6682\u505c']
  },
  {
    id: 'gomoku',
    name: '\u4e94\u5b50\u68cb',
    note: '\u653b\u9632\u5224\u65ad',
    kicker: 'BOARD TACTICS',
    summary: '\u7a81\u51fa\u843d\u70b9\u63d0\u793a\u3001\u6700\u8fd1\u4e00\u624b\u548c AI \u5e94\u5bf9\u903b\u8f91\uff0c\u8ba9\u68cb\u5c40\u8bfb\u8d77\u6765\u66f4\u6e05\u695a\u3002',
    meta: ['\u9f20\u6807\u843d\u5b50', 'AI \u5e94\u624b', '\u5148\u624b\u53ef\u5207\u6362']
  },
  {
    id: 'adventure',
    name: '\u5927\u9c7c\u5403\u5c0f\u9c7c',
    note: '\u6df1\u6d77\u541e\u98df',
    kicker: 'OCEAN SURVIVAL',
    summary: '\u7528\u9f20\u6807\u6216\u89e6\u6478\u63a7\u5236\u6e38\u5411\uff0c\u5148\u5403\u5c0f\u9c7c\u957f\u5927\uff0c\u518d\u7528\u51b2\u523a\u8e72\u5f00\u5927\u9c7c\u3002\u8fd9\u5c40\u91cd\u70b9\u662f\u751f\u5b58\u8282\u594f\u3001\u8fde\u5403\u500d\u7387\u548c\u5bb9\u79ef\u6210\u957f\u53cd\u9988\u3002',
    meta: ['Mouse / Touch \u8f6c\u5411', 'Space \u51b2\u523a', '\u5403\u5c0f\u8eb2\u5927']
  }
]

function readStoredGame() {
  if (typeof window === 'undefined') {
    return games[0].id
  }

  try {
    const storedGame = window.localStorage.getItem(ACTIVE_GAME_KEY)
    return games.some((game) => game.id === storedGame) ? storedGame : games[0].id
  } catch {
    return games[0].id
  }
}

const activeGame = ref(readStoredGame())
const activeGameMeta = computed(
  () => games.find((game) => game.id === activeGame.value) ?? games[0]
)

watch(activeGame, (nextGame) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(ACTIVE_GAME_KEY, nextGame)
  } catch {
    // Ignore storage failures and keep the in-memory state.
  }
})

function switchGame(id) {
  activeGame.value = id
}
</script>

<style scoped>
.games-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  gap: 24px;
  margin-top: 6px;
  padding: 30px;
}

.games-hero__copy {
  display: grid;
  align-content: center;
  gap: 12px;
}

.games-hero__copy h1 {
  margin: 0;
  font-size: clamp(2.2rem, 4vw, 3.2rem);
  line-height: 1.02;
}

.games-hero__lead {
  margin: 0;
  max-width: 34rem;
  color: var(--blog-copy);
  font-size: 1rem;
  line-height: 1.72;
}

.games-hero__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.games-hero__stat,
.games-tab-bar__item {
  border: 1px solid var(--blog-line);
  background: rgba(255, 255, 255, 0.44);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
}

.games-hero__stat {
  display: grid;
  gap: 6px;
  padding: 18px 20px;
  border-radius: 24px;
}

.games-hero__stat strong {
  color: var(--blog-accent-deep);
  font-size: 1.12rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.games-hero__stat span {
  color: var(--blog-ink);
  font-size: 0.96rem;
  font-weight: 700;
}

.games-hero__stat p {
  margin: 0;
  color: var(--blog-muted);
  font-size: 0.88rem;
  line-height: 1.55;
}

.games-browser {
  display: grid;
  gap: 22px;
  margin-top: 24px;
  padding: 24px;
}

.games-browser__head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.games-browser__summary {
  display: grid;
  gap: 8px;
  max-width: 42rem;
}

.games-browser__eyebrow {
  margin: 0;
  color: var(--blog-accent);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.games-browser__summary h2 {
  margin: 0;
  font-size: clamp(1.55rem, 3vw, 2.1rem);
}

.games-browser__summary p {
  margin: 0;
  color: var(--blog-copy);
  line-height: 1.7;
}

.games-browser__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.games-browser__meta li {
  padding: 10px 14px;
  border: 1px solid var(--blog-line);
  border-radius: 999px;
  color: var(--blog-ink);
  background: rgba(255, 255, 255, 0.5);
  font-size: 0.88rem;
}

.games-tab-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.games-tab-bar__item {
  display: grid;
  gap: 6px;
  padding: 18px 20px;
  border-radius: 22px;
  color: var(--blog-copy);
  text-align: left;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.games-tab-bar__item:hover {
  transform: translateY(-2px);
  border-color: rgba(30, 125, 109, 0.2);
  box-shadow: 0 14px 28px rgba(74, 57, 37, 0.08);
}

.games-tab-bar__item.is-active {
  color: var(--blog-ink);
  border-color: rgba(30, 125, 109, 0.16);
  background:
    linear-gradient(135deg, rgba(30, 125, 109, 0.08), rgba(212, 104, 63, 0.12)),
    rgba(255, 255, 255, 0.72);
  box-shadow: 0 16px 32px rgba(74, 57, 37, 0.08);
}

.games-tab-bar__title {
  font-size: 1rem;
  font-weight: 700;
}

.games-tab-bar__note {
  color: var(--blog-muted);
  font-size: 0.84rem;
}

.games-content {
  margin-top: 24px;
  padding: 32px clamp(18px, 3vw, 36px);
}

:global(.blog-page--dark) .games-hero__stat,
:global(.blog-page--dark) .games-tab-bar__item,
:global(.blog-page--dark) .games-browser__meta li {
  background: rgba(255, 255, 255, 0.04);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

:global(.blog-page--dark) .games-tab-bar__item.is-active {
  background:
    linear-gradient(135deg, rgba(111, 184, 171, 0.16), rgba(224, 138, 96, 0.18)),
    rgba(255, 255, 255, 0.04);
}

@media (max-width: 1100px) {
  .games-hero,
  .games-browser__head {
    grid-template-columns: 1fr;
  }

  .games-browser__head {
    display: grid;
  }

  .games-tab-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .games-hero,
  .games-browser,
  .games-content {
    padding: 22px;
  }

  .games-hero__stats,
  .games-tab-bar {
    grid-template-columns: 1fr;
  }

  .games-browser__meta {
    gap: 8px;
  }
}
</style>
