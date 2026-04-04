export type ProjectStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed'

export interface Project {
  id: string
  name: string
  status: ProjectStatus
  imageCount: number
  createdAt: string
  updatedAt: string
  downloadUrl?: string
  errorMessage?: string
}
