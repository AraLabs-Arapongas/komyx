import { LegalPage, Section } from "@/components/legal/legal-page";
import { publicPageMetadata } from "@/lib/seo";
import { SUPPORT_WHATSAPP } from "@/lib/billing";

export const metadata = publicPageMetadata({ title: "Suporte", description: "Ajuda com o Komyx para buffets e clientes.", path: "/suporte" });

export default function SupportPage() {
  const wa = SUPPORT_WHATSAPP ? `https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, "")}` : null;
  return (
    <LegalPage title="Suporte" updated="3 de outubro de 2026">
      <p>Precisa de ajuda com o Komyx? Fale com a gente. Respondemos em dias úteis, das 9h às 18h (horário de Brasília).</p>

      <Section title="Fale conosco">
        <p>E-mail: <a href="mailto:contato@aralabs.com.br" className="underline underline-offset-4">contato@aralabs.com.br</a></p>
        {wa ? <p>WhatsApp: <a href={wa} target="_blank" rel="noopener" className="underline underline-offset-4">{SUPPORT_WHATSAPP}</a></p> : null}
      </Section>

      <Section title="Sou cliente de um buffet">
        <p>Para entrar no aplicativo, use o celular que você informou ao buffet na reserva. Enviamos um código por SMS. Se o código não chegar, confira o número com o buffet.</p>
        <p>Dúvidas sobre valores, data, cardápio ou contrato são resolvidas com o próprio buffet. O botão de WhatsApp dentro da sua festa leva direto a ele.</p>
      </Section>

      <Section title="Tenho um buffet">
        <p>Entre com o e-mail e a senha da sua conta. Esqueceu a senha? Use &ldquo;Esqueci minha senha&rdquo; na tela de entrar.</p>
        <p>Para excluir sua conta e os dados do seu buffet, escreva para contato@aralabs.com.br pelo e-mail cadastrado. Fazemos a exclusão em até 15 dias.</p>
      </Section>

      <Section title="Mais">
        <p><a href="/privacidade" className="underline underline-offset-4">Política de Privacidade</a> · <a href="/termos" className="underline underline-offset-4">Termos de Uso</a></p>
      </Section>
    </LegalPage>
  );
}
