export type ProjectStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface ProcessingInfo {
  engine: string
  generatedAt: string | null
  imageCount: number
  has3dModel: boolean
  hasTiles: boolean
  hasDsm: boolean
  hasDtm: boolean
  hasPointcloud: boolean
  isThermal: boolean
  cameraMake: string | null
  cameraModel: string | null
  gsdCm: number | null
  zoomRange: { min: number; max: number } | null
  areaHa: number | null
}

export interface Deliverables {
  orthophoto: boolean
  dsm: boolean
  dtm: boolean
  pointcloud: boolean
  model3d: boolean
  tiles: boolean
  dsmTiles: boolean
}

export interface ProjectShare {
  id: string
  token: string
  url: string
  label: string | null
  expiresAt: string | null
  viewCount: number
  expired: boolean
}

export interface Project {
  id: string
  name: string
  status: ProjectStatus
  imageCount: number
  progress: number
  phase: string | null
  createdAt: string
  updatedAt: string
  downloadUrl?: string
  tilesUrl?: string
  dsmTilesUrl?: string
  tileBounds?: [[number, number], [number, number]] // [[minLat,minLng],[maxLat,maxLng]]
  processingInfo?: ProcessingInfo | null
  errorMessage?: string
  deliverables?: Deliverables
  fileSizes?: Record<string, number>
}
