import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

/**
 * Genera los iconos PNG del PWA sin dependencias externas.
 * Diseño: cuadrado azul EmpleoNow con una "E" blanca.
 */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let crc = -1
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'latin1')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
  return Buffer.concat([length, typeBuffer, data, crc])
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function fillRect(rgba, width, x0, y0, x1, y1, [r, g, b, a]) {
  const startX = Math.max(0, Math.round(x0 * width))
  const endX = Math.min(width, Math.round(x1 * width))
  const startY = Math.max(0, Math.round(y0 * width))
  const endY = Math.min(width, Math.round(y1 * width))
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const i = (y * width + x) * 4
      rgba[i] = r
      rgba[i + 1] = g
      rgba[i + 2] = b
      rgba[i + 3] = a
    }
  }
}

const BLUE = [37, 99, 235, 255]
const WHITE = [255, 255, 255, 255]

function drawIcon(size, { padding = 0 } = {}) {
  const rgba = Buffer.alloc(size * size * 4, 0)
  fillRect(rgba, size, 0, 0, 1, 1, BLUE)

  // Zona útil: con padding para iconos maskable (safe zone del 80%).
  const inner = 0.72 - padding
  const left = 0.5 - inner / 2
  const right = 0.5 + inner / 2
  const top = 0.5 - inner / 2
  const bottom = 0.5 + inner / 2

  const stemWidth = inner * 0.22
  const armHeight = inner * 0.17
  const armWidth = inner * 0.52

  // Vertical de la E
  fillRect(rgba, size, left, top, left + stemWidth, bottom, WHITE)
  // Brazos superior, medio e inferior
  fillRect(rgba, size, left, top, left + stemWidth + armWidth, top + armHeight, WHITE)
  fillRect(rgba, size, left, 0.5 - armHeight / 2, left + stemWidth + armWidth * 0.82, 0.5 + armHeight / 2, WHITE)
  fillRect(rgba, size, left, bottom - armHeight, left + stemWidth + armWidth, bottom, WHITE)

  return encodePng(size, size, rgba)
}

const outDir = path.resolve(import.meta.dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

fs.writeFileSync(path.join(outDir, 'icon-192.png'), drawIcon(192))
fs.writeFileSync(path.join(outDir, 'icon-512.png'), drawIcon(512))
fs.writeFileSync(path.join(outDir, 'maskable-512.png'), drawIcon(512, { padding: 0.1 }))
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), drawIcon(180))

console.log('Iconos PWA generados en', outDir)
