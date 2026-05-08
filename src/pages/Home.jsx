import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api.js'
import vkIcon from '../assets/vk.svg'
import telegramIcon from '../assets/telegram.svg'
import twitchIcon from '../assets/twitch.svg'
import peoplePhoto from '../assets/people-cutout.png'
import BrandLogo from '../components/BrandLogo.jsx'
import ProjectGallery from '../components/ProjectGallery.jsx'

const ALL = '__all__'

const services = [
  {
    title: 'Сайт под ключ',
    description:
      'Лендинги, корпоративные и бизнес-сайты с современным дизайном, адаптацией и SEO-оптимизацией.',
    points: ['UI/UX дизайн', 'Адаптивная вёрстка', 'CMS / админка'],
  },
  {
    title: 'Веб-приложение',
    description:
      'SPA и многостраничные приложения с авторизацией, БД и интеграциями. Бэкенд + фронтенд под ваш проект.',
    points: ['React / Next.js', 'Node.js / API', 'PostgreSQL / MongoDB'],
  },
  {
    title: 'Доработка и поддержка',
    description:
      'Подключаюсь к существующему проекту: исправляю баги, ускоряю, добавляю новые модули и интеграции.',
    points: ['Рефакторинг', 'Оптимизация', 'Новые фичи'],
  },
]

const process = [
  {
    step: '01',
    title: 'Бриф и обсуждение',
    text: 'Знакомимся с задачей, целями и аудиторией. Согласуем сроки и бюджет.',
  },
  {
    step: '02',
    title: 'Дизайн и прототип',
    text: 'Готовлю UI/UX и интерактивный прототип, чтобы вы увидели результат до разработки.',
  },
  {
    step: '03',
    title: 'Разработка',
    text: 'Frontend, backend, интеграции. Поэтапная демонстрация прогресса.',
  },
  {
    step: '04',
    title: 'Запуск и поддержка',
    text: 'Деплой, домен, аналитика. Дальше — поддержка и развитие проекта.',
  },
]

const stats = [
  { value: '5+', label: 'лет в разработке' },
  { value: '30+', label: 'завершённых проектов' },
  { value: '100%', label: 'клиентов в рекомендации' },
  { value: '24/7', label: 'на связи в проекте' },
]

const techStack = [
  'React',
  'Next.js',
  'TypeScript',
  'Node.js',
  'Express',
  'NestJS',
  'PostgreSQL',
  'MongoDB',
  'Redis',
  'Docker',
  'AWS',
  'WebSocket',
]

/**
 * Подключает IntersectionObserver к [data-reveal].
 * deps пересобирают наблюдателя, когда в DOM появляются новые узлы
 * (карточки проектов, чипы категорий и т.п.) — иначе они застревают на opacity: 0.
 */
function useReveal(deps = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal]'))
    if (els.length === 0) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('reveal-in'))
      return undefined
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-in')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 },
    )
    els.forEach((el) => {
      if (el.classList.contains('reveal-in')) return
      io.observe(el)
    })
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function useParallax(deps = []) {
  useEffect(() => {
    const layers = document.querySelectorAll('[data-parallax]')

    const onMove = (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2
      const y = (event.clientY / window.innerHeight - 0.5) * 2
      layers.forEach((layer) => {
        const speed = Number(layer.dataset.speed || 10)
        layer.style.setProperty('--px', `${x * speed}px`)
        layer.style.setProperty('--py', `${y * speed}px`)
      })
    }

    const onScroll = () => {
      const offset = window.scrollY * 0.12
      layers.forEach((layer) => {
        const speed = Number(layer.dataset.speed || 10)
        layer.style.setProperty('--sy', `${offset / speed}px`)
      })
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', onScroll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function Home() {
  const [projects, setProjects] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState(ALL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const projectsRef = useRef(null)

  useReveal([projects.length, categories.length, loading])
  useParallax([projects.length])

  useEffect(() => {
    let alive = true
    Promise.all([api.listProjects(), api.listCategories()])
      .then(([p, c]) => {
        if (!alive) return
        setProjects(p)
        setCategories(c)
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (activeCategory === ALL) return projects
    return projects.filter((p) => p.categoryId === activeCategory)
  }, [projects, activeCategory])

  const categoryName = (id) => categories.find((c) => c.id === id)?.name || ''

  return (
    <div className="page">
      <div className="bg-orb bg-orb-1" data-parallax data-speed="22" />
      <div className="bg-orb bg-orb-2" data-parallax data-speed="34" />
      <div className="bg-orb bg-orb-3" data-parallax data-speed="48" />
      <div className="bg-grid" />

      <header className="header">
        <a className="brand" href="#home">
          <BrandLogo />
        </a>
        <nav className="nav">
          <a href="#services">Услуги</a>
          <a href="#projects">Проекты</a>
          <a href="#process">Процесс</a>
          <a href="#about">Обо мне</a>
          <a href="#contacts" className="nav-cta">
            Заказать
          </a>
        </nav>
      </header>

      <section className="hero" id="home">
        <div className="hero-inner">
          <div className="hero-badge" data-reveal>
            <span className="dot" /> Принимаю заказы — слот свободен
          </div>
          <h1 data-reveal>
            Создаю <span className="grad">современные веб-продукты</span>
            <br />
            под ключ
          </h1>
          <p className="hero-lead" data-reveal>
            Меня зовут Петренко Данил. Я full-stack разработчик: проектирую,
            пишу и запускаю сайты и веб-приложения, которые выглядят
            премиально и работают надёжно.
          </p>
          <div className="hero-actions" data-reveal>
            <a href="#contacts" className="btn btn-primary">
              Обсудить проект
            </a>
            <a href="#projects" className="btn btn-ghost">
              Смотреть работы →
            </a>
          </div>

          <div className="stats" data-reveal>
            {stats.map((s) => (
              <div className="stat" key={s.label}>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <figure className="hero-visual">
          <div className="hero-figure-wrap" data-parallax data-speed="26" data-reveal>
            <div className="orb-ring" aria-hidden />
            <div className="orb-ring orb-ring-2" aria-hidden />
            <div className="hero-figure-glow" aria-hidden />
            <div className="hero-figure-pedestal" aria-hidden />
            <img
              className="hero-figure-img"
              src={peoplePhoto}
              alt="Петренко Данил — 3D-фигурка"
              width={420}
              height={560}
              loading="eager"
              decoding="async"
            />
          </div>
          <figcaption className="hero-figure-caption">
            Mini-me • ваш разработчик в миниатюре
          </figcaption>
        </figure>
      </section>

      <section className="services" id="services">
        <div className="section-head" data-reveal>
          <p>Что я делаю</p>
          <h2>Услуги, которые я закрываю «под ключ»</h2>
        </div>
        <div className="service-grid">
          {services.map((s) => (
            <article className="service-card" key={s.title} data-reveal>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
              <ul>
                {s.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="projects" id="projects" ref={projectsRef}>
        <div className="section-head" data-reveal>
          <p>Избранные работы</p>
          <h2>Проекты</h2>
        </div>

        <div className="filters" data-reveal>
          <button
            className={`chip ${activeCategory === ALL ? 'chip-active' : ''}`}
            onClick={() => setActiveCategory(ALL)}
          >
            Все
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`chip ${activeCategory === c.id ? 'chip-active' : ''}`}
              onClick={() => setActiveCategory(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        {loading && <p className="muted">Загрузка проектов…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className="muted">Пока нет проектов в этой категории.</p>
        )}

        <div className="project-grid">
          {filtered.map((project) => {
            const images = project.images?.length
              ? project.images
              : project.image
                ? [project.image]
                : []
            return (
            <article className="project-card" key={project.id} data-reveal>
              <ProjectGallery
                images={images}
                title={project.title}
                placeholder={project.title.slice(0, 1).toUpperCase()}
              />
              <div className="project-body">
                {project.categoryId && (
                  <span className="badge">{categoryName(project.categoryId)}</span>
                )}
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                {project.technologies && (
                  <div className="tech-row">
                    {project.technologies
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((t) => (
                        <span className="tech-pill" key={t}>
                          {t}
                        </span>
                      ))}
                  </div>
                )}
                {project.link && (
                  <a href={project.link} target="_blank" rel="noreferrer" className="card-link">
                    Открыть проект →
                  </a>
                )}
              </div>
            </article>
            )
          })}
        </div>
      </section>

      <section className="process" id="process">
        <div className="section-head" data-reveal>
          <p>Как идёт работа</p>
          <h2>Процесс работы над проектом</h2>
        </div>
        <div className="process-grid">
          {process.map((p) => (
            <article className="process-card" key={p.step} data-reveal>
              <div className="process-step">{p.step}</div>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about" id="about">
        <div className="section-head" data-reveal>
          <p>Обо мне</p>
          <h2>Петренко Данил</h2>
        </div>
        <div className="about-grid">
          <figure className="about-figure" data-reveal>
            <div className="about-figure-inner">
              <img src={peoplePhoto} alt="" width={280} height={360} loading="lazy" />
            </div>
            <figcaption className="about-figure-caption">
              Это я — в формате коллекционной фигурки. Такой же подход к деталям и к вашему сайту.
            </figcaption>
          </figure>
          <div className="about-copy">
            <div data-reveal>
              <p>
                Я full-stack разработчик: проектирую интерфейсы, пишу backend,
                собираю инфраструктуру и довожу продукт до продакшена. Делаю
                упор на производительность, удобство пользователя и
                поддерживаемую архитектуру.
              </p>
              <p>
                Беру задачи целиком: от идеи и ТЗ до запуска и развития. Работаю
                открыто, держу клиента в курсе на каждом этапе.
              </p>
            </div>
            <div className="tech-cloud" data-reveal>
              {techStack.map((t) => (
                <span className="tech-pill" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="contacts" id="contacts">
        <div className="contact-card" data-reveal>
          <div>
            <p className="kicker">Связаться</p>
            <h2>Готов обсудить ваш проект</h2>
            <p className="muted">
              Напишите в любую соцсеть — отвечу в течение нескольких часов.
            </p>
          </div>
          <div className="socials">
            <a
              className="social"
              href="https://vk.com/sebogcs"
              target="_blank"
              rel="noreferrer"
              aria-label="VK"
            >
              <img src={vkIcon} alt="" />
              <span>VK</span>
            </a>
            <a
              className="social"
              href="https://t.me/Seb0g"
              target="_blank"
              rel="noreferrer"
              aria-label="Telegram"
            >
              <img src={telegramIcon} alt="" />
              <span>Telegram</span>
            </a>
            <a
              className="social"
              href="https://twitch.tv/seb0g1"
              target="_blank"
              rel="noreferrer"
              aria-label="Twitch"
            >
              <img src={twitchIcon} alt="" />
              <span>Twitch</span>
            </a>
          </div>
        </div>
        <p className="copy">© {new Date().getFullYear()} Seb0g1.dev — Петренко Данил</p>
      </section>
    </div>
  )
}

export default Home
