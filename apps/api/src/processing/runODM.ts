import fs from 'fs'
import path from 'path'
import { execFile, execSync } from 'child_process'
import { promisify } from 'util'
import { prisma } from '../lib/prisma'
import { storage } from '../lib/storage'

const execFileAsync = promisify(execFile)

/**
 * runODM — orquestra o processamento fotogramétrico de um projeto.
 *
 * Quando Docker está disponível: usa OpenDroneMap real + gdal2tiles.
 * Caso contrário: simulação com arquivos placeholder.
 *
 * Créditos: OpenDroneMap (https://opendronemap.org) — GPL-3.0
 * O Mapeia.AI não é afiliado ao projeto OpenDroneMap.
 */
export async function runODM(projectId: string): Promise<void> {
  console.log(`[ODM] Iniciando processamento do projeto ${projectId}`)

  await prisma.project.update({
    where: { id: projectId },
    data:  { status: 'processing' },
  })

  try {
    const inputDir  = storage.uploadsDir(projectId)
    const outputDir = storage.ensureOutputsDir(projectId)

    const images = fs.existsSync(inputDir)
      ? fs.readdirSync(inputDir).filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
      : []

    console.log(`[ODM] ${images.length} imagem(ns) encontrada(s) em ${inputDir}`)

    if (images.length < 3) {
      throw new Error(`Mínimo de 3 imagens necessário (encontradas: ${images.length})`)
    }

    const dockerAvailable = isDockerAvailable()

    if (dockerAvailable) {
      console.log('[ODM] Docker disponível — usando OpenDroneMap real')
      await runODMDocker(projectId, inputDir, outputDir)
    } else {
      console.log('[ODM] Docker não disponível — usando processamento simulado')
      await simulateODMProcessing(projectId, outputDir, images.length)
    }

    await prisma.project.update({
      where: { id: projectId },
      data:  { status: 'completed' },
    })

    console.log(`[ODM] Projeto ${projectId} concluído com sucesso`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error(`[ODM] Falha no projeto ${projectId}:`, message)

    await prisma.project.update({
      where: { id: projectId },
      data:  { status: 'failed' },
    })

    throw err
  }
}

// ── Docker ODM ──────────────────────────────────────────────────────────────

function isDockerAvailable(): boolean {
  try {
    execSync('docker info', { stdio: 'pipe', timeout: 5000 })
    return true
  } catch {
    return false
  }
}

async function runODMDocker(
  projectId: string,
  inputDir: string,
  outputDir: string,
): Promise<void> {
  // ODM espera: /datasets/code/images/*.jpg  (nome fixo "code")
  const odmWorkDir   = path.join(outputDir, 'odm_workdir')
  const odmImagesDir = path.join(odmWorkDir, 'code', 'images')
  fs.mkdirSync(odmImagesDir, { recursive: true })

  // Copia as imagens para dentro do volume (Docker não segue symlinks do host)
  const images = fs.readdirSync(inputDir).filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
  console.log(`[ODM] Copiando ${images.length} imagens para o volume Docker...`)
  for (const img of images) {
    fs.copyFileSync(path.join(inputDir, img), path.join(odmImagesDir, img))
  }

  console.log('[ODM] Executando OpenDroneMap (isso pode levar vários minutos)...')

  try {
    const { stdout, stderr } = await execFileAsync('docker', [
      'run', '--rm',
      '-v', `${odmWorkDir}:/datasets`,
      'opendronemap/odm',
      '--project-path', '/datasets',
      '--orthophoto-resolution', '5',
      '--fast-orthophoto',
      '--skip-3dmodel',
      '--skip-report',
      '--min-num-features', '4000',
    ], {
      timeout:   2 * 60 * 60 * 1000, // 2 horas
      maxBuffer: 100 * 1024 * 1024,
    })
    if (stdout) console.log('[ODM stdout]', stdout.slice(-2000))
    if (stderr) console.log('[ODM stderr]', stderr.slice(-2000))
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string }
    console.error('[ODM] stdout:', e.stdout?.slice(-3000))
    console.error('[ODM] stderr:', e.stderr?.slice(-3000))
    throw new Error(`ODM falhou: ${e.message}`)
  }

  // O ortomosaico gerado pelo ODM fica em code/odm_orthophoto/
  const orthoPath = path.join(odmWorkDir, 'code', 'odm_orthophoto', 'odm_orthophoto.tif')

  if (!fs.existsSync(orthoPath)) {
    throw new Error('ODM concluiu mas ortomosaico não encontrado')
  }

  // Copia ortomosaico para o outputDir raiz
  fs.copyFileSync(orthoPath, path.join(outputDir, 'odm_orthophoto.tif'))

  // Gera tiles XYZ para visualização no Leaflet
  await generateTiles(outputDir)

  // Salva manifest
  writeManifest(outputDir, projectId, images.length, true)

  // Limpa diretório de trabalho pesado do ODM
  fs.rmSync(odmWorkDir, { recursive: true, force: true })
}

async function generateTiles(outputDir: string): Promise<void> {
  const orthoPath = path.join(outputDir, 'odm_orthophoto.tif')
  const tilesDir  = path.join(outputDir, 'tiles')
  fs.mkdirSync(tilesDir, { recursive: true })

  console.log('[ODM] Gerando tiles XYZ do ortomosaico...')

  // Usa o container do próprio ODM (já baixado) para rodar gdal2tiles
  const { stdout, stderr } = await execFileAsync('docker', [
    'run', '--rm',
    '-v', `${outputDir}:/data`,
    '--entrypoint', 'python3',
    'opendronemap/odm',
    '/usr/bin/gdal2tiles.py',
    '--zoom=10-20',
    '--processes=4',
    '--tiledriver=PNG',
    '--webviewer=none',
    '/data/odm_orthophoto.tif',
    '/data/tiles',
  ], {
    timeout:   30 * 60 * 1000,
    maxBuffer: 10 * 1024 * 1024,
  }).catch(async (err: unknown) => {
    // Fallback: tenta sem python3 explícito
    const e = err as { message?: string }
    console.warn('[ODM] Tentando gdal2tiles alternativo...', e.message)
    return execFileAsync('docker', [
      'run', '--rm',
      '-v', `${outputDir}:/data`,
      '--entrypoint', 'gdal2tiles.py',
      'opendronemap/odm',
      '--zoom=10-20',
      '--processes=4',
      '--webviewer=none',
      '/data/odm_orthophoto.tif',
      '/data/tiles',
    ], { timeout: 30 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 })
  })

  if (stdout) console.log('[gdal2tiles]', stdout.slice(-500))
  if (stderr) console.log('[gdal2tiles stderr]', stderr.slice(-500))
  console.log('[ODM] Tiles gerados com sucesso')
}

// ── Simulação ───────────────────────────────────────────────────────────────

async function simulateODMProcessing(
  projectId: string,
  outputDir: string,
  imageCount: number,
): Promise<void> {
  const delayMs = Math.min(Math.max(imageCount * 2000, 10_000), 60_000)
  console.log(`[ODM] Simulando ${(delayMs / 1000).toFixed(0)}s de processamento...`)

  await sleep(delayMs)

  writeManifest(outputDir, projectId, imageCount, false)

  fs.writeFileSync(
    path.join(outputDir, 'odm_orthophoto_placeholder.txt'),
    [
      '# Ortomosaico — Mapeia.AI',
      `# Projeto: ${projectId}`,
      `# Imagens processadas: ${imageCount}`,
      '# Arquivo real: disponível após integração com OpenDroneMap',
      '#',
      '# Créditos: OpenDroneMap (https://opendronemap.org) — GPL-3.0',
    ].join('\n'),
  )

  console.log(`[ODM] Arquivos de saída gerados em ${outputDir}`)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function writeManifest(
  outputDir: string,
  projectId: string,
  imageCount: number,
  real: boolean,
): void {
  const tilesDir = path.join(outputDir, 'tiles')
  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify({
      project_id:   projectId,
      generated_at: new Date().toISOString(),
      image_count:  imageCount,
      engine:       real ? 'OpenDroneMap' : 'OpenDroneMap (simulado)',
      has_tiles:    fs.existsSync(tilesDir),
    }, null, 2),
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
