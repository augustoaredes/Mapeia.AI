import 'dotenv/config'
import { createProcessingWorker } from './processing.worker'

console.log('\n⚙️  Mapeia.AI — Worker de processamento')
console.log(`   Redis: ${process.env.REDIS_URL ?? 'redis://localhost:6379'}`)
console.log('   Aguardando jobs...\n')

const worker = createProcessingWorker()

// Graceful shutdown
async function shutdown() {
  console.log('\n[Worker] Encerrando...')
  await worker.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT',  shutdown)
