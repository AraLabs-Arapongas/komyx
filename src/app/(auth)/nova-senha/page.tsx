import Link from 'next/link'
import { definirNovaSenha } from '../actions'
import { createClient } from '@/lib/supabase/server'
import { AuthMoldura } from '@/components/auth-moldura'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function NovaSenhaPage({ searchParams }: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams

  /*
   * Quem chega aqui sem sessão veio pela URL, não pelo link do e-mail — ou o
   * link já venceu. Mostrar o formulário nesse caso seria enganoso: ele
   * preencheria duas senhas para o Supabase recusar no fim.
   */
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <AuthMoldura titulo={<>Link<br />vencido.</>} apoio="Peça outro, leva um minuto.">
        <div className="space-y-4">
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Este link não vale mais. Eles duram uma hora e servem uma vez só.
          </p>
          <Button asChild size="toque" className="w-full">
            <Link href="/recuperar">Pedir um link novo</Link>
          </Button>
        </div>
      </AuthMoldura>
    )
  }

  return (
    <AuthMoldura
      titulo={<>Crie uma<br />senha nova.</>}
      apoio={`Você está entrando como ${user.email}.`}
    >
      <form action={definirNovaSenha} className="space-y-4">
        {erro && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="password">Nova senha</Label>
          <Input id="password" name="password" type="password" required minLength={6}
            autoComplete="new-password" autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password2">Repita a senha</Label>
          {/* duas vezes porque não há como conferir depois: errar aqui em
              silêncio tranca a pessoa fora da conta que ela acabou de destravar */}
          <Input id="password2" name="password2" type="password" required minLength={6}
            autoComplete="new-password" />
        </div>
        <Button type="submit" size="toque" className="w-full">
          Salvar e entrar
        </Button>
      </form>
    </AuthMoldura>
  )
}
