import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade — Mapeia.AI',
}

export default function PrivacyPage() {
  const lastUpdated = '4 de abril de 2025'

  return (
    <main className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-100 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-green-600">
            Mapeia.AI
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← Voltar
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidade</h1>
        <p className="text-sm text-gray-400 mb-2">Última atualização: {lastUpdated}</p>
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-10">
          Esta política está em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
        </p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Quem é o responsável pelos seus dados</h2>
            <p>
              O Mapeia.AI é o controlador dos dados pessoais coletados nesta plataforma.
              Para entrar em contato com nosso encarregado de dados (DPO), utilize:{' '}
              <span className="text-green-600">privacidade@mapeia.ai</span>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Quais dados coletamos</h2>
            <p className="font-semibold text-gray-900 mb-2">2.1 Dados de cadastro</p>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>Nome e endereço de e-mail</li>
              <li>Senha (armazenada de forma criptografada)</li>
              <li>Dados de pagamento (processados diretamente pelo gateway — não armazenamos dados de cartão)</li>
            </ul>

            <p className="font-semibold text-gray-900 mb-2">2.2 Imagens enviadas pelo usuário</p>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>Fotografias aéreas enviadas para processamento</li>
              <li>Metadados EXIF das imagens (se presentes), como coordenadas GPS e data de captura</li>
            </ul>

            <p className="font-semibold text-gray-900 mb-2">2.3 Dados de uso</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Endereço IP e tipo de navegador</li>
              <li>Páginas acessadas e tempo de sessão</li>
              <li>Logs de erros e desempenho do serviço</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Para que usamos seus dados</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 border border-gray-200 font-semibold">Finalidade</th>
                    <th className="text-left p-3 border border-gray-200 font-semibold">Base legal (LGPD)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Criar e gerenciar sua conta', 'Execução de contrato (art. 7º, V)'],
                    ['Processar as imagens enviadas', 'Execução de contrato (art. 7º, V)'],
                    ['Enviar e-mails transacionais (status do projeto)', 'Execução de contrato (art. 7º, V)'],
                    ['Melhorar a qualidade do serviço', 'Interesse legítimo (art. 7º, IX)'],
                    ['Enviar comunicações de marketing', 'Consentimento (art. 7º, I)'],
                    ['Cumprir obrigações legais', 'Cumprimento de obrigação legal (art. 7º, II)'],
                  ].map(([fin, base]) => (
                    <tr key={fin}>
                      <td className="p-3 border border-gray-200">{fin}</td>
                      <td className="p-3 border border-gray-200 text-gray-500">{base}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Compartilhamento de dados</h2>
            <p>
              <strong>Não vendemos seus dados.</strong> Compartilhamos informações apenas com:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong>Provedores de infraestrutura</strong> (hospedagem de servidores e armazenamento
                de arquivos), exclusivamente para operação do serviço.
              </li>
              <li>
                <strong>Gateway de pagamento</strong>, para processar cobranças de forma segura.
              </li>
              <li>
                <strong>Autoridades públicas</strong>, quando exigido por lei ou ordem judicial.
              </li>
            </ul>
            <p className="mt-3">
              Todos os fornecedores são contratualmente obrigados a proteger seus dados e
              utilizá-los apenas para as finalidades autorizadas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Armazenamento e segurança</h2>
            <p>
              Seus dados são armazenados em servidores seguros. Adotamos medidas técnicas e
              organizacionais para proteger as informações contra acesso não autorizado,
              alteração, divulgação ou destruição, incluindo:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Criptografia em trânsito (HTTPS/TLS)</li>
              <li>Senhas armazenadas com hash seguro (bcrypt)</li>
              <li>Acesso restrito a dados por equipe autorizada</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Retenção de dados</h2>
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa. Imagens e mapas de
              projetos são armazenados por até <strong>90 dias</strong> após o processamento.
              Dados de conta são excluídos em até 30 dias após solicitação de exclusão.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Seus direitos (LGPD, art. 18)</h2>
            <p>Você tem direito a:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li><strong>Confirmar</strong> a existência de tratamento dos seus dados</li>
              <li><strong>Acessar</strong> os dados que temos sobre você</li>
              <li><strong>Corrigir</strong> dados incompletos, inexatos ou desatualizados</li>
              <li><strong>Solicitar a exclusão</strong> dos seus dados pessoais</li>
              <li><strong>Revogar o consentimento</strong> para comunicações de marketing</li>
              <li><strong>Portabilidade</strong> dos dados para outro serviço</li>
            </ul>
            <p className="mt-3">
              Para exercer qualquer direito, envie um e-mail para{' '}
              <span className="text-green-600">privacidade@mapeia.ai</span>. Responderemos em
              até 15 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Cookies</h2>
            <p>
              Utilizamos cookies essenciais para o funcionamento da plataforma (autenticação e sessão)
              e cookies analíticos para entender como o serviço é utilizado. Você pode desativar
              cookies analíticos nas configurações do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Alterações nesta política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Em caso de alterações
              relevantes, notificaremos você por e-mail com antecedência mínima de 15 dias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Contato</h2>
            <p>
              Dúvidas sobre privacidade ou tratamento de dados:{' '}
              <span className="text-green-600">privacidade@mapeia.ai</span>
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Você também pode registrar reclamações junto à Autoridade Nacional de Proteção de
              Dados (ANPD): <span className="text-green-600">gov.br/anpd</span>
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
