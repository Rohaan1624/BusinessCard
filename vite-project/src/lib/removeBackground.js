// Client-side background removal for logos.
//
// Logos virtually always sit on a solid background, so instead of shipping a
// multi-megabyte ML model (the popular ones are AGPL or non-commercial
// licensed), we flood-fill from the image edges: every pixel connected to the
// border whose color is close to the dominant border color becomes
// transparent, with a soft alpha ramp near the tolerance boundary so edges
// stay smooth. Interior elements of the same color are preserved because the
// fill only spreads from the edges.

const HARD_TOL = 50 // colors closer than this to the bg are fully removed
const SOFT_TOL = 95 // colors between HARD and SOFT get partial transparency

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load the logo image'))
    img.src = src
  })
}

// Dominant border color via coarse quantization of all edge pixels.
function dominantEdgeColor(data, width, height) {
  const counts = new Map()
  const tally = (i) => {
    const key = `${data[i] >> 4}:${data[i + 1] >> 4}:${data[i + 2] >> 4}`
    const entry = counts.get(key) || { n: 0, r: 0, g: 0, b: 0 }
    entry.n++
    entry.r += data[i]
    entry.g += data[i + 1]
    entry.b += data[i + 2]
    counts.set(key, entry)
  }
  for (let x = 0; x < width; x++) {
    tally(x * 4)
    tally(((height - 1) * width + x) * 4)
  }
  for (let y = 0; y < height; y++) {
    tally(y * width * 4)
    tally((y * width + width - 1) * 4)
  }
  let best = null
  for (const entry of counts.values()) {
    if (!best || entry.n > best.n) best = entry
  }
  return [best.r / best.n, best.g / best.n, best.b / best.n]
}

export async function removeLogoBackground(src) {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)

  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const [br, bg, bb] = dominantEdgeColor(data, width, height)

  const distTo = (i) => {
    const dr = data[i] - br
    const dg = data[i + 1] - bg
    const db = data[i + 2] - bb
    return Math.sqrt(dr * dr + dg * dg + db * db)
  }

  // BFS flood fill from every border pixel that matches the background.
  const visited = new Uint8Array(width * height)
  const queue = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const p = y * width + x
    if (visited[p]) return
    visited[p] = 1
    const i = p * 4
    const d = distTo(i)
    if (d >= SOFT_TOL) return
    if (d <= HARD_TOL) {
      data[i + 3] = 0
      queue.push(p)
    } else {
      // boundary pixel: feather, but don't keep spreading from it
      data[i + 3] = Math.min(
        data[i + 3],
        Math.round(((d - HARD_TOL) / (SOFT_TOL - HARD_TOL)) * 255),
      )
    }
  }
  for (let x = 0; x < width; x++) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    push(0, y)
    push(width - 1, y)
  }
  while (queue.length) {
    const p = queue.pop()
    const x = p % width
    const y = (p - x) / width
    push(x - 1, y)
    push(x + 1, y)
    push(x, y - 1)
    push(x, y + 1)
  }

  const removed = visited.reduce((n, v) => n + v, 0)
  if (removed < width * height * 0.05) {
    throw new Error(
      "Couldn't detect a solid background to remove — this works best on logos with a plain background.",
    )
  }

  ctx.putImageData(imageData, 0, 0)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not export the processed logo')
  return blob
}
