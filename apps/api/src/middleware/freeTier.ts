import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { AuthRequest } from './requireAuth'

const FREE_LIMIT = 3

export async function freeTierGuard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId

    const total = await prisma.project.count({ where: { userId } })

    if (total >= FREE_LIMIT) {
      res.status(402).json({
        error:   'Limite gratuito atingido',
        code:    'FREE_TIER_EXCEEDED',
        limit:   FREE_LIMIT,
        current: total,
        upgrade: '/upgrade',
      })
      return
    }

    next()
  } catch (err) {
    next(err)
  }
}
