import React, { useState } from 'react';
import { useCampanha } from '../../hooks/useCampanha';
import { useAdminUsuarios } from '../../hooks/useAdminUsuarios';
import { useToast } from '../../hooks/useToast';
import { AdminBailarinos } from './AdminBailarinos';
import { AdminRifa } from './AdminRifa';
import { AdminUsuarios } from './AdminUsuarios';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { TOTAL_COTAS } from '../../constants/campanha';
import { 
  LayoutDashboard, 
  Users, 
  Ticket, 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  UserCog, 
  Coins, 
  Edit3, 
  Check, 
  X, 
  Loader2 
} from 'lucide-react';

import logoTalentos from '../../assets/logo_talentos.webp';

export const AdminDashboard: React.FC<{ onVoltarAoSite: () => void }> = ({ onVoltarAoSite }) => {
  const [abaAtiva, setAbaAtiva] = useState<'kpi' | 'bailarinos' | 'rifa' | 'usuarios'>('kpi');
  const { totalArrecadado, totalCotasVendidas, bailarinos, precoPorCota, atualizarPrecoPorCota } = useCampanha();
  const { usuarios } = useAdminUsuarios();
  const { showToast } = useToast();

  const [editandoPreco, setEditandoPreco] = useState(false);
  const [novoPrecoInput, setNovoPrecoInput] = useState(String(precoPorCota));
  const [salvandoPreco, setSalvandoPreco] = useState(false);

  const cotasDisponiveis = TOTAL_COTAS - totalCotasVendidas;
  const metaTotal = TOTAL_COTAS * precoPorCota;

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

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-100 flex flex-col">
      {/* Header Administrativo */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoTalentos}
              alt="Talentos de Minas"
              className="h-7 sm:h-8 w-auto object-contain shrink-0"
              width={140}
              height={32}
            />
            <div className="min-w-0 border-l border-white/10 pl-3">
              <h1 className="font-cinzel text-xs sm:text-sm font-bold text-white leading-tight truncate">
                Painel Wicked 2026
              </h1>
              <p className="text-[10px] text-[#D4AF37] truncate">Gestão Operacional</p>
            </div>
          </div>

          <button
            onClick={onVoltarAoSite}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[#00FF88]" />
            <span className="hidden xs:inline">Voltar ao Hotsite</span>
            <span className="xs:hidden">Voltar</span>
          </button>
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
            onClick={() => setAbaAtiva('rifa')}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              abaAtiva === 'rifa'
                ? 'border-[#00FF88] text-[#00FF88]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Ticket className="w-4 h-4 shrink-0" />
            Mapa da Rifa (1.200)
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
                    <p className="text-[11px] text-slate-400 mt-1">Configuração da rifa ativa</p>
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
                  {totalCotasVendidas} <span className="text-sm font-normal text-slate-400">/ {TOTAL_COTAS}</span>
                </p>
                <p className="text-[11px] text-emerald-400 mt-1">
                  {Math.round((totalCotasVendidas / TOTAL_COTAS) * 100)}% da meta atingida
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
          </div>
        )}

        <ErrorBoundary fallbackTitle="Erro ao carregar módulo administrativo">
          {abaAtiva === 'bailarinos' && <AdminBailarinos />}
          {abaAtiva === 'rifa' && <AdminRifa />}
          {abaAtiva === 'usuarios' && <AdminUsuarios />}
        </ErrorBoundary>
      </main>
    </div>
  );
};
