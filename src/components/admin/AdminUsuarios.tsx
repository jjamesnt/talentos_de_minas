import React, { useState, useRef, useMemo } from 'react';
import { 
  UserCheck, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Shield, 
  Search, 
  Phone, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Users,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Sparkles,
  Check
} from 'lucide-react';
import { useAdminUsuarios } from '../../hooks/useAdminUsuarios';
import { useToast } from '../../hooks/useToast';
import { ConfirmModal } from '../common/ConfirmModal';
import { Modal } from '../common/Modal';
import type { AdminUser, CargoUsuario } from '../../types';

const CARGOS_DISPONIVEIS: { valor: CargoUsuario; label: string; desc: string; cor: string }[] = [
  { 
    valor: 'Administrador', 
    label: 'Administrador Geral', 
    desc: 'Controle total da campanha, rifas, bailarinos e usuários',
    cor: 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10'
  },
  { 
    valor: 'Coordenação', 
    label: 'Coordenação Artística', 
    desc: 'Gestão de bailarinos, acompanhamento de metas e rankings',
    cor: 'border-[#00FF88] text-[#00FF88] bg-[#00FF88]/10'
  },
  { 
    valor: 'Operador', 
    label: 'Operador de Vendas', 
    desc: 'Baixa manual de números e atendimento de compras presenciais',
    cor: 'border-sky-400 text-sky-400 bg-sky-400/10'
  },
  { 
    valor: 'Financeiro', 
    label: 'Auditoria & Financeiro', 
    desc: 'Conferência de relatórios, exportação de CSV e conciliação Pix',
    cor: 'border-purple-400 text-purple-400 bg-purple-400/10'
  },
];

function gerarSenhaAleatoria(): string {
  const prefixos = ['Wicked', 'Talentos', 'Oz2026', 'Ballet', 'Minas'];
  const simbolos = ['@', '#', '$', '!'];
  const prefixo = prefixos[Math.floor(Math.random() * prefixos.length)];
  const simbolo = simbolos[Math.floor(Math.random() * simbolos.length)];
  const numero = Math.floor(100 + Math.random() * 900);
  return `${prefixo}${simbolo}${numero}`;
}

export const AdminUsuarios: React.FC = () => {
  const { 
    usuarios, 
    loading, 
    adicionarUsuario, 
    editarUsuario, 
    redefinirSenha,
    excluirUsuario, 
    alternarStatus 
  } = useAdminUsuarios();
  const { showToast } = useToast();

  const formRef = useRef<HTMLDivElement>(null);

  // Estados do formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState<CargoUsuario>('Operador');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtros de busca e cargo
  const [busca, setBusca] = useState('');
  const [filtroCargo, setFiltroCargo] = useState<string>('todos');

  // Modais de confirmação e ações
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal rápido de redefinição de senha
  const [usuarioParaTrocarSenha, setUsuarioParaTrocarSenha] = useState<AdminUser | null>(null);
  const [novaSenhaRapida, setNovaSenhaRapida] = useState('');
  const [mostrarNovaSenhaRapida, setMostrarNovaSenhaRapida] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Feedback de credenciais copiadas
  const [idCopiado, setIdCopiado] = useState<string | null>(null);

  // Visibilidade de senha por linha na tabela (por padrão ocultas)
  const [senhasVisiveis, setSenhasVisiveis] = useState<Record<string, boolean>>({});

  const toggleVisibilidadeSenha = (id: string) => {
    setSenhasVisiveis((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const matchBusca = 
        busca.trim() === '' ||
        u.nome.toLowerCase().includes(busca.toLowerCase()) ||
        u.email.toLowerCase().includes(busca.toLowerCase()) ||
        (u.telefone && u.telefone.includes(busca));
      const matchCargo = filtroCargo === 'todos' || u.cargo === filtroCargo;
      return matchBusca && matchCargo;
    });
  }, [usuarios, busca, filtroCargo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !email.trim()) {
      showToast({
        type: 'warning',
        title: 'Campos Obrigatórios',
        message: 'Preencha o nome completo e o e-mail do usuário.',
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast({
        type: 'warning',
        title: 'E-mail Inválido',
        message: 'Informe um endereço de e-mail válido.',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (editandoId) {
        await editarUsuario(editandoId, {
          nome,
          email,
          cargo,
          telefone,
          ...(senha.trim() ? { senha: senha.trim() } : {}),
        });

        showToast({
          type: 'success',
          title: 'Usuário Atualizado',
          message: `Os dados ${senha.trim() ? 'e a senha ' : ''}de "${nome}" foram atualizados com sucesso.`,
        });
        cancelarEdicao();
      } else {
        const senhaDefinida = senha.trim() || 'wicked2026';
        await adicionarUsuario({
          nome,
          email,
          cargo,
          telefone,
          senha: senhaDefinida,
        });

        showToast({
          type: 'success',
          title: 'Usuário Cadastrado',
          message: `"${nome}" cadastrado(a) com sucesso! Senha: ${senhaDefinida}`,
          duration: 6000,
        });

        setNome('');
        setEmail('');
        setCargo('Operador');
        setTelefone('');
        setSenha('');
      }
    } catch (err: any) {
      console.error(err);
      const msgErro = err?.message?.includes('duplicate key') || err?.code === '23505'
        ? 'Já existe um usuário cadastrado com este endereço de e-mail.'
        : 'Não foi possível salvar o usuário. Tente novamente.';

      showToast({
        type: 'error',
        title: 'Erro ao Salvar',
        message: msgErro,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const iniciarEdicao = (u: AdminUser) => {
    setEditandoId(u.id);
    setNome(u.nome);
    setEmail(u.email);
    setCargo(u.cargo);
    setTelefone(u.telefone || '');
    setSenha(''); // Deixa vazio para só alterar caso o usuário queira

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNome('');
    setEmail('');
    setCargo('Operador');
    setTelefone('');
    setSenha('');
  };

  const confirmarExclusao = async () => {
    if (!usuarioParaExcluir) return;

    try {
      setIsDeleting(true);
      await excluirUsuario(usuarioParaExcluir.id);
      showToast({
        type: 'info',
        title: 'Usuário Removido',
        message: `O acesso de "${usuarioParaExcluir.nome}" foi excluído.`,
      });
      setUsuarioParaExcluir(null);
    } catch (err) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Erro na Exclusão',
        message: 'Não foi possível excluir o usuário.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSalvarNovaSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioParaTrocarSenha || !novaSenhaRapida.trim()) return;

    try {
      setIsSavingPassword(true);
      await redefinirSenha(usuarioParaTrocarSenha.id, novaSenhaRapida.trim());
      showToast({
        type: 'success',
        title: 'Senha Redefinida',
        message: `Nova senha de "${usuarioParaTrocarSenha.nome}" salva com sucesso!`,
      });
      setUsuarioParaTrocarSenha(null);
      setNovaSenhaRapida('');
    } catch (err) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Erro ao Redefinir',
        message: 'Não foi possível alterar a senha.',
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const copiarAcesso = (u: AdminUser) => {
    const texto = `🎭 *Talentos de Minas • Acesso ao Painel Wicked 2026*\n\nOlá, *${u.nome}*! Seu acesso ao sistema operacional da campanha foi configurado:\n\n🌐 *Painel:* ${window.location.origin}\n✉️ *E-mail:* ${u.email}\n🔑 *Senha de Acesso:* ${u.senha || 'wicked2026'}\n🛡️ *Função:* ${u.cargo}\n\nGuarde com segurança!`;

    navigator.clipboard.writeText(texto);
    setIdCopiado(u.id);
    showToast({
      type: 'success',
      title: 'Credenciais Copiadas',
      message: `Dados de acesso de ${u.nome.split(' ')[0]} copiados para envio no WhatsApp.`,
    });
    setTimeout(() => setIdCopiado(null), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Formulário de Cadastro / Edição */}
      <div
        ref={formRef}
        className={`p-5 sm:p-7 rounded-2xl border transition-all duration-300 ${
          editandoId
            ? 'bg-[#0F3D2A]/30 border-[#00FF88]/60 shadow-2xl ring-1 ring-[#00FF88]/40'
            : 'glass-card border-white/10'
        }`}
      >
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl ${editandoId ? 'bg-[#00FF88] text-black' : 'bg-white/5 text-[#00FF88]'}`}>
              {editandoId ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-cinzel text-base sm:text-lg font-bold text-white">
                {editandoId ? `Editando Usuário: ${nome || 'Sem nome'}` : 'Cadastrar Novo Usuário da Equipe'}
              </h3>
              <p className="text-xs text-slate-400">
                {editandoId 
                  ? 'Atualize os dados de acesso, função ou defina uma nova senha para o colaborador.' 
                  : 'Adicione membros da coordenação, administração ou operadores do sistema com senha individual.'}
              </p>
            </div>
          </div>

          {editandoId && (
            <span className="hidden sm:inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 animate-pulse">
              Modo Edição Ativo
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Ana Clara Souza"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88] transition-colors"
              />
            </div>

            {/* E-mail de Acesso */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#00FF88]" />
                <span>E-mail de Login *</span>
              </label>
              <input
                type="email"
                required
                placeholder="exemplo@talentosdeminas.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88] transition-colors"
              />
            </div>

            {/* Telefone / WhatsApp */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>WhatsApp com DDD</span>
              </label>
              <input
                type="tel"
                placeholder="(31) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88] transition-colors"
              />
            </div>

            {/* Senha de Acesso ao Painel */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#00FF88]" />
                  <span>Senha de Acesso</span>
                </label>
                <button
                  type="button"
                  onClick={() => setSenha(gerarSenhaAleatoria())}
                  className="text-[11px] text-[#00FF88] hover:underline flex items-center gap-1 cursor-pointer"
                  title="Gerar senha aleatória segura"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Gerar</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder={editandoId ? '(Manter a atual)' : 'Padrão: wicked2026'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-xs sm:text-sm bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Seleção do Cargo / Função */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#00FF88]" />
              <span>Função & Nível de Permissão *</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CARGOS_DISPONIVEIS.map((c) => {
                const isSelected = cargo === c.valor;
                return (
                  <button
                    key={c.valor}
                    type="button"
                    onClick={() => setCargo(c.valor)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${c.cor} shadow-[0_0_15px_rgba(0,255,136,0.15)] ring-1 ring-current`
                        : 'bg-black/40 border-white/10 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{c.label}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                        {c.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-white/10">
            {editandoId && (
              <button
                type="button"
                onClick={cancelarEdicao}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar Edição
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-7 py-3 rounded-xl font-cinzel text-xs font-bold text-black bg-[#00FF88] hover:bg-[#33ff9f] glow-oz transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {editandoId ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Criar Novo Usuário</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Lista / Gerenciamento dos Usuários */}
      <div className="rounded-2xl glass-card border border-white/10 overflow-hidden space-y-4 p-4 sm:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00FF88]" />
              <span>Usuários da Equipe ({usuarios.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Gerencie acessos, atribua funções, visualize senhas e acompanhe os colaboradores autorizados.
            </p>
          </div>

          {/* Barra de Busca e Filtros */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88]"
              />
            </div>

            <div className="relative">
              <select
                value={filtroCargo}
                onChange={(e) => setFiltroCargo(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-black/40 border border-white/10 text-slate-300 focus:outline-none focus:border-[#00FF88] cursor-pointer"
              >
                <option value="todos">Todos os Cargos</option>
                <option value="Administrador">Administrador</option>
                <option value="Coordenação">Coordenação</option>
                <option value="Operador">Operador</option>
                <option value="Financeiro">Financeiro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-black/40 text-slate-400 uppercase tracking-wider text-[11px] border-b border-white/5">
              <tr>
                <th className="px-4 sm:px-6 py-3">Colaborador</th>
                <th className="px-4 sm:px-6 py-3">Cargo / Função</th>
                <th className="px-4 sm:px-6 py-3 hidden md:table-cell">Contato</th>
                <th className="px-4 sm:px-6 py-3">Senha Atual</th>
                <th className="px-4 sm:px-6 py-3">Status</th>
                <th className="px-4 sm:px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 sm:px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#00FF88]" />
                      <span className="text-xs">Carregando usuários da equipe...</span>
                    </div>
                  </td>
                </tr>
              ) : usuariosFiltrados.length > 0 ? (
                usuariosFiltrados.map((u) => {
                  const cargoConfig = CARGOS_DISPONIVEIS.find((c) => c.valor === u.cargo);
                  const iniciais = (u.nome || '')
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((n) => n[0] || '')
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'U';

                  return (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      {/* Nome e Avatar */}
                      <td className="px-4 sm:px-6 py-3.5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F3D2A] to-[#141E18] border border-white/10 flex items-center justify-center font-bold text-xs text-[#00FF88] shadow-sm shrink-0">
                          {iniciais}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-white block truncate">{u.nome}</span>
                          <span className="text-[11px] text-slate-400 block truncate">{u.email}</span>
                        </div>
                      </td>

                      {/* Cargo */}
                      <td className="px-4 sm:px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            cargoConfig ? cargoConfig.cor : 'border-white/10 text-white'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{u.cargo}</span>
                        </span>
                      </td>

                      {/* Contato */}
                      <td className="px-4 sm:px-6 py-3.5 hidden md:table-cell text-slate-400">
                        {u.telefone || '—'}
                      </td>

                      {/* Senha com Botão de Revelar/Ocultar e Alteração */}
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          {/* Botão de Olho na frente da senha */}
                          <button
                            type="button"
                            onClick={() => toggleVisibilidadeSenha(u.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-[#00FF88] border border-white/10 transition-colors cursor-pointer"
                            title={senhasVisiveis[u.id] ? "Ocultar senha" : "Ver senha"}
                          >
                            {senhasVisiveis[u.id] ? (
                              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <code className="px-2.5 py-1 rounded bg-black/60 border border-white/10 text-[#00FF88] font-mono text-[11px] min-w-[70px] text-center tracking-wider select-all">
                            {senhasVisiveis[u.id] ? (u.senha || 'wicked2026') : '••••••••'}
                          </code>

                          <button
                            type="button"
                            onClick={() => {
                              setUsuarioParaTrocarSenha(u);
                              setNovaSenhaRapida('');
                              setMostrarNovaSenhaRapida(false);
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-[#00FF88] border border-white/10 transition-colors cursor-pointer"
                            title="Trocar senha deste usuário"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Status com Toggle */}
                      <td className="px-4 sm:px-6 py-3.5">
                        <button
                          type="button"
                          onClick={() => alternarStatus(u.id, u.ativo)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                            u.ativo
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                          title={`Clique para ${u.ativo ? 'inativar' : 'ativar'}`}
                        >
                          {u.ativo ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          <span>{u.ativo ? 'Ativo' : 'Inativo'}</span>
                        </button>
                      </td>

                      {/* Ações: Copiar Acesso, Editar e Excluir */}
                      <td className="px-4 sm:px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => copiarAcesso(u)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-[#00FF88]/20 text-slate-300 hover:text-[#00FF88] border border-white/10 transition-colors cursor-pointer"
                            title="Copiar mensagem com credenciais para enviar ao colaborador"
                          >
                            {idCopiado === u.id ? <Check className="w-4 h-4 text-[#00FF88]" /> : <Copy className="w-4 h-4" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => iniciarEdicao(u)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-[#00FF88]/20 text-slate-300 hover:text-[#00FF88] border border-white/10 transition-colors cursor-pointer"
                            title="Editar dados e cargo"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setUsuarioParaExcluir(u)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors cursor-pointer"
                            title="Excluir usuário permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 sm:px-6 py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-3">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-white text-sm mb-1">
                        {busca || filtroCargo !== 'todos' ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {busca || filtroCargo !== 'todos'
                          ? 'Tente ajustar os termos de busca ou filtros aplicados.'
                          : 'Use o formulário acima para cadastrar os administradores, coordenadores e operadores da campanha.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Rápido para Troca de Senha */}
      {usuarioParaTrocarSenha && (
        <Modal
          isOpen={true}
          onClose={() => setUsuarioParaTrocarSenha(null)}
          title={`Redefinir Senha • ${usuarioParaTrocarSenha.nome}`}
          maxWidth="sm"
        >
          <form onSubmit={handleSalvarNovaSenha} className="space-y-4 py-2">
            <p className="text-xs text-slate-300">
              Defina uma nova senha para o acesso de <strong className="text-white">{usuarioParaTrocarSenha.email}</strong>.
            </p>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Nova Senha</label>
                <button
                  type="button"
                  onClick={() => setNovaSenhaRapida(gerarSenhaAleatoria())}
                  className="text-[11px] text-[#00FF88] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Gerar Senha</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={mostrarNovaSenhaRapida ? 'text' : 'password'}
                  required
                  placeholder="Digite a nova senha"
                  value={novaSenhaRapida}
                  onChange={(e) => setNovaSenhaRapida(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88]"
                />
                <button
                  type="button"
                  onClick={() => setMostrarNovaSenhaRapida(!mostrarNovaSenhaRapida)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {mostrarNovaSenhaRapida ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUsuarioParaTrocarSenha(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingPassword || !novaSenhaRapida.trim()}
                className="px-5 py-2 rounded-xl font-cinzel text-xs font-bold text-black bg-[#00FF88] hover:bg-[#33ff9f] glow-oz transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingPassword ? 'Salvando...' : 'Salvar Nova Senha'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Confirmação para Exclusão Definitiva */}
      <ConfirmModal
        isOpen={usuarioParaExcluir !== null}
        onClose={() => setUsuarioParaExcluir(null)}
        onConfirm={confirmarExclusao}
        title="Excluir Usuário"
        message={`Deseja realmente remover o usuário "${usuarioParaExcluir?.nome}" (${usuarioParaExcluir?.email})? Ele perderá imediatamente qualquer permissão de acesso ao painel.`}
        confirmLabel="Sim, Excluir Usuário"
        cancelLabel="Cancelar"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};
