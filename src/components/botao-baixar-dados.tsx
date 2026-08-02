'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportarDados } from '@/lib/actions/backup'
import { cn } from '@/lib/utils'

/**
 * Baixar tudo em um arquivo.
 *
 * Vive fora da tela de Backup porque aparece também no portão de fim de teste,
 * e é ali que ele mais importa: quem decidiu não assinar precisa sair com os
 * dados dele sem antes ter que pagar para chegar até a tela de exportação.
 * "Seus dados são seus" é promessa da landing, e promessa que só vale para
 * cliente pagante não vale nada.
 */
export function BotaoBaixarDados({ variant = 'default', className }: {
  variant?: 'default' | 'outline'
  className?: string
}) {
  const [baixando, setBaixando] = useState(false)

  async function baixar() {
    setBaixando(true)
    const r = await exportarDados()
    setBaixando(false)
    if (!r.ok) { toast.error(r.erro); return }
    const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    const blob = new Blob([JSON.stringify(r.dados, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `komyx-${hoje}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Seus dados foram baixados.')
  }

  return (
    <Button type="button" variant={variant} size="toque" onClick={baixar} disabled={baixando}
      className={cn('w-full', className)}>
      <Download size={18} /> {baixando ? 'Preparando…' : 'Baixar meus dados'}
    </Button>
  )
}
