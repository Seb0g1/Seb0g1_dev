import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SRC = path.resolve(__dirname, '../src/assets/logo.png')
const DST = path.resolve(__dirname, '../src/assets/logo-dark.png')

const LIGHT = [232, 244, 255]
const DARK_THRESHOLD = 130

const src = PNG.sync.read(fs.readFileSync(SRC))
const { width: w, height: h, data } = src
const out = new PNG({ width: w, height: h })

let replaced = 0
for (let i = 0; i < w * h; i++) {
  const r = data[i * 4]
  const g = data[i * 4 + 1]
  const b = data[i * 4 + 2]
  const a = data[i * 4 + 3]

  const max = Math.max(r, g, b)

  /* Тёмно-синий навигационный текст: low brightness.
     Заменяем на светлый тон. Вибрантный градиент иконки (max>=130)
     остаётся без изменений. */
  if (a > 0 && max < DARK_THRESHOLD) {
    out.data[i * 4] = LIGHT[0]
    out.data[i * 4 + 1] = LIGHT[1]
    out.data[i * 4 + 2] = LIGHT[2]
    replaced++
  } else {
    out.data[i * 4] = r
    out.data[i * 4 + 1] = g
    out.data[i * 4 + 2] = b
  }
  out.data[i * 4 + 3] = a
}

fs.writeFileSync(DST, PNG.sync.write(out))
console.log(`Готово (полный): ${path.relative(process.cwd(), DST)} (${w}x${h})`)
console.log(`Заменено тёмных пикселей: ${replaced}`)

let minX = w
let minY = h
let maxX = -1
let maxY = -1
const PADDING = 16
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (out.data[(y * w + x) * 4 + 3] > 8) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
}

if (maxX >= 0) {
  minX = Math.max(0, minX - PADDING)
  minY = Math.max(0, minY - PADDING)
  maxX = Math.min(w - 1, maxX + PADDING)
  maxY = Math.min(h - 1, maxY + PADDING)
  const cw = maxX - minX + 1
  const ch = maxY - minY + 1
  const cropped = new PNG({ width: cw, height: ch })
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const srcIdx = ((minY + y) * w + (minX + x)) * 4
      const dstIdx = (y * cw + x) * 4
      cropped.data[dstIdx] = out.data[srcIdx]
      cropped.data[dstIdx + 1] = out.data[srcIdx + 1]
      cropped.data[dstIdx + 2] = out.data[srcIdx + 2]
      cropped.data[dstIdx + 3] = out.data[srcIdx + 3]
    }
  }
  fs.writeFileSync(DST, PNG.sync.write(cropped))
  console.log(`Обрезано до ${cw}x${ch} (отступ ${PADDING}px)`)
}
