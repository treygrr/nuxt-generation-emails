const PREVIEW_PREFIX = '/__emails/'

function stripLeadingSlash(value: string): string {
  return value.replace(/^\/+/, '')
}

export function toTemplatePath(previewPath: string): string {
  if (previewPath.startsWith(PREVIEW_PREFIX)) {
    return stripLeadingSlash(previewPath.slice(PREVIEW_PREFIX.length))
  }

  return stripLeadingSlash(previewPath)
}

export function normalizeApiTemplatePath(
  templatePath: string,
  availableTemplatePaths: string[],
): string {
  if (!templatePath || templatePath === 'index') {
    return templatePath
  }

  if (!templatePath.endsWith('/index')) {
    return templatePath
  }

  const indexlessPath = templatePath.slice(0, -'/index'.length)
  const hasSiblingTemplate = availableTemplatePaths.includes(indexlessPath)

  // Keep /index when a sibling template would otherwise collide.
  if (hasSiblingTemplate) {
    return templatePath
  }

  return indexlessPath
}

export function resolveApiEndpointFromPreviewPath(
  currentPreviewPath: string,
  availablePreviewPaths: string[],
): string {
  const templatePath = toTemplatePath(currentPreviewPath)
  const availableTemplatePaths = availablePreviewPaths.map(toTemplatePath)
  const normalizedTemplatePath = normalizeApiTemplatePath(templatePath, availableTemplatePaths)
  return `/api/emails/${normalizedTemplatePath}`
}
