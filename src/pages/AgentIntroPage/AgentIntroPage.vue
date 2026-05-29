<template>
  <main class="agent-case-page">
    <header class="agent-case-topbar">
      <RouterLink class="agent-case-brand" to="/">
        <span>AI</span>
        <strong>Agent Workspace</strong>
      </RouterLink>

      <nav class="agent-case-nav" aria-label="Agent 展示页面导航">
        <RouterLink to="/">返回首页</RouterLink>
      </nav>
    </header>

    <section class="agent-case-hero">
      <div class="agent-case-hero__copy">
        <p class="agent-case-eyebrow">Project Showcase</p>
        <h1>Web Agent 工作流项目展示</h1>
        <p class="agent-case-hero__lead">
          这个项目围绕“让 AI 参与真实任务执行”设计：前端提供完整工作台，后端承接会话、工具、知识库、扩展能力和审计记录。
          项目重点是工程结构和任务链路，而不是对外开放一个可操作的在线服务。
        </p>

        <div class="agent-case-actions">
          <a class="agent-case-button agent-case-button--primary" href="#agent-architecture">查看项目结构</a>
          <a class="agent-case-button" href="#agent-tools">查看工具链</a>
        </div>

        <dl class="agent-case-stats" aria-label="Agent 项目概览">
          <div v-for="item in stats" :key="item.label">
            <dt>{{ item.value }}</dt>
            <dd>{{ item.label }}</dd>
          </div>
        </dl>
      </div>

      <aside class="agent-case-workbench" aria-label="Agent 工作台界面示意">
        <div class="agent-case-workbench__top">
          <span></span>
          <span></span>
          <span></span>
          <strong>Agent 工作台</strong>
        </div>

        <div class="agent-case-workbench__layout">
          <section class="agent-case-workbench__sidebar" aria-label="会话列表示意">
            <button type="button">+ 新建对话</button>
            <p>最近对话</p>
            <article v-for="item in mockSessions" :key="item" :class="{ 'is-active': item === mockSessions[0] }">
              {{ item }}
            </article>
          </section>

          <section class="agent-case-workbench__chat" aria-label="任务执行示意">
            <header>
              <span>编码模式</span>
              <span>任务进行中</span>
            </header>

            <article class="agent-case-message agent-case-message--user">
              帮我定位图片加载慢的原因，并给出可落地的优化。
            </article>

            <div class="agent-case-tool-stack">
              <article v-for="tool in mockToolFlow" :key="tool.name" class="agent-case-tool-card">
                <span>{{ tool.step }}</span>
                <div>
                  <strong>{{ tool.name }}</strong>
                  <p>{{ tool.description }}</p>
                </div>
              </article>
            </div>

            <article class="agent-case-message">
              已读取组件和构建产物，建议优先做图片尺寸约束、懒加载、缓存策略和组件级占位状态。
            </article>
          </section>

          <section class="agent-case-workbench__files" aria-label="工作区文件示意">
            <p>当前对话文件</p>
            <article v-for="file in mockFiles" :key="file">
              <span></span>
              <strong>{{ file }}</strong>
            </article>
            <pre>Tool: apply_patch
Status: success
Changed: src/components/...</pre>
          </section>
        </div>
      </aside>
    </section>

    <section id="agent-architecture" class="agent-case-section agent-case-section--architecture">
      <div class="agent-case-section__head">
        <p class="agent-case-eyebrow">Architecture</p>
        <h2>它不是一个单页聊天框，而是一套 Agent 工作流</h2>
        <p>
          从代码结构看，前端负责工作台体验，后端负责会话、工具、模型、知识库、审计和记忆。
          每一轮对话都会经过上下文选择、模型决策、工具执行、结果回写和审计记录。
        </p>
      </div>

      <div class="agent-case-architecture">
        <article v-for="item in architecture" :key="item.title">
          <span>{{ item.index }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
          <ul>
            <li v-for="point in item.points" :key="point">{{ point }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="agent-case-flow-section">
      <div class="agent-case-flow-copy">
        <p class="agent-case-eyebrow">Execution Flow</p>
        <h2>一次任务从输入到落地，会经过这些环节</h2>
        <p>
          完整执行链路由目标输入、上下文组装、工具决策和结果回写组成。Agent 不只返回一段文字，
          还会把文件、消息、审计和用量沉淀到同一个会话中。
        </p>
      </div>

      <ol class="agent-case-flow">
        <li v-for="item in executionFlow" :key="item.title">
          <span>{{ item.index }}</span>
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
          </div>
        </li>
      </ol>
    </section>

    <section id="agent-features" class="agent-case-section">
      <div class="agent-case-section__head">
        <p class="agent-case-eyebrow">Capability Map</p>
        <h2>核心能力模块</h2>
      </div>

      <div class="agent-case-matrix">
        <article v-for="item in featureMatrix" :key="item.title">
          <div>
            <span>{{ item.group }}</span>
            <h3>{{ item.title }}</h3>
          </div>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section id="agent-tools" class="agent-case-section agent-case-section--tools">
      <div class="agent-case-section__head">
        <p class="agent-case-eyebrow">Workspace Tools</p>
        <h2>后端已经接入的本地工作区工具</h2>
        <p>
          工具链让它从普通问答走向任务执行：在受限工作区里查看文件、定位内容、运行允许的命令，并在策略允许时写入修改。
        </p>
      </div>

      <div class="agent-case-tools">
        <article v-for="tool in localTools" :key="tool.name">
          <code>{{ tool.name }}</code>
          <p>{{ tool.description }}</p>
        </article>
      </div>
    </section>

    <section class="agent-case-section agent-case-section--settings">
      <div class="agent-case-section__head">
        <p class="agent-case-eyebrow">Settings Center</p>
        <h2>设置中心承载扩展与复盘能力</h2>
      </div>

      <div class="agent-case-settings-grid">
        <article v-for="item in settingsPanels" :key="item.title">
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section id="agent-boundary" class="agent-case-boundary">
      <div>
        <p class="agent-case-eyebrow">Access Scope</p>
        <h2>工程展示边界</h2>
      </div>

      <div class="agent-case-boundary__grid">
        <article v-for="item in boundaries" :key="item.title">
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { RouterLink } from 'vue-router'

const stats = [
  { value: '6', label: '工作区工具' },
  { value: '7', label: '设置中心模块' },
  { value: '4', label: '上下文来源' },
  { value: '1', label: '连续任务工作台' }
]

const mockSessions = [
  '优化图片加载模块',
  '排查接口 403 问题',
  '在线简历编辑 demo'
]

const mockToolFlow = [
  { step: '01', name: 'list_files', description: '先看当前会话工作区结构' },
  { step: '02', name: 'search_text', description: '定位相关组件和关键字符串' },
  { step: '03', name: 'read_file', description: '读取目标文件确认上下文' },
  { step: '04', name: 'apply_patch', description: '对已有文件做精确修改' }
]

const mockFiles = [
  'src/components/ImageModule.vue',
  'src/utils/http.js',
  'report/optimization-notes.md'
]

const architecture = [
  {
    index: 'Frontend',
    title: 'Vue 工作台界面',
    description: '前端不是简单输入框，而是完整工作台：左侧会话，中间对话，右侧文件预览，设置中心承接扩展能力。',
    points: ['多会话列表和新建对话', '任务状态、运行模式和模型用量', 'Markdown、代码块、工具调用卡片', '当前会话文件和 HTML 预览']
  },
  {
    index: 'API',
    title: '独立 Agent API',
    description: '后端提供会话、聊天、文件预览、能力列表、RAG、审计、Skills、工具详情等接口，把 Agent 逻辑从主站拆开。',
    points: ['会话创建、详情、删除和任务停止', '工作区文件内容读取和预览令牌', '工具、Skills、MCP 能力读取', 'RAG 文档、集合、检索和重建']
  },
  {
    index: 'Runner',
    title: '模型决策与工具执行循环',
    description: 'Agent Runner 会把用户目标、会话记忆、工具说明、技能说明和知识库上下文组织成一次可执行任务。',
    points: ['模型回复和工具调用分离', '工具执行结果进入下一步观察', '失败信息转成可读提示', '任务过程写回当前会话']
  },
  {
    index: 'Memory',
    title: '短期会话记忆和长期画像',
    description: '长会话会被压缩成摘要，稳定偏好可以进入长期个人画像，减少每次都重新解释上下文。',
    points: ['会话级 memory summary', '长期 user profile', '避免保存临时任务和敏感凭据', '设置页可查看个人画像']
  }
]

const executionFlow = [
  {
    index: '01',
    title: '用户给出目标',
    description: '输入区支持普通任务、代码任务和临时附件；前端会根据当前选择带上模型、Skills、MCP 和知识库信息。'
  },
  {
    index: '02',
    title: '后端组装上下文',
    description: '会话历史、短期摘要、长期画像、工作区文件列表、RAG 检索结果和技能说明会被整理给 Agent。'
  },
  {
    index: '03',
    title: 'Agent 决定是否调用工具',
    description: '如果需要证据或要改文件，它会调用 list_files、read_file、search_text、run_command、write_file 或 apply_patch。'
  },
  {
    index: '04',
    title: '结果回写到工作台',
    description: '模型消息、工具卡片、任务状态、文件列表、审计事件和模型用量都会回到页面，后续会话还能接着做。'
  }
]

const featureMatrix = [
  {
    group: '会话',
    title: '多会话任务管理',
    description: '每个目标有独立 session、标题、消息、任务状态和工作区，不同任务之间不会混在一起。'
  },
  {
    group: '文件',
    title: '会话级文件工作区',
    description: 'Agent 生成或修改的文件可以在右侧打开，支持文本预览、代码复制和 HTML 运行预览。'
  },
  {
    group: '上下文',
    title: '会话附加信息选择',
    description: '本轮任务可以选择 Skills、MCP 服务、RAG 知识库、Embedding 配置和临时附件。'
  },
  {
    group: '知识库',
    title: 'RAG 文档管理',
    description: '支持集合、文档上传、手动写入、向量重建和检索，让项目资料参与回答。'
  },
  {
    group: '扩展',
    title: 'Skills 和 MCP',
    description: 'Skills 用 Markdown 文件扩展行为；MCP 用来接入外部工具，并统一进入工具调用链路。'
  },
  {
    group: '复盘',
    title: '审计和用量分析',
    description: '按会话查看模型决策、工具调用、RAG 检索、MCP 调用、错误事件和模型用量情况。'
  }
]

const localTools = [
  { name: 'list_files', description: '列出工作区文件和目录，用来先理解项目结构。' },
  { name: 'read_file', description: '读取工作区文本文件，给后续判断提供真实上下文。' },
  { name: 'search_text', description: '在工作区搜索字符串、符号和用法，快速定位修改点。' },
  { name: 'run_command', description: '执行允许范围内的命令，用于构建、检查、测试或查看仓库状态。' },
  { name: 'write_file', description: '在策略允许时创建或整体替换文本文件。' },
  { name: 'apply_patch', description: '对已有文件做精确编辑，更适合小范围修复和局部重构。' }
]

const settingsPanels = [
  { title: 'AI 配置', description: '维护模型配置和模型版本，展示层只说明配置能力，不展示真实配置值。' },
  { title: 'MCP', description: '查看已接入的 MCP 服务、状态、工具前缀和工具数量。' },
  { title: 'Skills', description: '浏览 skills 目录下的技能说明，并按任务选择需要的技能。' },
  { title: '知识库', description: '管理 RAG 集合、文档、上传、检索和向量重建。' },
  { title: '工具', description: '展示当前 Agent 可用工具，以及每个工具对应的实现入口和说明。' },
  { title: '审计监控', description: '按会话查看工具调用、RAG 检索、MCP 调用、错误和系统事件。' },
  { title: '数据分析', description: '按模型和配置统计输入、输出、总量和使用占比。' }
]

const boundaries = [
  {
    title: '访问边界',
    description: '当前页面只介绍项目设计，不连接实际工作台，也不承接任何线上操作。'
  },
  {
    title: '使用脱敏示例',
    description: '首屏工作台、会话名称、文件路径和工具结果都是示意内容，不展示真实任务数据。'
  },
  {
    title: '隐藏内部配置',
    description: '模型、知识库和外部工具只展示模块设计，不展示配置值、凭据或内部部署细节。'
  },
  {
    title: '强调可控执行',
    description: '文件修改、命令执行和外部工具调用都受工作区范围、后端策略和确认流程约束。'
  }
]
</script>

<style scoped>
.agent-case-page {
  min-height: 100dvh;
  width: 100%;
  background: #ffffff;
  color: #161616;
}

.agent-case-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 66px;
  padding: 12px 28px;
  border-bottom: 1px solid #e9e9e9;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(14px);
}

.agent-case-brand,
.agent-case-nav,
.agent-case-actions {
  display: flex;
  align-items: center;
}

.agent-case-brand {
  min-width: 0;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.agent-case-brand span {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: #171717;
  color: #ffffff;
  font-weight: 900;
}

.agent-case-brand strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-case-nav {
  gap: 10px;
}

.agent-case-nav a,
.agent-case-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  border: 1px solid #d8d8d8;
  border-radius: 12px;
  padding: 0 16px;
  background: #ffffff;
  color: #171717;
  font-weight: 800;
  text-decoration: none;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.agent-case-nav a:hover,
.agent-case-button:hover {
  border-color: #171717;
  transform: translateY(-1px);
}

.agent-case-button--primary {
  border-color: #171717;
  background: #171717;
  color: #ffffff;
}

.agent-case-hero {
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(640px, 1.08fr);
  gap: 34px;
  align-items: center;
  min-height: calc(100dvh - 66px);
  padding: 42px 28px 56px;
  border-bottom: 1px solid #ebebeb;
}

.agent-case-hero__copy {
  min-width: 0;
}

.agent-case-eyebrow {
  margin: 0 0 12px;
  color: #777777;
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.agent-case-hero h1,
.agent-case-section h2,
.agent-case-flow-copy h2,
.agent-case-boundary h2 {
  margin: 0;
  letter-spacing: 0;
}

.agent-case-hero h1 {
  max-width: 820px;
  font-size: clamp(3.2rem, 7vw, 7.2rem);
  line-height: 0.94;
}

.agent-case-hero__lead,
.agent-case-section__head > p:not(.agent-case-eyebrow),
.agent-case-flow-copy > p {
  max-width: 820px;
  margin: 24px 0 0;
  color: #4f4f4f;
  font-size: 1.04rem;
  line-height: 1.9;
}

.agent-case-actions {
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.agent-case-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 32px 0 0;
}

.agent-case-stats div {
  min-width: 0;
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  background: #f8f8f8;
  padding: 14px;
}

.agent-case-stats dt,
.agent-case-stats dd {
  margin: 0;
}

.agent-case-stats dt {
  color: #171717;
  font-size: 1.8rem;
  font-weight: 900;
  line-height: 1;
}

.agent-case-stats dd {
  margin-top: 6px;
  color: #666666;
  font-size: 0.82rem;
  font-weight: 800;
}

.agent-case-workbench {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #dcdcdc;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 26px 80px rgba(0, 0, 0, 0.12);
}

.agent-case-workbench__top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid #ededed;
  background: #fafafa;
}

.agent-case-workbench__top span {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #d3d3d3;
}

.agent-case-workbench__top strong {
  margin-left: 8px;
  color: #444444;
  font-size: 0.9rem;
}

.agent-case-workbench__layout {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr) 230px;
  min-height: 600px;
  background: #ffffff;
}

.agent-case-workbench__sidebar,
.agent-case-workbench__chat,
.agent-case-workbench__files {
  min-width: 0;
  padding: 16px;
}

.agent-case-workbench__sidebar {
  display: grid;
  align-content: start;
  gap: 8px;
  border-right: 1px solid #ededed;
  background: #f7f7f8;
}

.agent-case-workbench__sidebar button {
  min-height: 40px;
  border: 0;
  border-radius: 11px;
  background: #171717;
  color: #ffffff;
  cursor: default;
  font: inherit;
  font-weight: 800;
}

.agent-case-workbench__sidebar p,
.agent-case-workbench__files p {
  margin: 12px 0 4px;
  color: #8a8a8a;
  font-size: 0.74rem;
  font-weight: 900;
}

.agent-case-workbench__sidebar article {
  overflow: hidden;
  min-height: 38px;
  border-radius: 10px;
  padding: 10px;
  color: #333333;
  font-size: 0.88rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-case-workbench__sidebar article.is-active {
  background: #e7e7e7;
}

.agent-case-workbench__chat {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #ffffff;
}

.agent-case-workbench__chat header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.agent-case-workbench__chat header span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border: 1px solid #e5e5e5;
  border-radius: 999px;
  background: #f7f7f7;
  color: #555555;
  font-size: 0.76rem;
  font-weight: 800;
  padding: 0 10px;
}

.agent-case-message {
  width: fit-content;
  max-width: 82%;
  border: 1px solid #e9e9e9;
  border-radius: 18px;
  background: #f8f8f8;
  color: #2f2f2f;
  padding: 13px 15px;
  line-height: 1.7;
}

.agent-case-message--user {
  align-self: flex-end;
  background: #171717;
  color: #ffffff;
}

.agent-case-tool-stack {
  display: grid;
  gap: 10px;
  width: min(100%, 520px);
}

.agent-case-tool-card {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  border: 1px solid #e7e7e7;
  border-radius: 16px;
  background: #ffffff;
  padding: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
}

.agent-case-tool-card > span {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: #171717;
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 900;
}

.agent-case-tool-card strong,
.agent-case-tool-card p {
  margin: 0;
}

.agent-case-tool-card strong {
  color: #171717;
  font-family: Consolas, "SFMono-Regular", Menlo, monospace;
  font-size: 0.92rem;
}

.agent-case-tool-card p {
  margin-top: 4px;
  color: #666666;
  font-size: 0.86rem;
  line-height: 1.6;
}

.agent-case-workbench__files {
  display: grid;
  align-content: start;
  gap: 9px;
  border-left: 1px solid #ededed;
  background: #fafafa;
}

.agent-case-workbench__files article {
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-height: 34px;
  border-radius: 10px;
  background: #ffffff;
  padding: 8px;
}

.agent-case-workbench__files article span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #171717;
}

.agent-case-workbench__files article strong {
  overflow: hidden;
  color: #2f2f2f;
  font-size: 0.8rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-case-workbench__files pre {
  overflow: hidden;
  min-height: 160px;
  margin: 8px 0 0;
  border: 1px solid #ededed;
  border-radius: 14px;
  background: #ffffff;
  color: #4b5563;
  font-size: 0.76rem;
  line-height: 1.7;
  padding: 12px;
  white-space: pre-wrap;
}

.agent-case-section,
.agent-case-flow-section,
.agent-case-boundary {
  padding: 72px 28px;
}

.agent-case-section__head {
  max-width: 960px;
}

.agent-case-section h2,
.agent-case-flow-copy h2,
.agent-case-boundary h2 {
  max-width: 980px;
  font-size: clamp(2rem, 4vw, 4.6rem);
  line-height: 1.06;
}

.agent-case-architecture,
.agent-case-matrix,
.agent-case-tools,
.agent-case-settings-grid,
.agent-case-boundary__grid {
  display: grid;
  gap: 14px;
  margin-top: 34px;
}

.agent-case-architecture {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.agent-case-architecture article,
.agent-case-matrix article,
.agent-case-tools article,
.agent-case-settings-grid article,
.agent-case-boundary__grid article {
  border: 1px solid #e8e8e8;
  border-radius: 20px;
  background: #fafafa;
  padding: 20px;
}

.agent-case-architecture article {
  display: grid;
  align-content: start;
  gap: 14px;
  min-height: 360px;
}

.agent-case-architecture article > span,
.agent-case-matrix span {
  color: #777777;
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.agent-case-architecture h3,
.agent-case-matrix h3,
.agent-case-settings-grid strong,
.agent-case-boundary__grid strong {
  margin: 0;
  color: #171717;
}

.agent-case-architecture p,
.agent-case-matrix p,
.agent-case-tools p,
.agent-case-settings-grid p,
.agent-case-boundary__grid p {
  margin: 0;
  color: #5f5f5f;
  line-height: 1.75;
}

.agent-case-architecture ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.agent-case-architecture li {
  position: relative;
  padding-left: 16px;
  color: #3f3f3f;
  font-size: 0.9rem;
  line-height: 1.55;
}

.agent-case-architecture li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.68em;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #171717;
}

.agent-case-flow-section {
  display: grid;
  grid-template-columns: minmax(0, 0.74fr) minmax(440px, 0.62fr);
  gap: 38px;
  align-items: start;
  border-top: 1px solid #ededed;
  border-bottom: 1px solid #ededed;
  background: #171717;
  color: #ffffff;
}

.agent-case-flow-section .agent-case-eyebrow,
.agent-case-flow-copy > p {
  color: rgba(255, 255, 255, 0.72);
}

.agent-case-flow {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.agent-case-flow li {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  padding: 18px;
}

.agent-case-flow li > span {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: #ffffff;
  color: #171717;
  font-weight: 900;
}

.agent-case-flow strong {
  color: #ffffff;
}

.agent-case-flow p {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.75;
}

.agent-case-matrix {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.agent-case-matrix article {
  display: grid;
  gap: 18px;
  min-height: 200px;
}

.agent-case-matrix article > div {
  display: grid;
  gap: 8px;
}

.agent-case-tools {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.agent-case-tools article {
  display: grid;
  gap: 12px;
  min-height: 170px;
}

.agent-case-tools code {
  width: fit-content;
  border: 1px solid #d9d9d9;
  border-radius: 999px;
  background: #ffffff;
  color: #171717;
  font-size: 0.78rem;
  font-weight: 900;
  padding: 7px 10px;
}

.agent-case-section--settings {
  border-top: 1px solid #ededed;
}

.agent-case-settings-grid {
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.agent-case-settings-grid article {
  display: grid;
  gap: 10px;
  min-height: 170px;
}

.agent-case-boundary {
  display: grid;
  grid-template-columns: minmax(0, 0.74fr) minmax(520px, 0.82fr);
  gap: 38px;
  align-items: start;
  border-top: 1px solid #ededed;
}

.agent-case-boundary__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 0;
}

.agent-case-boundary__grid article {
  display: grid;
  gap: 10px;
  min-height: 170px;
}

@media (max-width: 1380px) {
  .agent-case-hero {
    grid-template-columns: 1fr;
  }

  .agent-case-architecture {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agent-case-tools,
  .agent-case-settings-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1060px) {
  .agent-case-workbench__layout {
    grid-template-columns: 170px minmax(0, 1fr);
  }

  .agent-case-workbench__files {
    display: none;
  }

  .agent-case-flow-section,
  .agent-case-boundary {
    grid-template-columns: 1fr;
  }

  .agent-case-matrix {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .agent-case-topbar {
    align-items: stretch;
    flex-direction: column;
    padding: 14px 16px;
  }

  .agent-case-nav {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .agent-case-hero,
  .agent-case-section,
  .agent-case-flow-section,
  .agent-case-boundary {
    padding: 42px 16px;
  }

  .agent-case-hero h1 {
    font-size: 3rem;
  }

  .agent-case-stats,
  .agent-case-architecture,
  .agent-case-matrix,
  .agent-case-tools,
  .agent-case-settings-grid,
  .agent-case-boundary__grid {
    grid-template-columns: 1fr;
  }

  .agent-case-workbench__layout {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .agent-case-workbench__sidebar {
    border-right: 0;
    border-bottom: 1px solid #ededed;
  }

  .agent-case-architecture article,
  .agent-case-matrix article,
  .agent-case-tools article,
  .agent-case-settings-grid article,
  .agent-case-boundary__grid article {
    min-height: auto;
  }
}
</style>
