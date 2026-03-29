import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import meteoraLogo from "@/assets/meteora-branca.png";
import meteoraLogoPreta from "@/assets/meteora-preta.png";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background meteora-noise">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <img src={meteoraLogo} alt="Meteora Digital" className="h-6 mb-8 opacity-80 dark:block hidden" />
        <img src={meteoraLogoPreta} alt="Meteora Digital" className="h-6 mb-8 opacity-80 dark:hidden block" />

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
          Política de Privacidade
        </h1>
        <p className="text-xs text-muted-foreground mb-10">Última atualização: 29 de março de 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground leading-relaxed [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-foreground [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-foreground">
          <p>
            A <strong>Meteora Digital</strong>, inscrita no CNPJ sob o nº <strong>32.028.021/0001-01</strong>,
            com sede no Brasil, é responsável pelo tratamento dos dados pessoais coletados por meio
            desta plataforma, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
          </p>

          <h2>1. Dados coletados</h2>
          <p>Coletamos os seguintes dados pessoais quando você utiliza nossos serviços:</p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Nome completo e nome da empresa</li>
            <li>Endereço de e-mail</li>
            <li>Número de WhatsApp</li>
            <li>Dados de uso da plataforma (páginas visitadas, funcionalidades utilizadas)</li>
            <li>Conteúdo das conversas gerenciadas pelos agentes de IA</li>
            <li>Documentos enviados para a base de conhecimento dos agentes</li>
            <li>Informações de pagamento (processadas de forma segura via Stripe)</li>
          </ul>

          <h2>2. Finalidade do tratamento</h2>
          <p>Os dados coletados são utilizados para:</p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Prestação dos serviços contratados (agentes de IA, automação de atendimento)</li>
            <li>Personalização e melhoria da experiência do usuário</li>
            <li>Comunicações sobre o serviço, atualizações e suporte</li>
            <li>Processamento de pagamentos e gestão de assinaturas</li>
            <li>Cumprimento de obrigações legais e regulatórias</li>
            <li>Análises estatísticas agregadas para melhoria dos serviços</li>
          </ul>

          <h2>3. Compartilhamento de dados</h2>
          <p>
            Seus dados pessoais não são vendidos a terceiros. Podem ser compartilhados com:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Provedores de infraestrutura (hospedagem, banco de dados)</li>
            <li>Processadores de pagamento (Stripe)</li>
            <li>Provedores de IA (OpenAI, Google) — sem identificação pessoal do usuário final</li>
            <li>Autoridades competentes, quando exigido por lei</li>
          </ul>

          <h2>4. Armazenamento e segurança</h2>
          <p>
            Os dados são armazenados em servidores seguros com criptografia em trânsito (TLS) e em repouso.
            Implementamos isolamento por tenant (multi-tenancy seguro), controle de acesso baseado em funções
            (RBAC) e políticas de segurança em nível de linha (RLS) para garantir que cada cliente
            acesse apenas seus próprios dados.
          </p>

          <h2>5. Retenção de dados</h2>
          <p>
            Os dados pessoais são mantidos enquanto a conta estiver ativa ou conforme necessário para
            prestar os serviços. Após o encerramento da conta, os dados são excluídos em até 90 dias,
            salvo obrigação legal de retenção.
          </p>

          <h2>6. Direitos do titular</h2>
          <p>Em conformidade com a LGPD, você tem direito a:</p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Confirmar a existência de tratamento de dados</li>
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
            <li>Solicitar a anonimização, bloqueio ou eliminação de dados</li>
            <li>Solicitar a portabilidade dos dados</li>
            <li>Revogar o consentimento a qualquer momento</li>
          </ul>

          <h2>7. Cookies</h2>
          <p>
            Utilizamos cookies essenciais para o funcionamento da plataforma (autenticação, sessão)
            e cookies analíticos para entender o uso do serviço. Você pode desativá-los nas configurações
            do seu navegador, mas isso pode afetar a funcionalidade da plataforma.
          </p>

          <h2>8. Contato</h2>
          <p>
            Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato:
          </p>
          <p className="text-sm">
            <strong>Meteora Digital</strong><br />
            CNPJ: 32.028.021/0001-01<br />
            E-mail: privacidade@meteoradigital.io
          </p>

          <div className="mt-10 pt-8 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground/60">
              Esta política pode ser atualizada periodicamente. Recomendamos a revisão regular deste documento.
              A continuidade do uso da plataforma após alterações constitui aceitação das novas condições.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
