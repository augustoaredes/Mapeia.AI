/**
 * detectThermal — detecta câmeras térmicas via EXIF das imagens carregadas.
 *
 * Fabricantes suportados:
 *   • FLIR (One, One Pro, Vue, Tau, Boson, Lepton, AX8, série E)
 *   • DJI Zenmuse XT / XT2 / ZH20T, M2EA, Mavic 3T, H20T
 *   • Parrot Anafi Thermal
 *   • Yuneec H520T / CGO-ET
 */

import fs from 'fs'
import path from 'path'
import ExifReader from 'exifreader'

// Modelos conhecidos de câmeras térmicas (case-insensitive)
const THERMAL_MAKES   = ['flir']
const THERMAL_MODELS  = [
  // DJI thermal
  'xt', 'xt2', 'zh20t', 'h20t', 'm2ea', 'mavic 3t', 'zenmuse',
  // Parrot
  'anafi thermal', 'anafi-thermal',
  // Yuneec
  'h520t', 'cgo-et',
  // FLIR standalone (make já pega, mas por segurança)
  'flir',
]

export interface ThermalDetectionResult {
  isThermal: boolean
  cameraModel: string | null
  cameraMake: string | null
  /** Flags extras para o ODM */
  odmFlags: string[]
}

/**
 * Analisa até `sampleSize` imagens do diretório e retorna
 * se o conjunto é térmico, qual câmera foi detectada e os flags ODM.
 */
export async function detectThermal(
  inputDir: string,
  sampleSize = 3,
): Promise<ThermalDetectionResult> {
  const images = fs.existsSync(inputDir)
    ? fs.readdirSync(inputDir)
        .filter(f => /\.(jpg|jpeg|png|tiff?|r\.jpe?g)$/i.test(f))
        .slice(0, sampleSize)
    : []

  for (const img of images) {
    const imgPath = path.join(inputDir, img)
    try {
      const buf  = fs.readFileSync(imgPath)
      const tags = ExifReader.load(buf, { expanded: true })

      const make  = (tags.exif?.Make?.description  ?? (tags as any).makerNotes?.Make?.description  ?? '').toLowerCase()
      const model = (tags.exif?.Model?.description ?? (tags as any).makerNotes?.Model?.description ?? '').toLowerCase()

      // Detecta pelo fabricante
      const matchedMake = THERMAL_MAKES.find(m => make.includes(m))
      // Detecta pelo modelo
      const matchedModel = THERMAL_MODELS.find(m => model.includes(m))

      if (matchedMake || matchedModel) {
        const rawMake  = tags.exif?.Make?.description  ?? null
        const rawModel = tags.exif?.Model?.description ?? null

        console.log(`[Thermal] Câmera térmica detectada: ${rawMake} ${rawModel}`)

        return {
          isThermal:   true,
          cameraMake:  rawMake,
          cameraModel: rawModel,
          odmFlags: buildOdmFlags(make, model),
        }
      }
    } catch {
      // Imagem sem EXIF ou corrompida — ignora e passa para a próxima
    }
  }

  return { isThermal: false, cameraMake: null, cameraModel: null, odmFlags: [] }
}

function buildOdmFlags(make: string, model: string): string[] {
  const flags: string[] = ['--radiometric-calibration', 'camera']

  // FLIR: algumas câmeras têm dados de temperatura raw no canal extra
  if (make.includes('flir')) {
    flags.push('--skip-report')
  }

  // DJI XT/XT2: resolução baixa (160×120 ou 640×512) — precisa de menos features
  if (model.includes('xt') || model.includes('zh20') || model.includes('h20t')) {
    flags.push('--min-num-features', '2000')
  }

  return flags
}
