export const siteHero = {
  eyebrow: 'PERSONAL BLOG / 2026',
  title: '把代码、设计和日常观察整理成一座持续更新的个人博客。',
  lead: '这里持续整理前端实验、项目复盘、AI 分享，以及已经独立运行的站内项目。'
}

export const siteProjectSpotlights = [
  {
    eyebrow: '站内项目',
    title: 'Snowingress My Components',
    theme: 'components',
    badge: '文档已上线',
    description:
      '组件库文档继续作为主站下的独立项目维护，可以直接查看 Button、Input、Select、Switch 等组件示例与说明。',
    meta: ['Vue 3', 'VitePress', '10+ Components'],
    primaryLabel: '打开组件库文档',
    primaryHref: '/components/index.html',
    secondaryLabel: '查看 Button 示例',
    secondaryHref: '/components/Components/Button.html'
  },
  {
    eyebrow: '站内项目',
    title: '小兔鲜商城',
    theme: 'market',
    badge: '商城项目已接入',
    description:
      '小兔鲜以独立子项目方式运行，保留商城浏览、登录和商品详情等完整路由，首页只提供清晰入口。',
    meta: ['Vue 3', 'Vite'],
    primaryLabel: '打开小兔鲜商城',
    primaryHref: '/xiao-tu-xian/',
    secondaryLabel: '查看登录页',
    secondaryHref: '/xiao-tu-xian/login'
  },
  {
    eyebrow: '站内项目',
    title: 'AI 项目实验室',
    theme: 'ai',
    badge: 'Agent 展示',
    description:
      '展示自建 Web Agent 工作台：多会话、工作区文件、RAG、MCP、Skills、审计与用量分析。',
    meta: ['Web Agent', 'Workspace Tools', 'RAG / MCP'],
    primaryLabel: '查看 Agent',
    primaryTo: '/agent-intro',
    cardTo: '/agent-intro'
  }
]

export const sitePublicTools = {
  eyebrow: 'Mini Demo Lab',
  title: '公开工具',
  lead: '',
  demos: [
    {
      eyebrow: 'Canvas Demo',
      title: '在线简历编辑',
      cardTo: '/resume-editor'
    },
    {
      eyebrow: 'Coming Soon',
      title: '预留工具 01'
    },
    {
      eyebrow: 'Coming Soon',
      title: '预留工具 02'
    }
  ]
}
