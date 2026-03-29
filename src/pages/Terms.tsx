import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import meteoraLogo from "@/assets/meteora-branca.png";
import meteoraLogoPreta from "@/assets/meteora-preta.png";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background meteora-noise">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <img src={meteoraLogo} alt="Meteora Digital" className="h-6 mb-8 opacity-80" />

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
          Termos de Uso
        </h1>
        <p className="text-xs text-muted-foreground mb-10">Última atualização: 29 de março de 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground leading-relaxed [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-foreground [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-foreground">
          <p>
            Estes Termos de Uso regulam o acesso e utilização da plataforma <strong>Meteora Digital</strong>,
            de propriedade da empresa <strong>Meteora Digital</strong>, inscrita no CNPJ sob o nº{" "}
            <strong>32.028.021/0001-01</strong>, com sede no Brasil.
          </p>

          <h2>1. Aceitação dos termos</h2>
          <p>
            Ao criar uma conta ou utilizar qualquer funcionalidade da plataforma, você declara que leu,
            compreendeu e concorda com estes Termos de Uso e com nossa Política de Privacidade.
            Caso não concorde, não utilize nossos serviços.
          </p>

          <h2>2. Descrição dos serviços</h2>
          <p>A Meteora Digital oferece uma plataforma de agentes de inteligência artificial que inclui:</p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Criação e configuração de agentes de IA para atendimento e vendas</li>
            <li>Integração com canais de comunicação (WhatsApp, Instagram, Web)</li>
            <li>Base de conhecimento personalizável por agente</li>
            <li>Relatórios e análises de desempenho</li>
            <li>Ferramentas de automação e follow-up</li>
          </ul>

          <h2>3. Cadastro e conta</h2>
          <p>
            Para utilizar a plataforma, é necessário criar uma conta fornecendo informações verdadeiras
            e atualizadas. Você é responsável pela confidencialidade de suas credenciais de acesso
            e por todas as atividades realizadas em sua conta.
          </p>

          <h2>4. Planos e pagamento</h2>
          <p>
            A plataforma oferece diferentes planos de assinatura com funcionalidades e limites específicos.
            Os valores, recursos e condições de cada plano estão descritos na página de preços.
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>O período de teste gratuito é de 7 (sete) dias corridos</li>
            <li>As cobranças são mensais e processadas automaticamente via Stripe</li>
            <li>O cancelamento pode ser solicitado a qualquer momento, sem multa</li>
            <li>Não há reembolso proporcional para cancelamentos no meio do ciclo</li>
            <li>Add-ons e funcionalidades avulsas podem ser contratados separadamente</li>
          </ul>

          <h2>5. Uso aceitável</h2>
          <p>Ao utilizar a plataforma, você se compromete a não:</p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Utilizar os agentes para envio de spam ou mensagens não solicitadas em massa</li>
            <li>Violar leis aplicáveis, incluindo a LGPD e o Marco Civil da Internet</li>
            <li>Utilizar os serviços para atividades fraudulentas, ilegais ou abusivas</li>
            <li>Tentar acessar dados de outros clientes ou comprometer a segurança da plataforma</li>
            <li>Revender, sublicenciar ou redistribuir os serviços sem autorização prévia</li>
            <li>Enviar conteúdo que viole direitos de terceiros ou contenha material ilícito</li>
          </ul>

          <h2>6. Propriedade intelectual</h2>
          <p>
            Todo o conteúdo, design, código, marcas e tecnologia da plataforma são de propriedade
            exclusiva da Meteora Digital. Os dados e conteúdos enviados pelo cliente (documentos,
            instruções, base de conhecimento) permanecem de propriedade do cliente.
          </p>

          <h2>7. Disponibilidade do serviço</h2>
          <p>
            A Meteora Digital se esforça para manter a plataforma disponível 24 horas por dia,
            7 dias por semana, mas não garante disponibilidade ininterrupta. Manutenções programadas
            serão comunicadas com antecedência. Não nos responsabilizamos por indisponibilidades
            causadas por fatores externos (provedores de infraestrutura, operadoras, força maior).
          </p>

          <h2>8. Limitação de responsabilidade</h2>
          <p>
            A Meteora Digital não se responsabiliza por decisões tomadas com base nas respostas
            geradas pelos agentes de IA. Os agentes são ferramentas de auxílio e não substituem
            aconselhamento profissional. A responsabilidade total da Meteora Digital é limitada
            ao valor pago pelo cliente nos últimos 12 meses.
          </p>

          <h2>9. Rescisão</h2>
          <p>
            A Meteora Digital reserva-se o direito de suspender ou encerrar contas que violem
            estes termos, sem aviso prévio, sem prejuízo de eventuais medidas legais cabíveis.
            O cliente pode encerrar sua conta a qualquer momento nas configurações da plataforma.
          </p>

          <h2>10. Modificações dos termos</h2>
          <p>
            Estes termos podem ser atualizados periodicamente. Alterações significativas serão
            comunicadas por e-mail ou notificação na plataforma com pelo menos 30 dias de antecedência.
            O uso continuado da plataforma após as alterações constitui aceitação dos novos termos.
          </p>

          <h2>11. Legislação aplicável</h2>
          <p>
            Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito
            o foro da comarca da sede da Meteora Digital para dirimir quaisquer controvérsias,
            com renúncia expressa a qualquer outro, por mais privilegiado que seja.
          </p>

          <h2>12. Contato</h2>
          <p>
            Para dúvidas sobre estes termos, entre em contato:
          </p>
          <p className="text-sm">
            <strong>Meteora Digital</strong><br />
            CNPJ: 32.028.021/0001-01<br />
            E-mail: contato@meteoradigital.io
          </p>

          <div className="mt-10 pt-8 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground/60">
              Ao utilizar a plataforma Meteora Digital, você confirma que leu e concorda
              com todos os termos descritos neste documento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
