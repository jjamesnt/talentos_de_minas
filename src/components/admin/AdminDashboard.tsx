import React, { useState, useEffect, useCallback } from 'react';
import { useCampanha } from '../../hooks/useCampanha';
import { useAdminUsuarios } from '../../hooks/useAdminUsuarios';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import { AdminBailarinos } from './AdminBailarinos';
import { AdminPremios } from './AdminPremios';
import { AdminRifa } from './AdminRifa';
import { AdminLoja } from './AdminLoja';
import { AdminFinanceiro } from './AdminFinanceiro';
import { AdminUsuarios } from './AdminUsuarios';
import { AdminConfigCampanha } from './AdminConfigCampanha';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { 
  LayoutDashboard, 
  Users, 
  Ticket, 
  ShoppingBag,
  Wallet,
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  UserCog, 
  Coins, 
  Edit3, 
  Check, 
  X, 
  Loader2,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Gift,
  Sliders
} from 'lucide-react';

import logoTalentos from '../../assets/logo_talentos.webp';
import { ConfirmModal } from '../common/ConfirmModal';

export const AdminDashboard: React.FC<{ 
  onVoltarAoSite: () => void;
  onLogout?: () => void;
}> = ({ onVoltarAoSite, onLogout }) => {
  const [abaAtiva, setAbaAtiva] = useState<'kpi' | 'configuracoes' | 'bailarinos' | 'premios' | 'rifa' | 'loja' | 'financeiro' | 'usuarios'>('kpi');
  const { 
    totalArrecadado, 
    totalCotasVendidas, 
    bailarinos, 
    premios, 
    precoPorCota, 
    atualizarPrecoPorCota,
    totalCotas,
    combosPromocionais,
    metaArrecadacaoCustom
  } = useCampanha();
  const { usuarios } = useAdminUsuarios();
  const { showToast } = useToast();

  const [editandoPreco, setEditandoPreco] = useState(false);
  const [novoPrecoInput, setNovoPrecoInput] = useState(String(precoPorCota));
  const [salvandoPreco, setSalvandoPreco] = useState(false);

  const [pedidosRecentes, setPedidosRecentes] = useState<any[]>([]);
  const [carregandoPedidos, setCarregandoPedidos] = useState(false);

  const carregarPedidos = useCallback(async () => {
    try {
      setCarregandoPedidos(true);

      // Auto-expira pedidos pendentes vencidos no banco de dados
      try {
        await supabase.rpc('expirar_pedidos_vencidos');
      } catch (_) {}

      // 1. Busca últimos pedidos pagos da Rifa (Cotas)
      const { data: dadosCotas } = await supabase
        .from('raffle_orders')
        .select('*')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(20);

      // 2. Busca últimos pedidos pagos da Loja Oficial
      const { data: dadosLoja } = await supabase
        .from('loja_orders')
        .select('*')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(20);

      const cotasFormatadas = (dadosCotas || []).map((p: any) => ({
        id: `cota-${p.id}`,
        tipo: 'cota' as const,
        customer_name: p.customer_name || 'Apoiador',
        customer_contact: p.customer_phone || p.customer_email || '',
        detalhes: Array.isArray(p.selected_numbers) && p.selected_numbers.length > 0
          ? p.selected_numbers.map((n: number) => `#${n}`).join(', ')
          : 'Cotas da Campanha',
        valor: Number(p.total_price) || 0,
        mp_payment_id: p.mp_payment_id,
        payment_origin: p.payment_origin,
        created_at: p.created_at,
      }));

      const lojaFormatadas = (dadosLoja || []).map((p: any) => ({
        id: `loja-${p.id}`,
        tipo: 'loja' as const,
        customer_name: p.customer_name || 'Comprador',
        customer_contact: p.customer_phone || p.customer_email || '',
        detalhes: `${p.quantidade || 1}x ${p.produto_nome || 'Produto'}${p.tamanho ? ` (${p.tamanho})` : ''}`,
        valor: Number(p.total_price) || 0,
        mp_payment_id: p.mp_payment_id,
        payment_origin: p.payment_origin,
        created_at: p.created_at,
      }));

      // Combina e ordena os confirmados do mais recente ao mais antigo
      const consolidados = [...cotasFormatadas, ...lojaFormatadas]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15);

      setPedidosRecentes(consolidados);
    } catch (err) {
      console.error('Erro ao buscar pedidos no painel:', err);
    } finally {
      setCarregandoPedidos(false);
    }
  }, []);

  useEffect(() => {
    carregarPedidos();

    const canalRifa = supabase
      .channel('admin_realtime_orders_rifa')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'raffle_orders' }, () => {
        carregarPedidos();
      })
      .subscribe();

    const canalLoja = supabase
      .channel('admin_realtime_orders_loja')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loja_orders' }, () => {
        carregarPedidos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalRifa);
      supabase.removeChannel(canalLoja);
    };
  }, [carregarPedidos]);

  const cotasDisponiveis = Math.max(0, totalCotas - totalCotasVendidas);
  const metaTotal = metaArrecadacaoCustom || (totalCotas * precoPorCota);

  const handleSalvarPreco = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(novoPrecoInput.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      showToast({
        type: 'warning',
        title: 'Valor Inválido',
        message: 'Informe um valor numérico válido maior que zero (ex: 25).',
      });
      return;
    }

    try {
      setSalvandoPreco(true);
      await atualizarPrecoPorCota(val);
      showToast({
        type: 'success',
        title: 'Preço Atualizado!',
        message: `O valor por cota foi alterado para R$ ${val},00 em todo o sistema.`,
      });
      setEditandoPreco(false);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao Salvar',
        message: err?.message || 'Não foi possível atualizar o preço.',
      });
    } finally {
      setSalvandoPreco(false);
    }
  };

  const [confirmarVoltarSite, setConfirmarVoltarSite] = useState(false);
  const [confirmarLogout, setConfirmarLogout] = useState(false);

  const [usuarioLogado] = useState<{ nome: string; email: string; cargo: string } | null>(() => {
    try {
      const raw = localStorage.getItem('admin_usuario_atual');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const executarLogout = () => {
    setConfirmarLogout(false);
    sessionStorage.removeItem('talentos_admin_authenticated');
    localStorage.removeItem('admin_usuario_atual');
    if (onLogout) {
      onLogout();
    } else {
      onVoltarAoSite();
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-100 flex flex-col">
      {/* Header Administrativo */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-2">
          {/* Logo Clicável com Confirmação */}
          <button
            type="button"
            onClick={() => setConfirmarVoltarSite(true)}
            className="flex items-center gap-3 min-w-0 text-left hover:opacity-90 transition-all cursor-pointer group rounded-xl p-1 -ml-1 focus:outline-none focus:ring-1 focus:ring-[#00FF88]/40"
            title="Ir para a página pública da campanha"
          >
            <img
              src={logoTalentos}
              alt="Talentos de Minas"
              className="h-7 sm:h-8 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
              width={140}
              height={32}
            />
            <div className="min-w-0 border-l border-white/10 pl-3">
              <h1 className="font-cinzel text-xs sm:text-sm font-bold text-white leading-tight truncate group-hover:text-[#00FF88] transition-colors">
                Painel Wicked 2026
              </h1>
              <p className="text-[10px] text-[#D4AF37] truncate flex items-center gap-1.5">
                <span>Gestão Operacional</span>
                <span className="text-[9px] text-slate-400 opacity-70 group-hover:opacity-100 transition-opacity hidden sm:inline">
                  • Ir ao site ↗
                </span>
              </p>
            </div>
          </button>

          {/* Ações do Topo: Usuário, Voltar ao Hotsite e Sair */}
          <div className="flex items-center gap-2 shrink-0">
            {usuarioLogado && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                <div className="w-6 h-6 rounded-lg bg-[#00FF88]/20 text-[#00FF88] flex items-center justify-center font-bold text-[10px]">
                  {usuarioLogado.nome ? usuarioLogado.nome.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-bold text-white leading-tight truncate max-w-[130px]">
                    {usuarioLogado.nome}
                  </p>
                  <p className="text-[9px] text-slate-400 leading-tight truncate max-w-[130px]">
                    {usuarioLogado.cargo || 'Admin'}
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setConfirmarVoltarSite(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer"
              title="Voltar para a página pública da campanha"
            >
              <ArrowLeft className="w-4 h-4 text-[#00FF88]" />
              <span className="hidden xs:inline">Voltar ao Hotsite</span>
              <span className="xs:hidden">Site</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmarLogout(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow-rose-950/40"
              title="Encerrar sessão no painel administrativo"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Abas de Navegação com Rolagem Touch */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 sm:gap-2 border-t border-white/5 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setAbaAtiva('kpi')}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              abaAtiva === 'kpi'
                ? 'border-[#00FF88] text-[#00FF88]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Visão Geral
          </button>

          <button
            onClick={() => setAbaAtiva('configuracoes')}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              abaAtiva === 'configuracoes'
                ? 'border-[#00FF88] text-[#00FF88]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0 text-[#D4AF37]" />
            Configurações & Metas
          </button>

          <button
            onClick={() => setAbaAtiva('bailarinos')}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              abaAtiva === 'bailarinos'
                ? 'border-[#00FF88] text-[#00FF88]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            Bailarinos ({bailarinos.length})
          </button>

          <button
            onClick={() => setAbaAtiva('premios')}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              abaAtiva === 'premios'
                ? 'border-[#00FF88] text-[#00FF88]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gift className="w-4 h-4 shrink-0 text-[#D4AF37]" />
            Prêmios ({premios.length})
          </button>

          <button
            onClick={() => setAbaAtiva('rifa')}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              abaAtiva === 'rifa'
                ? 'border-[#00FF88] text-[#00FF88]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Ticket className="w-4 h-4 shrink-0" />
            Pedidos & Cotas ({totalCotas})
          </button>

          <button
            onClick={() => setAbaAtiva('loja')}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              abaAtiva === 'loja'
                ? 'border-[#00FF88] text-[#00FF88]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0 text-[#FF007F]" />
            Loja & Pedidos
          </button>

          <button
            onClick={() => setAbaAtiva('financeiro')}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              abaAtiva === 'financeiro'
                ? 'border-[#00FF88] text-[#00FF88]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4 shrink-0 text-[#00FF88]" />
            Financeiro
          </button>

          <button
            onClick={() => setAbaAtiva('usuarios')}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              abaAtiva === 'usuarios'
                ? 'border-[#00FF88] text-[#00FF88]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCog className="w-4 h-4 shrink-0" />
            Controle de Usuários ({usuarios.length})
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1">
        {abaAtiva === 'kpi' && (
          <div className="space-y-8">
            {/* Cards de Métricas Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
              {/* Card 1: Total Arrecadado */}
              <div className="p-5 rounded-2xl glass-card border border-white/10">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Total Arrecadado</span>
                  <DollarSign className="w-4 h-4 text-[#00FF88]" />
                </div>
                <p className="text-2xl font-bold text-white">R$ {totalArrecadado.toLocaleString('pt-BR')},00</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Meta: R$ {metaTotal.toLocaleString('pt-BR')},00
                </p>
              </div>

              {/* Card 2: Preço por Cota (Editável pelo Painel) */}
              <div className="p-5 rounded-2xl glass-card border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/5 to-transparent relative group">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span className="font-medium text-slate-300">Preço por Cota</span>
                  <Coins className="w-4 h-4 text-[#D4AF37]" />
                </div>

                {editandoPreco ? (
                  <form onSubmit={handleSalvarPreco} className="mt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-[#D4AF37]">R$</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        autoFocus
                        value={novoPrecoInput}
                        onChange={(e) => setNovoPrecoInput(e.target.value)}
                        className="w-20 px-2 py-1 rounded-lg bg-black/80 border border-[#D4AF37] text-white font-mono text-base font-bold focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={salvandoPreco}
                        className="p-1.5 rounded-lg bg-[#00FF88] text-black hover:bg-[#33ff9f] cursor-pointer"
                        title="Salvar novo preço"
                      >
                        {salvandoPreco ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditandoPreco(false);
                          setNovoPrecoInput(String(precoPorCota));
                        }}
                        className="p-1.5 rounded-lg bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Pressione Salvar para atualizar</span>
                  </form>
                ) : (
                  <div>
                    <div className="flex items-baseline justify-between">
                      <p className="text-2xl font-bold font-mono text-[#D4AF37]">R$ {precoPorCota},00</p>
                      <button
                        type="button"
                        onClick={() => {
                          setNovoPrecoInput(String(precoPorCota));
                          setEditandoPreco(true);
                        }}
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 hover:border-[#D4AF37]/40 text-[#D4AF37] text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title="Editar valor de cada cota"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Configuração da campanha ativa</p>
                  </div>
                )}
              </div>

              {/* Card 3: Cotas Vendidas */}
              <div className="p-5 rounded-2xl glass-card border border-white/10">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Cotas Vendidas</span>
                  <Ticket className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {totalCotasVendidas} <span className="text-sm font-normal text-slate-400">/ {totalCotas}</span>
                </p>
                <p className="text-[11px] text-emerald-400 mt-1">
                  {Math.round((totalCotasVendidas / (totalCotas || 1)) * 100)}% da meta atingida
                </p>
              </div>

              {/* Card 4: Cotas Disponíveis */}
              <div className="p-5 rounded-2xl glass-card border border-white/10">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Cotas Disponíveis</span>
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                </div>
                <p className="text-2xl font-bold text-white">{cotasDisponiveis}</p>
                <p className="text-[11px] text-slate-400 mt-1">Aguardando compradores</p>
              </div>

              {/* Card 5: Bailarinos em Ação */}
              <div className="p-5 rounded-2xl glass-card border border-white/10">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Bailarinos em Ação</span>
                  <Users className="w-4 h-4 text-[#FF007F]" />
                </div>
                <p className="text-2xl font-bold text-white">{bailarinos.filter((b) => b.ativo).length}</p>
                <p className="text-[11px] text-slate-400 mt-1">Participantes ativos no ranking</p>
              </div>
            </div>

            {/* Atalho Rápido de Gestão de Parâmetros e Combos */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-black/80 via-[#0F3D2A]/30 to-black/80 border border-[#00FF88]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/15 border border-[#00FF88]/30 text-[#00FF88] flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Parâmetros Ativos da Campanha</span>
                    <span className="text-[10px] bg-[#00FF88]/20 text-[#00FF88] px-2 py-0.5 rounded-full font-mono">
                      {combosPromocionais.filter(c => c.ativo).length} Combos Ativos
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {totalCotas.toLocaleString('pt-BR')} cotas • R$ {precoPorCota},00/cota • Meta: R$ {metaTotal.toLocaleString('pt-BR')},00
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAbaAtiva('configuracoes')}
                className="px-4 py-2.5 rounded-xl bg-[#00FF88] hover:bg-[#33ff9f] text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0"
              >
                <Sliders className="w-4 h-4 stroke-[2.5]" />
                <span>Configurar Cotas, Metas & Combos</span>
              </button>
            </div>

            {/* Comparativo de Desempenho dos Bailarinos */}
            <div className="p-6 rounded-2xl glass-card border border-white/10">
              <h3 className="font-cinzel text-base font-bold text-white mb-6">
                Desempenho Comparativo de Vendas
              </h3>

              {bailarinos.filter((b) => b.ativo).length > 0 ? (
                <div className="space-y-4">
                  {bailarinos
                    .filter((b) => b.ativo)
                    .sort((a, b) => b.totalVendido - a.totalVendido)
                    .map((b) => {
                      const porcentagem = Math.min(100, Math.round((b.totalVendido / b.meta) * 100));
                      return (
                        <div key={b.id} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-medium text-white flex items-center gap-2">
                              <img src={b.fotoUrl} alt={b.nome} className="w-5 h-5 rounded-full object-cover" />
                              {b.nome}
                            </span>
                            <span className="text-slate-300">
                              <strong>{b.totalVendido}</strong> / {b.meta} ({porcentagem}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#00FF88] to-[#FF007F] rounded-full transition-all duration-700"
                              style={{ width: `${porcentagem}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  Nenhum bailarino cadastrado ainda. Use a aba "Bailarinos" para cadastrar os participantes da campanha.
                </p>
              )}
            </div>

            {/* Monitoramento em Tempo Real de Pedidos Confirmados (Cotas & Loja) */}
            <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#00FF88] flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                      <span>Últimos Pedidos Confirmados (Cotas & Loja)</span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Tempo Real
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Resumo unificado de todos os pagamentos aprovados no site (Campanha de Apoio e Loja Oficial)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={carregarPedidos}
                  disabled={carregandoPedidos}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${carregandoPedidos ? 'animate-spin text-[#00FF88]' : ''}`} />
                  <span>Atualizar</span>
                </button>
              </div>

              {pedidosRecentes.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic border border-dashed border-white/10 rounded-xl">
                  Nenhum pedido confirmado ainda. Assim que uma cota ou produto for pago via Pix ou manualmente, ele aparecerá aqui instantaneamente!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th className="pb-3 font-semibold">Comprador</th>
                        <th className="pb-3 font-semibold">Origem / Item</th>
                        <th className="pb-3 font-semibold">Valor</th>
                        <th className="pb-3 font-semibold">Identificador Pix</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold text-right">Data/Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pedidosRecentes.map((pedido) => {
                        const dataFormatada = new Date(pedido.created_at).toLocaleString('pt-BR');
                        const isCota = pedido.tipo === 'cota';

                        return (
                          <tr key={pedido.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3">
                              <p className="font-semibold text-white">{pedido.customer_name}</p>
                              {pedido.customer_contact && (
                                <p className="text-[11px] text-slate-400">{pedido.customer_contact}</p>
                              )}
                            </td>

                            <td className="py-3">
                              {isCota ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-[#00FF88] border border-emerald-500/20 whitespace-nowrap">
                                    <Ticket className="w-3 h-3" />
                                    <span>Cota Campanha</span>
                                  </span>
                                  <span className="font-mono text-xs text-white font-bold">{pedido.detalhes}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-500/10 text-[#FF007F] border border-pink-500/20 whitespace-nowrap">
                                    <ShoppingBag className="w-3 h-3" />
                                    <span>Loja Oficial</span>
                                  </span>
                                  <span className="text-xs text-slate-200 font-medium truncate max-w-[200px]">{pedido.detalhes}</span>
                                </div>
                              )}
                            </td>

                            <td className="py-3 font-bold text-white whitespace-nowrap">
                              R$ {Number(pedido.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>

                            <td className="py-3 text-[11px] text-slate-400 font-mono whitespace-nowrap">
                              {pedido.mp_payment_id ? (
                                <span className="text-slate-300 font-mono">
                                  #{pedido.mp_payment_id}
                                </span>
                              ) : pedido.payment_origin === 'manual' ? (
                                <span className="text-emerald-400/80 font-medium">Pix Manual</span>
                              ) : (
                                <span className="text-slate-500 italic">Pix Aprovado</span>
                              )}
                            </td>

                            <td className="py-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aprovado</span>
                              </span>
                            </td>

                            <td className="py-3 text-right text-slate-400 text-[11px] whitespace-nowrap">
                              {dataFormatada}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <ErrorBoundary fallbackTitle="Erro ao carregar módulo administrativo">
          {abaAtiva === 'configuracoes' && <AdminConfigCampanha />}
          {abaAtiva === 'bailarinos' && <AdminBailarinos />}
          {abaAtiva === 'premios' && <AdminPremios />}
          {abaAtiva === 'rifa' && <AdminRifa />}
          {abaAtiva === 'loja' && <AdminLoja />}
          {abaAtiva === 'financeiro' && <AdminFinanceiro />}
          {abaAtiva === 'usuarios' && <AdminUsuarios />}
        </ErrorBoundary>
      </main>

      {/* Modal de Confirmação para Ir ao Site Público via Logo ou Botão */}
      <ConfirmModal
        isOpen={confirmarVoltarSite}
        onClose={() => setConfirmarVoltarSite(false)}
        onConfirm={() => {
          setConfirmarVoltarSite(false);
          onVoltarAoSite();
        }}
        title="Ir para a Página Pública"
        message="Deseja sair do painel administrativo e navegar para a página pública da campanha dos Talentos de Minas?"
        confirmLabel="Sim, ir para o site"
        cancelLabel="Permanecer no painel"
      />

      {/* Modal de Confirmação de Logout */}
      <ConfirmModal
        isOpen={confirmarLogout}
        onClose={() => setConfirmarLogout(false)}
        onConfirm={executarLogout}
        title="Encerrar Sessão"
        message="Tem certeza que deseja sair do painel administrativo? Sua sessão será finalizada com segurança."
        confirmLabel="Sim, Sair do Painel"
        cancelLabel="Continuar Conectado"
        isDestructive={true}
      />
    </div>
  );
};
