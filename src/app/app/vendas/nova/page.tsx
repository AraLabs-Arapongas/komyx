'use client'
import { VendaForm } from '@/components/venda-form'

export default function NovaVendaPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Nova venda</h1>
      <VendaForm />
    </div>
  )
}
