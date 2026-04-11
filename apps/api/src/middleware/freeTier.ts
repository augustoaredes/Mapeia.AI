import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { getPlanConfig } from '../lib/plans'
import { AuthRequest } from './requireAuth'

const FREE_LIFETIME_LIMIT = 1

export async function freeTierGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { subscriptionStatus: true, totalProjectsCreated: true, planId: true, projectCredits: true, emailVerified: true },
    })

    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado' })
      return
    }

    // Bloqueia criação de projetos enquanto e-mail não for verificado
    // Em desenvolvimento, pula essa verificação para facilitar testes
    const isProd = process.env.NODE_ENV === 'production'
    if (isProd && !user.emailVerified) {
      res.status(403).json({
        error: 'Verifique seu e-mail antes de criar projetos.',
        code:  'EMAIL_NOT_VERIFIED',
      })
      return
    }

    const plan = getPlanConfig(user.planId)

    // ── Assinantes com projetos ilimitados ───────────────────────────────────
    if (user.subscriptionStatus === 'active' && plan.projectsUnlimited) {
      next()
      return
    }

    // ── Pay-per-use: consome 1 crédito de projeto ────────────────────────────
    if (user.subscriptionStatus === 'active' && !plan.projectsUnlimited) {
      if (user.projectCredits <= 0) {
        res.status(402).json({
          error:   'Sem créditos de projeto disponíveis',
          code:    'NO_PROJECT_CREDITS',
          upgrade: '/upgrade',
        })
        return
      }

      // Decrementa 1 crédito atomicamente
      await prisma.user.update({
        where: { id: userId },
        data:  { projectCredits: { decrement: 1 } },
      })

      // Se ficou sem créditos, volta para plano free
      const remaining = user.projectCredits - 1
      if (remaining <= 0) {
        await prisma.user.update({
          where: { id: userId },
          data:  { subscriptionStatus: 'free', planId: 'free' },
        })
      }

      next()
      return
    }

    // ── Plano free: limite vitalício de 1 projeto ────────────────────────────
    if (user.totalProjectsCreated >= FREE_LIFETIME_LIMIT) {
      res.status(402).json({
        error:   'Limite gratuito atingido',
        code:    'FREE_TIER_EXCEEDED',
        limit:   FREE_LIFETIME_LIMIT,
        current: user.totalProjectsCreated,
        upgrade: '/upgrade',
      })
      return
    }

    next()
  } catch (err) {
    next(err)
  }
}
