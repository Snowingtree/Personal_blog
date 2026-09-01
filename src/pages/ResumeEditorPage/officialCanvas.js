import { EDITOR_EVENT, Editor, LOG_LEVEL, Range } from 'sketching-core'
import { DeltaSet } from 'sketching-delta'
import {
  Image as SketchImage,
  Rect,
  Text,
  TEXT_ATTRS
} from 'sketching-plugin'

DeltaSet.register(Rect)
DeltaSet.register(Text)
DeltaSet.register(SketchImage)

export const STORAGE_KEY = '__sketching-storage'
export const PAGE_OFFSET = { x: 160, y: 30 }
export const PAGE_GAP = 30

export const TEMPLATE_CONFIG = [
  { id: 'Czy', name: 'FE-Czy' },
  { id: 'Hty', name: 'FE-Hty' },
  { id: 'Lbz', name: 'FE-Lbz' },
  { id: 'Lmz', name: 'BE-Lmz' },
  { id: 'Wxy', name: 'FE-Wxy' },
  { id: 'Lch', name: 'SEC-Lch' }
].map(item => ({
  ...item,
  image: `/resume-editor/template/${item.id}/index.jpeg`,
  template: `/resume-editor/template/${item.id}/index.json`
}))

export const EXAMPLE = {
  x: PAGE_OFFSET.x,
  y: PAGE_OFFSET.y,
  width: 793.7007874015749,
  height: 1122.4818897637797,
  pageCount: 1,
  pageGap: PAGE_GAP,
  deltaSetLike: {
    ROOT: {
      x: -999999,
      y: -999999,
      z: 0,
      id: 'ROOT',
      key: 'entry',
      width: 0,
      height: 0,
      attrs: {},
      children: ['ltfRU5Rmpi', 'MAhBg3wRaK']
    },
    ltfRU5Rmpi: {
      x: 417.5,
      y: 387,
      z: 0,
      id: 'ltfRU5Rmpi',
      key: 'rect',
      width: 278,
      height: 14,
      attrs: {
        L: 'false',
        R: 'false',
        T: 'false',
        B: 'true',
        'border-color': '#020202B8'
      },
      children: []
    },
    MAhBg3wRaK: {
      x: 460.5,
      y: 352,
      z: 0,
      id: 'MAhBg3wRaK',
      key: 'text',
      width: 192,
      height: 38,
      attrs: {
        DATA: '[{"chars":[{"char":"基","config":{"WEIGHT":"bold"}},{"char":"于","config":{"WEIGHT":"bold"}},{"char":"C","config":{"WEIGHT":"bold"}},{"char":"a","config":{"WEIGHT":"bold"}},{"char":"n","config":{"WEIGHT":"bold"}},{"char":"v","config":{"WEIGHT":"bold"}},{"char":"a","config":{"WEIGHT":"bold"}},{"char":"s","config":{"WEIGHT":"bold"}},{"char":"实","config":{"WEIGHT":"bold"}},{"char":"现","config":{"WEIGHT":"bold"}},{"char":"的","config":{"WEIGHT":"bold"}},{"char":"简","config":{"WEIGHT":"bold"}},{"char":"历","config":{"WEIGHT":"bold"}},{"char":"编","config":{"WEIGHT":"bold"}},{"char":"辑","config":{"WEIGHT":"bold"}},{"char":"器","config":{"WEIGHT":"bold"}}],"config":{}}]',
        ORIGIN_DATA: '[{"children":[{"text":"基于Canvas实现的简历编辑器","bold":true}]}]'
      },
      children: []
    }
  }
}

export class CanvasBackground {
  constructor(data = EXAMPLE) {
    this.range = null
    this.rect = null
    this.canvas = null
    this.ctx = null
    this.pageCount = 1
    this.pageGap = PAGE_GAP
    this.offsetX = 0
    this.offsetY = 0
    this.onReset = this.onReset.bind(this)
    this.setDocument(data)
  }

  init(editor) {
    const dom = editor.getContainer()
    dom.style.position = 'relative'
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')
    this.canvas.style.background = '#e5e6eb'
    this.canvas.style.position = 'absolute'
    this.canvas.style.zIndex = '-1'
    this.setRect(dom.offsetWidth, dom.offsetHeight)
    dom.insertBefore(this.canvas, dom.firstChild)
    this.render()
    editor.event.on(EDITOR_EVENT.CANVAS_RESET, this.onReset)
  }

  setRect(width, height) {
    if (!this.canvas || !this.ctx) return
    const ratio = window.devicePixelRatio || 1
    this.canvas.width = width * ratio
    this.canvas.height = height * ratio
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.ctx.setTransform(ratio, 0, 0, ratio, -this.offsetX * ratio, -this.offsetY * ratio)
  }

  setDocument(data) {
    this.pageCount = Math.max(1, Math.floor(Number(data.pageCount) || 1))
    this.pageGap = Math.max(0, Number(data.pageGap) || PAGE_GAP)
    this.setRange(Range.fromRect(data.x, data.y, data.width, data.height))
  }

  setRange(range) {
    const prevRect = range.rect()
    const next = Range.fromRect(
      prevRect.x,
      prevRect.y,
      Math.ceil(prevRect.width),
      Math.ceil(prevRect.height)
    )
    this.range = next
    this.rect = next.rect()
  }

  addPage() {
    this.pageCount += 1
    this.render()
    return this.getPageRect(this.pageCount - 1)
  }

  getPageRect(index) {
    const page = Math.max(0, Math.min(this.pageCount - 1, Math.floor(index)))
    return {
      x: this.rect.x,
      y: this.rect.y + page * (this.rect.height + this.pageGap),
      width: this.rect.width,
      height: this.rect.height
    }
  }

  getPageIndexForY(y) {
    const step = this.rect.height + this.pageGap
    const relative = Number(y) - this.rect.y
    return Math.max(0, Math.min(this.pageCount - 1, Math.floor((relative + this.pageGap / 2) / step)))
  }

  getPageIndexForOffset(offsetY) {
    const step = this.rect.height + this.pageGap
    return Math.max(0, Math.min(this.pageCount - 1, Math.round(Math.max(0, offsetY) / step)))
  }

  render() {
    if (!this.ctx || !this.canvas || !this.range) return
    const ratio = window.devicePixelRatio || 1
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.setTransform(ratio, 0, 0, ratio, -this.offsetX * ratio, -this.offsetY * ratio)
    this.ctx.fillStyle = '#fff'
    for (let index = 0; index < this.pageCount; index += 1) {
      const rect = this.getPageRect(index)
      this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    }
  }

  onReset(event) {
    const { range, offsetX, offsetY } = event
    if (!range || !this.ctx) return
    this.offsetX = offsetX
    this.offsetY = offsetY
    const { width, height } = range.rect()
    this.setRect(width, height)
    this.render()
  }

  destroy(editor) {
    editor.event.off(EDITOR_EVENT.CANVAS_RESET, this.onReset)
    this.canvas?.remove()
  }
}

export function loadStoredDocument() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value ? JSON.parse(value) : structuredClone(EXAMPLE)
  } catch {
    return structuredClone(EXAMPLE)
  }
}

export function saveStoredDocument(editor, background) {
  const data = {
    ...background.rect,
    pageCount: background.pageCount,
    pageGap: background.pageGap,
    deltaSetLike: editor.deltaSet.getDeltas()
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  return data
}

export function createOfficialEditor(data) {
  return new Editor({
    deltaSet: new DeltaSet(data.deltaSetLike),
    logLevel: LOG_LEVEL.INFO
  })
}

export async function loadOfficialTemplate(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Template request failed: ${response.status}`)
  return response.json()
}

export function richTextToPlain(state) {
  if (!state) return ''
  const raw = state.getAttr(TEXT_ATTRS.DATA)
  if (!raw) return ''
  try {
    const lines = JSON.parse(raw)
    return lines.map(line => (line.chars || []).map(item => item.char || '').join('')).join('\n')
  } catch {
    return ''
  }
}

export function richTextToHtml(state) {
  if (!state) return ''
  const raw = state.getAttr(TEXT_ATTRS.DATA)
  if (!raw) return ''
  try {
    const lines = JSON.parse(raw)
    return lines.map(line => {
      const lineConfig = line.config || {}
      if (String(lineConfig[TEXT_ATTRS.DIVIDING_LINE]) === 'true') {
        return '<div class="ce-rich-line ce-rich-divider"></div>'
      }
      const lineHeight = Number(lineConfig[TEXT_ATTRS.LINE_HEIGHT])
      const lineStyle = Number.isFinite(lineHeight) ? ` style="line-height:${Math.max(1, Math.min(3, lineHeight))}"` : ''
      const unordered = lineConfig[TEXT_ATTRS.UNORDERED_LIST_LEVEL] ? '• ' : ''
      const ordered = lineConfig[TEXT_ATTRS.ORDERED_LIST_LEVEL]
        ? `${Number(lineConfig[TEXT_ATTRS.ORDERED_LIST_START]) || 1}. `
        : ''
      const content = (line.chars || []).map(item => {
        const config = item.config || {}
        const styles = []
        if (config[TEXT_ATTRS.WEIGHT] === 'bold') styles.push('font-weight:700')
        if (config[TEXT_ATTRS.STYLE] === 'italic') styles.push('font-style:italic')
        const size = Number(config[TEXT_ATTRS.SIZE])
        if (Number.isFinite(size)) styles.push(`font-size:${Math.max(8, Math.min(72, size))}px`)
        const color = safeColor(config[TEXT_ATTRS.COLOR])
        const background = safeColor(config[TEXT_ATTRS.BACKGROUND])
        if (color) styles.push(`color:${color}`)
        if (background) styles.push(`background-color:${background}`)
        const decorations = []
        if (String(config[TEXT_ATTRS.UNDERLINE]) === 'true') decorations.push('underline')
        if (String(config[TEXT_ATTRS.STRIKE_THROUGH]) === 'true') decorations.push('line-through')
        if (decorations.length) styles.push(`text-decoration:${decorations.join(' ')}`)
        if (config[TEXT_ATTRS.LINK] && !color) styles.push('color:#165dff')
        const style = styles.length ? ` style="${styles.join(';')}"` : ''
        return `<span${style}>${escapeHtml(item.char || '')}</span>`
      }).join('')
      return `<div class="ce-rich-line"${lineStyle}>${ordered}${unordered}${content || '<br>'}</div>`
    }).join('')
  } catch {
    return ''
  }
}

function safeColor(value) {
  const color = String(value || '').trim()
  return /^(#[0-9a-f]{3,8}|rgba?\([\d\s,.%]+\))$/i.test(color) ? color : ''
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function plainToRichText(value) {
  return JSON.stringify(
    String(value)
      .split('\n')
      .map(line => ({
        chars: Array.from(line).map(char => ({ char, config: {} })),
        config: {}
      }))
  )
}

export async function renderDocumentPages(data, scale = 1) {
  const pageCount = Math.max(1, Math.floor(Number(data.pageCount) || 1))
  const pageGap = Math.max(0, Number(data.pageGap) || PAGE_GAP)
  const canvases = []
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const deltaSet = new DeltaSet(data.deltaSetLike)
    const pageY = data.y + pageIndex * (data.height + pageGap)
    canvases.push(await renderPageCanvas(deltaSet, data, pageY, scale))
  }
  return canvases
}

async function renderPageCanvas(deltaSet, data, pageY, scale) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const ratio = Math.max(1, Math.ceil(window.devicePixelRatio || 1)) * scale
  canvas.width = Math.ceil(data.width * ratio)
  canvas.height = Math.ceil(data.height * ratio)
  ctx.scale(ratio, ratio)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, data.width, data.height)
  ctx.translate(-data.x, -pageY)
  const deltas = []
  deltaSet.forEach((_, delta) => deltas.push(delta))
  deltas.sort((a, b) => a.getZ() - b.getZ())
  const tasks = []
  for (const delta of deltas) {
    const task = delta.drawing(ctx)
    if (task) tasks.push(task)
  }
  const pending = await Promise.all(tasks)
  pending.forEach(delta => delta?.drawing(ctx))
  return canvas
}

export async function renderDocumentCanvas(data, scale = 1) {
  const [canvas] = await renderDocumentPages(data, scale)
  return canvas
}
