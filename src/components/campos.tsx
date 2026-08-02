'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { mascaraValor, mascaraData, mascaraPercentual, mascaraInteiro } from '@/lib/format'

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
 * Rótulo, marca de opcional, apoio e erro em volta de um campo.
 *
 * O erro fica embaixo do campo que ele descreve, não só num toast: o aviso que
 * some sozinho obriga a adivinhar qual dos campos estava errado. O toast serve
 * para o que aconteceu longe da tela; erro de preenchimento é aqui.
 */
export function Campo({ rotulo, htmlFor, opcional, apoio, erro, children }: {
  rotulo: string
  htmlFor: string
  opcional?: boolean
  apoio?: string
  erro?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor} className={cn(erro && 'text-destructive')}>{rotulo}</Label>
        {opcional && <span className="text-xs text-muted-foreground">opcional</span>}
      </div>
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

/** Data no formato DD/MM/AAAA. */
export function CampoData({ value, onChange, placeholder = 'DD/MM/AAAA', className, ...rest }: Base) {
  return (
    <Input
      {...rest}
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(mascaraData(e.target.value))}
      className={cn('tabular-nums', className)}
    />
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
