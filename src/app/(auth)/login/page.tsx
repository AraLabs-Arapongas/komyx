import { login } from '../actions'
import { AuthMoldura } from '@/components/auth-moldura'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { DevEntrarComo } from '@/components/dev-entrar-como'

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ erro?: string; volta?: string }>
}) {
  const { erro, volta } = await searchParams
  return (
    <AuthMoldura
      titulo={<>Seu dinheiro,<br />sem planilha.</>}
      apoio="Entre para ver quanto você tem a receber."
    >
      {/* poupa a chamada em produção; a recusa que vale é a do servidor, na
          própria action que lista as contas */}
      {process.env.NODE_ENV !== 'production' && <DevEntrarComo />}

      <form action={login} className="space-y-4">
        {/* preserva o destino de quem chegou por um link (convite de
            escritório): a action valida antes de redirecionar */}
        {volta && <input type="hidden" name="volta" value={volta} />}
        {erro && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email"
            inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required
            autoComplete="current-password" />
        </div>
        <label htmlFor="lembrar" className="flex cursor-pointer items-center gap-2 py-1 text-sm">
          <input id="lembrar" name="lembrar" type="checkbox" defaultChecked
            className="size-4 cursor-pointer accent-primary" />
          Manter conectado neste dispositivo
        </label>
        <Button type="submit" size="toque" className="w-full">
          Entrar
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta? <Link className="font-medium text-primary hover:underline" href={volta ? `/cadastro?volta=${encodeURIComponent(volta)}` : '/cadastro'}>Criar conta</Link>
        </p>
      </form>
    </AuthMoldura>
  )
}
