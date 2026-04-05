import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

const router = Router()

function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET não configurado')
  return jwt.sign({ sub: userId }, secret, { expiresIn: '30d' })
}

// POST /api/auth/register
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

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      res.status(409).json({ error: 'E-mail já cadastrado' })
      return
    }

    const hash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name: name.trim(), email: email.toLowerCase(), password: hash },
    })

    const token = signToken(user.id)
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/login
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

    const token = signToken(user.id)
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/auth/me
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
      select: { id: true, name: true, email: true, createdAt: true },
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
