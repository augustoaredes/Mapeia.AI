import fs from 'fs'
import path from 'path'

const BASE = process.env.STORAGE_BASE_PATH ?? './storage'

export const storage = {
  uploadsDir(projectId: string): string {
    return path.resolve(BASE, 'uploads', projectId)
  },

  outputsDir(projectId: string): string {
    return path.resolve(BASE, 'outputs', projectId)
  },

  ensureUploadsDir(projectId: string): string {
    const dir = this.uploadsDir(projectId)
    fs.mkdirSync(dir, { recursive: true })
    return dir
  },

  ensureOutputsDir(projectId: string): string {
    const dir = this.outputsDir(projectId)
    fs.mkdirSync(dir, { recursive: true })
    return dir
  },

  outputZipPath(projectId: string): string {
    return path.resolve(BASE, 'outputs', projectId, 'result.zip')
  },

  outputExists(projectId: string): boolean {
    return fs.existsSync(this.outputZipPath(projectId))
  },
}

// TODO (Fase 4): substituir por implementação S3
// export const storage = new S3StorageProvider(...)
