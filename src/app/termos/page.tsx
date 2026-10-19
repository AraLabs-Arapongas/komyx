import { LegalPage, Section } from "@/components/legal/legal-page";
import { publicPageMetadata } from "@/lib/seo";
import { TRIAL_DAYS } from "@/lib/billing";
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
        <p><b>Teste grátis.</b> Todo buffet começa com {TRIAL_DAYS} dias de teste gratuito, sem cartão. Para continuar depois do teste, cadastre o CNPJ ou CPF e o WhatsApp do buffet; com esses dados a assinatura é criada e a primeira cobrança vence no último dia do teste. Também é possível assinar antes, na página Assinatura.</p>
        <p><b>Planos e pagamento.</b> Mensal ({formatCurrency(periodPrice(1))} todo mês), 3 meses ({formatCurrency(periodPrice(3))} de uma vez), 6 meses ({formatCurrency(periodPrice(6))} de uma vez) ou 12 meses ({formatCurrency(periodPrice(12))} de uma vez). A cobrança é feita pelo Asaas, nosso parceiro de pagamentos: você paga por Pix, boleto ou cartão na página de pagamento do Asaas, aberta pelo botão Pagar no Komyx. Valores podem ser atualizados com aviso prévio de 30 dias.</p>
        <p><b>Renovação automática.</b> Ao fim de cada período a assinatura se renova pelo mesmo plano, com uma nova cobrança, até ser cancelada. A fatura seguinte aparece na página Assinatura e pode ser paga antes do vencimento.</p>
        <p><b>Troca de plano.</b> A troca vale na próxima renovação: o que já foi pago segue até o fim e o plano novo começa no dia seguinte, sem reembolso nem cobrança de diferença; até lá é possível desfazer. Antes do primeiro pagamento, o plano escolhido vale na hora. Com uma mensalidade em atraso, você pode trocar de plano e pagar o novo no lugar da fatura atrasada.</p>
        <p><b>Lembretes e atraso.</b> Os lembretes de cobrança, antes e depois do vencimento, são enviados pelo Asaas. Com a fatura em atraso, o Komyx mostra um aviso no aplicativo. No 10º dia de atraso o acesso ao aplicativo fica pausado e avisamos por e-mail: os dados continuam guardados e a página pública continua no ar recebendo pedidos de orçamento, mas a reserva online com Pix fica suspensa. O acesso volta sozinho assim que o pagamento é confirmado.</p>
        <p><b>Cancelamento.</b> Você cancela quando quiser na página Assinatura. Nada mais é cobrado e você usa o Komyx até o fim do período já pago; depois disso a página pública sai do ar e os dados ficam guardados por 90 dias. Não há reembolso proporcional de períodos já pagos. Para voltar, basta pagar a mensalidade do plano escolhido: tudo volta como estava, sem perder os dias que ainda estavam pagos.</p>
        <p><b>Arrependimento.</b> Até {FULL_REFUND_DAYS} dias depois do primeiro pagamento, você pode desistir e receber o valor pago de volta, inteiro: peça pelo <a href="/suporte" className="underline underline-offset-4">suporte</a> ou por <a href="mailto:contato@komyx.com.br" className="underline underline-offset-4">contato@komyx.com.br</a>. O reembolso é feito pelo mesmo meio do pagamento quando possível; pagamentos por boleto são devolvidos por Pix.</p>
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
