import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentFilePath = fileURLToPath(import.meta.url)
const scriptsDir = dirname(currentFilePath)
const projectRoot = resolve(scriptsDir, '..')
const sourceDir = resolve(
  process.env.XIAO_TU_XIAN_SOURCE_DIR || 'E:/web_code/小兔鲜/xiao_tu_xian'
)
const tempDir = resolve(projectRoot, '.tmp_xiao_tu_xian_build')
const targetDir = resolve(projectRoot, 'public', 'xiao-tu-xian')
const tempNodeModulesPath = resolve(tempDir, 'node_modules')
const sourceNodeModulesPath = resolve(sourceDir, 'node_modules')

function ensureDirectory(pathname) {
  mkdirSync(pathname, { recursive: true })
}

function cleanDirectory(pathname) {
  rmSync(pathname, { recursive: true, force: true })
}

function assertExists(pathname, label) {
  if (!existsSync(pathname)) {
    throw new Error(`${label} not found: ${pathname}`)
  }
}

function shouldCopy(pathname) {
  const relativePath = relative(sourceDir, pathname)

  if (!relativePath) {
    return true
  }

  const topLevelName = relativePath.split(/[\\/]/)[0]

  return !['.git', '.vscode', 'dist', 'node_modules'].includes(topLevelName)
}

function replaceOnce(content, searchValue, replacementValue, label) {
  if (!content.includes(searchValue)) {
    throw new Error(`Failed to patch ${label}.`)
  }

  return content.replace(searchValue, replacementValue)
}

function patchTempProject() {
  const viteConfigPath = resolve(tempDir, 'vite.config.ts')
  const routerPath = resolve(tempDir, 'src', 'router', 'index.ts')
  const httpPath = resolve(tempDir, 'src', 'utils', 'http.ts')

  let viteConfig = readFileSync(viteConfigPath, 'utf8')
  if (!viteConfig.includes("base: '/xiao-tu-xian/'")) {
    viteConfig = replaceOnce(
      viteConfig,
      'export default defineConfig({',
      "export default defineConfig({\n    base: '/xiao-tu-xian/',",
      'vite base'
    )
    writeFileSync(viteConfigPath, viteConfig, 'utf8')
  }

  let routerFile = readFileSync(routerPath, 'utf8')
  routerFile = routerFile.replace(
    /history\s*:\s*createWebHistory\(\s*\)/,
    'history:createWebHistory(import.meta.env.BASE_URL)'
  )
  routerFile = routerFile.replace(
    /\nimport component from "element-plus\/es\/components\/tree-select\/src\/tree-select-option\.mjs"/,
    ''
  )
  writeFileSync(routerPath, routerFile, 'utf8')

  let httpFile = readFileSync(httpPath, 'utf8')
  if (!httpFile.includes('defaultApiBaseUrl')) {
    const nextHttpFile = httpFile.replace(
      /\/\/\s*这是真实的请求\s*[\r\n]+const myAxios = axios\.create\(\{\s*[\r\n]+ {4}baseURL:\s*"http:\/\/pcapi-xiaotuxian-front-devtest\.itheima\.net",/,
      `// 这是真实的请求
const defaultApiBaseUrl = "http://pcapi-xiaotuxian-front-devtest.itheima.net"
const apiBaseUrl = import.meta.env.VITE_XTX_API_BASE_URL || defaultApiBaseUrl

const myAxios = axios.create({
    baseURL:apiBaseUrl,`,
    )

    if (nextHttpFile === httpFile) {
      throw new Error('Failed to patch http base url.')
    }

    writeFileSync(httpPath, nextHttpFile, 'utf8')
  }
}

function buildTempProject() {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(command, ['run', 'build'], {
    cwd: tempDir,
    stdio: 'inherit',
    env: process.env
  })

  if (result.status !== 0) {
    throw new Error(`xiao_tu_xian build failed with exit code ${result.status ?? 'unknown'}.`)
  }
}

function syncBuildOutput() {
  const tempDistDir = resolve(tempDir, 'dist')
  const tempIndexPath = resolve(tempDistDir, 'index.html')

  assertExists(tempDistDir, 'Built dist directory')
  assertExists(tempIndexPath, 'Built index.html')

  cleanDirectory(targetDir)
  ensureDirectory(targetDir)
  cpSync(tempDistDir, targetDir, { recursive: true })
  copyFileSync(tempIndexPath, join(targetDir, '404.html'))
}

function main() {
  assertExists(sourceDir, 'Source project')
  assertExists(sourceNodeModulesPath, 'Source node_modules')

  cleanDirectory(tempDir)
  ensureDirectory(tempDir)
  cpSync(sourceDir, tempDir, {
    recursive: true,
    filter: shouldCopy
  })
  symlinkSync(sourceNodeModulesPath, tempNodeModulesPath, 'junction')

  patchTempProject()
  buildTempProject()
  syncBuildOutput()
  cleanDirectory(tempDir)

  console.log(`xiao_tu_xian synced to ${targetDir}`)
}

main()
