<template>
  <div class="ce-app" @click="closeFloatingMenus">
    <header class="ce-header" @click.stop>
      <div class="ce-tool-group">
        <button
          v-for="tool in tools"
          :key="tool.id"
          type="button"
          class="ce-icon-button ce-tool-button"
          :class="{ active: activeTool === tool.id }"
          :title="tool.label"
          :draggable="activeTool === 'default' && tool.draggable"
          @click="switchTool(tool.id)"
          @dragstart="startToolDrag($event, tool.id)"
          @dragend="switchTool('default')"
        >
          <component :is="tool.icon" :size="18" :stroke-width="1.7" />
        </button>
      </div>

      <div class="ce-header-actions">
        <div class="ce-history-actions">
          <button type="button" class="ce-icon-button ce-history-button" title="撤销" :disabled="!canUndo" @click="undo">
            <Undo2 :size="15" />
          </button>
          <button type="button" class="ce-icon-button ce-history-button" title="重做" :disabled="!canRedo" @click="redo">
            <Redo2 :size="15" />
          </button>
        </div>

        <div class="ce-dropdown">
          <button type="button" class="ce-dropdown-trigger" @click="toggleMenu('operation')">
            操作 <ChevronDown :size="13" />
          </button>
          <div v-if="openMenu === 'operation'" class="ce-dropdown-menu">
            <button type="button" @click="openPreview">预览</button>
            <button type="button" @click="openResizeModal">画布大小</button>
            <button type="button" @click="addPage">新增一页</button>
            <button type="button" @click="importInput?.click()">导入JSON</button>
          </div>
        </div>

        <div class="ce-dropdown">
          <button type="button" class="ce-dropdown-trigger" @click="toggleMenu('export')">
            导出 <ChevronDown :size="13" />
          </button>
          <div v-if="openMenu === 'export'" class="ce-dropdown-menu ce-export-menu">
            <button type="button" @click="exportPdf(1)">PDF</button>
            <button type="button" @click="exportJson">JSON</button>
            <button type="button" @click="exportPdf(2)">PDF(高清)</button>
          </div>
        </div>

        <a class="ce-github" href="https://github.com/WindRunnerMax/CanvasEditor" target="_blank" rel="noreferrer" title="GitHub">
          <Github :size="21" />
        </a>
      </div>
    </header>

    <main class="ce-body">
      <aside class="ce-left-panel">
        <div class="ce-tabs" role="tablist">
          <button type="button" :class="{ active: leftTab === 'template' }" @click="leftTab = 'template'">模板</button>
          <button type="button" :class="{ active: leftTab === 'structure' }" @click="leftTab = 'structure'">结构</button>
        </div>

        <div v-if="leftTab === 'template'" class="ce-template-panel">
          <button v-for="item in TEMPLATE_CONFIG" :key="item.id" type="button" class="ce-template-item" @click="pendingTemplate = item">
            <span class="ce-template-image-frame"><img :src="item.image" :alt="item.name" /></span>
            <span class="ce-template-name">{{ item.name }}</span>
          </button>
        </div>

        <div v-else class="ce-structure-panel">
          <div v-for="node in structureNodes" :key="node.id" class="ce-structure-item" :class="{ active: selectedIds.includes(node.id) }">
            <button type="button" class="ce-structure-title" @click="selectNode(node.id)">
              <component :is="structureIcon(node.key)" :size="14" />
              <span>{{ node.id }}</span>
            </button>
            <button type="button" class="ce-structure-remove" @click="deleteNode(node.id)"><X :size="13" /></button>
          </div>
        </div>
      </aside>

      <div ref="canvasHost" class="ce-canvas-host"></div>

      <aside class="ce-right-panel" :class="{ collapsed: panelCollapsed }" @click.stop>
        <button type="button" class="ce-panel-collapse" :title="panelCollapsed ? '展开属性面板' : '收起属性面板'" @click="panelCollapsed = !panelCollapsed">
          <Plus :size="15" />
        </button>

        <div class="ce-panel-scroll">
          <div v-if="selectionPosition" class="ce-coordinate-preview">
            <span class="ce-coordinate-box"></span>
            <span class="ce-coordinate ce-lt">{{ selectionPosition.lt }}</span>
            <span class="ce-coordinate ce-rt">{{ selectionPosition.rt }}</span>
            <span class="ce-coordinate ce-lb">{{ selectionPosition.lb }}</span>
            <span class="ce-coordinate ce-rb">{{ selectionPosition.rb }}</span>
          </div>

          <div v-if="selectedIds.length === 0" class="ce-empty-property">请选择图形</div>

          <template v-else-if="selectedState?.key === 'rect'">
            <div class="ce-property-title">边框</div>
            <label class="ce-property-row">
              <span>颜色</span>
              <input v-model="property.borderColor" type="color" @change="setAttribute(RECT_ATTRS.BORDER_COLOR, property.borderColor)" />
            </label>
            <label class="ce-property-row">
              <span>宽度</span>
              <input v-model.number="property.borderWidth" class="ce-number-input" type="number" min="1" max="10" @change="setAttribute(RECT_ATTRS.BORDER_WIDTH, property.borderWidth)" />
            </label>
            <div class="ce-property-row ce-check-row">
              <span>状态</span>
              <div>
                <label v-for="side in sideOptions" :key="side.key">
                  <input v-model="property.sides[side.key]" type="checkbox" @change="setSide(side.key, property.sides[side.key])" /> {{ side.label }}
                </label>
              </div>
            </div>
            <div class="ce-property-title">背景</div>
            <label class="ce-property-row">
              <span>颜色</span>
              <input v-model="property.fillColor" type="color" @change="setAttribute(RECT_ATTRS.FILL_COLOR, property.fillColor)" />
            </label>
          </template>

          <template v-else-if="selectedState?.key === 'image'">
            <div class="ce-property-title">边框</div>
            <label class="ce-property-row">
              <span>颜色</span>
              <input v-model="property.borderColor" type="color" @change="setAttribute(RECT_ATTRS.BORDER_COLOR, property.borderColor)" />
            </label>
            <label class="ce-property-row">
              <span>宽度</span>
              <input v-model.number="property.borderWidth" class="ce-number-input" type="number" min="0" max="10" @change="setAttribute(RECT_ATTRS.BORDER_WIDTH, property.borderWidth)" />
            </label>
            <div class="ce-property-title">图像</div>
            <div class="ce-property-row">
              <span>图片</span>
              <button type="button" class="ce-upload-link" @click="imageInput?.click()">上传图片</button>
            </div>
            <div class="ce-property-row ce-mode-row">
              <span>模式</span>
              <div>
                <label v-for="mode in imageModes" :key="mode">
                  <input v-model="property.imageMode" type="radio" :value="mode" @change="setAttribute(IMAGE_ATTRS.MODE, mode)" /> {{ mode }}
                </label>
              </div>
            </div>
          </template>

          <template v-else-if="selectedState?.key === 'text'">
            <div class="ce-property-title ce-rich-title">
              <span>富文本</span>
              <button type="button" title="放大编辑" @click="richModalVisible = true"><ExternalLink :size="14" /></button>
            </div>
            <div :key="selectedState.id" class="ce-rich-editor" contenteditable="true" spellcheck="false" @input="onRichInput" @blur="saveRichText" v-html="richTextHtml"></div>
          </template>

          <div v-else-if="selectedIds.length > 1" class="ce-multiple-property">已选择 {{ selectedIds.length }} 个图形</div>
        </div>
      </aside>

      <div class="ce-page-nav" @click.stop>
        <button type="button" :disabled="currentPage === 0" title="上一页" @click="jumpToPage(currentPage - 1)">‹</button>
        <span>第 {{ currentPage + 1 }} / {{ pageCount }} 页</span>
        <button type="button" :disabled="currentPage >= pageCount - 1" title="下一页" @click="jumpToPage(currentPage + 1)">›</button>
        <button type="button" class="ce-add-page" @click="addPage"><Plus :size="13" /> 新增一页</button>
      </div>
    </main>

    <div v-if="contextMenu.visible" class="ce-context-menu" :style="{ top: `${contextMenu.top}px`, left: `${contextMenu.left}px` }" @click.stop>
      <button v-if="selectedIds.length" type="button" @click="copySelection"><span>复制</span><kbd>Ctrl+C</kbd></button>
      <button type="button" @click="pasteHint"><span>粘贴</span><kbd>Ctrl+V</kbd></button>
      <button type="button" @click="selectAll"><span>全选</span><kbd>Ctrl+A</kbd></button>
      <div v-if="selectedIds.length" class="ce-context-divider"></div>
      <button v-if="selectedIds.length" type="button" @click="changeLayer(1)">上移一层</button>
      <button v-if="selectedIds.length" type="button" @click="changeLayer(-1)">下移一层</button>
    </div>

    <div v-if="pendingTemplate" class="ce-modal-mask" @mousedown.self="pendingTemplate = null">
      <section class="ce-modal ce-warning-modal">
        <h3>警告</h3>
        <p>确定要加载模板吗，当前的数据将会被覆盖。</p>
        <div class="ce-modal-actions">
          <button type="button" @click="pendingTemplate = null">取消</button>
          <button type="button" class="primary" :disabled="templateLoading" @click="confirmTemplate">{{ templateLoading ? '加载中...' : '确定' }}</button>
        </div>
      </section>
    </div>

    <div v-if="resizeModalVisible" class="ce-modal-mask" @mousedown.self="resizeModalVisible = false">
      <section class="ce-modal ce-resize-modal">
        <h3>调整画布大小</h3>
        <div class="ce-resize-content">
          <span>宽(width) x 高(height):</span>
          <input v-model.number="resizeForm.width" type="number" min="600" max="2000" />
          <input v-model.number="resizeForm.height" type="number" min="1000" max="4000" />
        </div>
        <div class="ce-modal-actions">
          <button type="button" @click="resizeModalVisible = false">取消</button>
          <button type="button" class="primary" @click="applyCanvasSize">确定</button>
        </div>
      </section>
    </div>

    <div v-if="richModalVisible" class="ce-modal-mask" @mousedown.self="richModalVisible = false">
      <section class="ce-modal ce-rich-modal">
        <button type="button" class="ce-rich-modal-close" @click="richModalVisible = false"><X :size="16" /></button>
        <h3>富文本</h3>
        <textarea v-model="richTextValue" autofocus @input="saveRichText"></textarea>
      </section>
    </div>

    <input ref="importInput" class="ce-hidden-input" type="file" accept="application/json,.json" @change="importJson" />
    <input ref="imageInput" class="ce-hidden-input" type="file" accept="image/*" @change="uploadImage" />
    <div v-if="toast" class="ce-toast">{{ toast }}</div>
  </div>
</template>

<script setup>
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ChevronDown, ExternalLink, Github, Hand, Image as ImageIcon, MousePointer2, Plus, Redo2, Square, Type, Undo2, X } from 'lucide-vue-next'
import { DRAG_KEY, EDITOR_EVENT, Range } from 'sketching-core'
import { DeltaSet, Op, OP_TYPE } from 'sketching-delta'
import { DEFAULT_BORDER_COLOR, DEFAULT_BORDER_WIDTH, DEFAULT_FILL_COLOR, FALSY, IMAGE_ATTRS, IMAGE_MODE, RECT_ATTRS, TEXT_ATTRS, TRULY, isTruly } from 'sketching-plugin'
import { ROOT_DELTA, TSON } from 'sketching-utils'
import { CanvasBackground, TEMPLATE_CONFIG, createOfficialEditor, loadOfficialTemplate, loadStoredDocument, plainToRichText, renderDocumentPages, richTextToHtml, richTextToPlain, saveStoredDocument } from './officialCanvas.js'

const DEFAULT_IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f2f3f5"/><path fill="#bbb" d="M64 96h384v320H64z"/><path fill="#fff" d="m104 360 96-112 62 70 52-54 94 96z"/><circle cx="164" cy="176" r="38" fill="#fff"/></svg>')}`

const tools = [
  { id: 'default', label: '选择', icon: markRaw(MousePointer2) },
  { id: 'grab', label: '抓取', icon: markRaw(Hand) },
  { id: 'rect', label: '矩形', icon: markRaw(Square), draggable: true },
  { id: 'image', label: '图像', icon: markRaw(ImageIcon), draggable: true },
  { id: 'text', label: '文本', icon: markRaw(Type), draggable: true }
]
const sideOptions = [
  { key: RECT_ATTRS.T, label: 'T' }, { key: RECT_ATTRS.L, label: 'L' },
  { key: RECT_ATTRS.R, label: 'R' }, { key: RECT_ATTRS.B, label: 'B' }
]
const imageModes = [IMAGE_MODE.FILL, IMAGE_MODE.COVER, IMAGE_MODE.CONTAIN]

const canvasHost = ref(null)
const importInput = ref(null)
const imageInput = ref(null)
const activeTool = ref('default')
const leftTab = ref('template')
const panelCollapsed = ref(false)
const openMenu = ref('')
const canUndo = ref(false)
const canRedo = ref(false)
const pageCount = ref(1)
const currentPage = ref(0)
const selectedIds = ref([])
const selectedState = ref(null)
const selectionRange = ref(null)
const structureNodes = ref([])
const pendingTemplate = ref(null)
const templateLoading = ref(false)
const resizeModalVisible = ref(false)
const richModalVisible = ref(false)
const richTextValue = ref('')
const richTextHtml = ref('')
const toast = ref('')
const contextMenu = reactive({ visible: false, top: 0, left: 0 })
const resizeForm = reactive({ width: 794, height: 1123 })
const property = reactive({
  borderColor: DEFAULT_BORDER_COLOR,
  borderWidth: Number(DEFAULT_BORDER_WIDTH),
  fillColor: DEFAULT_FILL_COLOR,
  imageMode: IMAGE_MODE.FILL,
  sides: { [RECT_ATTRS.T]: false, [RECT_ATTRS.L]: false, [RECT_ATTRS.R]: false, [RECT_ATTRS.B]: false }
})

let editor = null
let background = null
let toastTimer = null
const listeners = {}

const selectionPosition = computed(() => {
  if (!selectionRange.value || !background?.rect) return null
  const { x, y, width, height } = selectionRange.value
  const pageIndex = background.getPageIndexForY(y + height / 2)
  const offset = background.getPageRect(pageIndex)
  const format = value => Math.round(value * 10) / 10
  const point = (px, py) => `[${format(px)},${format(py)}]`
  return {
    lt: point(x - offset.x, y - offset.y), rt: point(x + width - offset.x, y - offset.y),
    lb: point(x - offset.x, y + height - offset.y), rb: point(x + width - offset.x, y + height - offset.y)
  }
})

function toggleMenu(name) {
  contextMenu.visible = false
  openMenu.value = openMenu.value === name ? '' : name
}
function closeFloatingMenus() { openMenu.value = ''; contextMenu.visible = false }
function showToast(message) {
  toast.value = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value = '' }, 1800)
}

function switchTool(tool) {
  if (!editor || tool === activeTool.value) return
  editor.canvas.grab.close()
  editor.canvas.insert.close()
  if (tool === 'grab') editor.canvas.grab.start()
  if (tool === 'rect') editor.canvas.insert.start(createInsertDelta('rect'))
  if (tool === 'image') editor.canvas.insert.start(createInsertDelta('image'))
  if (tool === 'text') editor.canvas.insert.start(createInsertDelta('text'))
  activeTool.value = tool
}

function jumpToPage(index) {
  if (!editor || !background) return
  const page = Math.max(0, Math.min(background.pageCount - 1, Number(index) || 0))
  const step = background.rect.height + background.pageGap
  const targetOffsetY = page * step
  const { offsetY } = editor.canvas.getRect()
  editor.canvas.grab.translateImmediately(0, targetOffsetY - offsetY)
  currentPage.value = page
}

function addPage() {
  if (!editor || !background) return
  background.addPage()
  pageCount.value = background.pageCount
  saveStoredDocument(editor, background)
  openMenu.value = ''
  nextTick(() => jumpToPage(background.pageCount - 1))
  showToast(`已新增第 ${background.pageCount} 页`)
}

function createInsertDelta(key, drag = false) {
  const base = { key, x: 0, y: 0, width: drag ? 100 : 0, height: drag ? (key === 'image' ? 100 : 50) : 0 }
  if (key === 'rect') base.attrs = { [RECT_ATTRS.BORDER_COLOR]: DEFAULT_BORDER_COLOR }
  if (key === 'image') base.attrs = {
    [IMAGE_ATTRS.SRC]: DEFAULT_IMAGE, [IMAGE_ATTRS.MODE]: IMAGE_MODE.COVER,
    [RECT_ATTRS.BORDER_WIDTH]: '1', [RECT_ATTRS.BORDER_COLOR]: '#DADADA'
  }
  return base
}

function startToolDrag(event, tool) {
  if (!event.dataTransfer || activeTool.value !== 'default' || !['rect', 'image', 'text'].includes(tool)) return
  event.dataTransfer.setData(DRAG_KEY, TSON.encode(createInsertDelta(tool, true)) || '')
}

function updateHistoryState() {
  if (!editor) return
  canUndo.value = editor.history.canUndo(); canRedo.value = editor.history.canRedo()
}
function updateStructure() {
  if (!editor) return
  structureNodes.value = [...editor.state.getDeltasMap().values()].filter(node => node.id !== ROOT_DELTA).map(node => ({ id: node.id, key: node.key }))
}
function syncSelection(event) {
  if (!editor) return
  selectedIds.value = [...editor.selection.getActiveDeltaIds()]
  const current = event?.current || editor.selection.get()
  selectionRange.value = current ? current.rect() : null
  if (selectionRange.value) {
    currentPage.value = background.getPageIndexForY(selectionRange.value.y + selectionRange.value.height / 2)
  }
  const id = selectedIds.value.length === 1 ? selectedIds.value[0] : null
  selectedState.value = id ? editor.state.getDeltaState(id) : null
  syncPropertyForm()
}
function syncPropertyForm() {
  const state = selectedState.value
  if (!state) return
  property.borderColor = normalizeHex(state.getAttr(RECT_ATTRS.BORDER_COLOR), DEFAULT_BORDER_COLOR)
  property.borderWidth = Number(state.getAttr(RECT_ATTRS.BORDER_WIDTH) || DEFAULT_BORDER_WIDTH)
  property.fillColor = normalizeHex(state.getAttr(RECT_ATTRS.FILL_COLOR), DEFAULT_FILL_COLOR)
  property.imageMode = state.getAttr(IMAGE_ATTRS.MODE) || IMAGE_MODE.FILL
  for (const item of sideOptions) property.sides[item.key] = isTruly(state.getAttr(item.key))
  if (state.key === 'text') {
    richTextValue.value = richTextToPlain(state)
    richTextHtml.value = richTextToHtml(state)
  }
}
function normalizeHex(value, fallback) {
  const text = String(value || fallback || '#000000')
  if (/^#[0-9a-f]{6}$/i.test(text)) return text
  if (/^#[0-9a-f]{8}$/i.test(text)) return text.slice(0, 7)
  const rgb = text.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!rgb) return fallback
  return `#${rgb.slice(1, 4).map(number => Number(number).toString(16).padStart(2, '0')).join('')}`
}

function setAttribute(key, value) {
  if (!editor || !selectedState.value) return
  editor.state.apply(Op.from(OP_TYPE.REVISE, { id: selectedState.value.id, attrs: { [key]: String(value) } }))
}
function setSide(key, checked) { setAttribute(key, checked ? TRULY : FALSY) }
function onRichInput(event) { richTextValue.value = event.currentTarget.innerText }
function saveRichText() { setAttribute(TEXT_ATTRS.DATA, plainToRichText(richTextValue.value)) }
function selectNode(id) { editor?.selection.setActiveDelta(id) }
function deleteNode(id) {
  if (!editor) return
  editor.state.apply(Op.from(OP_TYPE.DELETE, { id, parentId: editor.state.getDeltaStateParentId(id) }))
}
function structureIcon(key) { return key === 'image' ? ImageIcon : key === 'text' ? Type : Square }
function undo() { editor?.history.undo(); nextTick(updateHistoryState) }
function redo() { editor?.history.redo(); nextTick(updateHistoryState) }

async function confirmTemplate() {
  if (!pendingTemplate.value || !editor || templateLoading.value) return
  templateLoading.value = true
  try {
    applyDocument(await loadOfficialTemplate(pendingTemplate.value.template))
    pendingTemplate.value = null
    showToast('模板加载成功')
  } catch { showToast('模板加载失败') }
  finally { templateLoading.value = false }
}

function applyDocument(data) {
  if (!editor || !background || !data?.deltaSetLike) return
  background.setDocument(data)
  editor.state.setContent(new DeltaSet(data.deltaSetLike))
  editor.canvas.setOffset(0, 0)
  editor.canvas.reset()
  pageCount.value = background.pageCount
  currentPage.value = 0
  background.render()
  saveStoredDocument(editor, background)
  updateStructure(); syncSelection()
}

function openResizeModal() {
  if (!background?.rect) return
  resizeForm.width = Math.round(background.rect.width); resizeForm.height = Math.round(background.rect.height)
  resizeModalVisible.value = true; openMenu.value = ''
}
function applyCanvasSize() {
  if (!background || !editor) return
  const width = Math.min(2000, Math.max(600, Number(resizeForm.width) || 794))
  const height = Math.min(4000, Math.max(1000, Number(resizeForm.height) || 1123))
  const { x, y } = background.rect
  background.setRange(Range.fromRect(x, y, width, height)); background.render(); saveStoredDocument(editor, background)
  jumpToPage(currentPage.value)
  resizeModalVisible.value = false
}

function downloadBlob(blob, name) {
  const href = URL.createObjectURL(blob); const anchor = document.createElement('a')
  anchor.href = href; anchor.download = name; anchor.click(); URL.revokeObjectURL(href)
}
function timestamp() {
  const now = new Date(); const pad = number => String(number).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}
function exportJson() {
  if (!editor || !background) return
  const data = saveStoredDocument(editor, background)
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }), `RESUME_${timestamp()}.json`)
  openMenu.value = ''
}
async function openPreview() {
  if (!editor || !background) return
  openMenu.value = ''
  const popup = window.open('', '_blank')
  if (!popup) return showToast('浏览器阻止了预览窗口')
  popup.document.write('<title>简历预览</title><style>html,body{margin:0;background:#e5e6eb;text-align:center}img{display:block;margin:20px auto;max-width:calc(100% - 40px);box-shadow:0 2px 12px #0002}</style><p>正在生成预览...</p>')
  const canvases = await renderDocumentPages(saveStoredDocument(editor, background), 1)
  popup.document.body.innerHTML = canvases
    .map((canvas, index) => `<img alt="简历第 ${index + 1} 页" src="${canvas.toDataURL('image/jpeg', 0.96)}">`)
    .join('')
}
async function exportPdf(scale) {
  if (!editor || !background) return
  openMenu.value = ''
  const popup = window.open('', '_blank')
  if (!popup) return showToast('浏览器阻止了导出窗口')
  const data = saveStoredDocument(editor, background)
  popup.document.write(`<title>导出 PDF</title><style>@page{size:${data.width}px ${data.height}px;margin:0}html,body{margin:0}.page{display:block;width:100%;break-after:page;page-break-after:always}.page:last-child{break-after:auto;page-break-after:auto}@media screen{body{background:#ddd}.page{max-width:${data.width}px;margin:0 auto 24px}}</style><p>正在生成...</p>`)
  const canvases = await renderDocumentPages(data, scale)
  popup.document.body.innerHTML = canvases
    .map((canvas, index) => `<img class="page" alt="resume page ${index + 1}" src="${canvas.toDataURL('image/jpeg', 0.98)}">`)
    .join('')
  popup.document.close(); popup.focus(); window.setTimeout(() => popup.print(), 350)
}

async function importJson(event) {
  const file = event.target.files?.[0]; event.target.value = ''
  if (!file) return
  try {
    const data = JSON.parse(await file.text())
    if (!data?.deltaSetLike || !data.width || !data.height) throw new Error('invalid')
    applyDocument(data); showToast('导入成功')
  } catch { showToast('JSON 文件格式不正确') }
}
function uploadImage(event) {
  const file = event.target.files?.[0]; event.target.value = ''
  if (!file) return
  const reader = new FileReader(); reader.onload = () => setAttribute(IMAGE_ATTRS.SRC, reader.result); reader.readAsDataURL(file)
}

function copySelection(event) {
  editor?.canvas.mask.focus(); document.execCommand('copy'); contextMenu.visible = false; event?.preventDefault?.()
}
function pasteHint() { contextMenu.visible = false; showToast('请使用快捷键 Ctrl+V 粘贴') }
function selectAll() { editor?.canvas.mask.focus(); editor?.selection.selectAll(); contextMenu.visible = false }
function changeLayer(step) {
  if (!editor) return
  for (const id of selectedIds.value) {
    const node = editor.state.getDeltaState(id)
    if (node) editor.state.apply(Op.from(OP_TYPE.REVISE, { id, attrs: {}, z: node.getZ() + step }))
  }
  editor.selection.clearActiveDeltas(); contextMenu.visible = false
}

function bindEditorEvents() {
  listeners.content = () => { updateHistoryState(); updateStructure(); syncSelection(); saveStoredDocument(editor, background) }
  listeners.selection = event => syncSelection(event)
  listeners.insert = event => { if (event.done) switchTool('default') }
  listeners.context = event => {
    selectedIds.value = [...editor.selection.getActiveDeltaIds()]
    contextMenu.visible = true; contextMenu.top = event.clientY + 1; contextMenu.left = event.clientX + 1
  }
  listeners.down = () => { contextMenu.visible = false }
  listeners.wheel = () => { contextMenu.visible = false }
  listeners.reset = () => {
    const { offsetY } = editor.canvas.getRect()
    currentPage.value = background.getPageIndexForOffset(offsetY)
  }
  listeners.click = event => { if (event.detail === 2 && selectedState.value?.key === 'text') richModalVisible.value = true }
  editor.event.on(EDITOR_EVENT.CONTENT_CHANGE, listeners.content)
  editor.event.on(EDITOR_EVENT.SELECTION_CHANGE, listeners.selection)
  editor.event.on(EDITOR_EVENT.INSERT_STATE, listeners.insert)
  editor.event.on(EDITOR_EVENT.CONTEXT_MENU, listeners.context)
  editor.event.on(EDITOR_EVENT.MOUSE_DOWN, listeners.down)
  editor.event.on(EDITOR_EVENT.MOUSE_WHEEL, listeners.wheel)
  editor.event.on(EDITOR_EVENT.CANVAS_RESET, listeners.reset)
  editor.event.on(EDITOR_EVENT.CLICK, listeners.click)
}
function unbindEditorEvents() {
  if (!editor) return
  editor.event.off(EDITOR_EVENT.CONTENT_CHANGE, listeners.content)
  editor.event.off(EDITOR_EVENT.SELECTION_CHANGE, listeners.selection)
  editor.event.off(EDITOR_EVENT.INSERT_STATE, listeners.insert)
  editor.event.off(EDITOR_EVENT.CONTEXT_MENU, listeners.context)
  editor.event.off(EDITOR_EVENT.MOUSE_DOWN, listeners.down)
  editor.event.off(EDITOR_EVENT.MOUSE_WHEEL, listeners.wheel)
  editor.event.off(EDITOR_EVENT.CANVAS_RESET, listeners.reset)
  editor.event.off(EDITOR_EVENT.CLICK, listeners.click)
}

onMounted(() => {
  const data = loadStoredDocument()
  background = new CanvasBackground(data); editor = createOfficialEditor(data)
  pageCount.value = background.pageCount
  editor.onMount(canvasHost.value); background.init(editor); window.editor = editor
  bindEditorEvents(); updateHistoryState(); updateStructure(); syncSelection()
})
onBeforeUnmount(() => {
  window.clearTimeout(toastTimer); unbindEditorEvents()
  if (editor && background) background.destroy(editor)
  editor?.destroy(); if (window.editor === editor) delete window.editor
  editor = null; background = null
})
</script>

<style scoped>
.ce-app {
  --ce-blue: #165dff; --ce-text-1: #1d2129; --ce-text-2: #4e5969; --ce-border-2: #e5e6eb;
  position: fixed; inset: 0; z-index: 1000; overflow: hidden; color: var(--ce-text-1); background: #fff;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px; user-select: none;
}
button, input, textarea { font: inherit; }
button { color: inherit; }
.ce-header { display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; height: 50px; padding: 0 10px; border-bottom: 1px solid var(--ce-border-2); background: #fff; }
.ce-tool-group, .ce-header-actions, .ce-history-actions { display: flex; align-items: center; }
.ce-icon-button { display: inline-flex; align-items: center; justify-content: center; border: 0; background: transparent; cursor: pointer; }
.ce-tool-button { width: 29px; height: 29px; margin-left: 10px; padding: 3px; border-radius: 3px; }
.ce-tool-button:hover { background: #f7f8fa; }
.ce-tool-button.active { background: #f2f3f5; }
.ce-header-actions { height: 100%; gap: 2px; }
.ce-history-actions { margin-right: 5px; }
.ce-history-button { width: 25px; height: 25px; padding: 3px; color: var(--ce-blue); }
.ce-history-button:disabled { color: #c9cdd4; cursor: not-allowed; }
.ce-dropdown { position: relative; }
.ce-dropdown-trigger { display: flex; align-items: center; gap: 2px; height: 26px; padding: 0 7px; border: 0; color: var(--ce-blue); background: transparent; font-size: 13px; cursor: pointer; }
.ce-dropdown-trigger:hover { background: #f2f3f5; }
.ce-dropdown-menu { position: absolute; top: 31px; right: 0; z-index: 30; min-width: 104px; padding: 4px 0; border: 1px solid var(--ce-border-2); border-radius: 4px; background: #fff; box-shadow: 0 4px 12px rgb(0 0 0 / 12%); }
.ce-dropdown-menu button { display: block; width: 100%; padding: 7px 12px; border: 0; background: transparent; text-align: left; font-size: 12px; cursor: pointer; }
.ce-dropdown-menu button:hover { background: #f2f3f5; }
.ce-export-menu { min-width: 110px; }
.ce-github { display: inline-flex; margin: 0 10px 0 5px; color: var(--ce-text-1); }
.ce-body { position: relative; display: flex; width: 100%; height: calc(100% - 50px); }
.ce-left-panel { flex-shrink: 0; width: 260px; border-right: 1px solid var(--ce-border-2); background: #fff; }
.ce-tabs { display: flex; height: 40px; border-bottom: 1px solid var(--ce-border-2); }
.ce-tabs button { position: relative; width: 60px; padding: 0; border: 0; color: var(--ce-text-2); background: transparent; cursor: pointer; }
.ce-tabs button.active { color: var(--ce-blue); }
.ce-tabs button.active::after { position: absolute; right: 15px; bottom: -1px; left: 15px; height: 2px; background: var(--ce-blue); content: ""; }
.ce-template-panel { display: grid; grid-template-columns: 1fr 1fr; align-content: start; max-height: calc(100% - 40px); padding: 0 10px 20px; overflow: auto; scrollbar-width: none; }
.ce-template-panel::-webkit-scrollbar, .ce-panel-scroll::-webkit-scrollbar, .ce-structure-panel::-webkit-scrollbar { display: none; }
.ce-template-item { display: grid; margin: 15px 15px 0; padding: 0; border: 0; background: transparent; cursor: pointer; }
.ce-template-image-frame { display: block; height: 130px; overflow: hidden; border: 3px solid var(--ce-border-2); }
.ce-template-item:hover .ce-template-image-frame { border-color: #bedaff; }
.ce-template-image-frame img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }
.ce-template-name { margin-top: 5px; color: var(--ce-text-2); font-size: 12px; }
.ce-structure-panel { max-height: calc(100% - 40px); padding: 10px; overflow-y: auto; scrollbar-width: none; }
.ce-structure-item { display: flex; align-items: center; justify-content: space-between; height: 34px; margin-bottom: 7px; border: 1px solid var(--ce-border-2); border-radius: 3px; }
.ce-structure-item.active { border-color: var(--ce-blue); }
.ce-structure-title { display: flex; flex: 1; align-items: center; gap: 8px; min-width: 0; height: 100%; padding: 0 8px; overflow: hidden; border: 0; background: transparent; cursor: pointer; }
.ce-structure-title span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.ce-structure-remove { display: inline-flex; padding: 5px 8px; border: 0; background: transparent; cursor: pointer; }
.ce-canvas-host { position: relative; flex-grow: 1; min-width: 0; height: 100%; overflow: hidden; isolation: isolate; background: #e5e6eb; }
.ce-page-nav { position: absolute; bottom: 14px; left: calc(50% + 130px); z-index: 12; display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 5px; border: 1px solid var(--ce-border-2); border-radius: 5px; background: rgb(255 255 255 / 94%); box-shadow: 0 2px 8px rgb(0 0 0 / 10%); transform: translateX(-50%); }
.ce-page-nav button { display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 7px; border: 0; border-radius: 3px; background: transparent; cursor: pointer; }
.ce-page-nav button:hover:not(:disabled) { background: #f2f3f5; }
.ce-page-nav button:disabled { color: #c9cdd4; cursor: not-allowed; }
.ce-page-nav span { min-width: 76px; color: var(--ce-text-2); text-align: center; font-size: 12px; }
.ce-page-nav .ce-add-page { gap: 3px; margin-left: 2px; color: var(--ce-blue); }
.ce-right-panel { position: absolute; top: 16px; right: 16px; bottom: 20px; z-index: 10; box-sizing: border-box; width: 300px; max-height: calc(100% - 60px); border-radius: 6px; transition: all 0.2s linear; }
.ce-panel-scroll { box-sizing: border-box; height: 100%; padding: 10px 15px; overflow-y: auto; border: 1px solid var(--ce-border-2); border-radius: 6px; background: #fff; scrollbar-width: none; }
.ce-panel-collapse { position: absolute; top: -10px; right: -10px; z-index: 2; display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: 1px solid var(--ce-border-2); border-radius: 50%; color: var(--ce-text-2); background: #fff; transform: rotate(45deg); cursor: pointer; transition: transform 0.1s linear; }
.ce-right-panel.collapsed { top: 16px; right: 16px; bottom: auto; width: 0; height: 0; }
.ce-right-panel.collapsed .ce-panel-scroll { padding: 0; overflow: hidden; border: 0; }
.ce-right-panel.collapsed .ce-panel-collapse { transform: rotate(0deg); }
.ce-coordinate-preview { position: relative; display: flex; height: 100px; }
.ce-coordinate-box { width: 100%; height: 70px; margin: 15px 80px; border: 1px solid #86909c; }
.ce-coordinate { position: absolute; color: var(--ce-text-2); font-size: 12px; white-space: nowrap; }
.ce-lt { top: 15px; right: 196px; } .ce-rt { top: 15px; left: 196px; } .ce-lb { right: 196px; bottom: 15px; } .ce-rb { bottom: 15px; left: 196px; }
.ce-empty-property, .ce-multiple-property { padding-top: 2px; }
.ce-property-title { display: flex; align-items: center; min-height: 34px; font-weight: 600; }
.ce-property-row { display: flex; align-items: center; justify-content: space-between; min-height: 34px; color: var(--ce-text-2); font-size: 13px; }
.ce-property-row input[type="color"] { width: 26px; height: 24px; padding: 2px; border: 1px solid var(--ce-border-2); border-radius: 3px; background: #fff; }
.ce-number-input, .ce-resize-content input { box-sizing: border-box; width: 80px; height: 26px; padding: 0 7px; border: 1px solid var(--ce-border-2); border-radius: 3px; outline: none; }
.ce-check-row > div { display: flex; gap: 7px; }
.ce-check-row label, .ce-mode-row label { display: flex; align-items: center; gap: 3px; }
.ce-mode-row { align-items: flex-start; padding-top: 8px; }
.ce-mode-row > div { display: grid; gap: 6px; }
.ce-upload-link { padding: 0; border: 0; color: var(--ce-blue); background: transparent; cursor: pointer; }
.ce-rich-title { justify-content: space-between; }
.ce-rich-title button { display: inline-flex; padding: 3px; border: 0; background: transparent; cursor: pointer; }
.ce-rich-editor { min-height: 220px; padding: 4px 0 20px; outline: none; line-height: 1.65; white-space: pre-wrap; user-select: text; }
:deep(.ce-rich-line) { min-height: 1.5em; }
:deep(.ce-rich-divider) { min-height: 0; margin: 2px 0 5px; border-bottom: 1px solid var(--ce-border-2); }
.ce-context-menu { position: fixed; z-index: 80; min-width: 170px; padding: 4px 0; border: 1px solid var(--ce-border-2); border-radius: 4px; background: #fff; box-shadow: 0 4px 12px rgb(0 0 0 / 15%); }
.ce-context-menu button { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 7px 12px; border: 0; background: transparent; text-align: left; font-size: 13px; cursor: pointer; }
.ce-context-menu button:hover { background: #f2f3f5; }
.ce-context-menu kbd { color: #86909c; font: 12px inherit; }
.ce-context-divider { height: 1px; margin: 3px 0; background: var(--ce-border-2); }
.ce-modal-mask { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: rgb(0 0 0 / 38%); }
.ce-modal { box-sizing: border-box; width: 420px; padding: 20px 24px; border-radius: 4px; background: #fff; box-shadow: 0 10px 30px rgb(0 0 0 / 18%); }
.ce-modal h3 { margin: 0 0 18px; font-size: 16px; }
.ce-modal p { margin: 0 0 24px; color: var(--ce-text-2); }
.ce-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
.ce-modal-actions button { min-width: 66px; height: 30px; border: 1px solid var(--ce-border-2); border-radius: 3px; background: #fff; cursor: pointer; }
.ce-modal-actions button.primary { border-color: var(--ce-blue); color: #fff; background: var(--ce-blue); }
.ce-resize-content { display: flex; align-items: center; gap: 10px; }
.ce-rich-modal { position: relative; width: min(900px, calc(100vw - 100px)); }
.ce-rich-modal textarea { box-sizing: border-box; width: 100%; height: min(520px, calc(100vh - 220px)); padding: 14px; border: 1px solid var(--ce-border-2); outline: none; resize: vertical; line-height: 1.7; }
.ce-rich-modal-close { position: absolute; top: 16px; right: 18px; display: inline-flex; padding: 3px; border: 0; background: transparent; cursor: pointer; }
.ce-hidden-input { display: none; }
.ce-toast { position: fixed; top: 68px; left: 50%; z-index: 160; padding: 8px 14px; border-radius: 4px; color: #fff; background: rgb(29 33 41 / 88%); transform: translateX(-50%); font-size: 13px; box-shadow: 0 4px 12px rgb(0 0 0 / 16%); }
@media (max-width: 900px) { .ce-left-panel { width: 220px; } .ce-template-item { margin-right: 8px; margin-left: 8px; } .ce-right-panel { width: 280px; } }
</style>
