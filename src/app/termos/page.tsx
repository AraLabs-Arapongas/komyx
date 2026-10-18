import { LegalPage, Section } from "@/components/legal/legal-page";
import { publicPageMetadata } from "@/lib/seo";
import { MONTHLY_PRICE, TRIAL_DAYS } from "@/lib/billing";
import { FULL_REFUND_DAYS, periodPrice } from "@/lib/billing/plans";
import { formatCurrency } from "@/lib/utils";

export const metadata = publicPageMetadata({ title: "Termos de Uso", description: "Condições de uso do Komyx para buffets e clientes.", path: "/termos" });

export default function TermsPage() {
  return (
    <LegalPage title="Termos de Uso" updated="19 de outubro de 2026">
      <p>Estes termos regulam o uso do Komyx, serviço da AraLabs, pelo site komyx.com.br e pelo aplicativo Komyx. Ao criar uma conta ou usar o aplicativo, você concorda com eles.</p>

      <Section title="1. O serviço">
        <p>O Komyx oferece aos buffets agenda, orçamentos, contratos, convites, lista de convidados, registro de pagamentos e uma página pública. Aos clientes dos buffets, oferece acompanhamento da festa: valores, Pix do buffet, convidados, convite e pedidos.</p>
        <p>O Komyx não presta o serviço de buffet nem intermedeia pagamentos. Pagamentos por Pix vão diretamente para a chave do buffet, e o buffet é quem confirma o recebimento.</p>
      </Section>

      <Section title="2. Contas">
        <p>Buffets acessam com e-mail e senha. Clientes acessam com o celular informado na reserva, por código enviado por SMS, ou pelo link da reserva. Você é responsável por manter suas credenciais em sigilo e pelo uso feito com elas.</p>
      </Section>

      {/* Billing clause of docs/assinatura.md, in plain words. To be reviewed by Thiago (or a lawyer). */}
      <div id="assinatura" className="scroll-mt-20">
      <Section title="3. Assinatura, pagamento e cancelamento">
        <p><b>Teste grátis.</b> Todo buffet começa com {TRIAL_DAYS} dias de teste gratuito, sem cartão. Para continuar depois do teste, cadastre o CNPJ ou CPF e o WhatsApp do buffet; com esses dados a assinatura é criada sozinha e a primeira cobrança vence no último dia do teste.</p>
        <p><b>Planos.</b> Mensal ({formatCurrency(periodPrice(1))} todo mês), 3 meses ({formatCurrency(periodPrice(3))} de uma vez), 6 meses ({formatCurrency(periodPrice(6))} de uma vez) ou 12 meses ({formatCurrency(periodPrice(12))} de uma vez). Você escolhe o plano em Minha conta e paga por Pix, boleto ou cartão na página da fatura. Valores podem ser atualizados com aviso prévio de 30 dias.</p>
        <p><b>Renovação automática.</b> Ao fim de cada período a assinatura se renova pelo mesmo plano, com uma nova cobrança, até ser cancelada.</p>
        <p><b>Troca de plano.</b> A troca vale na próxima renovação: o que já foi pago segue até o fim e o plano novo começa no dia seguinte, sem reembolso nem cobrança de diferença. Até lá é possível desfazer a troca.</p>
        <p><b>Atraso.</b> Se a fatura não for paga no vencimento, avisamos no aplicativo e por e-mail no 1º, no 5º e no 9º dia de atraso. No 10º dia o acesso ao aplicativo fica pausado: os dados continuam guardados, a página pública continua no ar recebendo pedidos de orçamento, mas a reserva online com Pix fica suspensa. O acesso volta sozinho assim que o pagamento é confirmado.</p>
        <p><b>Cancelamento.</b> Você cancela quando quiser em Minha conta. A página pública sai do ar no cancelamento e os dados ficam guardados por 90 dias depois do fim do acesso.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Até {FULL_REFUND_DAYS} dias depois de um pagamento: devolvemos aquele pagamento inteiro e o acesso termina no cancelamento.</li>
          <li>Plano mensal: sem reembolso; você usa até o fim do mês pago.</li>
          <li>Planos de 3, 6 ou 12 meses: você escolhe usar até o fim do período, sem reembolso, ou receber de volta o valor pago menos os meses usados × {formatCurrency(MONTHLY_PRICE)} (o mês começado conta como usado; o resultado nunca é negativo). Nesse caso o acesso vai até o fim do último mês contado.</li>
        </ul>
        <p>Exemplo: no plano de 12 meses ({formatCurrency(periodPrice(12))}), quem cancela no 5º mês recebe {formatCurrency(periodPrice(12) - 5 * MONTHLY_PRICE)} ({formatCurrency(periodPrice(12))} − 5 × {formatCurrency(MONTHLY_PRICE)}) e usa o Komyx até o fim do 5º mês.</p>
        <p>O reembolso é feito pelo mesmo meio do pagamento quando possível; pagamentos por boleto são devolvidos por Pix.</p>
        <p>O aplicativo do cliente é gratuito.</p>
      </Section>
      </div>

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
        <p>Aplica-se a lei brasileira. Fica eleito o foro de Arapongas/PR. Dúvidas: <a href="mailto:contato@komyx.com.br" className="underline underline-offset-4">contato@komyx.com.br</a>.</p>
      </Section>
    </LegalPage>
  );
}
