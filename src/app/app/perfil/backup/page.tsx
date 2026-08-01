import { BackupSecao } from '@/components/perfil-form'
import { Voltar } from '@/components/voltar'

export default function BackupPage() {
  return (
    <div className="space-y-4">
      {/* sem h1: o cartão do BackupSecao já abre com o próprio título */}
      <Voltar href="/app/perfil" />
      <BackupSecao />
    </div>
  )
}
