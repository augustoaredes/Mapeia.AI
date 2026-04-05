import { Router, Request, Response, NextFunction } from 'express'
import Stripe from 'stripe'

const router = Router()

// Planos disponíveis — IDs configurados via variáveis de ambiente
const PLANS = {
  avulso_100:  { name: 'Avulso — até 100 fotos',   priceId: process.env.STRIPE_PRICE_AVULSO_100,  amount: 2900 },
  avulso_300:  { name: 'Avulso — até 300 fotos',   priceId: process.env.STRIPE_PRICE_AVULSO_300,  amount: 5900 },
  avulso_1000: { name: 'Avulso — até 1.000 fotos', priceId: process.env.STRIPE_PRICE_AVULSO_1000, amount: 9900 },
  starter:     { name: 'Starter Mensal',            priceId: process.env.STRIPE_PRICE_STARTER,    amount: 9700, recurring: true },
  pro:         { name: 'Pro Mensal',                priceId: process.env.STRIPE_PRICE_PRO,        amount: 19700, recurring: true },
}

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw Object.assign(new Error('Stripe não configurado'), { status: 503 })
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
}

// GET /api/billing/plans — lista planos disponíveis
router.get('/plans', (_req: Request, res: Response) => {
  res.json(
    Object.entries(PLANS).map(([id, plan]) => ({
      id,
      name:      plan.name,
      amount:    plan.amount,
      currency:  'brl',
      recurring: plan.recurring ?? false,
    }))
  )
})

// POST /api/billing/checkout — cria sessão de checkout no Stripe
router.post('/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId, projectId, successUrl, cancelUrl } = req.body as {
      planId:     string
      projectId?: string
      successUrl: string
      cancelUrl:  string
    }

    const plan = PLANS[planId as keyof typeof PLANS]
    if (!plan?.priceId) {
      res.status(400).json({ error: 'Plano inválido ou não configurado' })
      return
    }

    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      mode:         plan.recurring ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url:  cancelUrl,
      locale:      'pt-BR',
      metadata:    { planId, ...(projectId ? { projectId } : {}) },
    })

    res.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    next(err)
  }
})

// POST /api/billing/webhook — recebe eventos do Stripe
router.post(
  '/webhook',
  // Raw body necessário para verificar assinatura
  // O express.raw() é configurado no index.ts para esta rota
  async (req: Request, res: Response, next: NextFunction) => {
    const sig = req.headers['stripe-signature'] as string
    const secret = process.env.STRIPE_WEBHOOK_SECRET

    if (!secret) {
      res.status(503).json({ error: 'Webhook secret não configurado' })
      return
    }

    try {
      const stripe = getStripe()
      const event  = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret)

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          console.log(`[Stripe] Pagamento confirmado — sessão ${session.id}`)
          // TODO: liberar acesso premium para o usuário (quando auth estiver pronto)
          break
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription
          console.log(`[Stripe] Assinatura cancelada — ${sub.id}`)
          // TODO: revogar acesso premium
          break
        }

        default:
          console.log(`[Stripe] Evento ignorado: ${event.type}`)
      }

      res.json({ received: true })
    } catch (err) {
      console.error('[Stripe] Erro no webhook:', err)
      next(err)
    }
  }
)

export default router
