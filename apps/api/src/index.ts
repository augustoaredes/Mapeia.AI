import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'

import authRouter     from './routes/auth'
import projectsRouter from './routes/projects'
import uploadRouter   from './routes/upload'
import billingRouter  from './routes/billing'
import shareRouter    from './routes/share'
import { errorHandler, notFound } from './middleware/error'
import { startCleanupJob } from './lib/cleanup'

const app  = express()
const PORT = process.env.PORT ?? 3001
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  'https://mapeia-ai.vercel.app',
  'http://localhost:3000',
]

// ── Segurança ──
app.use(helmet())
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
      cb(null, true)
    } else {
      cb(new Error(`CORS: origin not allowed: ${origin}`))
    }
  },
  methods:      ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Stripe Webhook: raw body ANTES do json() ──
app.use(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' })
)

// ── Body parsing ──
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Health check ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Rotas ──
app.use('/api/auth',     authRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/projects', uploadRouter)
app.use('/api/projects', shareRouter)
app.use('/api/billing',  billingRouter)
app.use('/api/share',    shareRouter)

// ── Outputs estáticos (tiles do mapa futuramente) ──
const storagePath = path.resolve(process.env.STORAGE_BASE_PATH ?? './storage')
app.use('/outputs', express.static(path.join(storagePath, 'outputs')))

// ── Erros ──
app.use(notFound)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`\n  Mapeia.AI API`)
  console.log(`   -> http://localhost:${PORT}`)
  console.log(`   -> health: http://localhost:${PORT}/health\n`)
  startCleanupJob()
})

export default app
