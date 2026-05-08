const API_BASE = '/api'

const TOKEN_KEY = 'seb0g1_admin_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

/** Гарантирует корневой путь `/uploads/...`, чтобы с `/admin` не запрашивалось `/admin/uploads/...`. */
export const assetUrl = (path) => {
  if (path == null || path === '') return ''
  const s = String(path).trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  let p = s.replace(/\\/g, '/')
  if (!p.startsWith('/')) {
    if (p.startsWith('uploads/')) p = `/${p}`
    else if (!p.includes('/')) p = `/uploads/${p}`
    else p = `/${p.replace(/^\/+/, '')}`
  }
  p = p.replace(/\/+/g, '/')
  if (!p.startsWith('/uploads/')) {
    const base = p.split('/').pop()
    if (base && /\.(jpe?g|png|webp|gif|svg)$/i.test(base)) p = `/uploads/${base}`
  }
  return p
}

const request = async (path, { method = 'GET', body, auth = false, isForm = false } = {}) => {
  const headers = {}
  if (!isForm && body) headers['Content-Type'] = 'application/json'
  if (auth) headers.Authorization = `Bearer ${getToken()}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const message = data?.error || `Ошибка ${res.status}`
    throw new Error(message)
  }
  return data
}

export const api = {
  login: (password) => request('/login', { method: 'POST', body: { password } }),
  logout: () => request('/logout', { method: 'POST', auth: true }),

  listProjects: () => request('/projects'),
  createProject: (formData) =>
    request('/projects', { method: 'POST', body: formData, auth: true, isForm: true }),
  updateProject: (id, formData) =>
    request(`/projects/${id}`, { method: 'PUT', body: formData, auth: true, isForm: true }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE', auth: true }),

  listCategories: () => request('/categories'),
  createCategory: (name) =>
    request('/categories', { method: 'POST', body: { name }, auth: true }),
  updateCategory: (id, name) =>
    request(`/categories/${id}`, { method: 'PUT', body: { name }, auth: true }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE', auth: true }),
}
