import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useCampanha } from '../../hooks/useCampanha';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import { 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  MessageCircle, 
  RefreshCw, 
  Ticket, 
  DollarSign, 
  Grid, 
  ListFilter, 
  Check,
  AlertTriangle,
  Mail,
  Send,
  Trash2,
  Ban,
  User,
  AlertOctagon
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { ModalReciboWhatsApp } from './ModalReciboWhatsApp';
import type { CotaRifa } from '../../types';

export const AdminRifa: React.FC = () => {
  const { cotas, bailarinos, confirmarPedidoManual, totalCotas } = useCampanha();
  const { showToast } = useToast();

  const [pedidos, setPedidos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'paid' | 'pending' | 'expired' | 'cancelled'>('todos');
  const [busca, setBusca] = useState('');
  const [visualizacao, setVisualizacao] = useState<'pedidos' | 'mapa'>('pedidos');
  const [cotaDetalhes, setCotaDetalhes] = useState<CotaRifa | null>(null);

  // Estados para modal de recibo / WhatsApp
  const [pedidoParaRecibo, setPedidoParaRecibo] = useState<any | null>(null);

  // Estados para modal de cancelamento/exclusão de pedido
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState<any | null>(null);
  const [pedidoParaExcluirPermanente, setPedidoParaExcluirPermanente] = useState<any | null>(null);
  const [adminResponsavel, setAdminResponsavel] = useState<string>('');
  const [motivoCancelamento, setMotivoCancelamento] = useState<string>('');
  const [processandoCancelamento, setProcessandoCancelamento] = useState<boolean>(false);

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

  // Filtros de busca e status (A lista superior exibe apenas pedidos ativos; cancelados vão para a auditoria inferior)
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      // Pedidos cancelados saem da lista superior e vão exclusivamente para a auditoria inferior
      if (p.status === 'cancelled') return false;

      const matchStatus = filtroStatus === 'todos'
        ? true
        : p.status === filtroStatus;
      const termo = busca.trim().toLowerCase();
      if (!termo) return matchStatus;

      const matchNome = p.customer_name?.toLowerCase().includes(termo);
      const matchEmail = p.customer_email?.toLowerCase().includes(termo);
      const matchPhone = p.customer_phone?.includes(termo);
      const matchNumbers = Array.isArray(p.selected_numbers) && 
        p.selected_numbers.some((n: number) => n.toString() === termo || `#${n}`.includes(termo));
      const matchMpId = p.mp_payment_id?.toLowerCase().includes(termo);
      const matchCanceladoPor = p.status_updated_by?.toLowerCase().includes(termo);

      return matchStatus && (matchNome || matchEmail || matchPhone || matchNumbers || matchMpId || matchCanceladoPor);
    });
  }, [pedidos, filtroStatus, busca]);

  const pedidosAtivos = pedidos.filter((p) => p.status !== 'cancelled');
  const pedidosPagos = pedidos.filter((p) => p.status === 'paid');
  const pedidosPendentes = pedidos.filter((p) => p.status === 'pending');
  const pedidosExpirados = pedidos.filter((p) => p.status === 'expired');
  const pedidosCancelados = pedidos.filter((p) => p.status === 'cancelled');
  const emailsEnviados = pedidosPagos.filter((p) => p.email_sent || p.email_status === 'sent');
  const emailsPendentes = pedidosPagos.filter((p) => !p.email_sent && p.email_status !== 'sent');
  const [reenviandoEmailId, setReenviandoEmailId] = useState<string | null>(null);

  const totalArrecadadoReais = pedidosPagos.reduce((acc, p) => acc + Number(p.total_price || 0), 0);
  const totalCotasVendidas = cotas.filter((c) => c.status === 'pago').length;

  const handleReenviarEmail = async (order: any) => {
    try {
      setReenviandoEmailId(order.id);
      showToast({
        type: 'info',
        title: 'Disparando Recibo',
        message: `Solicitando envio do recibo para ${order.customer_email}...`,
      });

      const { data, error } = await supabase.functions.invoke('send-receipt-email', {
        body: { order_id: order.id }
      });

      if (error || (data && !data.success)) {
        throw new Error(data?.error || error?.message || 'Falha ao conectar com serviço de e-mail.');
      }

      showToast({
        type: 'success',
        title: 'Recibo Enviado!',
        message: `Comprovante enviado com sucesso para ${order.customer_email}.`,
      });
      await carregarPedidos();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao enviar e-mail',
        message: err.message || 'Verifique as credenciais da API do Brevo.',
      });
    } finally {
      setReenviandoEmailId(null);
    }
  };

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

  const abrirModalCancelar = (pedido: any) => {
    let nomeSalvo = 'James Rizo';
    try {
      const s = localStorage.getItem('admin_usuario_atual');
      if (s) {
        const u = JSON.parse(s);
        if (u.nome) nomeSalvo = u.nome;
      }
    } catch (_) {}
    setAdminResponsavel(nomeSalvo);
    setMotivoCancelamento(
      pedido.status === 'paid'
        ? 'Cancelamento de pedido pago solicitado pela coordenação'
        : 'Cancelamento administrativo de pedido'
    );
    setPedidoParaCancelar(pedido);
  };

  const handleConfirmarCancelamento = async () => {
    if (!pedidoParaCancelar) return;
    try {
      setProcessandoCancelamento(true);
      const nomeAdmin = adminResponsavel.trim() || 'Administrador Geral';
      const motivo = motivoCancelamento.trim() || 'Cancelamento administrativo';
      const numerosStr = Array.isArray(pedidoParaCancelar.selected_numbers)
        ? pedidoParaCancelar.selected_numbers.map((n: number) => `#${n}`).join(', ')
        : '';

      // 1. Atualiza raffle_orders para 'cancelled' com auditoria completa
      const { error: updErr } = await supabase
        .from('raffle_orders')
        .update({
          status: 'cancelled',
          status_updated_by: nomeAdmin,
          status_updated_at: new Date().toISOString(),
          reason: motivo,
          updated_at: new Date().toISOString()
        })
        .eq('id', pedidoParaCancelar.id);

      if (updErr) throw updErr;

      // 2. Garante exclusão física imediata dos slots em cota_slots para liberar o número para novos compradores
      await supabase
        .from('cota_slots')
        .delete()
        .eq('order_id', pedidoParaCancelar.id);

      showToast({
        type: 'success',
        title: 'Pedido Cancelado!',
        message: `As cotas ${numerosStr} foram liberadas e o cancelamento foi registrado por ${nomeAdmin}.`,
      });

      setPedidoParaCancelar(null);
      await carregarPedidos();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao cancelar',
        message: err?.message || 'Falha ao processar o cancelamento do pedido.',
      });
    } finally {
      setProcessandoCancelamento(false);
    }
  };

  const handleConfirmarExclusaoPermanente = async () => {
    if (!pedidoParaExcluirPermanente) return;
    try {
      setProcessandoCancelamento(true);
      await supabase
        .from('cota_slots')
        .delete()
        .eq('order_id', pedidoParaExcluirPermanente.id);

      const { error } = await supabase
        .from('raffle_orders')
        .delete()
        .eq('id', pedidoParaExcluirPermanente.id);

      if (error) throw error;

      showToast({
        type: 'success',
        title: 'Pedido Removido Definitivamente',
        message: `O pedido de ${pedidoParaExcluirPermanente.customer_name} foi excluído da base de dados.`,
      });

      setPedidoParaExcluirPermanente(null);
      await carregarPedidos();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao Excluir',
        message: err?.message || 'Falha ao excluir o pedido.',
      });
    } finally {
      setProcessandoCancelamento(false);
    }
  };

  const exportarPedidosCSV = () => {
    const cabecalho = 'ID_Pedido;Data;Comprador;WhatsApp;Email;Bailarino;Cotas;Total_R$;Status;Cancelado_Por;Data_Cancelamento;Motivo;Origem;MercadoPago_ID\n';
    const linhas = pedidos.map((p) => {
      const bNome = bailarinos.find((b) => b.id === p.bailarino_id)?.nome || 'Campanha Geral';
      const numerosStr = Array.isArray(p.selected_numbers) ? p.selected_numbers.join('-') : '';
      const dataStr = new Date(p.created_at).toLocaleString('pt-BR');
      const dataCancelStr = p.status_updated_at ? new Date(p.status_updated_at).toLocaleString('pt-BR') : '';
      return `"${p.id}";"${dataStr}";"${p.customer_name}";"${p.customer_phone || ''}";"${p.customer_email || ''}";"${bNome}";"${numerosStr}";${p.total_price};"${p.status}";"${p.status_updated_by || ''}";"${dataCancelStr}";"${p.reason || ''}";"${p.payment_origin || 'pix'}";"${p.mp_payment_id || ''}"`;
    });

    const csvContent = '\uFEFF' + cabecalho + linhas.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pedidos_apoio_wicked_${new Date().toISOString().split('T')[0]}.csv`);
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
      {/* 5 Cards de Resumo Operacional */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
            {totalCotasVendidas} <span className="text-xs text-slate-400 font-normal">/ {totalCotas}</span>
          </p>
          <p className="text-[11px] text-[#D4AF37] mt-0.5 font-medium">
            {Math.max(0, totalCotas - totalCotasVendidas)} cotas ainda livres
          </p>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-sky-500/20 bg-sky-500/[0.02]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="text-sky-300 font-semibold">Recibos por E-mail</span>
            <Mail className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {emailsEnviados.length} <span className="text-xs text-slate-400 font-normal">/ {pedidosPagos.length}</span>
          </p>
          <p className="text-[11px] mt-0.5">
            {emailsPendentes.length > 0 ? (
              <span className="text-amber-400 font-semibold">{emailsPendentes.length} pendente(s)</span>
            ) : (
              <span className="text-emerald-400 font-medium">Todos enviados ✓</span>
            )}
          </p>
        </div>
      </div>

      {/* Alerta de Recibos Pendentes (se houver pedidos pagos com e-mail não enviado) */}
      {emailsPendentes.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span>{emailsPendentes.length} pedido(s) com recibo por e-mail pendente</span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                  Ação Necessária
                </span>
              </p>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Os pedidos foram confirmados mas os compradores ainda não receberam a confirmação detalhada com seus números da sorte.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              emailsPendentes.forEach((p) => handleReenviarEmail(p));
            }}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-md self-end sm:self-center"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Disparar Todos ({emailsPendentes.length})</span>
          </button>
        </div>
      )}

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
            Todos os Pedidos ({pedidosAtivos.length})
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

          <button
            onClick={() => { setVisualizacao('pedidos'); setFiltroStatus('expired'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
              visualizacao === 'pedidos' && filtroStatus === 'expired'
                ? 'bg-rose-500/80 text-white'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Expirados ({pedidosExpirados.length})</span>
          </button>

          {/* Atalho para Tabela Inferior de Pedidos Excluídos/Cancelados */}
          {pedidosCancelados.length > 0 && (
            <button
              type="button"
              onClick={() => {
                document.getElementById('secao-pedidos-cancelados')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30"
              title="Ir para a relação de pedidos excluídos e cancelados abaixo"
            >
              <Ban className="w-3.5 h-3.5 text-rose-400" />
              <span>Ver Cancelados ({pedidosCancelados.length}) ↓</span>
            </button>
          )}

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          {/* Botão de Alternar para Mapa Completo de 1.200 (se quiser consultar) */}
          <button
            onClick={() => setVisualizacao(visualizacao === 'pedidos' ? 'mapa' : 'pedidos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
              visualizacao === 'mapa'
                ? 'bg-[#D4AF37] text-black font-bold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
            title={`Ver mapa completo dos ${totalCotas.toLocaleString('pt-BR')} números`}
          >
            {visualizacao === 'mapa' ? <ListFilter className="w-3.5 h-3.5" /> : <Grid className="w-3.5 h-3.5" />}
            <span>{visualizacao === 'mapa' ? 'Voltar para Pedidos' : `Mapa ${totalCotas.toLocaleString('pt-BR')} Números`}</span>
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
        <div className="space-y-6">
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
                    <th className="px-4 py-3.5 font-semibold">Recibo E-mail</th>
                    <th className="px-4 py-3.5 font-semibold">Origem / ID MP</th>
                    <th className="px-4 py-3.5 font-semibold">Data/Hora</th>
                    <th className="px-4 py-3.5 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pedidosFiltrados.map((pedido) => {
                    const isPago = pedido.status === 'paid';
                    const isCancelado = pedido.status === 'cancelled';
                    const isExpirado = pedido.status === 'expired';
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
                              <button
                                type="button"
                                onClick={() => setPedidoParaRecibo({ ...pedido, dancer_name: bNome })}
                                className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                                title="Ver e Copiar Recibo Oficial (WhatsApp)"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>{pedido.customer_phone}</span>
                              </button>
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
                                      : isExpirado || isCancelado
                                        ? 'bg-white/5 text-slate-500 line-through'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
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
                          ) : isExpirado ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Expirado</span>
                            </span>
                          ) : isCancelado ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <Ban className="w-3.5 h-3.5 text-rose-400" />
                              <span>Cancelado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Aguardando Pix</span>
                            </span>
                          )}
                        </td>

                        {/* Recibo E-mail */}
                        <td className="px-4 py-3.5">
                          {isPago ? (
                            pedido.email_sent || pedido.email_status === 'sent' ? (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Enviado</span>
                                </span>
                                {pedido.email_sent_at && (
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(pedido.email_sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReenviarEmail(pedido)}
                                disabled={reenviandoEmailId === pedido.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition-colors cursor-pointer"
                                title="Disparar recibo oficial por e-mail agora"
                              >
                                <Mail className={`w-3 h-3 ${reenviandoEmailId === pedido.id ? 'animate-spin' : ''}`} />
                                <span>{reenviandoEmailId === pedido.id ? 'Enviando...' : 'Enviar Recibo'}</span>
                              </button>
                            )
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
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
                            {!isPago && !isCancelado && !isExpirado && (
                              <button
                                type="button"
                                onClick={() => handleDarBaixa(pedido.id, pedido.customer_name)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                title="Confirmar pagamento manualmente"
                              >
                                <Check className="w-3 h-3" />
                                <span>Dar Baixa</span>
                              </button>
                            )}

                            {isPago && (
                              <button
                                type="button"
                                onClick={() => handleReenviarEmail(pedido)}
                                disabled={reenviandoEmailId === pedido.id}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-sky-300 transition-colors cursor-pointer"
                                title="Reenviar recibo por e-mail"
                              >
                                <Mail className={`w-3.5 h-3.5 ${reenviandoEmailId === pedido.id ? 'animate-spin text-sky-400' : ''}`} />
                              </button>
                            )}

                            {/* Botão Cancelar/Excluir (Inclusive para pedidos pagos!) */}
                            {!isCancelado && (
                              <button
                                type="button"
                                onClick={() => abrirModalCancelar(pedido)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                                title={isPago ? "Cancelar pedido pago e liberar cotas" : "Cancelar/Excluir pedido e liberar cotas"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {isCancelado && (
                              <span className="text-[10px] text-rose-400 font-medium italic px-2 py-0.5 bg-rose-500/10 rounded-md border border-rose-500/20">
                                Cotas liberadas
                              </span>
                            )}

                            {isExpirado && (
                              <span className="text-[10px] text-slate-500 font-medium italic px-2 py-0.5 bg-white/5 rounded-md border border-white/5">
                                Expirado
                              </span>
                            )}

                            {/* Botão de Recibo / Mensagem WhatsApp */}
                            <button
                              type="button"
                              onClick={() => setPedidoParaRecibo({ ...pedido, dancer_name: bNome })}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors cursor-pointer"
                              title="Gerar e Copiar Recibo Oficial (WhatsApp)"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
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

        {/* RELAÇÃO DE PEDIDOS EXCLUÍDOS / CANCELADOS */}
        <div id="secao-pedidos-cancelados" className="rounded-2xl glass-card border border-rose-500/20 bg-rose-500/[0.015] p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                  <span>Relação de Pedidos Excluídos & Cancelados</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {pedidosCancelados.length}
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  Registro de auditoria com data/hora e identificação do usuário responsável pelo cancelamento e liberação de cotas.
                </p>
              </div>
            </div>
          </div>

          {pedidosCancelados.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic">
              Nenhum pedido cancelado ou excluído até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-black/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Comprador</th>
                    <th className="px-4 py-3 font-semibold">Cotas Liberadas</th>
                    <th className="px-4 py-3 font-semibold">Valor</th>
                    <th className="px-4 py-3 font-semibold">Data do Pedido</th>
                    <th className="px-4 py-3 font-semibold">Data/Hora Cancelamento</th>
                    <th className="px-4 py-3 font-semibold">Cancelado Por</th>
                    <th className="px-4 py-3 font-semibold">Motivo / Obs</th>
                    <th className="px-4 py-3 text-right font-semibold">Contato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pedidosCancelados.map((pedido) => {
                    const dataCancelamento = pedido.status_updated_at 
                      ? new Date(pedido.status_updated_at).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })
                      : '—';
                    const dataOriginal = new Date(pedido.created_at).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    });

                    return (
                      <tr key={pedido.id} className="hover:bg-rose-500/[0.03] transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-white text-sm">{pedido.customer_name}</p>
                          <div className="text-[11px] text-slate-400">{pedido.customer_phone || pedido.customer_email || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(pedido.selected_numbers) && pedido.selected_numbers.length > 0 ? (
                              pedido.selected_numbers.map((n: number) => (
                                <span key={n} className="px-2 py-0.5 rounded font-mono text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 line-through">
                                  #{n}
                                </span>
                              ))
                            ) : '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-300">
                          R$ {Number(pedido.total_price).toLocaleString('pt-BR')},00
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px]">{dataOriginal}</td>
                        <td className="px-4 py-3 text-rose-300 font-mono text-[11px] whitespace-nowrap">
                          {dataCancelamento}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/10 text-slate-200 border border-white/15">
                            <User className="w-3 h-3 text-[#00FF88]" />
                            <span>{pedido.status_updated_by || 'Administrador'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px] italic max-w-xs truncate">
                          {pedido.reason || 'Cancelamento administrativo de cotas'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPedidoParaRecibo({ ...pedido, dancer_name: 'Campanha Geral' })}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors inline-flex items-center cursor-pointer"
                              title="Gerar e Copiar Recibo Oficial (WhatsApp)"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPedidoParaExcluirPermanente(pedido)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors inline-flex items-center cursor-pointer"
                              title="Excluir Registro Definitivamente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      </div>
      ) : (
        /* VISUALIZAÇÃO SECUNDÁRIA: MAPA DOS 1.200 NÚMEROS (CONSULTA ESPECÍFICA) */
        <div className="rounded-2xl glass-card border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h4 className="font-cinzel text-base font-bold text-white">Mapa das Cotas ({totalCotas.toLocaleString('pt-BR')})</h4>
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

      {/* Modal de Confirmação de Cancelamento / Exclusão de Pedido */}
      {pedidoParaCancelar && (
        <Modal
          isOpen={!!pedidoParaCancelar}
          onClose={() => !processandoCancelamento && setPedidoParaCancelar(null)}
          title="Cancelar / Excluir Pedido"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {pedidoParaCancelar.status === 'paid' && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5">
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-rose-200 leading-relaxed">
                  <strong className="text-white block font-semibold mb-0.5">Atenção: Este pedido consta como PAGO!</strong>
                  Ao cancelar, o pagamento será desvinculado e os números voltarão a ficar <strong className="text-[#00FF88]">imediatamente disponíveis</strong> para venda no hotsite.
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Comprador:</span>
                <span className="font-bold text-white">{pedidoParaCancelar.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cotas a Liberar:</span>
                <span className="font-mono font-bold text-[#00FF88]">
                  {Array.isArray(pedidoParaCancelar.selected_numbers)
                    ? pedidoParaCancelar.selected_numbers.map((n: number) => `#${n}`).join(', ')
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valor Total:</span>
                <span className="font-bold text-white">
                  R$ {Number(pedidoParaCancelar.total_price).toLocaleString('pt-BR')},00
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status Atual:</span>
                <span className="font-semibold text-amber-300 uppercase text-[10px]">
                  {pedidoParaCancelar.status === 'paid' ? 'Pago' : pedidoParaCancelar.status === 'pending' ? 'Aguardando Pix' : pedidoParaCancelar.status}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Nome do Usuário Responsável pelo Cancelamento:
              </label>
              <input
                type="text"
                value={adminResponsavel}
                onChange={(e) => setAdminResponsavel(e.target.value)}
                placeholder="Ex: James Rizo"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Motivo / Justificativa do Cancelamento:
              </label>
              <input
                type="text"
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: Desistência do apoiador / Estorno / Teste operacional"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={processandoCancelamento}
                onClick={() => setPedidoParaCancelar(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={processandoCancelamento}
                onClick={handleConfirmarCancelamento}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg shadow-rose-900/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{processandoCancelamento ? 'Cancelando...' : 'Confirmar Cancelamento e Liberar Cotas'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Recibo & Mensagem Oficial WhatsApp */}
      <ModalReciboWhatsApp
        isOpen={!!pedidoParaRecibo}
        onClose={() => setPedidoParaRecibo(null)}
        tipo="cota"
        pedidoCota={pedidoParaRecibo}
      />

      {/* Modal de Exclusão Definitiva de Pedido Cancelado */}
      {pedidoParaExcluirPermanente && (
        <ConfirmModal
          isOpen={!!pedidoParaExcluirPermanente}
          onClose={() => !processandoCancelamento && setPedidoParaExcluirPermanente(null)}
          onConfirm={handleConfirmarExclusaoPermanente}
          title="Excluir Pedido Definitivamente"
          message={`Tem certeza que deseja apagar permanentemente o registro do pedido de "${pedidoParaExcluirPermanente.customer_name}"? Esta ação removerá o histórico da base de dados.`}
          confirmLabel={processandoCancelamento ? "Excluindo..." : "Sim, Excluir Definitivamente"}
          cancelLabel="Cancelar"
          isDestructive={true}
        />
      )}
    </div>
  );
};
