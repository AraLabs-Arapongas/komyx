import { notFound } from 'next/navigation'
import { MenuDev } from '@/components/menu-dev'
import { Voltar } from '@/components/voltar'

export default function DevPage() {
  // em produção a rota não existe; as actions recusam de novo do lado do servidor
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <div className="space-y-4">
      <Voltar href="/app/perfil" />
      <h1 className="text-xl font-semibold">Desenvolvimento</h1>
      <MenuDev />
    </div>
  )
}
