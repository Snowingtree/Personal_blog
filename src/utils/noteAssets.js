import MarkdownIt from 'markdown-it'
import {
  getAndroidCache,
  setAndroidCache
} from '../android/offlineCache'
import http from './http'
import {
  isAbsoluteUrl,
  isInlineAssetUrl,
  resolveRepoRelativePath
} from './noteRepo'

export const NOTE_ASSET_CACHE_BUCKET = 'notes-assets'

const markdownParser = new MarkdownIt({
  html: true,
  linkify: false,
  typographer: false
})

function isLocalNoteAsset(source) {
  return Boolean(source)
    && !isAbsoluteUrl(source)
    && !isInlineAssetUrl(source)
    && !source.startsWith('#')
}

function collectImageSourcesFromTokens(tokens, sources) {
  for (const token of tokens || []) {
    if (token.type === 'image') {
      const source = token.attrGet('src')

      if (source) {
        sources.add(source)
      }
    }

    if (Array.isArray(token.children)) {
      collectImageSourcesFromTokens(token.children, sources)
    }

    if (token.type === 'html_block' || token.type === 'html_inline') {
      const imagePattern = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi
      let match

      while ((match = imagePattern.exec(token.content || ''))) {
        const source = match[1] || match[2] || match[3]

        if (source) {
          sources.add(source)
        }
      }
    }
  }
}

export function extractNoteAssetPaths(markdown, currentFilePath) {
  const sources = new Set()
  collectImageSourcesFromTokens(markdownParser.parse(String(markdown || ''), {}), sources)

  return [...sources]
    .filter(isLocalNoteAsset)
    .map((source) => resolveRepoRelativePath(currentFilePath, source))
    .filter(Boolean)
}

async function requestNoteAssetBlob(assetPath) {
  const value = await http.get('/api/notes/asset', {
    params: { path: assetPath },
    responseType: 'blob'
  })

  if (!(value instanceof Blob) || value.size === 0) {
    throw new Error('笔记图片内容无效。')
  }

  return value
}

export async function loadNoteAssetBlob(
  assetPath,
  {
    useAndroidCache = import.meta.env.MODE === 'android',
    refresh = false,
    allowNetwork = import.meta.env.MODE !== 'android'
  } = {}
) {
  const normalizedPath = String(assetPath || '').trim()

  if (!normalizedPath) {
    throw new Error('笔记图片路径为空。')
  }

  let cachedAsset = null

  if (useAndroidCache) {
    try {
      cachedAsset = await getAndroidCache(NOTE_ASSET_CACHE_BUCKET, normalizedPath)
    } catch {}

    if (!refresh && cachedAsset?.blob instanceof Blob && cachedAsset.blob.size > 0) {
      return cachedAsset.blob
    }
  }

  if (!allowNetwork) {
    throw new Error('这张笔记图片尚未下载到本机，请前往设置更新笔记。')
  }

  try {
    const blob = await requestNoteAssetBlob(normalizedPath)

    if (useAndroidCache) {
      try {
        await setAndroidCache(NOTE_ASSET_CACHE_BUCKET, normalizedPath, {
          blob,
          contentType: blob.type,
          cachedAt: new Date().toISOString()
        })
      } catch {}
    }

    return blob
  } catch (error) {
    if (cachedAsset?.blob instanceof Blob && cachedAsset.blob.size > 0) {
      return cachedAsset.blob
    }

    throw error
  }
}
