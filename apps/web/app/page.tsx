import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-bold text-green-600">Mapeia.AI</span>
          <Link
            href="/upload"
            className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Testar grátis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-20 px-4 bg-gradient-to-b from-green-50 to-white text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-6">
            Novo — Processamento de fotos de drone
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
            Transforme fotos de drone{' '}
            <span className="text-green-600">em mapa em minutos</span>
          </h1>
          <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
            Sem instalar nada. Sem complicação. Envie suas fotos e receba um
            mapa profissional pronto para usar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/upload"
              className="bg-green-600 text-white font-bold text-lg px-8 py-4 rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
            >
              Testar grátis →
            </Link>
            <a
              href="#como-funciona"
              className="border border-gray-200 text-gray-700 font-semibold text-lg px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Como funciona
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-4">Sem cartão de crédito. Primeiros 3 projetos grátis.</p>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">
            Como funciona
          </h2>
          <p className="text-center text-gray-500 mb-12">Três passos simples. Resultado profissional.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                icon: '📸',
                title: 'Envie suas fotos',
                desc: 'Selecione as fotos tiradas pelo seu drone. Quanto mais fotos, mais detalhado o mapa.',
              },
              {
                step: '2',
                icon: '⚙️',
                title: 'Processamos tudo',
                desc: 'Nossa plataforma processa automaticamente e gera o mapa em alta resolução.',
              },
              {
                step: '3',
                icon: '🗺️',
                title: 'Receba seu mapa',
                desc: 'Visualize online ou faça o download do arquivo pronto para uso.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center p-6 rounded-2xl bg-gray-50">
                <div className="text-4xl mb-4">{item.icon}</div>
                <div className="inline-block bg-green-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center mb-3 mx-auto">
                  {item.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">
            Por que usar o Mapeia.AI?
          </h2>
          <p className="text-center text-gray-500 mb-12">Simples para você. Profissional no resultado.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: '⚡',
                title: 'Rápido',
                desc: 'Receba seu mapa em minutos, sem esperar dias por resultados.',
              },
              {
                icon: '📱',
                title: 'Sem instalação',
                desc: 'Funciona direto no navegador do celular ou computador.',
              },
              {
                icon: '🔒',
                title: 'Seguro',
                desc: 'Suas imagens são protegidas e nunca compartilhadas com terceiros.',
              },
              {
                icon: '🎯',
                title: 'Preciso',
                desc: 'Mapas georreferenciados e com alta resolução para uso profissional.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex gap-4 p-6 bg-white rounded-2xl border border-gray-100"
              >
                <div className="text-3xl flex-shrink-0">{item.icon}</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preço */}
      <section id="preco" className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">
            Preços simples e justos
          </h2>
          <p className="text-center text-gray-500 mb-12">Pague pelo que usar, ou assine e economize.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Pay per use */}
            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="font-bold text-gray-900 text-xl mb-1">Avulso</h3>
              <p className="text-gray-500 text-sm mb-6">Sem compromisso. Pague por projeto.</p>
              <ul className="space-y-3 mb-8">
                {[
                  { label: 'Até 100 fotos', price: 'R$ 29' },
                  { label: 'Até 300 fotos', price: 'R$ 59' },
                  { label: 'Até 1.000 fotos', price: 'R$ 99' },
                ].map((tier) => (
                  <li key={tier.label} className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <span className="text-gray-700">{tier.label}</span>
                    <span className="font-bold text-gray-900">{tier.price}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/upload"
                className="w-full block text-center border border-green-600 text-green-600 font-semibold py-3 rounded-xl hover:bg-green-50 transition-colors"
              >
                Começar agora
              </Link>
            </div>

            {/* Planos mensais */}
            <div className="border-2 border-green-600 rounded-2xl p-8 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                MAIS POPULAR
              </span>
              <h3 className="font-bold text-gray-900 text-xl mb-1">Mensal</h3>
              <p className="text-gray-500 text-sm mb-6">Para quem usa com frequência.</p>
              <ul className="space-y-4 mb-8">
                <li className="border-b border-gray-100 pb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-900">Starter</span>
                    <span className="font-bold text-2xl text-gray-900">R$ 97<span className="text-sm font-normal text-gray-500">/mês</span></span>
                  </div>
                  <p className="text-sm text-gray-500">5 processamentos por mês</p>
                </li>
                <li>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-900">Pro</span>
                    <span className="font-bold text-2xl text-gray-900">R$ 197<span className="text-sm font-normal text-gray-500">/mês</span></span>
                  </div>
                  <p className="text-sm text-gray-500">Processamentos ilimitados (uso justo)</p>
                </li>
              </ul>
              <Link
                href="/upload"
                className="w-full block text-center bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors"
              >
                Testar 3 grátis →
              </Link>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            Todos os planos incluem download do arquivo final. Sem fidelidade nos planos mensais.
          </p>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 bg-green-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para criar seu primeiro mapa?
          </h2>
          <p className="text-green-100 mb-8 text-lg">
            Comece agora. Os primeiros 3 projetos são gratuitos.
          </p>
          <Link
            href="/upload"
            className="inline-block bg-white text-green-700 font-bold text-lg px-10 py-4 rounded-xl hover:bg-green-50 transition-colors shadow-lg"
          >
            Testar grátis →
          </Link>
        </div>
      </section>
    </main>
  )
}
