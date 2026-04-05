import { Queue, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

// Conexão compartilhada — BullMQ requer maxRetriesPerRequest: null
export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
})

export const QUEUE_NAME = 'mapeia-processing'

/** Fila de processamento de projetos */
export const processingQueue = new Queue<{ projectId: string }>(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts:  3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 50  },
  },
})

/** Eventos da fila (útil para logging e webhooks futuros) */
export const queueEvents = new QueueEvents(QUEUE_NAME, {
  connection: new IORedis(REDIS_URL, { maxRetriesPerRequest: null }),
})
