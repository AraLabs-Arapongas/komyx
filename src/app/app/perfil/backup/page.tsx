import { BackupSecao } from '@/components/perfil-form'
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina'

export default function BackupPage() {
  return (
    <div className="space-y-4">
      <CabecalhoPagina voltarPara="/app/perfil" titulo="Backup"
        apoio="Seus dados são seus: baixe uma cópia quando quiser." />
      <BackupSecao />
    </div>
  )
}
