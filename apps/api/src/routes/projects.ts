import { Router, Request, Response, NextFunction } from 'express'
import archiver from 'archiver'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma'
import { storage } from '../lib/storage'
import { freeTierGuard } from '../middleware/freeTier'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'

// Lê o BoundingBox do tilemapresource.xml e retorna [[minLat,minLng],[maxLat,maxLng]]
function parseTileBounds(tilesDir: string): [[number, number], [number, number]] | null {
  const xmlPath = path.join(tilesDir, 'tilemapresource.xml')
  if (!fs.existsSync(xmlPath)) return null
  try {
    const xml   = fs.readFileSync(xmlPath, 'utf8')
    const match = xml.match(/BoundingBox[^/]*minx="([^"]+)"[^/]*miny="([^"]+)"[^/]*maxx="([^"]+)"[^/]*maxy="([^"]+)"/)
    if (!match) return null
    const [, minx, miny, maxx, maxy] = match.map(Number)
    return [[miny, minx], [maxy, maxx]]
  } catch {
    return null
  }
}

// Calcula zoom levels disponíveis nos tiles
function getTileZoomRange(tilesDir: string): { min: number; max: number } | null {
  try {
    const entries = fs.readdirSync(tilesDir).filter(f => /^\d+$/.test(f))
    if (entries.length === 0) return null
    const levels = entries.map(Number).sort((a, b) => a - b)
    return { min: levels[0], max: levels[levels.length - 1] }
  } catch {
    return null
  }
}

// Calcula área em hectares a partir dos bounds geográficos
function computeAreaHa(bounds: [[number, number], [number, number]]): number {
  const [[minLat, minLng], [maxLat, maxLng]] = bounds
  const midLat = (minLat + maxLat) / 2
  const latKm  = Math.abs(maxLat - minLat) * 111.32
  const lngKm  = Math.abs(maxLng - minLng) * 111.32 * Math.cos((midLat * Math.PI) / 180)
  return Math.round(latKm * lngKm * 100 * 100) / 100 // m² → ha
}

// Lê o manifest.json do projeto
function readManifest(outputDir: string): Record<string, unknown> | null {
  const manifestPath = path.join(outputDir, 'manifest.json')
  if (!fs.existsSync(manifestPath)) return null
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  } catch {
    return null
  }
}

// Verifica se o diretório de tiles tem conteúdo real (além do XML)
function hasTilesContent(tilesDir: string): boolean {
  if (!fs.existsSync(tilesDir)) return false
  return fs.readdirSync(tilesDir).filter(f => f !== 'tilemapresource.xml').length > 0
}

// tilesUrl usa apenas o path — o frontend prefixa com NEXT_PUBLIC_API_URL
export function projectWithTilesUrl(project: Record<string, unknown>) {
  const outputDir   = storage.outputsDir(project.id as string)
  const tilesDir    = path.join(outputDir, 'tiles')
  const dsmTilesDir = path.join(outputDir, 'dsm-tiles')
  const hasTiles    = hasTilesContent(tilesDir)
  const hasDsmTiles = hasTilesContent(dsmTilesDir)
  const hasDsm      = fs.existsSync(path.join(outputDir, 'dsm.tif'))

  const manifest   = readManifest(outputDir)
  const tileBounds = hasTiles ? parseTileBounds(tilesDir) : null
  const zoomRange  = hasTiles ? getTileZoomRange(tilesDir) : null
  const areaHa     = tileBounds ? computeAreaHa(tileBounds) : null

  const hasDtm        = fs.existsSync(path.join(outputDir, 'dtm.tif'))
  const hasPointcloud = fs.existsSync(path.join(outputDir, 'pointcloud.laz')) ||
                        fs.existsSync(path.join(outputDir, 'pointcloud.las'))

  const deliverables = {
    orthophoto:  fs.existsSync(path.join(outputDir, 'odm_orthophoto.tif')),
    dsm:         hasDsm,
    dtm:         hasDtm,
    pointcloud:  hasPointcloud,
    model3d:     fs.existsSync(path.join(outputDir, 'model_3d')),
    tiles:       hasTiles,
    dsmTiles:    hasDsmTiles,
  }

  const fileSizes = (manifest?.file_sizes ?? {}) as Record<string, number>

  const base = {
    ...project,
    progress:    project.progress ?? 0,
    phase:       project.phase ?? null,
    deliverables,
    fileSizes,
  }

  if (!hasTiles) return { ...base, tilesUrl: null, dsmTilesUrl: null, tileBounds: null, processingInfo: null }

  return {
    ...base,
    tilesUrl:    `/api/projects/${project.id}/tiles/{z}/{x}/{y}.png`,
    dsmTilesUrl: hasDsmTiles ? `/api/projects/${project.id}/dsm-tiles/{z}/{x}/{y}.png` : null,
    tileBounds,
    processingInfo: {
      engine:       manifest?.engine ?? 'Mapeia.AI Processing',
      generatedAt:  manifest?.generated_at ?? null,
      imageCount:   manifest?.image_count ?? project.imageCount,
      has3dModel:   manifest?.has_3d_model ?? false,
      hasTiles:     true,
      hasDsm:       hasDsm || (manifest?.has_dsm as boolean) || false,
      hasDtm:       hasDtm || (manifest?.has_dtm as boolean) || false,
      hasPointcloud: hasPointcloud || (manifest?.has_pointcloud as boolean) || false,
      isThermal:    (manifest?.is_thermal as boolean)  ?? false,
      cameraMake:   (manifest?.camera_make  as string) ?? null,
      cameraModel:  (manifest?.camera_model as string) ?? null,
      gsdCm:        (manifest?.gsd_cm as number | null) ?? null,
      zoomRange,
      areaHa,
    },
  }
}

const router = Router()

// ── Rota pública: tiles do ortomosaico (Leaflet não suporta headers) ────────
// Segurança por obscuridade: project ID é UUID aleatório
router.get('/:id/tiles/:z/:x/:y', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, z, x, y } = req.params

    // gdal2tiles gera tiles TMS (y invertido). Converte XYZ → TMS no servidor
    // para que o Leaflet use coordenadas XYZ padrão sem precisar de tms:true
    const zNum   = parseInt(z, 10)
    const yClean = y.replace('.png', '')
    const yTms   = Math.pow(2, zNum) - 1 - parseInt(yClean, 10)
    const tilePath = path.join(storage.outputsDir(id), 'tiles', z, x, `${yTms}.png`)

    if (!fs.existsSync(tilePath)) {
      res.status(204).end()
      return
    }

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    fs.createReadStream(tilePath).pipe(res)
  } catch (err) {
    next(err)
  }
})

// ── Rota pública: tiles do DSM ──────────────────────────────────────────────
router.get('/:id/dsm-tiles/:z/:x/:y', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, z, x, y } = req.params

    // gdal2tiles gera tiles TMS (y invertido). Converte XYZ → TMS
    const zNum   = parseInt(z, 10)
    const yClean = y.replace('.png', '')
    const yTms   = Math.pow(2, zNum) - 1 - parseInt(yClean, 10)
    const tilePath = path.join(storage.outputsDir(id), 'dsm-tiles', z, x, `${yTms}.png`)

    if (!fs.existsSync(tilePath)) {
      res.status(204).end()
      return
    }

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    fs.createReadStream(tilePath).pipe(res)
  } catch (err) {
    next(err)
  }
})

// ── Rota pública: thumbnail do ortomosaico ───────────────────────────────────
router.get('/:id/thumbnail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const tilesDir = path.join(storage.outputsDir(id), 'tiles')

    if (!hasTilesContent(tilesDir)) { res.status(404).end(); return }

    // Preferência: thumbnail.jpg gerado durante processamento
    const thumbJpg = path.join(storage.outputsDir(id), 'thumbnail.jpg')
    if (fs.existsSync(thumbJpg)) {
      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=3600')
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
      fs.createReadStream(thumbJpg).pipe(res)
      return
    }

    // Fallback: tile central calculado pelo bounding box do ortomosaico
    const bounds = parseTileBounds(tilesDir)
    if (!bounds) { res.status(404).end(); return }

    const zoomLevels = fs.readdirSync(tilesDir)
      .filter(f => /^\d+$/.test(f))
      .map(Number)
      .sort((a, b) => a - b)

    if (zoomLevels.length === 0) { res.status(404).end(); return }

    const [[minLat, minLng], [maxLat, maxLng]] = bounds
    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2

    // Converte lat/lng para coordenadas de tile (TMS)
    function lngLatToTile(lat: number, lng: number, z: number) {
      const n    = Math.pow(2, z)
      const tileX = Math.floor((lng + 180) / 360 * n)
      const latR  = lat * Math.PI / 180
      const tileY_web = Math.floor((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n)
      const tileY_tms = n - 1 - tileY_web
      return { x: tileX, y: tileY_tms }
    }

    // Usa o zoom mais alto onde o tile central existe no disco
    let tilePath = ''
    for (let i = zoomLevels.length - 1; i >= 0; i--) {
      const z     = zoomLevels[i]
      const { x, y } = lngLatToTile(centerLat, centerLng, z)
      const candidate = path.join(tilesDir, String(z), String(x), `${y}.png`)
      if (fs.existsSync(candidate) && fs.statSync(candidate).size > 1000) {
        tilePath = candidate
        break
      }
    }

    if (!tilePath) { res.status(404).end(); return }
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    fs.createReadStream(tilePath).pipe(res)
  } catch (err) {
    next(err)
  }
})

// ── Rota pública: lista arquivos do modelo 3D ────────────────────────────────
router.get('/:id/model3d', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const modelDir = path.join(storage.outputsDir(req.params.id), 'model_3d')
    if (!fs.existsSync(modelDir)) { res.status(404).json({ error: 'Modelo 3D não disponível' }); return }
    const files = fs.readdirSync(modelDir).filter(f => !f.startsWith('.'))
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.json({ files })
  } catch (err) { next(err) }
})

// ── Rota pública: serve arquivo individual do modelo 3D ──────────────────────
router.get('/:id/model3d/file/:filename', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, filename } = req.params
    // Previne path traversal
    if (filename.includes('..') || filename.includes('/')) { res.status(400).end(); return }

    const filePath = path.join(storage.outputsDir(id), 'model_3d', filename)
    if (!fs.existsSync(filePath)) { res.status(404).end(); return }

    const ext = path.extname(filename).toLowerCase()
    const mime: Record<string, string> = {
      '.obj': 'text/plain', '.mtl': 'text/plain',
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.tif': 'image/tiff',
    }
    res.setHeader('Content-Type', mime[ext] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    fs.createReadStream(filePath).pipe(res)
  } catch (err) { next(err) }
})

// ── Rota pública: preview binário da nuvem de pontos ────────────────────────
router.get('/:id/pointcloud/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const previewPath = path.join(storage.outputsDir(req.params.id), 'pointcloud_preview.bin')
    if (!fs.existsSync(previewPath)) { res.status(404).json({ error: 'Preview não disponível' }); return }

    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    fs.createReadStream(previewPath).pipe(res)
  } catch (err) { next(err) }
})

// Todas as rotas abaixo exigem autenticação
router.use(requireAuth)

const PROJECT_TTL_MS = 3 * 24 * 60 * 60 * 1000 // 3 dias

// POST /api/projects
router.post('/', freeTierGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body as { name?: string }
    if (!name?.trim()) {
      res.status(400).json({ error: 'Nome do projeto é obrigatório' })
      return
    }

    const userId    = (req as AuthRequest).userId
    const expiresAt = new Date(Date.now() + PROJECT_TTL_MS)

    const [project] = await prisma.$transaction([
      prisma.project.create({
        data: { name: name.trim(), userId, expiresAt },
      }),
      prisma.user.update({
        where: { id: userId },
        data:  { totalProjectsCreated: { increment: 1 } },
      }),
    ])

    res.status(201).json(project)
  } catch (err) {
    next(err)
  }
})

// GET /api/projects
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId
    const projects = await prisma.project.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { images: true } } },
    })
    res.json(projects.map((p: unknown) => projectWithTilesUrl(p as Record<string, unknown>)))
  } catch (err) {
    next(err)
  }
})

// GET /api/projects/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findFirst({
      where:   { id: req.params.id, userId: (req as AuthRequest).userId },
      include: { images: true, _count: { select: { images: true } } },
    })

    if (!project) {
      res.status(404).json({ error: 'Projeto não encontrado' })
      return
    }
    res.json(projectWithTilesUrl(project as unknown as Record<string, unknown>))
  } catch (err) {
    next(err)
  }
})

// PATCH /api/projects/:id/status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status?: string }
    const allowed = ['pending', 'uploading', 'processing', 'completed', 'failed']

    if (!status || !allowed.includes(status)) {
      res.status(400).json({ error: `Status inválido. Use: ${allowed.join(', ')}` })
      return
    }

    const project = await prisma.project.updateMany({
      where: { id: req.params.id, userId: (req as AuthRequest).userId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data:  { status: status as any },
    })

    if (project.count === 0) {
      res.status(404).json({ error: 'Projeto não encontrado' })
      return
    }

    res.json({ updated: true })
  } catch (err) {
    next(err)
  }
})

// ── Downloads individuais por entregável ────────────────────────────────────
const DELIVERABLES: Record<string, { file: string; mime: string; label: string }> = {
  orthophoto:  { file: 'odm_orthophoto.tif', mime: 'image/tiff',        label: 'ortomosaico' },
  dsm:         { file: 'dsm.tif',            mime: 'image/tiff',        label: 'mds' },
  dtm:         { file: 'dtm.tif',            mime: 'image/tiff',        label: 'mdt' },
  pointcloud:  { file: 'pointcloud.laz',     mime: 'application/octet-stream', label: 'nuvem_pontos' },
  model3d:     { file: 'model_3d',           mime: 'application/zip',   label: 'modelo_3d' },
}

router.get('/:id/download/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, type } = req.params
    const deliverable   = DELIVERABLES[type]
    if (!deliverable) {
      res.status(400).json({ error: 'Tipo de entregável inválido' })
      return
    }

    const project = await prisma.project.findFirst({
      where: { id, userId: (req as AuthRequest).userId },
    })
    if (!project || project.status !== 'completed') {
      res.status(404).json({ error: 'Projeto não encontrado ou não concluído' })
      return
    }

    const outputDir  = storage.outputsDir(id)
    const slug       = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()

    // Modelo 3D: empacota a pasta como ZIP
    if (type === 'model3d') {
      const modelDir = path.join(outputDir, 'model_3d')
      if (!fs.existsSync(modelDir)) { res.status(404).json({ error: 'Modelo 3D não disponível' }); return }
      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', `attachment; filename="${slug}_modelo3d.zip"`)
      const archive = archiver('zip', { zlib: { level: 6 } })
      archive.on('error', next)
      archive.pipe(res)
      archive.directory(modelDir, false)
      await archive.finalize()
      return
    }

    // Nuvem de pontos: tenta LAZ depois LAS
    if (type === 'pointcloud') {
      const lazPath = path.join(outputDir, 'pointcloud.laz')
      const lasPath = path.join(outputDir, 'pointcloud.las')
      const pcPath  = fs.existsSync(lazPath) ? lazPath : fs.existsSync(lasPath) ? lasPath : null
      if (!pcPath) { res.status(404).json({ error: 'Nuvem de pontos não disponível' }); return }
      const ext = path.extname(pcPath).slice(1)
      res.setHeader('Content-Type', 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${slug}_nuvem_pontos.${ext}"`)
      res.setHeader('Cache-Control', 'private, max-age=3600')
      fs.createReadStream(pcPath).pipe(res)
      return
    }

    // Arquivos GeoTIFF individuais
    const filePath = path.join(outputDir, deliverable.file)
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: `${deliverable.label} não disponível para este projeto` })
      return
    }
    const ext = path.extname(deliverable.file)
    res.setHeader('Content-Type', deliverable.mime)
    res.setHeader('Content-Disposition', `attachment; filename="${slug}_${deliverable.label}${ext}"`)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    fs.createReadStream(filePath).pipe(res)
  } catch (err) {
    next(err)
  }
})

// GET /api/projects/:id/download — pacote completo (ZIP)
router.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: (req as AuthRequest).userId },
    })

    if (!project) {
      res.status(404).json({ error: 'Projeto não encontrado' })
      return
    }

    if (project.status !== 'completed') {
      res.status(400).json({ error: 'O projeto ainda não foi processado' })
      return
    }

    const outputDir = storage.outputsDir(project.id)
    if (!fs.existsSync(outputDir)) {
      res.status(404).json({ error: 'Arquivos de saída não encontrados' })
      return
    }

    const filename = `${project.name.replace(/[^a-z0-9]/gi, '_')}_mapeia_ai.zip`
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    const archive = archiver('zip', { zlib: { level: 6 } })
    archive.on('error', next)
    archive.pipe(res)
    // Exclui workdir e arquivos intermediários do ZIP
    archive.glob('**/*', {
      cwd:    outputDir,
      ignore: ['odm_workdir/**', 'dsm_byte.tif', '*.log'],
    })
    await archive.finalize()
  } catch (err) {
    next(err)
  }
})

// DELETE /api/projects/:id
// POST /api/projects/:id/cancel — cancela um projeto em processamento
router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await prisma.project.updateMany({
      where: {
        id:     req.params.id,
        userId: (req as AuthRequest).userId,
        status: { in: ['pending', 'uploading', 'processing'] },
      },
      data: { status: 'cancelled' },
    })

    if (updated.count === 0) {
      res.status(404).json({ error: 'Projeto não encontrado ou já finalizado' })
      return
    }
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await prisma.project.deleteMany({
      where: { id: req.params.id, userId: (req as AuthRequest).userId },
    })

    if (deleted.count === 0) {
      res.status(404).json({ error: 'Projeto não encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
