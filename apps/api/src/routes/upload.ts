import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import { prisma } from '../lib/prisma'
import { storage } from '../lib/storage'

const router = Router()

// Configuração do multer — salva em disco, organizado por project_id
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = storage.ensureUploadsDir(req.params.id)
      cb(null, dir)
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname)
      const base = path.basename(file.originalname, ext)
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()
      cb(null, `${base}_${Date.now()}${ext}`)
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Apenas imagens JPG e PNG são aceitas'))
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB por arquivo
    files: 1000,
  },
})

// POST /api/projects/:id/upload — enviar imagens para um projeto
router.post(
  '/:id/upload',
  upload.array('images', 1000),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      })

      if (!project) {
        res.status(404).json({ error: 'Projeto não encontrado' })
        return
      }

      const files = req.files as Express.Multer.File[]

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'Nenhuma imagem enviada' })
        return
      }

      // Persiste cada imagem no banco
      await prisma.image.createMany({
        data: files.map((f) => ({
          projectId: project.id,
          filename:  f.originalname,
          path:      f.path,
          size:      f.size,
        })),
      })

      // Atualiza contagem e status do projeto
      const imageCount = await prisma.image.count({
        where: { projectId: project.id },
      })

      const updated = await prisma.project.update({
        where: { id: project.id },
        data:  { imageCount, status: 'uploading' },
      })

      // TODO (Fase 5): disparar job na fila BullMQ aqui
      // await processingQueue.add('process', { projectId: project.id })

      res.status(201).json({
        project: updated,
        uploaded: files.length,
        total: imageCount,
      })
    } catch (err) {
      next(err)
    }
  }
)

export default router
