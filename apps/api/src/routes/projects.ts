import { Router, Request, Response, NextFunction } from 'express'
import archiver from 'archiver'
import fs from 'fs'
import { prisma } from '../lib/prisma'
import { storage } from '../lib/storage'
import { freeTierGuard } from '../middleware/freeTier'

const router = Router()

// POST /api/projects — criar projeto (bloqueado ao atingir limite grátis)
router.post('/', freeTierGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body as { name?: string }
    if (!name?.trim()) {
      res.status(400).json({ error: 'Nome do projeto é obrigatório' })
      return
    }

    const project = await prisma.project.create({
      data: { name: name.trim() },
    })

    res.status(201).json(project)
  } catch (err) {
    next(err)
  }
})

// GET /api/projects — listar projetos
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { images: true } } },
    })
    res.json(projects)
  } catch (err) {
    next(err)
  }
})

// GET /api/projects/:id — detalhe do projeto
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
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

// PATCH /api/projects/:id/status — atualizar status (usado pelo worker)
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status?: string }
    const allowed = ['pending', 'uploading', 'processing', 'completed', 'failed']

    if (!status || !allowed.includes(status)) {
      res.status(400).json({ error: `Status inválido. Use: ${allowed.join(', ')}` })
      return
    }

    const project = await prisma.project.update({
      where: { id: req.params.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { status: status as any },
    })

    res.json(project)
  } catch (err) {
    next(err)
  }
})

// GET /api/projects/:id/download — download do resultado em .zip
router.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
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

// DELETE /api/projects/:id — excluir projeto
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
