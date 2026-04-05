import { Router, Request, Response, NextFunction } from 'express'
import archiver from 'archiver'
import fs from 'fs'
import { prisma } from '../lib/prisma'
import { storage } from '../lib/storage'
import { freeTierGuard } from '../middleware/freeTier'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'

const router = Router()

// Todas as rotas exigem autenticação
router.use(requireAuth)

// POST /api/projects
router.post('/', freeTierGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body as { name?: string }
    if (!name?.trim()) {
      res.status(400).json({ error: 'Nome do projeto é obrigatório' })
      return
    }

    const project = await prisma.project.create({
      data: { name: name.trim(), userId: (req as AuthRequest).userId },
    })

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
    res.json(projects)
  } catch (err) {
    next(err)
  }
})

// GET /api/projects/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findFirst({
      where:   { id: req.params.id, userId: (req as AuthRequest).userId },
      include: { images: true },
    })

    if (!project) {
      res.status(404).json({ error: 'Projeto não encontrado' })
      return
    }
    res.json(project)
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

// GET /api/projects/:id/download
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

    const filename = `${project.name.replace(/[^a-z0-9]/gi, '_')}_mapa.zip`
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    const archive = archiver('zip', { zlib: { level: 6 } })
    archive.on('error', next)
    archive.pipe(res)
    archive.directory(outputDir, false)
    await archive.finalize()
  } catch (err) {
    next(err)
  }
})

// DELETE /api/projects/:id
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
