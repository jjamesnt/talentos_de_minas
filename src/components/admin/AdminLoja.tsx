import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { ModalReciboWhatsApp } from './ModalReciboWhatsApp';
import { otimizarFotoPremio, obterTamanhoKB } from '../../utils/imageOptimizer';
import type { PedidoLoja, ProdutoLoja } from '../../types';
import {
  ShoppingBag,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Search,
  Download,
  Trash2,
  Check,
  MessageCircle,
  Building2,
  Package,
  Plus,
  Edit3,
  Upload,
  X,
  Loader2,
  User,
  AlertOctagon,
  Tag
} from 'lucide-react';

export const AdminLoja: React.FC = () => {
  const { showToast } = useToast();
  const [subAba, setSubAba] = useState<'pedidos' | 'produtos'>('pedidos');

  // Estados de Pedidos
  const [pedidos, setPedidos] = useState<PedidoLoja[]>([]);
  const [carregandoPedidos, setCarregandoPedidos] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState('');

  // Ações de Pedido
  const [pedidoParaRecibo, setPedidoParaRecibo] = useState<PedidoLoja | null>(null);
  const [pedidoParaConfirmar, setPedidoParaConfirmar] = useState<PedidoLoja | null>(null);
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState<PedidoLoja | null>(null);
  const [pedidoParaExcluirPermanente, setPedidoParaExcluirPermanente] = useState<PedidoLoja | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [adminResponsavel, setAdminResponsavel] = useState(() => {
    try {
      const raw = localStorage.getItem('admin_usuario_atual');
      if (raw) {
        const u = JSON.parse(raw);
        return u.nome || 'Administrador';
      }
    } catch {}
    return 'Administrador';
  });
  const [processandoAcao, setProcessandoAcao] = useState(false);

  // Estados de Gestão de Produtos
  const [produtos, setProdutos] = useState<ProdutoLoja[]>([]);
  const [editandoProdutoId, setEditandoProdutoId] = useState<string | null>(null);
  const [prodNome, setProdNome] = useState('');
  const [prodDescricao, setProdDescricao] = useState('');
  const [prodPreco, setProdPreco] = useState('');
  const [prodFotoUrl, setProdFotoUrl] = useState('');
  const [prodTamanhos, setProdTamanhos] = useState('P, M, G, GG');
  const [prodEstoque, setProdEstoque] = useState('100');
  const [prodAtivo, setProdAtivo] = useState(true);
  const [isOtimizandoFoto, setIsOtimizandoFoto] = useState(false);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<ProdutoLoja | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formProdRef = useRef<HTMLDivElement>(null);

  // 1. Carrega pedidos da loja
  const carregarPedidos = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      setCarregandoPedidos(true);
      // Auto-expira pedidos pendentes com mais de 20 minutos
      try {
        await supabase.rpc('expirar_pedidos_loja_vencidos');
      } catch (_) {}

      const { data, error } = await supabase
        .from('loja_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPedidos(data);
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos da loja:', err);
    } finally {
      setCarregandoPedidos(false);
    }
  }, []);

  // 2. Carrega produtos da loja
  const carregarProdutos = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('produtos_loja')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        setProdutos(data);
      }
    } catch (err) {
      console.error('Erro ao buscar produtos da loja:', err);
    }
  }, []);

  useEffect(() => {
    carregarPedidos();
    carregarProdutos();

    const canalPedidos = supabase
      .channel('admin_loja_orders_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loja_orders' }, () => {
        carregarPedidos();
      })
      .subscribe();

    const canalProdutos = supabase
      .channel('admin_produtos_loja_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos_loja' }, () => {
        carregarProdutos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalPedidos);
      supabase.removeChannel(canalProdutos);
    };
  }, [carregarPedidos, carregarProdutos]);

  // Filtros de busca de pedidos (A lista superior exibe apenas pedidos ativos; cancelados vão para a auditoria inferior)
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      // Pedidos cancelados saem da lista superior e vão exclusivamente para a auditoria inferior
      if (p.status === 'cancelled') return false;

      const matchStatus = filtroStatus === 'todos' ? true : p.status === filtroStatus;
      const termo = busca.trim().toLowerCase();
      if (!termo) return matchStatus;

      const matchNome = p.customer_name?.toLowerCase().includes(termo);
      const matchEmail = p.customer_email?.toLowerCase().includes(termo);
      const matchPhone = p.customer_phone?.includes(termo);
      const matchProduto = p.produto_nome?.toLowerCase().includes(termo);
      const matchMpId = p.mp_payment_id?.toLowerCase().includes(termo);

      return matchStatus && (matchNome || matchEmail || matchPhone || matchProduto || matchMpId);
    });
  }, [pedidos, filtroStatus, busca]);

  const pedidosAtivos = pedidos.filter((p) => p.status !== 'cancelled');
  const pedidosPagos = pedidos.filter((p) => p.status === 'paid');
  const pedidosPendentes = pedidos.filter((p) => p.status === 'pending');
  const pedidosExpirados = pedidos.filter((p) => p.status === 'expired');
  const pedidosCancelados = pedidos.filter((p) => p.status === 'cancelled');
  const pedidosPendentesRetirada = pedidosPagos.filter((p) => !p.retirado);

  const totalArrecadadoLoja = pedidosPagos.reduce((acc, p) => acc + Number(p.total_price || 0), 0);

  // Ação: Confirmar pagamento manual de pedido da loja
  const handleConfirmarPagamentoManual = async () => {
    if (!pedidoParaConfirmar) return;

    try {
      setProcessandoAcao(true);
      const { error } = await supabase
        .from('loja_orders')
        .update({
          status: 'paid',
          payment_origin: 'manual',
          status_updated_by: adminResponsavel,
          status_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', pedidoParaConfirmar.id);

      if (error) throw error;

      showToast({
        type: 'success',
        title: 'Pagamento Confirmado',
        message: `Pedido de ${pedidoParaConfirmar.customer_name} marcado como PAGO.`,
      });
      setPedidoParaConfirmar(null);
      await carregarPedidos();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao Confirmar',
        message: err?.message || 'Falha ao atualizar status.',
      });
    } finally {
      setProcessandoAcao(false);
    }
  };

  // Ação: Alternar status de retirada na escola
  const handleAlternarRetirada = async (pedido: PedidoLoja) => {
    try {
      const novoStatus = !pedido.retirado;
      const { error } = await supabase
        .from('loja_orders')
        .update({
          retirado: novoStatus,
          retirado_em: novoStatus ? new Date().toISOString() : null,
          status_updated_by: adminResponsavel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pedido.id);

      if (error) throw error;

      showToast({
        type: 'info',
        title: novoStatus ? 'Item Retirado' : 'Retirada Pendente',
        message: novoStatus 
          ? `Produto entregue ao comprador na escola.` 
          : `Status de retirada desmarcado.`,
      });
      await carregarPedidos();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao Atualizar',
        message: err?.message || 'Não foi possível atualizar a retirada.',
      });
    }
  };

  // Ação: Cancelar / Excluir pedido da loja
  const handleConfirmarCancelamento = async () => {
    if (!pedidoParaCancelar) return;

    try {
      setProcessandoAcao(true);
      const { error } = await supabase
        .from('loja_orders')
        .update({
          status: 'cancelled',
          status_updated_by: adminResponsavel || 'Administrador',
          status_updated_at: new Date().toISOString(),
          reason: motivoCancelamento.trim() || 'Cancelamento administrativo de pedido da loja',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pedidoParaCancelar.id);

      if (error) throw error;

      showToast({
        type: 'success',
        title: 'Pedido Cancelado',
        message: `O pedido de ${pedidoParaCancelar.customer_name} foi cancelado com sucesso.`,
      });

      setPedidoParaCancelar(null);
      setMotivoCancelamento('');
      await carregarPedidos();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao Cancelar',
        message: err?.message || 'Falha ao cancelar pedido.',
      });
    } finally {
      setProcessandoAcao(false);
    }
  };

  // Ação: Exclusão definitiva de pedido da base de dados
  const handleConfirmarExclusaoPermanente = async () => {
    if (!pedidoParaExcluirPermanente) return;

    try {
      setProcessandoAcao(true);
      const { error } = await supabase
        .from('loja_orders')
        .delete()
        .eq('id', pedidoParaExcluirPermanente.id);

      if (error) throw error;

      showToast({
        type: 'success',
        title: 'Pedido Excluído Definitivamente',
        message: `O pedido de ${pedidoParaExcluirPermanente.customer_name} foi removido definitivamente do sistema.`,
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
      setProcessandoAcao(false);
    }
  };

  // Upload e compressão de foto de produto para WebP
  const handleUploadFotoProduto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({
        type: 'warning',
        title: 'Formato Inválido',
        message: 'Por favor, selecione uma imagem.',
      });
      return;
    }

    try {
      setIsOtimizandoFoto(true);
      const webpDataUrl = await otimizarFotoPremio(file, 800, 0.85);
      setProdFotoUrl(webpDataUrl);
      showToast({
        type: 'success',
        title: 'Foto Otimizada!',
        message: `Foto convertida para WebP (~${obterTamanhoKB(webpDataUrl)} KB).`,
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Erro na Foto',
        message: 'Não foi possível otimizar a imagem.',
      });
    } finally {
      setIsOtimizandoFoto(false);
    }
  };

  // Salvar / Editar Produto da Loja
  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    const precoNum = parseFloat(prodPreco.replace(',', '.'));

    if (!prodNome.trim()) {
      showToast({ type: 'warning', title: 'Campo Obrigatório', message: 'Informe o nome do produto.' });
      return;
    }

    if (isNaN(precoNum) || precoNum <= 0) {
      showToast({ type: 'warning', title: 'Preço Inválido', message: 'Informe um preço válido (ex: 79.90).' });
      return;
    }

    const tamanhosArray = prodTamanhos
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      setProcessandoAcao(true);

      const payload = {
        nome: prodNome.trim(),
        descricao: prodDescricao.trim(),
        preco: precoNum,
        foto_url: prodFotoUrl.trim() || null,
        estoque: parseInt(prodEstoque, 10) || 100,
        tamanhos_disponiveis: tamanhosArray.length > 0 ? tamanhosArray : ['Único'],
        ativo: prodAtivo,
        updated_at: new Date().toISOString(),
      };

      if (editandoProdutoId) {
        const { error } = await supabase
          .from('produtos_loja')
          .update(payload)
          .eq('id', editandoProdutoId);

        if (error) throw error;
        showToast({ type: 'success', title: 'Produto Atualizado', message: `Dados e preço de ${prodNome} atualizados!` });
      } else {
        const { error } = await supabase
          .from('produtos_loja')
          .insert([payload]);

        if (error) throw error;
        showToast({ type: 'success', title: 'Produto Cadastrado', message: `${prodNome} inserido no catálogo da loja!` });
      }

      handleLimparFormProduto();
      await carregarProdutos();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao Salvar', message: err?.message || 'Falha ao salvar produto.' });
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleIniciarEdicaoProduto = (p: ProdutoLoja) => {
    setEditandoProdutoId(p.id);
    setProdNome(p.nome);
    setProdDescricao(p.descricao || '');
    setProdPreco(String(p.preco));
    setProdFotoUrl(p.fotoUrl || (p as any).foto_url || '');
    setProdTamanhos((p.tamanhosDisponiveis || (p as any).tamanhos_disponiveis || []).join(', '));
    setProdEstoque(String(p.estoque ?? 100));
    setProdAtivo(p.ativo);

    if (formProdRef.current) {
      formProdRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLimparFormProduto = () => {
    setEditandoProdutoId(null);
    setProdNome('');
    setProdDescricao('');
    setProdPreco('');
    setProdFotoUrl('');
    setProdTamanhos('P, M, G, GG');
    setProdEstoque('100');
    setProdAtivo(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmarExclusaoProduto = async () => {
    if (!produtoParaExcluir) return;
    try {
      const { error } = await supabase
        .from('produtos_loja')
        .delete()
        .eq('id', produtoParaExcluir.id);

      if (error) throw error;
      showToast({ type: 'success', title: 'Produto Excluído', message: 'Item removido do catálogo.' });
      setProdutoParaExcluir(null);
      await carregarProdutos();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao Excluir', message: err?.message || 'Falha ao excluir produto.' });
    }
  };

  // Exportar Pedidos da Loja para CSV
  const handleExportarCsv = () => {
    if (pedidos.length === 0) {
      showToast({ type: 'info', title: 'Lista Vazia', message: 'Nenhum pedido para exportar.' });
      return;
    }

    const headers = [
      'ID_Pedido',
      'Cliente_Nome',
      'Cliente_Email',
      'Cliente_Telefone',
      'Produto',
      'Quantidade',
      'Tamanho',
      'Valor_Total',
      'Status_Pix',
      'Retirado_Na_Escola',
      'Origem_Pagamento',
      'ID_Mercado_Pago',
      'Data_Criacao',
      'Cancelado_Por',
      'Data_Cancelamento',
      'Motivo_Cancelamento',
    ];

    const rows = pedidos.map((p) => [
      p.id,
      `"${p.customer_name?.replace(/"/g, '""') || ''}"`,
      p.customer_email || '',
      p.customer_phone || '',
      `"${p.produto_nome?.replace(/"/g, '""') || ''}"`,
      p.quantidade || 1,
      p.tamanho || 'Único',
      p.total_price || 0,
      p.status,
      p.retirado ? 'SIM' : 'NÃO',
      p.payment_origin || '',
      p.mp_payment_id || '',
      p.created_at,
      `"${p.status_updated_by || ''}"`,
      p.status_updated_at || '',
      `"${p.reason || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pedidos_loja_talentos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#FF007F]/10 text-[#FF007F] border border-[#FF007F]/20">
              <ShoppingBag className="w-4 h-4" />
            </span>
            <h2 className="font-cinzel text-lg sm:text-xl font-bold text-white tracking-wide">
              Gestão da Loja Oficial & Pedidos Pix
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Controle de pagamentos Pix, autorização de entrega física na escola e gestão de preços e catálogo dos produtos.
          </p>
        </div>

        {/* Alternador de Sub-Abas */}
        <div className="flex items-center bg-black/50 border border-white/10 rounded-2xl p-1 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setSubAba('pedidos')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              subAba === 'pedidos'
                ? 'bg-[#00FF88] text-black font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Pedidos da Loja ({pedidos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubAba('produtos')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              subAba === 'produtos'
                ? 'bg-[#00FF88] text-black font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Gestão de Produtos ({produtos.length})</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SUB-ABA 1: CONTROLE DE PEDIDOS DA LOJA */}
      {/* ============================================================== */}
      {subAba === 'pedidos' && (
        <div className="space-y-6">
          {/* CARDS DE MÉTRICAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Total Arrecadado Loja</span>
                <DollarSign className="w-4 h-4 text-[#00FF88]" />
              </div>
              <p className="text-xl sm:text-2xl font-cinzel font-bold text-white">
                R$ {totalArrecadadoLoja.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Pedidos confirmados via Pix/Manual</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Pedidos Pagos</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl sm:text-2xl font-cinzel font-bold text-emerald-400">
                {pedidosPagos.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Prontos ou entregues ao comprador</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Aguardando Pix</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl sm:text-2xl font-cinzel font-bold text-amber-300">
                {pedidosPendentes.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Tempo limite de 20 min ativo</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Pendentes de Retirada</span>
                <Building2 className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-xl sm:text-2xl font-cinzel font-bold text-rose-300">
                {pedidosPendentesRetirada.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">A retirar na escola pelo comprador</p>
            </div>
          </div>

          {/* BARRA DE PESQUISA, FILTROS E EXPORTAÇÃO */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Abas de Filtro de Status */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => setFiltroStatus('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  filtroStatus === 'todos' ? 'bg-[#00FF88] text-black' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                Todos ({pedidosAtivos.length})
              </button>
              <button
                onClick={() => setFiltroStatus('paid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1 ${
                  filtroStatus === 'paid' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-emerald-400 hover:bg-white/10'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Pagos ({pedidosPagos.length})</span>
              </button>
              <button
                onClick={() => setFiltroStatus('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1 ${
                  filtroStatus === 'pending' ? 'bg-amber-500 text-black' : 'bg-white/5 text-amber-300 hover:bg-white/10'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Pendentes ({pedidosPendentes.length})</span>
              </button>
              <button
                onClick={() => setFiltroStatus('expired')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1 ${
                  filtroStatus === 'expired' ? 'bg-rose-500 text-white' : 'bg-white/5 text-rose-400 hover:bg-white/10'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Expirados ({pedidosExpirados.length})</span>
              </button>
              {pedidosCancelados.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('secao-pedidos-loja-cancelados')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  title="Ir para a relação de pedidos excluídos e cancelados abaixo"
                >
                  <Ban className="w-3 h-3 text-rose-400" />
                  <span>Ver Cancelados ({pedidosCancelados.length}) ↓</span>
                </button>
              )}
            </div>

            {/* Busca e Exportação */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar comprador, item, ID..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#00FF88]"
                />
              </div>

              <button
                type="button"
                onClick={handleExportarCsv}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Exportar pedidos da loja para CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </div>
          </div>

          {/* TABELA DE PEDIDOS ATIVOS */}
          <div className="rounded-3xl bg-[#0F1412] border border-white/10 overflow-hidden shadow-2xl">
            {carregandoPedidos ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 text-[#00FF88] animate-spin" />
                <span>Carregando pedidos da loja...</span>
              </div>
            ) : pedidosFiltrados.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhum pedido encontrado com os filtros aplicados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-black/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Comprador</th>
                      <th className="px-4 py-3 font-semibold">Produto & Detalhes</th>
                      <th className="px-4 py-3 font-semibold">Valor Total</th>
                      <th className="px-4 py-3 font-semibold">Status Pix</th>
                      <th className="px-4 py-3 font-semibold">Retirada na Escola</th>
                      <th className="px-4 py-3 font-semibold">Origem / ID MP</th>
                      <th className="px-4 py-3 font-semibold">Data/Hora</th>
                      <th className="px-4 py-3 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pedidosFiltrados.map((pedido) => {
                      const isPago = pedido.status === 'paid';
                      const isPendente = pedido.status === 'pending';
                      const isCancelado = pedido.status === 'cancelled';
                      const isExpirado = pedido.status === 'expired';

                      const dataFormatada = new Date(pedido.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr key={pedido.id} className="hover:bg-white/[0.02] transition-colors">
                          {/* Comprador */}
                          <td className="px-4 py-3">
                            <p className="font-bold text-white text-sm">{pedido.customer_name}</p>
                            {pedido.customer_phone ? (
                              <button
                                type="button"
                                onClick={() => setPedidoParaRecibo(pedido)}
                                className="text-[11px] text-emerald-400 hover:underline font-mono flex items-center gap-1 cursor-pointer"
                                title="Gerar e Copiar Recibo Oficial (WhatsApp)"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>{pedido.customer_phone}</span>
                              </button>
                            ) : (
                              <p className="text-[11px] text-slate-400 font-mono">
                                {pedido.customer_email || '—'}
                              </p>
                            )}
                          </td>

                          {/* Produto */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-bold text-[11px]">
                                {pedido.quantidade}x
                              </span>
                              <div>
                                <p className="font-medium text-white">{pedido.produto_nome}</p>
                                <p className="text-[10px] text-slate-400">
                                  Tamanho: <strong className="text-slate-300">{pedido.tamanho || 'Único'}</strong>
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Valor */}
                          <td className="px-4 py-3 font-mono font-bold text-white text-sm">
                            R$ {Number(pedido.total_price).toFixed(2).replace('.', ',')}
                          </td>

                          {/* Status Pix */}
                          <td className="px-4 py-3">
                            {isPago && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Pago</span>
                              </span>
                            )}
                            {isPendente && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Aguardando Pix</span>
                              </span>
                            )}
                            {isExpirado && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Expirado</span>
                              </span>
                            )}
                            {isCancelado && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-700/50 text-slate-400 border border-white/10">
                                <Ban className="w-3 h-3" />
                                <span>Cancelado</span>
                              </span>
                            )}
                          </td>

                          {/* Retirada na Escola */}
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleAlternarRetirada(pedido)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                                pedido.retirado
                                  ? 'bg-emerald-500/20 text-[#00FF88] border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                              }`}
                              title="Clique para alternar status de retirada presencial na escola"
                            >
                              <Building2 className="w-3.5 h-3.5 shrink-0" />
                              <span>{pedido.retirado ? 'Retirado na Escola' : 'Pendente Retirada'}</span>
                            </button>
                          </td>

                          {/* Origem / ID MP */}
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                            {pedido.mp_payment_id ? (
                              <span className="text-slate-300 font-mono">
                                #{pedido.mp_payment_id}
                              </span>
                            ) : (
                              <span className="text-slate-500">
                                {pedido.payment_origin === 'manual' ? 'Baixa Manual' : 'Pendente de ID'}
                              </span>
                            )}
                          </td>

                          {/* Data/Hora */}
                          <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                            {dataFormatada}
                          </td>

                          {/* Ações */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Baixa Manual (quando pendente) */}
                              {isPendente && (
                                <button
                                  type="button"
                                  onClick={() => setPedidoParaConfirmar(pedido)}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                                  title="Confirmar pagamento manualmente"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* WhatsApp / Recibo Oficial */}
                              <button
                                type="button"
                                onClick={() => setPedidoParaRecibo(pedido)}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                                title="Gerar e Copiar Recibo Oficial (WhatsApp)"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>

                              {/* Cancelar / Excluir Pedido */}
                              {!isCancelado && (
                                <button
                                  type="button"
                                  onClick={() => setPedidoParaCancelar(pedido)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                                  title="Cancelar / Excluir Pedido da Loja"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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

          {/* ============================================================== */}
          {/* TABELA DE AUDITORIA: RELAÇÃO DE PEDIDOS DA LOJA CANCELADOS */}
          {/* ============================================================== */}
          <div id="secao-pedidos-loja-cancelados" className="rounded-3xl bg-[#0F1412] border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                    <span>Relação de Pedidos da Loja Excluídos & Cancelados</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {pedidosCancelados.length}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Auditoria com registro de data/hora, justificativa e usuário responsável pela anulação.
                  </p>
                </div>
              </div>
            </div>

            {pedidosCancelados.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                Nenhum pedido da loja cancelado ou excluído até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-black/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Comprador</th>
                      <th className="px-4 py-3 font-semibold">Produto</th>
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
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '—';

                      const dataOriginal = new Date(pedido.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr key={pedido.id} className="hover:bg-rose-500/[0.03] transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-bold text-white text-sm">{pedido.customer_name}</p>
                            <p className="text-[11px] text-slate-400">{pedido.customer_phone || pedido.customer_email || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-200">
                              {pedido.quantidade}x {pedido.produto_nome} ({pedido.tamanho || 'Único'})
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-medium text-slate-300">
                            R$ {Number(pedido.total_price).toFixed(2).replace('.', ',')}
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
                            {pedido.reason || 'Cancelamento administrativo de pedido'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPedidoParaRecibo(pedido)}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors inline-flex items-center cursor-pointer"
                                title="Gerar e Copiar Recibo Oficial (WhatsApp)"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPedidoParaExcluirPermanente(pedido)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors inline-flex items-center cursor-pointer"
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
      )}

      {/* ============================================================== */}
      {/* SUB-ABA 2: GESTÃO DO CATÁLOGO DE PRODUTOS E PREÇOS */}
      {/* ============================================================== */}
      {subAba === 'produtos' && (
        <div className="space-y-6">
          {/* Formulário de Produto */}
          <div
            ref={formProdRef}
            className={`rounded-3xl p-5 sm:p-6 border transition-all ${
              editandoProdutoId ? 'bg-[#0F1D15] border-[#00FF88]/40 shadow-xl' : 'bg-[#0F1412] border-white/10'
            }`}
          >
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                {editandoProdutoId ? <Edit3 className="w-4 h-4 text-[#00FF88]" /> : <Plus className="w-4 h-4 text-[#00FF88]" />}
                <h3 className="font-cinzel text-base font-bold text-white">
                  {editandoProdutoId ? 'Editar Produto da Loja' : 'Cadastrar Novo Produto na Loja'}
                </h3>
              </div>

              {editandoProdutoId && (
                <button
                  type="button"
                  onClick={handleLimparFormProduto}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancelar Edição</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSalvarProduto} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                {/* Nome */}
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nome do Produto: <span className="text-[#00FF88]">*</span>
                  </label>
                  <input
                    type="text"
                    value={prodNome}
                    onChange={(e) => setProdNome(e.target.value)}
                    placeholder="Ex: Camiseta Oficial Wicked 2026"
                    className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-[#00FF88]"
                    required
                  />
                </div>

                {/* Preço */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Preço (R$): <span className="text-[#00FF88]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                    <input
                      type="text"
                      value={prodPreco}
                      onChange={(e) => setProdPreco(e.target.value)}
                      placeholder="79,90"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-mono font-bold focus:outline-none focus:border-[#00FF88]"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Atualiza na vitrine pública instantaneamente.</p>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Descrição do Produto:
                </label>
                <input
                  type="text"
                  value={prodDescricao}
                  onChange={(e) => setProdDescricao(e.target.value)}
                  placeholder="Ex: Algodão egípcio com estampa em foil metálico esmeralda e dourado."
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-[#00FF88]"
                />
              </div>

              {/* Upload de Foto WebP */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Foto do Produto (Upload com Otimização WebP):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-8">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleUploadFotoProduto}
                      className="hidden"
                      id="upload-prod-foto"
                    />
                    <label
                      htmlFor="upload-prod-foto"
                      className="border-2 border-dashed border-white/15 hover:border-[#00FF88]/50 rounded-2xl p-4 flex items-center justify-center gap-3 cursor-pointer bg-black/30 hover:bg-black/50 transition-all text-center"
                    >
                      {isOtimizandoFoto ? (
                        <div className="flex items-center gap-2 text-xs text-[#00FF88]">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Convertendo para WebP ultraleve...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-[#00FF88]" />
                          <span className="text-xs text-slate-300">Selecionar foto do computador / celular</span>
                        </>
                      )}
                    </label>
                  </div>

                  <div className="sm:col-span-4">
                    {prodFotoUrl ? (
                      <div className="relative h-16 w-28 rounded-xl overflow-hidden border border-[#00FF88]/40 bg-black/60 group">
                        <img src={prodFotoUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setProdFotoUrl('')}
                          className="absolute top-1 right-1 p-1 rounded-lg bg-black/80 hover:bg-rose-600 text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Sem foto personalizada</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tamanhos e Estoque */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Tamanhos Disponíveis (separados por vírgula):
                  </label>
                  <input
                    type="text"
                    value={prodTamanhos}
                    onChange={(e) => setProdTamanhos(e.target.value)}
                    placeholder="P, M, G, GG ou Único"
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-[#00FF88]"
                  />
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={prodAtivo}
                      onChange={(e) => setProdAtivo(e.target.checked)}
                      className="w-4 h-4 rounded text-[#00FF88] focus:ring-[#00FF88] bg-black/60 border-white/20"
                    />
                    <span className="text-xs text-white font-semibold">Produto Ativo na Loja Pública</span>
                  </label>
                </div>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                {editandoProdutoId && (
                  <button
                    type="button"
                    onClick={handleLimparFormProduto}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={processandoAcao}
                  className="px-6 py-2.5 rounded-xl bg-[#00FF88] hover:bg-[#33ff9f] text-black text-xs font-bold font-cinzel uppercase tracking-wider glow-oz transition-all cursor-pointer shadow-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editandoProdutoId ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Produtos Cadastrados */}
          <div className="rounded-3xl bg-[#0F1412] border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                <span>Catálogo de Produtos</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#00FF88]/15 text-[#00FF88] border border-[#00FF88]/30">
                  {produtos.length}
                </span>
              </h3>
            </div>

            <div className="divide-y divide-white/5">
              {produtos.map((p) => (
                <div key={p.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0 flex items-center justify-center">
                      {p.fotoUrl || (p as any).foto_url ? (
                        <img src={p.fotoUrl || (p as any).foto_url} alt={p.nome} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-6 h-6 text-[#FF007F]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{p.nome}</h4>
                      <p className="text-xs text-slate-400 line-clamp-1">{p.descricao || 'Sem descrição'}</p>
                      <p className="text-xs font-mono font-bold text-[#00FF88] mt-0.5">
                        R$ {Number(p.preco).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleIniciarEdicaoProduto(p)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                      title="Editar preço e dados do produto"
                    >
                      <Edit3 className="w-4 h-4 text-[#00FF88]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProdutoParaExcluir(p)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                      title="Excluir produto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE PAGAMENTO MANUAL */}
      {pedidoParaConfirmar && (
        <Modal
          isOpen={!!pedidoParaConfirmar}
          onClose={() => !processandoAcao && setPedidoParaConfirmar(null)}
          title="Confirmar Pagamento Manual"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Você está prestes a dar baixa manual no pedido de{' '}
              <strong className="text-white">{pedidoParaConfirmar.customer_name}</strong> referente a{' '}
              <strong className="text-white">{pedidoParaConfirmar.quantidade}x {pedidoParaConfirmar.produto_nome}</strong> no valor de{' '}
              <strong className="text-[#00FF88]">R$ {Number(pedidoParaConfirmar.total_price).toFixed(2).replace('.', ',')}</strong>.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                disabled={processandoAcao}
                onClick={() => setPedidoParaConfirmar(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={processandoAcao}
                onClick={handleConfirmarPagamentoManual}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {processandoAcao ? 'Confirmando...' : 'Confirmar como Pago'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL DE CANCELAMENTO / EXCLUSÃO DE PEDIDO DA LOJA */}
      {pedidoParaCancelar && (
        <Modal
          isOpen={!!pedidoParaCancelar}
          onClose={() => !processandoAcao && setPedidoParaCancelar(null)}
          title="Cancelar / Excluir Pedido da Loja"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {pedidoParaCancelar.status === 'paid' && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5">
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-rose-200 leading-relaxed">
                  <strong className="text-white block font-semibold mb-0.5">Atenção: Este pedido consta como PAGO!</strong>
                  Ao cancelar, o pedido da loja será anulado e enviado para a relação de auditoria de pedidos cancelados.
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Comprador:</span>
                <span className="font-bold text-white">{pedidoParaCancelar.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Item:</span>
                <span className="font-bold text-[#00FF88]">
                  {pedidoParaCancelar.quantidade}x {pedidoParaCancelar.produto_nome} ({pedidoParaCancelar.tamanho || 'Único'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valor Total:</span>
                <span className="font-bold text-white">
                  R$ {Number(pedidoParaCancelar.total_price).toFixed(2).replace('.', ',')}
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
                placeholder="Ex: Desistência do comprador / Estorno solicitado / Erro operacional"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                disabled={processandoAcao}
                onClick={() => setPedidoParaCancelar(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={processandoAcao}
                onClick={handleConfirmarCancelamento}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{processandoAcao ? 'Cancelando...' : 'Confirmar Cancelamento'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL DE EXCLUSÃO DE PRODUTO */}
      {produtoParaExcluir && (
        <ConfirmModal
          isOpen={!!produtoParaExcluir}
          onClose={() => setProdutoParaExcluir(null)}
          onConfirm={handleConfirmarExclusaoProduto}
          title="Excluir Produto"
          message={`Tem certeza que deseja excluir o produto "${produtoParaExcluir.nome}" do catálogo da loja?`}
          confirmLabel="Sim, Excluir Produto"
          cancelLabel="Cancelar"
          isDestructive={true}
        />
      )}

      {/* MODAL DE EXCLUSÃO PERMANENTE DE PEDIDO CANCELADO */}
      {pedidoParaExcluirPermanente && (
        <ConfirmModal
          isOpen={!!pedidoParaExcluirPermanente}
          onClose={() => !processandoAcao && setPedidoParaExcluirPermanente(null)}
          onConfirm={handleConfirmarExclusaoPermanente}
          title="Excluir Pedido Definitivamente"
          message={`Tem certeza que deseja apagar permanentemente o registro do pedido de "${pedidoParaExcluirPermanente.customer_name}" (${pedidoParaExcluirPermanente.quantidade}x ${pedidoParaExcluirPermanente.produto_nome})? Esta ação não pode ser desfeita.`}
          confirmLabel={processandoAcao ? "Excluindo..." : "Sim, Excluir Definitivamente"}
          cancelLabel="Cancelar"
          isDestructive={true}
        />
      )}

      {/* MODAL DE RECIBO & MENSAGEM OFICIAL WHATSAPP */}
      <ModalReciboWhatsApp
        isOpen={!!pedidoParaRecibo}
        onClose={() => setPedidoParaRecibo(null)}
        tipo="loja"
        pedidoLoja={pedidoParaRecibo}
      />
    </div>
  );
};
