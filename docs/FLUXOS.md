# Festeja — fluxos principais

Ambiente local: `pnpm dev` em http://localhost:3000 · Supabase em http://127.0.0.1:54823 (Studio).

| Quem | Login | Senha | Entra em |
| --- | --- | --- | --- |
| Dona do buffet (owner) | dona@festabuffet.test | senha12345 | /home |

Em desenvolvimento a tela de login tem um select "Conta de teste" que preenche e-mail e senha.
| Equipe (staff) | ana@festabuffet.test | senha12345 | /home (sem Configurações/Pacotes) |
| Admin Festeja | admin@festeja.test | senha12345 | /home → menu "Admin Festeja" → /admin |
| Outro buffet (plano básico) | joao@alegriakids.test | senha12345 | /home |

Buffet de exemplo: **Festa & Cia** → página pública em `/p/festa-cia-buffet`.

---

## 1. Dona do buffet

### 1.1 Primeiro acesso (onboarding)
1. `/signup`: nome do buffet, seu nome, e-mail, senha. Vira owner de uma empresa nova com slug gerado (ex.: `festa-cia-buffet`).
2. Home mostra o checklist **"Deixe seu buffet pronto para vender"**: WhatsApp → pacotes → Pix e prazo do sinal → fotos → primeira reserva. Some quando tudo está feito.
3. Copia o **link da bio** (`/p/slug?src=instagram`) direto do checklist ou de Configurações.

### 1.2 Configurações (só owner)
- **Dados do buffet**: nome, WhatsApp, Instagram, endereço, razão social, CNPJ, cidade (foro), **chave Pix**, duração padrão da festa, **validade da reserva em horas** (= prazo do sinal).
- **Conteúdo da página pública**: frase principal, capacidade, ano de fundação, destaques, depoimentos, regra **um evento por dia**, **reserva online pelo cliente** (liga/desliga).
- **Site personalizado**: mostrar ou não preços (todos os planos); cores e fonte (Premium).
- **Galeria**: até 12 fotos com legenda; **Imagens**: logo, capa e legenda da capa.
- **Plano de pagamento padrão**: parcelas em % (ex.: 30% no aceite, 70% até 7 dias antes).
- **Modelo de contrato**: texto com `{{placeholders}}`.
- **Equipe**: cria acesso staff com senha inicial.
- O **endereço público (slug)** é somente leitura; só o admin do Festeja altera.

### 1.2b Rodapé da conta e notificações
- Rodapé da sidebar (e no Menu no celular): quem está logado, botão sair, **plano e vencimento da fatura** com barra de progresso do ciclo (datas definidas pelo admin do Festeja; fica amarelo a 7 dias e vermelho vencida).
- **Sino de notificações** (sidebar / canto superior no celular) com contador, lista rápida e página `/notificacoes`. Chegam exatamente três eventos: **pedido de orçamento** da página pública, **reserva online** (aguardando sinal) e **contrato aceito** pelo cliente. Confirmação de convidado não notifica (aparece na ficha do evento).

### 1.3 Vender uma festa (atendimento)
1. **Solicitações** (`/solicitacoes`): leads da página pública com origem (Instagram, Google…), pessoas, aniversariante, estimativa. Botão **Criar orçamento** já leva tudo preenchido (pacote, adultos/crianças, data, aniversariante); se o lead montou orçamento, o orçamento é criado sozinho.
2. **Novo orçamento** (`/eventos/novo`): tudo começa pelo orçamento. Nome do responsável com autocomplete (cliente conhecido é escolhido; desconhecido é criado sozinho ao salvar), WhatsApp, data e horário, pacote (preenche adultos/crianças inclusos; excedente aparece como extra), aniversariante. Campo **"Reservar a data?"**: *sim* (reserva com validade, bloqueia a agenda), *não* (status "Orçamento", não bloqueia) ou *confirmar*. O orçamento com itens e parcelas nasce junto. Se o dia já tem evento e você quer reservar: staff é bloqueado; owner marca "sei que já tem evento" e segue.
3. **Agenda**: Lista é a visão padrão (operação do dia); Semana para montar a semana; Mês cabe numa tela (6 linhas, 2 eventos por dia + "+N mais", toque abre o dia). A última visão escolhida é lembrada no aparelho; no celular a Lista é sempre preferida. Todo dia tem "+ Adicionar evento"; em dia ocupado só a dona vê (com aviso), equipe vê "dia ocupado". Orçamento não bloqueia a data; "Aguardando confirmação" bloqueia até o prazo; Confirmado bloqueia.
3b. Na ficha, um evento "Orçamento" tem **Reservar a data** / **Confirmar**; uma reserva tem **Liberar a data** (volta a só orçamento).
4. **Orçamento** (`/eventos/[id]/orcamento`): participantes (recalcula pacote/extras), adicionais do catálogo, itens livres, desconto, **plano de parcelas** do orçamento, PDF, link público `/q/[token]`, WhatsApp. "Marcar como enviado" → "Cliente aceitou" confirma o evento no mesmo registro.
5. **Contrato** (`/eventos/[id]/contrato`): gerado do modelo com dados do evento/orçamento; editável; PDF; link `/c/[token]` para aceite do cliente; versões numeradas.
6. **Aba Orçamentos** (`/orcamentos`): tudo por status + eventos sem orçamento.

### 1.4 Reserva online (sem intervenção)
- Home: card **"Reservas online aguardando sinal"** com o código `FESTA…` e prazo.
- Na ficha do evento: badge "Reserva online", bloco verde com o código → confere o Pix no extrato (o código vai no identificador do Pix) → informa o valor → **"Sinal recebido · confirmar festa"** (registra pagamento Pix, aceita orçamento, confirma evento).
- Página do cliente (`/r/[token]`) pode ser reenviada pelo botão "Reenviar link".
- Sem sinal no prazo, a reserva expira sozinha (pg_cron a cada 5 min + ao abrir Home/Agenda) e a data volta a ficar livre.

### 1.5 Realizar a festa
- **Convite**: título/mensagem na ficha; link `/i/[token]` para o cliente subir a arte e editar texto.
- **Convidados**: RSVP por `/g/[token]` (adultos/crianças, convite exibido, .ics); cadastro manual; "Chegou".
- **Portaria** (`/d/[token]`): check-in por nome ou quantidade parcial, convidado extra, **pedidos na hora** (somam ao saldo). Atualiza sozinho a cada 20 s.
- **Pagamentos**: registros por evento; saldo = orçamento + extras − pago.
- **Aniversariantes** (`/aniversariantes`): próximos 60 dias com mensagem de promoção pronta.

---

## 2. Cliente (sem login)

### 2.1 Descobrir
- Link da bio → `/p/slug?src=instagram` (origem gravada). Página: convite, fotos (carrossel), destaques, pacotes (preço ou "sob consulta"), como funciona, depoimentos, contato, "Encontre sua reserva".
- WhatsApp flutuante no celular.

### 2.2 Montar orçamento e reservar sozinho (`/p/slug/orcamento`)
1. **Pacote** (ou sem pacote).
2. **Data**: calendário mensal; dias com festa riscados; horário.
3. **Pessoas**: adultos/crianças (extras além do pacote avisados) + adicionais.
4. **Seus dados**: nome, WhatsApp, aniversariante, origem.
5. **Revisão**: resumo, total, **sinal (% do plano) e prazo em horas**. Botões: *Só orçamento* (vira solicitação) ou **Reservar esta data**.
6. Confirmação: data reservada até *data/hora*, **QR Pix** com a chave do buffet + copia e cola + **código da reserva** `FESTA…` (vai no identificador do Pix), botão de enviar comprovante no WhatsApp, link do orçamento, e **link permanente da reserva** (`/r/[token]`) com "Enviar pra mim no WhatsApp". O link fica salvo no navegador.

### 2.3 Voltar depois
- `/r/[token]`: status (reservada / confirmada / expirada), Pix enquanto não pago, orçamento (PDF), contrato para aceitar, WhatsApp. Banner "Sua reserva" aparece ao voltar à página do buffet no mesmo aparelho. Perdeu o link: "Encontre sua reserva" com WhatsApp + data da festa.
- Expirou: botão "Tentar reservar de novo".

### 2.4 Depois de fechar
- `/c/[token]`: lê o contrato, aceita com nome (registra data/hora); PDF.
- `/i/[token]`: personaliza o convite (imagem + texto) e pega o link de confirmação.
- Convidados: `/g/[token]` confirmam presença e salvam no calendário.

---

## 3. Admin da plataforma Festeja (`/admin`)

Acesso só para perfis com `is_platform_admin` (flag que só a service role altera). Tudo roda com a chave de serviço no servidor.

- **Visão geral**: buffets ativos/suspensos/premium, eventos e reservas online (30 d), solicitações, pagamentos registrados, buffets recentes.
- **Buffets**: busca por nome/slug, filtro ativo/suspenso, responsável, plano, eventos, pagamentos, último evento.
- **Buffet › Gerenciar**:
  - **Slug, plano (básico/premium), status (ativo/suspenso), ciclo de cobrança (início, vencimento, situação), notas internas** — só aqui se altera (triggers bloqueiam o owner).
  - Suspender: owner e equipe caem em `/suspenso`; página pública e reservas respondem 404. Dados ficam.
  - **Pessoas**: trocar papel owner/equipe, **redefinir senha** (envie ao responsável).
  - Eventos recentes e links úteis (página pública, orçamento).
- **Novo buffet**: cria empresa (slug automático ou informado, plano, WhatsApp) + conta do responsável com senha inicial. Owner entra em `/login` e vê o checklist.

### Ainda não existe (decisões para depois)
- Cobrança do plano (assinatura) e trial.
- Notificação ao dono quando entra reserva/lead (e-mail/WhatsApp/push). Hoje: card na Home.
- Conciliação automática do Pix (API de PSP). Hoje: código `FESTA…` no extrato + 1 clique.
- Domínio próprio por buffet no Premium.
- Impersonar buffet pelo admin (entrar como owner).

## 4. App mobile (Expo)

Mesmos fluxos, no celular. Dona/equipe: Início (ações urgentes, solicitações, hoje, 7 dias, a receber) → Agenda → Evento (status, parcelas com "Recebida", recebimentos, check-in, extras, enviar página da reserva/RSVP). Cliente: "Sou cliente" → WhatsApp + data ou link → reserva (Pix QR + copia-e-cola, parcelas, contrato) e convite (RSVP). Deep links `festeja://r/<token>` e `festeja://g/<token>`. Orçamento, contrato e convite continuam sendo editados na web.
