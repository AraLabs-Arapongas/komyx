import { LegalPage, Section } from "@/components/legal/legal-page";

export const metadata = { title: "Política de Privacidade", description: "Como o Komyx trata os dados de buffets, clientes e convidados." };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" updated="3 de outubro de 2026">
      <p>O Komyx é um serviço da AraLabs para buffets de festas e para os clientes que contratam esses buffets. Esta política explica quais dados tratamos, para quê e quais são os seus direitos, em linha com a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>

      <Section title="1. Quem somos">
        <p>Controladora dos dados da plataforma: <strong>AraLabs</strong>, Arapongas/PR, Brasil. Contato: <a href="mailto:contato@aralabs.com.br" className="underline underline-offset-4">contato@aralabs.com.br</a>.</p>
        <p>Cada buffet é controlador dos dados dos seus próprios clientes e convidados. O Komyx atua como operador desses dados em nome do buffet.</p>
      </Section>

      <Section title="2. Dados que tratamos">
        <p><strong>Buffets (donos e equipe):</strong> nome, e-mail, senha (armazenada apenas como hash), nome e dados comerciais do buffet, logo e fotos, chave Pix para gerar cobranças.</p>
        <p><strong>Clientes das festas:</strong> nome, número de WhatsApp, e-mail quando informado, documento quando necessário ao contrato, dados da festa (data, pacote, cardápio, aniversariante e idade), pagamentos registrados pelo buffet, pedidos feitos ao buffet, foto e mensagem do convite.</p>
        <p><strong>Convidados:</strong> nome informado na confirmação de presença, quantidade de adultos e crianças e observações (por exemplo, restrição alimentar).</p>
        <p><strong>Dados técnicos:</strong> endereço IP e registros de acesso, usados para segurança e para o funcionamento do serviço. Não usamos esses dados para publicidade.</p>
      </Section>

      <Section title="3. Para que usamos">
        <p>Para operar o serviço: agenda, orçamentos, contratos, convites, lista de convidados, pagamentos por Pix e comunicação entre buffet e cliente.</p>
        <p>Para autenticação: enviamos códigos por SMS ao celular do cliente para que ele acesse a própria festa no aplicativo.</p>
        <p>Para notificações operacionais: avisos de reserva, pagamento, contrato e pedidos. Não enviamos marketing sem consentimento.</p>
        <p>Para cumprir obrigações legais e para prevenir fraude e abuso.</p>
      </Section>

      <Section title="4. Com quem compartilhamos">
        <p>Com o buffet responsável pela festa, que vê os dados dos seus clientes e convidados. Com os convidados, apenas o conteúdo do convite que o cliente escolheu publicar (título, mensagem, foto, data e local).</p>
        <p>Com fornecedores que nos ajudam a operar: hospedagem e banco de dados (Supabase e Vercel), envio de SMS e geração de PDFs. Eles tratam os dados sob contrato e apenas para esse fim.</p>
        <p>Não vendemos dados pessoais e não os usamos para rastreamento publicitário entre aplicativos.</p>
      </Section>

      <Section title="5. Por quanto tempo guardamos">
        <p>Enquanto a conta do buffet estiver ativa e pelo prazo necessário para obrigações fiscais e contratuais. Após o cancelamento, os dados do buffet ficam disponíveis para exportação por até 90 dias e depois são excluídos ou anonimizados.</p>
      </Section>

      <Section title="6. Seus direitos">
        <p>Você pode pedir confirmação do tratamento, acesso, correção, anonimização, portabilidade ou exclusão dos seus dados, e revogar consentimentos. Clientes e convidados devem procurar primeiro o buffet responsável pela festa; se preferir, escreva para <a href="mailto:contato@aralabs.com.br" className="underline underline-offset-4">contato@aralabs.com.br</a> e encaminharemos.</p>
        <p>Contas de buffet podem ser excluídas a pedido do titular, com remoção dos dados pessoais associados.</p>
      </Section>

      <Section title="7. Segurança">
        <p>Dados trafegam criptografados (HTTPS), senhas são armazenadas com hash, o acesso ao banco segue regras por organização e os links públicos usam tokens longos e revogáveis.</p>
      </Section>

      <Section title="8. Crianças">
        <p>O Komyx é destinado a adultos: donos e equipes de buffets e responsáveis pelas festas. Dados de crianças (nome e idade do aniversariante, quantidade de crianças) são informados pelos adultos responsáveis e usados apenas para organizar a festa.</p>
      </Section>

      <Section title="9. Alterações">
        <p>Podemos atualizar esta política. Mudanças relevantes serão avisadas no aplicativo ou por e-mail. A data da última atualização aparece no topo desta página.</p>
      </Section>
    </LegalPage>
  );
}
