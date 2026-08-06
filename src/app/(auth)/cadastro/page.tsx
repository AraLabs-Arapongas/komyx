import { cadastrar } from '../actions'
import { AuthMoldura } from '@/components/auth-moldura'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default async function CadastroPage(
  { searchParams }: { searchParams: Promise<{ erro?: string; aviso?: string; volta?: string }> },
) {
  const { erro, aviso, volta } = await searchParams
  return (
    <AuthMoldura
      titulo={<>Nunca mais calcule<br />comissão no Excel.</>}
      apoio="Configure uma vez como seu escritório paga. O resto é comigo."
    >
      <form action={cadastrar} className="space-y-4">
        {volta && <input type="hidden" name="volta" value={volta} />}
        {erro && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
        )}
        {aviso && (
          <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">{aviso}</p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" required autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          {/* autoCapitalize/autoCorrect: no celular o teclado sobe a primeira
              letra e sugere correção, e a sugestão vem com espaço no fim. */}
          <Input id="email" name="email" type="email" required autoComplete="email"
            inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required
            autoComplete="new-password" />
        </div>
        <Button type="submit" size="toque" className="w-full">
          Criar conta
        </Button>
        {/* aceite junto do botão, e não numa caixinha a mais para marcar: o
            que a lei pede é que a pessoa tenha acesso ao texto antes de
            contratar, e um passo extra aqui só treina todo mundo a clicar sem
            ler */}
        <p className="text-center text-xs text-muted-foreground">
          Ao criar a conta você concorda com os{' '}
          <Link className="underline underline-offset-2 hover:text-foreground" href="/termos">Termos de Uso</Link>{' '}
          e a{' '}
          <Link className="underline underline-offset-2 hover:text-foreground" href="/privacidade">Política de Privacidade</Link>.
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta? <Link className="font-medium text-primary hover:underline" href={volta ? `/login?volta=${encodeURIComponent(volta)}` : '/login'}>Entrar</Link>
        </p>
      </form>
    </AuthMoldura>
  )
}
