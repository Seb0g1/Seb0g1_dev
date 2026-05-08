import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, assetUrl, getToken, setToken, clearToken } from '../api.js'
import BrandLogo from '../components/BrandLogo.jsx'

const emptyForm = {
  title: '',
  description: '',
  technologies: '',
  categoryId: '',
  link: '',
  image: null,
  removeImage: false,
}

function Admin() {
  const [authed, setAuthed] = useState(Boolean(getToken()))
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [tab, setTab] = useState('dashboard')
  const [projects, setProjects] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [keepImageUrl, setKeepImageUrl] = useState(null)
  const [newCategory, setNewCategory] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const dropRef = useRef(null)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(id)
  }, [toast])

  const refresh = async () => {
    try {
      const [p, c] = await Promise.all([api.listProjects(), api.listCategories()])
      setProjects(p)
      setCategories(c)
    } catch (e) {
      setToast({ kind: 'error', text: e.message })
    }
  }

  useEffect(() => {
    if (authed) refresh()
  }, [authed])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    try {
      const { token } = await api.login(password)
      setToken(token)
      setPassword('')
      setAuthed(true)
    } catch (err) {
      setLoginError(err.message)
    }
  }

  const handleLogout = async () => {
    try {
      await api.logout()
    } catch {}
    clearToken()
    setAuthed(false)
  }

  const setImage = (file) => {
    if (!file) {
      setImagePreview(null)
      setForm((f) => ({ ...f, image: null }))
      return
    }
    setForm((f) => ({ ...f, image: file, removeImage: false }))
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const onDragOver = (e) => {
    e.preventDefault()
    dropRef.current?.classList.add('over')
  }
  const onDragLeave = () => dropRef.current?.classList.remove('over')
  const onDrop = (e) => {
    e.preventDefault()
    dropRef.current?.classList.remove('over')
    const file = e.dataTransfer.files?.[0]
    if (file) setImage(file)
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setImagePreview(null)
    setKeepImageUrl(null)
  }

  const submitProject = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const data = new FormData()
      data.append('title', form.title)
      data.append('description', form.description)
      data.append('technologies', form.technologies)
      data.append('categoryId', form.categoryId || '')
      data.append('link', form.link)
      if (form.image instanceof File) data.append('image', form.image)
      if (editingId && form.removeImage) data.append('removeImage', 'true')

      if (editingId) {
        await api.updateProject(editingId, data)
        setToast({ kind: 'success', text: 'Проект обновлён' })
      } else {
        await api.createProject(data)
        setToast({ kind: 'success', text: 'Проект добавлен' })
      }
      resetForm()
      await refresh()
      setTab('projects')
    } catch (err) {
      setToast({ kind: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (project) => {
    setEditingId(project.id)
    setForm({
      title: project.title,
      description: project.description,
      technologies: project.technologies || '',
      categoryId: project.categoryId || '',
      link: project.link || '',
      image: null,
      removeImage: false,
    })
    setImagePreview(null)
    setKeepImageUrl(project.image || null)
    setTab('new')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const removeProject = async (id) => {
    if (!confirm('Удалить проект?')) return
    try {
      await api.deleteProject(id)
      setToast({ kind: 'success', text: 'Проект удалён' })
      await refresh()
    } catch (err) {
      setToast({ kind: 'error', text: err.message })
    }
  }

  const addCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.trim()) return
    try {
      await api.createCategory(newCategory.trim())
      setNewCategory('')
      setToast({ kind: 'success', text: 'Категория добавлена' })
      await refresh()
    } catch (err) {
      setToast({ kind: 'error', text: err.message })
    }
  }

  const startEditCategory = (c) => {
    setEditingCategoryId(c.id)
    setEditingCategoryName(c.name)
  }

  const saveCategory = async (id) => {
    if (!editingCategoryName.trim()) return
    try {
      await api.updateCategory(id, editingCategoryName.trim())
      setEditingCategoryId(null)
      setEditingCategoryName('')
      setToast({ kind: 'success', text: 'Категория обновлена' })
      await refresh()
    } catch (err) {
      setToast({ kind: 'error', text: err.message })
    }
  }

  const removeCategory = async (id) => {
    if (!confirm('Удалить категорию? Проекты останутся без категории.')) return
    try {
      await api.deleteCategory(id)
      setToast({ kind: 'success', text: 'Категория удалена' })
      await refresh()
    } catch (err) {
      setToast({ kind: 'error', text: err.message })
    }
  }

  const stats = useMemo(
    () => ({
      total: projects.length,
      withImages: projects.filter((p) => p.image).length,
      withoutCategory: projects.filter((p) => !p.categoryId).length,
      categories: categories.length,
    }),
    [projects, categories],
  )

  if (!authed) {
    return (
      <div className="page admin">
        <header className="header">
          <Link className="brand" to="/">
            <BrandLogo />
          </Link>
          <nav className="nav">
            <Link to="/">На главную</Link>
          </nav>
        </header>
        <div className="login-shell">
          <section className="login-card">
            <h2>Вход в админку</h2>
            <p className="muted">
              Введите пароль администратора, чтобы управлять проектами.
            </p>
            <form onSubmit={handleLogin} className="form">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                autoFocus
              />
              {loginError && <div className="toast toast-error">{loginError}</div>}
              <button className="btn btn-primary" type="submit">
                Войти
              </button>
            </form>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="page admin">
      <header className="header">
        <Link className="brand" to="/">
          <BrandLogo />
        </Link>
        <nav className="nav">
          <Link to="/">На главную</Link>
          <button className="link-btn" onClick={handleLogout}>
            Выйти
          </button>
        </nav>
      </header>

      <div className="admin-shell">
        <aside className="admin-side">
          <div className="side-title">Админка</div>
          <button
            className={`tab-btn ${tab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setTab('dashboard')}
          >
            Дашборд
          </button>
          <button
            className={`tab-btn ${tab === 'new' ? 'active' : ''}`}
            onClick={() => {
              if (!editingId) resetForm()
              setTab('new')
            }}
          >
            {editingId ? 'Редактирование' : 'Новый проект'}
          </button>
          <button
            className={`tab-btn ${tab === 'projects' ? 'active' : ''}`}
            onClick={() => setTab('projects')}
          >
            Проекты <span className="tab-count">{projects.length}</span>
          </button>
          <button
            className={`tab-btn ${tab === 'categories' ? 'active' : ''}`}
            onClick={() => setTab('categories')}
          >
            Категории <span className="tab-count">{categories.length}</span>
          </button>
        </aside>

        <div className="admin-content">
          {toast && <div className={`toast toast-${toast.kind}`}>{toast.text}</div>}

          {tab === 'dashboard' && (
            <section className="panel">
              <h2>Дашборд</h2>
              <p className="panel-sub">Краткая статистика по контенту портфолио.</p>
              <div className="stats" style={{ maxWidth: '100%' }}>
                <div className="stat">
                  <div className="stat-value">{stats.total}</div>
                  <div className="stat-label">всего проектов</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{stats.withImages}</div>
                  <div className="stat-label">с обложкой</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{stats.withoutCategory}</div>
                  <div className="stat-label">без категории</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{stats.categories}</div>
                  <div className="stat-label">категорий</div>
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: 22 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    resetForm()
                    setTab('new')
                  }}
                >
                  + Добавить проект
                </button>
                <button className="btn btn-ghost" onClick={() => setTab('categories')}>
                  Управлять категориями
                </button>
              </div>
            </section>
          )}

          {tab === 'new' && (
            <section className="panel">
              <h2>{editingId ? 'Редактировать проект' : 'Добавить проект'}</h2>
              <p className="panel-sub">
                Заполните карточку проекта. Можно перетащить фото в зону загрузки.
              </p>
              <form className="form" onSubmit={submitProject}>
                <div
                  className="drop"
                  ref={dropRef}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImage(e.target.files?.[0] || null)}
                  />
                  {imagePreview ? (
                    <div className="drop-preview">
                      <img src={imagePreview} alt="preview" />
                      <div className="drop-meta">
                        <strong>Новое фото готово к загрузке</strong>
                        <span className="drop-hint">Кликните или перетащите другое</span>
                      </div>
                    </div>
                  ) : keepImageUrl && !form.removeImage ? (
                    <div className="drop-preview">
                      <img src={assetUrl(keepImageUrl)} alt="current" />
                      <div className="drop-meta">
                        <strong>Текущее фото</strong>
                        <span className="drop-hint">Кликните или перетащите, чтобы заменить</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <strong>Перетащите изображение сюда</strong>
                      <div className="drop-hint">или кликните, чтобы выбрать (JPG / PNG / WebP)</div>
                    </div>
                  )}
                </div>

                {editingId && keepImageUrl && (
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={form.removeImage}
                      onChange={(e) =>
                        setForm({ ...form, removeImage: e.target.checked, image: null })
                      }
                    />
                    Удалить текущее фото
                  </label>
                )}

                <div className="form-grid">
                  <label className="span-2">
                    Название
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </label>
                  <label className="span-2">
                    Описание
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      required
                    />
                  </label>
                  <label className="span-2">
                    Технологии (через запятую)
                    <input
                      type="text"
                      value={form.technologies}
                      onChange={(e) => setForm({ ...form, technologies: e.target.value })}
                      placeholder="React, Node.js, PostgreSQL"
                    />
                  </label>
                  <label>
                    Категория
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    >
                      <option value="">Без категории</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Ссылка (необязательно)
                    <input
                      type="url"
                      value={form.link}
                      onChange={(e) => setForm({ ...form, link: e.target.value })}
                      placeholder="https://..."
                    />
                  </label>
                </div>

                <div className="form-actions">
                  <button className="btn btn-primary" type="submit" disabled={busy}>
                    {editingId ? 'Сохранить' : 'Опубликовать'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={resetForm}>
                    Сбросить
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      className="link-btn danger"
                      onClick={() => removeProject(editingId)}
                    >
                      Удалить проект
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}

          {tab === 'projects' && (
            <section className="panel">
              <h2>Все проекты</h2>
              <p className="panel-sub">Кликните «Редактировать», чтобы изменить карточку.</p>
              <div className="admin-projects">
                {projects.map((p) => (
                  <div className="admin-project" key={p.id}>
                    {p.image ? (
                      <img className="admin-project-thumb" src={assetUrl(p.image)} alt={p.title} />
                    ) : (
                      <div className="admin-project-thumb">{p.title.slice(0, 1).toUpperCase()}</div>
                    )}
                    <div className="admin-project-body">
                      <h3>{p.title}</h3>
                      <p>{p.description}</p>
                      {p.technologies && (
                        <div className="tech-row">
                          {p.technologies
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean)
                            .slice(0, 4)
                            .map((t) => (
                              <span className="tech-pill" key={t}>
                                {t}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="admin-project-actions">
                      <button className="btn btn-ghost" onClick={() => startEdit(p)}>
                        Редактировать
                      </button>
                      <button className="link-btn danger" onClick={() => removeProject(p.id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
                {projects.length === 0 && (
                  <p className="muted">Пока нет проектов. Добавьте первый!</p>
                )}
              </div>
            </section>
          )}

          {tab === 'categories' && (
            <section className="panel">
              <h2>Категории</h2>
              <p className="panel-sub">
                Можно изменять и удалять. Проекты будут автоматически переведены в «без категории» при удалении.
              </p>
              <form className="form" onSubmit={addCategory} style={{ flexDirection: 'row', gap: 10 }}>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Например: Лендинги"
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" type="submit">
                  Добавить
                </button>
              </form>
              <ul className="category-list">
                {categories.map((c) => (
                  <li className="category-row" key={c.id}>
                    {editingCategoryId === c.id ? (
                      <>
                        <input
                          autoFocus
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveCategory(c.id)
                            if (e.key === 'Escape') setEditingCategoryId(null)
                          }}
                        />
                        <div className="actions">
                          <button className="link-btn" onClick={() => saveCategory(c.id)}>
                            Сохранить
                          </button>
                          <button
                            className="link-btn"
                            onClick={() => {
                              setEditingCategoryId(null)
                              setEditingCategoryName('')
                            }}
                          >
                            Отмена
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="name">{c.name}</span>
                        <div className="actions">
                          <button className="link-btn" onClick={() => startEditCategory(c)}>
                            Изменить
                          </button>
                          <button className="link-btn danger" onClick={() => removeCategory(c.id)}>
                            Удалить
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
                {categories.length === 0 && (
                  <li className="muted">Категорий пока нет</li>
                )}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

export default Admin
