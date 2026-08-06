import type { Metadata } from 'next'
import { PaginaLegal } from '@/components/legal/pagina-legal'
import { EMPRESA } from '@/lib/legal/identificacao'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Komyx',
  description: 'Que dados o Komyx guarda, por quê, com quem compartilha e como você manda neles.',
}

export default function PrivacidadePage() {
  return (
    <PaginaLegal
      titulo="Política de Privacidade"
      apoio="Que dados guardamos, por quê, com quem dividimos e como você manda neles."
    >
      <p>
        Você vai confiar ao Komyx quanto ganha e quem são seus clientes. Esta
        página existe para você saber exatamente o que acontece com essa
        informação, sem precisar de advogado para entender.
      </p>

      <h2>1. Quem responde pelos seus dados</h2>
      <p>
        {EMPRESA.razaoSocial}, CNPJ {EMPRESA.cnpj}, {EMPRESA.endereco}. Nosso
        encarregado de proteção de dados (LGPD, art. 41)
        é {EMPRESA.encarregado}, e o canal para qualquer pedido
        é <strong>{EMPRESA.email}</strong>.
      </p>

      <h2>2. O que guardamos sobre você</h2>
      <ul>
        <li>
          <strong>Cadastro:</strong> nome, e-mail e, se você preencher,
          telefone. Base legal: execução do contrato (LGPD, art. 7º, V).
        </li>
        <li>
          <strong>O que você registra:</strong> vendas, valores de carta,
          administradora, grupo, cota, as regras de comissão do seu escritório,
          os recebimentos e os compromissos da sua agenda. Base legal: execução
          do contrato.
        </li>
        <li>
          <strong>Assinatura:</strong> se está ativa, quando renova e o
          identificador do seu cadastro na Stripe. <strong>Não recebemos nem
          guardamos o número do seu cartão</strong> — ele vai direto para a
          Stripe. Base legal: execução do contrato e obrigação legal (guarda
          fiscal).
        </li>
        <li>
          <strong>Registros de acesso:</strong> data e hora das ações
          relevantes, e o navegador usado nas tentativas de cadastro. Base
          legal: obrigação legal (Marco Civil da Internet, art. 15) e legítimo
          interesse em segurança.
        </li>
      </ul>
      <p>
        Não usamos ferramenta de rastreamento nem de publicidade. Os cookies do
        Komyx servem para manter você conectado e para lembrar se você pediu
        &ldquo;manter conectado neste dispositivo&rdquo; — mais nada.
      </p>

      <h2>3. Os dados dos SEUS clientes</h2>
      <p>
        Esta parte é a mais importante, e costuma ser a que ninguém explica.
      </p>
      <p>
        Ao cadastrar um cliente, você informa nome e, se quiser, telefone,
        documento e e-mail dele. Essa pessoa não tem relação com o Komyx: ela
        tem com você. Perante a LGPD,{' '}
        <strong>você é o controlador desses dados e o Komyx é o operador</strong>{' '}
        — nós guardamos e processamos seguindo a sua instrução, e nada além
        disso.
      </p>
      <p>Na prática, isso significa que:</p>
      <ul>
        <li>
          cabe a você ter uma base legal para tratar os dados do seu cliente, e
          responder a ele se ele perguntar;
        </li>
        <li>
          nós não usamos esses dados para nada além de fazer o Komyx funcionar
          para você: nada de análise, enriquecimento, publicidade ou venda;
        </li>
        <li>
          nenhum outro usuário do Komyx enxerga a sua carteira. O isolamento é
          feito no banco de dados, linha a linha, e não apenas na tela;
        </li>
        <li>
          se o cliente do seu cliente pedir exclusão a você, você consegue
          apagá-lo no app, e nós o apagamos dos nossos sistemas nos prazos
          descritos abaixo.
        </li>
      </ul>

      <h2>4. Com quem dividimos</h2>
      <p>
        Só com quem é necessário para o serviço existir. Nenhum deles recebe
        seus dados para uso próprio.
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — banco de dados e autenticação. Seus dados
          ficam armazenados em <strong>São Paulo, Brasil</strong>.
        </li>
        <li>
          <strong>Vercel</strong> — hospedagem da aplicação. Processa as
          requisições; pode haver transferência internacional.
        </li>
        <li>
          <strong>Stripe</strong> — pagamento da assinatura. Recebe seu e-mail e
          os dados do cartão, que você digita no ambiente deles.
        </li>
        <li>
          <strong>Resend</strong> — envio do e-mail de recuperação de senha.
          Recebe apenas o endereço de destino.
        </li>
      </ul>
      <p>
        Nas transferências para fora do Brasil, exigimos dos fornecedores as
        garantias previstas na LGPD (art. 33). Também podemos divulgar dados
        quando a lei ou uma ordem judicial obrigar — e, quando for permitido
        avisar, avisamos você.
      </p>

      <h3>Loteria Federal</h3>
      <p>
        A conferência das cotas contra o sorteio da Loteria Federal é feita pelo{' '}
        <strong>seu navegador</strong>, que consulta a API pública da Caixa
        diretamente. Isso significa que a Caixa enxerga o endereço IP do seu
        acesso, como em qualquer site que você visita — mas{' '}
        <strong>nenhum dado seu ou dos seus clientes é enviado para lá</strong>.
        A consulta só pergunta os números sorteados; a comparação com as suas
        cotas acontece no seu aparelho.
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <ul>
        <li>
          <strong>Enquanto a conta existir:</strong> tudo o que você cadastrou,
          porque é disso que o app é feito.
        </li>
        <li>
          <strong>Depois do encerramento:</strong> apagamos os dados da conta em
          até 30 dias. A janela existe para permitir arrependimento e para
          concluir eventual devolução de pagamento.
        </li>
        <li>
          <strong>Registros de acesso:</strong> 6 meses, como manda o Marco
          Civil da Internet (art. 15).
        </li>
        <li>
          <strong>Dados fiscais da assinatura:</strong> 5 anos, por obrigação
          legal. São os dados da cobrança, não a sua carteira de clientes.
        </li>
      </ul>

      <h2>6. Seus direitos</h2>
      <p>
        A LGPD (art. 18) garante a você confirmar se tratamos seus dados,
        acessá-los, corrigi-los, pedir a eliminação, pedir a portabilidade,
        saber com quem compartilhamos e revogar consentimento.
      </p>
      <p>
        Dois deles você exerce sozinho, sem pedir nada a ninguém:{' '}
        <strong>acesso e portabilidade</strong>, em Perfil → Backup, que baixa
        tudo num arquivo. Correção de nome e telefone, em Perfil → Conta.
      </p>
      <p>
        Para os demais — inclusive apagar a conta — escreva
        para {EMPRESA.email}. Respondemos em até 15 dias. Não cobramos por isso
        e não pedimos motivo.
      </p>

      <h2>7. Como protegemos</h2>
      <ul>
        <li>
          <strong>Isolamento por linha no banco.</strong> Cada consulta carrega
          a identidade de quem a fez, e o banco recusa devolver linha de outra
          pessoa. Não é a tela que filtra — é o banco.
        </li>
        <li>
          <strong>Tráfego criptografado</strong> de ponta a ponta (HTTPS).
        </li>
        <li>
          <strong>Senhas nunca são guardadas em texto.</strong> Nem nós
          conseguimos lê-las: por isso a recuperação cria uma senha nova em vez
          de mostrar a antiga.
        </li>
        <li>
          <strong>Colunas de cobrança são somente leitura</strong> para o
          aplicativo. Só o processamento de pagamento as altera.
        </li>
      </ul>
      <p>
        Nenhum sistema é infalível. Se acontecer um incidente que possa causar
        risco relevante a você, avisamos você e a Autoridade Nacional de
        Proteção de Dados, como a LGPD determina (art. 48).
      </p>

      <h2>8. Menores</h2>
      <p>
        O Komyx é para profissionais maiores de 18 anos. Não coletamos
        conscientemente dados de menores.
      </p>

      <h2>9. Mudanças nesta política</h2>
      <p>
        Se algo mudar aqui, avisamos por e-mail e dentro do app antes de valer.
        A data no topo diz desde quando o texto atual está em vigor.
      </p>
    </PaginaLegal>
  )
}
