import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SRC = path.resolve(__dirname, '../src/assets/people.png')
const DST = path.resolve(__dirname, '../src/assets/people-cutout.png')

const TOLERANCE = 22
const FEATHER = 1.5

const png = PNG.sync.read(fs.readFileSync(SRC))
const { width: w, height: h, data: rgb } = png

const out = new PNG({ width: w, height: h })
const rgba = out.data

for (let i = 0; i < w * h; i++) {
  rgba[i * 4 + 0] = rgb[i * 4 + 0]
  rgba[i * 4 + 1] = rgb[i * 4 + 1]
  rgba[i * 4 + 2] = rgb[i * 4 + 2]
  rgba[i * 4 + 3] = 255
}

const isCheckerPixel = (r, g, b) => {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max - min > 8) return false
  const v = (r + g + b) / 3
  if (v >= 246) return true
  if (v >= 196 && v <= 218) return true
  return false
}

const sampleRef = (x, y) => {
  const idx = (y * w + x) * 4
  return [rgba[idx], rgba[idx + 1], rgba[idx + 2]]
}

const corners = [
  [2, 2],
  [w - 3, 2],
  [2, h - 3],
  [w - 3, h - 3],
]

const visited = new Uint8Array(w * h)
const stack = []

const distSq = (a, b, c, r, g, bl) => {
  const dr = a - r
  const dg = b - g
  const db = c - bl
  return dr * dr + dg * dg + db * db
}

for (const [cx, cy] of corners) {
  const [rr, rg, rb] = sampleRef(cx, cy)
  stack.push(cx, cy, rr, rg, rb)
}

while (stack.length) {
  const refB = stack.pop()
  const refG = stack.pop()
  const refR = stack.pop()
  const y = stack.pop()
  const x = stack.pop()

  if (x < 0 || y < 0 || x >= w || y >= h) continue
  const flat = y * w + x
  if (visited[flat]) continue
  visited[flat] = 1

  const i = flat * 4
  const r = rgba[i]
  const g = rgba[i + 1]
  const b = rgba[i + 2]

  if (!isCheckerPixel(r, g, b) && distSq(r, g, b, refR, refG, refB) > TOLERANCE * TOLERANCE) {
    continue
  }

  rgba[i + 3] = 0

  stack.push(x + 1, y, refR, refG, refB)
  stack.push(x - 1, y, refR, refG, refB)
  stack.push(x, y + 1, refR, refG, refB)
  stack.push(x, y - 1, refR, refG, refB)
}

const tmp = new Uint8Array(w * h)
for (let i = 0; i < w * h; i++) tmp[i] = rgba[i * 4 + 3]
const featherRadius = Math.ceil(FEATHER)
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    let sum = 0
    let count = 0
    for (let dy = -featherRadius; dy <= featherRadius; dy++) {
      for (let dx = -featherRadius; dx <= featherRadius; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        sum += tmp[ny * w + nx]
        count++
      }
    }
    rgba[(y * w + x) * 4 + 3] = Math.round(sum / count)
  }
}

let cleared = 0
for (let i = 0; i < w * h; i++) {
  if (rgba[i * 4 + 3] === 0) cleared++
}

fs.writeFileSync(DST, PNG.sync.write(out))

console.log(`Готово: ${path.relative(process.cwd(), DST)}`)
console.log(`Размер: ${w}x${h}, прозрачных пикселей: ${cleared} (${((cleared / (w * h)) * 100).toFixed(1)}%)`)
