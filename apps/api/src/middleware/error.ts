import { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  status?: number
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? 500
  const message = err.message ?? 'Erro interno do servidor'

  if (status >= 500) {
    console.error('[ERROR]', err)
  }

  res.status(status).json({ error: message })
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Rota não encontrada' })
}
