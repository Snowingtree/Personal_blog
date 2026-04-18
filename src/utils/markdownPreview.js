import MarkdownIt from 'markdown-it'

const FRONTMATTER_PATTERN = /^(?:\uFEFF)?(---|\+\+\+)\r?\n[\s\S]*?\r?\n\1\r?\n?/
const ARTICLE_EXCERPT_FIELD_PATTERN = /^abstract\s*[：:]\s*(.*)$/iu
const TASK_LIST_PATTERN = /^\[( |x|X)\]\s+/
const ZERO_WIDTH_MARK_PATTERN = /[\u200B-\u200D\u2060\uFEFF]/g
const HARD_SPACE_PATTERN = /[\u00A0\u202F]/g

function buildMarkdownHeadingId(index) {
  return `note-heading-${index}`
}

function normalizeMarkdownSource(markdown) {
  if (!markdown) {
    return ''
  }

  return String(markdown)
    .replace(/^\uFEFF/, '')
    .replace(FRONTMATTER_PATTERN, '')
    .replace(ZERO_WIDTH_MARK_PATTERN, '')
    .replace(HARD_SPACE_PATTERN, ' ')
}

function createMarkdownIt() {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: false
  })

  md.core.ruler.after('inline', 'note_task_list', (state) => {
    state.tokens.forEach((token, index) => {
      if (token.type !== 'inline' || !token.children?.length) {
        return
      }

      const match = token.content.match(TASK_LIST_PATTERN)
      const listItemToken = state.tokens[index - 2]
      const paragraphToken = state.tokens[index - 1]

      if (!match || listItemToken?.type !== 'list_item_open') {
        return
      }

      const checked = match[1].toLowerCase() === 'x'
      const firstTextToken = token.children.find((child) => child.type === 'text')

      token.content = token.content.replace(TASK_LIST_PATTERN, '')

      if (firstTextToken) {
        firstTextToken.content = firstTextToken.content.replace(TASK_LIST_PATTERN, '')
      }

      token.children = token.children.filter(
        (child, childIndex) => child.type !== 'text' || childIndex !== 0 || child.content
      )

      const checkboxToken = new state.Token('html_inline', '', 0)
      checkboxToken.content = `<input class="note-markdown__task-checkbox" type="checkbox"${
        checked ? ' checked' : ''
      } disabled aria-hidden="true">`

      token.children.unshift(checkboxToken)
      listItemToken.attrJoin('class', 'note-markdown__task-item')
      listItemToken.attrSet('data-task-checked', String(checked))

      if (paragraphToken?.type === 'paragraph_open') {
        paragraphToken.attrJoin('class', 'note-markdown__task-paragraph')
      }
    })
  })

  return md
}

function splitMarkdownArticleSource(markdown) {
  const source = normalizeMarkdownSource(markdown)

  if (!source) {
    return {
      excerpt: '',
      content: ''
    }
  }

  const lines = source.split(/\r?\n/)
  let lineIndex = 0

  while (lineIndex < lines.length && !lines[lineIndex].trim()) {
    lineIndex += 1
  }

  const firstLine = lines[lineIndex] || ''
  const excerptMatch = firstLine.match(ARTICLE_EXCERPT_FIELD_PATTERN)

  if (!excerptMatch) {
    return {
      excerpt: '',
      content: source
    }
  }

  const excerptLines = []
  const inlineExcerpt = excerptMatch[1]?.trim()

  if (inlineExcerpt) {
    excerptLines.push(inlineExcerpt)
  }

  lineIndex += 1

  while (lineIndex < lines.length) {
    const currentLine = lines[lineIndex]

    if (!currentLine.trim()) {
      lineIndex += 1
      break
    }

    excerptLines.push(currentLine.trim())
    lineIndex += 1
  }

  while (lineIndex < lines.length && !lines[lineIndex].trim()) {
    lineIndex += 1
  }

  return {
    excerpt: excerptLines.join(' ').trim(),
    content: lines.slice(lineIndex).join('\n').trimStart()
  }
}

function renderCodeBlock(md, content, language = '') {
  const normalizedLanguage = language ? md.utils.escapeHtml(language) : 'code'
  const className = language
    ? `note-markdown__code-block language-${md.utils.escapeHtml(language)}`
    : 'note-markdown__code-block'

  return [
    '<div class="note-markdown__code-shell">',
    '<div class="note-markdown__code-toolbar">',
    `<span class="note-markdown__code-lang">${normalizedLanguage}</span>`,
    '<button type="button" class="note-markdown__copy-button" data-note-copy aria-label="复制代码">复制</button>',
    '</div>',
    `<pre class="note-markdown__pre"><code class="${className}">${md.utils.escapeHtml(content)}</code></pre>`,
    '</div>'
  ].join('')
}

function createRenderer(resolveAssetUrl) {
  const md = createMarkdownIt()
  const defaultImageRule = md.renderer.rules.image
  const defaultLinkOpenRule = md.renderer.rules.link_open

  md.renderer.rules.image = (tokens, index, options, env, self) => {
    const token = tokens[index]
    const source = token.attrGet('src') || ''
    token.attrSet('src', resolveAssetUrl(source))
    token.attrSet('loading', 'lazy')
    return defaultImageRule
      ? defaultImageRule(tokens, index, options, env, self)
      : self.renderToken(tokens, index, options)
  }

  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const token = tokens[index]
    const href = token.attrGet('href') || ''

    if (href && !/^(?:[a-z]+:)?\/\//i.test(href) && !href.startsWith('#')) {
      token.attrSet('href', resolveAssetUrl(href))
    } else if (/^(?:[a-z]+:)?\/\//i.test(href)) {
      token.attrSet('target', '_blank')
      token.attrSet('rel', 'noreferrer')
    }

    return defaultLinkOpenRule
      ? defaultLinkOpenRule(tokens, index, options, env, self)
      : self.renderToken(tokens, index, options)
  }

  md.renderer.rules.heading_open = (tokens, index, options, env, self) => {
    const token = tokens[index]
    const headingPosition = tokens
      .slice(0, index + 1)
      .filter((currentToken) => currentToken.type === 'heading_open').length
    const headingId = buildMarkdownHeadingId(headingPosition)

    token.attrSet('id', headingId)
    token.attrSet('data-note-heading', headingId)

    return self.renderToken(tokens, index, options)
  }

  md.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index]
    const language = token.info ? token.info.trim().split(/\s+/g)[0] : ''
    return renderCodeBlock(md, token.content, language)
  }

  md.renderer.rules.code_block = (tokens, index) => {
    const token = tokens[index]
    return renderCodeBlock(md, token.content)
  }

  return md
}

function extractMarkdownHeadings(markdown) {
  const source = normalizeMarkdownSource(markdown)

  if (!source) {
    return []
  }

  const md = createMarkdownIt()
  const tokens = md.parse(source, {})
  const headings = []
  let headingIndex = 0

  tokens.forEach((token, index) => {
    if (token.type !== 'heading_open') {
      return
    }

    const inlineToken = tokens[index + 1]
    const level = Number(token.tag.replace('h', ''))
    const text = inlineToken?.content?.trim() || ''

    if (!text || !Number.isInteger(level)) {
      return
    }

    headingIndex += 1
    headings.push({
      id: buildMarkdownHeadingId(headingIndex),
      level,
      text
    })
  })

  return headings
}

function renderMarkdown(markdown, { resolveAssetUrl }) {
  const source = normalizeMarkdownSource(markdown)

  if (!source) {
    return ''
  }

  return createRenderer(resolveAssetUrl).render(source)
}

export {
  buildMarkdownHeadingId,
  extractMarkdownHeadings,
  normalizeMarkdownSource,
  renderMarkdown,
  splitMarkdownArticleSource
}
