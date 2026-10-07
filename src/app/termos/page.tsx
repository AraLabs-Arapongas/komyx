import { LegalPage, Section } from "@/components/legal/legal-page";
import { publicPageMetadata } from "@/lib/seo";
import { MONTHLY_PRICE, TRIAL_DAYS } from "@/lib/billing";
import { formatCurrency } from "@/lib/utils";

export const metadata = publicPageMetadata({ title: "Termos de Uso", description: "Condições de uso do Komyx para buffets e clientes.", path: "/termos" });

export default function TermsPage() {
  return (
    <LegalPage title="Termos de Uso" updated="3 de outubro de 2026">
      <p>Estes termos regulam o uso do Komyx, serviço da AraLabs, pelo site komyx.com.br e pelo aplicativo Komyx. Ao criar uma conta ou usar o aplicativo, você concorda com eles.</p>

      <Section title="1. O serviço">
        <p>O Komyx oferece aos buffets agenda, orçamentos, contratos, convites, lista de convidados, registro de pagamentos e uma página pública. Aos clientes dos buffets, oferece acompanhamento da festa: valores, Pix do buffet, convidados, convite e pedidos.</p>
        <p>O Komyx não presta o serviço de buffet nem intermedeia pagamentos. Pagamentos por Pix vão diretamente para a chave do buffet, e o buffet é quem confirma o recebimento.</p>
      </Section>

      <Section title="2. Contas">
        <p>Buffets acessam com e-mail e senha. Clientes acessam com o celular informado na reserva, por código enviado por SMS, ou pelo link da reserva. Você é responsável por manter suas credenciais em sigilo e pelo uso feito com elas.</p>
      </Section>

      <Section title="3. Assinatura e pagamento">
        <p>O buffet tem {TRIAL_DAYS} dias de teste gratuito. Depois disso a assinatura custa {formatCurrency(MONTHLY_PRICE)} por mês no plano mensal, com descontos nos planos trimestral, semestral e anual publicados no site. Valores podem ser atualizados com aviso prévio de 30 dias.</p>
        <p>O cancelamento pode ser feito a qualquer momento e vale a partir do fim do período já pago. Não há reembolso proporcional, salvo quando a lei exigir.</p>
        <p>O aplicativo do cliente é gratuito.</p>
      </Section>

      <Section title="4. Responsabilidades do buffet">
        <p>O buffet responde pelas informações que publica (preços, pacotes, cardápio, disponibilidade), pelos contratos que emite e pelo tratamento dos dados dos seus clientes e convidados conforme a lei. O modelo de contrato do Komyx é um ponto de partida e não substitui orientação jurídica.</p>
      </Section>

      <Section title="5. Uso aceitável">
        <p>É proibido usar o Komyx para enviar mensagens não solicitadas, publicar conteúdo ilegal ou ofensivo, tentar acessar dados de outros buffets ou interferir no funcionamento do serviço. Contas que violem estas regras podem ser suspensas.</p>
      </Section>

      <Section title="6. Disponibilidade">
        <p>Trabalhamos para manter o serviço no ar, mas não garantimos funcionamento ininterrupto. Manutenções programadas são avisadas com antecedência quando possível.</p>
      </Section>

      <Section title="7. Propriedade intelectual">
        <p>O Komyx, sua marca e seu código pertencem à AraLabs. Os dados e conteúdos inseridos pelos buffets e clientes pertencem a eles, que nos concedem licença apenas para operar o serviço.</p>
      </Section>

      <Section title="8. Limitação de responsabilidade">
        <p>Na medida permitida pela lei, a AraLabs não responde por lucros cessantes nem por danos indiretos decorrentes do uso do serviço, e sua responsabilidade total fica limitada aos valores pagos pelo buffet nos 12 meses anteriores ao evento.</p>
      </Section>

      <Section title="9. Foro e contato">
        <p>Aplica-se a lei brasileira. Fica eleito o foro de Arapongas/PR. Dúvidas: <a href="mailto:contato@aralabs.com.br" className="underline underline-offset-4">contato@aralabs.com.br</a>.</p>
      </Section>
    </LegalPage>
  );
}
