/**
 * Mock store usando localStorage.
 * Quando o backend (Fase 3) estiver pronto, substituir pelas chamadas à API.
 */
import { Project, ProjectStatus } from './types'

const STORAGE_KEY = 'mapeia_projects'

export function getProjects(): Project[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function getProject(id: string): Project | null {
  return getProjects().find((p) => p.id === id) ?? null
}

export function createProject(name: string, imageCount: number): Project {
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    status: 'pending',
    imageCount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const projects = getProjects()
  projects.unshift(project)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  return project
}

export function updateProject(id: string, patch: Partial<Project>): void {
  const projects = getProjects()
  const idx = projects.findIndex((p) => p.id === id)
  if (idx === -1) return
  projects[idx] = { ...projects[idx], ...patch, updatedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export function updateProjectStatus(id: string, status: ProjectStatus): void {
  updateProject(id, {
    status,
    ...(status === 'completed' ? { downloadUrl: `/api/projects/${id}/download` } : {}),
  })
}

export function deleteProject(id: string): void {
  const projects = getProjects().filter((p) => p.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

/** Simula o ciclo de processamento (será substituído pelo worker real na Fase 5). */
export function simulateProcessing(id: string): void {
  updateProjectStatus(id, 'uploading')
  setTimeout(() => {
    updateProjectStatus(id, 'processing')
    setTimeout(() => {
      updateProjectStatus(id, 'completed')
    }, 8000)
  }, 2000)
}
