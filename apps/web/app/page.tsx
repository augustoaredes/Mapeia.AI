import Link from 'next/link'
import {
  Upload, Map, Download, Zap, Shield, Smartphone, Target,
  ChevronRight, Check, ArrowRight,
} from 'lucide-react'

export default function Home() {
  return (
    <main>
      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <span className="text-brand font-bold text-xl tracking-tight">Mapeia.AI</span>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden sm:block text-sm text-slate-400 hover:text-slate-100 transition-colors cursor-pointer">
              Entrar
            </Link>
            <Link
              href="/upload"
              className="flex items-center gap-1.5 bg-brand text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-400 transition-colors cursor-pointer"
            >
              Testar grátis <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-20 overflow-hidden bg-slate-950">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        {/* Glow orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-brand/5 blur-[120px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center animate-in">
          <div className="inline-flex items-center gap-2 bg-slate-800/80 border border-slate-700 text-brand text-xs font-semibold uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />
            Novo — Fotogrametria sem complicação
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-50 leading-[1.05] tracking-tight mb-6">
            Fotos de drone{' '}
            <span className="text-gradient">viram mapa</span>{' '}
            em minutos
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
            Sem instalar nada. Sem complicação.<br />
            Envie as fotos e receba um mapa profissional pronto para usar.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/upload"
              className="group flex items-center justify-center gap-2 bg-brand text-slate-900 font-bold text-lg px-8 py-4 rounded-xl hover:bg-green-400 transition-all duration-200 shadow-glow cursor-pointer"
            >
              Testar grátis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#como-funciona"
              className="flex items-center justify-center gap-2 border border-slate-700 text-slate-300 font-semibold text-lg px-8 py-4 rounded-xl hover:border-slate-500 hover:text-slate-100 transition-colors cursor-pointer"
            >
              Ver como funciona
            </a>
          </div>

          <p className="text-xs text-slate-600 mt-5">
            1 projeto gratuito · sem cartão de crédito
          </p>

          {/* Preview mockup */}
          <div className="mt-16 relative mx-auto max-w-2xl">
            <div className="glass rounded-2xl border border-slate-700/60 p-4 shadow-modal">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs text-slate-600 font-mono">mapeia.ai/dashboard</span>
              </div>
              <div className="bg-slate-900 rounded-lg p-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'Fazenda Norte', status: 'Concluído', color: 'text-green-400' },
                  { label: 'Área Industrial', status: 'Processando', color: 'text-yellow-400' },
                  { label: 'Reservatório Sul', status: 'Concluído', color: 'text-green-400' },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-800 rounded-lg p-3">
                    <div className="w-full h-16 bg-slate-700 rounded mb-2 overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-green-900/40 to-slate-700" />
                    </div>
                    <p className="text-xs text-slate-300 font-medium truncate">{item.label}</p>
                    <p className={`text-xs ${item.color} mt-0.5`}>{item.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section id="como-funciona" className="py-24 px-4 bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-50 mb-3">Como funciona</h2>
            <p className="text-slate-400">Três passos. Resultado profissional.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: Upload,   step: '01', title: 'Envie as fotos', desc: 'Selecione as fotos do drone por arrastar ou clicar. Quanto mais fotos, mais detalhado o mapa.' },
              { icon: Map,      step: '02', title: 'Processamos',    desc: 'Nossa plataforma processa automaticamente em alta resolução. Você acompanha o progresso em tempo real.' },
              { icon: Download, step: '03', title: 'Receba o mapa',  desc: 'Visualize o ortomosaico no navegador ou faça o download em formato profissional.' },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="relative glass rounded-2xl p-6 border border-slate-700/50 hover:border-slate-600 transition-all duration-200 group">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
                    <Icon className="w-5 h-5 text-brand" />
                  </div>
                  <span className="text-4xl font-black text-slate-800">{step}</span>
                </div>
                <h3 className="font-bold text-slate-100 mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefícios (bento grid) ── */}
      <section className="py-24 px-4 bg-slate-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-50 mb-3">Por que usar o Mapeia.AI?</h2>
            <p className="text-slate-400">Feito para quem quer resultado, não complexidade.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 auto-rows-fr">
            {/* Grande */}
            <div className="col-span-2 row-span-2 glass rounded-2xl p-6 border border-slate-700/50 hover:border-slate-600 transition-all group flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3">Resultado em minutos</h3>
              <p className="text-slate-400 text-sm leading-relaxed flex-1">
                O que antes levava dias agora fica pronto em minutos. Nosso processamento em nuvem roda em paralelo para entregar seu mapa o mais rápido possível.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[['&lt; 10min', 'tempo médio'], ['99%', 'uptime']].map(([val, lbl]) => (
                  <div key={lbl} className="bg-slate-800/60 rounded-xl p-3">
                    <p className="text-xl font-black text-brand" dangerouslySetInnerHTML={{ __html: val }} />
                    <p className="text-xs text-slate-500 mt-0.5">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>

            {[
              { icon: Smartphone, title: 'Funciona no celular', desc: 'Sem instalar nada. Abre direto no navegador do seu smartphone.' },
              { icon: Shield,     title: 'Dados protegidos',    desc: 'Suas imagens são privadas e nunca compartilhadas com terceiros.' },
              { icon: Target,     title: 'Alta precisão',       desc: 'Ortomosaicos georreferenciados prontos para uso profissional.' },
              { icon: Map,        title: 'Visualização online', desc: 'Mapa interativo diretamente na plataforma, sem precisar baixar.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass rounded-2xl p-5 border border-slate-700/50 hover:border-slate-600 transition-all group">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center mb-3 group-hover:bg-brand/10 transition-colors">
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-brand transition-colors" />
                </div>
                <h3 className="font-semibold text-slate-200 text-sm mb-1">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Preço ── */}
      <section id="preco" className="py-24 px-4 bg-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-5">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-50 mb-3">Preços simples e justos</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Um levantamento tradicional custa{' '}
              <span className="text-slate-200 font-semibold">R$ 2.000–8.000 por projeto</span>.
              Com o Mapeia.AI você entrega o mesmo resultado e fica com a margem.
            </p>
          </div>

          {/* Planos mensais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 mt-10">
            {[
              {
                label: 'Business',
                price: 'R$ 547',
                desc:  'Empresas e equipes',
                items: ['Até 3.000 fotos / projeto (≈ 500 ha)', 'Projetos ilimitados', 'Fila de alta prioridade'],
                featured: false,
                href: '/upgrade',
              },
              {
                label: 'Pro',
                price: 'R$ 297',
                desc:  'Profissionais',
                items: ['Até 1.000 fotos / projeto (≈ 165 ha)', 'Projetos ilimitados', 'Fila prioritária'],
                featured: true,
                href: '/upgrade',
              },
              {
                label: 'Starter',
                price: 'R$ 149',
                desc:  'Pilotos autônomos',
                items: ['Até 500 fotos / projeto (≈ 83 ha)', 'Projetos ilimitados', 'Suporte por e-mail'],
                featured: false,
                href: '/upgrade',
              },
            ].map(({ label, price, desc, items, featured, href }) => (
              <div
                key={label}
                className={`relative rounded-2xl p-6 border flex flex-col
                  ${featured
                    ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-brand/50 shadow-glow'
                    : 'glass border-slate-700/60'}`}
              >
                {featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-slate-900 text-xs font-bold px-3 py-1 rounded-full">
                    MAIS POPULAR
                  </span>
                )}
                <div className="mb-3">
                  <span className="text-3xl font-black text-slate-50">{price}</span>
                  <span className="text-sm text-slate-500 ml-1">/mês</span>
                </div>
                <p className="font-bold text-slate-200 mb-1">{label}</p>
                <p className="text-slate-500 text-xs mb-4">{desc}</p>
                <ul className="space-y-2 flex-1 mb-5">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
                      <Check className="w-3 h-3 text-brand flex-shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={href}
                  className={`w-full flex items-center justify-center text-sm font-semibold py-2.5 rounded-xl transition-colors cursor-pointer
                    ${featured
                      ? 'bg-brand text-slate-900 hover:bg-green-400'
                      : 'border border-slate-600 text-slate-300 hover:border-brand hover:text-brand'}`}
                >
                  Assinar {label}
                </Link>
              </div>
            ))}
          </div>

          {/* Pay-per-use */}
          <div className="glass rounded-2xl border border-slate-700/60 p-6">
            <p className="text-sm font-semibold text-slate-400 mb-4">Ou pague por projeto — sem assinatura</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { fotos: 'Até 150 fotos', ha: '≈ 25 ha', preco: 'R$ 59' },
                { fotos: 'Até 400 fotos', ha: '≈ 67 ha', preco: 'R$ 99',  popular: true },
                { fotos: 'Até 1.200 fotos', ha: '≈ 200 ha', preco: 'R$ 189' },
              ].map(({ fotos, ha, preco, popular }) => (
                <div key={fotos} className={`relative flex items-center justify-between px-4 py-3 rounded-xl border ${popular ? 'border-brand/30 bg-brand/5' : 'border-slate-800'}`}>
                  {popular && (
                    <span className="absolute -top-2 left-3 text-[10px] font-bold text-brand bg-slate-950 px-1.5">MAIS PEDIDO</span>
                  )}
                  <div>
                    <p className="text-slate-200 text-sm font-medium">{fotos}</p>
                    <p className="text-slate-600 text-xs">{ha}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-100 font-black text-lg">{preco}</p>
                    <Link href="/upload" className="text-brand text-xs hover:underline cursor-pointer">Comprar →</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2">
            {[
              'Sem fidelidade',
              'Cancele quando quiser',
              'Download incluso',
              'Crédito devolvido se falhar',
            ].map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-sm text-slate-500">
                <Check className="w-3.5 h-3.5 text-brand" /> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-24 px-4 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(34,197,94,0.06),transparent)]" />
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black text-slate-50 mb-5">
            Pronto para criar<br />seu primeiro mapa?
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            1 projeto gratuito.<br />Sem cartão de crédito.
          </p>
          <Link
            href="/upload"
            className="group inline-flex items-center gap-2 bg-brand text-slate-900 font-bold text-xl px-10 py-5 rounded-2xl hover:bg-green-400 transition-all shadow-glow cursor-pointer"
          >
            Testar grátis
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </main>
  )
}
