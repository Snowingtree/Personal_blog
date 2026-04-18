function normalizeRepoPath(value) {
  return String(value ?? '')
    .replace(/\\/g, '/')
    .split('/')
    .reduce((segments, segment) => {
      if (!segment || segment === '.') {
        return segments
      }

      if (segment === '..') {
        segments.pop()
        return segments
      }

      segments.push(segment)
      return segments
    }, [])
    .join('/')
}

function isAbsoluteUrl(value) {
  return /^(?:[a-z]+:)?\/\//i.test(value)
}

function resolveRepoRelativePath(currentFilePath, targetPath) {
  if (!targetPath || targetPath.startsWith('#') || targetPath.startsWith('mailto:')) {
    return targetPath
  }

  if (isAbsoluteUrl(targetPath)) {
    return targetPath
  }

  const normalizedTarget = targetPath.replace(/\\/g, '/')

  if (normalizedTarget.startsWith('/')) {
    return normalizeRepoPath(normalizedTarget)
  }

  const currentDirectory = normalizeRepoPath(currentFilePath).split('/').slice(0, -1).join('/')
  const combinedPath = currentDirectory ? `${currentDirectory}/${normalizedTarget}` : normalizedTarget

  return normalizeRepoPath(combinedPath)
}

function buildNoteAssetUrl(currentFilePath, targetPath) {
  const resolvedPath = resolveRepoRelativePath(currentFilePath, targetPath)

  if (!resolvedPath || resolvedPath.startsWith('#') || resolvedPath.startsWith('mailto:')) {
    return resolvedPath
  }

  if (isAbsoluteUrl(resolvedPath)) {
    return resolvedPath
  }

  const assetPath = `/api/notes/asset?path=${encodeURIComponent(resolvedPath)}`
  return assetPath
}

function rewriteRenderedNoteHtml(html, currentFilePath) {
  if (!html || typeof document === 'undefined') {
    return html
  }

  const wrapper = document.createElement('div')
  wrapper.innerHTML = String(html)

  wrapper.querySelectorAll('img[src]').forEach((element) => {
    const source = element.getAttribute('src') || ''
    element.setAttribute('src', buildNoteAssetUrl(currentFilePath, source))
  })

  wrapper.querySelectorAll('a[href]').forEach((element) => {
    const href = element.getAttribute('href') || ''
    const nextHref = buildNoteAssetUrl(currentFilePath, href)

    if (nextHref) {
      element.setAttribute('href', nextHref)
    }

    if (isAbsoluteUrl(href)) {
      element.setAttribute('target', '_blank')
      element.setAttribute('rel', 'noreferrer')
    }
  })

  return wrapper.innerHTML
}

export { buildNoteAssetUrl, rewriteRenderedNoteHtml }
