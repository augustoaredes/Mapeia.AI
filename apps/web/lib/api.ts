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

function authHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

// ── Projetos ──

export class FreeTierError extends Error {
  constructor() { super('Limite gratuito atingido'); this.name = 'FreeTierError' }
}

export async function apiCreateProject(name: string, token?: string): Promise<Project> {
  const res = await fetch(`${API_URL}/api/projects`, {
    method:  'POST',
    headers: authHeaders(token),
    body:    JSON.stringify({ name }),
  })
  if (res.status === 402) throw new FreeTierError()
  if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao criar projeto')
  return normalizeProject(await res.json())
}

export async function apiGetProjects(token?: string): Promise<Project[]> {
  const res = await fetch(`${API_URL}/api/projects`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.map(normalizeProject)
}

export const PROJECT_NOT_FOUND = 'NOT_FOUND' as const

export async function apiGetProject(id: string, token?: string): Promise<Project | null | typeof PROJECT_NOT_FOUND> {
  const res = await fetch(`${API_URL}/api/projects/${id}`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  })
  if (res.status === 404) return PROJECT_NOT_FOUND
  if (!res.ok) return null  // 401, 500, etc — ignora silenciosamente
  return normalizeProject(await res.json())
}

export async function apiDeleteProject(id: string, token?: string): Promise<void> {
  await fetch(`${API_URL}/api/projects/${id}`, {
    method: 'DELETE',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  })
}

export async function apiCancelProject(id: string, token?: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/projects/${id}/cancel`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Cancelamento falhou: ${res.status}`)
}

// ── Upload ──

export async function apiUploadImages(
  projectId: string,
  files: File[],
  onProgress?: (pct: number) => void,
  token?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    files.forEach((f) => form.append('images', f))

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}/api/projects/${projectId}/upload`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

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

// ── Usuário ──

export interface UserProfile {
  id: string
  name: string
  email: string
  planId: string
  projectCredits: number
  subscriptionStatus: string
  totalProjectsCreated: number
}

export async function apiGetMe(token?: string): Promise<UserProfile | null> {
  if (!token) return null
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

// ── Compartilhamento ──

export async function apiCreateShare(
  projectId: string,
  label?: string,
  token?: string,
): Promise<{ id: string; token: string; url: string; label: string | null; expiresAt: string | null }> {
  const res = await fetch(`${API_URL}/api/projects/${projectId}/share`, {
    method:  'POST',
    headers: authHeaders(token),
    body:    JSON.stringify({ label }),
  })
  if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao criar link')
  return res.json()
}

export async function apiGetShares(projectId: string, token?: string) {
  const res = await fetch(`${API_URL}/api/projects/${projectId}/shares`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) return []
  return res.json()
}

export async function apiDeleteShare(projectId: string, shareId: string, token?: string) {
  await fetch(`${API_URL}/api/projects/${projectId}/shares/${shareId}`, {
    method:  'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

export async function apiGetShareProject(shareToken: string) {
  const res = await fetch(`${API_URL}/api/share/token/${shareToken}`)
  if (!res.ok) return null
  return res.json() as Promise<{ project: Record<string, unknown>; share: { label: string | null; expiresAt: string | null; viewCount: number } }>
}

export function apiDownloadUrl(projectId: string, type: string) {
  return `${API_URL}/api/projects/${projectId}/download/${type}`
}

// ── Normalização ──

export function normalizeProject(raw: Record<string, unknown>): Project {
  return {
    id:          raw.id as string,
    name:        raw.name as string,
    status:      raw.status as Project['status'],
    imageCount:  (raw.imageCount ?? raw.image_count ?? (raw._count as Record<string, unknown>)?.images ?? 0) as number,
    createdAt:   (raw.createdAt ?? raw.created_at) as string,
    updatedAt:   (raw.updatedAt ?? raw.updated_at) as string,
    downloadUrl: raw.status === 'completed'
      ? `${API_URL}/api/projects/${raw.id}/download`
      : undefined,
    // tilesUrl/dsmTilesUrl vêm como path relativo (/api/...) — prefixamos com API_URL do backend
    tilesUrl:        raw.tilesUrl    ? `${API_URL}${raw.tilesUrl    as string}` : undefined,
    dsmTilesUrl:     raw.dsmTilesUrl ? `${API_URL}${raw.dsmTilesUrl as string}` : undefined,
    progress:        (raw.progress as number) ?? 0,
    phase:           (raw.phase as string | null) ?? null,
    tileBounds:      raw.tileBounds as [[number, number], [number, number]] | undefined,
    processingInfo:  raw.processingInfo as Project['processingInfo'] ?? null,
    deliverables:    raw.deliverables as Project['deliverables'] ?? undefined,
    fileSizes:       raw.fileSizes as Project['fileSizes'] ?? undefined,
  }
}

export { isApiAvailable }
