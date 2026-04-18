import {
  extractMarkdownHeadings,
  normalizeMarkdownSource,
  splitMarkdownArticleSource
} from '../utils/markdownPreview'

const FRONTMATTER_BLOCK_PATTERN = /^(?:\uFEFF)?(---|\+\+\+)\r?\n([\s\S]*?)\r?\n\1\r?\n?/
const aiShareBasePath = '/ai-shares'
const aiShareMarkdownModules = import.meta.glob('../content/ai-shares/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
})

const aiShareMarkdownEntries = Object.entries(aiShareMarkdownModules).map(([path, source], index) => {
  const fileName = path.split('/').pop() || ''

  return {
    slug: fileName.replace(/\.md$/i, ''),
    source: typeof source === 'string' ? source : '',
    sourceOrder: index
  }
})

const aiShareMarkdownBySlug = Object.fromEntries(
  aiShareMarkdownEntries.map(({ slug, source }) => [slug, source])
)

const aiShareSourceOrderBySlug = Object.fromEntries(
  aiShareMarkdownEntries.map(({ slug, sourceOrder }) => [slug, sourceOrder])
)

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

function parseFrontmatter(markdown) {
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

function resolveMarkdown(slug) {
  const fileContent = aiShareMarkdownBySlug[slug]
  return typeof fileContent === 'string' ? fileContent : ''
}

function resolveTitle(fallbackTitle, markdown) {
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

function resolveAiShareRecord(slug) {
  const markdown = resolveMarkdown(slug)
  const frontmatter = parseFrontmatter(markdown)
  const { content, excerpt: markdownExcerpt } = splitMarkdownArticleSource(markdown)
  const date = firstNonEmpty(frontmatter.date)
  const excerpt = firstNonEmpty(
    markdownExcerpt,
    frontmatter.abstract,
    frontmatter.excerpt,
    deriveExcerpt(content)
  )

  return {
    slug,
    category: firstNonEmpty(frontmatter.category, 'AI Share'),
    date,
    dateLabel: firstNonEmpty(formatDateLabel(date), '未标注日期'),
    readingTime: firstNonEmpty(frontmatter.readingTime, estimateReadingTime(content)),
    title: resolveTitle(firstNonEmpty(frontmatter.title, buildFallbackTitle(slug)), content),
    excerpt,
    tags: resolveTags(frontmatter.tags),
    shareNote: firstNonEmpty(frontmatter.shareNote, '记录一段可复用的 AI 实战思路，而不是只留一句结论。'),
    eyebrow: firstNonEmpty(frontmatter.eyebrow, frontmatter.category, 'AI Share'),
    heroNote: firstNonEmpty(frontmatter.heroNote, excerpt),
    content,
    sourceOrder: aiShareSourceOrderBySlug[slug] ?? -1
  }
}

function compareAiShares(left, right) {
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

const aiShareSlugs = aiShareMarkdownEntries.map(({ slug }) => slug)

export const homepageAiShareSection = {
  title: '最近 AI 分享',
  description: '把最近在用的 AI 工作流、提示词结构和协作方法整理成和文章分享同级的内容区。'
}

export const aiShares = aiShareSlugs.map(resolveAiShareRecord).sort(compareAiShares)

export const homepageAiShareCards = aiShares.map((share) => ({
  category: share.category,
  date: share.date,
  dateLabel: share.dateLabel,
  readingTime: share.readingTime,
  title: share.title,
  excerpt: share.excerpt,
  tags: share.tags,
  shareNote: share.shareNote,
  to: `${aiShareBasePath}/${share.slug}`
}))

export function getAiShareBySlug(slug) {
  return aiShares.find((entry) => entry.slug === slug) || null
}
