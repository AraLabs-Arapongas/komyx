import { login } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Logo } from '@/components/logo'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <form action={login} className="w-full max-w-sm space-y-4 rounded-[10px] border bg-card p-6">
        <Logo className="mb-2" />
        <h1 className="text-xl font-semibold">Entrar</h1>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <div className="space-y-1"><Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" /></div>
        <div className="space-y-1"><Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required autoComplete="current-password" /></div>
        <label htmlFor="lembrar" className="flex cursor-pointer items-center gap-2 py-1 text-sm">
          <input id="lembrar" name="lembrar" type="checkbox" defaultChecked
            className="size-4 cursor-pointer accent-foreground" />
          Manter conectado neste dispositivo
        </label>
        <Button type="submit" className="w-full">Entrar</Button>
        <p className="text-sm text-muted-foreground">Ainda não tem conta?{' '}
          <Link className="underline" href="/cadastro">Criar conta</Link></p>
      </form>
    </main>
  )
}
