import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma'
import { storage } from '../lib/storage'

/**
 * runODM — orquestra o processamento fotogramétrico de um projeto.
 *
 * FASE 1 (atual): simulado — gera arquivos de saída fake após delay.
 * FASE 2 (futura): integração real com OpenDroneMap via Docker.
 *   Créditos: OpenDroneMap (https://opendronemap.org) — GPL-3.0
 *   O Mapeia.AI não é afiliado ao projeto OpenDroneMap.
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

    // Verifica se há imagens para processar
    const images = fs.existsSync(inputDir)
      ? fs.readdirSync(inputDir).filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
      : []

    console.log(`[ODM] ${images.length} imagem(ns) encontrada(s) em ${inputDir}`)

    if (images.length < 3) {
      throw new Error(`Mínimo de 3 imagens necessário (encontradas: ${images.length})`)
    }

    // ── FASE 1: Processamento simulado ──
    await simulateODMProcessing(projectId, outputDir, images.length)

    // ── FASE 2 (TODO): Processamento real com Docker ODM ──
    // await runODMDocker(projectId, inputDir, outputDir)

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

/**
 * Simula o processamento do ODM.
 * Gera arquivos de saída placeholder para teste da UX completa.
 */
async function simulateODMProcessing(
  projectId: string,
  outputDir: string,
  imageCount: number
): Promise<void> {
  // Tempo de processamento simulado: ~2s por imagem, mínimo 10s, máximo 60s
  const delayMs = Math.min(Math.max(imageCount * 2000, 10_000), 60_000)
  console.log(`[ODM] Simulando ${(delayMs / 1000).toFixed(0)}s de processamento...`)

  await sleep(delayMs)

  // Gera arquivos de saída fake
  const manifest = {
    project_id:   projectId,
    generated_at: new Date().toISOString(),
    image_count:  imageCount,
    engine:       'OpenDroneMap (simulado)',
    note:         'Este é um arquivo de demonstração. O ortomosaico real será gerado pelo ODM.',
    files: ['odm_orthophoto.tif', 'odm_dem.tif', 'odm_report.pdf'],
  }

  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  )

  // Placeholder para o ortomosaico (arquivo de texto simulando um GeoTIFF)
  fs.writeFileSync(
    path.join(outputDir, 'odm_orthophoto_placeholder.txt'),
    [
      '# Ortomosaico — Mapeia.AI',
      `# Projeto: ${projectId}`,
      `# Imagens processadas: ${imageCount}`,
      '# Arquivo real: disponível após integração com OpenDroneMap',
      '#',
      '# Créditos: OpenDroneMap (https://opendronemap.org) — GPL-3.0',
    ].join('\n')
  )

  fs.writeFileSync(
    path.join(outputDir, 'README.txt'),
    [
      'Mapeia.AI — Resultado do processamento',
      '======================================',
      '',
      `Projeto: ${projectId}`,
      `Imagens: ${imageCount}`,
      `Data: ${new Date().toLocaleString('pt-BR')}`,
      '',
      'Arquivos neste pacote:',
      '  manifest.json              — metadados do processamento',
      '  odm_orthophoto_placeholder.txt — placeholder do ortomosaico',
      '',
      'Nota: Esta é uma versão de demonstração.',
      'A integração com OpenDroneMap (ODM) será ativada na Fase 6.',
      '',
      'OpenDroneMap: https://opendronemap.org (GPL-3.0)',
    ].join('\n')
  )

  console.log(`[ODM] Arquivos de saída gerados em ${outputDir}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/*
 * ── FASE 2 (futura): integração Docker ODM ──
 *
 * async function runODMDocker(projectId: string, inputDir: string, outputDir: string) {
 *   const { execFile } = await import('child_process')
 *   const { promisify } = await import('util')
 *   const exec = promisify(execFile)
 *
 *   await exec('docker', [
 *     'run', '--rm',
 *     '-v', `${inputDir}:/datasets/code/images`,
 *     '-v', `${outputDir}:/datasets/code/odm_orthophoto`,
 *     'opendronemap/odm',
 *     '--project-path', '/datasets',
 *     '--orthophoto-resolution', '5',
 *   ])
 * }
 *
 * Créditos: OpenDroneMap — https://opendronemap.org (GPL-3.0)
 * O Mapeia.AI não é afiliado ao projeto OpenDroneMap.
 */
