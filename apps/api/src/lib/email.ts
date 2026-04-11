import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = process.env.RESEND_FROM ?? 'Mapeia.AI <no-reply@mapeia.ai>'
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'

export async function sendVerificationEmail(opts: {
  to: string
  name: string
  token: string
}): Promise<void> {
  const verifyUrl = `${process.env.API_URL ?? 'http://localhost:3001'}/api/auth/verify?token=${opts.token}`

  if (!resend) {
    console.log('\n' + '='.repeat(60))
    console.log('[Email] RESEND_API_KEY não configurada — modo dev')
    console.log(`[Email] Clique para verificar ${opts.to}:`)
    console.log(`[Email] ${verifyUrl}`)
    console.log('='.repeat(60) + '\n')
    return
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0f172a;font-family:Inter,Arial,sans-serif;margin:0;padding:40px 16px">
  <div style="max-width:480px;margin:0 auto">
    <p style="color:#22c55e;font-weight:800;font-size:20px;margin:0 0 24px">Mapeia.AI</p>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px">
      <h1 style="color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 8px">
        Confirme seu e-mail
      </h1>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;line-height:1.6">
        Olá, ${opts.name}! Clique no botão abaixo para ativar sua conta Mapeia.AI.
        O link expira em 24 horas.
      </p>
      <a href="${verifyUrl}"
        style="display:inline-block;background:#22c55e;color:#0f172a;font-weight:700;
          font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none">
        Verificar e-mail →
      </a>
      <p style="color:#475569;font-size:12px;margin:20px 0 0;word-break:break-all">
        Ou copie: ${verifyUrl}
      </p>
    </div>
    <p style="color:#334155;font-size:12px;margin:24px 0 0;text-align:center">
      Mapeia.AI · Se não criou esta conta, ignore este e-mail.
    </p>
  </div>
</body>
</html>`

  try {
    await resend.emails.send({
      from:    FROM,
      to:      opts.to,
      subject: 'Confirme seu e-mail — Mapeia.AI',
      html,
    })
    console.log(`[Email] Verificação enviada para ${opts.to}`)
  } catch (err) {
    console.error('[Email] Falha ao enviar verificação:', err)
    throw err
  }
}

export async function sendProcessingComplete(opts: {
  to: string
  name: string
  projectId: string
  projectName: string
  areaHa?: number | null
  gsdCm?: number | null
}): Promise<void> {
  if (!resend) {
    console.log(`[Email] RESEND_API_KEY não configurada — e-mail não enviado para ${opts.to}`)
    return
  }

  const projectUrl = `${FRONTEND_URL}/project/${opts.projectId}`
  const areaLine   = opts.areaHa != null ? `<p style="color:#94a3b8;font-size:14px;margin:4px 0">📐 Área mapeada: <strong style="color:#e2e8f0">${opts.areaHa.toLocaleString('pt-BR')} ha</strong></p>` : ''
  const gsdLine    = opts.gsdCm  != null ? `<p style="color:#94a3b8;font-size:14px;margin:4px 0">🔍 GSD: <strong style="color:#e2e8f0">${opts.gsdCm} cm/pixel</strong></p>` : ''

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0f172a;font-family:Inter,Arial,sans-serif;margin:0;padding:40px 16px">
  <div style="max-width:520px;margin:0 auto">
    <p style="color:#22c55e;font-weight:800;font-size:20px;margin:0 0 24px">Mapeia.AI</p>

    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px">
      <div style="width:48px;height:48px;background:#22c55e22;border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 0 20px">
        <span style="font-size:24px">✅</span>
      </div>
      <h1 style="color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 8px">
        Seu mapa está pronto!
      </h1>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;line-height:1.6">
        Olá, ${opts.name}. O processamento do projeto <strong style="color:#e2e8f0">${opts.projectName}</strong> foi concluído com sucesso.
      </p>

      ${areaLine}
      ${gsdLine}

      <a href="${projectUrl}"
        style="display:inline-block;margin-top:24px;background:#22c55e;color:#0f172a;font-weight:700;
          font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none">
        Ver mapa →
      </a>
    </div>

    <p style="color:#334155;font-size:12px;margin:24px 0 0;text-align:center">
      Mapeia.AI · <a href="${FRONTEND_URL}" style="color:#475569">mapeia.ai</a>
    </p>
  </div>
</body>
</html>`

  try {
    await resend.emails.send({
      from:    FROM,
      to:      opts.to,
      subject: `✅ Mapa pronto: ${opts.projectName}`,
      html,
    })
    console.log(`[Email] Notificação enviada para ${opts.to}`)
  } catch (err) {
    // Não falha o processamento por causa do e-mail
    console.error('[Email] Falha ao enviar:', err)
  }
}
