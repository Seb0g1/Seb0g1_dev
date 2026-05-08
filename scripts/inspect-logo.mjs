import fs from 'node:fs'
import { PNG } from 'pngjs'

const png = PNG.sync.read(fs.readFileSync('src/assets/logo.png'))
const { width: w, height: h, data: d } = png

const buckets = {}
let opaque = 0
for (let i = 0; i < w * h; i++) {
  const a = d[i * 4 + 3]
  if (a < 10) continue
  opaque++
  const r = d[i * 4]
  const g = d[i * 4 + 1]
  const b = d[i * 4 + 2]
  const key = `${Math.floor(r / 40) * 40},${Math.floor(g / 40) * 40},${Math.floor(b / 40) * 40}`
  buckets[key] = (buckets[key] || 0) + 1
}

console.log('size', w, 'x', h, 'opaque', opaque, 'transparent', w * h - opaque)
const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 12)
for (const [k, v] of sorted) console.log(k, '=>', v, ((v / opaque) * 100).toFixed(1) + '%')
