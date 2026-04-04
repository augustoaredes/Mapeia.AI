import Link from 'next/link'

export const metadata = {
  title: 'Termos de Uso — Mapeia.AI',
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Termos de Uso</h1>
        <p className="text-sm text-gray-400 mb-10">Última atualização: {lastUpdated}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou utilizar a plataforma Mapeia.AI, você concorda com estes Termos de Uso.
              Caso não concorde com alguma parte, pedimos que não utilize o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Descrição do Serviço</h2>
            <p>
              O Mapeia.AI é uma plataforma online de processamento de imagens aéreas capturadas
              por drones. O serviço recebe imagens do usuário e gera produtos cartográficos
              (ortomosaicos e mapas digitais) de forma automatizada.
            </p>
            <p className="mt-2">
              O processamento é realizado com o auxílio de tecnologia de código aberto.
              A plataforma <strong>não se afilia, não é patrocinada e não tem relação oficial</strong> com
              o projeto OpenDroneMap ou WebODM. Créditos ao projeto OpenDroneMap estão listados
              na seção de tecnologias utilizadas ao final deste documento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Responsabilidade pelas Imagens</h2>
            <p>
              O usuário é <strong>inteiramente responsável</strong> pelas imagens que envia à plataforma.
              Ao fazer o upload, o usuário declara e garante que:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                Possui todos os direitos necessários sobre as imagens enviadas, incluindo
                autorizações de voo e de captura de imagens da área fotografada.
              </li>
              <li>
                As imagens não violam direitos de terceiros, privacidade de pessoas,
                ou legislação aplicável (inclusive a legislação de uso de drones da ANAC e DECEA no Brasil).
              </li>
              <li>
                Não enviará imagens de áreas restritas, instalações militares, ou qualquer
                conteúdo ilegal.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Uso da Plataforma</h2>
            <p>É <strong>proibido</strong> utilizar o Mapeia.AI para:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Processar imagens obtidas ilegalmente.</li>
              <li>Realizar atividades que violem leis brasileiras ou internacionais.</li>
              <li>Tentar comprometer a segurança ou a disponibilidade do serviço.</li>
              <li>Revender o serviço sem autorização expressa.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Limitação de Responsabilidade</h2>
            <p>
              O Mapeia.AI é fornecido &quot;no estado em que se encontra&quot; (<em>as is</em>). Não garantimos:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Disponibilidade ininterrupta do serviço.</li>
              <li>Ausência de erros ou falhas no processamento.</li>
              <li>
                Precisão absoluta dos mapas gerados — os resultados dependem diretamente
                da qualidade das imagens fornecidas pelo usuário.
              </li>
            </ul>
            <p className="mt-3">
              Em nenhum caso o Mapeia.AI será responsável por danos indiretos, lucros cessantes
              ou prejuízos decorrentes do uso ou impossibilidade de uso do serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Pagamento e Reembolso</h2>
            <p>
              Os planos e valores estão descritos na página de preços. Pagamentos são processados
              por intermediadores financeiros seguros (Stripe / Pix). Reembolsos serão avaliados
              caso a caso em situações de falha técnica comprovada da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Modificações e Encerramento</h2>
            <p>
              Reservamo-nos o direito de modificar estes termos a qualquer momento,
              comunicando os usuários com antecedência razoável. Também podemos suspender
              ou encerrar o serviço, garantindo o acesso aos dados do usuário por um período
              mínimo de 30 dias após comunicação prévia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Lei Aplicável</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil.
              Eventuais disputas serão submetidas ao foro da comarca de São Paulo/SP.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Contato</h2>
            <p>
              Dúvidas sobre estes Termos de Uso podem ser enviadas para:{' '}
              <span className="text-green-600">contato@mapeia.ai</span>
            </p>
          </section>

          <section className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Tecnologias de Código Aberto Utilizadas</h2>
            <p className="text-sm text-gray-600">
              Esta plataforma utiliza o <strong>OpenDroneMap (ODM)</strong> para processamento
              fotogramétrico. O ODM é um projeto de código aberto distribuído sob a licença
              GNU General Public License v3 (GPL-3.0).
            </p>
            <p className="text-sm text-gray-600 mt-2">
              O Mapeia.AI não é afiliado, patrocinado ou endossado pelo projeto OpenDroneMap.
              Para mais informações sobre o ODM, acesse:{' '}
              <span className="text-green-600">opendronemap.org</span>
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
