/**
 * Parser LAS binário para geração de preview de nuvem de pontos.
 * Suporta LAS 1.0–1.4, formatos 0–10.
 * Formatos com RGB: 2, 3, 5, 7, 8
 *
 * Formato de saída (binary):
 *   4 bytes  uint32LE  count
 *   1 byte   uint8     flags (bit0 = hasColor)
 *   8 bytes  float64LE centroidX
 *   8 bytes  float64LE centroidY
 *   8 bytes  float64LE centroidZ
 *   count×12 float32   posições relativas ao centróide (x,y,z)
 *   count×12 float32   cores (r,g,b 0–1) — só se hasColor
 */

import fs from 'fs'

const RGB_FORMATS    = new Set([2, 3, 5, 7, 8])
const RGB_OFFSETS: Record<number, number> = { 2: 20, 3: 28, 5: 28, 7: 30, 8: 30 }

export function parseLASPreview(lasPath: string, maxPoints = 200_000): Buffer | null {
  if (!fs.existsSync(lasPath)) return null

  const fd = fs.openSync(lasPath, 'r')

  try {
    // ── Cabeçalho ──────────────────────────────────────────────────────────
    const hdr = Buffer.alloc(375)
    fs.readSync(fd, hdr, 0, 375, 0)

    if (hdr.toString('ascii', 0, 4) !== 'LASF') return null

    const versionMinor  = hdr.readUInt8(25)
    const dataOffset    = hdr.readUInt32LE(96)
    const pointFormat   = hdr.readUInt8(104)
    const pointSize     = hdr.readUInt16LE(105)

    // LAS 1.4 usa uint64 para point count (bytes 247–254)
    const pointCount = versionMinor >= 4
      ? Number(hdr.readBigUInt64LE(247))
      : hdr.readUInt32LE(107)

    if (pointCount === 0) return null

    const scaleX  = hdr.readDoubleLE(131)
    const scaleY  = hdr.readDoubleLE(139)
    const scaleZ  = hdr.readDoubleLE(147)
    const offsetX = hdr.readDoubleLE(155)
    const offsetY = hdr.readDoubleLE(163)
    const offsetZ = hdr.readDoubleLE(171)

    const hasColor = RGB_FORMATS.has(pointFormat)
    const rgbOff   = hasColor ? (RGB_OFFSETS[pointFormat] ?? 20) : 0

    const step = Math.max(1, Math.floor(pointCount / maxPoints))
    const count = Math.min(maxPoints, Math.ceil(pointCount / step))

    // ── Primeira passagem: calcula centróide ──────────────────────────────
    let sumX = 0, sumY = 0, sumZ = 0, n = 0
    const ptBuf = Buffer.alloc(pointSize)

    for (let i = 0; i < pointCount && n < count; i += step) {
      const pos = dataOffset + i * pointSize
      if (pos + pointSize > fs.fstatSync(fd).size) break
      fs.readSync(fd, ptBuf, 0, pointSize, pos)
      sumX += ptBuf.readInt32LE(0) * scaleX + offsetX
      sumY += ptBuf.readInt32LE(4) * scaleY + offsetY
      sumZ += ptBuf.readInt32LE(8) * scaleZ + offsetZ
      n++
    }

    if (n === 0) return null

    const cX = sumX / n
    const cY = sumY / n
    const cZ = sumZ / n

    // ── Segunda passagem: grava posições relativas ────────────────────────
    const posBuf   = Buffer.alloc(n * 12)   // float32 xyz
    const colorBuf = hasColor ? Buffer.alloc(n * 12) : null

    let wi = 0
    for (let i = 0; i < pointCount && wi < n; i += step) {
      const pos = dataOffset + i * pointSize
      fs.readSync(fd, ptBuf, 0, pointSize, pos)

      const x = ptBuf.readInt32LE(0) * scaleX + offsetX - cX
      const y = ptBuf.readInt32LE(4) * scaleY + offsetY - cY
      const z = ptBuf.readInt32LE(8) * scaleZ + offsetZ - cZ

      posBuf.writeFloatLE(x, wi * 12)
      posBuf.writeFloatLE(y, wi * 12 + 4)
      posBuf.writeFloatLE(z, wi * 12 + 8)

      if (colorBuf && hasColor) {
        const r = Math.min(1, ptBuf.readUInt16LE(rgbOff)     / 65535)
        const g = Math.min(1, ptBuf.readUInt16LE(rgbOff + 2) / 65535)
        const b = Math.min(1, ptBuf.readUInt16LE(rgbOff + 4) / 65535)
        colorBuf.writeFloatLE(r, wi * 12)
        colorBuf.writeFloatLE(g, wi * 12 + 4)
        colorBuf.writeFloatLE(b, wi * 12 + 8)
      }

      wi++
    }

    // ── Monta buffer final ────────────────────────────────────────────────
    const hdrOut = Buffer.alloc(29)
    hdrOut.writeUInt32LE(wi, 0)
    hdrOut.writeUInt8(hasColor ? 1 : 0, 4)
    hdrOut.writeDoubleLE(cX, 5)
    hdrOut.writeDoubleLE(cY, 13)
    hdrOut.writeDoubleLE(cZ, 21)

    const parts = [hdrOut, posBuf.subarray(0, wi * 12)]
    if (colorBuf) parts.push(colorBuf.subarray(0, wi * 12))

    console.log(`[LAS] Preview: ${wi} pontos, formato ${pointFormat}, RGB=${hasColor}`)
    return Buffer.concat(parts)

  } catch (err) {
    console.error('[LAS] Erro ao parsear:', (err as Error).message)
    return null
  } finally {
    fs.closeSync(fd)
  }
}
