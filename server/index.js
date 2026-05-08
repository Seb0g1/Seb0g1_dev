import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { nanoid } from 'nanoid'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 4000
const HOST = process.env.HOST || '0.0.0.0'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'seb0g1-admin'

const DATA_DIR = path.join(__dirname, 'data')
const UPLOADS_DIR = path.join(__dirname, 'uploads')
const DATA_FILE = path.join(DATA_DIR, 'data.json')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(
      {
        categories: [
          { id: nanoid(8), name: 'Web' },
          { id: nanoid(8), name: 'Mobile' },
          { id: nanoid(8), name: 'Tools' },
        ],
        projects: [],
        tokens: [],
      },
      null,
      2,
    ),
  )
}

const readDB = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
const writeDB = (db) => fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2))

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${nanoid(6)}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(
      path.extname(file.originalname).toLowerCase(),
    )
    cb(ok ? null : new Error('Недопустимый формат изображения'), ok)
  },
})

const app = express()
app.set('trust proxy', 'loopback')
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  const db = readDB()
  if (!token || !db.tokens.includes(token)) {
    return res.status(401).json({ error: 'Не авторизован' })
  }
  next()
}

app.post('/api/login', (req, res) => {
  const { password } = req.body || {}
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Неверный пароль' })
  }
  const token = nanoid(32)
  const db = readDB()
  db.tokens = [...(db.tokens || []), token].slice(-20)
  writeDB(db)
  res.json({ token })
})

app.post('/api/logout', requireAuth, (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  const db = readDB()
  db.tokens = (db.tokens || []).filter((t) => t !== token)
  writeDB(db)
  res.json({ ok: true })
})

app.get('/api/categories', (_req, res) => {
  const db = readDB()
  res.json(db.categories)
})

app.post('/api/categories', requireAuth, (req, res) => {
  const name = (req.body?.name || '').trim()
  if (!name) return res.status(400).json({ error: 'Название обязательно' })
  const db = readDB()
  if (db.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: 'Такая категория уже существует' })
  }
  const category = { id: nanoid(8), name }
  db.categories.push(category)
  writeDB(db)
  res.status(201).json(category)
})

app.put('/api/categories/:id', requireAuth, (req, res) => {
  const name = (req.body?.name || '').trim()
  if (!name) return res.status(400).json({ error: 'Название обязательно' })
  const db = readDB()
  const idx = db.categories.findIndex((c) => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Категория не найдена' })
  if (
    db.categories.some(
      (c) => c.id !== req.params.id && c.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return res.status(409).json({ error: 'Такая категория уже существует' })
  }
  db.categories[idx] = { ...db.categories[idx], name }
  writeDB(db)
  res.json(db.categories[idx])
})

app.delete('/api/categories/:id', requireAuth, (req, res) => {
  const db = readDB()
  const before = db.categories.length
  db.categories = db.categories.filter((c) => c.id !== req.params.id)
  db.projects = db.projects.map((p) =>
    p.categoryId === req.params.id ? { ...p, categoryId: null } : p,
  )
  if (db.categories.length === before) {
    return res.status(404).json({ error: 'Категория не найдена' })
  }
  writeDB(db)
  res.json({ ok: true })
})

const fileToImagePath = (file) => `/uploads/${file.filename}`
const removeUploadByUrl = (url) => {
  if (!url) return
  const filename = url.replace(/^\/uploads\//, '').split('/').pop()
  if (!filename) return
  const file = path.join(UPLOADS_DIR, filename)
  if (fs.existsSync(file)) {
    try {
      fs.unlinkSync(file)
    } catch (e) {
      console.warn('Не удалось удалить файл:', file, e.message)
    }
  }
}

const normalizeProject = (project) => {
  const images = Array.isArray(project.images) ? project.images.filter(Boolean) : []
  if (images.length === 0 && project.image) images.push(project.image)
  const cover = images[0] || null
  return { ...project, images, image: cover }
}

const projectImages = upload.fields([
  { name: 'images', maxCount: 12 },
  { name: 'image', maxCount: 1 },
])

const collectFiles = (req) => {
  if (!req.files) return []
  const all = []
  if (Array.isArray(req.files)) all.push(...req.files)
  else {
    if (req.files.images) all.push(...req.files.images)
    if (req.files.image) all.push(...req.files.image)
  }
  return all
}

app.get('/api/projects', (_req, res) => {
  const db = readDB()
  res.json(db.projects.map(normalizeProject))
})

app.post('/api/projects', requireAuth, projectImages, (req, res) => {
  const { title, description, technologies, categoryId, link } = req.body || {}
  if (!title || !description) {
    return res.status(400).json({ error: 'Название и описание обязательны' })
  }
  const db = readDB()
  const files = collectFiles(req)
  const images = files.map(fileToImagePath)
  const project = {
    id: nanoid(10),
    title: String(title).trim(),
    description: String(description).trim(),
    technologies: String(technologies || '').trim(),
    categoryId: categoryId && db.categories.some((c) => c.id === categoryId) ? categoryId : null,
    link: (link || '').trim() || null,
    images,
    image: images[0] || null,
    createdAt: new Date().toISOString(),
  }
  db.projects.unshift(project)
  writeDB(db)
  res.status(201).json(normalizeProject(project))
})

app.put('/api/projects/:id', requireAuth, projectImages, (req, res) => {
  const db = readDB()
  const idx = db.projects.findIndex((p) => p.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Проект не найден' })
  const current = normalizeProject(db.projects[idx])
  const {
    title,
    description,
    technologies,
    categoryId,
    link,
    removeImage,
    keepImages,
  } = req.body || {}

  let keep = current.images
  if (keepImages !== undefined) {
    try {
      const parsed = typeof keepImages === 'string' ? JSON.parse(keepImages) : keepImages
      if (Array.isArray(parsed)) {
        keep = parsed.filter((u) => current.images.includes(u))
      }
    } catch {
      /* ignore */
    }
  }

  const removed = current.images.filter((u) => !keep.includes(u))
  removed.forEach(removeUploadByUrl)

  const newFiles = collectFiles(req)
  const added = newFiles.map(fileToImagePath)

  let images = [...keep, ...added]
  if (removeImage === 'true' || removeImage === true) {
    images.forEach(removeUploadByUrl)
    images = []
  }

  const updated = {
    ...current,
    title: title !== undefined ? String(title).trim() : current.title,
    description: description !== undefined ? String(description).trim() : current.description,
    technologies:
      technologies !== undefined ? String(technologies).trim() : current.technologies,
    categoryId:
      categoryId !== undefined
        ? categoryId && db.categories.some((c) => c.id === categoryId)
          ? categoryId
          : null
        : current.categoryId,
    link: link !== undefined ? (String(link).trim() || null) : current.link,
    images,
    image: images[0] || null,
  }
  db.projects[idx] = updated
  writeDB(db)
  res.json(normalizeProject(updated))
})

app.delete('/api/projects/:id', requireAuth, (req, res) => {
  const db = readDB()
  const project = db.projects.find((p) => p.id === req.params.id)
  if (!project) return res.status(404).json({ error: 'Проект не найден' })
  const all = normalizeProject(project).images
  all.forEach(removeUploadByUrl)
  db.projects = db.projects.filter((p) => p.id !== req.params.id)
  writeDB(db)
  res.json({ ok: true })
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(400).json({ error: err.message || 'Ошибка сервера' })
})

app.listen(PORT, HOST, () => {
  console.log(`Seb0g1.dev API запущен на http://${HOST}:${PORT}`)
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`Админ-пароль (по умолчанию): ${ADMIN_PASSWORD}`)
  }
})
