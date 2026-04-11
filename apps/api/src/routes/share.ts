import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { storage } from '../lib/storage'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'
import { projectWithTilesUrl } from './projects'
import fs from 'fs'
import path from 'path'

const router = Router()

const SHARE_TTL_DAYS = 30 // links expiram em 30 dias por padrão

// ── Rotas autenticadas (dono do projeto) ────────────────────────────────────

// POST /api/projects/:id/share — cria link de compartilhamento
router.post('/:id/share', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: (req as AuthRequest).userId, status: 'completed' },
    })
    if (!project) {
      res.status(404).json({ error: 'Projeto não encontrado ou não concluído' })
      return
    }

    const { label, expiresInDays } = req.body as { label?: string; expiresInDays?: number }
    const days     = expiresInDays ?? SHARE_TTL_DAYS
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

    const share = await prisma.projectShare.create({
      data: {
        projectId: project.id,
        label:     label?.trim() || null,
        expiresAt,
      },
    })

    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
    res.status(201).json({
      id:        share.id,
      token:     share.token,
      url:       `${baseUrl}/s/${share.token}`,
      label:     share.label,
      expiresAt: share.expiresAt,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/projects/:id/shares — lista compartilhamentos do projeto
router.get('/:id/shares', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: (req as AuthRequest).userId },
    })
    if (!project) { res.status(404).json({ error: 'Projeto não encontrado' }); return }

    const shares = await prisma.projectShare.findMany({
      where:   { projectId: project.id },
      orderBy: { createdAt: 'desc' },
    })

    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
    res.json(shares.map((s: any) => ({
      ...s,
      url:     `${baseUrl}/s/${s.token}`,
      expired: s.expiresAt ? s.expiresAt < new Date() : false,
    })))
  } catch (err) {
    next(err)
  }
})

// DELETE /api/projects/:id/shares/:shareId — revoga compartilhamento
router.delete('/:id/shares/:shareId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: (req as AuthRequest).userId },
    })
    if (!project) { res.status(404).json({ error: 'Projeto não encontrado' }); return }

    const deleted = await prisma.projectShare.deleteMany({
      where: { id: req.params.shareId, projectId: project.id },
    })
    if (deleted.count === 0) { res.status(404).json({ error: 'Link não encontrado' }); return }

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ── Rota pública (sem autenticação) ────────────────────────────────────────

// GET /api/share/:token — retorna dados públicos do projeto
router.get('/token/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const share = await prisma.projectShare.findUnique({
      where:   { token: req.params.token },
      include: { project: { include: { _count: { select: { images: true } } } } },
    })

    if (!share) { res.status(404).json({ error: 'Link não encontrado' }); return }

    if (share.expiresAt && share.expiresAt < new Date()) {
      res.status(410).json({ error: 'Link expirado' }); return
    }

    // Incrementa contador de visualizações (sem await para não bloquear)
    prisma.projectShare.update({
      where: { id: share.id },
      data:  { viewCount: { increment: 1 } },
    }).catch(() => {})

    const projectData = projectWithTilesUrl(share.project as unknown as Record<string, unknown>)

    res.json({
      project: projectData,
      share: {
        label:     share.label,
        expiresAt: share.expiresAt,
        viewCount: share.viewCount + 1,
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/share/:token/thumbnail — thumbnail público para preview social
router.get('/token/:token/thumbnail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const share = await prisma.projectShare.findUnique({ where: { token: req.params.token } })
    if (!share || (share.expiresAt && share.expiresAt < new Date())) {
      res.status(404).end(); return
    }

    const thumbPath = path.join(storage.outputsDir(share.projectId), 'thumbnail.jpg')
    if (!fs.existsSync(thumbPath)) { res.status(404).end(); return }

    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    fs.createReadStream(thumbPath).pipe(res)
  } catch (err) {
    next(err)
  }
})

export default router
export { router as shareRouter }
