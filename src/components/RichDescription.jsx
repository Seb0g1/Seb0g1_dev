import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

/**
 * Превращает «сырой» текст из админки в читаемые абзацы и буллеты.
 * Поддерживаемые маркеры: «• », «- », «* », «— », «– ».
 * Если несколько таких маркеров встречаются в одной строке через пробелы,
 * строка тоже разбирается как список (часто бывает при копипасте из мессенджеров).
 */
function parseDescription(text) {
  if (!text) return []
  const lines = String(text)
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const bulletRe = /^([•\-*–—►▪◆])\s+(.+)$/u
  const blocks = []
  let listBuf = []

  const flushList = () => {
    if (listBuf.length) {
      blocks.push({ type: 'list', items: listBuf })
      listBuf = []
    }
  }

  for (const line of lines) {
    const m = line.match(bulletRe)
    if (m) {
      listBuf.push(m[2].trim())
      continue
    }

    // Inline-список: «вводная • пункт • пункт • пункт».
    const inlineParts = line.split(/\s+•\s+/)
    if (inlineParts.length >= 3) {
      flushList()
      const intro = inlineParts[0].trim()
      if (intro && !/^[•\-*–—]/.test(intro)) {
        blocks.push({ type: 'p', text: intro })
      } else if (intro) {
        listBuf.push(intro.replace(/^[•\-*–—]\s*/, ''))
      }
      for (let i = 1; i < inlineParts.length; i += 1) {
        const it = inlineParts[i].trim()
        if (it) listBuf.push(it)
      }
      flushList()
      continue
    }

    flushList()
    blocks.push({ type: 'p', text: line })
  }

  flushList()
  return blocks
}

/**
 * Делит инлайн-текст на куски и подсвечивает emoji в начале «строки списка»
 * чуть крупнее. Сейчас просто возвращает строку, оставлено как точка расширения.
 */
const renderInline = (text) => text

function RichDescription({ text, collapseLines = 8 }) {
  const blocks = useMemo(() => parseDescription(text), [text])
  const bodyRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [overflow, setOverflow] = useState(false)

  useLayoutEffect(() => {
    const measure = () => {
      const el = bodyRef.current
      if (!el) return
      // Замер только в свёрнутом состоянии — иначе clientHeight = scrollHeight.
      if (expanded) {
        setOverflow(true)
        return
      }
      setOverflow(el.scrollHeight - el.clientHeight > 2)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    if (bodyRef.current) ro.observe(bodyRef.current)
    return () => ro.disconnect()
  }, [blocks, expanded])

  useEffect(() => {
    setExpanded(false)
  }, [text])

  if (blocks.length === 0) return null

  const style = {
    '--rich-lines': collapseLines,
  }

  return (
    <div className={`rich-desc ${expanded ? 'expanded' : ''}`} style={style}>
      <div className="rich-desc-body" ref={bodyRef}>
        {blocks.map((block, i) => {
          if (block.type === 'list') {
            return (
              <ul className="rich-list" key={`l-${i}`}>
                {block.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ul>
            )
          }
          return (
            <p className="rich-p" key={`p-${i}`}>
              {renderInline(block.text)}
            </p>
          )
        })}
      </div>
      {(overflow || expanded) && (
        <button
          type="button"
          className="rich-desc-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'Свернуть' : 'Подробнее'}
          <span className="rich-desc-toggle-arrow" aria-hidden>
            {expanded ? '↑' : '↓'}
          </span>
        </button>
      )}
    </div>
  )
}

export default RichDescription
