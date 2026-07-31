# ConsorPro MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SaaS single-user que substitui a planilha financeira do corretor de consórcios: cadastra venda → sistema calcula comissão, parcelas e previsões automaticamente.

**Architecture:** Next.js App Router (landing `/` RSC estático; app autenticado client-first) + Supabase (Postgres/Auth/RLS). Motor de cálculo é função TS pura em `src/lib/engine/`; toda mutação de venda/config recalcula a competência inteira (faixa por acumulado mensal, retroativa) e persiste atomicamente via RPC `aplicar_resultado`. TanStack Query é a camada única de dados no app (reads: supabase browser client; writes: Server Actions → invalidate).

**Tech Stack:** Next.js 15+ (App Router), TypeScript, Supabase (@supabase/ssr, @supabase/supabase-js), TanStack Query v5, Tailwind CSS v4, shadcn/ui, Zod, Vitest, Lucide.

## Global Constraints

- Dinheiro SEMPRE em centavos (`bigint` no DB, `number` no TS). Nunca float para valores.
- Percentual armazenado como número em pontos percentuais (ex: `0.5` = 0,5%). Comissão = `Math.round(valorCentavos * percentual / 100)`.
- Datas de negócio (`data_venda`, `data_prevista`): tipo `date`, string `YYYY-MM-DD`, timezone America/Sao_Paulo. Timestamps de sistema: `timestamptz`.
- Nenhum delete físico de vendas/comissões/recebimentos (RN-037): apenas status.
- Recebimento com status `recebido` NUNCA é regravado pelo motor.
- Motor (`src/lib/engine/`) não importa nada de Next.js, React ou Supabase.
- RLS em todas as tabelas: `corretor_id = auth.uid()`.
- UI em pt-BR, linguagem simples (nunca "snapshot", "RPC" etc. para o usuário).
- Paleta: neutra + verde `#059669` APENAS em valores financeiros. Radius 10px. Inter 500/600/700. Bordas, não sombras.
- Commits sem `Co-Authored-By` e sem footer de atribuição.

---

### Task 1: Scaffold do projeto

**Files:**
- Create: projeto Next.js na raiz `/Users/thiagotavares/Projects/a-labs/tech/consorpro`
- Create: `vitest.config.ts`
- Modify: `app/globals.css` (tokens de tema)
- Create: `.env.local` (placeholder)

**Interfaces:**
- Produces: projeto rodando com `npm run dev`, `npm test` (vitest), shadcn/ui inicializado, aliases `@/*`.

- [ ] **Step 1: Scaffold Next.js (raiz já tem docs/ e .git — usar diretório temporário e mover)**

```bash
cd /Users/thiagotavares/Projects/a-labs/tech/consorpro
npx create-next-app@latest tmp-app --typescript --tailwind --eslint --app --src-dir --use-npm --yes
rsync -a tmp-app/ ./ --exclude .git
rm -rf tmp-app
```

- [ ] **Step 2: Instalar dependências**

```bash
npm i @tanstack/react-query @supabase/supabase-js @supabase/ssr zod lucide-react
npm i -D vitest @vitejs/plugin-react
```

- [ ] **Step 3: Inicializar shadcn/ui e componentes base**

```bash
npx shadcn@latest init --yes -b neutral
npx shadcn@latest add button card input label select dialog form sonner badge separator skeleton
```

- [ ] **Step 4: Configurar vitest**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
```

Adicionar em `package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`.

- [ ] **Step 5: Tokens de tema em `src/app/globals.css`** (sobrescrever variáveis do shadcn)

```css
:root {
  --background: #F8FAFC;
  --card: #FFFFFF;
  --border: #E5E7EB;
  --foreground: #111827;
  --muted-foreground: #6B7280;
  --primary: #059669;
  --primary-foreground: #FFFFFF;
  --destructive: #DC2626;
  --radius: 10px;
}
```

(Manter o restante do arquivo gerado pelo shadcn; apenas substituir esses valores no bloco `:root`. Verde `--primary` usado só em CTAs principais e valores financeiros.)

- [ ] **Step 6: Verificar build e teste**

```bash
npm run build
npm test
```
Expected: build OK; vitest "no test files found" (exit 0 com `--passWithNoTests`; adicionar flag ao script se necessário).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js + Tailwind + shadcn + vitest"
```

---

### Task 2: Schema Supabase (migrations + RLS)

**Files:**
- Create: `supabase/migrations/0001_schema.sql`
- Create: `supabase/migrations/0002_rls.sql`
- Create: `src/lib/supabase/database.types.ts` (gerado)

**Interfaces:**
- Produces: tabelas `profiles, clientes, config_financeira, competencias, vendas, comissoes, recebimentos`; trigger de criação de profile; tipos TS gerados.

- [ ] **Step 1: Criar projeto Supabase** (via MCP `create_project` ou dashboard; guardar URL e publishable key em `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-key>
```

- [ ] **Step 2: Escrever `supabase/migrations/0001_schema.sql`**

```sql
create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  telefone text,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nome) values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();

create table clientes (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles(id),
  nome text not null,
  telefone text,
  documento text,
  observacoes text,
  created_at timestamptz not null default now()
);

create table config_financeira (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles(id),
  nome_politica text not null default 'Política padrão',
  faixas jsonb not null,                -- [{min,max,percentual,parcelas}] centavos/pontos percentuais
  dia_fechamento int not null check (dia_fechamento between 1 and 31),
  dia_primeiro_pagamento int not null check (dia_primeiro_pagamento between 1 and 31),
  regras_estorno text,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index uma_config_ativa on config_financeira (corretor_id) where ativa;

create table competencias (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles(id),
  ano int not null,
  mes int not null check (mes between 1 and 12),
  status text not null default 'aberta' check (status in ('aberta','fechada')),
  config_snapshot jsonb,
  unique (corretor_id, ano, mes)
);

create table vendas (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles(id),
  cliente_id uuid not null references clientes(id),
  competencia_id uuid not null references competencias(id),
  valor_carta_centavos bigint not null check (valor_carta_centavos > 0),
  administradora text not null,
  grupo text not null,
  cota text not null,
  data_venda date not null,
  observacoes text,
  status text not null default 'confirmada'
    check (status in ('rascunho','confirmada','cancelada','estornada','arquivada')),
  motivo_cancelamento text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table comissoes (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles(id),
  venda_id uuid not null unique references vendas(id),
  percentual numeric not null,
  faixa_aplicada jsonb not null,
  valor_centavos bigint not null,
  n_parcelas int not null,
  status text not null default 'prevista'
    check (status in ('prevista','parcial','recebida','cancelada','estornada')),
  updated_at timestamptz not null default now()
);

create table recebimentos (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles(id),
  comissao_id uuid not null references comissoes(id),
  numero_parcela int not null,
  valor_centavos bigint not null,
  data_prevista date not null,
  data_recebimento date,
  status text not null default 'previsto'
    check (status in ('previsto','recebido','cancelado','estornado'))
);
create index recebimentos_comissao on recebimentos (comissao_id);
create index vendas_competencia on vendas (competencia_id);
```

- [ ] **Step 3: Escrever `supabase/migrations/0002_rls.sql`**

```sql
alter table profiles enable row level security;
alter table clientes enable row level security;
alter table config_financeira enable row level security;
alter table competencias enable row level security;
alter table vendas enable row level security;
alter table comissoes enable row level security;
alter table recebimentos enable row level security;

create policy "own profile" on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

create policy "own rows" on clientes for all
  using (corretor_id = auth.uid()) with check (corretor_id = auth.uid());
create policy "own rows" on config_financeira for all
  using (corretor_id = auth.uid()) with check (corretor_id = auth.uid());
create policy "own rows" on competencias for all
  using (corretor_id = auth.uid()) with check (corretor_id = auth.uid());
create policy "own rows" on vendas for all
  using (corretor_id = auth.uid()) with check (corretor_id = auth.uid());
create policy "own rows" on comissoes for all
  using (corretor_id = auth.uid()) with check (corretor_id = auth.uid());
create policy "own rows" on recebimentos for all
  using (corretor_id = auth.uid()) with check (corretor_id = auth.uid());
```

- [ ] **Step 4: Aplicar migrations** (MCP `apply_migration` uma a uma, ou `supabase db push` se CLI linkada). Verificar com `list_tables`: 7 tabelas presentes.

- [ ] **Step 5: Gerar tipos**

Via MCP `generate_typescript_types` (ou `supabase gen types typescript`), salvar em `src/lib/supabase/database.types.ts`.

- [ ] **Step 6: Commit**

```bash
git add supabase src/lib/supabase && git commit -m "feat: schema Postgres com RLS e tipos gerados"
```

---

### Task 3: Tipos de domínio + schemas Zod

**Files:**
- Create: `src/lib/domain/types.ts`
- Create: `src/lib/domain/schemas.ts`
- Test: `src/lib/domain/schemas.test.ts`

**Interfaces:**
- Produces:
  - `type Faixa = { min: number; max: number | null; percentual: number; parcelas: number }` (min/max em centavos; max null = sem teto)
  - `type Calendario = { diaFechamento: number; diaPrimeiroPagamento: number }`
  - `type ConfigCalc = { faixas: Faixa[]; calendario: Calendario }`
  - `type CompetenciaRef = { ano: number; mes: number }`
  - `configFinanceiraSchema` (Zod, valida sobreposição/cobertura), `vendaFormSchema`, `clienteFormSchema`

- [ ] **Step 1: Escrever `src/lib/domain/types.ts`**

```ts
export type Faixa = {
  min: number            // centavos, inclusivo
  max: number | null     // centavos, inclusivo; null = sem teto
  percentual: number     // pontos percentuais: 0.5 = 0,5%
  parcelas: number
}

export type Calendario = {
  diaFechamento: number          // 1-31
  diaPrimeiroPagamento: number   // 1-31
}

export type ConfigCalc = { faixas: Faixa[]; calendario: Calendario }

export type CompetenciaRef = { ano: number; mes: number } // mes 1-12

export type VendaStatus = 'rascunho' | 'confirmada' | 'cancelada' | 'estornada' | 'arquivada'
export type RecebimentoStatus = 'previsto' | 'recebido' | 'cancelado' | 'estornado'
export type ComissaoStatus = 'prevista' | 'parcial' | 'recebida' | 'cancelada' | 'estornada'
```

- [ ] **Step 2: Escrever teste `src/lib/domain/schemas.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { configFinanceiraSchema, vendaFormSchema } from './schemas'

const faixasValidas = [
  { min: 0, max: 100_000_000, percentual: 0.5, parcelas: 2 },
  { min: 100_000_001, max: null, percentual: 0.6, parcelas: 3 },
]
const base = {
  nomePolitica: 'Padrão', faixas: faixasValidas,
  diaFechamento: 25, diaPrimeiroPagamento: 10, regrasEstorno: '',
}

describe('configFinanceiraSchema', () => {
  it('aceita config válida', () => {
    expect(configFinanceiraSchema.safeParse(base).success).toBe(true)
  })
  it('rejeita zero faixas', () => {
    expect(configFinanceiraSchema.safeParse({ ...base, faixas: [] }).success).toBe(false)
  })
  it('rejeita faixas sobrepostas (RN-007)', () => {
    const faixas = [
      { min: 0, max: 100_000_000, percentual: 0.5, parcelas: 2 },
      { min: 80_000_000, max: null, percentual: 0.6, parcelas: 3 },
    ]
    expect(configFinanceiraSchema.safeParse({ ...base, faixas }).success).toBe(false)
  })
  it('rejeita buraco entre faixas', () => {
    const faixas = [
      { min: 0, max: 100_000_000, percentual: 0.5, parcelas: 2 },
      { min: 200_000_000, max: null, percentual: 0.6, parcelas: 3 },
    ]
    expect(configFinanceiraSchema.safeParse({ ...base, faixas }).success).toBe(false)
  })
  it('rejeita primeira faixa que não começa em 0', () => {
    const faixas = [{ min: 100, max: null, percentual: 0.5, parcelas: 2 }]
    expect(configFinanceiraSchema.safeParse({ ...base, faixas }).success).toBe(false)
  })
  it('rejeita percentual <= 0 (RN-009)', () => {
    const faixas = [{ min: 0, max: null, percentual: 0, parcelas: 2 }]
    expect(configFinanceiraSchema.safeParse({ ...base, faixas }).success).toBe(false)
  })
  it('rejeita parcelas = 0 (RN-010)', () => {
    const faixas = [{ min: 0, max: null, percentual: 0.5, parcelas: 0 }]
    expect(configFinanceiraSchema.safeParse({ ...base, faixas }).success).toBe(false)
  })
  it('rejeita dia de fechamento fora de 1-31', () => {
    expect(configFinanceiraSchema.safeParse({ ...base, diaFechamento: 32 }).success).toBe(false)
  })
})

describe('vendaFormSchema', () => {
  const venda = {
    clienteId: 'b3b8c0e2-0000-4000-8000-000000000000',
    valorCartaCentavos: 50_000_000, administradora: 'Porto',
    grupo: '1234', cota: '567', dataVenda: '2026-07-12', observacoes: '',
  }
  it('aceita venda válida', () => {
    expect(vendaFormSchema.safeParse(venda).success).toBe(true)
  })
  it('rejeita valor <= 0', () => {
    expect(vendaFormSchema.safeParse({ ...venda, valorCartaCentavos: 0 }).success).toBe(false)
  })
  it('rejeita data inválida', () => {
    expect(vendaFormSchema.safeParse({ ...venda, dataVenda: '12/07/2026' }).success).toBe(false)
  })
})
```

- [ ] **Step 3: Rodar — deve falhar** (`npm test` → módulo `./schemas` inexistente)

- [ ] **Step 4: Implementar `src/lib/domain/schemas.ts`**

```ts
import { z } from 'zod'

export const faixaSchema = z.object({
  min: z.number().int().min(0),
  max: z.number().int().positive().nullable(),
  percentual: z.number().positive({ message: 'O percentual deve ser maior que zero.' }),
  parcelas: z.number().int().positive({ message: 'O número de parcelas deve ser maior que zero.' }),
})

export const configFinanceiraSchema = z.object({
  nomePolitica: z.string().min(1, 'Dê um nome à política.'),
  faixas: z.array(faixaSchema).min(1, 'Cadastre pelo menos uma faixa.'),
  diaFechamento: z.number().int().min(1).max(31),
  diaPrimeiroPagamento: z.number().int().min(1).max(31),
  regrasEstorno: z.string().optional().default(''),
}).superRefine((cfg, ctx) => {
  const faixas = [...cfg.faixas].sort((a, b) => a.min - b.min)
  if (faixas[0].min !== 0)
    ctx.addIssue({ code: 'custom', path: ['faixas'], message: 'A primeira faixa deve começar em R$ 0.' })
  for (let i = 0; i < faixas.length; i++) {
    const f = faixas[i]
    if (f.max !== null && f.max <= f.min)
      ctx.addIssue({ code: 'custom', path: ['faixas'], message: 'O valor final da faixa deve ser maior que o inicial.' })
    if (f.max === null && i !== faixas.length - 1)
      ctx.addIssue({ code: 'custom', path: ['faixas'], message: 'Apenas a última faixa pode ficar sem valor máximo.' })
    if (i > 0) {
      const ant = faixas[i - 1]
      if (ant.max === null || f.min !== ant.max + 1)
        ctx.addIssue({ code: 'custom', path: ['faixas'], message: 'As faixas não podem se sobrepor nem deixar intervalos vazios.' })
    }
  }
})

export const clienteFormSchema = z.object({
  nome: z.string().min(1, 'Informe o nome do cliente.'),
  telefone: z.string().optional().default(''),
  documento: z.string().optional().default(''),
  observacoes: z.string().optional().default(''),
})

export const vendaFormSchema = z.object({
  clienteId: z.string().uuid('Selecione um cliente.'),
  valorCartaCentavos: z.number().int().positive('Informe o valor da carta.'),
  administradora: z.string().min(1, 'Informe a administradora.'),
  grupo: z.string().min(1, 'Informe o grupo.'),
  cota: z.string().min(1, 'Informe a cota.'),
  dataVenda: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  observacoes: z.string().optional().default(''),
})

export type ConfigFinanceiraForm = z.infer<typeof configFinanceiraSchema>
export type VendaForm = z.infer<typeof vendaFormSchema>
export type ClienteForm = z.infer<typeof clienteFormSchema>
```

- [ ] **Step 5: Rodar testes — passar** (`npm test`)

- [ ] **Step 6: Commit**

```bash
git add src/lib/domain && git commit -m "feat: tipos de domínio e schemas Zod com validação de faixas"
```

---

### Task 4: Motor — calendário e competência

**Files:**
- Create: `src/lib/engine/calendario.ts`
- Test: `src/lib/engine/calendario.test.ts`

**Interfaces:**
- Consumes: `Calendario`, `CompetenciaRef` de `@/lib/domain/types`
- Produces:
  - `competenciaDaVenda(dataVenda: string, diaFechamento: number): CompetenciaRef` — venda até o dia de fechamento (inclusive) pertence ao mês da venda; depois, ao mês seguinte (RN-013/014)
  - `dataParcela(comp: CompetenciaRef, diaPagamento: number, numeroParcela: number): string` — parcela N paga no mês `comp + N`, no dia de pagamento (clampado ao fim do mês). Retorna `YYYY-MM-DD`
  - `proximaCompetencia(c: CompetenciaRef): CompetenciaRef`
  - `compararCompetencias(a: CompetenciaRef, b: CompetenciaRef): number`

- [ ] **Step 1: Escrever teste `src/lib/engine/calendario.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { competenciaDaVenda, dataParcela, proximaCompetencia, compararCompetencias } from './calendario'

describe('competenciaDaVenda (fechamento dia 25)', () => {
  it('venda em 12/07 → competência julho (PRD)', () => {
    expect(competenciaDaVenda('2026-07-12', 25)).toEqual({ ano: 2026, mes: 7 })
  })
  it('venda em 25/07 (dia do fechamento, inclusivo) → julho', () => {
    expect(competenciaDaVenda('2026-07-25', 25)).toEqual({ ano: 2026, mes: 7 })
  })
  it('venda em 28/07 → agosto (PRD)', () => {
    expect(competenciaDaVenda('2026-07-28', 25)).toEqual({ ano: 2026, mes: 8 })
  })
  it('venda em 28/12 → janeiro do ano seguinte', () => {
    expect(competenciaDaVenda('2026-12-28', 25)).toEqual({ ano: 2027, mes: 1 })
  })
})

describe('dataParcela (pagamento dia 10)', () => {
  it('competência julho, parcela 1 → 10/08 (PRD)', () => {
    expect(dataParcela({ ano: 2026, mes: 7 }, 10, 1)).toBe('2026-08-10')
  })
  it('parcela 3 → 10/10', () => {
    expect(dataParcela({ ano: 2026, mes: 7 }, 10, 3)).toBe('2026-10-10')
  })
  it('vira o ano: competência novembro, parcela 2 → 10/01', () => {
    expect(dataParcela({ ano: 2026, mes: 11 }, 10, 2)).toBe('2027-01-10')
  })
  it('clampa dia 31 em mês curto: competência janeiro, dia 31, parcela 1 → 28/02', () => {
    expect(dataParcela({ ano: 2026, mes: 1 }, 31, 1)).toBe('2026-02-28')
  })
})

describe('helpers de competência', () => {
  it('proximaCompetencia vira ano', () => {
    expect(proximaCompetencia({ ano: 2026, mes: 12 })).toEqual({ ano: 2027, mes: 1 })
  })
  it('compararCompetencias ordena', () => {
    expect(compararCompetencias({ ano: 2026, mes: 7 }, { ano: 2026, mes: 8 })).toBeLessThan(0)
    expect(compararCompetencias({ ano: 2026, mes: 7 }, { ano: 2026, mes: 7 })).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar — falhar** (módulo inexistente)

- [ ] **Step 3: Implementar `src/lib/engine/calendario.ts`**

```ts
import type { CompetenciaRef } from '@/lib/domain/types'

// Datas como strings YYYY-MM-DD; nunca Date com timezone.
function parseISO(d: string): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = d.split('-').map(Number)
  return { ano, mes, dia }
}

function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

export function competenciaDaVenda(dataVenda: string, diaFechamento: number): CompetenciaRef {
  const { ano, mes, dia } = parseISO(dataVenda)
  if (dia <= diaFechamento) return { ano, mes }
  return proximaCompetencia({ ano, mes })
}

export function proximaCompetencia(c: CompetenciaRef): CompetenciaRef {
  return c.mes === 12 ? { ano: c.ano + 1, mes: 1 } : { ano: c.ano, mes: c.mes + 1 }
}

export function compararCompetencias(a: CompetenciaRef, b: CompetenciaRef): number {
  return a.ano * 12 + a.mes - (b.ano * 12 + b.mes)
}

export function dataParcela(comp: CompetenciaRef, diaPagamento: number, numeroParcela: number): string {
  let { ano, mes } = comp
  for (let i = 0; i < numeroParcela; i++) ({ ano, mes } = proximaCompetencia({ ano, mes }))
  const dia = Math.min(diaPagamento, diasNoMes(ano, mes))
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}
```

- [ ] **Step 4: Rodar testes — passar**

- [ ] **Step 5: Commit**

```bash
git add src/lib/engine && git commit -m "feat: motor de calendário financeiro (competência e datas de parcela)"
```

---

### Task 5: Motor — cálculo da competência

**Files:**
- Create: `src/lib/engine/calculo.ts`
- Test: `src/lib/engine/calculo.test.ts`

**Interfaces:**
- Consumes: `Faixa, ConfigCalc, CompetenciaRef` (Task 3); `dataParcela` (Task 4)
- Produces:
```ts
type VendaCalc = { id: string; valorCartaCentavos: number; status: VendaStatus }
type RecebimentoExistente = { id: string; vendaId: string; numeroParcela: number;
  valorCentavos: number; status: RecebimentoStatus }
type ComissaoResultado = { vendaId: string; percentual: number; faixaAplicada: Faixa;
  valorCentavos: number; nParcelas: number; status: ComissaoStatus }
type RecebimentoResultado = { vendaId: string; numeroParcela: number;
  valorCentavos: number; dataPrevista: string; status: 'previsto' }
type ResultadoCalculo = {
  comissoes: ComissaoResultado[]
  recebimentosPrevistos: RecebimentoResultado[]  // estado desejado COMPLETO dos previstos
}
calcularCompetencia(input: {
  config: ConfigCalc
  competencia: CompetenciaRef
  vendas: VendaCalc[]
  recebimentosExistentes: RecebimentoExistente[]
}): ResultadoCalculo
```
Regras: volume = Σ vendas confirmadas → uma faixa para a competência inteira (retroativo). Comissão por venda = round(valor × pct / 100). Parcelas: divisão inteira, resto de centavos na última. Reconciliação: parcelas `recebido` são intocáveis — valor restante (comissão − recebidos) distribuído nas parcelas ainda não recebidas. Venda cancelada/estornada: zero previstos novos; status da comissão `cancelada`/`estornada`.

- [ ] **Step 1: Escrever teste `src/lib/engine/calculo.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { calcularCompetencia } from './calculo'
import type { ConfigCalc } from '@/lib/domain/types'

const config: ConfigCalc = {
  faixas: [
    { min: 0, max: 100_000_000, percentual: 0.5, parcelas: 2 },          // até R$ 1M
    { min: 100_000_001, max: 160_000_000, percentual: 0.6, parcelas: 3 }, // até R$ 1,6M
    { min: 160_000_001, max: null, percentual: 0.7, parcelas: 3 },
  ],
  calendario: { diaFechamento: 25, diaPrimeiroPagamento: 10 },
}
const comp = { ano: 2026, mes: 7 }
const venda = (id: string, valor: number, status = 'confirmada' as const) =>
  ({ id, valorCartaCentavos: valor, status })

describe('calcularCompetencia — faixa por acumulado retroativo', () => {
  it('uma venda de R$ 500k → faixa 1 (0,5%, 2x)', () => {
    const r = calcularCompetencia({ config, competencia: comp,
      vendas: [venda('v1', 50_000_000)], recebimentosExistentes: [] })
    expect(r.comissoes).toHaveLength(1)
    expect(r.comissoes[0]).toMatchObject({ vendaId: 'v1', percentual: 0.5,
      valorCentavos: 250_000, nParcelas: 2, status: 'prevista' })
    expect(r.recebimentosPrevistos).toEqual([
      { vendaId: 'v1', numeroParcela: 1, valorCentavos: 125_000, dataPrevista: '2026-08-10', status: 'previsto' },
      { vendaId: 'v1', numeroParcela: 2, valorCentavos: 125_000, dataPrevista: '2026-09-10', status: 'previsto' },
    ])
  })

  it('segunda venda cruza faixa → TODAS as vendas recalculam para 0,6% (retroativo)', () => {
    const r = calcularCompetencia({ config, competencia: comp,
      vendas: [venda('v1', 80_000_000), venda('v2', 40_000_000)], // total R$ 1,2M
      recebimentosExistentes: [] })
    expect(r.comissoes.map(c => c.percentual)).toEqual([0.6, 0.6])
    expect(r.comissoes[0].valorCentavos).toBe(480_000) // 800k * 0.6%
    expect(r.comissoes[0].nParcelas).toBe(3)
  })

  it('resto de centavos vai para a última parcela', () => {
    // comissão 0,5% de R$ 200,02 = 100.01 → mas melhor: valor que gera resto
    // 3 parcelas de comissão 100 centavos: 33+33+34
    const cfg: ConfigCalc = { ...config,
      faixas: [{ min: 0, max: null, percentual: 0.5, parcelas: 3 }] }
    const r = calcularCompetencia({ config: cfg, competencia: comp,
      vendas: [venda('v1', 20_000)], recebimentosExistentes: [] }) // comissão = 100
    expect(r.recebimentosPrevistos.map(p => p.valorCentavos)).toEqual([33, 33, 34])
  })

  it('parcelas recebidas são intocáveis; restante redistribui nas não recebidas', () => {
    // v1 800k sozinha: comissão 0,5% = 400_000, 2x de 200_000; parcela 1 já recebida
    // entra v2 400k → total 1,2M → 0,6%: v1 = 480_000 em 3x
    // recebido: 200_000 → restante 280_000 em parcelas 2..3 → 140_000 cada
    const r = calcularCompetencia({ config, competencia: comp,
      vendas: [venda('v1', 80_000_000), venda('v2', 40_000_000)],
      recebimentosExistentes: [
        { id: 'r1', vendaId: 'v1', numeroParcela: 1, valorCentavos: 200_000, status: 'recebido' },
      ] })
    const v1prev = r.recebimentosPrevistos.filter(p => p.vendaId === 'v1')
    expect(v1prev).toEqual([
      { vendaId: 'v1', numeroParcela: 2, valorCentavos: 140_000, dataPrevista: '2026-09-10', status: 'previsto' },
      { vendaId: 'v1', numeroParcela: 3, valorCentavos: 140_000, dataPrevista: '2026-10-10', status: 'previsto' },
    ])
    const c1 = r.comissoes.find(c => c.vendaId === 'v1')!
    expect(c1.status).toBe('parcial')
  })

  it('venda cancelada: sem previstos, comissão cancelada, não conta no volume', () => {
    const r = calcularCompetencia({ config, competencia: comp,
      vendas: [venda('v1', 80_000_000), venda('v2', 40_000_000, 'confirmada'),],
      recebimentosExistentes: [] })
    const r2 = calcularCompetencia({ config, competencia: comp,
      vendas: [{ ...venda('v1', 80_000_000), status: 'cancelada' }, venda('v2', 40_000_000)],
      recebimentosExistentes: [] })
    // com cancelamento, volume cai para 400k → faixa 1
    const c2 = r2.comissoes.find(c => c.vendaId === 'v2')!
    expect(c2.percentual).toBe(0.5)
    const c1 = r2.comissoes.find(c => c.vendaId === 'v1')!
    expect(c1.status).toBe('cancelada')
    expect(r2.recebimentosPrevistos.filter(p => p.vendaId === 'v1')).toHaveLength(0)
    expect(r.comissoes.find(c => c.vendaId === 'v2')!.percentual).toBe(0.6)
  })

  it('todas as parcelas recebidas → comissão recebida', () => {
    const cfg: ConfigCalc = { ...config,
      faixas: [{ min: 0, max: null, percentual: 0.5, parcelas: 1 }] }
    const r = calcularCompetencia({ config: cfg, competencia: comp,
      vendas: [venda('v1', 20_000)],
      recebimentosExistentes: [
        { id: 'r1', vendaId: 'v1', numeroParcela: 1, valorCentavos: 100, status: 'recebido' },
      ] })
    expect(r.comissoes[0].status).toBe('recebida')
    expect(r.recebimentosPrevistos).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Rodar — falhar**

- [ ] **Step 3: Implementar `src/lib/engine/calculo.ts`**

```ts
import type { ConfigCalc, CompetenciaRef, Faixa, VendaStatus, RecebimentoStatus, ComissaoStatus } from '@/lib/domain/types'
import { dataParcela } from './calendario'

export type VendaCalc = { id: string; valorCartaCentavos: number; status: VendaStatus }
export type RecebimentoExistente = {
  id: string; vendaId: string; numeroParcela: number
  valorCentavos: number; status: RecebimentoStatus
}
export type ComissaoResultado = {
  vendaId: string; percentual: number; faixaAplicada: Faixa
  valorCentavos: number; nParcelas: number; status: ComissaoStatus
}
export type RecebimentoResultado = {
  vendaId: string; numeroParcela: number
  valorCentavos: number; dataPrevista: string; status: 'previsto'
}
export type ResultadoCalculo = {
  comissoes: ComissaoResultado[]
  recebimentosPrevistos: RecebimentoResultado[]
}

function localizarFaixa(faixas: Faixa[], volume: number): Faixa {
  const ordenadas = [...faixas].sort((a, b) => a.min - b.min)
  const f = ordenadas.find(f => volume >= f.min && (f.max === null || volume <= f.max))
  return f ?? ordenadas[ordenadas.length - 1]
}

export function calcularCompetencia(input: {
  config: ConfigCalc
  competencia: CompetenciaRef
  vendas: VendaCalc[]
  recebimentosExistentes: RecebimentoExistente[]
}): ResultadoCalculo {
  const { config, competencia, vendas, recebimentosExistentes } = input
  const confirmadas = vendas.filter(v => v.status === 'confirmada')
  const volume = confirmadas.reduce((s, v) => s + v.valorCartaCentavos, 0)
  const faixa = localizarFaixa(config.faixas, volume)

  const comissoes: ComissaoResultado[] = []
  const recebimentosPrevistos: RecebimentoResultado[] = []

  for (const venda of vendas) {
    if (venda.status === 'cancelada' || venda.status === 'estornada') {
      comissoes.push({
        vendaId: venda.id, percentual: faixa.percentual, faixaAplicada: faixa,
        valorCentavos: Math.round(venda.valorCartaCentavos * faixa.percentual / 100),
        nParcelas: faixa.parcelas,
        status: venda.status === 'cancelada' ? 'cancelada' : 'estornada',
      })
      continue
    }
    if (venda.status !== 'confirmada') continue

    const valorComissao = Math.round(venda.valorCartaCentavos * faixa.percentual / 100)
    const recebidos = recebimentosExistentes.filter(
      r => r.vendaId === venda.id && r.status === 'recebido')
    const totalRecebido = recebidos.reduce((s, r) => s + r.valorCentavos, 0)
    const parcelasRecebidas = new Set(recebidos.map(r => r.numeroParcela))

    const numerosPendentes: number[] = []
    for (let n = 1; n <= faixa.parcelas; n++)
      if (!parcelasRecebidas.has(n)) numerosPendentes.push(n)

    const restante = Math.max(0, valorComissao - totalRecebido)
    if (numerosPendentes.length > 0 && restante > 0) {
      const base = Math.floor(restante / numerosPendentes.length)
      numerosPendentes.forEach((n, i) => {
        const ultimo = i === numerosPendentes.length - 1
        recebimentosPrevistos.push({
          vendaId: venda.id, numeroParcela: n,
          valorCentavos: ultimo ? restante - base * (numerosPendentes.length - 1) : base,
          dataPrevista: dataParcela(competencia, config.calendario.diaPrimeiroPagamento, n),
          status: 'previsto',
        })
      })
    }

    const status: ComissaoStatus =
      totalRecebido === 0 ? 'prevista'
      : restante === 0 || numerosPendentes.length === 0 ? 'recebida'
      : 'parcial'

    comissoes.push({
      vendaId: venda.id, percentual: faixa.percentual, faixaAplicada: faixa,
      valorCentavos: valorComissao, nParcelas: faixa.parcelas, status,
    })
  }

  return { comissoes, recebimentosPrevistos }
}
```

- [ ] **Step 4: Rodar testes — passar** (`npm test`). Se o caso "33/33/34" falhar por ordem do resto, a última parcela absorve: `restante - base*(n-1)` — verificar que soma bate.

- [ ] **Step 5: Commit**

```bash
git add src/lib/engine && git commit -m "feat: motor de cálculo de comissão com faixa retroativa e reconciliação"
```

---

### Task 6: RPC `aplicar_resultado` + fechamento de competência

**Files:**
- Create: `supabase/migrations/0003_rpc.sql`

**Interfaces:**
- Produces: função Postgres `aplicar_resultado(p_competencia_id uuid, p_resultado jsonb)`:
  - upsert de `comissoes` por `venda_id` (percentual, faixa_aplicada, valor_centavos, n_parcelas, status)
  - delete de `recebimentos` com `status = 'previsto'` das comissões da competência
  - insert dos novos previstos
  - roda como `security invoker` — RLS garante isolamento
- Produces: função `fechar_competencias_vencidas(p_snapshot jsonb, p_hoje date)` — fecha competências abertas cujo período já passou do fechamento, gravando snapshot.

- [ ] **Step 1: Escrever `supabase/migrations/0003_rpc.sql`**

```sql
create or replace function aplicar_resultado(p_competencia_id uuid, p_resultado jsonb)
returns void language plpgsql security invoker as $$
declare
  c jsonb;
  r jsonb;
  v_comissao_id uuid;
begin
  -- upsert comissões
  for c in select * from jsonb_array_elements(p_resultado->'comissoes') loop
    insert into comissoes (corretor_id, venda_id, percentual, faixa_aplicada,
                           valor_centavos, n_parcelas, status, updated_at)
    values (auth.uid(), (c->>'vendaId')::uuid, (c->>'percentual')::numeric,
            c->'faixaAplicada', (c->>'valorCentavos')::bigint,
            (c->>'nParcelas')::int, c->>'status', now())
    on conflict (venda_id) do update
      set percentual = excluded.percentual,
          faixa_aplicada = excluded.faixa_aplicada,
          valor_centavos = excluded.valor_centavos,
          n_parcelas = excluded.n_parcelas,
          status = excluded.status,
          updated_at = now();
  end loop;

  -- remove previstos das comissões desta competência (recebidos ficam intactos)
  delete from recebimentos
  where status = 'previsto'
    and comissao_id in (
      select co.id from comissoes co
      join vendas v on v.id = co.venda_id
      where v.competencia_id = p_competencia_id);

  -- insere novos previstos
  for r in select * from jsonb_array_elements(p_resultado->'recebimentosPrevistos') loop
    select id into v_comissao_id from comissoes where venda_id = (r->>'vendaId')::uuid;
    insert into recebimentos (corretor_id, comissao_id, numero_parcela,
                              valor_centavos, data_prevista, status)
    values (auth.uid(), v_comissao_id, (r->>'numeroParcela')::int,
            (r->>'valorCentavos')::bigint, (r->>'dataPrevista')::date, 'previsto');
  end loop;
end $$;

create or replace function fechar_competencias_vencidas(p_snapshot jsonb, p_hoje date)
returns void language plpgsql security invoker as $$
begin
  update competencias
  set status = 'fechada', config_snapshot = p_snapshot
  where corretor_id = auth.uid()
    and status = 'aberta'
    and make_date(ano, mes, 1) < date_trunc('month', p_hoje)::date;
end $$;
```

Nota: uma competência "vence" quando o mês corrente já passou dela (simplificação: fecha no virar do mês seguinte ao período; o dia de fechamento define a QUAL competência a venda pertence, não quando ela congela).

- [ ] **Step 2: Aplicar migration e smoke test** (via MCP `execute_sql` com usuário de teste, ou aceitar verificação na Task 9 integrada). Verificar: `select proname from pg_proc where proname in ('aplicar_resultado','fechar_competencias_vencidas');` retorna 2 linhas.

- [ ] **Step 3: Commit**

```bash
git add supabase && git commit -m "feat: RPC aplicar_resultado e fechamento de competências"
```

---

### Task 7: Auth (Supabase SSR) + clients

**Files:**
- Create: `src/lib/supabase/client.ts` (browser)
- Create: `src/lib/supabase/server.ts` (server actions/RSC)
- Create: `src/middleware.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/cadastro/page.tsx`
- Create: `src/app/(auth)/actions.ts`

**Interfaces:**
- Produces: `createClient()` browser em `client.ts`; `createClient()` server (async, cookies) em `server.ts`; middleware protege `/app/*` (redirect `/login`); actions `login(formData)`, `cadastrar(formData)`, `sair()`.

- [ ] **Step 1: `src/lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

- [ ] **Step 2: `src/lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => {
          try { cookieStore.set(name, value, options) } catch {}
        }),
      },
    },
  )
}
```

- [ ] **Step 3: `src/middleware.ts`** (padrão @supabase/ssr: refresh de sessão + gate)

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cs) => {
          cs.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cs.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  const isApp = request.nextUrl.pathname.startsWith('/app')
  if (isApp && !user) return NextResponse.redirect(new URL('/login', request.url))
  return response
}

export const config = { matcher: ['/app/:path*', '/login', '/cadastro'] }
```

- [ ] **Step 4: `src/app/(auth)/actions.ts`**

```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
  })
  if (error) redirect('/login?erro=' + encodeURIComponent('E-mail ou senha incorretos.'))
  redirect('/app')
}

export async function cadastrar(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
    options: { data: { nome: String(formData.get('nome')) } },
  })
  if (error) redirect('/cadastro?erro=' + encodeURIComponent('Não foi possível criar a conta. Verifique os dados e tente novamente.'))
  redirect('/app')
}

export async function sair() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

(Confirmação de e-mail: desativar no painel Supabase Auth para o MVP — signUp já loga.)

- [ ] **Step 5: Páginas login/cadastro** — `src/app/(auth)/login/page.tsx`:

```tsx
import { login } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <form action={login} className="w-full max-w-sm space-y-4 rounded-[10px] border bg-card p-6">
        <h1 className="text-xl font-semibold">Entrar no ConsorPro</h1>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <div className="space-y-1"><Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" /></div>
        <div className="space-y-1"><Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required autoComplete="current-password" /></div>
        <Button type="submit" className="w-full">Entrar</Button>
        <p className="text-sm text-muted-foreground">Ainda não tem conta?{' '}
          <Link className="underline" href="/cadastro">Criar conta</Link></p>
      </form>
    </main>
  )
}
```

`cadastro/page.tsx`: mesma estrutura com campo `nome` extra, action `cadastrar`, título "Criar conta".

- [ ] **Step 6: Testar manualmente** — `npm run dev`, criar conta, verificar redirect `/app` (404 por ora — ok), verificar linha em `profiles`.

- [ ] **Step 7: Commit**

```bash
git add src && git commit -m "feat: autenticação Supabase com middleware e páginas de login/cadastro"
```

---

### Task 8: Shell do app (providers, navegação, gate de onboarding)

**Files:**
- Create: `src/app/app/layout.tsx`
- Create: `src/components/providers.tsx`
- Create: `src/components/app-nav.tsx`
- Create: `src/lib/queries/keys.ts`
- Create: `src/lib/format.ts`

**Interfaces:**
- Produces:
  - `Providers` (QueryClientProvider + Sonner `<Toaster/>`)
  - `AppNav`: bottom nav mobile (fixo) / sidebar desktop — itens: Início `/app`, Vendas `/app/vendas`, Recebimentos `/app/recebimentos`, Ajustes `/app/configuracao`
  - `queryKeys = { config: ['config'], dashboard: (ano,mes) => [...], vendas: (busca?) => [...], venda: (id) => [...], recebimentos: ['recebimentos'], clientes: (busca?) => [...] }`
  - `formatBRL(centavos: number): string` ("R$ 1.234,56"), `formatData(iso: string): string` ("10/08/2026"), `parseBRLParaCentavos(txt: string): number`
  - Layout `/app` verifica config ativa no server: sem config → `redirect('/app/onboarding')` (exceto na própria rota de onboarding)

- [ ] **Step 1: `src/lib/format.ts`** (com teste `src/lib/format.test.ts`)

```ts
export function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
export function formatData(iso: string): string {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}
export function parseBRLParaCentavos(txt: string): number {
  const limpo = txt.replace(/[^\d,]/g, '').replace(',', '.')
  return Math.round(parseFloat(limpo || '0') * 100)
}
```

Teste:
```ts
import { describe, it, expect } from 'vitest'
import { formatBRL, formatData, parseBRLParaCentavos } from './format'

describe('format', () => {
  it('formatBRL', () => expect(formatBRL(123456)).toMatch(/R\$\s?1\.234,56/))
  it('formatData', () => expect(formatData('2026-08-10')).toBe('10/08/2026'))
  it('parseBRLParaCentavos', () => {
    expect(parseBRLParaCentavos('500.000,00')).toBe(50_000_000)
    expect(parseBRLParaCentavos('R$ 1.234,56')).toBe(123_456)
  })
})
```

- [ ] **Step 2: `src/lib/queries/keys.ts`**

```ts
export const queryKeys = {
  config: ['config'] as const,
  dashboard: (ano: number, mes: number) => ['dashboard', ano, mes] as const,
  vendas: (busca = '') => ['vendas', busca] as const,
  venda: (id: string) => ['venda', id] as const,
  recebimentos: ['recebimentos'] as const,
  clientes: (busca = '') => ['clientes', busca] as const,
}
```

- [ ] **Step 3: `src/components/providers.tsx`**

```tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }))
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="top-center" />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 4: `src/components/app-nav.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, Wallet, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const itens = [
  { href: '/app', label: 'Início', icon: LayoutDashboard },
  { href: '/app/vendas', label: 'Vendas', icon: ShoppingBag },
  { href: '/app/recebimentos', label: 'Recebimentos', icon: Wallet },
  { href: '/app/configuracao', label: 'Ajustes', icon: Settings },
]

export function AppNav() {
  const path = usePathname()
  const ativo = (href: string) => href === '/app' ? path === '/app' : path.startsWith(href)
  return (
    <>
      {/* mobile: bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card md:hidden">
        {itens.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]',
              ativo(href) ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            <Icon size={20} />{label}
          </Link>
        ))}
      </nav>
      {/* desktop: sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r bg-card p-4 md:flex">
        <p className="mb-6 text-lg font-bold">ConsorPro</p>
        {itens.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={cn('flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm',
              ativo(href) ? 'bg-background font-medium' : 'text-muted-foreground hover:text-foreground')}>
            <Icon size={18} />{label}
          </Link>
        ))}
      </aside>
    </>
  )
}
```

- [ ] **Step 5: `src/app/app/layout.tsx`** (gate de config no server)

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Providers } from '@/components/providers'
import { AppNav } from '@/components/app-nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: config } = await supabase.from('config_financeira')
    .select('id').eq('ativa', true).maybeSingle()
  const path = (await headers()).get('x-pathname') ?? ''
  // gate via página: onboarding/page redireciona de volta se config existe;
  // demais páginas: layout redireciona se falta config — usar cookie-free check:
  if (!config && !path.includes('onboarding')) redirect('/app/onboarding')
  return (
    <Providers>
      <AppNav />
      <main className="min-h-dvh pb-20 md:pb-8 md:pl-56">
        <div className="mx-auto max-w-3xl p-4">{children}</div>
      </main>
    </Providers>
  )
}
```

Nota: `x-pathname` não existe por padrão — setar no middleware: `response.headers.set('x-pathname', request.nextUrl.pathname)` (adicionar linha no `src/middleware.ts` antes do return). Alternativa aceitável: mover gate para cada página exceto onboarding.

- [ ] **Step 6: Placeholder do dashboard** `src/app/app/page.tsx` (substituída na Task 12):

```tsx
export default function DashboardPage() { return <p>Dashboard</p> }
```

- [ ] **Step 7: Verificar** — login → redirect `/app/onboarding` (404 por ora, esperado até Task 9). `npm test` verde.

- [ ] **Step 8: Commit**

```bash
git add src && git commit -m "feat: shell do app com navegação, providers e gate de onboarding"
```

---

### Task 9: Server actions de config + onboarding wizard

**Files:**
- Create: `src/lib/actions/config.ts`
- Create: `src/lib/actions/recalcular.ts`
- Create: `src/app/app/onboarding/page.tsx`
- Create: `src/components/config-form.tsx`

**Interfaces:**
- Consumes: `configFinanceiraSchema` (Task 3), motor (Tasks 4-5), RPC (Task 6)
- Produces:
  - `salvarConfig(input: ConfigFinanceiraForm): Promise<{ ok: true } | { ok: false; erro: string }>` — desativa config anterior, insere nova ativa, recalcula competência aberta
  - `recalcularCompetencia(supabase, competenciaId): Promise<void>` — helper central: carrega config ativa (ou snapshot se fechada), vendas e recebimentos da competência, roda `calcularCompetencia`, chama RPC
  - `garantirCompetencia(supabase, userId, ref: CompetenciaRef): Promise<string>` — get-or-create, retorna id; antes, chama `fechar_competencias_vencidas`
  - `ConfigForm` (client) — usado no onboarding e em `/app/configuracao`

- [ ] **Step 1: `src/lib/actions/recalcular.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { CompetenciaRef, ConfigCalc } from '@/lib/domain/types'
import { calcularCompetencia } from '@/lib/engine/calculo'

type SB = SupabaseClient<Database>

export async function garantirCompetencia(supabase: SB, userId: string, ref: CompetenciaRef): Promise<string> {
  const { data: config } = await supabase.from('config_financeira')
    .select('*').eq('ativa', true).single()
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  await supabase.rpc('fechar_competencias_vencidas', { p_snapshot: config, p_hoje: hoje })

  const { data: existente } = await supabase.from('competencias')
    .select('id').eq('ano', ref.ano).eq('mes', ref.mes).maybeSingle()
  if (existente) return existente.id
  const { data: nova, error } = await supabase.from('competencias')
    .insert({ corretor_id: userId, ano: ref.ano, mes: ref.mes }).select('id').single()
  if (error) throw error
  return nova.id
}

export async function recalcularCompetencia(supabase: SB, competenciaId: string): Promise<void> {
  const { data: comp, error: e1 } = await supabase.from('competencias')
    .select('*').eq('id', competenciaId).single()
  if (e1) throw e1

  let config: ConfigCalc
  if (comp.status === 'fechada' && comp.config_snapshot) {
    const s = comp.config_snapshot as Record<string, unknown>
    config = {
      faixas: s.faixas as ConfigCalc['faixas'],
      calendario: { diaFechamento: s.dia_fechamento as number, diaPrimeiroPagamento: s.dia_primeiro_pagamento as number },
    }
  } else {
    const { data: cfg, error: e2 } = await supabase.from('config_financeira')
      .select('*').eq('ativa', true).single()
    if (e2) throw new Error('Configure como seu escritório paga comissão antes de continuar.')
    config = {
      faixas: cfg.faixas as ConfigCalc['faixas'],
      calendario: { diaFechamento: cfg.dia_fechamento, diaPrimeiroPagamento: cfg.dia_primeiro_pagamento },
    }
  }

  const { data: vendas } = await supabase.from('vendas')
    .select('id, valor_carta_centavos, status').eq('competencia_id', competenciaId)
  const { data: recs } = await supabase.from('recebimentos')
    .select('id, numero_parcela, valor_centavos, status, comissoes!inner(venda_id, vendas!inner(competencia_id))')
    .eq('comissoes.vendas.competencia_id', competenciaId)

  const resultado = calcularCompetencia({
    config,
    competencia: { ano: comp.ano, mes: comp.mes },
    vendas: (vendas ?? []).map(v => ({
      id: v.id, valorCartaCentavos: Number(v.valor_carta_centavos),
      status: v.status as 'confirmada',
    })),
    recebimentosExistentes: (recs ?? []).map(r => ({
      id: r.id, vendaId: (r.comissoes as unknown as { venda_id: string }).venda_id,
      numeroParcela: r.numero_parcela, valorCentavos: Number(r.valor_centavos),
      status: r.status as 'recebido',
    })),
  })

  const { error: e3 } = await supabase.rpc('aplicar_resultado', {
    p_competencia_id: competenciaId,
    p_resultado: resultado as unknown as Record<string, unknown>,
  })
  if (e3) throw e3
}
```

- [ ] **Step 2: `src/lib/actions/config.ts`**

```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { configFinanceiraSchema, type ConfigFinanceiraForm } from '@/lib/domain/schemas'
import { recalcularCompetencia } from './recalcular'

export async function salvarConfig(input: ConfigFinanceiraForm) {
  const parsed = configFinanceiraSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false as const, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, erro: 'Sessão expirada. Entre novamente.' }

  const d = parsed.data
  await supabase.from('config_financeira').update({ ativa: false }).eq('ativa', true)
  const { error } = await supabase.from('config_financeira').insert({
    corretor_id: user.id, nome_politica: d.nomePolitica, faixas: d.faixas,
    dia_fechamento: d.diaFechamento, dia_primeiro_pagamento: d.diaPrimeiroPagamento,
    regras_estorno: d.regrasEstorno, ativa: true,
  })
  if (error) return { ok: false as const, erro: 'Não foi possível salvar. Tente novamente.' }

  // recalcula competências abertas com as novas regras (retroativo no mês corrente)
  const { data: abertas } = await supabase.from('competencias').select('id').eq('status', 'aberta')
  for (const c of abertas ?? []) await recalcularCompetencia(supabase, c.id)
  return { ok: true as const }
}
```

- [ ] **Step 3: `src/components/config-form.tsx`** — client component. Estado: `nomePolitica`, `faixas[]` (array dinâmico com botão "Adicionar faixa" / remover; campos valor inicial [readonly, derivado da faixa anterior +0,01], valor final [vazio = sem teto na última], percentual, parcelas), `diaFechamento`, `diaPrimeiroPagamento`, `regrasEstorno`. Valores monetários com `parseBRLParaCentavos`/`formatBRL`. Submit → `salvarConfig` → sucesso: toast "As regras foram salvas e serão usadas no cálculo das suas comissões." + `router.push('/app')` (no onboarding) ou toast "As novas regras recalculam o mês atual." (na edição — prop `modo: 'onboarding' | 'edicao'`); erro: toast destructive com a mensagem.

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { salvarConfig } from '@/lib/actions/config'
import { parseBRLParaCentavos, formatBRL } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus } from 'lucide-react'

type FaixaDraft = { maxTxt: string; percentualTxt: string; parcelasTxt: string }

export function ConfigForm({ modo, inicial }: {
  modo: 'onboarding' | 'edicao'
  inicial?: { nomePolitica: string; faixas: { max: number | null; percentual: number; parcelas: number }[];
              diaFechamento: number; diaPrimeiroPagamento: number; regrasEstorno: string }
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [nome, setNome] = useState(inicial?.nomePolitica ?? 'Política do escritório')
  const [faixas, setFaixas] = useState<FaixaDraft[]>(
    inicial?.faixas.map(f => ({
      maxTxt: f.max === null ? '' : (f.max / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      percentualTxt: String(f.percentual).replace('.', ','),
      parcelasTxt: String(f.parcelas),
    })) ?? [{ maxTxt: '', percentualTxt: '', parcelasTxt: '' }])
  const [fechamento, setFechamento] = useState(String(inicial?.diaFechamento ?? 25))
  const [pagamento, setPagamento] = useState(String(inicial?.diaPrimeiroPagamento ?? 10))
  const [estorno, setEstorno] = useState(inicial?.regrasEstorno ?? '')
  const [salvando, setSalvando] = useState(false)

  function minDaFaixa(i: number): number {
    if (i === 0) return 0
    const antMax = parseBRLParaCentavos(faixas[i - 1].maxTxt)
    return antMax + 1
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    const payload = {
      nomePolitica: nome,
      faixas: faixas.map((f, i) => ({
        min: minDaFaixa(i),
        max: f.maxTxt.trim() === '' ? null : parseBRLParaCentavos(f.maxTxt),
        percentual: parseFloat(f.percentualTxt.replace(',', '.')) || 0,
        parcelas: parseInt(f.parcelasTxt) || 0,
      })),
      diaFechamento: parseInt(fechamento) || 0,
      diaPrimeiroPagamento: parseInt(pagamento) || 0,
      regrasEstorno: estorno,
    }
    const r = await salvarConfig(payload)
    setSalvando(false)
    if (!r.ok) { toast.error(r.erro); return }
    qc.invalidateQueries()
    if (modo === 'onboarding') {
      toast.success('Tudo pronto! Agora é só registrar suas vendas.')
      router.push('/app')
    } else {
      toast.success('Regras salvas. O mês atual foi recalculado com as novas regras.')
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-1">
        <Label>Nome da política</Label>
        <Input value={nome} onChange={e => setNome(e.target.value)} required />
      </div>

      <div className="space-y-3">
        <Label>Faixas de comissão</Label>
        <p className="text-sm text-muted-foreground">
          Comissão calculada pelo total vendido no mês. Deixe o “valor até” da última faixa em branco.
        </p>
        {faixas.map((f, i) => (
          <div key={i} className="space-y-2 rounded-[10px] border p-3">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Faixa {i + 1} — a partir de {formatBRL(minDaFaixa(i))}</span>
              {faixas.length > 1 && (
                <button type="button" onClick={() => setFaixas(fs => fs.filter((_, j) => j !== i))}>
                  <Trash2 size={16} className="text-muted-foreground" />
                </button>)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Vendido até (R$)</Label>
                <Input inputMode="decimal" placeholder="Sem limite" value={f.maxTxt}
                  onChange={e => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, maxTxt: e.target.value } : x))} /></div>
              <div><Label className="text-xs">Comissão (%)</Label>
                <Input inputMode="decimal" placeholder="0,5" value={f.percentualTxt} required
                  onChange={e => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, percentualTxt: e.target.value } : x))} /></div>
              <div><Label className="text-xs">Parcelas</Label>
                <Input inputMode="numeric" placeholder="2" value={f.parcelasTxt} required
                  onChange={e => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, parcelasTxt: e.target.value } : x))} /></div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm"
          onClick={() => setFaixas(fs => [...fs, { maxTxt: '', percentualTxt: '', parcelasTxt: '' }])}>
          <Plus size={16} /> Adicionar faixa
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><Label>Dia do fechamento</Label>
          <Input inputMode="numeric" value={fechamento} onChange={e => setFechamento(e.target.value)} required /></div>
        <div><Label>Dia do pagamento</Label>
          <Input inputMode="numeric" value={pagamento} onChange={e => setPagamento(e.target.value)} required /></div>
      </div>
      <p className="text-sm text-muted-foreground">
        Vendas até o dia do fechamento entram no mês atual; depois disso, no mês seguinte.
        A primeira parcela é paga no dia do pagamento do mês seguinte.
      </p>

      <div className="space-y-1">
        <Label>Regras de estorno (opcional)</Label>
        <Input value={estorno} onChange={e => setEstorno(e.target.value)}
          placeholder="Ex.: estorno integral em caso de desistência" />
      </div>

      <Button type="submit" className="w-full" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar regras'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: `src/app/app/onboarding/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConfigForm } from '@/components/config-form'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: config } = await supabase.from('config_financeira')
    .select('id').eq('ativa', true).maybeSingle()
  if (config) redirect('/app')
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Bem-vindo ao ConsorPro</h1>
        <p className="text-muted-foreground">
          Antes de registrar sua primeira venda, configure como seu escritório paga comissão.
          Você só faz isso uma vez.
        </p>
      </div>
      <ConfigForm modo="onboarding" />
    </div>
  )
}
```

- [ ] **Step 5: Testar manualmente** — login novo → onboarding → salvar faixas exemplo do PRD (até 1M: 0,5%/2x; acima: 0,6%/3x) → redirect dashboard. Verificar linha em `config_financeira`.

- [ ] **Step 6: Commit**

```bash
git add src && git commit -m "feat: onboarding com formulário de configuração financeira"
```

---

### Task 10: Server actions de clientes e vendas

**Files:**
- Create: `src/lib/actions/clientes.ts`
- Create: `src/lib/actions/vendas.ts`

**Interfaces:**
- Consumes: `vendaFormSchema, clienteFormSchema` (Task 3), `competenciaDaVenda` (Task 4), `garantirCompetencia, recalcularCompetencia` (Task 9)
- Produces:
  - `criarCliente(input: ClienteForm): Promise<{ ok: true; id: string } | { ok: false; erro: string }>`
  - `criarVenda(input: VendaForm): Promise<{ ok: true; vendaId: string } | { ok: false; erro: string }>`
  - `editarVenda(id: string, input: VendaForm): Promise<{ ok: true } | { ok: false; erro: string }>` — se a data mudar de competência, move a venda e recalcula AMBAS as competências
  - `cancelarVenda(id: string, motivo: string): Promise<{ ok: true } | { ok: false; erro: string }>` — exige motivo (RN-036)
  - `marcarRecebido(recebimentoId: string, dataRecebimento: string): Promise<{ ok: true } | { ok: false; erro: string }>` — update status + data; atualiza status da comissão (parcial/recebida) SEM rodar o motor

- [ ] **Step 1: `src/lib/actions/clientes.ts`**

```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { clienteFormSchema, type ClienteForm } from '@/lib/domain/schemas'

export async function criarCliente(input: ClienteForm) {
  const parsed = clienteFormSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false as const, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, erro: 'Sessão expirada. Entre novamente.' }
  const { data, error } = await supabase.from('clientes')
    .insert({ corretor_id: user.id, ...parsed.data }).select('id').single()
  if (error) return { ok: false as const, erro: 'Não foi possível salvar o cliente.' }
  return { ok: true as const, id: data.id }
}
```

- [ ] **Step 2: `src/lib/actions/vendas.ts`**

```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { vendaFormSchema, type VendaForm } from '@/lib/domain/schemas'
import { competenciaDaVenda } from '@/lib/engine/calendario'
import { garantirCompetencia, recalcularCompetencia } from './recalcular'

async function contexto() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Entre novamente.')
  const { data: config } = await supabase.from('config_financeira')
    .select('dia_fechamento').eq('ativa', true).single()
  if (!config) throw new Error('Configure como seu escritório paga comissão antes de registrar vendas.')
  return { supabase, user, diaFechamento: config.dia_fechamento }
}

export async function criarVenda(input: VendaForm) {
  try {
    const parsed = vendaFormSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false as const, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
    const { supabase, user, diaFechamento } = await contexto()
    const d = parsed.data
    const ref = competenciaDaVenda(d.dataVenda, diaFechamento)
    const competenciaId = await garantirCompetencia(supabase, user.id, ref)
    const { data: venda, error } = await supabase.from('vendas').insert({
      corretor_id: user.id, cliente_id: d.clienteId, competencia_id: competenciaId,
      valor_carta_centavos: d.valorCartaCentavos, administradora: d.administradora,
      grupo: d.grupo, cota: d.cota, data_venda: d.dataVenda,
      observacoes: d.observacoes, status: 'confirmada',
    }).select('id').single()
    if (error) return { ok: false as const, erro: 'Não foi possível salvar a venda.' }
    await recalcularCompetencia(supabase, competenciaId)
    return { ok: true as const, vendaId: venda.id }
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function editarVenda(id: string, input: VendaForm) {
  try {
    const parsed = vendaFormSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false as const, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
    const { supabase, user, diaFechamento } = await contexto()
    const d = parsed.data
    const { data: atual, error: e1 } = await supabase.from('vendas')
      .select('competencia_id').eq('id', id).single()
    if (e1) return { ok: false as const, erro: 'Venda não encontrada.' }
    const ref = competenciaDaVenda(d.dataVenda, diaFechamento)
    const novaCompetenciaId = await garantirCompetencia(supabase, user.id, ref)
    const { error } = await supabase.from('vendas').update({
      cliente_id: d.clienteId, valor_carta_centavos: d.valorCartaCentavos,
      administradora: d.administradora, grupo: d.grupo, cota: d.cota,
      data_venda: d.dataVenda, observacoes: d.observacoes,
      competencia_id: novaCompetenciaId, updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) return { ok: false as const, erro: 'Não foi possível salvar as alterações.' }
    await recalcularCompetencia(supabase, novaCompetenciaId)
    if (atual.competencia_id !== novaCompetenciaId)
      await recalcularCompetencia(supabase, atual.competencia_id)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function cancelarVenda(id: string, motivo: string) {
  try {
    if (!motivo.trim()) return { ok: false as const, erro: 'Informe o motivo do cancelamento.' }
    const { supabase } = await contexto()
    const { data: venda, error } = await supabase.from('vendas')
      .update({ status: 'cancelada', motivo_cancelamento: motivo, updated_at: new Date().toISOString() })
      .eq('id', id).select('competencia_id').single()
    if (error) return { ok: false as const, erro: 'Não foi possível cancelar a venda.' }
    await recalcularCompetencia(supabase, venda.competencia_id)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function marcarRecebido(recebimentoId: string, dataRecebimento: string) {
  const supabase = await createClient()
  const { data: rec, error } = await supabase.from('recebimentos')
    .update({ status: 'recebido', data_recebimento: dataRecebimento })
    .eq('id', recebimentoId).eq('status', 'previsto')
    .select('comissao_id').single()
  if (error) return { ok: false as const, erro: 'Não foi possível registrar o recebimento.' }

  const { data: irmaos } = await supabase.from('recebimentos')
    .select('status').eq('comissao_id', rec.comissao_id)
  const pendentes = (irmaos ?? []).filter(r => r.status === 'previsto').length
  await supabase.from('comissoes')
    .update({ status: pendentes === 0 ? 'recebida' : 'parcial', updated_at: new Date().toISOString() })
    .eq('id', rec.comissao_id)
  return { ok: true as const }
}
```

- [ ] **Step 3: Teste de integração manual (SQL)** — criar venda via UI ainda não existe; validar via script temporário ou aguardar Task 11 e validar fluxo completo lá. Mínimo aqui: `npm run build` sem erros de tipo.

- [ ] **Step 4: Commit**

```bash
git add src && git commit -m "feat: actions de clientes e vendas com recálculo automático"
```

---

### Task 11: UI de Vendas (lista, nova, detalhe, cancelar)

**Files:**
- Create: `src/app/app/vendas/page.tsx`
- Create: `src/app/app/vendas/nova/page.tsx`
- Create: `src/app/app/vendas/[id]/page.tsx`
- Create: `src/components/venda-form.tsx`
- Create: `src/components/cliente-picker.tsx`
- Create: `src/lib/queries/vendas.ts`

**Interfaces:**
- Consumes: actions (Task 10), `queryKeys` (Task 8), `formatBRL/formatData/parseBRLParaCentavos` (Task 8)
- Produces: hooks `useVendas(busca)`, `useVenda(id)`, `useClientes(busca)` em `src/lib/queries/vendas.ts` (supabase browser client + useQuery)

- [ ] **Step 1: `src/lib/queries/vendas.ts`**

```ts
'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from './keys'

export function useVendas(busca = '') {
  return useQuery({
    queryKey: queryKeys.vendas(busca),
    queryFn: async () => {
      const supabase = createClient()
      let q = supabase.from('vendas')
        .select('id, valor_carta_centavos, administradora, grupo, cota, data_venda, status, clientes(nome), comissoes(valor_centavos, percentual, status)')
        .order('data_venda', { ascending: false }).limit(100)
      if (busca) q = q.or(`grupo.ilike.%${busca}%,cota.ilike.%${busca}%,administradora.ilike.%${busca}%`)
      const { data, error } = await q
      if (error) throw error
      // busca por nome de cliente: filtro client-side (MVP)
      const lista = data ?? []
      if (!busca) return lista
      const b = busca.toLowerCase()
      return lista.filter(v =>
        (v.clientes as { nome: string } | null)?.nome.toLowerCase().includes(b) ||
        v.grupo.toLowerCase().includes(b) || v.cota.toLowerCase().includes(b) ||
        v.administradora.toLowerCase().includes(b))
    },
  })
}

export function useVenda(id: string) {
  return useQuery({
    queryKey: queryKeys.venda(id),
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('vendas')
        .select('*, clientes(id, nome, telefone), comissoes(*, recebimentos(*))')
        .eq('id', id).single()
      if (error) throw error
      return data
    },
  })
}

export function useClientes(busca = '') {
  return useQuery({
    queryKey: queryKeys.clientes(busca),
    queryFn: async () => {
      const supabase = createClient()
      let q = supabase.from('clientes').select('id, nome, telefone').order('nome').limit(20)
      if (busca) q = q.ilike('nome', `%${busca}%`)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}
```

- [ ] **Step 2: `src/components/cliente-picker.tsx`** — autocomplete: input de busca → `useClientes(busca)` → lista de opções; se nenhum resultado, botão "Criar cliente ‘{busca}’" → `criarCliente({ nome: busca })` → seleciona o novo id. Props: `{ value: string | null; onChange: (id: string, nome: string) => void }`.

```tsx
'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useClientes } from '@/lib/queries/vendas'
import { criarCliente } from '@/lib/actions/clientes'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function ClientePicker({ value, nomeSelecionado, onChange }: {
  value: string | null
  nomeSelecionado: string
  onChange: (id: string, nome: string) => void
}) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const { data: clientes = [] } = useClientes(busca)
  const qc = useQueryClient()

  if (value && !aberto)
    return (
      <div className="flex items-center justify-between rounded-[10px] border px-3 py-2">
        <span>{nomeSelecionado}</span>
        <button type="button" className="text-sm text-muted-foreground underline"
          onClick={() => setAberto(true)}>trocar</button>
      </div>
    )

  return (
    <div className="space-y-2">
      <Input placeholder="Buscar ou criar cliente…" value={busca}
        onChange={e => setBusca(e.target.value)} autoFocus />
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {clientes.map(c => (
          <button key={c.id} type="button"
            className="block w-full rounded-[10px] border px-3 py-2 text-left hover:bg-background"
            onClick={() => { onChange(c.id, c.nome); setAberto(false); setBusca('') }}>
            {c.nome}
          </button>
        ))}
        {busca.trim() && !clientes.some(c => c.nome.toLowerCase() === busca.trim().toLowerCase()) && (
          <Button type="button" variant="outline" className="w-full" onClick={async () => {
            const r = await criarCliente({ nome: busca.trim(), telefone: '', documento: '', observacoes: '' })
            if (!r.ok) { toast.error(r.erro); return }
            qc.invalidateQueries({ queryKey: ['clientes'] })
            onChange(r.id, busca.trim()); setAberto(false); setBusca('')
          }}>Criar cliente “{busca.trim()}”</Button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `src/components/venda-form.tsx`** — campos: ClientePicker, valor da carta (inputMode decimal, parse centavos), administradora, grupo, cota, data (default hoje America/Sao_Paulo), observações. Submit → `criarVenda` ou `editarVenda` (prop `vendaId?`) → sucesso: toast "Venda registrada. Comissão calculada automaticamente." → `qc.invalidateQueries()` → `router.push('/app/vendas')`.

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { criarVenda, editarVenda } from '@/lib/actions/vendas'
import { parseBRLParaCentavos } from '@/lib/format'
import { ClientePicker } from './cliente-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

export function VendaForm({ vendaId, inicial }: {
  vendaId?: string
  inicial?: { clienteId: string; clienteNome: string; valorTxt: string; administradora: string;
              grupo: string; cota: string; dataVenda: string; observacoes: string }
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [clienteId, setClienteId] = useState<string | null>(inicial?.clienteId ?? null)
  const [clienteNome, setClienteNome] = useState(inicial?.clienteNome ?? '')
  const [valorTxt, setValorTxt] = useState(inicial?.valorTxt ?? '')
  const [administradora, setAdministradora] = useState(inicial?.administradora ?? '')
  const [grupo, setGrupo] = useState(inicial?.grupo ?? '')
  const [cota, setCota] = useState(inicial?.cota ?? '')
  const [dataVenda, setDataVenda] = useState(inicial?.dataVenda ?? hojeSP())
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [salvando, setSalvando] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId) { toast.error('Selecione um cliente.'); return }
    setSalvando(true)
    const payload = {
      clienteId, valorCartaCentavos: parseBRLParaCentavos(valorTxt),
      administradora, grupo, cota, dataVenda, observacoes,
    }
    const r = vendaId ? await editarVenda(vendaId, payload) : await criarVenda(payload)
    setSalvando(false)
    if (!r.ok) { toast.error(r.erro); return }
    qc.invalidateQueries()
    toast.success(vendaId ? 'Venda atualizada. Comissões recalculadas.'
                          : 'Venda registrada. Comissão calculada automaticamente.')
    router.push('/app/vendas')
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1"><Label>Cliente</Label>
        <ClientePicker value={clienteId} nomeSelecionado={clienteNome}
          onChange={(id, nome) => { setClienteId(id); setClienteNome(nome) }} /></div>
      <div className="space-y-1"><Label>Valor da carta (R$)</Label>
        <Input inputMode="decimal" placeholder="500.000,00" value={valorTxt}
          onChange={e => setValorTxt(e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Administradora</Label>
          <Input value={administradora} onChange={e => setAdministradora(e.target.value)} required /></div>
        <div className="space-y-1"><Label>Data da venda</Label>
          <Input type="date" value={dataVenda} onChange={e => setDataVenda(e.target.value)} required /></div>
        <div className="space-y-1"><Label>Grupo</Label>
          <Input value={grupo} onChange={e => setGrupo(e.target.value)} required /></div>
        <div className="space-y-1"><Label>Cota</Label>
          <Input value={cota} onChange={e => setCota(e.target.value)} required /></div>
      </div>
      <div className="space-y-1"><Label>Observações (opcional)</Label>
        <Input value={observacoes} onChange={e => setObservacoes(e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar venda'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Páginas.** `vendas/page.tsx` (client): input de busca + lista de cards (cliente, `formatBRL(valor)`, administradora/grupo/cota, data, badge de status; comissão em verde `text-primary font-semibold`); empty state: "Você ainda não possui vendas cadastradas." + botão "Cadastrar primeira venda"; FAB/botão "Nova venda" → `/app/vendas/nova`. `nova/page.tsx`: `<VendaForm />` com título "Nova venda". `[id]/page.tsx` (client, `useVenda(id)`): detalhe completo — dados da venda, comissão (percentual, valor em verde, faixa, parcelas), lista de recebimentos (`formatData`, status); botões Editar (mostra `VendaForm` com `inicial`) e Cancelar (Dialog: motivo obrigatório → `cancelarVenda` → toast "Venda cancelada. As parcelas previstas foram canceladas; as já recebidas permanecem no histórico.").

```tsx
// src/app/app/vendas/page.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useVendas } from '@/lib/queries/vendas'
import { formatBRL, formatData } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus } from 'lucide-react'

const statusLabel: Record<string, string> = {
  confirmada: 'Confirmada', cancelada: 'Cancelada', estornada: 'Estornada',
  rascunho: 'Rascunho', arquivada: 'Arquivada',
}

export default function VendasPage() {
  const [busca, setBusca] = useState('')
  const { data: vendas, isLoading } = useVendas(busca)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Vendas</h1>
        <Button asChild><Link href="/app/vendas/nova"><Plus size={16} /> Nova venda</Link></Button>
      </div>
      <Input placeholder="Buscar por cliente, grupo, cota ou administradora…"
        value={busca} onChange={e => setBusca(e.target.value)} />
      {isLoading && <Skeleton className="h-24 w-full" />}
      {!isLoading && (vendas ?? []).length === 0 && (
        <div className="rounded-[10px] border p-8 text-center">
          <p className="mb-3 text-muted-foreground">
            {busca ? 'Nenhuma venda encontrada para essa busca.' : 'Você ainda não possui vendas cadastradas.'}
          </p>
          {!busca && <Button asChild><Link href="/app/vendas/nova">Cadastrar primeira venda</Link></Button>}
        </div>
      )}
      <div className="space-y-2">
        {(vendas ?? []).map(v => (
          <Link key={v.id} href={`/app/vendas/${v.id}`}
            className="block rounded-[10px] border bg-card p-3 hover:bg-background">
            <div className="flex items-center justify-between">
              <p className="font-medium">{(v.clientes as { nome: string } | null)?.nome}</p>
              <Badge variant={v.status === 'confirmada' ? 'secondary' : 'outline'}>
                {statusLabel[v.status]}</Badge>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {v.administradora} · G{v.grupo} · C{v.cota} · {formatData(v.data_venda)}</span>
              <span className="font-semibold">{formatBRL(Number(v.valor_carta_centavos))}</span>
            </div>
            {v.comissoes && (
              <p className="mt-1 text-sm">Comissão:{' '}
                <span className="font-semibold text-primary">
                  {formatBRL(Number((v.comissoes as { valor_centavos: number }).valor_centavos))}
                </span></p>)}
          </Link>
        ))}
      </div>
    </div>
  )
}
```

(`nova/page.tsx` e `[id]/page.tsx` seguem o mesmo padrão de componentes; `[id]` usa `useParams()`, Dialog do shadcn para cancelamento com Input de motivo.)

- [ ] **Step 5: Teste manual do fluxo completo** — cadastrar 2 vendas cruzando faixa (ex: 800k depois 400k) → conferir no detalhe que AMBAS mostram 0,6% e 3 parcelas. Cancelar a segunda → primeira volta a 0,5%/2x. Meta: cadastro em <30s.

- [ ] **Step 6: Commit**

```bash
git add src && git commit -m "feat: telas de vendas com cadastro rápido e recálculo retroativo"
```

---

### Task 12: UI de Recebimentos + Dashboard

**Files:**
- Create: `src/app/app/recebimentos/page.tsx`
- Modify: `src/app/app/page.tsx` (dashboard real)
- Create: `src/lib/queries/recebimentos.ts`
- Create: `src/lib/queries/dashboard.ts`
- Create: `src/components/valor.tsx`

**Interfaces:**
- Consumes: `marcarRecebido` (Task 10), `queryKeys`, `formatBRL/formatData`
- Produces:
  - `useRecebimentos()` — recebimentos com join venda/cliente, ordenado por `data_prevista` asc
  - `useDashboard(ano, mes)` — agregados: `{ totalVendidoCentavos, nVendas, ticketMedioCentavos, comissaoPrevistaCentavos, comissaoRecebidaCentavos, comissaoPendenteCentavos, proximos: Recebimento[] }`
  - `<Valor centavos={n} destaque />` — span verde `text-primary` para dinheiro
  - Status "Atrasado" derivado: `status === 'previsto' && data_prevista < hoje`

- [ ] **Step 1: `src/components/valor.tsx`**

```tsx
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

export function Valor({ centavos, destaque = true, className }: {
  centavos: number; destaque?: boolean; className?: string
}) {
  return (
    <span className={cn('tabular-nums font-semibold', destaque && 'text-primary', className)}>
      {formatBRL(centavos)}
    </span>
  )
}
```

- [ ] **Step 2: `src/lib/queries/recebimentos.ts`**

```ts
'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from './keys'
import { marcarRecebido } from '@/lib/actions/vendas'
import { toast } from 'sonner'

export type RecebimentoLinha = {
  id: string; numero_parcela: number; valor_centavos: number
  data_prevista: string; data_recebimento: string | null; status: string
  comissoes: { n_parcelas: number; vendas: { id: string; clientes: { nome: string } | null } }
}

export function useRecebimentos() {
  return useQuery({
    queryKey: queryKeys.recebimentos,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('recebimentos')
        .select('id, numero_parcela, valor_centavos, data_prevista, data_recebimento, status, comissoes(n_parcelas, vendas(id, clientes(nome)))')
        .order('data_prevista', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as RecebimentoLinha[]
    },
  })
}

export function useMarcarRecebido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: string }) => marcarRecebido(id, data),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: queryKeys.recebimentos })
      const anterior = qc.getQueryData<RecebimentoLinha[]>(queryKeys.recebimentos)
      qc.setQueryData<RecebimentoLinha[]>(queryKeys.recebimentos, old =>
        (old ?? []).map(r => r.id === id ? { ...r, status: 'recebido' } : r))
      return { anterior }
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(queryKeys.recebimentos, ctx?.anterior)
      toast.error('Não foi possível registrar o recebimento. Tente novamente.')
    },
    onSuccess: (r) => {
      if (!r.ok) { toast.error(r.erro); qc.invalidateQueries(); return }
      toast.success('Recebimento atualizado.')
    },
    onSettled: () => qc.invalidateQueries(),
  })
}
```

- [ ] **Step 3: `src/app/app/recebimentos/page.tsx`** — lista cronológica agrupada por mês. Cada linha: cliente, "Parcela X de Y", `<Valor/>`, `formatData(data_prevista)`, badge de status (Atrasado se `previsto && data < hoje`, cor warning `#F59E0B`); botão "Marcar recebido" (só em previstos) → `useMarcarRecebido().mutate({ id, data: hojeSP() })` (optimistic). Empty state: "Nenhum recebimento por aqui ainda. Registre uma venda e as parcelas aparecem automaticamente."

```tsx
'use client'
import { useRecebimentos, useMarcarRecebido } from '@/lib/queries/recebimentos'
import { Valor } from '@/components/valor'
import { formatData } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}
const mesLabel = (iso: string) => {
  const [a, m] = iso.split('-')
  const nomes = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  return `${nomes[Number(m) - 1]} de ${a}`
}

export default function RecebimentosPage() {
  const { data: recs, isLoading } = useRecebimentos()
  const marcar = useMarcarRecebido()
  const hoje = hojeSP()
  const grupos = new Map<string, NonNullable<typeof recs>>()
  for (const r of recs ?? []) {
    const k = r.data_prevista.slice(0, 7)
    grupos.set(k, [...(grupos.get(k) ?? []), r])
  }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Recebimentos</h1>
      {isLoading && <Skeleton className="h-24 w-full" />}
      {!isLoading && (recs ?? []).length === 0 && (
        <div className="rounded-[10px] border p-8 text-center text-muted-foreground">
          Nenhum recebimento por aqui ainda. Registre uma venda e as parcelas aparecem automaticamente.
        </div>
      )}
      {[...grupos.entries()].map(([mes, linhas]) => (
        <section key={mes} className="space-y-2">
          <h2 className="text-sm font-medium capitalize text-muted-foreground">{mesLabel(mes + '-01')}</h2>
          {linhas.map(r => {
            const atrasado = r.status === 'previsto' && r.data_prevista < hoje
            return (
              <div key={r.id} className="flex items-center justify-between rounded-[10px] border bg-card p-3">
                <div>
                  <p className="font-medium">{r.comissoes.vendas.clientes?.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    Parcela {r.numero_parcela} de {r.comissoes.n_parcelas} · {formatData(r.data_prevista)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Valor centavos={Number(r.valor_centavos)} />
                  {r.status === 'recebido' && <Badge variant="secondary">Recebido</Badge>}
                  {atrasado && <Badge className="bg-[#F59E0B] text-white">Atrasado</Badge>}
                  {r.status === 'previsto' && (
                    <Button size="sm" variant="outline"
                      onClick={() => marcar.mutate({ id: r.id, data: hojeSP() })}>
                      Marcar recebido</Button>)}
                  {r.status === 'cancelado' && <Badge variant="outline">Cancelado</Badge>}
                </div>
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: `src/lib/queries/dashboard.ts`**

```ts
'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from './keys'

export function useDashboard(ano: number, mes: number) {
  return useQuery({
    queryKey: queryKeys.dashboard(ano, mes),
    queryFn: async () => {
      const supabase = createClient()
      const { data: comp } = await supabase.from('competencias')
        .select('id').eq('ano', ano).eq('mes', mes).maybeSingle()
      const vazio = {
        totalVendidoCentavos: 0, nVendas: 0, ticketMedioCentavos: 0,
        comissaoPrevistaCentavos: 0, comissaoRecebidaCentavos: 0,
        comissaoPendenteCentavos: 0,
        proximos: [] as { id: string; valor_centavos: number; data_prevista: string; cliente: string }[],
      }
      // próximos recebimentos independem da competência
      const { data: prox } = await supabase.from('recebimentos')
        .select('id, valor_centavos, data_prevista, comissoes(vendas(clientes(nome)))')
        .eq('status', 'previsto').order('data_prevista').limit(5)
      vazio.proximos = (prox ?? []).map(p => ({
        id: p.id, valor_centavos: Number(p.valor_centavos), data_prevista: p.data_prevista,
        cliente: (p.comissoes as unknown as { vendas: { clientes: { nome: string } | null } })
          .vendas.clientes?.nome ?? '',
      }))
      if (!comp) return vazio

      const { data: vendas } = await supabase.from('vendas')
        .select('valor_carta_centavos, status, comissoes(valor_centavos, status, recebimentos(valor_centavos, status))')
        .eq('competencia_id', comp.id)
      const confirmadas = (vendas ?? []).filter(v => v.status === 'confirmada')
      const total = confirmadas.reduce((s, v) => s + Number(v.valor_carta_centavos), 0)
      let prevista = 0, recebida = 0
      for (const v of confirmadas) {
        const c = v.comissoes as unknown as
          { valor_centavos: number; recebimentos: { valor_centavos: number; status: string }[] } | null
        if (!c) continue
        prevista += Number(c.valor_centavos)
        recebida += c.recebimentos
          .filter(r => r.status === 'recebido')
          .reduce((s, r) => s + Number(r.valor_centavos), 0)
      }
      return {
        ...vazio,
        totalVendidoCentavos: total, nVendas: confirmadas.length,
        ticketMedioCentavos: confirmadas.length ? Math.round(total / confirmadas.length) : 0,
        comissaoPrevistaCentavos: prevista, comissaoRecebidaCentavos: recebida,
        comissaoPendenteCentavos: prevista - recebida,
      }
    },
  })
}
```

- [ ] **Step 5: Dashboard `src/app/app/page.tsx`** — client. Competência atual = derivada de hoje + dia de fechamento (buscar config via query `queryKeys.config`; helper local usa `competenciaDaVenda(hojeSP(), diaFechamento)`). Layout: card grande no topo "A receber" (`comissaoPendenteCentavos`, `<Valor/>` grande); grid 2×2 de cards: Vendi no mês, Comissão prevista, Já recebi, Nº de vendas + ticket médio; seção "Próximos recebimentos" (5 linhas: cliente, data, valor verde, link para `/app/recebimentos`); seletor de mês (« ») para histórico (muda ano/mes passado ao hook — atende módulo Histórico do MVP); empty state sem vendas no mês: "Nenhuma venda neste mês ainda." + botão "Nova venda"; botão destaque "Nova venda" no topo.

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useDashboard } from '@/lib/queries/dashboard'
import { competenciaDaVenda, proximaCompetencia } from '@/lib/engine/calendario'
import { queryKeys } from '@/lib/queries/keys'
import { Valor } from '@/components/valor'
import { formatBRL, formatData } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}
const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function DashboardPage() {
  const { data: config } = useQuery({
    queryKey: queryKeys.config,
    queryFn: async () => {
      const { data, error } = await createClient().from('config_financeira')
        .select('*').eq('ativa', true).single()
      if (error) throw error
      return data
    },
  })
  const atual = config ? competenciaDaVenda(hojeSP(), config.dia_fechamento) : null
  const [ref, setRef] = useState<{ ano: number; mes: number } | null>(null)
  const comp = ref ?? atual
  const { data: d, isLoading } = useDashboard(comp?.ano ?? 0, comp?.mes ?? 0)

  if (!comp) return <Skeleton className="h-40 w-full" />
  const anterior = comp.mes === 1 ? { ano: comp.ano - 1, mes: 12 } : { ano: comp.ano, mes: comp.mes - 1 }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => setRef(anterior)}><ChevronLeft size={18} /></button>
          <h1 className="text-lg font-semibold">{nomes[comp.mes - 1]} {comp.ano}</h1>
          <button onClick={() => setRef(proximaCompetencia(comp))}><ChevronRight size={18} /></button>
        </div>
        <Button asChild><Link href="/app/vendas/nova"><Plus size={16} /> Nova venda</Link></Button>
      </div>

      {isLoading || !d ? <Skeleton className="h-64 w-full" /> : (
        <>
          <div className="rounded-[10px] border bg-card p-4">
            <p className="text-sm text-muted-foreground">Falta receber</p>
            <p className="text-3xl"><Valor centavos={d.comissaoPendenteCentavos} /></p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Vendi no mês', formatBRL(d.totalVendidoCentavos), false],
              ['Comissão prevista', formatBRL(d.comissaoPrevistaCentavos), true],
              ['Já recebi', formatBRL(d.comissaoRecebidaCentavos), true],
              [`${d.nVendas} venda${d.nVendas === 1 ? '' : 's'}`, `Ticket ${formatBRL(d.ticketMedioCentavos)}`, false],
            ].map(([label, valor, verde], i) => (
              <div key={i} className="rounded-[10px] border bg-card p-3">
                <p className="text-xs text-muted-foreground">{label as string}</p>
                <p className={`text-lg font-semibold tabular-nums ${verde ? 'text-primary' : ''}`}>
                  {valor as string}</p>
              </div>
            ))}
          </div>
          {d.nVendas === 0 && (
            <div className="rounded-[10px] border p-6 text-center text-muted-foreground">
              Nenhuma venda neste mês ainda.
            </div>
          )}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Próximos recebimentos</h2>
              <Link href="/app/recebimentos" className="text-sm underline">ver todos</Link>
            </div>
            {d.proximos.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum recebimento previsto.</p>)}
            {d.proximos.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-[10px] border bg-card p-3 text-sm">
                <span>{p.cliente} · {formatData(p.data_prevista)}</span>
                <Valor centavos={p.valor_centavos} />
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Teste manual** — venda nova reflete no dashboard imediatamente (invalidate); marcar recebido atualiza "Já recebi" e "Falta receber"; navegar « para mês anterior mostra histórico.

- [ ] **Step 7: Commit**

```bash
git add src && git commit -m "feat: dashboard financeiro e tela de recebimentos com optimistic update"
```

---

### Task 13: Tela de Configuração + Perfil

**Files:**
- Create: `src/app/app/configuracao/page.tsx`
- Create: `src/app/app/configuracao/perfil-card.tsx`

**Interfaces:**
- Consumes: `ConfigForm` (Task 9), `sair` (Task 7)

- [ ] **Step 1: `src/app/app/configuracao/page.tsx`** — server component: carrega config ativa, monta `inicial` para `ConfigForm modo="edicao"`. Banner acima do form: "Alterações valem para as próximas vendas. O mês atual em aberto será recalculado com as novas regras; meses já fechados não mudam." Abaixo: card de perfil (nome, e-mail, botão "Sair" → action `sair`).

```tsx
import { createClient } from '@/lib/supabase/server'
import { ConfigForm } from '@/components/config-form'
import { sair } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import type { Faixa } from '@/lib/domain/types'

export default async function ConfiguracaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: cfg } = await supabase.from('config_financeira')
    .select('*').eq('ativa', true).single()
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Ajustes</h1>
      <div className="rounded-[10px] border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3 text-sm">
        Alterações valem para as próximas vendas. O mês em aberto será recalculado
        com as novas regras; meses já fechados não mudam.
      </div>
      {cfg && (
        <ConfigForm modo="edicao" inicial={{
          nomePolitica: cfg.nome_politica,
          faixas: (cfg.faixas as Faixa[]).map(f => ({ max: f.max, percentual: f.percentual, parcelas: f.parcelas })),
          diaFechamento: cfg.dia_fechamento,
          diaPrimeiroPagamento: cfg.dia_primeiro_pagamento,
          regrasEstorno: cfg.regras_estorno ?? '',
        }} />
      )}
      <div className="rounded-[10px] border bg-card p-4">
        <p className="font-medium">Conta</p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <form action={sair} className="mt-3"><Button variant="outline" type="submit">Sair</Button></form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Teste manual** — editar percentual da faixa → salvar → vendas do mês aberto recalculam (conferir no detalhe da venda); dashboard reflete.

- [ ] **Step 3: Commit**

```bash
git add src && git commit -m "feat: tela de ajustes com edição de regras e perfil"
```

---

### Task 14: Landing page `/`

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx` (fonte Inter, metadata)

**Interfaces:**
- Consumes: paleta/tokens (Task 1)
- Produces: landing estática RSC: hero, 3 benefícios, CTA → `/cadastro`.

- [ ] **Step 1: `src/app/layout.tsx`** — fonte Inter via `next/font/google`, `<html lang="pt-BR">`, metadata: title "ConsorPro — Chega de planilha para controlar suas comissões", description "Registre a venda. O ConsorPro calcula comissão, parcelas e mostra quanto você vai receber e quando.".

- [ ] **Step 2: `src/app/page.tsx`**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Calculator, CalendarClock, TrendingUp } from 'lucide-react'

const beneficios = [
  { icon: Calculator, titulo: 'Comissão calculada na hora',
    texto: 'Registre a venda em menos de 30 segundos. Percentual, faixa e parcelas calculados automaticamente, do jeito que seu escritório paga.' },
  { icon: CalendarClock, titulo: 'Saiba quando o dinheiro entra',
    texto: 'Cronograma de recebimentos gerado automaticamente. Quanto falta, quanto já entrou e o que vem nos próximos meses.' },
  { icon: TrendingUp, titulo: 'Seu mês em dez segundos',
    texto: 'Abra o app e veja quanto vendeu, quanto vai receber e sua faixa atual. Sem fórmulas, sem abas, sem Excel.' },
]

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-4xl px-4">
      <header className="flex items-center justify-between py-5">
        <span className="text-lg font-bold">ConsorPro</span>
        <Button asChild variant="outline"><Link href="/login">Entrar</Link></Button>
      </header>
      <section className="py-16 text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-tight">
          Chega de planilha para controlar suas comissões de consórcio
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Configure uma vez como seu escritório paga. Depois, apenas registre suas vendas —
          o ConsorPro calcula comissão, parcelas e mostra exatamente quanto e quando você vai receber.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/cadastro">Criar conta grátis</Link>
        </Button>
      </section>
      <section className="grid gap-4 pb-20 md:grid-cols-3">
        {beneficios.map(({ icon: Icon, titulo, texto }) => (
          <div key={titulo} className="rounded-[10px] border bg-card p-5">
            <Icon className="mb-3 text-primary" size={24} />
            <h2 className="font-semibold">{titulo}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
          </div>
        ))}
      </section>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        ConsorPro — gestão financeira para corretores de consórcio.
      </footer>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src && git commit -m "feat: landing page"
```

---

### Task 15: PWA + deploy

**Files:**
- Create: `src/app/manifest.ts`
- Create: `public/icon-192.png`, `public/icon-512.png` (gerar ícone simples: quadrado `#111827` com "C" branco — script ou ferramenta de imagem)

**Interfaces:**
- Produces: app installable; deploy Vercel produção.

- [ ] **Step 1: `src/app/manifest.ts`**

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ConsorPro', short_name: 'ConsorPro',
    description: 'Gestão financeira para corretores de consórcio.',
    start_url: '/app', display: 'standalone',
    background_color: '#F8FAFC', theme_color: '#FFFFFF',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

- [ ] **Step 2: Build final + testes**

```bash
npm test && npm run build
```
Expected: tudo verde.

- [ ] **Step 3: Deploy Vercel**

```bash
vercel link --yes
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel --prod
```

(Adicionar também para preview/development conforme necessário. Alternativa: skill `vercel:deploy`.)

- [ ] **Step 4: Smoke test em produção** — cadastro → onboarding → venda → dashboard → marcar recebido.

- [ ] **Step 5: Commit final**

```bash
git add -A && git commit -m "feat: manifest PWA e configuração de deploy"
```

---

## Verificação final contra a spec

- Fluxos 1-8 do PRD cobertos: onboarding (T9), venda (T10/11), dashboard (T12), recebimentos (T12), alteração de política (T13), cancelamento (T10/11), registro de recebimento (T10/12), histórico (navegação de mês no dashboard, T12)
- RN-001..RN-047: gate config (T8), snapshot por competência (T6/T9), sem delete físico (schema), estados derivados (T12), empty states (T11/12), <30s (form enxuto T11)
- Fora do MVP mantido fora: sem CRM, relatórios, billing, integrações
