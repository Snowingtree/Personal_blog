import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(__dirname, '..')
const sourceDirectory = resolve(projectRoot, 'src/assets/images/photo-wall')
const outputDirectory = resolve(projectRoot, 'public/photo-wall/generated')
const manifestPath = resolve(projectRoot, 'src/data/photoWallImages.generated.js')
const publicBasePath = '/photo-wall/generated'
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif'])
const targetWidths = [640, 960, 1440, 1920]
const placeholderWidth = 32

function toPosixPath(value) {
  return value.replace(/\\/g, '/')
}

function assertInside(parentDirectory, targetPath) {
  const parent = resolve(parentDirectory)
  const target = resolve(targetPath)
  const relativePath = relative(parent, target)

  if (relativePath.startsWith('..') || relativePath === '' || resolve(parent, relativePath) !== target) {
    throw new Error(`Refusing to write outside ${parent}: ${target}`)
  }
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      ...options
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk) => {
      stdout += chunk
    })

    child.stderr?.on('data', (chunk) => {
      stderr += chunk
    })

    child.on('error', rejectRun)
    child.on('close', (code) => {
      if (code === 0) {
        resolveRun({ stdout, stderr })
        return
      }

      rejectRun(new Error(`${command} exited with code ${code}\n${stderr || stdout}`.trim()))
    })
  })
}

async function probeImage(filePath) {
  const ffprobe = process.env.PHOTO_WALL_FFPROBE || 'ffprobe'
  const { stdout } = await run(ffprobe, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'json',
    filePath
  ])
  const payload = JSON.parse(stdout)
  const stream = payload.streams?.[0]
  const width = Number(stream?.width)
  const height = Number(stream?.height)

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`Unable to read image dimensions: ${filePath}`)
  }

  return { width, height }
}

async function convertToWebp(inputPath, outputPath, width, quality) {
  const ffmpeg = process.env.PHOTO_WALL_FFMPEG || 'ffmpeg'

  await run(ffmpeg, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    inputPath,
    '-vf',
    `scale=${width}:-2`,
    '-frames:v',
    '1',
    '-c:v',
    'libwebp',
    '-quality',
    String(quality),
    '-compression_level',
    '5',
    outputPath
  ])
}

function buildOutputSlug(index, sourceName, hash) {
  const asciiBase = basename(sourceName, extname(sourceName))
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  const prefix = asciiBase || `photo-${String(index + 1).padStart(2, '0')}`

  return `${prefix}-${hash}`
}

function buildManifestSource(items) {
  return [
    'const photoWallImages = ',
    JSON.stringify(items, null, 2),
    '\n\nexport default photoWallImages\n'
  ].join('')
}

async function main() {
  const outputRoot = resolve(projectRoot, 'public/photo-wall')
  assertInside(outputRoot, outputDirectory)
  await rm(outputDirectory, { recursive: true, force: true })
  await mkdir(outputDirectory, { recursive: true })
  await mkdir(resolve(projectRoot, 'src/data'), { recursive: true })

  const sourceEntries = await readdir(sourceDirectory, { withFileTypes: true })
  const sourceFiles = sourceEntries
    .filter((entry) => entry.isFile() && imageExtensions.has(extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'zh-CN', { numeric: true, sensitivity: 'base' }))

  const manifest = []

  for (const [index, sourceName] of sourceFiles.entries()) {
    const inputPath = resolve(sourceDirectory, sourceName)
    const sourceBuffer = await readFile(inputPath)
    const sourceHash = createHash('sha256').update(sourceBuffer).digest('hex').slice(0, 10)
    const slug = buildOutputSlug(index, sourceName, sourceHash)
    const dimensions = await probeImage(inputPath)
    const widths = [...new Set([...targetWidths.filter((width) => width < dimensions.width), dimensions.width])]
      .filter((width) => width <= Math.max(...targetWidths))
      .sort((left, right) => left - right)
    const variants = []

    for (const width of widths) {
      const outputName = `${slug}-${width}w.webp`
      const outputPath = join(outputDirectory, outputName)
      await convertToWebp(inputPath, outputPath, width, 82)
      const outputStat = await stat(outputPath)

      variants.push({
        width,
        src: `${publicBasePath}/${outputName}`,
        bytes: outputStat.size
      })
    }

    const placeholderName = `${slug}-${placeholderWidth}w.webp`
    const placeholderPath = join(outputDirectory, placeholderName)
    await convertToWebp(inputPath, placeholderPath, placeholderWidth, 44)

    manifest.push({
      id: basename(sourceName, extname(sourceName)),
      alt: basename(sourceName, extname(sourceName)),
      width: dimensions.width,
      height: dimensions.height,
      placeholder: `${publicBasePath}/${placeholderName}`,
      src: variants[Math.min(1, variants.length - 1)]?.src || variants[0]?.src || '',
      srcset: variants.map((variant) => `${variant.src} ${variant.width}w`).join(', '),
      variants
    })
  }

  await writeFile(manifestPath, buildManifestSource(manifest), 'utf8')

  const originalBytes = (
    await Promise.all(sourceFiles.map(async (name) => (await stat(resolve(sourceDirectory, name))).size))
  ).reduce((sum, size) => sum + size, 0)
  const generatedEntries = await readdir(outputDirectory, { withFileTypes: true })
  const generatedBytes = (
    await Promise.all(
      generatedEntries
        .filter((entry) => entry.isFile())
        .map(async (entry) => (await stat(resolve(outputDirectory, entry.name))).size)
    )
  ).reduce((sum, size) => sum + size, 0)

  console.log(
    `[photo-wall] generated ${manifest.length} images, ${generatedEntries.length} files, ` +
      `${Math.round(originalBytes / 1024)} KB original -> ${Math.round(generatedBytes / 1024)} KB webp`
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
