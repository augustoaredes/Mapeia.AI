import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import { prisma } from '../lib/prisma'
import { storage } from '../lib/storage'
import { processingQueue } from '../lib/queue'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'
import { getPlanConfig } from '../lib/plans'

const router = Router()
router.use(requireAuth)

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = storage.ensureUploadsDir(req.params.id)
      cb(null, dir)
    },
    filename: (_req, file, cb) => {
      const ext  = path.extname(file.originalname)
      const base = path.basename(file.originalname, ext)
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()
      cb(null, `${base}_${Date.now()}${ext}`)
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Apenas imagens JPG e PNG são aceitas'))
    }
  },
  limits: { fileSize: 50 * 1024 * 1024, files: 1000 },
})

// POST /api/projects/:id/upload
router.post(
  '/:id/upload',
  upload.array('images', 1000),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await prisma.project.findFirst({
        where: { id: req.params.id, userId: (req as AuthRequest).userId },
      })

      if (!project) {
        res.status(404).json({ error: 'Projeto não encontrado' })
        return
      }

      const files = req.files as Express.Multer.File[]
      if (!files?.length) {
        res.status(400).json({ error: 'Nenhuma imagem enviada' })
        return
      }

      // Verifica limite de imagens do plano
      const user = await prisma.user.findUnique({
        where:  { id: (req as AuthRequest).userId },
        select: { planId: true },
      })
      const planConfig = getPlanConfig(user?.planId ?? 'free')
      if (planConfig.imageLimit > 0 && files.length > planConfig.imageLimit) {
        res.status(402).json({
          error:   `Seu plano permite até ${planConfig.imageLimit} imagens por projeto`,
          code:    'IMAGE_LIMIT_EXCEEDED',
          limit:   planConfig.imageLimit,
          sent:    files.length,
          upgrade: '/upgrade',
        })
        return
      }

      // Persiste as imagens no banco
      await prisma.image.createMany({
        data: files.map((f) => ({
          projectId: project.id,
          filename:  f.originalname,
          path:      f.path,
          size:      f.size,
        })),
      })

      const imageCount = await prisma.image.count({ where: { projectId: project.id } })

      const updated = await prisma.project.update({
        where: { id: project.id },
        data:  { imageCount, status: 'uploading' },
      })

      // Dispara o job de processamento na fila BullMQ
      const job = await processingQueue.add(
        'process',
        { projectId: project.id },
        { jobId: project.id } // idempotente: evita duplicatas
      )

      console.log(`[Upload] Job ${job.id} adicionado à fila para projeto ${project.id}`)

      res.status(201).json({
        project: updated,
        uploaded: files.length,
        total:    imageCount,
        jobId:    job.id,
      })
    } catch (err) {
      next(err)
    }
  }
)

export default router
