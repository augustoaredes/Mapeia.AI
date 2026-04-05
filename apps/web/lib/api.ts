/**
 * Cliente da API Mapeia.AI.
 * Usa a API real quando NEXT_PUBLIC_API_URL estiver definida,
 * caso contrário cai no store localStorage (desenvolvimento sem backend).
 */
import { Project } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

function isApiAvailable(): boolean {
  return API_URL.length > 0
}

// ── Projetos ──

export async function apiCreateProject(name: string): Promise<Project> {
  const res = await fetch(`${API_URL}/api/projects`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao criar projeto')
  return normalizeProject(await res.json())
}

export async function apiGetProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/api/projects`)
  if (!res.ok) throw new Error('Erro ao carregar projetos')
  const data = await res.json()
  return data.map(normalizeProject)
}

export async function apiGetProject(id: string): Promise<Project | null> {
  const res = await fetch(`${API_URL}/api/projects/${id}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Erro ao carregar projeto')
  return normalizeProject(await res.json())
}

export async function apiDeleteProject(id: string): Promise<void> {
  await fetch(`${API_URL}/api/projects/${id}`, { method: 'DELETE' })
}

// ── Upload ──

export async function apiUploadImages(
  projectId: string,
  files: File[],
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    files.forEach((f) => form.append('images', f))

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}/api/projects/${projectId}/upload`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        try {
          reject(new Error(JSON.parse(xhr.responseText).error ?? 'Erro no upload'))
        } catch {
          reject(new Error('Erro no upload'))
        }
      }
    }

    xhr.onerror = () => reject(new Error('Falha na conexão'))
    xhr.send(form)
  })
}

// ── Normalização ──

function normalizeProject(raw: Record<string, unknown>): Project {
  return {
    id:           raw.id as string,
    name:         raw.name as string,
    status:       raw.status as Project['status'],
    imageCount:   (raw.imageCount ?? raw.image_count ?? raw._count?.images ?? 0) as number,
    createdAt:    raw.createdAt as string ?? raw.created_at as string,
    updatedAt:    raw.updatedAt as string ?? raw.updated_at as string,
    downloadUrl:  raw.status === 'completed'
      ? `${API_URL}/api/projects/${raw.id}/download`
      : undefined,
  }
}

export { isApiAvailable }
