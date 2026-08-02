import { login } from '../actions'
import { AuthMoldura } from '@/components/auth-moldura'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  return (
    <AuthMoldura
      titulo={<>Seu dinheiro,<br />sem planilha.</>}
      apoio="Entre para ver quanto você tem a receber."
    >
      <form action={login} className="space-y-4">
        {erro && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email"
            inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            className="h-12" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required
            autoComplete="current-password" className="h-12" />
        </div>
        <label htmlFor="lembrar" className="flex cursor-pointer items-center gap-2 py-1 text-sm">
          <input id="lembrar" name="lembrar" type="checkbox" defaultChecked
            className="size-4 cursor-pointer accent-primary" />
          Manter conectado neste dispositivo
        </label>
        <Button type="submit" size="lg" className="h-12 w-full">
          Entrar
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta? <Link className="font-medium text-primary hover:underline" href="/cadastro">Criar conta</Link>
        </p>
      </form>
    </AuthMoldura>
  )
}
