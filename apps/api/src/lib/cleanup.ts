import fs from 'fs'
import { prisma } from './prisma'
import { storage } from './storage'

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // a cada 1 hora

async function deleteExpiredProjects(): Promise<void> {
  const now = new Date()

  const expired = await prisma.project.findMany({
    where: { expiresAt: { lt: now } },
    select: { id: true, name: true },
  })

  if (expired.length === 0) return

  console.log(`[Cleanup] Removendo ${expired.length} projeto(s) expirado(s)...`)

  for (const project of expired) {
    try {
      const uploadsDir = storage.uploadsDir(project.id)
      const outputsDir = storage.outputsDir(project.id)
      if (fs.existsSync(uploadsDir)) fs.rmSync(uploadsDir, { recursive: true, force: true })
      if (fs.existsSync(outputsDir)) fs.rmSync(outputsDir, { recursive: true, force: true })
    } catch (err) {
      console.error(`[Cleanup] Erro ao remover arquivos do projeto ${project.id}:`, err)
    }
  }

  const { count } = await prisma.project.deleteMany({
    where: { expiresAt: { lt: now } },
  })

  console.log(`[Cleanup] ${count} projeto(s) removido(s) do banco.`)
}

export function startCleanupJob(): void {
  // Executa imediatamente na inicialização e depois a cada hora
  deleteExpiredProjects().catch((err) =>
    console.error('[Cleanup] Erro na limpeza inicial:', err)
  )

  setInterval(() => {
    deleteExpiredProjects().catch((err) =>
      console.error('[Cleanup] Erro na limpeza periódica:', err)
    )
  }, CLEANUP_INTERVAL_MS)

  console.log('[Cleanup] Job de expiração de projetos iniciado (intervalo: 1h)')
}
