'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { atualizarPerfil, alterarSenha } from '@/lib/actions/perfil'
import { exportarDados } from '@/lib/actions/backup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, Upload, User } from 'lucide-react'
import { Secao } from '@/components/config-form'

export function PerfilForm({ email, nome: nomeInicial, telefone: telefoneInicial }: {
  email: string; nome: string; telefone: string
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [nome, setNome] = useState(nomeInicial)
  const [telefone, setTelefone] = useState(telefoneInicial)
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [trocandoSenha, setTrocandoSenha] = useState(false)

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoPerfil(true)
    const r = await atualizarPerfil({ nome, telefone })
    setSalvandoPerfil(false)
    if (!r.ok) { toast.error(r.erro); return }
    toast.success('Perfil atualizado.')
    qc.invalidateQueries({ queryKey: ['perfil'] })
    router.refresh()
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (novaSenha.length < 8) { toast.error('A senha precisa ter pelo menos 8 caracteres.'); return }
    if (novaSenha !== confirmarSenha) { toast.error('As senhas não conferem.'); return }
    setTrocandoSenha(true)
    const r = await alterarSenha(novaSenha)
    setTrocandoSenha(false)
    if (!r.ok) { toast.error(r.erro); return }
    setNovaSenha('')
    setConfirmarSenha('')
    toast.success('Senha alterada.')
  }

  return (
    <Secao titulo="Conta" apoio="Seus dados de acesso e contato." icone={User}>
      <form onSubmit={salvarPerfil} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input value={email} disabled />
          </div>
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 91234-5678" inputMode="tel" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Nome</Label>
          <Input value={nome} onChange={e => setNome(e.target.value)} required />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={salvandoPerfil}>
          {salvandoPerfil ? 'Salvando…' : 'Salvar perfil'}
        </Button>
      </form>

      <form onSubmit={trocarSenha} className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">Trocar senha</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Nova senha</Label>
            <Input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
              minLength={8} placeholder="Mínimo de 8 caracteres" required />
          </div>
          <div className="space-y-1">
            <Label>Confirmar senha</Label>
            <Input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)}
              minLength={8} required />
          </div>
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={trocandoSenha}>
          {trocandoSenha ? 'Alterando…' : 'Alterar senha'}
        </Button>
      </form>
    </Secao>
  )
}

type ResumoBackup = {
  vendas: number; clientes: number; comissoes: number
  recebimentos: number; competencias: number; configuracoes: number
}

const CHAVES_BACKUP = ['vendas', 'clientes', 'comissoes', 'recebimentos', 'competencias', 'configuracoes'] as const

/** Confere se o arquivo tem a cara de um backup do Komyx, sem gravar nada. */
function resumoDoArquivo(json: unknown): ResumoBackup | null {
  if (typeof json !== 'object' || json === null) return null
  const j = json as Record<string, unknown>
  if (!CHAVES_BACKUP.some(chave => Array.isArray(j[chave]))) return null
  const resumo = {} as ResumoBackup
  for (const chave of CHAVES_BACKUP) resumo[chave] = Array.isArray(j[chave]) ? (j[chave] as unknown[]).length : 0
  return resumo
}

export function BackupSecao() {
  const [baixando, setBaixando] = useState(false)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [erroImportacao, setErroImportacao] = useState('')
  const [resumo, setResumo] = useState<ResumoBackup | null>(null)

  async function baixarDados() {
    setBaixando(true)
    const r = await exportarDados()
    setBaixando(false)
    if (!r.ok) { toast.error(r.erro); return }
    const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    const blob = new Blob([JSON.stringify(r.dados, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `komyx-${hoje}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Seus dados foram baixados.')
  }

  async function lerArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setErroImportacao('')
    setResumo(null)
    setNomeArquivo(arquivo.name)
    try {
      const json = JSON.parse(await arquivo.text())
      const r = resumoDoArquivo(json)
      if (!r) { setErroImportacao('Este arquivo não parece ser um backup do Komyx.'); return }
      setResumo(r)
    } catch {
      setErroImportacao('Não foi possível ler este arquivo. Confirme que é um .json exportado pelo Komyx.')
    }
  }

  return (
    <Secao titulo="Backup" apoio="Seus dados são seus: baixe uma cópia quando quiser." icone={Download}>
      <div className="space-y-2">
        <p className="text-sm font-medium">Baixar meus dados</p>
        <p className="text-sm text-muted-foreground">
          Um arquivo .json com vendas, clientes, comissões, recebimentos e as suas regras de comissão.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={baixarDados} disabled={baixando}>
          <Download size={18} /> {baixando ? 'Preparando…' : 'Baixar meus dados'}
        </Button>
      </div>

      <div className="space-y-2 border-t pt-4">
        <p className="text-sm font-medium">Restaurar um backup</p>
        {/*
          Só lemos e validamos o arquivo aqui. Escrever de volta no banco fica
          para depois: restaurar exige decidir o que fazer com os dados que já
          existem na conta (mesclar pelo id? substituir tudo? o que fazer com
          vendas criadas depois do backup?) e essa regra ainda não foi definida
          com o produto. Gravar sem essa decisão arrisca duplicar ou apagar
          dados do corretor.
        */}
        <p className="text-sm text-muted-foreground">
          Por enquanto só conferimos o arquivo — a restauração ainda não está disponível.
        </p>
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted/40">
          <Upload size={18} /> Escolher arquivo
          <input type="file" accept="application/json" className="hidden" onChange={lerArquivo} />
        </label>
        {nomeArquivo && <p className="text-xs text-muted-foreground">{nomeArquivo}</p>}
        {erroImportacao && <p className="text-xs text-destructive">{erroImportacao}</p>}
        {resumo && (
          <div className="entra-suave rounded-lg bg-muted/40 p-3 text-sm">
            {resumo.vendas} vendas, {resumo.clientes} clientes, {resumo.configuracoes} configuração(ões)
            {resumo.comissoes > 0 && `, ${resumo.comissoes} comissões`}
            {resumo.recebimentos > 0 && `, ${resumo.recebimentos} recebimentos`}.
          </div>
        )}
      </div>
    </Secao>
  )
}
