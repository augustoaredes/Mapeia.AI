import { Worker, Job } from 'bullmq'
import IORedis from 'ioredis'
import { runODM } from '../processing/runODM'

const REDIS_URL   = process.env.REDIS_URL ?? 'redis://localhost:6379'
const QUEUE_NAME  = 'mapeia-processing'
const CONCURRENCY = 2 // processa até 2 projetos ao mesmo tempo

interface JobData {
  projectId: string
}

export function createProcessingWorker(): Worker<JobData> {
  const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })

  const worker = new Worker<JobData>(
    QUEUE_NAME,
    async (job: Job<JobData>) => {
      const { projectId } = job.data
      console.log(`[Worker] Job ${job.id} iniciado — projeto ${projectId}`)

      await job.updateProgress(10)
      await runODM(projectId)
      await job.updateProgress(100)

      console.log(`[Worker] Job ${job.id} concluído`)
    },
    {
      connection,
      concurrency: CONCURRENCY,
    }
  )

  worker.on('completed', (job) => {
    console.log(`[Worker] ✓ Job ${job.id} (projeto ${job.data.projectId}) finalizado`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[Worker] ✗ Job ${job?.id} falhou:`, err.message)
  })

  worker.on('error', (err) => {
    console.error('[Worker] Erro interno:', err)
  })

  return worker
}
