import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { pedirRecuperacao } from '../actions'
import { AuthMoldura } from '@/components/auth-moldura'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function RecuperarPage({ searchParams }: {
  searchParams: Promise<{ erro?: string; enviado?: string }>
}) {
  const { erro, enviado } = await searchParams

  return (
    <AuthMoldura
      titulo={<>Esqueceu<br />a senha?</>}
      apoio="A gente manda um link para você criar outra."
    >
      {enviado ? (
        /*
         * Confirmação sem prometer que o e-mail existe: "se houver conta".
         * Dizer "enviamos para você" a quem digitou o e-mail de outra pessoa
         * confirmaria que aquela pessoa é cliente — e esta tela é pública.
         */
        <div className="space-y-4">
          <p className="flex items-start gap-2.5 rounded-xl bg-money-soft px-3 py-3 text-sm">
            <MailCheck size={18} className="mt-0.5 shrink-0 text-money" />
            <span>
              <span className="font-medium">Se houver conta com esse e-mail, o link já está a caminho.</span>{' '}
              Ele vale por uma hora e serve uma vez só. Confira o spam.
            </span>
          </p>
          <Button asChild size="toque" className="w-full">
            <Link href="/login">Voltar para o login</Link>
          </Button>
        </div>
      ) : (
        <form action={pedirRecuperacao} className="space-y-4">
          {erro && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail da conta</Label>
            <Input id="email" name="email" type="email" required autoComplete="email"
              inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </div>
          <Button type="submit" size="toque" className="w-full">
            Enviar link
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Lembrou?{' '}
            <Link className="font-medium text-primary hover:underline" href="/login">Entrar</Link>
          </p>
        </form>
      )}
    </AuthMoldura>
  )
}
