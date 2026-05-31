<template>
  <main class="agent-showcase-page">
    <header class="agent-showcase-topbar">
      <RouterLink class="agent-showcase-brand" to="/">
        <span>AI</span>
        <strong>Agent Workspace</strong>
      </RouterLink>

      <nav class="agent-showcase-nav" aria-label="页面导航">
        <a href="#capabilities">功能</a>
        <a href="#workflow">流程</a>
        <a href="#systems">系统</a>
        <RouterLink to="/">返回首页</RouterLink>
      </nav>
    </header>

    <section class="agent-showcase-hero">
      <div class="agent-showcase-hero__copy">
        <p class="agent-showcase-eyebrow">Personal Web Agent</p>
        <h1>一个能读文件、调工具、接知识库的 Agent 工作台</h1>
        <p class="agent-showcase-hero__lead">
          这个项目不是单纯的聊天页面。它把多轮对话、会话级文件工作区、工具调用、Skills、MCP、RAG 知识库、模型配置和调用复盘放到同一个 Web 工作台里，用来探索“AI 如何参与真实任务执行”。
        </p>

        <div class="agent-showcase-summary" aria-label="项目能力摘要">
          <article v-for="item in heroSummary" :key="item.label">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </article>
        </div>
      </div>

      <aside class="agent-workbench-preview" aria-label="Agent 工作台示意">
        <div class="agent-window-bar">
          <span></span>
          <span></span>
          <span></span>
          <strong>Agent Workspace</strong>
        </div>

        <div class="agent-preview-layout">
          <section class="agent-preview-sessions" aria-label="会话列表">
            <button type="button">新建会话</button>
            <p>最近任务</p>
            <article
              v-for="session in previewSessions"
              :key="session"
              :class="{ 'is-active': session === previewSessions[0] }"
            >
              {{ session }}
            </article>
          </section>

          <section class="agent-preview-chat" aria-label="任务对话">
            <header>
              <span>当前模式：编码任务</span>
              <span>模型：可切换</span>
            </header>

            <article class="agent-preview-message agent-preview-message--user">
              帮我定位图片加载慢的问题，给出可落地的优化并修改代码。
            </article>

            <div class="agent-preview-tools">
              <article v-for="tool in previewToolCalls" :key="tool.name">
                <span>{{ tool.step }}</span>
                <div>
                  <strong>{{ tool.name }}</strong>
                  <p>{{ tool.description }}</p>
                </div>
              </article>
            </div>

            <article class="agent-preview-message">
              已读取组件、网络请求和构建结果。建议优先处理图片尺寸约束、懒加载、缓存策略和异常状态提示，并给出对应代码修改。
            </article>
          </section>

          <section class="agent-preview-files" aria-label="工作区文件">
            <p>会话文件</p>
            <article v-for="file in previewFiles" :key="file">
              <span></span>
              <strong>{{ file }}</strong>
            </article>

            <pre>tool: apply_patch
status: success
changed: src/components/ImagePanel.vue</pre>
          </section>
        </div>
      </aside>
    </section>

    <section id="capabilities" class="agent-showcase-section">
      <div class="agent-section-head">
        <p class="agent-showcase-eyebrow">What It Does</p>
        <h2>别人打开这个页面，应该能直接看懂它能做什么</h2>
      </div>

      <div class="agent-capability-grid">
        <article v-for="item in capabilities" :key="item.title">
          <span>{{ item.index }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section id="workflow" class="agent-process-section">
      <div class="agent-section-head agent-section-head--dark">
        <p class="agent-showcase-eyebrow">Task Flow</p>
        <h2>一次任务从输入到落地，会经过这些步骤</h2>
      </div>

      <ol class="agent-process-list">
        <li v-for="item in taskFlow" :key="item.title">
          <span>{{ item.step }}</span>
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
          </div>
        </li>
      </ol>
    </section>

    <section id="systems" class="agent-showcase-section agent-showcase-section--systems">
      <div class="agent-section-head">
        <p class="agent-showcase-eyebrow">System Design</p>
        <h2>它背后不是单个接口，而是一套可扩展的 Agent 系统</h2>
      </div>

      <div class="agent-system-board">
        <article v-for="item in systemBlocks" :key="item.title">
          <small>{{ item.tag }}</small>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
          <ul>
            <li v-for="point in item.points" :key="point">{{ point }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="agent-showcase-section agent-showcase-section--tools">
      <div class="agent-section-head">
        <p class="agent-showcase-eyebrow">Tool Layer</p>
        <h2>内置工具让 Agent 可以处理真实工作区</h2>
        <p>
          工具只在受控工作区内运行，命令执行和写入行为由后端策略限制。页面只展示能力范围，不暴露任何真实凭据、路径或内部配置。
        </p>
      </div>

      <div class="agent-tool-grid">
        <article v-for="tool in localTools" :key="tool.name">
          <code>{{ tool.name }}</code>
          <p>{{ tool.description }}</p>
        </article>
      </div>
    </section>

    <section class="agent-showcase-footer">
      <div>
        <p class="agent-showcase-eyebrow">Scope</p>
        <h2>这个展示页只说明项目能力</h2>
      </div>
      <p>
        页面中的会话、文件名和工具输出都是脱敏示例。真实的模型配置、API Key、数据库信息、MCP 凭据和服务器路径不会在展示页出现。
      </p>
    </section>
  </main>
</template>

<script setup>
import { RouterLink } from 'vue-router'

const heroSummary = [
  { value: '会话级', label: '独立工作区' },
  { value: '6 类', label: '内置工具' },
  { value: 'RAG', label: '知识库检索' },
  { value: 'MCP', label: '外部工具扩展' }
]

const previewSessions = ['图片加载优化', '接口 403 排查', '简历编辑器 demo']

const previewToolCalls = [
  { step: '01', name: 'list_files', description: '先读取当前会话工作区结构' },
  { step: '02', name: 'search_text', description: '搜索组件、接口和关键实现' },
  { step: '03', name: 'read_file', description: '打开目标文件确认上下文' },
  { step: '04', name: 'apply_patch', description: '按最小范围修改代码' }
]

const previewFiles = ['src/components/ImagePanel.vue', 'src/utils/http.js', 'notes/optimization.md']

const capabilities = [
  {
    index: '01',
    title: '多会话任务管理',
    description: '每个目标都有独立会话、标题、消息、任务状态和工作区，适合把不同问题拆开持续推进。'
  },
  {
    index: '02',
    title: '会话级文件工作区',
    description: 'Agent 可以读取、创建和修改当前会话下的文件，右侧可以查看文件列表、代码内容和 HTML 预览。'
  },
  {
    index: '03',
    title: '工具调用过程可视化',
    description: '文件读取、文本搜索、命令执行和补丁写入会以工具卡片形式出现在对话中，方便理解它做了什么。'
  },
  {
    index: '04',
    title: 'Skills 行为扩展',
    description: '通过本地 Markdown 技能文件给 Agent 增加不同任务习惯，例如编码质量、前端检查、MCP 接入等。'
  },
  {
    index: '05',
    title: 'MCP 外部工具接入',
    description: 'MCP 服务贡献的工具会进入同一套工具目录，Agent 可以按会话选择需要接入的外部能力。'
  },
  {
    index: '06',
    title: 'RAG 知识库增强',
    description: '支持知识集合、文档上传、向量化、检索和上下文注入，让项目资料参与本轮任务回答。'
  },
  {
    index: '07',
    title: '模型和 Embedding 配置',
    description: '聊天模型和向量模型可以在设置中心维护，并在会话中按任务选择，不把配置写死在页面里。'
  },
  {
    index: '08',
    title: '审计与用量复盘',
    description: '可查看会话中的工具调用、RAG 检索、MCP 调用、错误事件和 token 使用情况。'
  }
]

const taskFlow = [
  {
    step: '1',
    title: '输入目标',
    description: '用户描述要完成的任务，并选择模型、Skills、MCP 服务、RAG 集合或临时附件。'
  },
  {
    step: '2',
    title: '组装上下文',
    description: '后端读取会话历史、工作区文件、技能说明、知识库检索结果和长期偏好，整理成可执行上下文。'
  },
  {
    step: '3',
    title: '决策与工具调用',
    description: '模型判断下一步要回答、读取文件、搜索文本、运行命令，还是生成补丁修改文件。'
  },
  {
    step: '4',
    title: '结果回写',
    description: '最终回复、工具事件、文件变化、审计记录和用量信息都会回到同一个会话中，便于继续追问。'
  }
]

const systemBlocks = [
  {
    tag: 'Frontend',
    title: 'Vue 工作台',
    description: '前端负责登录、会话列表、聊天区域、文件预览、设置中心和工具过程展示。',
    points: ['多会话切换', '流式消息展示', '工具卡片', '文件与代码预览']
  },
  {
    tag: 'Backend',
    title: '独立 Agent API',
    description: '后端承接会话、聊天、工具、RAG、Skills、MCP、审计和 token 统计。',
    points: ['会话持久化', '任务中断', '工作区隔离', '接口鉴权']
  },
  {
    tag: 'Runner',
    title: 'Agent 执行循环',
    description: 'Runner 负责模型交互、结构化动作解析、工具结果回传和最终回答生成。',
    points: ['上下文裁剪', '工具目录注入', '失败提示转换', '结果持续写回']
  },
  {
    tag: 'Knowledge',
    title: '知识库与记忆',
    description: 'RAG 负责项目资料检索，记忆机制负责减少重复说明和维护稳定偏好。',
    points: ['PostgreSQL + pgvector', '文档切块', 'Embedding 检索', '会话摘要']
  }
]

const localTools = [
  { name: 'list_files', description: '列出工作区文件和目录，用来先理解项目结构。' },
  { name: 'read_file', description: '读取文本文件内容，给后续判断提供真实上下文。' },
  { name: 'search_text', description: '在工作区搜索关键词、函数名和组件名，快速定位修改点。' },
  { name: 'run_command', description: '执行允许范围内的命令，例如构建、检查或查看状态。' },
  { name: 'write_file', description: '在策略允许时创建或整体写入文件。' },
  { name: 'apply_patch', description: '对已有文件做精确补丁修改，更适合小范围修复。' }
]
</script>

<style scoped>
.agent-showcase-page {
  min-height: 100dvh;
  width: 100%;
  background: #fff;
  color: #151515;
}

.agent-showcase-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 68px;
  padding: 12px 28px;
  border-bottom: 1px solid #e8e8e8;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(16px);
}

.agent-showcase-brand,
.agent-showcase-nav {
  display: flex;
  align-items: center;
}

.agent-showcase-brand {
  min-width: 0;
  gap: 12px;
  color: #151515;
  text-decoration: none;
}

.agent-showcase-brand span {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #151515;
  color: #fff;
  font-size: 0.86rem;
  font-weight: 900;
}

.agent-showcase-brand strong {
  overflow: hidden;
  font-size: 0.96rem;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-showcase-nav {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.agent-showcase-nav a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  border: 1px solid #dedede;
  border-radius: 10px;
  padding: 0 13px;
  background: #fff;
  color: #252525;
  font-size: 0.86rem;
  font-weight: 850;
  text-decoration: none;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease;
}

.agent-showcase-nav a:hover {
  border-color: #151515;
  background: #f7f7f7;
  transform: translateY(-1px);
}

.agent-showcase-hero {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(620px, 1.06fr);
  gap: 36px;
  align-items: center;
  min-height: calc(100dvh - 68px);
  padding: 44px 28px 58px;
  border-bottom: 1px solid #ececec;
}

.agent-showcase-hero__copy {
  min-width: 0;
}

.agent-showcase-eyebrow {
  margin: 0 0 12px;
  color: #737373;
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.agent-showcase-hero h1,
.agent-showcase-section h2,
.agent-process-section h2,
.agent-showcase-footer h2 {
  margin: 0;
  letter-spacing: 0;
}

.agent-showcase-hero h1 {
  max-width: 780px;
  font-size: clamp(3.3rem, 6.7vw, 7rem);
  line-height: 0.95;
}

.agent-showcase-hero__lead,
.agent-section-head > p:not(.agent-showcase-eyebrow),
.agent-showcase-footer > p {
  max-width: 860px;
  margin: 24px 0 0;
  color: #4f4f4f;
  font-size: 1.04rem;
  line-height: 1.9;
}

.agent-showcase-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 32px;
}

.agent-showcase-summary article {
  min-width: 0;
  border: 1px solid #e5e5e5;
  border-radius: 14px;
  background: #fafafa;
  padding: 14px;
}

.agent-showcase-summary strong,
.agent-showcase-summary span {
  display: block;
}

.agent-showcase-summary strong {
  color: #151515;
  font-size: 1.4rem;
  line-height: 1.1;
}

.agent-showcase-summary span {
  margin-top: 6px;
  color: #686868;
  font-size: 0.82rem;
  font-weight: 800;
}

.agent-workbench-preview {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #dcdcdc;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.12);
}

.agent-window-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 0 16px;
  border-bottom: 1px solid #ededed;
  background: #f8f8f8;
}

.agent-window-bar span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #cfcfcf;
}

.agent-window-bar strong {
  margin-left: 8px;
  color: #3d3d3d;
  font-size: 0.9rem;
}

.agent-preview-layout {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr) 230px;
  min-height: 590px;
}

.agent-preview-sessions,
.agent-preview-chat,
.agent-preview-files {
  min-width: 0;
  padding: 16px;
}

.agent-preview-sessions {
  display: grid;
  align-content: start;
  gap: 8px;
  border-right: 1px solid #ededed;
  background: #f7f7f8;
}

.agent-preview-sessions button {
  min-height: 40px;
  border: 0;
  border-radius: 10px;
  background: #151515;
  color: #fff;
  cursor: default;
  font: inherit;
  font-weight: 900;
}

.agent-preview-sessions p,
.agent-preview-files p {
  margin: 12px 0 4px;
  color: #828282;
  font-size: 0.74rem;
  font-weight: 900;
}

.agent-preview-sessions article {
  overflow: hidden;
  min-height: 38px;
  border-radius: 10px;
  padding: 10px;
  color: #333;
  font-size: 0.86rem;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-preview-sessions article.is-active {
  background: #e7e7e7;
}

.agent-preview-chat {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.agent-preview-chat header {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.agent-preview-chat header span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border: 1px solid #e6e6e6;
  border-radius: 999px;
  background: #f8f8f8;
  color: #555;
  font-size: 0.76rem;
  font-weight: 850;
  padding: 0 10px;
}

.agent-preview-message {
  width: fit-content;
  max-width: 84%;
  border: 1px solid #e8e8e8;
  border-radius: 17px;
  background: #f8f8f8;
  color: #2f2f2f;
  padding: 13px 15px;
  line-height: 1.7;
}

.agent-preview-message--user {
  align-self: flex-end;
  background: #151515;
  color: #fff;
}

.agent-preview-tools {
  display: grid;
  gap: 10px;
  width: min(100%, 520px);
}

.agent-preview-tools article {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  border: 1px solid #e8e8e8;
  border-radius: 15px;
  background: #fff;
  padding: 12px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.04);
}

.agent-preview-tools article > span {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background: #151515;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 900;
}

.agent-preview-tools strong,
.agent-preview-tools p {
  margin: 0;
}

.agent-preview-tools strong {
  font-family: Consolas, "SFMono-Regular", Menlo, monospace;
  font-size: 0.92rem;
}

.agent-preview-tools p {
  margin-top: 4px;
  color: #666;
  font-size: 0.86rem;
  line-height: 1.6;
}

.agent-preview-files {
  display: grid;
  align-content: start;
  gap: 9px;
  border-left: 1px solid #ededed;
  background: #fafafa;
}

.agent-preview-files article {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-height: 34px;
  border-radius: 10px;
  background: #fff;
  padding: 8px;
}

.agent-preview-files article span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #151515;
}

.agent-preview-files article strong {
  overflow: hidden;
  color: #303030;
  font-size: 0.8rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-preview-files pre {
  overflow: hidden;
  min-height: 160px;
  margin: 8px 0 0;
  border: 1px solid #ededed;
  border-radius: 14px;
  background: #fff;
  color: #4b5563;
  font-size: 0.76rem;
  line-height: 1.7;
  padding: 12px;
  white-space: pre-wrap;
}

.agent-showcase-section,
.agent-process-section,
.agent-showcase-footer {
  padding: 72px 28px;
}

.agent-section-head {
  max-width: 980px;
}

.agent-showcase-section h2,
.agent-process-section h2,
.agent-showcase-footer h2 {
  max-width: 1050px;
  font-size: clamp(2rem, 4vw, 4.6rem);
  line-height: 1.06;
}

.agent-capability-grid,
.agent-system-board,
.agent-tool-grid {
  display: grid;
  gap: 14px;
  margin-top: 34px;
}

.agent-capability-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.agent-capability-grid article,
.agent-system-board article,
.agent-tool-grid article {
  border: 1px solid #e8e8e8;
  border-radius: 18px;
  background: #fafafa;
  padding: 20px;
}

.agent-capability-grid article {
  display: grid;
  align-content: start;
  gap: 14px;
  min-height: 245px;
}

.agent-capability-grid span,
.agent-system-board small {
  color: #777;
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.agent-capability-grid h3,
.agent-system-board h3 {
  margin: 0;
  color: #151515;
  font-size: 1.18rem;
}

.agent-capability-grid p,
.agent-system-board p,
.agent-tool-grid p {
  margin: 0;
  color: #5f5f5f;
  line-height: 1.75;
}

.agent-process-section {
  display: grid;
  grid-template-columns: minmax(0, 0.72fr) minmax(440px, 0.66fr);
  gap: 38px;
  align-items: start;
  border-top: 1px solid #ededed;
  border-bottom: 1px solid #ededed;
  background: #151515;
  color: #fff;
}

.agent-section-head--dark .agent-showcase-eyebrow,
.agent-section-head--dark > p:not(.agent-showcase-eyebrow) {
  color: rgba(255, 255, 255, 0.72);
}

.agent-process-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.agent-process-list li {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 14px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  padding: 18px;
}

.agent-process-list li > span {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: #fff;
  color: #151515;
  font-weight: 900;
}

.agent-process-list strong {
  color: #fff;
}

.agent-process-list p {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.75;
}

.agent-showcase-section--systems {
  border-bottom: 1px solid #ededed;
}

.agent-system-board {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.agent-system-board article {
  display: grid;
  align-content: start;
  gap: 14px;
  min-height: 340px;
}

.agent-system-board ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.agent-system-board li {
  position: relative;
  padding-left: 16px;
  color: #3f3f3f;
  font-size: 0.9rem;
  line-height: 1.55;
}

.agent-system-board li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.68em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #151515;
}

.agent-tool-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.agent-tool-grid article {
  display: grid;
  align-content: start;
  gap: 12px;
  min-height: 168px;
}

.agent-tool-grid code {
  width: fit-content;
  border: 1px solid #d9d9d9;
  border-radius: 999px;
  background: #fff;
  color: #151515;
  font-size: 0.78rem;
  font-weight: 900;
  padding: 7px 10px;
}

.agent-showcase-footer {
  display: grid;
  grid-template-columns: minmax(0, 0.72fr) minmax(440px, 0.7fr);
  gap: 38px;
  align-items: start;
  border-top: 1px solid #ededed;
}

.agent-showcase-footer > p {
  margin-top: 0;
}

@media (max-width: 1380px) {
  .agent-showcase-hero {
    grid-template-columns: 1fr;
  }

  .agent-capability-grid,
  .agent-system-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agent-tool-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1060px) {
  .agent-preview-layout {
    grid-template-columns: 170px minmax(0, 1fr);
  }

  .agent-preview-files {
    display: none;
  }

  .agent-process-section,
  .agent-showcase-footer {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .agent-showcase-topbar {
    align-items: stretch;
    flex-direction: column;
    padding: 14px 16px;
  }

  .agent-showcase-nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    justify-content: stretch;
  }

  .agent-showcase-hero,
  .agent-showcase-section,
  .agent-process-section,
  .agent-showcase-footer {
    padding: 42px 16px;
  }

  .agent-showcase-hero h1 {
    font-size: 3rem;
  }

  .agent-showcase-summary,
  .agent-capability-grid,
  .agent-system-board,
  .agent-tool-grid {
    grid-template-columns: 1fr;
  }

  .agent-preview-layout {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .agent-preview-sessions {
    border-right: 0;
    border-bottom: 1px solid #ededed;
  }

  .agent-capability-grid article,
  .agent-system-board article,
  .agent-tool-grid article {
    min-height: auto;
  }
}
</style>
