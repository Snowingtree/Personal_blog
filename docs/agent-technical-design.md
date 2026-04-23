# Agent 智能体技术设计文档

## 1. 文档目标

本文用于定义站内 `Agent` 模块的产品边界、技术方案和实施顺序。

当前仓库已经具备以下基线能力：

- 首页已增加 `Agent` 入口，位置在 `工具` 左侧。
- `Agent` 入口与 `工具`、`动漫` 一样，走内网访问链路。
- `Agent` 已复用现有登录界面样式，但登录成功后进入独立的 `Agent` 页面，而不是跳转到笔记页。
- 前端路由、鉴权作用域和 401 跳转逻辑已经为 `Agent` 单独拆分。

因此，这份文档不再讨论“是否增加 Agent 入口”，而是定义“Agent 登录后要做成什么、如何做、先做什么”。

## 2. 产品定位

### 2.1 目标定位

`Agent` 不是普通聊天框，而是一个“可持续工作”的智能体工作台。

参考你提到的“和小龙虾一样”的方向，建议把它定义成：

- 有明确角色设定的专属智能体
- 能记住当前任务上下文
- 能调用站内已有能力
- 能把复杂任务拆成步骤并持续推进
- 能沉淀会话、知识、执行记录

一句话定义：

> Agent = 聊天能力 + 上下文记忆 + 工具调用 + 任务编排 + 结果沉淀

### 2.2 和现有笔记 AI 的区别

现有笔记 AI 更偏“围绕当前笔记出题和追问”，核心上下文是单篇 Markdown 笔记。

`Agent` 应该更偏“围绕一个目标持续工作”，核心上下文不再是单篇笔记，而是：

- 当前任务
- 当前会话
- 用户提供的资料
- 系统内可调用工具
- 过往执行记录

### 2.3 第一阶段建议场景

如果先做一个最小可用版本，建议把 `Agent` 的场景收敛为以下 4 类：

1. 通用问答：像聊天一样直接提问，但保留会话上下文。
2. 任务拆解：输入目标后，自动生成待办步骤和执行建议。
3. 内容生成：输出方案、文案、总结、学习计划、接口草稿等。
4. 站内助手：后续接入笔记、题目、动漫等站内模块，形成统一工作入口。

## 3. 当前代码基线

### 3.1 已完成模块

当前仓库里，`Agent` 的基础接入已经完成：

- 首页导航入口：
  - `src/pages/BlogHomePage/BlogHomePage.vue`
  - `src/components/blog/BlogTopbar/BlogTopbar.vue`
- Agent 登录页：
  - `src/pages/AgentLoginPage/AgentLoginPage.vue`
- Agent 独立工作台页：
  - `src/pages/AgentPage/AgentPage.vue`
- 路由与鉴权：
  - `src/router/index.js`
- 通用 HTTP 401 处理：
  - `src/utils/http.js`
- Agent 本地存储键：
  - `src/constants/storage.js`

### 3.2 当前访问路径

当前页面流转已经是：

1. 首页点击 `Agent`
2. 跳到 `/agent-login`
3. 登录成功后写入 `AGENT_AUTH_KEY`、`AGENT_USERNAME_KEY`、`AUTH_TOKEN_KEY`
4. 跳到 `/agent`
5. 如果 `Agent` 页面请求返回 401，则自动回到 `/agent-login`

### 3.3 当前内网访问机制

`Agent` 已复用现有私网访问策略，基础逻辑如下：

- 通过 `resolvePrivateAppUrl()` 生成内网入口链接
- 通过 `usePrivateAppAccess()` 检测当前环境是否可访问私网应用
- 通过 `privateNetworkOnly` 路由元信息限制页面访问

这意味着 `Agent` 本身不需要再单独设计一套“公网/内网双入口”机制，直接沿用现有私网能力即可。

## 4. 总体方案

## 4.1 设计原则

`Agent` 建议遵循 4 个原则：

1. 入口独立：有自己的登录态、自己的页面、自己的会话数据。
2. 基建复用：认证、HTTP、AI 配置、私网访问、通用 UI 尽量复用现有实现。
3. 能力渐进：先做单智能体工作台，再做工具调用，再做多角色或自动流转。
4. 可追踪：所有会话、任务、工具执行都要能回看，不做一次性黑盒交互。

## 4.2 推荐的页面结构

建议把 `/agent` 做成三栏或双栏工作台。

第一阶段推荐双栏：

- 左侧：会话与任务区
- 右侧：结果面板与上下文面板

建议页面模块如下：

1. 顶部栏
   - Agent 名称
   - 当前用户
   - 当前模型
   - 新建会话
   - 清空当前会话
   - 退出登录
2. 左侧主体
   - 会话列表
   - 当前任务卡片
   - 对话消息流
   - 输入框
   - 快捷操作按钮
3. 右侧侧栏
   - 当前上下文摘要
   - 已使用工具
   - 关键输出结果
   - 记忆片段
   - 调试信息

## 4.3 第一阶段功能边界

第一阶段不要直接做“完全自治 Agent”，否则复杂度会明显失控。

建议先做 `Agent v1`：

- 单智能体
- 单用户会话
- 人工发起任务
- Agent 负责回答、拆解、整理、生成
- 支持有限的工具调用
- 保留过程和结果

先不做：

- 多智能体协作
- 长时间后台自动运行
- 浏览器自动控制
- 文件系统任意写入
- 高风险外部执行

## 5. 前端技术方案

## 5.1 页面组件拆分建议

建议后续把 `src/pages/AgentPage/AgentPage.vue` 拆成以下组件：

- `src/components/agent/AgentWorkspace/AgentWorkspace.vue`
- `src/components/agent/AgentConversation/AgentConversation.vue`
- `src/components/agent/AgentTaskCard/AgentTaskCard.vue`
- `src/components/agent/AgentContextPanel/AgentContextPanel.vue`
- `src/components/agent/AgentSessionList/AgentSessionList.vue`
- `src/components/agent/AgentComposer/AgentComposer.vue`
- `src/components/agent/AgentRunLog/AgentRunLog.vue`

这样做的原因很直接：

- 当前 `AgentPage` 只是占位页，后续功能一定会快速膨胀
- 如果不提前拆结构，后面会变成一个过大的单文件组件
- 这些模块天然对应未来的数据结构和接口

## 5.2 状态管理建议

当前项目没有引入 Pinia，短期内没必要强加全局状态库。

第一阶段建议继续使用：

- `ref`
- `reactive`
- `computed`
- 组合式 hooks

新增一个专用 hook 即可：

- `src/hooks/useAgentWorkspace.js`

它负责管理：

- 当前会话 ID
- 会话列表
- 消息列表
- 当前任务
- 当前运行状态
- 当前模型配置
- 当前错误信息

如果后续 Agent 状态变复杂，再考虑引入 Pinia。

## 5.3 前端交互流

建议把一次完整交互拆成以下流程：

1. 用户输入任务或问题
2. 前端创建一条用户消息
3. 前端调用 `/api/agent/chat`
4. 服务端返回：
   - assistant 文本回复
   - 当前任务状态
   - 工具执行摘要
   - 使用的模型信息
5. 前端刷新消息流、任务区和右侧上下文区
6. 用户继续追问，形成持续会话

## 5.4 与现有模块的复用点

可以直接复用的现有能力：

- `LoginForm`：继续复用登录 UI
- `AppHeader`：继续复用内页头部结构
- `PrivateAccessLoadingOverlay`：继续复用内网可达性拦截
- `http`：继续复用统一请求和 401 处理
- AI 配置页能力：继续复用模型、接口地址、API Key 管理

可以参考但不直接照搬的模块：

- `NoteAiWorkspace.vue`

原因是笔记 AI 的上下文模型是“当前笔记 + 当前题目”，而 Agent 的上下文模型会更通用。

## 6. 后端技术方案

## 6.1 推荐思路

后端不要重写一套新的 AI 调用层，应该在现有 `server/aiApi.js` 的基础上扩展出 Agent API。

原因：

- 现有项目已经有成熟的模型配置读取逻辑
- 已经支持不同 base URL 和模型版本
- 已经有统一的请求封装、超时控制、错误处理
- 后续 Agent 和笔记 AI 可以共享一套模型来源

因此，建议新增：

- `server/agentApi.js`

并在 `server/index.js` 中挂载。

## 6.2 推荐接口

第一阶段建议最少提供以下接口：

### 会话接口

- `GET /api/agent/sessions`
  - 获取会话列表
- `POST /api/agent/sessions`
  - 新建会话
- `GET /api/agent/sessions/:sessionId`
  - 获取单个会话详情
- `DELETE /api/agent/sessions/:sessionId`
  - 删除会话

### 消息接口

- `POST /api/agent/chat`
  - 向当前会话发送消息并获取回复

### 任务接口

- `POST /api/agent/tasks`
  - 创建一个任务
- `PATCH /api/agent/tasks/:taskId`
  - 更新任务状态
- `GET /api/agent/tasks/:taskId`
  - 获取任务详情

### 记忆接口

- `GET /api/agent/memory`
  - 获取当前 Agent 记忆片段
- `POST /api/agent/memory`
  - 保存人工确认过的长期记忆

## 6.3 `POST /api/agent/chat` 返回结构建议

建议服务端一次返回完整上下文，而不是只返回一句文本。

```json
{
  "ok": true,
  "sessionId": "sess_xxx",
  "task": {
    "taskId": "task_xxx",
    "title": "整理一个学习计划",
    "status": "in_progress",
    "summary": "已拆解出 4 个阶段"
  },
  "reply": {
    "role": "assistant",
    "content": "我先帮你把目标拆成 4 个阶段。"
  },
  "artifacts": [
    {
      "type": "plan",
      "title": "四阶段执行计划"
    }
  ],
  "toolCalls": [
    {
      "toolName": "knowledge_search",
      "status": "success",
      "summary": "命中 3 条站内资料"
    }
  ],
  "model": "glm-4.5-air"
}
```

这样前端可以同时更新：

- 对话区
- 任务区
- 右侧上下文面板
- 工具执行记录

## 6.4 Prompt 组织建议

建议 Agent 使用分层 Prompt，而不是把所有规则堆在一个 system prompt 里。

推荐拆成 4 层：

1. `system`
   - Agent 的角色、边界、安全规则
2. `workspace`
   - 当前会话摘要、当前任务、可用工具
3. `memory`
   - 与用户长期偏好或高频背景相关的记忆
4. `messages`
   - 本轮历史对话

建议新增目录：

- `server/prompts/agent-system.txt`
- `server/prompts/agent-task-planner.txt`
- `server/prompts/agent-memory-summary.txt`

## 7. 工具调用设计

## 7.1 第一阶段工具建议

Agent 不需要一开始就接十几个工具。第一阶段建议只接 3 类内部工具：

1. `notes_context`
   - 读取站内笔记内容
   - 适合做学习问答、资料总结、题目延展
2. `quiz_history_lookup`
   - 查询最近抽过的题和问答历史
   - 适合做连续追问和错题回顾
3. `anime_lookup`
   - 查询动漫列表或状态
   - 作为站内工具联动示例

这样有两个好处：

- 能马上体现 Agent 不只是聊天框
- 工具来源都在你自己的系统内，风险低，调试成本也低

## 7.2 工具调用执行方式

服务端执行比前端执行更稳妥。

推荐模式：

1. 前端把用户消息发到 `/api/agent/chat`
2. 服务端根据 prompt 判断是否需要工具
3. 服务端执行工具逻辑
4. 服务端把工具结果拼回模型上下文
5. 最终返回给前端

不要把“是否调用工具”的复杂逻辑散落在前端。

## 8. 数据存储设计

## 8.1 推荐数据实体

至少需要以下 4 类数据：

1. 会话 `agent_sessions`
2. 消息 `agent_messages`
3. 任务 `agent_tasks`
4. 记忆 `agent_memories`

## 8.2 表结构建议

### `agent_sessions`

- `session_id`
- `title`
- `user_id` 或 `username`
- `status`
- `last_message_at`
- `created_at`
- `updated_at`

### `agent_messages`

- `message_id`
- `session_id`
- `role`
- `content`
- `tool_calls_json`
- `artifacts_json`
- `model`
- `created_at`

### `agent_tasks`

- `task_id`
- `session_id`
- `title`
- `goal`
- `status`
- `summary`
- `result_json`
- `created_at`
- `updated_at`

### `agent_memories`

- `memory_id`
- `scope`
- `content`
- `source`
- `weight`
- `created_at`
- `updated_at`

## 8.3 当前阶段的存储建议

如果你想快速上线，建议分两步走：

1. 第一阶段先用文件或简单 JSON 存储会话
2. 第二阶段迁移到 MySQL

如果你希望一开始就稳定可维护，建议直接进 MySQL，因为：

- 仓库里已经有 MySQL 依赖
- 现有 AI 配置已经在往服务端持久化方向走
- Agent 会话天然是结构化数据，关系型表更合适

## 9. 安全与边界

## 9.1 认证边界

`Agent` 应继续保持独立认证作用域：

- 动漫：`anime`
- 笔记：`notes`
- Agent：`agent`

这样可以确保：

- 不同私有模块之间的登录跳转清晰
- 后续即便做不同权限，也有独立扩展空间

## 9.2 工具边界

第一阶段工具必须限制在站内可控范围：

- 只读优先
- 不允许任意文件写入
- 不允许任意系统命令执行
- 不允许高风险外部网络访问

先把 Agent 做成“可信的内容工作台”，不要过早做成“高权限执行器”。

## 9.3 审计要求

以下内容建议全部留痕：

- 用户输入
- 模型输出
- 工具调用参数
- 工具调用结果摘要
- 错误信息
- 最终产出

否则后续出现错答、误操作或上下文污染时，很难排查。

## 10. 实施里程碑

### Phase 0：已完成

- 首页增加 Agent 入口
- Agent 复用登录界面
- Agent 拥有独立登录跳转
- Agent 拥有独立工作台占位页
- Agent 拥有独立鉴权作用域

### Phase 1：最小可用版本

目标：把 Agent 从“占位页”做成“可持续聊天工作台”

交付内容：

- 会话列表
- 基础聊天
- 当前任务摘要
- 模型选择
- 历史会话持久化
- 基础记忆能力

### Phase 2：站内工具联动

目标：让 Agent 真正比普通聊天更有用

交付内容：

- 接入笔记上下文
- 接入最近题目/题库上下文
- 接入动漫数据查询
- 工具调用记录展示

### Phase 3：任务编排增强

目标：从“能聊”升级到“能推进任务”

交付内容：

- 任务拆解
- 步骤状态更新
- 结果卡片沉淀
- 会话摘要自动生成

### Phase 4：高级能力

视情况再做：

- 多 Agent 角色
- 背景任务
- 长期记忆召回
- 更复杂的工作流引擎

## 11. 推荐的近期开发顺序

如果下一步就开始做，我建议按下面顺序推进：

1. 重写 `AgentPage`，先做聊天工作台 UI 骨架
2. 新增 `useAgentWorkspace` 管理前端状态
3. 服务端新增 `server/agentApi.js`
4. 先接通 `POST /api/agent/chat`
5. 接入会话持久化
6. 再追加任务卡片和记忆面板
7. 最后接站内工具

这个顺序的好处是：

- 每一步都能看到实际页面进展
- 可以先打通主链路，再慢慢增强
- 不会一上来就陷入“工具编排”过深的实现泥潭

## 12. 当前建议结论

`Agent` 最适合做成一个独立的、面向任务的智能体工作台，而不是再复制一个“笔记 AI 对话框”。

技术上最合理的路线是：

- 保留当前已经完成的独立入口和独立登录
- 复用现有认证、私网访问、AI 配置和请求封装
- 新增 Agent 专属页面结构、接口和持久化数据
- 第一阶段先做单智能体 + 会话 + 任务摘要 + 站内工具联动

## 13. 待确认问题

在开始实现前，最好确认下面 4 个问题：

1. `Agent` 的第一优先场景是什么：学习助手、内容助手、任务助手，还是综合助手？
2. 第一阶段是否需要“会话历史持久化”？
3. Agent 是否要直接复用当前 AI 配置页里的模型来源？
4. 第一批要接入的站内工具，是否就定为：笔记、题目、动漫？

如果这 4 个问题确定下来，后面的实现会很顺，不会反复返工。
