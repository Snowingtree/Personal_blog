import {
  extractMarkdownHeadings,
  normalizeMarkdownSource,
  splitMarkdownArticleSource
} from '../utils/markdownPreview'

const FRONTMATTER_BLOCK_PATTERN = /^(?:\uFEFF)?(---|\+\+\+)\r?\n([\s\S]*?)\r?\n\1\r?\n?/
const articleBasePath = '/articles'
const articleMarkdownModules = import.meta.glob('../content/articles/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
})

const articleMarkdownEntries = Object.entries(articleMarkdownModules).map(([path, source], index) => {
  const fileName = path.split('/').pop() || ''

  return {
    slug: fileName.replace(/\.md$/i, ''),
    source: typeof source === 'string' ? source : '',
    sourceOrder: index
  }
})

const articleMarkdownBySlug = Object.fromEntries(
  articleMarkdownEntries.map(({ slug, source }) => [slug, source])
)

const articleSourceOrderBySlug = Object.fromEntries(
  articleMarkdownEntries.map(({ slug, sourceOrder }) => [slug, sourceOrder])
)

const articleOverrides = {
  'placeholder-story-01': {
    category: '随手记录',
    date: '2026-04-08',
    dateLabel: '2026.04.08',
    readingTime: '5 分钟',
    excerpt: '这篇占位文章主要用来确认首页卡片已经可以跳转到独立文章页，同时又不会破坏整站原本的视觉氛围。',
    tags: ['占位内容', '首页', '路由'],
    shareNote: '临时示例文案，后面可以直接替换成你自己的文章摘要。',
    eyebrow: '临时草稿',
    heroNote: '这是一个临时文章页，用来保持和主页一致的气质与节奏。'
  },
  'placeholder-story-02': {
    category: '开发记录',
    date: '2026-04-06',
    dateLabel: '2026.04.06',
    readingTime: '6 分钟',
    excerpt: '第二篇占位文章可以用来放开发日志、部署复盘，或者任何值得单独展开讲清楚的小主题。',
    tags: ['开发记录', '草稿', '排版'],
    shareNote: '当前还是临时内容，但这个位置已经可以直接承接你的下一篇正式文章。',
    eyebrow: '开发记录',
    heroNote: '这是一个可以反复复用的文章模板，适合记录进度、排错和产品更新。'
  },
  'placeholder-story-03': {
    category: '产品想法',
    date: '2026-04-04',
    dateLabel: '2026.04.04',
    readingTime: '7 分钟',
    excerpt: '第三篇占位文章主要用来展示：文章页也可以像主页一样保持统一配色、统一层次，而不是看起来像另一个站点。',
    tags: ['设计风格', '阅读页', '占位文章'],
    shareNote: '这段也是临时文字，后续可以替换成真正的设计总结或产品思考。',
    eyebrow: '产品想法',
    heroNote: '这个阅读页沿用了主页的底色、间距和卡片语言，让整体体验更连贯。'
  }
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

function resolveTags(...candidates) {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const tags = candidate
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)

      if (tags.length) {
        return tags
      }
    }

    if (typeof candidate === 'string' && candidate.trim()) {
      const normalized = candidate
        .trim()
        .replace(/^\[/, '')
        .replace(/\]$/, '')

      const tags = normalized
        .split(/[，,]/)
        .map((item) => item.trim())
        .filter(Boolean)

      if (tags.length) {
        return tags
      }
    }
  }

  return []
}

function parseArticleFrontmatter(markdown) {
  const match = String(markdown || '').match(FRONTMATTER_BLOCK_PATTERN)

  if (!match) {
    return {}
  }

  const fields = {}

  match[2].split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      return
    }

    const separatorIndex = line.indexOf(':')

    if (separatorIndex < 0) {
      return
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '')

    if (!key || !value) {
      return
    }

    fields[key] = value
  })

  return fields
}

function resolveArticleMarkdown(slug, fallbackContent = '') {
  const fileContent = articleMarkdownBySlug[slug]

  if (typeof fileContent === 'string' && fileContent.trim()) {
    return fileContent
  }

  return fallbackContent || ''
}

function resolveArticleSource(markdown) {
  return splitMarkdownArticleSource(markdown)
}

function resolveArticleTitle(fallbackTitle, markdown) {
  const headings = extractMarkdownHeadings(normalizeMarkdownSource(markdown))
  const primaryHeading = headings.find((heading) => heading.level === 1) || headings[0]

  if (primaryHeading?.text) {
    return primaryHeading.text
  }

  return fallbackTitle
}

function buildFallbackTitle(slug) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function deriveExcerpt(markdown) {
  const lines = normalizeMarkdownSource(markdown).split(/\r?\n/)
  let insideCodeFence = false

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    if (line.startsWith('```') || line.startsWith('~~~')) {
      insideCodeFence = !insideCodeFence
      continue
    }

    if (insideCodeFence) {
      continue
    }

    if (/^#{1,6}\s/.test(line) || /^[-*+]\s/.test(line) || /^\d+\.\s/.test(line) || line.startsWith('>')) {
      continue
    }

    const plainLine = line.replace(/[*_`~]/g, '').trim()

    if (plainLine) {
      return plainLine.length > 120 ? `${plainLine.slice(0, 117).trim()}...` : plainLine
    }
  }

  return ''
}

function estimateReadingTime(markdown) {
  const plainText = normalizeMarkdownSource(markdown)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/[#>*`~_[\]()!-]/g, ' ')
    .replace(/\s+/g, '')

  const minutes = Math.max(1, Math.ceil(plainText.length / 320))
  return `${minutes} 分钟`
}

function parseDateValue(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Number.NaN
  }

  return Date.parse(`${date}T00:00:00`)
}

function formatDateLabel(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.replace(/-/g, '.') : ''
}

function resolveArticleRecord(slug) {
  const override = articleOverrides[slug] || {}
  const markdown = resolveArticleMarkdown(slug, override.content)
  const frontmatter = parseArticleFrontmatter(markdown)
  const { content, excerpt: markdownExcerpt } = resolveArticleSource(markdown)
  const category = firstNonEmpty(override.category, frontmatter.category, '文章')
  const date = firstNonEmpty(override.date, frontmatter.date)
  const excerpt = firstNonEmpty(
    markdownExcerpt,
    override.excerpt,
    frontmatter.abstract,
    frontmatter.excerpt,
    deriveExcerpt(content)
  )

  return {
    slug,
    category,
    date,
    dateLabel: firstNonEmpty(override.dateLabel, formatDateLabel(date), '未标注日期'),
    readingTime: firstNonEmpty(
      override.readingTime,
      frontmatter.readingTime,
      estimateReadingTime(content)
    ),
    title: resolveArticleTitle(
      firstNonEmpty(override.title, frontmatter.title, buildFallbackTitle(slug)),
      content
    ),
    excerpt,
    tags: resolveTags(override.tags, frontmatter.tags),
    shareNote: firstNonEmpty(override.shareNote, frontmatter.shareNote),
    eyebrow: firstNonEmpty(override.eyebrow, frontmatter.eyebrow, category),
    heroNote: firstNonEmpty(override.heroNote, frontmatter.heroNote, excerpt),
    content,
    sourceOrder: articleSourceOrderBySlug[slug] ?? -1
  }
}

function compareArticles(left, right) {
  const leftDate = parseDateValue(left.date)
  const rightDate = parseDateValue(right.date)

  if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate) && leftDate !== rightDate) {
    return rightDate - leftDate
  }

  if (left.sourceOrder !== right.sourceOrder) {
    return right.sourceOrder - left.sourceOrder
  }

  if (!Number.isNaN(leftDate) && Number.isNaN(rightDate)) {
    return -1
  }

  if (Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
    return 1
  }

  return right.slug.localeCompare(left.slug, 'en')
}

const articleSlugs = Array.from(
  new Set([...articleMarkdownEntries.map(({ slug }) => slug), ...Object.keys(articleOverrides)])
)

export const homepageArticleSection = {
  title: '文章',
  description: ''
}

export const blogArticles = articleSlugs.map(resolveArticleRecord).sort(compareArticles)

export const homepageArticleCards = blogArticles.map((article) => ({
  category: article.category,
  date: article.date,
  dateLabel: article.dateLabel,
  readingTime: article.readingTime,
  title: article.title,
  excerpt: article.excerpt,
  tags: article.tags,
  shareNote: article.shareNote,
  to: `${articleBasePath}/${article.slug}`
}))

export function getBlogArticleBySlug(slug) {
  return blogArticles.find((entry) => entry.slug === slug) || null
}
