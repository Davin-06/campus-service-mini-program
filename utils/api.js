const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000/api'

function getBaseUrl() {
  const app = typeof getApp === 'function' ? getApp() : null
  return (app && app.globalData && app.globalData.apiBaseUrl) || DEFAULT_API_BASE_URL
}

function url(path) {
  const base = getBaseUrl().replace(/\/$/, '')
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path || ''}`
  return `${base}${normalizedPath}`
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch (error) {
    console.warn('图片数据解析失败:', error)
    return []
  }
}

module.exports = {
  url,
  parseJsonArray
}
