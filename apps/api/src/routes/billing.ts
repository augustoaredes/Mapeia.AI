import { Router, Request, Response, NextFunction } from 'express'
import Stripe from 'stripe'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'

const router = Router()

// ── Definição de planos ──────────────────────────────────────────────────────
interface Plan {
  name:           string
  priceId:        string | undefined
  amount:         number   // centavos BRL
  recurring:      boolean
  imageLimit:     number   // imagens por projeto
  projectCredits: number   // créditos de projeto concedidos (0 = ilimitado para assinaturas)
  planId:         string   // planId salvo no User
}

const PLANS: Record<string, Plan> = {
  // ── Pay-per-use ────────────────────────────────────────────────────────────
  avulso_150: {
    name:           'Avulso — até 150 fotos',
    priceId:        process.env.STRIPE_PRICE_AVULSO_150,
    amount:         5900,
    recurring:      false,
    imageLimit:     150,
    projectCredits: 1,
    planId:         'avulso_150',
  },
  avulso_400: {
    name:           'Avulso — até 400 fotos',
    priceId:        process.env.STRIPE_PRICE_AVULSO_400,
    amount:         9900,
    recurring:      false,
    imageLimit:     400,
    projectCredits: 1,
    planId:         'avulso_400',
  },
  avulso_1200: {
    name:           'Avulso — até 1.200 fotos',
    priceId:        process.env.STRIPE_PRICE_AVULSO_1200,
    amount:         18900,
    recurring:      false,
    imageLimit:     1200,
    projectCredits: 1,
    planId:         'avulso_1200',
  },

  // ── Assinaturas ────────────────────────────────────────────────────────────
  starter: {
    name:           'Starter Mensal',
    priceId:        process.env.STRIPE_PRICE_STARTER,
    amount:         14900,
    recurring:      true,
    imageLimit:     500,
    projectCredits: 0,
    planId:         'starter',
  },
  pro: {
    name:           'Pro Mensal',
    priceId:        process.env.STRIPE_PRICE_PRO,
    amount:         29700,
    recurring:      true,
    imageLimit:     1000,
    projectCredits: 0,
    planId:         'pro',
  },
  business: {
    name:           'Business Mensal',
    priceId:        process.env.STRIPE_PRICE_BUSINESS,
    amount:         54700,
    recurring:      true,
    imageLimit:     3000,
    projectCredits: 0,
    planId:         'business',
  },
}

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw Object.assign(new Error('Stripe não configurado'), { status: 503 })
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
}

// GET /api/billing/plans
router.get('/plans', (_req: Request, res: Response) => {
  res.json(
    Object.entries(PLANS).map(([id, plan]) => ({
      id,
      name:           plan.name,
      amount:         plan.amount,
      currency:       'brl',
      recurring:      plan.recurring,
      imageLimit:     plan.imageLimit,
      projectCredits: plan.projectCredits,
    }))
  )
})

// POST /api/billing/checkout
router.post('/checkout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId
    const { planId, successUrl, cancelUrl } = req.body as {
      planId:     string
      successUrl: string
      cancelUrl:  string
    }

    const plan = PLANS[planId]
    if (!plan?.priceId) {
      res.status(400).json({ error: 'Plano inválido ou não configurado' })
      return
    }

    const stripe = getStripe()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, stripeCustomerId: true },
    })

    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado' })
      return
    }

    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:  user.name,
        metadata: { userId },
      })
      customerId = customer.id
      await prisma.user.update({
        where: { id: userId },
        data:  { stripeCustomerId: customerId },
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 plan.recurring ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items:           [{ price: plan.priceId, quantity: 1 }],
      success_url:          successUrl,
      cancel_url:           cancelUrl,
      locale:               'pt-BR',
      metadata:             { planId, userId },
    })

    res.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    next(err)
  }
})

// POST /api/billing/webhook
router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  const sig    = req.headers['stripe-signature'] as string
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
        const userId  = session.metadata?.userId
        const planKey = session.metadata?.planId
        if (!userId || !planKey) break

        const plan = PLANS[planKey]
        if (!plan) break

        if (plan.recurring) {
          // Assinatura: ativa status e salva planId
          await prisma.user.update({
            where: { id: userId },
            data:  { subscriptionStatus: 'active', planId: plan.planId },
          })
          console.log(`[Stripe] Assinatura ${plan.name} ativada — usuário ${userId}`)
        } else {
          // Pay-per-use: adiciona crédito de projeto e salva o planId mais permissivo
          await prisma.user.update({
            where: { id: userId },
            data:  {
              subscriptionStatus: 'active',
              planId:             plan.planId,
              projectCredits:     { increment: plan.projectCredits },
            },
          })
          console.log(`[Stripe] Avulso ${plan.name} comprado — usuário ${userId} (+${plan.projectCredits} crédito)`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub        = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data:  { subscriptionStatus: 'free', planId: 'free' },
        })
        console.log(`[Stripe] Assinatura cancelada — customer ${customerId}`)
        break
      }

      case 'customer.subscription.updated': {
        // Mudança de plano (upgrade/downgrade)
        const sub        = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const priceId    = sub.items.data[0]?.price.id

        // Encontra o plano correspondente ao priceId
        const matchedPlan = Object.values(PLANS).find(p => p.priceId === priceId)
        if (matchedPlan) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data:  { planId: matchedPlan.planId },
          })
          console.log(`[Stripe] Plano atualizado para ${matchedPlan.name} — customer ${customerId}`)
        }
        break
      }

      default:
        break
    }

    res.json({ received: true })
  } catch (err) {
    console.error('[Stripe] Erro no webhook:', err)
    next(err)
  }
})

export default router
