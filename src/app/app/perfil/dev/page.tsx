import { notFound } from 'next/navigation'
import { MenuDev } from '@/components/menu-dev'
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina'

export default function DevPage() {
  // em produção a rota não existe; as actions recusam de novo do lado do servidor
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <div className="space-y-4">
      <CabecalhoPagina voltarPara="/app/perfil" titulo="Desenvolvimento"
        apoio="Refazer o onboarding e pré-visualizar telas sem gravar nada." />
      <MenuDev />
    </div>
  )
}
