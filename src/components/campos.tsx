'use client'
import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendario } from '@/components/ui/calendario'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  mascaraValor, mascaraData, mascaraPercentual, mascaraInteiro, mascaraPorcentagem,
  dataBRParaISO, formatData,
} from '@/lib/format'

type Base = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  id?: string
  autoFocus?: boolean
  disabled?: boolean
  /* o Input já sabe se pintar de vermelho quando isto é verdadeiro; os campos
     com máscara só precisavam deixar a marca passar */
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/**
 * Rótulo, marca de obrigatório, apoio e erro em volta de um campo.
 *
 * Marca-se o que é obrigatório com asterisco, não o que é opcional com a
 * palavra. Nos formulários daqui a maioria dos campos é opcional, então a
 * marca de opcional aparecia em quase todas as linhas — muito ruído para
 * dizer o que já era o normal.
 *
 * O erro fica embaixo do campo que ele descreve, não só num toast: o aviso que
 * some sozinho obriga a adivinhar qual dos campos estava errado. O toast serve
 * para o que aconteceu longe da tela; erro de preenchimento é aqui.
 */
export function Campo({ rotulo, htmlFor, obrigatorio, apoio, erro, children }: {
  rotulo: string
  htmlFor: string
  obrigatorio?: boolean
  apoio?: string
  erro?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className={cn(erro && 'text-destructive')}>
        {/*
          Texto e asterisco no MESMO filho: o Label é flex com gap-2, então dois
          filhos separados nasceriam com oito pixels entre eles — o asterisco
          parecia de outro campo.

          E ele é decoração: quem usa leitor de tela ouve "obrigatório" do
          próprio campo, que continua com o atributo required.
        */}
        <span>
          {rotulo}
          {obrigatorio && <span aria-hidden className="ml-1 text-destructive">*</span>}
        </span>
      </Label>
      {children}
      {erro
        ? <p id={`${htmlFor}-erro`} role="alert" className="text-xs text-destructive">{erro}</p>
        : apoio && <p className="text-xs text-muted-foreground">{apoio}</p>}
    </div>
  )
}

/** Valor em reais: digita-se só números e a máscara monta a partir dos centavos. */
export function CampoValor({ value, onChange, placeholder = '0,00', className, ...rest }: Base) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        {...rest}
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(mascaraValor(e.target.value))}
        className={cn('pl-9 tabular-nums', className)}
      />
    </div>
  )
}

/**
 * Data no formato DD/MM/AAAA, com calendário ao lado.
 *
 * Digitar continua sendo o caminho rápido — quem sabe a data escreve seis
 * números e segue. O calendário é para quem precisa olhar: "sexta que vem" não
 * se digita. Um não substitui o outro, então os dois ficam no mesmo campo.
 */
export function CampoData({ value, onChange, placeholder = 'DD/MM/AAAA', className, ...rest }: Base) {
  const [aberto, setAberto] = useState(false)
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

  return (
    <div className="relative">
      <Input
        {...rest}
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(mascaraData(e.target.value))}
        className={cn('pr-11 tabular-nums', className)}
      />
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Escolher no calendário"
            disabled={rest.disabled}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground
                       transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none">
            <CalendarDays size={18} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end">
          <Calendario
            valor={dataBRParaISO(value) || null}
            hoje={hoje}
            onEscolher={escolhida => { onChange(formatData(escolhida)); setAberto(false) }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function CampoPercentual({ value, onChange, placeholder = '0,5', className, ...rest }: Base) {
  return (
    <div className="relative">
      <Input
        {...rest}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(mascaraPercentual(e.target.value))}
        className={cn('pr-7 tabular-nums', className)}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        %
      </span>
    </div>
  )
}

/**
 * Fatia de uma parcela, em porcentagem digitada direto — ver o porquê da
 * máscara própria em `mascaraPorcentagem`.
 */
export function CampoFatia({ value, onChange, placeholder = '0', className, ...rest }: Base) {
  return (
    <div className="relative">
      <Input
        {...rest}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(mascaraPorcentagem(e.target.value))}
        className={cn('pr-7 tabular-nums', className)}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        %
      </span>
    </div>
  )
}

export function CampoInteiro({ value, onChange, placeholder, className, ...rest }: Base) {
  return (
    <Input
      {...rest}
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(mascaraInteiro(e.target.value))}
      className={cn('tabular-nums', className)}
    />
  )
}
