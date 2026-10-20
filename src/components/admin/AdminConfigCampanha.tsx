import React, { useState } from 'react';
import { 
  Sliders, 
  Ticket, 
  Target, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Loader2,
  Save,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { useCampanha } from '../../hooks/useCampanha';
import { useToast } from '../../hooks/useToast';
import { ConfirmModal } from '../common/ConfirmModal';

export const AdminConfigCampanha: React.FC = () => {
  const { 
    totalCotas, 
    sincronizarCotasEMetas,
    precoPorCota, 
    atualizarPrecoPorCota,
    metaArrecadacaoCustom, 
    atualizarMetaArrecadacao,
    bailarinos,
    totalCotasVendidas,
    maiorNumeroVendido
  } = useCampanha();
  const { showToast } = useToast();

  const bailarinosAtivos = bailarinos.filter((b) => b.ativo);
  const qtdBailarinosAtivos = Math.max(1, bailarinosAtivos.length);

  const metaSugeridaPorBailarino = bailarinosAtivos.length > 0 
    ? Math.round(totalCotas / bailarinosAtivos.length) 
    : 0;

  // Estados de Sincronização Bidirecional (Total de Cotas <---> Meta por Bailarino)
  const [totalCotasInput, setTotalCotasInput] = useState(String(totalCotas));
  const [metaIndividualInput, setMetaIndividualInput] = useState(String(metaSugeridaPorBailarino));
  const [salvandoSincronizacao, setSalvandoSincronizacao] = useState(false);
  const [confirmarSincronizacao, setConfirmarSincronizacao] = useState(false);

  // Estados de edição do Preço da Cota
  const [novoPrecoInput, setNovoPrecoInput] = useState(String(precoPorCota));
  const [salvandoPreco, setSalvandoPreco] = useState(false);

  // Estados de edição da Meta de Arrecadação
  const [usarMetaCustom, setUsarMetaCustom] = useState(metaArrecadacaoCustom !== null);
  const [novaMetaCustomInput, setNovaMetaCustomInput] = useState(String(metaArrecadacaoCustom || (totalCotas * precoPorCota)));
  const [salvandoMeta, setSalvandoMeta] = useState(false);


  const numTotalAtual = parseInt(totalCotasInput, 10) || totalCotas;
  const numMetaAtual = parseInt(metaIndividualInput, 10) || metaSugeridaPorBailarino;
  const metaFinanceiraCalculada = numTotalAtual * precoPorCota;
  const metaFinanceiraEfetiva = metaArrecadacaoCustom || metaFinanceiraCalculada;

  // 1. Manipulação Bidirecional Inteligente
  const handleTotalCotasChange = (valorStr: string) => {
    setTotalCotasInput(valorStr);
    const val = parseInt(valorStr, 10);
    if (!isNaN(val) && val > 0 && qtdBailarinosAtivos > 0) {
      setMetaIndividualInput(String(Math.round(val / qtdBailarinosAtivos)));
    }
  };

  const handleMetaIndividualChange = (valorStr: string) => {
    setMetaIndividualInput(valorStr);
    const val = parseInt(valorStr, 10);
    if (!isNaN(val) && val > 0 && qtdBailarinosAtivos > 0) {
      setTotalCotasInput(String(val * qtdBailarinosAtivos));
    }
  };

  const aplicarPreset = (metaPorArtista: number) => {
    setMetaIndividualInput(String(metaPorArtista));
    setTotalCotasInput(String(metaPorArtista * qtdBailarinosAtivos));
  };

  // 2. Salvar Sincronização Bidirecional
  const handleExecutarSincronizacao = async () => {
    const tot = parseInt(totalCotasInput, 10);
    const met = parseInt(metaIndividualInput, 10);

    if (isNaN(tot) || tot <= 0) {
      showToast({
        type: 'warning',
        title: 'Total Inválido',
        message: 'Informe uma quantidade de cotas válida maior que zero.',
      });
      return;
    }

    if (isNaN(met) || met <= 0) {
      showToast({
        type: 'warning',
        title: 'Meta Inválida',
        message: 'Informe uma meta individual válida maior que zero.',
      });
      return;
    }

    if (tot < totalCotasVendidas) {
      showToast({
        type: 'error',
        title: 'Não Permitido',
        message: `O total de cotas não pode ser reduzido para menos de ${totalCotasVendidas}, pois já foram vendidas.`,
      });
      return;
    }

    try {
      setSalvandoSincronizacao(true);
      await sincronizarCotasEMetas({ novoTotalCotas: tot, novaMetaIndividual: met });
      showToast({
        type: 'success',
        title: 'Campanha Sincronizada com Sucesso!',
        message: `O total de ${tot.toLocaleString('pt-BR')} cotas e a meta de ${met} cotas para cada um dos ${qtdBailarinosAtivos} artistas foram atualizados no sistema.`,
      });
      setConfirmarSincronizacao(false);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao Sincronizar',
        message: err?.message || 'Falha ao sincronizar cotas e metas.',
      });
    } finally {
      setSalvandoSincronizacao(false);
    }
  };

  // 3. Salvar Preço por Cota
  const handleSalvarPreco = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(novoPrecoInput.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      showToast({
        type: 'warning',
        title: 'Valor Inválido',
        message: 'Informe um valor numérico válido maior que zero (ex: 30).',
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

  // 4. Salvar Meta de Arrecadação
  const handleSalvarMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSalvandoMeta(true);
      if (!usarMetaCustom) {
        await atualizarMetaArrecadacao(null);
        showToast({
          type: 'success',
          title: 'Meta Automática Ativada',
          message: `A meta acompanha automaticamente o cálculo: ${totalCotas} cotas × R$ ${precoPorCota},00 = R$ ${(totalCotas * precoPorCota).toLocaleString('pt-BR')},00.`,
        });
      } else {
        const val = parseFloat(novaMetaCustomInput.replace(',', '.'));
        if (isNaN(val) || val <= 0) {
          showToast({
            type: 'warning',
            title: 'Meta Inválida',
            message: 'Informe um valor de meta financeira válido.',
          });
          return;
        }
        await atualizarMetaArrecadacao(val);
        showToast({
          type: 'success',
          title: 'Meta Personalizada Definida',
          message: `Meta global fixada em R$ ${val.toLocaleString('pt-BR')},00.`,
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao Salvar Meta',
        message: err?.message || 'Falha ao salvar a meta de arrecadação.',
      });
    } finally {
      setSalvandoMeta(false);
    }
  };


  const temAlteracoesPendentes = totalCotasInput !== String(totalCotas) || metaIndividualInput !== String(metaSugeridaPorBailarino);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/30 text-xs font-semibold text-[#00FF88] uppercase tracking-wider mb-2">
            <Sliders className="w-3.5 h-3.5" />
            <span>Configurações Globais da Campanha</span>
          </div>
          <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-white tracking-tight">
            Parâmetros de Rifas, Metas & Precificação
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Sincronização bidirecional inteligente: altere a meta individual para calcular o total de rifas, ou altere o total para redistribuir a meta entre os {qtdBailarinosAtivos} artistas.
          </p>
        </div>

        {/* Resumo Rápido da Arrecadação */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 text-[#00FF88] flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Progresso Atual</p>
            <p className="text-sm font-mono font-bold text-white">
              {totalCotasVendidas} / {totalCotas} cotas ({Math.round((totalCotasVendidas / (totalCotas || 1)) * 100)}%)
            </p>
          </div>
        </div>
      </div>

      {/* BLOCO DE DESTAQUE: SINCRONIZAÇÃO BIDIRECIONAL DE COTAS & METAS */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border-2 border-[#00FF88]/30 bg-gradient-to-br from-[#0F3D2A]/25 via-black/80 to-black/95 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00FF88]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Topo do Card com Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00FF88]/20 to-[#D4AF37]/20 border border-[#00FF88]/40 text-[#00FF88] flex items-center justify-center shadow-lg">
                <ArrowRightLeft className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-cinzel text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span>Sincronização de Cotas & Metas</span>
                  <span className="text-[11px] bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/40 px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
                    Bidirecional
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Digite em qualquer um dos campos abaixo: a proporção é recalculada instantaneamente em tempo real.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#00FF88]" />
                <span>{qtdBailarinosAtivos} Bailarinos Ativos</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-xs font-mono font-bold text-[#D4AF37]">
                Meta: R$ {metaFinanceiraEfetiva.toLocaleString('pt-BR')},00
              </span>
            </div>
          </div>

          {/* PAINEL DOS DOIS INPUTS SINCRONIZADOS */}
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
            {/* Campo 1: Total de Cotas da Campanha */}
            <div className="md:col-span-5 p-4 rounded-2xl bg-black/60 border border-white/15 hover:border-[#00FF88]/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-[#00FF88]" />
                  <span>Total de Rifas da Campanha</span>
                </label>
                <span className="text-[10px] text-slate-400">Tamanho da grade</span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min={totalCotasVendidas || 1}
                  step="1"
                  value={totalCotasInput}
                  onChange={(e) => handleTotalCotasChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/90 border border-white/20 text-white font-mono text-2xl font-black focus:outline-none focus:border-[#00FF88] shadow-inner"
                  placeholder="1200"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase text-slate-400">
                  Cotas Totais
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Alterar este valor recalcula a meta de cada artista: <strong className="text-[#00FF88] font-mono">{numTotalAtual} ÷ {qtdBailarinosAtivos} = {numMetaAtual} cotas</strong>.
              </p>
            </div>

            {/* Conector Central Visual */}
            <div className="md:col-span-1 flex flex-col items-center justify-center py-2 md:py-0">
              <div className="w-10 h-10 rounded-full bg-[#00FF88]/15 border border-[#00FF88]/40 flex items-center justify-center text-[#00FF88] shadow-md shadow-[#00FF88]/20 animate-pulse">
                <ArrowRightLeft className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1 hidden md:block">
                Auto
              </span>
            </div>

            {/* Campo 2: Meta Individual por Bailarino */}
            <div className="md:col-span-5 p-4 rounded-2xl bg-black/60 border border-white/15 hover:border-[#D4AF37]/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#D4AF37]" />
                  <span>Meta Individual por Bailarino</span>
                </label>
                <span className="text-[10px] text-slate-400">Por artista ativo</span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={metaIndividualInput}
                  onChange={(e) => handleMetaIndividualChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/90 border border-white/20 text-white font-mono text-2xl font-black focus:outline-none focus:border-[#D4AF37] shadow-inner text-[#D4AF37]"
                  placeholder="133"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase text-slate-400">
                  Cotas / Artista
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Alterar este valor recalcula o total de rifas: <strong className="text-[#D4AF37] font-mono">{numMetaAtual} × {qtdBailarinosAtivos} = {numTotalAtual} cotas</strong>.
              </p>
            </div>
          </div>

          {/* Atalhos Rápidos de Meta Típica */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 font-semibold mr-1">Sugestões rápidas:</span>
            {[
              { meta: 100, label: '100 cotas cada' },
              { meta: 120, label: '120 cotas cada' },
              { meta: Math.round(1200 / qtdBailarinosAtivos), label: `Meta Atual 1.200 (${Math.round(1200 / qtdBailarinosAtivos)} cada)` },
              { meta: 150, label: '150 cotas cada' },
              { meta: 200, label: '200 cotas cada' },
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => aplicarPreset(preset.meta)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  numMetaAtual === preset.meta
                    ? 'bg-[#00FF88]/20 border-[#00FF88] text-[#00FF88]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                {preset.label} <span className="font-mono text-[10px] text-slate-400">({preset.meta * qtdBailarinosAtivos} tot.)</span>
              </button>
            ))}
          </div>

          {/* Barra Informativa de Vendas e Arrecadação */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Cotas Vendidas:</span>
                <span className="font-mono font-bold text-white text-sm">{totalCotasVendidas} cotas</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Cota Mais Alta:</span>
                <span className="font-mono font-bold text-[#00FF88] text-sm">
                  {maiorNumeroVendido > 0 ? `#${maiorNumeroVendido}` : 'Nenhuma'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Cotas Livres:</span>
                <span className="font-mono font-bold text-emerald-300 text-sm">{Math.max(0, numTotalAtual - totalCotasVendidas)} cotas</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Meta por Artista:</span>
                <span className="font-mono font-bold text-[#D4AF37] text-sm">{numMetaAtual} cotas ({qtdBailarinosAtivos} ativos)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Arrecadação Projetada:</span>
                <span className="font-mono font-bold text-purple-300 text-sm">R$ {metaFinanceiraCalculada.toLocaleString('pt-BR')},00</span>
              </div>
            </div>

            <div className="w-full h-2.5 bg-black/70 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#00FF88] via-[#D4AF37] to-[#FF007F] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((totalCotasVendidas / (numTotalAtual || 1)) * 100))}%` }}
              />
            </div>

            {/* Alerta de Garantia de Preservação de Cotas Vendidas */}
            {maiorNumeroVendido > numTotalAtual && (
              <div className="p-3.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-start gap-3 text-xs text-[#D4AF37] animate-in fade-in">
                <ShieldCheck className="w-5 h-5 text-[#00FF88] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-white font-bold mb-0.5">
                    Garantia de Preservação de Cotas Vendidas Ativa
                  </strong>
                  Existem cotas já vendidas com numeração superior ao novo total (até o número #{maiorNumeroVendido}).
                  O sistema mantém 100% dessas cotas ativas e garantidas aos compradores, com dados preservados e participação assegurada no sorteio. O novo total de {numTotalAtual} define apenas o limite de novas cotas disponíveis para compra.
                </div>
              </div>
            )}
          </div>

          {/* BOTÃO PRINCIPAL DE SALVAR E SINCRONIZAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
            <div className="text-xs text-slate-300">
              {temAlteracoesPendentes ? (
                <span className="text-[#00FF88] font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#D4AF37]" />
                  Você possui alterações prontas para sincronizar. Clique em salvar para persistir no banco.
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#00FF88]" />
                  Campanha e bailarinos estão sincronizados com {totalCotas} cotas totais.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {temAlteracoesPendentes && (
                <button
                  type="button"
                  onClick={() => {
                    setTotalCotasInput(String(totalCotas));
                    setMetaIndividualInput(String(metaSugeridaPorBailarino));
                  }}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Descartar
                </button>
              )}

              <button
                type="button"
                onClick={() => setConfirmarSincronizacao(true)}
                disabled={salvandoSincronizacao || !temAlteracoesPendentes}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#00FF88] hover:bg-[#33ff9f] disabled:opacity-40 disabled:cursor-not-allowed text-black font-cinzel text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl shadow-[#00FF88]/20"
              >
                {salvandoSincronizacao ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Sincronizando Banco...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 stroke-[2.5]" />
                    <span>Salvar e Sincronizar Campanha</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Secundária: PREÇO POR COTA & META FINANCEIRA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BLOCO: PREÇO POR COTA (UNITÁRIO) */}
        <div className="p-5 sm:p-6 rounded-3xl glass-card border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Preço Unitário da Cota</h3>
                  <p className="text-xs text-slate-400">Valor oficial por cota na campanha</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs font-mono font-bold text-[#D4AF37]">
                R$ {precoPorCota},00 / cota
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 mb-4 space-y-2 text-xs">
              <p className="text-slate-300">
                O valor unitário alimenta o checkout e todos os cálculos do sistema de forma linear e proporcional (1 cota = R$ {precoPorCota}, 3 cotas = R$ {precoPorCota * 3}, 5 cotas = R$ {precoPorCota * 5}, etc).
              </p>
              <p className="text-slate-400 text-[11px]">
                Arrecadação potencial total: <strong className="text-white font-mono">R$ {(totalCotas * precoPorCota).toLocaleString('pt-BR')},00</strong>
              </p>
            </div>

            <form onSubmit={handleSalvarPreco} className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Alterar Valor Unitário (R$):
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={novoPrecoInput}
                    onChange={(e) => setNovoPrecoInput(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/70 border border-white/15 text-white font-mono text-base font-bold focus:outline-none focus:border-[#D4AF37]"
                    placeholder="30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={salvandoPreco || novoPrecoInput === String(precoPorCota)}
                  className="px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#e5c04b] disabled:opacity-40 text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0"
                >
                  {salvandoPreco ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Preço</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* BLOCO: META FINANCEIRA GLOBAL (R$) */}
        <div className="p-5 sm:p-6 rounded-3xl glass-card border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Meta Financeira Global (R$)</h3>
                  <p className="text-xs text-slate-400">Meta financeira exibida no painel administrativo</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs font-mono font-bold text-purple-300">
                R$ {metaFinanceiraEfetiva.toLocaleString('pt-BR')},00
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 mb-4 text-xs space-y-2">
              <p className="text-slate-300">
                Por padrão, a meta financeira acompanha o cálculo automático de cotas ({totalCotas} cotas × R$ {precoPorCota},00). Se preferir, você pode definir um valor financeiro fixo.
              </p>
            </div>

            <form onSubmit={handleSalvarMeta} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usarMetaCustom}
                    onChange={(e) => setUsarMetaCustom(e.target.checked)}
                    className="rounded bg-black/60 border-white/20 text-[#00FF88] focus:ring-0"
                  />
                  <span>Personalizar meta financeira manualmente</span>
                </label>
                {!usarMetaCustom && (
                  <span className="text-[10px] text-[#00FF88] font-semibold bg-[#00FF88]/10 px-2 py-0.5 rounded-md">
                    Cálculo Automático
                  </span>
                )}
              </div>

              {usarMetaCustom && (
                <div className="flex items-center gap-2 animate-in fade-in duration-150">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                    <input
                      type="number"
                      min="1000"
                      step="1"
                      value={novaMetaCustomInput}
                      onChange={(e) => setNovaMetaCustomInput(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/70 border border-white/15 text-white font-mono text-sm font-bold focus:outline-none focus:border-purple-400"
                      placeholder="36000"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={salvandoMeta}
                    className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0"
                  >
                    {salvandoMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Salvar</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* CONFIRMAÇÃO PARA SINCRONIZAR COTAS E METAS */}
      <ConfirmModal
        isOpen={confirmarSincronizacao}
        onClose={() => setConfirmarSincronizacao(false)}
        onConfirm={handleExecutarSincronizacao}
        title="Confirmar Sincronização da Campanha?"
        message={`Você está aplicando o total de ${Number(totalCotasInput).toLocaleString('pt-BR')} cotas na campanha e definindo a meta de ${metaIndividualInput} cotas para cada um dos ${qtdBailarinosAtivos} bailarinos ativos. Deseja prosseguir?`}
        confirmLabel="Sim, Sincronizar Tudo"
        cancelLabel="Voltar"
        isLoading={salvandoSincronizacao}
      />
    </div>
  );
};
