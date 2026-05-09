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
            这一页专门放节奏、棋盘和策略类原型。先把手感做顺，再慢慢叠加玩法。
          </p>
        </div>
      </section>

      <section class="games-area">
        <div class="games-area__main">
          <div class="blog-surface games-content" role="tabpanel" :aria-label="activeGameMeta.name">
            <SnakeGame v-if="activeGame === 'snake'" />
            <TetrisGame v-else-if="activeGame === 'tetris'" />
            <GomokuGame v-else-if="activeGame === 'gomoku'" />
            <ChineseChessGame v-else-if="activeGame === 'chinese-chess'" />
            <SpiderSolitaireGame v-else-if="activeGame === 'spider'" />
            <MinesweeperGame v-else-if="activeGame === 'minesweeper'" />
            <TowerDefenseGame v-else-if="activeGame === 'tower-defense'" />
          </div>

          <aside class="games-sidebar" role="tablist" aria-label="小游戏切换">
            <button
              v-for="game in games"
              :key="game.id"
              class="games-sidebar__item"
              :class="{ 'is-active': activeGame === game.id }"
              role="tab"
              :aria-selected="activeGame === game.id"
              @click="switchGame(game.id)"
            >
              <span class="games-sidebar__title">{{ game.name }}</span>
              <span class="games-sidebar__note">{{ game.note }}</span>
            </button>
          </aside>
        </div>

      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import profileAvatar from '../../assets/images/headerPH.png'
import BlogTopbar from '../../components/blog/BlogTopbar/BlogTopbar.vue'
import ChineseChessGame from '../../components/games/ChineseChessGame/ChineseChessGame.vue'
import SpiderSolitaireGame from '../../components/games/SpiderSolitaireGame/SpiderSolitaireGame.vue'
import GomokuGame from '../../components/games/GomokuGame/GomokuGame.vue'
import MinesweeperGame from '../../components/games/MinesweeperGame/MinesweeperGame.vue'
import SnakeGame from '../../components/games/SnakeGame/SnakeGame.vue'
import TetrisGame from '../../components/games/TetrisGame/TetrisGame.vue'
import TowerDefenseGame from '../../components/games/TowerDefenseGame/TowerDefenseGame.vue'
import { useSiteTheme } from '../../hooks/useSiteTheme'

const ACTIVE_GAME_KEY = 'vibe-games-active-tab'

const { isDarkTheme, shouldUseDarkTheme, toggleTheme } = useSiteTheme()

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
    id: 'chinese-chess',
    name: '\u4e2d\u56fd\u8c61\u68cb',
    note: '\u653b\u9632\u535a\u5f08',
    kicker: 'CLASSIC STRATEGY',
    summary: '\u7ecf\u5178\u4e2d\u56fd\u8c61\u68cb\uff0c\u70b9\u51fb\u9009\u5b50\u518d\u70b9\u843d\u5b50\uff0c\u4e0e AI \u5bf9\u5f08\u3002\u652f\u6301\u5b8c\u6574\u7684\u8d70\u6cd5\u89c4\u5219\u3001\u5c06\u519b\u68c0\u6d4b\u548c\u5c06\u6b7b\u5224\u5b9a\u3002',
    meta: ['\u70b9\u51fb\u9009\u5b50\u843d\u5b50', 'AI \u5bf9\u624b', '\u7ea2\u65b9\u5148\u884c']
  },
  {
    id: 'spider',
    name: '\u8718\u86db\u7eb8\u724c',
    note: '\u7eb8\u724c\u63a5\u9f99',
    kicker: 'CARD SOLITAIRE',
    summary: '\u7ecf\u5178\u8718\u86db\u7eb8\u724c\uff0c\u5c06\u540c\u82b1\u8272\u7684\u724c\u4eceK\u5230A\u6392\u5217\u5373\u53ef\u6d88\u9664\u3002\u4e09\u79cd\u96be\u5ea6\u53ef\u9009\uff0c\u5168\u90e8\u6d88\u9664\u5373\u901a\u5173\u3002',
    meta: ['\u70b9\u51fb\u9009\u724c', '\u540c\u82b1\u8272\u63a5\u9f99', '\u4e09\u79cd\u96be\u5ea6']
  },
  {
    id: 'minesweeper',
    name: '\u626b\u96f7',
    note: '\u903b\u8f91\u63a8\u7406',
    kicker: 'LOGIC PUZZLE',
    summary: '\u7ecf\u5178\u626b\u96f7\u6e38\u620f\uff0c\u5de6\u952e\u63ed\u5f00\u683c\u5b50\uff0c\u53f3\u952e\u6807\u8bb0\u5730\u96f7\u3002\u4e09\u79cd\u96be\u5ea6\u53ef\u9009\uff0c\u63ed\u5f00\u6240\u6709\u5b89\u5168\u683c\u5373\u83b7\u80dc\u3002',
    meta: ['\u5de6\u952e\u63ed\u5f00', '\u53f3\u952e\u6807\u65d7', '\u4e09\u79cd\u96be\u5ea6']
  },
  {
    id: 'tower-defense',
    name: '\u8ff7\u4f60\u5854\u9632',
    note: '\u7b56\u7565\u5e03\u9635',
    kicker: 'TOWER STRATEGY',
    summary: '\u5728\u8def\u5f84\u65c1\u5efa\u9020\u7bad\u5854\u3001\u70ae\u5854\u548c\u51b0\u5854\uff0c\u62b5\u5fa1\u4e00\u6ce2\u6ce2\u654c\u4eba\u8fdb\u653b\u3002\u5408\u7406\u5206\u914d\u91d1\u5e01\uff0c\u5b88\u4f4f\u57fa\u5730\u3002',
    meta: ['\u70b9\u51fb\u5efa\u5854', '\u4e09\u79cd\u5854\u7c7b\u578b', '15\u6ce2\u6311\u6218']
  },
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
  margin-top: 6px;
  padding: 28px 30px;
}

.games-hero__copy {
  display: grid;
  gap: 10px;
}

.games-hero__copy h1 {
  margin: 0;
  font-size: clamp(2rem, 3.5vw, 2.8rem);
  line-height: 1.05;
}

.games-hero__lead {
  margin: 0;
  max-width: 34rem;
  color: var(--blog-copy);
  font-size: 0.95rem;
  line-height: 1.65;
}

.games-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
}

.games-area__main {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 20px;
  align-items: start;
}

.games-content {
  padding: 28px clamp(18px, 3vw, 36px);
  min-width: 0;
}

.games-sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: sticky;
  top: 80px;
}

.games-sidebar__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--blog-line);
  background: rgba(255, 255, 255, 0.44);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
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

.games-sidebar__item:hover {
  transform: translateX(-2px);
  border-color: rgba(30, 125, 109, 0.2);
  box-shadow: 0 8px 20px rgba(74, 57, 37, 0.08);
}

.games-sidebar__item.is-active {
  color: var(--blog-ink);
  border-color: rgba(30, 125, 109, 0.16);
  background:
    linear-gradient(135deg, rgba(30, 125, 109, 0.08), rgba(212, 104, 63, 0.12)),
    rgba(255, 255, 255, 0.72);
  box-shadow: 0 10px 24px rgba(74, 57, 37, 0.08);
}

.games-sidebar__title {
  font-size: 0.92rem;
  font-weight: 700;
}

.games-sidebar__note {
  color: var(--blog-muted);
  font-size: 0.78rem;
}

:global(.blog-page--dark) .games-sidebar__item {
  background: rgba(255, 255, 255, 0.04);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

:global(.blog-page--dark) .games-sidebar__item.is-active {
  background:
    linear-gradient(135deg, rgba(111, 184, 171, 0.16), rgba(224, 138, 96, 0.18)),
    rgba(255, 255, 255, 0.04);
}

@media (max-width: 900px) {
  .games-area__main {
    grid-template-columns: 1fr 170px;
  }
}

@media (max-width: 760px) {
  .games-hero,
  .games-content {
    padding: 20px;
  }

  .games-area__main {
    grid-template-columns: 1fr;
  }

  .games-sidebar {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .games-sidebar__item {
    flex: 1;
    min-width: 100px;
  }
}
</style>
