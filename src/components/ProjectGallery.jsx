import { useEffect, useState } from 'react'
import { assetUrl } from '../api.js'

function ProjectGallery({ images = [], title = '', placeholder }) {
  const [index, setIndex] = useState(0)
  const total = images.length

  useEffect(() => {
    if (index >= total) setIndex(0)
  }, [total, index])

  if (total === 0) {
    return (
      <div className="project-image project-image-placeholder">
        <span>{placeholder}</span>
      </div>
    )
  }

  const go = (dir) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIndex((i) => (i + dir + total) % total)
  }

  const goTo = (i) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIndex(i)
  }

  return (
    <div className={`project-image gallery ${total > 1 ? 'has-many' : ''}`}>
      <div className="gallery-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {images.map((src, i) => (
          <div className="gallery-slide" key={`${src}-${i}`}>
            <img
              src={assetUrl(src)}
              alt={`${title} — фото ${i + 1}`}
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            className="gallery-nav prev"
            onClick={go(-1)}
            aria-label="Предыдущее фото"
          >
            ‹
          </button>
          <button
            type="button"
            className="gallery-nav next"
            onClick={go(1)}
            aria-label="Следующее фото"
          >
            ›
          </button>
          <div className="gallery-counter">
            {index + 1}/{total}
          </div>
          <div className="gallery-dots">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`dot ${i === index ? 'active' : ''}`}
                onClick={goTo(i)}
                aria-label={`Перейти к фото ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default ProjectGallery
