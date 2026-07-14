<template>
  <section class="android-page android-agent-page">
    <header class="android-agent-hero">
      <div class="android-agent-hero__badge"><Bot :size="28" /></div>
      <div class="android-agent-hero__copy">
        <p>AGENT WORKSPACE</p>
        <h1>让任务过程<br />可以被看见</h1>
        <span>
          一个围绕会话、文件工作区、工具调用和知识检索搭建的个人 Agent 工作台。
          这里仅展示公开架构和能力，不连接私有数据。
        </span>
      </div>
      <div class="android-agent-hero__status">
        <ShieldCheck :size="15" /> 公开介绍
      </div>
    </header>

    <div class="android-agent-facts">
      <article v-for="fact in heroFacts" :key="fact.label">
        <strong>{{ fact.value }}</strong>
        <span>{{ fact.label }}</span>
      </article>
    </div>

    <nav class="android-agent-jumps" aria-label="页面章节">
      <button type="button" @click="scrollTo('agent-capabilities')">能力</button>
      <button type="button" @click="scrollTo('agent-flow')">流程</button>
      <button type="button" @click="scrollTo('agent-architecture')">架构</button>
      <button type="button" @click="scrollTo('agent-tools')">工具</button>
    </nav>

    <section id="agent-capabilities" class="android-agent-section">
      <div class="android-agent-section__heading">
        <div>
          <p>WHAT IT DOES</p>
          <h2>不是聊天壳，而是任务工作台</h2>
        </div>
        <Boxes :size="22" />
      </div>

      <div class="android-agent-capabilities">
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

    <section id="agent-flow" class="android-agent-section android-agent-section--dark">
      <div class="android-agent-section__heading">
        <div>
          <p>TASK FLOW</p>
          <h2>一次任务如何落地</h2>
        </div>
        <Workflow :size="22" />
      </div>

      <ol class="android-agent-flow">
        <li v-for="item in taskFlow" :key="item.step">
          <span>{{ item.step }}</span>
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
          </div>
        </li>
      </ol>
    </section>

    <section class="android-agent-section">
      <div class="android-agent-section__heading">
        <div>
          <p>CONTEXT LAYER</p>
          <h2>按任务组合上下文能力</h2>
        </div>
        <Layers3 :size="22" />
      </div>

      <div class="android-agent-context">
        <article v-for="item in contextLayers" :key="item.tag">
          <small>{{ item.tag }}</small>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section id="agent-architecture" class="android-agent-section">
      <div class="android-agent-section__heading">
        <div>
          <p>SYSTEM DESIGN</p>
          <h2>四层职责，独立演进</h2>
        </div>
        <Network :size="22" />
      </div>

      <div class="android-agent-architecture">
        <article v-for="item in architectureLayers" :key="item.tag">
          <span>{{ item.tag }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
          <ul>
            <li v-for="point in item.points" :key="point">{{ point }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section id="agent-tools" class="android-agent-section">
      <div class="android-agent-section__heading">
        <div>
          <p>BUILT-IN TOOLS</p>
          <h2>把判断变成受控动作</h2>
        </div>
        <Wrench :size="22" />
      </div>

      <div class="android-agent-tools">
        <article v-for="tool in localTools" :key="tool.name">
          <code>{{ tool.name }}</code>
          <p>{{ tool.description }}</p>
        </article>
      </div>
    </section>

    <section class="android-agent-observability">
      <div>
        <p>OBSERVABILITY</p>
        <h2>过程可追踪，结果可复盘</h2>
      </div>
      <article v-for="item in observability" :key="item.title">
        <Activity :size="18" />
        <div><strong>{{ item.title }}</strong><p>{{ item.description }}</p></div>
      </article>
    </section>

    <footer class="android-agent-footer">
      <LockKeyhole :size="18" />
      <p>真实工作台属于私人工具，只有连接 Tailscale 后才会访问。</p>
    </footer>
  </section>
</template>

<script setup>
import {
  Activity,
  Bot,
  Boxes,
  Layers3,
  LockKeyhole,
  Network,
  ShieldCheck,
  Workflow,
  Wrench
} from 'lucide-vue-next'

const heroFacts = [
  { value: '6', label: '内置工作区工具' },
  { value: 'MCP', label: '外部能力扩展' },
  { value: 'RAG', label: '知识库检索增强' },
  { value: 'SSE', label: '流式任务状态' }
]

const capabilities = [
  { index: '01', title: '多会话任务管理', description: '每个目标拥有独立会话和任务状态，可以切换、停止或继续推进。', points: ['会话列表', '流式回复', '任务中断'] },
  { index: '02', title: '会话级文件工作区', description: '每次会话拥有隔离目录，Agent 可以读取、创建、修改并展示当前任务文件。', points: ['文件隔离', '代码预览', 'HTML 预览'] },
  { index: '03', title: '工具调用可视化', description: '工具执行通过事件流返回界面，当前步骤、输出和结果都能被查看。', points: ['执行状态', '工具卡片', '结果回写'] },
  { index: '04', title: '临时附件上下文', description: '为当前任务加入文本附件，补充分析信息而不污染长期工作区。', points: ['按会话管理', '临时注入', '过期提示'] },
  { index: '05', title: '长期画像与记忆', description: '稳定偏好写入长期画像，长会话通过摘要压缩减少重复说明。', points: ['个人画像', '会话摘要', '敏感信息过滤'] },
  { index: '06', title: '设置与调用复盘', description: '集中管理模型、扩展和知识库，并提供审计事件与 token 分析。', points: ['模型配置', '审计监控', '用量分析'] }
]

const taskFlow = [
  { step: '01', title: '输入目标', description: '描述任务，并按需选择模型、Skills、MCP、知识库或临时附件。' },
  { step: '02', title: '组装上下文', description: '读取会话历史、工作区状态、长期偏好和可选知识检索结果。' },
  { step: '03', title: '判断与执行', description: '模型决定直接回答，或调用文件工具、受控命令与外部能力。' },
  { step: '04', title: '流式回写', description: '工具进度、最终回复、文件变化和用量持续写回当前会话。' }
]

const contextLayers = [
  { tag: 'MODEL', title: '模型按会话选择', description: '对话模型和 embedding 配置统一维护，任务开始前可以按需求切换。' },
  { tag: 'SKILLS', title: '本地技能包', description: 'Markdown 技能文件为 Agent 增加任务习惯、执行要求和质量约束。' },
  { tag: 'MCP', title: '外部工具接入', description: 'MCP 服务贡献额外工具，并进入与内置工具一致的受控调用链路。' },
  { tag: 'RAG', title: '知识库检索', description: '文档切分和向量化后，在对话前检索相关片段并注入上下文。' }
]

const architectureLayers = [
  { tag: '01 / FRONTEND', title: 'Vue 工作台', description: '负责会话、聊天区、文件查看、任务进度和设置中心。', points: ['流式界面更新', '文件预览', '上下文选择'] },
  { tag: '02 / API', title: '独立 Agent 服务', description: 'Node.js API 负责鉴权、会话、工具调用、审计和持久化。', points: ['会话接口', '事件流', '权限边界'] },
  { tag: '03 / RUNNER', title: '执行循环', description: '组装上下文，解析结构化动作，调用工具并生成最终回复。', points: ['动作解析', '工具调度', '结果回传'] },
  { tag: '04 / DATA', title: '持久化与检索', description: '会话、工作区、记忆、模型配置和知识库由不同存储层承担。', points: ['工作区隔离', '长期记忆', '向量检索'] }
]

const localTools = [
  { name: 'list_files', description: '列出当前会话工作区的目录和文件。' },
  { name: 'read_file', description: '读取目标文本文件，补充真实上下文。' },
  { name: 'search_text', description: '搜索关键词和组件名，定位实现位置。' },
  { name: 'run_command', description: '在策略允许范围内执行构建和检查。' },
  { name: 'write_file', description: '创建文件或完成整体内容写入。' },
  { name: 'apply_patch', description: '针对现有文件进行小范围精确修改。' }
]

const observability = [
  { title: '工具时间线', description: '工具开始、输出和结束状态通过事件流进入对话区。' },
  { title: '审计监控', description: '关键系统动作、工具调用和错误事件可以按会话查看。' },
  { title: 'Token 分析', description: '对话模型与 embedding 的使用量可以统一统计和复盘。' },
  { title: '受控执行', description: '高风险写入、命令和 MCP 动作由后端策略限制。' }
]

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style scoped>
.android-agent-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.android-agent-hero,
.android-agent-section,
.android-agent-observability,
.android-agent-footer {
  border: 1px solid #dedfe1;
  border-radius: 25px;
  background: #fff;
  box-shadow: 0 14px 38px rgba(35, 36, 39, 0.06);
}

.android-agent-hero {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 20px;
  padding: clamp(24px, 5vw, 44px);
  background:
    radial-gradient(circle at 85% 12%, rgba(49, 52, 56, 0.09), transparent 28%),
    linear-gradient(135deg, #fff, #ececea);
  overflow: hidden;
}

.android-agent-hero__badge {
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  border-radius: 20px;
  color: #fff;
  background: #36393e;
}

.android-agent-hero__copy p,
.android-agent-section__heading p,
.android-agent-observability > div p {
  margin: 0 0 8px;
  color: #70747a;
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.android-agent-hero__copy h1 {
  margin: 0;
  color: #24262a;
  font-size: clamp(2.15rem, 7vw, 4.6rem);
  line-height: 0.98;
  letter-spacing: -0.06em;
}

.android-agent-hero__copy > span {
  max-width: 680px;
  display: block;
  margin-top: 17px;
  color: #62666c;
  font-size: 0.84rem;
  line-height: 1.75;
}

.android-agent-hero__status {
  position: absolute;
  top: 20px;
  right: 20px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 999px;
  color: #55595f;
  background: rgba(255, 255, 255, 0.7);
  font-size: 0.64rem;
  font-weight: 750;
}

.android-agent-facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
}

.android-agent-facts article {
  min-width: 0;
  padding: 16px;
  border: 1px solid #dedfe1;
  border-radius: 18px;
  background: #fff;
}

.android-agent-facts strong,
.android-agent-facts span {
  display: block;
}

.android-agent-facts strong {
  color: #303338;
  font-size: 1.12rem;
}

.android-agent-facts span {
  margin-top: 5px;
  color: #81858b;
  font-size: 0.62rem;
}

.android-agent-jumps {
  display: flex;
  gap: 7px;
  padding: 4px;
  border-radius: 16px;
  background: #e8e9ea;
  overflow-x: auto;
}

.android-agent-jumps button {
  flex: 1;
  min-width: 72px;
  min-height: 38px;
  border: 0;
  border-radius: 12px;
  color: #55595f;
  background: #f7f7f6;
  font-size: 0.72rem;
  font-weight: 750;
}

.android-agent-section {
  scroll-margin-top: 16px;
  padding: clamp(20px, 4vw, 32px);
}

.android-agent-section--dark {
  color: #f4f4f2;
  background: #303338;
  border-color: #303338;
}

.android-agent-section__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;
}

.android-agent-section__heading h2,
.android-agent-observability h2 {
  margin: 0;
  color: #292b2f;
  font-size: clamp(1.3rem, 4.5vw, 2rem);
  letter-spacing: -0.045em;
}

.android-agent-section__heading > svg {
  color: #92969c;
}

.android-agent-section--dark .android-agent-section__heading h2,
.android-agent-section--dark .android-agent-section__heading > svg {
  color: #f4f4f2;
}

.android-agent-section--dark .android-agent-section__heading p {
  color: #aeb2b8;
}

.android-agent-capabilities {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 20px;
}

.android-agent-capabilities article,
.android-agent-context article,
.android-agent-architecture article,
.android-agent-tools article {
  border-radius: 18px;
  background: #f5f5f4;
}

.android-agent-capabilities article {
  padding: 18px;
}

.android-agent-capabilities article > span,
.android-agent-context small,
.android-agent-architecture article > span {
  color: #878b91;
  font-size: 0.61rem;
  font-weight: 850;
  letter-spacing: 0.1em;
}

.android-agent-capabilities h3,
.android-agent-context h3,
.android-agent-architecture h3 {
  margin: 12px 0 0;
  color: #2b2d31;
  font-size: 0.94rem;
}

.android-agent-capabilities p,
.android-agent-context p,
.android-agent-architecture p,
.android-agent-tools p,
.android-agent-observability article p {
  margin: 8px 0 0;
  color: #6f7379;
  font-size: 0.72rem;
  line-height: 1.65;
}

.android-agent-capabilities ul,
.android-agent-architecture ul {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}

.android-agent-capabilities li,
.android-agent-architecture li {
  padding: 5px 7px;
  border-radius: 999px;
  color: #676b71;
  background: #e6e7e8;
  font-size: 0.59rem;
}

.android-agent-flow {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
}

.android-agent-flow li {
  position: relative;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  padding-bottom: 20px;
}

.android-agent-flow li:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 36px;
  bottom: 0;
  left: 20px;
  width: 1px;
  background: rgba(255, 255, 255, 0.16);
}

.android-agent-flow li > span {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  font-size: 0.67rem;
  font-weight: 850;
}

.android-agent-flow strong {
  font-size: 0.9rem;
}

.android-agent-flow p {
  margin: 6px 0 0;
  color: #b8bcc2;
  font-size: 0.72rem;
  line-height: 1.6;
}

.android-agent-context,
.android-agent-architecture,
.android-agent-tools {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 20px;
}

.android-agent-context article,
.android-agent-architecture article,
.android-agent-tools article {
  padding: 17px;
}

.android-agent-tools code {
  color: #303338;
  font-size: 0.72rem;
  font-weight: 800;
}

.android-agent-observability {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: clamp(20px, 4vw, 30px);
}

.android-agent-observability > div {
  grid-column: 1 / -1;
  margin-bottom: 5px;
}

.android-agent-observability article {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 15px;
  border-radius: 17px;
  background: #f5f5f4;
}

.android-agent-observability article > svg {
  flex: 0 0 auto;
  color: #73777d;
}

.android-agent-observability article strong {
  font-size: 0.76rem;
}

.android-agent-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 17px 19px;
  color: #666a70;
}

.android-agent-footer p {
  margin: 0;
  font-size: 0.7rem;
  line-height: 1.5;
}

@media (max-width: 620px) {
  .android-agent-hero {
    grid-template-columns: 1fr;
    padding-top: 70px;
  }

  .android-agent-hero__badge {
    width: 54px;
    height: 54px;
  }

  .android-agent-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .android-agent-capabilities,
  .android-agent-context,
  .android-agent-architecture,
  .android-agent-tools,
  .android-agent-observability {
    grid-template-columns: 1fr;
  }
}
</style>
