import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

const FREE_LIMIT = 3

/**
 * Middleware: bloqueia criação de novos projetos quando o limite gratuito
 * é atingido.
 *
 * TODO (auth): quando autenticação for adicionada, filtrar por userId.
 * Por ora conta todos os projetos (adequado para demo / beta fechado).
 */
export async function freeTierGuard(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const total = await prisma.project.count()

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
