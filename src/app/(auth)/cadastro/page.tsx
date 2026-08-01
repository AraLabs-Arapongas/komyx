import { cadastrar } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Logo } from '@/components/logo'

export default async function CadastroPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <form action={cadastrar} className="w-full max-w-sm space-y-4 rounded-[10px] border bg-card p-6">
        <Logo className="mb-2" />
        <h1 className="text-xl font-semibold">Criar conta</h1>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <p className="text-sm text-muted-foreground">
          Em poucos minutos você para de controlar comissão na planilha.
        </p>
        <div className="space-y-1"><Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" required autoComplete="name" /></div>
        <div className="space-y-1"><Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" /></div>
        <div className="space-y-1"><Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required autoComplete="current-password" /></div>
        <Button type="submit" className="w-full">Criar conta</Button>
        <p className="text-sm text-muted-foreground">Já tem conta?{' '}
          <Link className="underline" href="/login">Entrar</Link></p>
      </form>
    </main>
  )
}
