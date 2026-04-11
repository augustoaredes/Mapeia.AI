import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { sendVerificationEmail } from '../lib/email'

const router = Router()

// ── Domínios descartáveis mais comuns (lista parcial) ────────────────────────
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwam.com',
  'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'guerrillamail.info',
  'spam4.me', 'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
  'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf',
  'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf', 'trashmail.com',
  'trashmail.me', 'trashmail.net', 'trashmail.at', 'trashmail.io',
  'maildrop.cc', 'dispostable.com', 'spamgourmet.com', 'spamgourmet.net',
  'spamgourmet.org', 'mailnull.com', 'spamspot.com', 'spamcorpse.com',
  'tempinbox.co.uk', 'tempinbox.com', 'mailme.lv', 'mail7.io', '10minutemail.com',
  'tempr.email', 'discard.email', 'spambog.com', 'spam.la', 'tempm.com',
  'getnada.com', 'filzmail.com', 'throwam.com', 'moakt.com', 'emailondeck.com',
  'sharklasers.com', 'mailbucket.org', 'mytrashmail.com', 'fakeinbox.com',
])

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress ?? 'unknown'
}

function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET não configurado')
  return jwt.sign({ sub: userId }, secret, { expiresIn: '30d' })
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body as {
      name?: string; email?: string; password?: string
    }

    if (!name?.trim() || !email?.trim() || !password) {
      res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' })
      return
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' })
      return
    }

    const normalizedEmail = email.toLowerCase().trim()
    const domain = normalizedEmail.split('@')[1] ?? ''

    // Bloqueia domínios de e-mail descartáveis
    if (DISPOSABLE_DOMAINS.has(domain)) {
      res.status(400).json({
        error: 'E-mails temporários ou descartáveis não são permitidos. Use um e-mail real.',
      })
      return
    }

    // Rate limit por IP — máximo 3 contas por IP nas últimas 24h
    const ip = getClientIp(req)
    if (ip !== 'unknown') {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recentCount = await prisma.user.count({
        where: { registrationIp: ip, createdAt: { gte: since } },
      })
      if (recentCount >= 3) {
        res.status(429).json({
          error: 'Muitas contas criadas a partir deste IP. Aguarde 24 horas.',
        })
        return
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      res.status(409).json({ error: 'E-mail já cadastrado' })
      return
    }

    const hash        = await bcrypt.hash(password, 12)
    const verifyToken = crypto.randomUUID()
    const expiresAt   = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    const user = await prisma.user.create({
      data: {
        name:                name.trim(),
        email:               normalizedEmail,
        password:            hash,
        emailVerified:       false,
        verifyToken,
        verifyTokenExpiresAt: expiresAt,
        registrationIp:      ip !== 'unknown' ? ip : null,
      },
    })

    // Envia e-mail de verificação (não bloqueia o registro em caso de falha)
    await sendVerificationEmail({
      to:    user.email,
      name:  user.name,
      token: verifyToken,
    }).catch(err => console.error('[Auth] Falha ao enviar e-mail de verificação:', err))

    res.status(201).json({
      message: 'Conta criada. Verifique seu e-mail para ativar.',
      emailVerified: false,
    })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/auth/verify?token=xxx ───────────────────────────────────────────
router.get('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query as { token?: string }
    if (!token) {
      res.status(400).json({ error: 'Token inválido' }); return
    }

    const user = await prisma.user.findUnique({ where: { verifyToken: token } })

    if (!user) {
      res.status(404).json({ error: 'Link de verificação inválido ou já utilizado' }); return
    }

    if (user.verifyTokenExpiresAt && user.verifyTokenExpiresAt < new Date()) {
      res.status(410).json({ error: 'Link de verificação expirado. Solicite um novo.' }); return
    }

    await prisma.user.update({
      where: { id: user.id },
      data:  { emailVerified: true, verifyToken: null, verifyTokenExpiresAt: null },
    })

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
    res.redirect(`${frontendUrl}/login?verified=1`)
  } catch (err) {
    next(err)
  }
})

// ── POST /api/auth/resend-verify ─────────────────────────────────────────────
router.post('/resend-verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body as { email?: string }
    if (!email) { res.status(400).json({ error: 'E-mail obrigatório' }); return }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })

    // Resposta genérica para não revelar se o e-mail existe
    if (!user || user.emailVerified) {
      res.json({ message: 'Se o e-mail existir, um link será enviado.' }); return
    }

    // Rate limit: não reenviar se o token atual tem menos de 5 minutos
    if (user.verifyTokenExpiresAt) {
      const minAge = new Date(Date.now() - (24 - 0.083) * 60 * 60 * 1000) // 24h - 5min
      if (user.verifyTokenExpiresAt > minAge) {
        res.status(429).json({ error: 'Aguarde alguns minutos para reenviar.' }); return
      }
    }

    const newToken  = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data:  { verifyToken: newToken, verifyTokenExpiresAt: expiresAt },
    })

    await sendVerificationEmail({ to: user.email, name: user.name, token: newToken })

    res.json({ message: 'E-mail de verificação reenviado.' })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }

    if (!email || !password) {
      res.status(400).json({ error: 'E-mail e senha são obrigatórios' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user) {
      res.status(401).json({ error: 'E-mail ou senha incorretos' })
      return
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.status(401).json({ error: 'E-mail ou senha incorretos' })
      return
    }

    // Em desenvolvimento, permite login mesmo sem verificação
    const isProd = process.env.NODE_ENV === 'production'
    if (isProd && !user.emailVerified) {
      res.status(403).json({
        error: 'E-mail não verificado. Verifique sua caixa de entrada.',
        code:  'EMAIL_NOT_VERIFIED',
        email: user.email,
      })
      return
    }

    const token = signToken(user.id)
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Não autenticado' })
      return
    }
    const token  = authHeader.slice(7)
    const secret = process.env.JWT_SECRET!
    const payload = jwt.verify(token, secret) as { sub: string }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, name: true, email: true, createdAt: true,
        planId: true, projectCredits: true, subscriptionStatus: true,
        totalProjectsCreated: true, emailVerified: true,
      },
    })

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' })
      return
    }

    res.json(user)
  } catch (err) {
    next(err)
  }
})

export default router
