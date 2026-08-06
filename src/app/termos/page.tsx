import type { Metadata } from 'next'
import { PaginaLegal } from '@/components/legal/pagina-legal'
import { EMPRESA } from '@/lib/legal/identificacao'
import { PLANO } from '@/lib/assinatura/plano'

export const metadata: Metadata = {
  title: 'Termos de Uso — Komyx',
  description: 'As regras de uso do Komyx, em português claro.',
}

export default function TermosPage() {
  return (
    <PaginaLegal
      titulo="Termos de Uso"
      apoio="O que a gente combina ao você usar o Komyx. Escrito para ser lido, não para ser pulado."
    >
      <h2>1. Quem somos</h2>
      <p>
        O Komyx é operado por {EMPRESA.razaoSocial}, inscrita no CNPJ sob o
        nº {EMPRESA.cnpj}, com sede em {EMPRESA.endereco}. Para falar com a
        gente sobre qualquer coisa desta página: <strong>{EMPRESA.email}</strong>.
      </p>

      <h2>2. O que o Komyx faz</h2>
      <p>
        O Komyx registra suas vendas de consórcio, aplica as regras de comissão
        que <strong>você</strong> cadastrou e projeta quando cada parcela deve
        entrar. Ele organiza a sua informação; não negocia, não paga e não
        cobra ninguém por você.
      </p>
      <p>Para não haver dúvida, o Komyx <strong>não é</strong>:</p>
      <ul>
        <li>
          um substituto do controle do seu escritório ou da administradora — quem
          define e paga a comissão continua sendo eles;
        </li>
        <li>
          consultoria financeira, contábil ou de investimentos;
        </li>
        <li>
          um sistema de administradora de consórcio: não emite contrato, boleto
          nem proposta.
        </li>
      </ul>

      <h3>Sobre os números que você vê</h3>
      <p>
        Todo cálculo parte de duas coisas que vêm de você: as regras que
        cadastrou (faixas, percentuais, parcelamento e datas) e as vendas que
        lançou. Se a regra cadastrada não for a que o escritório pratica, ou se
        uma venda for lançada com valor errado, o resultado vai estar errado — e
        o Komyx não tem como saber disso.
      </p>
      <p>
        Por isso, os valores exibidos são <strong>projeção</strong>, para você
        se organizar e conferir. O que você tem a receber de verdade é o que o
        seu escritório apurar. Divergiu? O Komyx guarda o histórico de cada mês
        fechado com as regras que valiam nele, e isso costuma ser o que resolve
        a conversa.
      </p>

      <h2>3. Sua conta</h2>
      <p>
        Você precisa ter 18 anos ou mais e fornecer dados verdadeiros. A senha é
        sua responsabilidade: quem tem a senha vê tudo o que você vê. Desconfiou
        de acesso indevido, troque a senha em Perfil → Conta e nos avise.
      </p>
      <p>
        Uma conta é de uma pessoa. Compartilhar a mesma conta com outros
        corretores mistura carteiras e embaralha os cálculos — o mês de um
        soma no do outro.
      </p>

      <h2>4. Teste, assinatura e cancelamento</h2>
      <p>
        Você começa com <strong>{PLANO.diasDeTeste} dias de teste</strong>, sem
        cartão e sem cobrança. Terminado o teste, o acesso ao app depende de
        assinatura de {PLANO.moeda} {PLANO.valor} por mês, renovada
        automaticamente enquanto você quiser.
      </p>
      <ul>
        <li>
          <strong>Pagamento.</strong> Processado pela Stripe. O Komyx não vê nem
          guarda o número do seu cartão.
        </li>
        <li>
          <strong>Cancelar.</strong> A qualquer momento, pelo próprio app, em
          Perfil → Assinatura. Sem ligação, sem retenção. Você continua com
          acesso até o fim do período já pago.
        </li>
        <li>
          <strong>Arrependimento.</strong> Como a contratação é feita pela
          internet, você pode desistir em até <strong>7 dias</strong> a contar
          da primeira cobrança e receber o valor de volta, conforme o art. 49 do
          Código de Defesa do Consumidor. Basta escrever para {EMPRESA.email}.
        </li>
        <li>
          <strong>Mudança de preço.</strong> Avisamos com pelo menos 30 dias de
          antecedência, por e-mail e dentro do app. Se não concordar, cancele
          antes de a mudança valer — nada é cobrado no valor novo sem você ter
          tido a chance de sair.
        </li>
      </ul>
      <p>
        Se um pagamento falhar, o acesso não é cortado no primeiro &ldquo;não&rdquo;: a
        cobrança é tentada de novo por alguns dias antes de a assinatura ser
        encerrada.
      </p>

      <h2>5. Seus dados continuam seus</h2>
      <p>
        O que você cadastra é seu. Em Perfil → Backup você baixa tudo — vendas,
        clientes, comissões e recebimentos — num arquivo, a qualquer momento,
        sem pedir para ninguém. Isso vale enquanto a conta existir, tenha
        assinatura ativa ou não.
      </p>
      <p>
        Não vendemos, alugamos nem cedemos seus dados. O que fazemos com eles
        está na <a href="/privacidade">Política de Privacidade</a>.
      </p>

      <h2>6. O que não pode</h2>
      <ul>
        <li>usar o Komyx para atividade ilegal, ou para dados que você não pode tratar;</li>
        <li>tentar acessar a conta ou os dados de outra pessoa;</li>
        <li>
          sondar, sobrecarregar ou tentar burlar as proteções do serviço — inclusive
          automatizar acessos de um jeito que atrapalhe outros usuários;
        </li>
        <li>revender o acesso ou compartilhar a mesma conta entre várias pessoas.</li>
      </ul>
      <p>
        Descumprimento grave pode levar à suspensão da conta. Quando isso
        acontecer, avisamos o motivo e você continua podendo exportar seus
        dados.
      </p>

      <h2>7. Disponibilidade e responsabilidade</h2>
      <p>
        A gente trabalha para o Komyx estar sempre no ar, mas nenhum serviço na
        internet fica disponível cem por cento do tempo: há manutenção,
        atualização e falha de fornecedor. Quando a interrupção for longa e
        causada por nós, você pode pedir o abatimento proporcional da
        mensalidade.
      </p>
      <p>
        Respondemos pelos defeitos do serviço nos termos do Código de Defesa do
        Consumidor. Não respondemos por prejuízo causado por informação
        cadastrada de forma incorreta por você, por decisão que você tome com
        base nas projeções (que dependem dessa informação), nem por acesso
        indevido decorrente de senha compartilhada.
      </p>

      <h2>8. Encerramento</h2>
      <p>
        Você pode encerrar a conta quando quiser, escrevendo
        para {EMPRESA.email}. Exporte seus dados antes: o encerramento apaga o
        que estava no Komyx, e isso não tem volta. Os prazos e o que acontece
        com cada informação estão na{' '}
        <a href="/privacidade">Política de Privacidade</a>.
      </p>

      <h2>9. Mudanças nestes termos</h2>
      <p>
        Se algo mudar aqui, avisamos por e-mail e dentro do app antes de valer.
        Continuar usando depois disso significa que você concorda com o texto
        novo; se não concordar, é só cancelar.
      </p>

      <h2>10. Lei e foro</h2>
      <p>
        Estes termos seguem a lei brasileira. Fica eleito o foro do domicílio do
        consumidor para resolver qualquer questão — que é onde o Código de Defesa
        do Consumidor manda, e onde é mais fácil para você.
      </p>
    </PaginaLegal>
  )
}
