import { cadastrar } from '../actions'
import { AuthMoldura } from '@/components/auth-moldura'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default async function CadastroPage(
  { searchParams }: { searchParams: Promise<{ erro?: string; aviso?: string }> },
) {
  const { erro, aviso } = await searchParams
  return (
    <AuthMoldura
      titulo={<>Nunca mais calcule<br />comissão no Excel.</>}
      apoio="Configure uma vez como seu escritório paga. O resto é comigo."
    >
      <form action={cadastrar} className="space-y-4">
        {erro && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
        )}
        {aviso && (
          <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">{aviso}</p>
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
        <Button type="submit" size="lg" className="h-12 w-full">
          Criar conta
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta? <Link className="font-medium text-primary hover:underline" href="/login">Entrar</Link>
        </p>
      </form>
    </AuthMoldura>
  )
}
