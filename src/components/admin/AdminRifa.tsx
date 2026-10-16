import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useCampanha } from '../../hooks/useCampanha';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import { TOTAL_COTAS } from '../../constants/campanha';
import { 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  MessageCircle, 
  RefreshCw, 
  Ticket, 
  DollarSign, 
  Grid, 
  ListFilter, 
  Check 
} from 'lucide-react';
import type { CotaRifa } from '../../types';

export const AdminRifa: React.FC = () => {
  const { cotas, bailarinos, confirmarPedidoManual, cancelarPedido } = useCampanha();
  const { showToast } = useToast();

  const [pedidos, setPedidos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'paid' | 'pending'>('todos');
  const [busca, setBusca] = useState('');
  const [visualizacao, setVisualizacao] = useState<'pedidos' | 'mapa'>('pedidos');
  const [cotaDetalhes, setCotaDetalhes] = useState<CotaRifa | null>(null);

  // Carrega todos os pedidos do Supabase
  const carregarPedidos = useCallback(async () => {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('raffle_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPedidos(data);
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  // Escuta alterações em tempo real via WebSocket
  useEffect(() => {
    carregarPedidos();

    const canal = supabase
      .channel('admin_rifa_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'raffle_orders' }, () => {
        carregarPedidos();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cota_slots' }, () => {
        carregarPedidos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregarPedidos]);

  // Filtros de busca e status
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus;
      const termo = busca.trim().toLowerCase();
      if (!termo) return matchStatus;

      const matchNome = p.customer_name?.toLowerCase().includes(termo);
      const matchEmail = p.customer_email?.toLowerCase().includes(termo);
      const matchPhone = p.customer_phone?.includes(termo);
      const matchNumbers = Array.isArray(p.selected_numbers) && 
        p.selected_numbers.some((n: number) => n.toString() === termo || `#${n}`.includes(termo));
      const matchMpId = p.mp_payment_id?.toLowerCase().includes(termo);

      return matchStatus && (matchNome || matchEmail || matchPhone || matchNumbers || matchMpId);
    });
  }, [pedidos, filtroStatus, busca]);

  const pedidosPagos = pedidos.filter((p) => p.status === 'paid');
  const pedidosPendentes = pedidos.filter((p) => p.status === 'pending');
  const totalArrecadadoReais = pedidosPagos.reduce((acc, p) => acc + Number(p.total_price || 0), 0);
  const totalCotasVendidas = cotas.filter((c) => c.status === 'pago').length;

  const handleDarBaixa = async (orderId: string, nome: string) => {
    try {
      await confirmarPedidoManual(orderId);
      showToast({
        type: 'success',
        title: 'Baixa Confirmada',
        message: `Pedido de ${nome} marcado como pago e cotas garantidas.`,
      });
      await carregarPedidos();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao confirmar',
        message: err?.message || 'Falha ao atualizar o pedido.',
      });
    }
  };

  const handleCancelar = async (orderId: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja cancelar o pedido de ${nome}? Os números voltarão a ficar disponíveis para venda.`)) {
      return;
    }
    try {
      await cancelarPedido(orderId);
      showToast({
        type: 'info',
        title: 'Pedido Cancelado',
        message: `As cotas de ${nome} foram liberadas para novos compradores.`,
      });
      await carregarPedidos();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao cancelar',
        message: err?.message || 'Falha ao cancelar o pedido.',
      });
    }
  };

  const exportarPedidosCSV = () => {
    const cabecalho = 'ID_Pedido;Data;Comprador;WhatsApp;Email;Bailarino;Cotas;Total_R$;Status;Origem;MercadoPago_ID\n';
    const linhas = pedidos.map((p) => {
      const bNome = bailarinos.find((b) => b.id === p.bailarino_id)?.nome || 'Campanha Geral';
      const numerosStr = Array.isArray(p.selected_numbers) ? p.selected_numbers.join('-') : '';
      const dataStr = new Date(p.created_at).toLocaleString('pt-BR');
      return `"${p.id}";"${dataStr}";"${p.customer_name}";"${p.customer_phone || ''}";"${p.customer_email || ''}";"${bNome}";"${numerosStr}";${p.total_price};"${p.status}";"${p.payment_origin || 'pix'}";"${p.mp_payment_id || ''}"`;
    });

    const csvContent = '\uFEFF' + cabecalho + linhas.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pedidos_rifa_wicked_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      title: 'Exportação Concluída',
      message: 'Planilha de pedidos gerada com sucesso.',
    });
  };

  return (
    <div className="space-y-6">
      {/* 4 Cards de Resumo Operacional */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-card border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total de Pedidos</span>
            <Ticket className="w-4 h-4 text-[#00FF88]" />
          </div>
          <p className="text-2xl font-bold text-white">{pedidos.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Transações registradas</p>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-emerald-500/20 bg-emerald-500/[0.02]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="text-emerald-400 font-semibold">Pedidos Pagos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{pedidosPagos.length}</p>
          <p className="text-[11px] text-emerald-400 mt-0.5 font-medium">
            R$ {totalArrecadadoReais.toLocaleString('pt-BR')},00 confirmados
          </p>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-amber-500/20 bg-amber-500/[0.02]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="text-amber-300 font-semibold">Aguardando Pix</span>
            <Clock className="w-4 h-4 text-amber-300" />
          </div>
          <p className="text-2xl font-bold text-white">{pedidosPendentes.length}</p>
          <p className="text-[11px] text-amber-300/80 mt-0.5">Aguardando compensação</p>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-[#D4AF37]/20">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Cotas Vendidas</span>
            <DollarSign className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <p className="text-2xl font-bold text-white">
            {totalCotasVendidas} <span className="text-xs text-slate-400 font-normal">/ {TOTAL_COTAS}</span>
          </p>
          <p className="text-[11px] text-[#D4AF37] mt-0.5 font-medium">
            {TOTAL_COTAS - totalCotasVendidas} cotas ainda livres
          </p>
        </div>
      </div>

      {/* Barra de Filtros, Busca e Alternância de Visualização */}
      <div className="p-4 sm:p-5 rounded-2xl glass-card border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filtros de Status */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setVisualizacao('pedidos'); setFiltroStatus('todos'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              visualizacao === 'pedidos' && filtroStatus === 'todos'
                ? 'bg-[#00FF88] text-black'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            Todos os Pedidos ({pedidos.length})
          </button>

          <button
            onClick={() => { setVisualizacao('pedidos'); setFiltroStatus('paid'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
              visualizacao === 'pedidos' && filtroStatus === 'paid'
                ? 'bg-emerald-500 text-black'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Pagos ({pedidosPagos.length})</span>
          </button>

          <button
            onClick={() => { setVisualizacao('pedidos'); setFiltroStatus('pending'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
              visualizacao === 'pedidos' && filtroStatus === 'pending'
                ? 'bg-amber-400 text-black'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Aguardando Pix ({pedidosPendentes.length})</span>
          </button>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          {/* Botão de Alternar para Mapa Completo de 1.200 (se quiser consultar) */}
          <button
            onClick={() => setVisualizacao(visualizacao === 'pedidos' ? 'mapa' : 'pedidos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
              visualizacao === 'mapa'
                ? 'bg-[#D4AF37] text-black font-bold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
            title="Ver mapa completo dos 1.200 números"
          >
            {visualizacao === 'mapa' ? <ListFilter className="w-3.5 h-3.5" /> : <Grid className="w-3.5 h-3.5" />}
            <span>{visualizacao === 'mapa' ? 'Voltar para Pedidos' : 'Mapa 1.200 Números'}</span>
          </button>
        </div>

        {/* Busca e Exportação */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar nome, fone, cota #..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-black/50 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88]"
            />
          </div>

          <button
            onClick={carregarPedidos}
            disabled={carregando}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin text-[#00FF88]' : ''}`} />
          </button>

          <button
            onClick={exportarPedidosCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#D4AF37] text-black hover:bg-[#e0be47] transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-lg"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL: TABELA DE PEDIDOS (PRÁTICO E DIRETO) */}
      {visualizacao === 'pedidos' ? (
        <div className="rounded-2xl glass-card border border-white/10 overflow-hidden">
          {pedidosFiltrados.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs italic space-y-2">
              <p className="text-base font-semibold text-slate-300 not-italic">Nenhum pedido encontrado</p>
              <p>Os pedidos gerados pelos apoiadores no hotsite aparecerão aqui com atualização em tempo real.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-black/60 sticky top-0 z-10 text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Comprador</th>
                    <th className="px-4 py-3.5 font-semibold">Cotas Adquiridas</th>
                    <th className="px-4 py-3.5 font-semibold">Bailarino</th>
                    <th className="px-4 py-3.5 font-semibold">Valor</th>
                    <th className="px-4 py-3.5 font-semibold">Status</th>
                    <th className="px-4 py-3.5 font-semibold">Origem / ID MP</th>
                    <th className="px-4 py-3.5 font-semibold">Data/Hora</th>
                    <th className="px-4 py-3.5 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pedidosFiltrados.map((pedido) => {
                    const isPago = pedido.status === 'paid';
                    const isCancelado = pedido.status === 'cancelled';
                    const bNome = bailarinos.find((b) => b.id === pedido.bailarino_id)?.nome || 'Campanha Geral';
                    const dataFormatada = new Date(pedido.created_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <tr key={pedido.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Comprador */}
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-white text-sm">{pedido.customer_name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            {pedido.customer_phone && (
                              <a
                                href={`https://wa.me/55${pedido.customer_phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:underline flex items-center gap-1"
                                title="Abrir conversa no WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>{pedido.customer_phone}</span>
                              </a>
                            )}
                            {pedido.customer_email && (
                              <span className="truncate max-w-[150px]">{pedido.customer_email}</span>
                            )}
                          </div>
                        </td>

                        {/* Cotas */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {Array.isArray(pedido.selected_numbers) && pedido.selected_numbers.length > 0 ? (
                              pedido.selected_numbers.map((n: number) => (
                                <span
                                  key={n}
                                  className={`px-2 py-0.5 rounded-lg font-mono font-bold text-xs ${
                                    isPago
                                      ? 'bg-emerald-500/20 text-[#00FF88] border border-emerald-500/30'
                                      : 'bg-white/10 text-slate-300'
                                  }`}
                                >
                                  #{n}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </div>
                        </td>

                        {/* Bailarino */}
                        <td className="px-4 py-3.5 text-slate-300">
                          <span className="font-medium text-white">{bNome}</span>
                        </td>

                        {/* Valor */}
                        <td className="px-4 py-3.5 font-bold text-white">
                          R$ {Number(pedido.total_price).toLocaleString('pt-BR')},00
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          {isPago ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Pago</span>
                            </span>
                          ) : isCancelado ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Cancelado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Aguardando Pix</span>
                            </span>
                          )}
                        </td>

                        {/* Origem e ID */}
                        <td className="px-4 py-3.5 text-[11px] font-mono text-slate-400">
                          {pedido.mp_payment_id ? (
                            <div className="flex flex-col">
                              <span className="text-slate-200 font-semibold">Mercado Pago</span>
                              <span className="text-slate-400 text-[10px]">#{pedido.mp_payment_id}</span>
                            </div>
                          ) : (
                            <span>{pedido.payment_origin === 'manual' ? 'Baixa Manual' : 'Pix Hotsite'}</span>
                          )}
                        </td>

                        {/* Data */}
                        <td className="px-4 py-3.5 text-[11px] text-slate-400 whitespace-nowrap">
                          {dataFormatada}
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isPago && !isCancelado && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDarBaixa(pedido.id, pedido.customer_name)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Confirmar pagamento manualmente"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Dar Baixa</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleCancelar(pedido.id, pedido.customer_name)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Cancelar pedido e liberar cotas"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Cancelar</span>
                                </button>
                              </>
                            )}

                            {pedido.customer_phone && (
                              <a
                                href={`https://wa.me/55${pedido.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                  `Olá, ${pedido.customer_name}! Sobre seu apoio na campanha Wicked 2026 dos Talentos de Minas:`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Conversar no WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* VISUALIZAÇÃO SECUNDÁRIA: MAPA DOS 1.200 NÚMEROS (CONSULTA ESPECÍFICA) */
        <div className="rounded-2xl glass-card border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h4 className="font-cinzel text-base font-bold text-white">Mapa das 1.200 Cotas</h4>
              <p className="text-xs text-slate-400">Clique em qualquer número vendido para ver a ficha completa.</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Vendido</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white/10" /> Disponível</span>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto pr-1">
            <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-1.5">
              {cotas.map((cota) => {
                const isPago = cota.status === 'pago';
                return (
                  <button
                    key={cota.numero}
                    onClick={() => {
                      if (isPago) setCotaDetalhes(cota);
                    }}
                    className={`py-2 rounded-lg font-mono text-xs font-bold transition-all text-center ${
                      isPago
                        ? 'bg-emerald-500/20 text-[#00FF88] border border-emerald-500/40 cursor-pointer hover:bg-emerald-500/30'
                        : 'bg-white/5 text-slate-400 border border-white/5 cursor-default'
                    }`}
                    title={isPago ? `#${cota.numero} - ${cota.compradorNome}` : `#${cota.numero} - Disponível`}
                  >
                    #{cota.numero}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Ficha do Comprador (quando clicado no mapa) */}
      {cotaDetalhes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#0F1410] border border-white/10 rounded-2xl p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#00FF88] text-black font-mono font-bold text-sm">
                  #{cotaDetalhes.numero}
                </span>
                <h4 className="font-cinzel text-base font-bold text-white">Ficha da Cota</h4>
              </div>
              <button
                onClick={() => setCotaDetalhes(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block">Comprador Titular:</span>
                <p className="text-sm font-bold text-white">{cotaDetalhes.compradorNome || 'Não informado'}</p>
              </div>

              <div>
                <span className="text-slate-400 block">WhatsApp:</span>
                <p className="text-white font-mono">{cotaDetalhes.compradorWhatsapp || '—'}</p>
              </div>

              <div>
                <span className="text-slate-400 block">E-mail:</span>
                <p className="text-white">{cotaDetalhes.compradorEmail || '—'}</p>
              </div>

              <div>
                <span className="text-slate-400 block">Bailarino Apoiado:</span>
                <p className="text-white font-medium">
                  {bailarinos.find((b) => b.id === cotaDetalhes.bailarinoId)?.nome || 'Campanha Geral'}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block">Status:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Pago & Confirmado</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => setCotaDetalhes(null)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
