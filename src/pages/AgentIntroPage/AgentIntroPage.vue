<template>
  <main class="agent-intro-page">
    <header class="agent-intro-topbar">
      <RouterLink class="agent-intro-brand" to="/">
        <span class="agent-intro-brand__mark">AI</span>
        <span>
          <strong>Agent Workspace</strong>
          <small>Personal Web Agent</small>
        </span>
      </RouterLink>

      <nav class="agent-intro-nav" aria-label="页面导航">
        <a href="#capabilities" @click.prevent="scrollToSection('capabilities')">能力</a>
        <a href="#workflow" @click.prevent="scrollToSection('workflow')">流程</a>
        <a href="#architecture" @click.prevent="scrollToSection('architecture')">架构</a>
        <RouterLink class="agent-intro-nav__home" to="/">返回主页</RouterLink>
      </nav>
    </header>

    <section class="agent-intro-hero">
      <div class="agent-intro-hero__copy">
        <p class="agent-intro-kicker">AGENT WORKSPACE / PERSONAL PROJECT</p>
        <h1>把对话推进到<br />可执行结果</h1>
        <p class="agent-intro-hero__lead">
          这是一个面向个人工作流的 Web Agent。它不只生成回答，还能围绕每次会话读取文件、搜索内容、
          调用工具、修改代码，并把任务过程与结果保留在独立工作区中。
        </p>

        <div class="agent-intro-hero__facts" aria-label="项目能力摘要">
          <article v-for="item in heroFacts" :key="item.label">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </article>
        </div>
      </div>

      <aside class="agent-workbench" aria-label="Agent 工作台示意">
        <header class="agent-workbench__bar">
          <div class="agent-workbench__dots" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <strong>Agent Workspace</strong>
          <small>任务执行中</small>
        </header>

        <div class="agent-workbench__body">
          <section class="agent-workbench__sessions">
            <button type="button">+ 新建会话</button>
            <p class="agent-preview-label">会话</p>
            <article
              v-for="(session, index) in previewSessions"
              :key="session"
              :class="{ 'is-active': index === 0 }"
            >
              <span></span>
              <strong>{{ session }}</strong>
            </article>
          </section>

          <section class="agent-workbench__chat">
            <header>
              <div>
                <p class="agent-preview-label">当前任务</p>
                <strong>图片加载性能优化</strong>
              </div>
              <span>streaming</span>
            </header>

            <article class="agent-preview-message agent-preview-message--user">
              帮我检查图片模块，定位加载慢的原因并修改代码。
            </article>

            <div class="agent-preview-timeline">
              <article v-for="event in previewEvents" :key="event.name">
                <span class="agent-preview-timeline__step">{{ event.step }}</span>
                <div>
                  <strong>{{ event.name }}</strong>
                  <p>{{ event.description }}</p>
                </div>
                <small>{{ event.status }}</small>
              </article>
            </div>

            <article class="agent-preview-message">
              已完成上下文读取和目标文件修改。构建检查通过，变更保留在当前会话工作区中。
            </article>
          </section>

          <section class="agent-workbench__context">
            <div>
              <p class="agent-preview-label">本轮上下文</p>
              <article v-for="item in previewContext" :key="item.label">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </article>
            </div>

            <div>
              <p class="agent-preview-label">会话文件</p>
              <ul>
                <li v-for="file in previewFiles" :key="file">{{ file }}</li>
              </ul>
            </div>
          </section>
        </div>
      </aside>
    </section>

    <section v-reveal class="agent-intro-proof agent-reveal">
      <p>从自然语言目标到工作区变更，任务过程可以被看见、被检查、被继续。</p>
      <div>
        <span>会话隔离</span>
        <span>文件操作</span>
        <span>工具时间线</span>
        <span>知识检索</span>
        <span>长期画像</span>
      </div>
    </section>

    <section id="capabilities" v-reveal class="agent-intro-section agent-intro-section--capabilities agent-reveal">
      <div class="agent-intro-section__head">
        <p class="agent-intro-kicker">WHAT IT DOES</p>
        <h2>不是聊天壳，而是一套任务工作台</h2>
        <p>
          每项能力都对应现有实现。页面只展示对外可说明的功能，不展示真实凭据、服务器路径或内部配置。
        </p>
      </div>

      <div class="agent-capability-grid">
        <article v-for="item in capabilities" :key="item.index">
          <span>{{ item.index }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
          <ul>
            <li v-for="point in item.points" :key="point">{{ point }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section id="workflow" v-reveal class="agent-intro-section agent-intro-section--workflow agent-reveal">
      <div class="agent-intro-section__head agent-intro-section__head--dark">
        <p class="agent-intro-kicker">TASK FLOW</p>
        <h2>一次任务如何落地</h2>
        <p>
          Agent 会先理解上下文，再决定是否调用工具。执行过程通过流式事件回到界面，用户可以持续看到任务状态。
        </p>
      </div>

      <ol class="agent-flow-list">
        <li v-for="item in taskFlow" :key="item.step">
          <span>{{ item.step }}</span>
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
          </div>
        </li>
      </ol>
    </section>

    <section v-reveal class="agent-intro-section agent-intro-section--context agent-reveal">
      <div class="agent-intro-section__head">
        <p class="agent-intro-kicker">CONTEXT LAYER</p>
        <h2>按任务组合上下文能力</h2>
        <p>
          不同任务不需要相同配置。模型、技能、外部工具和知识库可以按会话选择，避免把无关内容塞进每一轮对话。
        </p>
      </div>

      <div class="agent-context-board">
        <article v-for="item in contextLayers" :key="item.title">
          <small>{{ item.tag }}</small>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section id="architecture" v-reveal class="agent-intro-section agent-intro-section--architecture agent-reveal">
      <div class="agent-intro-section__head">
        <p class="agent-intro-kicker">SYSTEM DESIGN</p>
        <h2>前端工作台与独立 Agent API</h2>
        <p>
          前端负责交互和过程展示，后端负责会话、工具执行、知识检索与持久化。职责拆分后，每一层都可以独立演进。
        </p>
      </div>

      <div class="agent-architecture">
        <article v-for="(item, index) in architectureLayers" :key="item.title">
          <span>{{ item.tag }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
          <ul>
            <li v-for="point in item.points" :key="point">{{ point }}</li>
          </ul>
          <i v-if="index < architectureLayers.length - 1" aria-hidden="true"></i>
        </article>
      </div>
    </section>

    <section v-reveal class="agent-intro-section agent-intro-section--tools agent-reveal">
      <div class="agent-intro-section__head">
        <p class="agent-intro-kicker">BUILT-IN TOOLS</p>
        <h2>内置工具负责把判断变成动作</h2>
        <p>
          文件读写和命令执行都限定在受控工作区内。高风险动作受后端策略约束，不由页面直接放行。
        </p>
      </div>

      <div class="agent-tool-list">
        <article v-for="tool in localTools" :key="tool.name">
          <code>{{ tool.name }}</code>
          <p>{{ tool.description }}</p>
        </article>
      </div>
    </section>

    <section v-reveal class="agent-intro-observability agent-reveal">
      <div>
        <p class="agent-intro-kicker">OBSERVABILITY</p>
        <h2>过程可追踪，结果可复盘</h2>
      </div>
      <div class="agent-observability-grid">
        <article v-for="item in observability" :key="item.title">
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>

    <footer v-reveal class="agent-intro-footer agent-reveal">
      <div>
        <span class="agent-intro-brand__mark">AI</span>
        <strong>Agent Workspace</strong>
      </div>
      <p>
        这是个人项目展示页。界面中的会话、文件和工具结果均为脱敏示例，不包含真实凭据、数据库信息或部署路径。
      </p>
      <RouterLink to="/">返回主页</RouterLink>
    </footer>
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

const SCROLL_SNAP_CLASS = 'agent-intro-scroll-snap'

onMounted(() => {
  document.documentElement.classList.add(SCROLL_SNAP_CLASS)
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove(SCROLL_SNAP_CLASS)
})

function scrollToSection(sectionId) {
  const target = document.getElementById(sectionId)

  if (!target) {
    return
  }

  const topbarHeight = document.querySelector('.agent-intro-topbar')?.offsetHeight || 0
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let targetTop = 0
  let currentElement = target

  while (currentElement) {
    targetTop += currentElement.offsetTop
    currentElement = currentElement.offsetParent
  }

  window.history.replaceState(null, '', `#${sectionId}`)
  window.scrollTo({
    top: Math.max(0, targetTop - topbarHeight - 12),
    behavior: prefersReducedMotion ? 'auto' : 'smooth'
  })
}

const vReveal = {
  mounted(element) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      element.classList.add('is-revealed')
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return
        }

        element.classList.add('is-revealed')
        observer.disconnect()
      },
      {
        rootMargin: '0px 0px -4% 0px',
        threshold: 0.1
      }
    )

    observer.observe(element)
    element.__agentRevealObserver = observer
  },
  unmounted(element) {
    element.__agentRevealObserver?.disconnect()
  }
}

const heroFacts = [
  { value: '6', label: '内置工作区工具' },
  { value: 'MCP', label: '外部能力扩展' },
  { value: 'RAG', label: '知识库检索增强' },
  { value: 'SSE', label: '流式任务状态' }
]

const previewSessions = ['图片加载性能优化', '接口异常排查', '简历编辑器迭代']

const previewEvents = [
  { step: '01', name: 'list_files', description: '读取工作区结构', status: '完成' },
  { step: '02', name: 'search_text', description: '定位图片组件和请求链路', status: '完成' },
  { step: '03', name: 'apply_patch', description: '修改目标文件', status: '完成' }
]

const previewContext = [
  { label: '模型', value: '按会话选择' },
  { label: 'Skills', value: '编码规范' },
  { label: 'MCP', value: '未启用' },
  { label: '知识库', value: '项目文档' }
]

const previewFiles = ['src/components/ImagePanel.vue', 'src/utils/http.js', 'notes/optimization.md']

const capabilities = [
  {
    index: '01',
    title: '多会话任务管理',
    description: '每个目标拥有独立会话和任务状态，可以切换、刷新、停止或继续推进。',
    points: ['会话列表', '流式回复', '任务中断']
  },
  {
    index: '02',
    title: '会话级文件工作区',
    description: '每次会话拥有隔离的文件目录，Agent 可以读取、创建、修改并展示当前任务文件。',
    points: ['文件隔离', '代码预览', 'HTML 预览']
  },
  {
    index: '03',
    title: '工具调用可视化',
    description: '工具执行通过事件流回到界面，当前步骤、输出和最终结果都可以在对话中查看。',
    points: ['执行状态', '工具卡片', '结果回写']
  },
  {
    index: '04',
    title: '临时附件上下文',
    description: '用户可以在当前任务中加入文本类附件，为本轮分析提供额外信息，不污染长期工作区。',
    points: ['按会话管理', '临时注入', '过期提示']
  },
  {
    index: '05',
    title: '长期画像与记忆',
    description: '稳定偏好可以写入长期画像，较长会话也会进行摘要压缩，减少重复说明。',
    points: ['个人画像', '会话摘要', '敏感信息过滤']
  },
  {
    index: '06',
    title: '设置与调用复盘',
    description: '设置中心集中管理模型、扩展和知识库，并提供审计事件与 token 使用分析。',
    points: ['模型配置', '审计监控', '用量分析']
  }
]

const taskFlow = [
  {
    step: '01',
    title: '输入目标',
    description: '用户描述任务，并按需要选择模型、Skills、MCP 服务、知识库或临时附件。'
  },
  {
    step: '02',
    title: '组装上下文',
    description: '后端读取会话历史、工作区状态、长期偏好和可选知识检索结果。'
  },
  {
    step: '03',
    title: '判断与执行',
    description: '模型根据任务决定直接回答，或调用文件工具、受控命令与外部 MCP 能力。'
  },
  {
    step: '04',
    title: '流式回写',
    description: '工具进度、最终回复、工作区变化和 token 用量持续写回当前会话。'
  }
]

const contextLayers = [
  {
    tag: 'MODEL',
    title: '模型按会话选择',
    description: '对话模型和 embedding 配置统一维护，任务开始前可以按需求切换。'
  },
  {
    tag: 'SKILLS',
    title: '本地技能包',
    description: 'Markdown 技能文件为 Agent 增加特定任务习惯、执行要求和质量约束。'
  },
  {
    tag: 'MCP',
    title: '外部工具接入',
    description: 'MCP 服务贡献额外工具，并进入与内置工具一致的受控调用链路。'
  },
  {
    tag: 'RAG',
    title: '知识库检索',
    description: '文档经过切分和向量化后，可在对话前检索相关片段并注入上下文。'
  }
]

const architectureLayers = [
  {
    tag: '01 / FRONTEND',
    title: 'Vue 工作台',
    description: '负责会话列表、聊天区、文件查看、任务进度和设置中心。',
    points: ['流式界面更新', '工作区文件预览', '上下文选择']
  },
  {
    tag: '02 / API',
    title: '独立 Agent 服务',
    description: 'Node.js API 负责鉴权、会话、工具调用、审计与数据持久化。',
    points: ['会话接口', '事件流', '权限边界']
  },
  {
    tag: '03 / RUNNER',
    title: '执行循环',
    description: 'Runner 组装上下文，解析结构化动作，调用工具并生成最终回复。',
    points: ['动作解析', '工具调度', '结果回传']
  },
  {
    tag: '04 / DATA',
    title: '持久化与检索',
    description: '会话、工作区、记忆、模型配置和向量知识库由不同存储层分别承担。',
    points: ['工作区隔离', '长期记忆', '向量检索']
  }
]

const localTools = [
  { name: 'list_files', description: '列出当前会话工作区的目录和文件。' },
  { name: 'read_file', description: '读取目标文本文件，补充真实上下文。' },
  { name: 'search_text', description: '搜索关键词、函数名和组件名，定位实现位置。' },
  { name: 'run_command', description: '在策略允许范围内执行构建、检查等命令。' },
  { name: 'write_file', description: '创建文件或完成整体内容写入。' },
  { name: 'apply_patch', description: '针对现有文件进行小范围精确修改。' }
]

const observability = [
  {
    title: '工具时间线',
    description: '工具开始、输出和结束状态通过事件流进入对话区。'
  },
  {
    title: '审计监控',
    description: '关键系统动作、工具调用和错误事件可以按会话查看。'
  },
  {
    title: 'Token 分析',
    description: '对话模型与 embedding 的使用量可以统一统计和复盘。'
  },
  {
    title: '受控执行',
    description: '高风险文件写入、命令和 MCP 动作由后端策略限制。'
  }
]
</script>

<style scoped>
:global(html.agent-intro-scroll-snap) {
  scroll-behavior: smooth;
  scroll-padding-top: 84px;
  scroll-snap-type: y proximity;
}

.agent-intro-page {
  --ink: #15171a;
  --copy: #50545b;
  --muted: #7b8089;
  --line: #e4e6e9;
  --soft: #f6f7f8;
  min-height: 100dvh;
  width: 100%;
  overflow-x: clip;
  background: #fff;
  color: var(--ink);
}

.agent-intro-hero,
.agent-intro-section,
.agent-intro-observability {
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

.agent-reveal {
  opacity: 0;
  transform: translateY(28px);
  transition:
    opacity 620ms ease,
    transform 720ms cubic-bezier(0.22, 1, 0.36, 1);
}

.agent-reveal.is-revealed {
  opacity: 1;
  transform: translateY(0);
}

.agent-intro-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 72px;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.92);
  padding: 12px clamp(20px, 4vw, 68px);
  backdrop-filter: blur(18px);
}

.agent-intro-brand,
.agent-intro-brand > span:last-child,
.agent-intro-nav {
  display: flex;
  align-items: center;
}

.agent-intro-brand {
  gap: 12px;
  color: var(--ink);
  text-decoration: none;
}

.agent-intro-brand > span:last-child {
  align-items: flex-start;
  flex-direction: column;
  gap: 2px;
}

.agent-intro-brand strong {
  font-size: 0.95rem;
}

.agent-intro-brand small {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.agent-intro-brand__mark {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 10px;
  background: var(--ink);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 900;
}

.agent-intro-nav {
  gap: 6px;
}

.agent-intro-nav a,
.agent-intro-footer a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  border: 1px solid transparent;
  border-radius: 9px;
  color: #42464d;
  font-size: 0.84rem;
  font-weight: 800;
  padding: 0 12px;
  text-decoration: none;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.agent-intro-nav a:hover,
.agent-intro-footer a:hover {
  border-color: #d7d9dd;
  background: #f7f7f8;
  color: var(--ink);
}

.agent-intro-nav .agent-intro-nav__home {
  border-color: #d7d9dd;
  margin-left: 4px;
}

.agent-intro-hero {
  display: grid;
  grid-template-columns: minmax(390px, 0.82fr) minmax(650px, 1.18fr);
  gap: clamp(32px, 5vw, 82px);
  align-items: center;
  min-height: calc(100dvh - 72px);
  border-bottom: 1px solid var(--line);
  padding: 52px clamp(20px, 4vw, 68px) 64px;
}

.agent-intro-kicker,
.agent-preview-label {
  margin: 0;
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.agent-intro-hero h1 {
  max-width: 720px;
  margin: 16px 0 0;
  animation: agent-hero-rise 720ms 80ms cubic-bezier(0.22, 1, 0.36, 1) both;
  font-size: clamp(4rem, 6.5vw, 7.2rem);
  letter-spacing: 0;
  line-height: 0.97;
}

.agent-intro-hero .agent-intro-kicker {
  animation: agent-hero-rise 620ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.agent-intro-hero__lead {
  max-width: 710px;
  margin: 26px 0 0;
  animation: agent-hero-rise 720ms 160ms cubic-bezier(0.22, 1, 0.36, 1) both;
  color: var(--copy);
  font-size: 1.08rem;
  line-height: 1.9;
}

.agent-intro-hero__facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin-top: 34px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--line);
  animation: agent-hero-rise 720ms 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.agent-intro-hero__facts article {
  min-width: 0;
  background: #fff;
  padding: 14px;
}

.agent-intro-hero__facts strong,
.agent-intro-hero__facts span {
  display: block;
}

.agent-intro-hero__facts strong {
  font-size: 1.34rem;
}

.agent-intro-hero__facts span {
  margin-top: 6px;
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 800;
}

.agent-workbench {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #d7d9dd;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 26px 76px rgba(25, 28, 34, 0.13);
  animation: agent-workbench-enter 820ms 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.agent-workbench__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  border-bottom: 1px solid var(--line);
  background: #f8f8f9;
  padding: 0 15px;
}

.agent-workbench__bar strong {
  font-size: 0.83rem;
}

.agent-workbench__bar small {
  margin-left: auto;
  color: #4c6958;
  font-size: 0.72rem;
  font-weight: 900;
  animation: agent-soft-pulse 2.4s ease-in-out infinite;
}

.agent-workbench__dots {
  display: flex;
  gap: 6px;
}

.agent-workbench__dots span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #d2d5d9;
  animation: agent-dot-wave 2.4s ease-in-out infinite;
}

.agent-workbench__dots span:nth-child(2) {
  animation-delay: 180ms;
}

.agent-workbench__dots span:nth-child(3) {
  animation-delay: 360ms;
}

.agent-workbench__body {
  display: grid;
  grid-template-columns: 168px minmax(320px, 1fr) 188px;
  min-height: 580px;
}

.agent-workbench__sessions,
.agent-workbench__chat,
.agent-workbench__context {
  min-width: 0;
  padding: 15px;
}

.agent-workbench__sessions {
  border-right: 1px solid var(--line);
  background: #f8f8f9;
}

.agent-workbench__sessions button {
  width: 100%;
  min-height: 38px;
  border: 0;
  border-radius: 8px;
  background: var(--ink);
  color: #fff;
  cursor: default;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 900;
}

.agent-workbench__sessions .agent-preview-label {
  margin: 18px 0 8px;
}

.agent-workbench__sessions article {
  display: grid;
  grid-template-columns: 7px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  margin-top: 4px;
  border-radius: 8px;
  padding: 10px 8px;
}

.agent-workbench__sessions article.is-active {
  background: #e9eaec;
}

.agent-workbench__sessions article span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #b6bac0;
}

.agent-workbench__sessions article.is-active span {
  background: var(--ink);
  animation: agent-active-dot 1.8s ease-in-out infinite;
}

.agent-workbench__sessions article strong {
  overflow: hidden;
  font-size: 0.76rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-workbench__chat {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.agent-workbench__chat > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 13px;
}

.agent-workbench__chat > header strong {
  display: block;
  margin-top: 5px;
  font-size: 0.9rem;
}

.agent-workbench__chat > header span {
  border: 1px solid #d8e1dc;
  border-radius: 999px;
  background: #f2f7f4;
  color: #4c6958;
  font-size: 0.66rem;
  font-weight: 900;
  padding: 5px 8px;
  animation: agent-streaming 2.2s ease-in-out infinite;
}

.agent-preview-message {
  width: fit-content;
  max-width: 88%;
  border: 1px solid #e5e6e8;
  border-radius: 13px;
  background: #f7f7f8;
  color: #4a4e54;
  font-size: 0.78rem;
  line-height: 1.7;
  padding: 10px 12px;
}

.agent-preview-message--user {
  align-self: flex-end;
  border-color: var(--ink);
  background: var(--ink);
  color: #fff;
}

.agent-preview-timeline {
  display: grid;
  gap: 8px;
}

.agent-preview-timeline article {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 9px;
  animation: agent-timeline-enter 560ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.agent-preview-timeline article:nth-child(2) {
  animation-delay: 140ms;
}

.agent-preview-timeline article:nth-child(3) {
  animation-delay: 280ms;
}

.agent-preview-timeline__step {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 7px;
  background: var(--ink);
  color: #fff;
  font-size: 0.63rem;
  font-weight: 900;
}

.agent-preview-timeline strong {
  display: block;
  font-family: Consolas, "SFMono-Regular", Menlo, monospace;
  font-size: 0.76rem;
}

.agent-preview-timeline p {
  margin: 3px 0 0;
  color: var(--muted);
  font-size: 0.7rem;
}

.agent-preview-timeline small {
  color: #4c6958;
  font-size: 0.67rem;
  font-weight: 900;
}

.agent-workbench__context {
  display: grid;
  align-content: start;
  gap: 20px;
  border-left: 1px solid var(--line);
  background: #fbfbfc;
}

.agent-workbench__context article {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  font-size: 0.71rem;
}

.agent-workbench__context article span {
  color: var(--muted);
}

.agent-workbench__context article strong {
  color: #4a4e54;
  text-align: right;
}

.agent-workbench__context ul {
  display: grid;
  gap: 8px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.agent-workbench__context li {
  overflow: hidden;
  color: #555960;
  font-family: Consolas, "SFMono-Regular", Menlo, monospace;
  font-size: 0.66rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-intro-proof {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 26px;
  border-bottom: 1px solid var(--line);
  padding: 18px clamp(20px, 4vw, 68px);
}

.agent-intro-proof p {
  margin: 0;
  color: #464a50;
  font-size: 0.9rem;
  font-weight: 800;
}

.agent-intro-proof div {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.agent-intro-proof span {
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 900;
  padding: 6px 9px;
}

.agent-intro-section {
  padding: 84px clamp(20px, 4vw, 68px);
}

.agent-intro-section__head {
  max-width: 920px;
}

.agent-intro-section__head h2,
.agent-intro-observability h2 {
  margin: 12px 0 0;
  font-size: clamp(2.3rem, 4.2vw, 5rem);
  letter-spacing: 0;
  line-height: 1.03;
}

.agent-intro-section__head > p:last-child {
  max-width: 820px;
  margin: 20px 0 0;
  color: var(--copy);
  font-size: 1rem;
  line-height: 1.9;
}

.agent-capability-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin-top: 42px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--line);
}

.agent-capability-grid article {
  min-height: 270px;
  background: #fff;
  padding: 24px;
}

.agent-capability-grid article,
.agent-context-board article,
.agent-architecture article,
.agent-tool-list article,
.agent-observability-grid article,
.agent-flow-list li {
  transition:
    opacity 520ms ease,
    transform 620ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 180ms ease,
    background-color 180ms ease,
    box-shadow 180ms ease;
}

.agent-reveal:not(.is-revealed) .agent-capability-grid article,
.agent-reveal:not(.is-revealed) .agent-context-board article,
.agent-reveal:not(.is-revealed) .agent-architecture article,
.agent-reveal:not(.is-revealed) .agent-tool-list article,
.agent-reveal:not(.is-revealed) .agent-observability-grid article,
.agent-reveal:not(.is-revealed) .agent-flow-list li {
  opacity: 0;
  transform: translateY(18px);
}

.agent-reveal.is-revealed .agent-capability-grid article,
.agent-reveal.is-revealed .agent-context-board article,
.agent-reveal.is-revealed .agent-architecture article,
.agent-reveal.is-revealed .agent-tool-list article,
.agent-reveal.is-revealed .agent-observability-grid article,
.agent-reveal.is-revealed .agent-flow-list li {
  opacity: 1;
  transform: translateY(0);
}

.agent-reveal.is-revealed article:nth-child(2) {
  transition-delay: 70ms;
}

.agent-reveal.is-revealed article:nth-child(3) {
  transition-delay: 140ms;
}

.agent-reveal.is-revealed article:nth-child(4) {
  transition-delay: 210ms;
}

.agent-reveal.is-revealed article:nth-child(5) {
  transition-delay: 280ms;
}

.agent-reveal.is-revealed article:nth-child(6) {
  transition-delay: 350ms;
}

.agent-capability-grid span,
.agent-context-board small,
.agent-architecture article > span {
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.agent-capability-grid h3,
.agent-context-board h3,
.agent-architecture h3 {
  margin: 24px 0 0;
  font-size: 1.2rem;
}

.agent-capability-grid p,
.agent-context-board p,
.agent-architecture p {
  margin: 12px 0 0;
  color: var(--copy);
  font-size: 0.92rem;
  line-height: 1.75;
}

.agent-capability-grid ul,
.agent-architecture ul {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
}

.agent-capability-grid li,
.agent-architecture li {
  border: 1px solid var(--line);
  border-radius: 999px;
  color: #646970;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 5px 8px;
}

.agent-intro-section--workflow {
  display: grid;
  grid-template-columns: minmax(0, 0.84fr) minmax(540px, 0.86fr);
  gap: 64px;
  background: var(--ink);
  color: #fff;
}

.agent-intro-section__head--dark .agent-intro-kicker,
.agent-intro-section__head--dark > p:last-child {
  color: rgba(255, 255, 255, 0.64);
}

.agent-flow-list {
  display: grid;
  gap: 1px;
  margin: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.16);
  padding: 0;
  list-style: none;
}

.agent-flow-list li {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 16px;
  background: #1c1f23;
  padding: 18px;
}

.agent-flow-list li > span {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 10px;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 900;
}

.agent-flow-list strong {
  font-size: 1rem;
}

.agent-flow-list p {
  margin: 7px 0 0;
  color: rgba(255, 255, 255, 0.66);
  font-size: 0.9rem;
  line-height: 1.7;
}

.agent-context-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 42px;
}

.agent-context-board article {
  min-height: 220px;
  border-top: 3px solid var(--ink);
  background: var(--soft);
  padding: 22px;
}

.agent-context-board h3 {
  margin-top: 48px;
}

.agent-intro-section--architecture {
  border-top: 1px solid var(--line);
  background: #fafafa;
}

.agent-architecture {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 38px;
  margin-top: 42px;
}

.agent-architecture article {
  position: relative;
  min-width: 0;
  border-top: 1px solid #b9bdc3;
  padding-top: 18px;
}

.agent-architecture h3 {
  margin-top: 20px;
}

.agent-architecture i {
  position: absolute;
  top: -5px;
  right: -26px;
  width: 10px;
  height: 10px;
  border-top: 2px solid #6f747b;
  border-right: 2px solid #6f747b;
  transform: rotate(45deg);
}

.agent-architecture ul {
  display: grid;
  margin-top: 18px;
}

.agent-architecture li {
  width: fit-content;
}

.agent-intro-section--tools {
  border-top: 1px solid var(--line);
}

.agent-tool-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin-top: 42px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--line);
}

.agent-tool-list article {
  min-height: 128px;
  background: #fff;
  padding: 20px;
}

.agent-tool-list code {
  color: var(--ink);
  font-size: 0.82rem;
  font-weight: 900;
}

.agent-tool-list p {
  margin: 18px 0 0;
  color: var(--copy);
  font-size: 0.88rem;
  line-height: 1.7;
}

.agent-intro-observability {
  display: grid;
  grid-template-columns: minmax(300px, 0.7fr) minmax(560px, 1fr);
  gap: 54px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: #f6f7f8;
  padding: 72px clamp(20px, 4vw, 68px);
}

.agent-observability-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--line);
}

.agent-observability-grid article {
  background: #fff;
  padding: 18px;
}

.agent-observability-grid strong {
  font-size: 0.96rem;
}

.agent-observability-grid p {
  margin: 8px 0 0;
  color: var(--copy);
  font-size: 0.86rem;
  line-height: 1.7;
}

.agent-intro-footer {
  display: grid;
  grid-template-columns: auto minmax(240px, 1fr) auto;
  gap: 26px;
  align-items: center;
  padding: 26px clamp(20px, 4vw, 68px);
}

.agent-intro-footer > div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.agent-intro-footer p {
  max-width: 820px;
  margin: 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.7;
}

.agent-intro-footer a {
  border-color: #d7d9dd;
}

@media (hover: hover) {
  .agent-capability-grid article:hover,
  .agent-context-board article:hover,
  .agent-tool-list article:hover,
  .agent-observability-grid article:hover {
    transform: translateY(-5px);
    box-shadow: 0 16px 36px rgba(26, 29, 34, 0.08);
  }

  .agent-capability-grid article:hover,
  .agent-tool-list article:hover,
  .agent-observability-grid article:hover {
    background: #fbfbfc;
  }
}

@keyframes agent-hero-rise {
  from {
    opacity: 0;
    transform: translateY(24px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes agent-workbench-enter {
  from {
    opacity: 0;
    transform: translateY(22px) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes agent-timeline-enter {
  from {
    opacity: 0;
    transform: translateX(16px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes agent-dot-wave {
  0%,
  100% {
    opacity: 0.46;
    transform: scale(0.86);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes agent-active-dot {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(21, 23, 26, 0.24);
  }

  50% {
    box-shadow: 0 0 0 4px rgba(21, 23, 26, 0);
  }
}

@keyframes agent-streaming {
  0%,
  100% {
    border-color: #d8e1dc;
    background: #f2f7f4;
  }

  50% {
    border-color: #b9cfc3;
    background: #e8f2ed;
  }
}

@keyframes agent-soft-pulse {
  0%,
  100% {
    opacity: 0.72;
  }

  50% {
    opacity: 1;
  }
}

@media (max-width: 1420px) {
  .agent-intro-hero {
    grid-template-columns: 1fr;
  }

  .agent-intro-hero__copy {
    max-width: 920px;
  }

  .agent-workbench {
    width: min(100%, 1060px);
  }
}

@media (max-width: 1100px) {
  .agent-intro-section--workflow,
  .agent-intro-observability {
    grid-template-columns: 1fr;
  }

  .agent-context-board,
  .agent-architecture {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agent-architecture i {
    display: none;
  }
}

@media (max-width: 840px) {
  .agent-intro-topbar {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
    padding: 12px 16px;
  }

  .agent-intro-nav {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .agent-intro-nav a {
    min-width: 0;
    padding: 0 7px;
  }

  .agent-intro-nav .agent-intro-nav__home {
    margin-left: 0;
  }

  .agent-intro-hero,
  .agent-intro-section {
    padding-right: 16px;
    padding-left: 16px;
  }

  .agent-intro-hero h1 {
    font-size: clamp(3.2rem, 14vw, 5rem);
  }

  .agent-intro-hero__facts,
  .agent-capability-grid,
  .agent-tool-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agent-workbench__body {
    grid-template-columns: 132px minmax(280px, 1fr);
  }

  .agent-workbench__context {
    display: none;
  }

  .agent-intro-proof {
    align-items: flex-start;
    flex-direction: column;
    padding-right: 16px;
    padding-left: 16px;
  }

  .agent-intro-proof div {
    justify-content: flex-start;
  }

  .agent-intro-footer {
    grid-template-columns: 1fr;
    padding-right: 16px;
    padding-left: 16px;
  }
}

@media (max-width: 620px) {
  .agent-intro-hero {
    min-height: auto;
    padding-top: 44px;
  }

  .agent-intro-hero__lead {
    font-size: 0.96rem;
  }

  .agent-workbench__body {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .agent-workbench__sessions {
    display: none;
  }

  .agent-workbench__chat {
    min-height: 500px;
  }

  .agent-intro-section,
  .agent-intro-observability {
    padding-top: 58px;
    padding-bottom: 58px;
  }

  .agent-intro-section__head h2,
  .agent-intro-observability h2 {
    font-size: 2.45rem;
  }

  .agent-capability-grid,
  .agent-context-board,
  .agent-architecture,
  .agent-tool-list,
  .agent-observability-grid {
    grid-template-columns: 1fr;
  }

  .agent-capability-grid article,
  .agent-context-board article {
    min-height: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  :global(html.agent-intro-scroll-snap) {
    scroll-behavior: auto;
  }

  .agent-intro-page *,
  .agent-intro-page *::before,
  .agent-intro-page *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
