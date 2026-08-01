import { cadastrar } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Logo } from '@/components/logo'

export default async function CadastroPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  return (
    <main className="flex min-h-dvh flex-col bg-escuro">
      <div className="flex flex-1 flex-col justify-center px-6 py-10 text-white">
        <div className="mx-auto w-full max-w-sm entra">
          <Logo className="[&_span]:text-white [&_rect:first-child]:fill-white [&_rect:not(:first-child)]:fill-[#06291F]" />
          <h1 className="mt-8 text-3xl font-bold leading-tight tracking-tight">
            Nunca mais calcule<br />comissão no Excel.
          </h1>
          <p className="mt-2 text-escuro-texto">
            Configure uma vez como seu escritório paga. O resto é comigo.
          </p>
        </div>
      </div>

      <form action={cadastrar}
        className="mx-auto w-full max-w-md space-y-4 rounded-t-3xl bg-background px-6 pb-10 pt-8">
        {erro && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" required autoComplete="name" className="h-12" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" className="h-12" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required
            autoComplete="new-password" className="h-12" />
        </div>
        <Button type="submit" size="lg" className="h-12 w-full bg-money text-white hover:bg-money/90">
          Criar conta
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta? <Link className="font-medium text-money hover:underline" href="/login">Entrar</Link>
        </p>
      </form>
    </main>
  )
}
