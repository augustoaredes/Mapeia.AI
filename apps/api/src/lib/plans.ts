/**
 * Configuração centralizada de planos — usada no billing, freeTier e upload.
 */

export interface PlanConfig {
  label: string
  imageLimit: number      // máx imagens por projeto (-1 = ilimitado)
  projectsUnlimited: boolean
  recurring: boolean
  priorityQueue: boolean
  storagedays: number    // dias de retenção dos outputs
}

export const PLAN_CONFIG: Record<string, PlanConfig> = {
  free: {
    label: 'Gratuito',
    imageLimit: 150,
    projectsUnlimited: false,
    recurring: false,
    priorityQueue: false,
    storagedays: 3,
  },
  avulso_150: {
    label: 'Avulso 150',
    imageLimit: 150,
    projectsUnlimited: false,
    recurring: false,
    priorityQueue: false,
    storagedays: 7,
  },
  avulso_400: {
    label: 'Avulso 400',
    imageLimit: 400,
    projectsUnlimited: false,
    recurring: false,
    priorityQueue: false,
    storagedays: 7,
  },
  avulso_1200: {
    label: 'Avulso 1200',
    imageLimit: 1200,
    projectsUnlimited: false,
    recurring: false,
    priorityQueue: false,
    storagedays: 7,
  },
  starter: {
    label: 'Starter',
    imageLimit: 500,
    projectsUnlimited: true,
    recurring: true,
    priorityQueue: false,
    storagedays: 30,
  },
  pro: {
    label: 'Pro',
    imageLimit: 1000,
    projectsUnlimited: true,
    recurring: true,
    priorityQueue: true,
    storagedays: 90,
  },
  business: {
    label: 'Business',
    imageLimit: 3000,
    projectsUnlimited: true,
    recurring: true,
    priorityQueue: true,
    storagedays: 365,
  },
}

export function getPlanConfig(planId: string): PlanConfig {
  return PLAN_CONFIG[planId] ?? PLAN_CONFIG['free']
}

/** Converte imageLimit em hectares aproximados (para copy no frontend) */
export function imagesToHectares(imageCount: number): string {
  // Regra prática: ~5-8 fotos/ha em voo de 70m de altitude com sobreposição 80%
  const ha = Math.round(imageCount / 6)
  return `≈ ${ha} ha`
}
