import fs from 'fs'
import path from 'path'
import { execFile, execSync } from 'child_process'
import { promisify } from 'util'
import { prisma } from '../lib/prisma'
import { storage } from '../lib/storage'
import { detectThermal, ThermalDetectionResult } from '../lib/detectThermal'
import { sendProcessingComplete } from '../lib/email'
import { parseLASPreview } from '../lib/lasParser'

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
    data:  { status: 'processing', progress: 0, phase: 'Iniciando...' },
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

    // Detecta câmeras térmicas antes de iniciar o ODM
    await setProgress(projectId, 3, 'Analisando imagens...')
    const thermal = await detectThermal(inputDir)
    if (thermal.isThermal) {
      console.log(`[ODM] Câmera térmica detectada: ${thermal.cameraMake} ${thermal.cameraModel}`)
    }

    const dockerAvailable = isDockerAvailable()

    if (dockerAvailable) {
      console.log('[ODM] Docker disponível — usando OpenDroneMap real')
      await runODMDocker(projectId, inputDir, outputDir, thermal)
    } else {
      console.log('[ODM] Docker não disponível — usando processamento simulado')
      await simulateODMProcessing(projectId, outputDir, images.length, thermal)
    }

    const completedProject = await prisma.project.update({
      where:   { id: projectId },
      data:    { status: 'completed', progress: 100, phase: 'Concluído' },
      include: { user: { select: { email: true, name: true } } },
    })

    console.log(`[ODM] Projeto ${projectId} concluído com sucesso`)

    // Notificação por e-mail — lê GSD do manifest para incluir no e-mail
    const manifest = (() => {
      try {
        const outputDir = storage.outputsDir(projectId)
        return JSON.parse(require('fs').readFileSync(require('path').join(outputDir, 'manifest.json'), 'utf8'))
      } catch { return null }
    })()

    sendProcessingComplete({
      to:          completedProject.user.email,
      name:        completedProject.user.name,
      projectId,
      projectName: completedProject.name,
      areaHa:      manifest?.area_ha ?? null,
      gsdCm:       manifest?.gsd_cm  ?? null,
    }).catch(() => {/* silencia erros de e-mail */})
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error(`[ODM] Falha no projeto ${projectId}:`, message)

    // updateMany evita erro se o projeto foi cancelado/deletado enquanto o ODM ainda rodava
    await prisma.project.updateMany({
      where: { id: projectId, status: { notIn: ['cancelled', 'completed'] } },
      data:  { status: 'failed', progress: 0, phase: null },
    })

    throw err
  }
}

// ── Helpers de progresso ─────────────────────────────────────────────────────

async function setProgress(projectId: string, progress: number, phase: string): Promise<void> {
  await prisma.project.update({
    where: { id: projectId },
    data:  { progress, phase },
  })
  console.log(`[ODM] [${progress}%] ${phase}`)
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
  thermal: ThermalDetectionResult,
): Promise<void> {
  // ODM espera: /datasets/code/images/*.jpg  (nome fixo "code")
  const odmWorkDir   = path.join(outputDir, 'odm_workdir')
  const odmImagesDir = path.join(odmWorkDir, 'code', 'images')
  fs.mkdirSync(odmImagesDir, { recursive: true })

  // Copia as imagens para dentro do volume (Docker não segue symlinks do host)
  const images = fs.readdirSync(inputDir).filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
  await setProgress(projectId, 8, `Copiando ${images.length} imagens...`)
  for (const img of images) {
    fs.copyFileSync(path.join(inputDir, img), path.join(odmImagesDir, img))
  }

  await setProgress(projectId, 12, 'Executando...')
  console.log('[ODM] Executando OpenDroneMap (isso pode levar vários minutos)...')

  // Tenta primeiro com 3D em qualidade baixa (menos memória)
  // Se falhar por OOM (exit 137), refaz com --fast-orthophoto (só ortomosaico)
  let odm3dFailed = false
  try {
    const { stdout, stderr } = await execFileAsync('docker', [
      'run', '--rm',
      '-v', `${odmWorkDir}:/datasets`,
      'opendronemap/odm',
      '--project-path',         '/datasets',
      '--orthophoto-resolution', '5',
      '--skip-report',
      '--min-num-features',     '4000',
      '--pc-quality',           'lowest',
      '--mesh-size',            '100000',
      '--ignore-gsd',
      '--dtm',          // gera MDT além do MDS
      '--pc-las',       // exporta nuvem de pontos como .las
      ...thermal.odmFlags,
    ], {
      timeout:   4 * 60 * 60 * 1000,
      maxBuffer: 100 * 1024 * 1024,
    })
    if (stdout) console.log('[ODM stdout]', stdout.slice(-2000))
    if (stderr) console.log('[ODM stderr]', stderr.slice(-2000))
  } catch (err: unknown) {
    const e = err as { code?: number; stdout?: string; stderr?: string; message?: string }
    const isOOM = e.code === 137 || (e.stderr ?? '').includes('out of memory') || (e.message ?? '').includes('137')
    if (isOOM) {
      console.warn('[ODM] Sem memória para 3D — reprocessando apenas ortomosaico...')
      odm3dFailed = true

      // Limpa workdir parcial e refaz do zero com --fast-orthophoto
      await setProgress(projectId, 12, 'Memória insuficiente para 3D — refazendo como ortomosaico...')
      fs.rmSync(odmWorkDir, { recursive: true, force: true })
      fs.mkdirSync(odmImagesDir, { recursive: true })
      for (const img of images) {
        fs.copyFileSync(path.join(inputDir, img), path.join(odmImagesDir, img))
      }
      await setProgress(projectId, 15, 'Executando (modo rápido)...')

      const { stdout, stderr } = await execFileAsync('docker', [
        'run', '--rm',
        '-v', `${odmWorkDir}:/datasets`,
        'opendronemap/odm',
        '--project-path',    '/datasets',
        '--orthophoto-resolution', '5',
        '--fast-orthophoto',
        '--skip-report',
        '--min-num-features', '4000',
        ...thermal.odmFlags,
      ], {
        timeout:   2 * 60 * 60 * 1000,
        maxBuffer: 100 * 1024 * 1024,
      })
      if (stdout) console.log('[ODM stdout]', stdout.slice(-2000))
      if (stderr) console.log('[ODM stderr]', stderr.slice(-2000))
    } else {
      console.error('[ODM] stdout:', e.stdout?.slice(-3000))
      console.error('[ODM] stderr:', e.stderr?.slice(-3000))
      throw new Error(`ODM falhou: ${e.message}`)
    }
  }
  console.log(odm3dFailed ? '[ODM] Concluído (ortomosaico apenas — aumentar RAM Docker para 3D)' : '[ODM] Concluído (ortomosaico + 3D)')

  await setProgress(projectId, 70, 'Copiando resultados...')

  // O ortomosaico gerado pelo ODM fica em code/odm_orthophoto/
  const orthoPath = path.join(odmWorkDir, 'code', 'odm_orthophoto', 'odm_orthophoto.tif')

  if (!fs.existsSync(orthoPath)) {
    throw new Error('ODM concluiu mas ortomosaico não encontrado')
  }

  // Copia ortomosaico para o outputDir raiz
  fs.copyFileSync(orthoPath, path.join(outputDir, 'odm_orthophoto.tif'))

  // ── Copia todos os entregáveis disponíveis ─────────────────────────────────

  // MDS — Digital Surface Model
  const dsmSrcPath = path.join(odmWorkDir, 'code', 'odm_dem', 'dsm.tif')
  const dsmDstPath = path.join(outputDir, 'dsm.tif')
  if (fs.existsSync(dsmSrcPath)) {
    fs.copyFileSync(dsmSrcPath, dsmDstPath)
    console.log('[ODM] MDS (DSM) copiado')
  } else {
    console.warn('[ODM] MDS não encontrado (normal com --fast-orthophoto)')
  }

  // MDT — Digital Terrain Model
  const dtmSrcPath = path.join(odmWorkDir, 'code', 'odm_dem', 'dtm.tif')
  const dtmDstPath = path.join(outputDir, 'dtm.tif')
  if (fs.existsSync(dtmSrcPath)) {
    fs.copyFileSync(dtmSrcPath, dtmDstPath)
    console.log('[ODM] MDT (DTM) copiado')
  } else {
    console.warn('[ODM] MDT não encontrado')
  }

  // Nuvem de pontos — LAZ / LAS
  const lazSrcPath = path.join(odmWorkDir, 'code', 'odm_georeferencing', 'odm_georeferenced_model.laz')
  const lasSrcPath = path.join(odmWorkDir, 'code', 'odm_georeferencing', 'odm_georeferenced_model.las')
  const pcDstPath  = path.join(outputDir, 'pointcloud.laz')
  if (fs.existsSync(lazSrcPath)) {
    fs.copyFileSync(lazSrcPath, pcDstPath)
    console.log('[ODM] Nuvem de pontos LAZ copiada')
  } else if (fs.existsSync(lasSrcPath)) {
    fs.copyFileSync(lasSrcPath, path.join(outputDir, 'pointcloud.las'))
    console.log('[ODM] Nuvem de pontos LAS copiada')
  } else {
    console.warn('[ODM] Nuvem de pontos não encontrada')
  }

  // Modelo 3D texturizado
  const modelSrcDir = path.join(odmWorkDir, 'code', 'odm_texturing')
  const modelDstDir = path.join(outputDir, 'model_3d')
  if (fs.existsSync(modelSrcDir)) {
    fs.mkdirSync(modelDstDir, { recursive: true })
    for (const file of fs.readdirSync(modelSrcDir)) {
      fs.copyFileSync(path.join(modelSrcDir, file), path.join(modelDstDir, file))
    }
    console.log('[ODM] Modelo 3D copiado')
  } else {
    console.warn('[ODM] Modelo 3D não encontrado')
  }

  // Gera tiles XYZ para visualização no Leaflet
  await setProgress(projectId, 78, 'Gerando tiles do ortomosaico...')
  await generateTiles(outputDir)

  // Gera tiles do DSM (modelo de elevação) se disponível
  if (fs.existsSync(dsmDstPath)) {
    await setProgress(projectId, 90, 'Gerando tiles do modelo de elevação (DSM)...')
    await generateDsmTiles(outputDir)
  }

  await setProgress(projectId, 93, 'Gerando preview da nuvem de pontos...')
  await generatePointCloudPreview(outputDir)

  await setProgress(projectId, 96, 'Finalizando...')

  // Gera thumbnail JPEG do ortomosaico (400px de largura) para preview no dashboard
  await generateThumbnail(outputDir)

  // Extrai GSD real do GeoTIFF do ortomosaico
  const gsdCm = await extractGSD(outputDir)

  // Salva manifest
  writeManifest(outputDir, projectId, images.length, true, thermal, gsdCm)

  // Limpa diretório de trabalho pesado do ODM
  fs.rmSync(odmWorkDir, { recursive: true, force: true })
}

async function generateTiles(outputDir: string): Promise<void> {
  const tilesDir  = path.join(outputDir, 'tiles')
  const orthoPath = path.join(outputDir, 'odm_orthophoto.tif')
  fs.mkdirSync(tilesDir, { recursive: true })

  console.log('[ODM] Gerando tiles XYZ do ortomosaico...')

  // Estratégias em ordem de preferência
  const strategies: Array<{ label: string; cmd: string; args: string[] }> = [
    // gdal2tiles direto (Mac via Homebrew / Linux via gdal-bin)
    {
      label: 'gdal2tiles',
      cmd: 'gdal2tiles',
      args: ['--zoom=10-20', '--processes=4', '--webviewer=none', orthoPath, tilesDir],
    },
    // gdal2tiles.py (Linux com gdal-bin)
    {
      label: 'gdal2tiles.py',
      cmd: 'gdal2tiles.py',
      args: ['--zoom=10-20', '--processes=4', '--webviewer=none', orthoPath, tilesDir],
    },
    // Python 3.12 com gdal2tiles.py via Homebrew
    {
      label: 'python3.12',
      cmd: 'python3.12',
      args: ['/opt/homebrew/bin/gdal2tiles.py', '--zoom=10-20', '--processes=4', '--webviewer=none', orthoPath, tilesDir],
    },
    // Docker ODM via conda (fallback)
    {
      label: 'docker-odm-conda',
      cmd: 'bash',
      args: [
        '-c',
        `docker run --rm -v "${outputDir}:/data" --entrypoint bash opendronemap/odm -c 'export PATH=/opt/conda/bin:/usr/local/bin:\$PATH && gdal2tiles --zoom=10-20 --processes=4 --webviewer=none /data/odm_orthophoto.tif /data/tiles'`,
      ],
    },
  ]

  for (const s of strategies) {
    try {
      console.log(`[ODM] Tentando tiles via ${s.label}...`)
      await execFileAsync(s.cmd, s.args, {
        timeout:   30 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024,
      })
      console.log(`[ODM] Tiles gerados com sucesso via ${s.label}`)
      return
    } catch (err) {
      const msg = (err as Error).message?.split('\n')[0] ?? ''
      console.warn(`[ODM] ${s.label} falhou: ${msg}`)
    }
  }

  // Nenhuma estratégia funcionou — projeto conclui sem tiles
  console.warn('[ODM] Tiles não gerados. O projeto será marcado como concluído sem visualização do ortomosaico.')
  console.warn('[ODM] Para habilitar: Mac → brew install gdal | Linux → apt install gdal-bin')
  if (fs.existsSync(tilesDir)) {
    fs.rmdirSync(tilesDir, { recursive: true } as unknown as fs.RmDirOptions)
  }
}

async function generateDsmTiles(outputDir: string): Promise<void> {
  const dsmPath     = path.join(outputDir, 'dsm.tif')
  const dsmBytePath = path.join(outputDir, 'dsm_byte.tif')
  const dsmTilesDir = path.join(outputDir, 'dsm-tiles')
  fs.mkdirSync(dsmTilesDir, { recursive: true })

  console.log('[ODM] Gerando tiles do DSM...')

  // Converte DSM Float32 → Byte (auto-scale min/max → 0-255) para gdal2tiles
  const translateStrategies: Array<{ label: string; cmd: string; args: string[] }> = [
    { label: 'gdal_translate', cmd: 'gdal_translate', args: ['-ot', 'Byte', '-scale', dsmPath, dsmBytePath] },
    {
      label: 'docker-gdal_translate',
      cmd: 'bash',
      args: ['-c', `docker run --rm -v "${outputDir}:/data" --entrypoint bash opendronemap/odm -c 'export PATH=/opt/conda/bin:/usr/local/bin:\$PATH && gdal_translate -ot Byte -scale /data/dsm.tif /data/dsm_byte.tif'`],
    },
  ]

  let byteOk = false
  for (const s of translateStrategies) {
    try {
      await execFileAsync(s.cmd, s.args, { timeout: 3 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 })
      if (fs.existsSync(dsmBytePath)) { byteOk = true; break }
    } catch { /* tenta próxima */ }
  }

  const tileSource = byteOk ? dsmBytePath : dsmPath

  const tileStrategies: Array<{ label: string; cmd: string; args: string[] }> = [
    { label: 'gdal2tiles',    cmd: 'gdal2tiles',    args: ['--zoom=10-20', '--processes=4', '--webviewer=none', tileSource, dsmTilesDir] },
    { label: 'gdal2tiles.py', cmd: 'gdal2tiles.py', args: ['--zoom=10-20', '--processes=4', '--webviewer=none', tileSource, dsmTilesDir] },
    { label: 'python3.12',    cmd: 'python3.12',    args: ['/opt/homebrew/bin/gdal2tiles.py', '--zoom=10-20', '--processes=4', '--webviewer=none', tileSource, dsmTilesDir] },
    {
      label: 'docker-odm-dsm',
      cmd: 'bash',
      args: ['-c', `docker run --rm -v "${outputDir}:/data" --entrypoint bash opendronemap/odm -c 'export PATH=/opt/conda/bin:/usr/local/bin:\$PATH && gdal2tiles --zoom=10-20 --processes=4 --webviewer=none /data/dsm_byte.tif /data/dsm-tiles'`],
    },
  ]

  for (const s of tileStrategies) {
    try {
      console.log(`[ODM] DSM tiles via ${s.label}...`)
      await execFileAsync(s.cmd, s.args, { timeout: 30 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 })
      console.log(`[ODM] DSM tiles gerados via ${s.label}`)
      // Limpa arquivo intermediário
      if (byteOk && fs.existsSync(dsmBytePath)) fs.unlinkSync(dsmBytePath)
      return
    } catch (err) {
      console.warn(`[ODM] DSM ${s.label} falhou: ${(err as Error).message?.split('\n')[0] ?? ''}`)
    }
  }

  console.warn('[ODM] DSM tiles não gerados — DSM .tif disponível para download')
  if (fs.existsSync(dsmTilesDir)) fs.rmdirSync(dsmTilesDir, { recursive: true } as unknown as fs.RmDirOptions)
  if (fs.existsSync(dsmBytePath)) fs.unlinkSync(dsmBytePath)
}

async function generatePointCloudPreview(outputDir: string): Promise<void> {
  const lasPath  = path.join(outputDir, 'pointcloud.las')
  const lazPath  = path.join(outputDir, 'pointcloud.laz')
  const outPath  = path.join(outputDir, 'pointcloud_preview.bin')

  // Tenta LAS primeiro (sem compressão, parseável direto)
  if (fs.existsSync(lasPath)) {
    const buf = parseLASPreview(lasPath)
    if (buf) { fs.writeFileSync(outPath, buf); return }
  }

  // Se só tem LAZ, converte para LAS via PDAL no Docker ODM
  if (fs.existsSync(lazPath)) {
    const tempLas = path.join(outputDir, '_tmp_preview.las')
    try {
      await execFileAsync('bash', [
        '-c',
        `docker run --rm -v "${outputDir}:/data" --entrypoint bash opendronemap/odm -c ` +
        `'export PATH=/opt/conda/bin:/usr/local/bin:$PATH && ` +
        `pdal translate /data/pointcloud.laz /data/_tmp_preview.las ` +
        `--filters.decimation.step=5 --writers.las.compression=false 2>/dev/null'`,
      ], { timeout: 5 * 60_000, maxBuffer: 10 * 1024 * 1024 })
      if (fs.existsSync(tempLas)) {
        const buf = parseLASPreview(tempLas, 200_000)
        if (buf) fs.writeFileSync(outPath, buf)
      }
    } catch (e) {
      console.warn('[ODM] Preview LAZ→LAS falhou:', (e as Error).message?.split('\n')[0])
    } finally {
      if (fs.existsSync(tempLas)) fs.unlinkSync(tempLas)
    }
  }
}

async function extractGSD(outputDir: string): Promise<number | null> {
  const orthoPath = path.join(outputDir, 'odm_orthophoto.tif')
  if (!fs.existsSync(orthoPath)) return null

  // Tenta gdalinfo -json para obter o geoTransform (pixel size em graus)
  const strategies: Array<{ cmd: string; args: string[] }> = [
    { cmd: 'gdalinfo', args: ['-json', orthoPath] },
    {
      cmd: 'bash',
      args: ['-c', `docker run --rm -v "${outputDir}:/data" --entrypoint bash opendronemap/odm -c 'export PATH=/opt/conda/bin:/usr/local/bin:$PATH && gdalinfo -json /data/odm_orthophoto.tif'`],
    },
  ]

  for (const s of strategies) {
    try {
      const { stdout } = await execFileAsync(s.cmd, s.args, { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 })
      const info = JSON.parse(stdout)
      // geoTransform = [originX, pixelW, rotX, originY, rotY, pixelH]
      const gt: number[] | undefined = info?.geoTransform
      if (!gt || gt.length < 6) continue
      const pixelWidthDeg  = Math.abs(gt[1])
      const pixelHeightDeg = Math.abs(gt[5])
      const pixelSizeDeg   = (pixelWidthDeg + pixelHeightDeg) / 2
      // Centro do raster
      const originY    = gt[3]
      const nRows      = info?.size?.[1] ?? 0
      const centerLat  = originY + gt[5] * nRows / 2
      const metersPerDeg = 111320 * Math.cos(centerLat * Math.PI / 180)
      const gsdM = pixelSizeDeg * metersPerDeg
      const gsdCm = Math.round(gsdM * 100 * 10) / 10  // arredonda para 1 casa decimal
      console.log(`[ODM] GSD extraído: ${gsdCm} cm/pixel`)
      return gsdCm
    } catch { /* tenta próxima */ }
  }

  // Fallback: retorna a resolução configurada (5 cm/pixel)
  console.warn('[ODM] GSD não extraído via gdalinfo — usando valor configurado (5 cm/pixel)')
  return 5
}

async function generateThumbnail(outputDir: string): Promise<void> {
  const orthoPath = path.join(outputDir, 'odm_orthophoto.tif')
  const thumbPath = path.join(outputDir, 'thumbnail.jpg')
  if (!fs.existsSync(orthoPath)) return

  const strategies: Array<{ cmd: string; args: string[] }> = [
    { cmd: 'gdal_translate', args: ['-of', 'JPEG', '-outsize', '400', '0', '-scale', orthoPath, thumbPath] },
    {
      cmd: 'bash',
      args: ['-c', `docker run --rm -v "${outputDir}:/data" --entrypoint bash opendronemap/odm -c 'export PATH=/opt/conda/bin:/usr/local/bin:\$PATH && gdal_translate -of JPEG -outsize 400 0 -scale /data/odm_orthophoto.tif /data/thumbnail.jpg'`],
    },
  ]

  for (const s of strategies) {
    try {
      await execFileAsync(s.cmd, s.args, { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 })
      if (fs.existsSync(thumbPath)) {
        console.log('[ODM] Thumbnail gerado:', thumbPath)
        return
      }
    } catch { /* tenta próxima */ }
  }
  console.warn('[ODM] Thumbnail não gerado — preview via tiles')
}

// ── Simulação ───────────────────────────────────────────────────────────────

async function simulateODMProcessing(
  projectId: string,
  outputDir: string,
  imageCount: number,
  thermal?: ThermalDetectionResult,
): Promise<void> {
  const delayMs = Math.min(Math.max(imageCount * 2000, 10_000), 60_000)
  console.log(`[ODM] Simulando ${(delayMs / 1000).toFixed(0)}s de processamento...`)

  await sleep(delayMs)

  writeManifest(outputDir, projectId, imageCount, false, thermal)

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
  thermal?: ThermalDetectionResult,
  gsdCm?: number | null,
): void {
  const tilesDir      = path.join(outputDir, 'tiles')
  const dsmTilesDir   = path.join(outputDir, 'dsm-tiles')
  const model3dDir    = path.join(outputDir, 'model_3d')
  const dsmPath       = path.join(outputDir, 'dsm.tif')
  const dtmPath       = path.join(outputDir, 'dtm.tif')
  const lazPath       = path.join(outputDir, 'pointcloud.laz')
  const lasPath       = path.join(outputDir, 'pointcloud.las')
  const thumbPath     = path.join(outputDir, 'thumbnail.jpg')

  // Tamanho dos entregáveis em bytes
  function fileSize(p: string): number {
    try { return fs.statSync(p).size } catch { return 0 }
  }

  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify({
      project_id:        projectId,
      generated_at:      new Date().toISOString(),
      image_count:       imageCount,
      engine:            real ? 'Mapeia.AI Processing' : 'Mapeia.AI Processing (simulado)',
      has_tiles:         fs.existsSync(tilesDir),
      has_dsm:           fs.existsSync(dsmPath),
      has_dtm:           fs.existsSync(dtmPath),
      has_dsm_tiles:     fs.existsSync(dsmTilesDir),
      has_3d_model:      fs.existsSync(model3dDir),
      has_pointcloud:    fs.existsSync(lazPath) || fs.existsSync(lasPath),
      has_thumbnail:     fs.existsSync(thumbPath),
      pointcloud_format: fs.existsSync(lazPath) ? 'laz' : fs.existsSync(lasPath) ? 'las' : null,
      is_thermal:        thermal?.isThermal ?? false,
      camera_make:       thermal?.cameraMake  ?? null,
      camera_model:      thermal?.cameraModel ?? null,
      gsd_cm:            gsdCm ?? null,
      file_sizes: {
        orthophoto:  fileSize(path.join(outputDir, 'odm_orthophoto.tif')),
        dsm:         fileSize(dsmPath),
        dtm:         fileSize(dtmPath),
        pointcloud:  fileSize(lazPath) || fileSize(lasPath),
      },
    }, null, 2),
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
