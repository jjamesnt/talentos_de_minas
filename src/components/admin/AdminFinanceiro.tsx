import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { useCampanha } from '../../hooks/useCampanha';
import { Modal } from '../common/Modal';
import { otimizarFotoPremio } from '../../utils/imageOptimizer';
import type { DespesaFinanceira, DespesaExcluidaRecord, CategoriaDespesa, PedidoLoja } from '../../types';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Search,
  Download,
  Trash2,
  Edit3,
  Receipt,
  Upload,
  X,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Eye,
  ShoppingBag,
  Ticket,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  ListOrdered,
  RefreshCw,
  UserCheck,
  Ban,
  RotateCcw,
  User
} from 'lucide-react';

interface RaffleOrderRecord {
  id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  selected_numbers?: number[];
  total_price?: number;
  bailarino_id?: string;
  status: string;
  status_updated_by?: string;
  status_updated_at?: string;
  created_at: string;
  updated_at?: string;
}

const CATEGORIAS_DESPESA: { label: string; valor: CategoriaDespesa; cor: string }[] = [
  { label: 'Produção Wicked', valor: 'Produção Wicked', cor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { label: 'Figurinos & Adereços', valor: 'Figurinos & Adereços', cor: 'bg-pink-500/10 text-pink-400 border-pink-500/30' },
  { label: 'Produtos/Loja', valor: 'Produtos/Loja', cor: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { label: 'Marketing & Divulgação', valor: 'Marketing & Divulgação', cor: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  { label: 'Taxas Bancárias & Gateway', valor: 'Taxas Bancárias & Gateway', cor: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { label: 'Transporte & Logística', valor: 'Transporte & Logística', cor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
  { label: 'Alimentação', valor: 'Alimentação', cor: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  { label: 'Espaço & Locação', valor: 'Espaço & Locação', cor: 'bg-teal-500/10 text-teal-400 border-teal-500/30' },
  { label: 'Outros', valor: 'Outros', cor: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
];

interface TransacaoFluxo {
  id: string;
  tipo: 'entrada_cota' | 'entrada_loja' | 'saida_despesa';
  data: string;
  titulo: string;
  descricao?: string;
  categoria: string;
  origem: string;
  responsavel?: string;
  valor: number;
  comprovante_url?: string | null;
  despesaRef?: DespesaFinanceira;
}

export const AdminFinanceiro: React.FC = () => {
  const { showToast } = useToast();
  const { bailarinos } = useCampanha();

  // Estados principais
  const [subAba, setSubAba] = useState<'extrato' | 'despesas' | 'demonstrativo'>('extrato');
  const [carregando, setCarregando] = useState(false);
  const [atualizandoRealtime, setAtualizandoRealtime] = useState(false);

  // Dados brutos
  const [pedidosRifa, setPedidosRifa] = useState<RaffleOrderRecord[]>([]);
  const [pedidosLoja, setPedidosLoja] = useState<PedidoLoja[]>([]);
  const [despesas, setDespesas] = useState<DespesaFinanceira[]>([]);

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroTipoFluxo, setFiltroTipoFluxo] = useState<'todos' | 'entradas' | 'saidas'>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroPeriodo, setFiltroPeriodo] = useState<'todos' | '7dias' | '30dias' | 'mes_atual'>('todos');

  // Modal de Lançamento / Edição de Despesa
  const [modalDespesaAberto, setModalDespesaAberto] = useState(false);
  const [despesaEmEdicao, setDespesaEmEdicao] = useState<DespesaFinanceira | null>(null);
  const [salvandoDespesa, setSalvandoDespesa] = useState(false);

  // Campos do formulário de despesa
  const [formTitulo, setFormTitulo] = useState('');
  const [formCategoria, setFormCategoria] = useState<CategoriaDespesa>('Produção Wicked');
  const [formValor, setFormValor] = useState('');
  const [formData, setFormData] = useState(() => new Date().toISOString().split('T')[0]);
  const [formDescricao, setFormDescricao] = useState('');
  const [formComprovanteUrl, setFormComprovanteUrl] = useState('');
  const [comprimindoFoto, setComprimindoFoto] = useState(false);

  // Modal de Exclusão de Despesa com Auditoria
  const [despesaParaExcluir, setDespesaParaExcluir] = useState<DespesaFinanceira | null>(null);
  const [excluindoDespesa, setExcluindoDespesa] = useState(false);
  const [adminResponsavelExclusao, setAdminResponsavelExclusao] = useState('');
  const [motivoExclusao, setMotivoExclusao] = useState('');

  // Histórico de Despesas Excluídas (Auditoria Permanente)
  const [despesasExcluidas, setDespesasExcluidas] = useState<DespesaExcluidaRecord[]>(() => {
    try {
      const raw = localStorage.getItem('financeiro_despesas_excluidas');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('financeiro_despesas_excluidas', JSON.stringify(despesasExcluidas));
    } catch {}
  }, [despesasExcluidas]);

  // Modal de Visualização de Comprovante
  const [comprovanteVisualizar, setComprovanteVisualizar] = useState<{ url: string; titulo: string } | null>(null);

  // Admin Responsável Logado
  const adminNome = useMemo(() => {
    try {
      const raw = localStorage.getItem('admin_usuario_atual');
      if (raw) {
        const u = JSON.parse(raw);
        return u.nome || 'Administrador';
      }
    } catch {}
    return 'Administrador';
  }, []);

  // Carregar todos os dados financeiros
  const carregarDadosFinanceiros = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    else setAtualizandoRealtime(true);

    try {
      // 1. Pedidos da Rifa pagos
      const { data: dadosRifa, error: erroRifa } = await supabase
        .from('raffle_orders')
        .select('*')
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      if (erroRifa) {
        console.warn('Erro ao carregar pedidos da rifa:', erroRifa);
      } else if (dadosRifa) {
        setPedidosRifa(dadosRifa as RaffleOrderRecord[]);
      }

      // 2. Pedidos da Loja pagos
      const { data: dadosLoja, error: erroLoja } = await supabase
        .from('loja_orders')
        .select('*')
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      if (erroLoja) {
        console.warn('Erro ao carregar pedidos da loja:', erroLoja);
      } else if (dadosLoja) {
        setPedidosLoja(dadosLoja as PedidoLoja[]);
      }

      // 3. Despesas Avulsas
      const { data: dadosDespesas, error: erroDespesas } = await supabase
        .from('financeiro_despesas')
        .select('*')
        .order('data_despesa', { ascending: false });

      if (erroDespesas) {
        console.warn('Erro ao carregar despesas:', erroDespesas);
      } else if (dadosDespesas) {
        setDespesas(dadosDespesas as DespesaFinanceira[]);
      }
    } catch (err) {
      console.error('Erro geral ao carregar dados financeiros:', err);
      showToast({
        type: 'error',
        title: 'Falha na Carga Financeira',
        message: 'Não foi possível carregar os registros financeiros atualizados.'
      });
    } finally {
      setCarregando(false);
      setAtualizandoRealtime(false);
    }
  }, [showToast]);

  useEffect(() => {
    carregarDadosFinanceiros();

    // Inscrever em canais realtime
    const canalRifa = supabase
      .channel('financeiro_realtime_rifa')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'raffle_orders' }, () => {
        carregarDadosFinanceiros(true);
      })
      .subscribe();

    const canalLoja = supabase
      .channel('financeiro_realtime_loja')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loja_orders' }, () => {
        carregarDadosFinanceiros(true);
      })
      .subscribe();

    const canalDespesas = supabase
      .channel('financeiro_realtime_despesas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financeiro_despesas' }, () => {
        carregarDadosFinanceiros(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalRifa);
      supabase.removeChannel(canalLoja);
      supabase.removeChannel(canalDespesas);
    };
  }, [carregarDadosFinanceiros]);

  // Cálculos de Totais Gerais
  const totais = useMemo(() => {
    // 1. Receita das Cotas da Rifa
    const receitaRifa = pedidosRifa.reduce((acc, p) => {
      const qtdCotas = p.selected_numbers?.length || 1;
      const vlr = p.total_price !== undefined ? Number(p.total_price) : qtdCotas * 25;
      return acc + (isNaN(vlr) ? 0 : vlr);
    }, 0);
    const totalCotasPagas = pedidosRifa.reduce((acc, p) => acc + (p.selected_numbers?.length || 1), 0);

    // 2. Receita da Loja Oficial
    const receitaLoja = pedidosLoja.reduce((acc, p) => {
      const vlr = p.total_price !== undefined ? Number(p.total_price) : 0;
      return acc + (isNaN(vlr) ? 0 : vlr);
    }, 0);
    const totalItensLoja = pedidosLoja.reduce((acc, p) => acc + (Number(p.quantidade) || 1), 0);

    // 3. Receita Bruta Total
    const receitaBruta = receitaRifa + receitaLoja;

    // 4. Total de Despesas Avulsas
    const totalDespesas = despesas.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);

    // 5. Saldo Líquido em Caixa
    const saldoLiquido = receitaBruta - totalDespesas;

    return {
      receitaRifa,
      totalCotasPagas,
      receitaLoja,
      totalItensLoja,
      receitaBruta,
      totalDespesas,
      saldoLiquido,
    };
  }, [pedidosRifa, pedidosLoja, despesas]);

  // Montar Extrato Cronológico Unificado de Entradas e Saídas
  const transacoesFluxo = useMemo(() => {
    const lista: TransacaoFluxo[] = [];

    // Entradas: Pedidos da Rifa
    pedidosRifa.forEach((p) => {
      const qtd = p.selected_numbers?.length || 1;
      const valor = p.total_price !== undefined ? Number(p.total_price) : qtd * 25;
      const bNome = bailarinos.find((b) => b.id === p.bailarino_id)?.nome || 'Geral';
      lista.push({
        id: `rifa-${p.id}`,
        tipo: 'entrada_cota',
        data: p.created_at,
        titulo: `Cota Rifa (#${p.id.slice(0, 8)})`,
        descricao: `${qtd} cota(s) [${(p.selected_numbers || []).slice(0, 5).join(', ')}${(p.selected_numbers || []).length > 5 ? '...' : ''}] - Apoiando: ${bNome}`,
        categoria: 'Rifa Beneficente',
        origem: p.customer_name || 'Comprador Anônimo',
        responsavel: p.status_updated_by || 'Gateway PIX',
        valor: valor,
      });
    });

    // Entradas: Pedidos da Loja
    pedidosLoja.forEach((p) => {
      lista.push({
        id: `loja-${p.id}`,
        tipo: 'entrada_loja',
        data: p.created_at,
        titulo: `Venda Loja: ${p.produto_nome || 'Produto'}`,
        descricao: `Qtd: ${p.quantidade || 1}${p.tamanho ? ` | Tam: ${p.tamanho}` : ''} | Retirada na Escola: ${p.retirado ? 'Entregue' : 'Pendente'}`,
        categoria: 'Loja Oficial',
        origem: p.customer_name || 'Comprador Anônimo',
        responsavel: p.status_updated_by || 'Gateway PIX',
        valor: Number(p.total_price) || 0,
      });
    });

    // Saídas: Despesas Avulsas
    despesas.forEach((d) => {
      lista.push({
        id: `despesa-${d.id}`,
        tipo: 'saida_despesa',
        data: d.data_despesa ? `${d.data_despesa}T12:00:00` : d.created_at,
        titulo: d.titulo,
        descricao: d.descricao || 'Sem descrição informada',
        categoria: d.categoria,
        origem: 'Despesa Avulsa',
        responsavel: d.criado_por || 'Admin',
        valor: Number(d.valor) || 0,
        comprovante_url: d.comprovante_url,
        despesaRef: d,
      });
    });

    // Ordenar do mais recente para o mais antigo
    return lista.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [pedidosRifa, pedidosLoja, despesas, bailarinos]);

  // Filtragem do Extrato
  const transacoesFiltradas = useMemo(() => {
    return transacoesFluxo.filter((t) => {
      // Filtro Tipo
      if (filtroTipoFluxo === 'entradas' && t.tipo === 'saida_despesa') return false;
      if (filtroTipoFluxo === 'saidas' && t.tipo !== 'saida_despesa') return false;

      // Filtro Categoria
      if (filtroCategoria !== 'todas') {
        if (t.tipo === 'saida_despesa' && t.categoria !== filtroCategoria) return false;
        if (t.tipo === 'entrada_cota' && filtroCategoria !== 'Rifa Beneficente') return false;
        if (t.tipo === 'entrada_loja' && filtroCategoria !== 'Loja Oficial') return false;
      }

      // Filtro Período
      if (filtroPeriodo !== 'todos') {
        const dataTransacao = new Date(t.data).getTime();
        const agora = new Date().getTime();
        if (filtroPeriodo === '7dias' && agora - dataTransacao > 7 * 24 * 60 * 60 * 1000) return false;
        if (filtroPeriodo === '30dias' && agora - dataTransacao > 30 * 24 * 60 * 60 * 1000) return false;
        if (filtroPeriodo === 'mes_atual') {
          const dTrans = new Date(t.data);
          const dHoje = new Date();
          if (dTrans.getMonth() !== dHoje.getMonth() || dTrans.getFullYear() !== dHoje.getFullYear()) return false;
        }
      }

      // Filtro Busca
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const matchesTitulo = t.titulo.toLowerCase().includes(termo);
        const matchesDesc = (t.descricao || '').toLowerCase().includes(termo);
        const matchesOrigem = (t.origem || '').toLowerCase().includes(termo);
        const matchesResp = (t.responsavel || '').toLowerCase().includes(termo);
        const matchesCat = t.categoria.toLowerCase().includes(termo);
        if (!matchesTitulo && !matchesDesc && !matchesOrigem && !matchesResp && !matchesCat) {
          return false;
        }
      }

      return true;
    });
  }, [transacoesFluxo, filtroTipoFluxo, filtroCategoria, filtroPeriodo, busca]);

  // Filtragem das Despesas Avulsas
  const despesasFiltradas = useMemo(() => {
    return despesas.filter((d) => {
      if (filtroCategoria !== 'todas' && d.categoria !== filtroCategoria) return false;
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const matchTitulo = d.titulo.toLowerCase().includes(termo);
        const matchDesc = (d.descricao || '').toLowerCase().includes(termo);
        const matchResp = (d.criado_por || '').toLowerCase().includes(termo);
        if (!matchTitulo && !matchDesc && !matchResp) return false;
      }
      return true;
    });
  }, [despesas, filtroCategoria, busca]);

  // Agrupamento de Despesas por Categoria para Demonstrativo
  const demonstrativoCategorias = useMemo(() => {
    const mapa: Record<string, { total: number; quantidade: number }> = {};

    despesas.forEach((d) => {
      const cat = d.categoria || 'Outros';
      if (!mapa[cat]) {
        mapa[cat] = { total: 0, quantidade: 0 };
      }
      mapa[cat].total += Number(d.valor) || 0;
      mapa[cat].quantidade += 1;
    });

    return Object.entries(mapa).map(([categoria, dados]) => ({
      categoria,
      total: dados.total,
      quantidade: dados.quantidade,
      percentual: totais.totalDespesas > 0 ? (dados.total / totais.totalDespesas) * 100 : 0,
    })).sort((a, b) => b.total - a.total);
  }, [despesas, totais.totalDespesas]);

  // Abertura do formulário de criação
  const abrirNovaDespesa = () => {
    setDespesaEmEdicao(null);
    setFormTitulo('');
    setFormCategoria('Produção Wicked');
    setFormValor('');
    setFormData(new Date().toISOString().split('T')[0]);
    setFormDescricao('');
    setFormComprovanteUrl('');
    setModalDespesaAberto(true);
  };

  // Abertura do formulário de edição
  const abrirEditarDespesa = (d: DespesaFinanceira) => {
    setDespesaEmEdicao(d);
    setFormTitulo(d.titulo);
    setFormCategoria(d.categoria as CategoriaDespesa);
    setFormValor(String(d.valor));
    setFormData(d.data_despesa ? d.data_despesa.split('T')[0] : new Date().toISOString().split('T')[0]);
    setFormDescricao(d.descricao || '');
    setFormComprovanteUrl(d.comprovante_url || '');
    setModalDespesaAberto(true);
  };

  // Upload e compressão de foto de comprovante
  const handleUploadComprovante = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    try {
      setComprimindoFoto(true);
      const webpBase64 = await otimizarFotoPremio(arquivo);
      setFormComprovanteUrl(webpBase64);
      showToast({
        type: 'success',
        title: 'Comprovante Processado',
        message: 'Comprovante otimizado em WebP leve com sucesso.'
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Falha no Comprovante',
        message: err.message || 'Não foi possível processar a imagem do comprovante.'
      });
    } finally {
      setComprimindoFoto(false);
    }
  };

  // Salvar despesa (Inserir ou Atualizar)
  const handleSalvarDespesa = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitulo.trim()) {
      showToast({
        type: 'warning',
        title: 'Título Obrigatório',
        message: 'Por favor, informe a identificação da despesa.'
      });
      return;
    }

    const valorNum = parseFloat(formValor.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      showToast({
        type: 'warning',
        title: 'Valor Inválido',
        message: 'Informe um valor numérico válido maior que zero.'
      });
      return;
    }

    try {
      setSalvandoDespesa(true);

      const payload = {
        titulo: formTitulo.trim(),
        categoria: formCategoria,
        valor: valorNum,
        data_despesa: formData || new Date().toISOString().split('T')[0],
        descricao: formDescricao.trim() || null,
        comprovante_url: formComprovanteUrl || null,
        criado_por: adminNome,
        updated_at: new Date().toISOString()
      };

      if (despesaEmEdicao) {
        // Atualizar
        const { error } = await supabase
          .from('financeiro_despesas')
          .update(payload)
          .eq('id', despesaEmEdicao.id);

        if (error) throw error;

        setDespesas((prev) =>
          prev.map((d) => (d.id === despesaEmEdicao.id ? { ...d, ...payload } : d))
        );

        showToast({
          type: 'success',
          title: 'Despesa Atualizada',
          message: `Despesa "${formTitulo}" foi atualizada com sucesso.`
        });
      } else {
        // Inserir
        const { data: novaInserida, error } = await supabase
          .from('financeiro_despesas')
          .insert([payload])
          .select();

        if (error) throw error;

        if (novaInserida && novaInserida[0]) {
          setDespesas((prev) => [novaInserida[0] as DespesaFinanceira, ...prev]);
        }

        showToast({
          type: 'success',
          title: 'Despesa Lançada',
          message: `Despesa de R$ ${valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} registrada no caixa.`
        });
      }

      setModalDespesaAberto(false);
      await carregarDadosFinanceiros(true);
    } catch (err: any) {
      console.error('Erro ao salvar despesa:', err);
      showToast({
        type: 'error',
        title: 'Falha ao Salvar Despesa',
        message: err.message || 'Erro ao registrar a despesa no banco de dados.'
      });
    } finally {
      setSalvandoDespesa(false);
    }
  };

  // Abertura do modal de confirmação de exclusão
  const abrirModalExclusao = (d: DespesaFinanceira) => {
    setDespesaParaExcluir(d);
    setAdminResponsavelExclusao(adminNome);
    setMotivoExclusao('');
  };

  // Excluir despesa e registrar no histórico de auditoria
  const confirmarExclusaoDespesa = async () => {
    if (!despesaParaExcluir) return;

    try {
      setExcluindoDespesa(true);
      const { error } = await supabase
        .from('financeiro_despesas')
        .delete()
        .eq('id', despesaParaExcluir.id);

      if (error) throw error;

      // Registrar no histórico de auditoria permanente
      const registroAuditoria: DespesaExcluidaRecord = {
        ...despesaParaExcluir,
        excluido_em: new Date().toISOString(),
        excluido_por: adminResponsavelExclusao.trim() || adminNome,
        motivo_exclusao: motivoExclusao.trim() || 'Cancelamento/ajuste financeiro administrativo',
      };

      setDespesasExcluidas((prev) => [registroAuditoria, ...prev]);
      setDespesas((prev) => prev.filter((d) => d.id !== despesaParaExcluir.id));

      showToast({
        type: 'success',
        title: 'Despesa Excluída com Sucesso',
        message: `A despesa "${despesaParaExcluir.titulo}" foi removida do caixa e registrada no histórico de auditoria.`
      });

      setDespesaParaExcluir(null);
      await carregarDadosFinanceiros(true);
    } catch (err: any) {
      console.error('Erro ao excluir despesa:', err);
      showToast({
        type: 'error',
        title: 'Erro ao Excluir',
        message: err.message || 'Não foi possível excluir o lançamento de despesa.'
      });
    } finally {
      setExcluindoDespesa(false);
    }
  };

  // Restaurar despesa previamente excluída
  const handleRestaurarDespesa = async (item: DespesaExcluidaRecord) => {
    try {
      const { id, excluido_em, excluido_por, motivo_exclusao, ...dadosOriginais } = item;
      const payload = {
        ...dadosOriginais,
        updated_at: new Date().toISOString()
      };

      const { data: novaInserida, error } = await supabase
        .from('financeiro_despesas')
        .insert([payload])
        .select();

      if (error) throw error;

      setDespesasExcluidas((prev) => prev.filter((d) => d.id !== item.id));

      if (novaInserida && novaInserida[0]) {
        setDespesas((prev) => [novaInserida[0] as DespesaFinanceira, ...prev]);
      }

      showToast({
        type: 'success',
        title: 'Despesa Restaurada',
        message: `A despesa "${item.titulo}" foi restaurada com sucesso e voltou a constar no caixa.`
      });

      await carregarDadosFinanceiros(true);
    } catch (err: any) {
      console.error('Erro ao restaurar despesa:', err);
      showToast({
        type: 'error',
        title: 'Erro na Restauração',
        message: err.message || 'Não foi possível restaurar a despesa.'
      });
    }
  };

  // Remover registro definitivamente do histórico local de auditoria
  const handleRemoverRegistroHistorico = (item: DespesaExcluidaRecord) => {
    setDespesasExcluidas((prev) => prev.filter((d) => d.id !== item.id));
    showToast({
      type: 'info',
      title: 'Registro de Auditoria Removido',
      message: 'O registro foi removido definitivamente do histórico.'
    });
  };

  // Exportar extrato completo para CSV
  const exportarExtratoCSV = () => {
    try {
      const cabecalhos = ['Data', 'Tipo', 'Categoria', 'Título/Descrição', 'Origem/Comprador', 'Responsável', 'Valor (R$)'];
      const linhas = transacoesFiltradas.map((t) => [
        `"${new Date(t.data).toLocaleDateString('pt-BR')} ${new Date(t.data).toLocaleTimeString('pt-BR')}"`,
        `"${t.tipo === 'saida_despesa' ? 'Saída (Despesa)' : 'Entrada (Receita)'}"`,
        `"${t.categoria}"`,
        `"${(t.titulo + ' - ' + (t.descricao || '')).replace(/"/g, '""')}"`,
        `"${t.origem.replace(/"/g, '""')}"`,
        `"${(t.responsavel || '-').replace(/"/g, '""')}"`,
        `"${t.tipo === 'saida_despesa' ? '-' : ''}${t.valor.toFixed(2).replace('.', ',')}"`
      ]);

      const csvContent = '\uFEFF' + [cabecalhos.join(';'), ...linhas.map((e) => e.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `extrato_financeiro_talentos_minas_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast({
        type: 'success',
        title: 'CSV Exportado',
        message: 'O extrato financeiro foi baixado em formato CSV.'
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Erro ao Exportar',
        message: 'Falha ao gerar o arquivo de extrato financeiro.'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo Financeiro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-card border border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#00FF88] mb-1">
            <Wallet className="w-4 h-4" />
            <span>Módulo de Gestão Financeira</span>
          </div>
          <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-white">
            Controle de Receitas & Despesas
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Consolidação de todas as entradas da campanha (cotas e loja) e gestão de despesas avulsas
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => carregarDadosFinanceiros()}
            disabled={carregando}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title="Atualizar dados financeiros"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin text-[#00FF88]' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            onClick={exportarExtratoCSV}
            className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all cursor-pointer flex items-center gap-2 text-xs font-semibold"
            title="Exportar Extrato Completo em CSV"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={abrirNovaDespesa}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold text-xs transition-all shadow-lg shadow-rose-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Despesa</span>
          </button>
        </div>
      </div>

      {/* KPI Cards de Visão Geral Consolidada */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Receita Cotas da Rifa */}
        <div className="p-4 rounded-2xl glass-card border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium text-slate-300">Receita das Cotas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Ticket className="w-3.5 h-3.5 text-[#00FF88]" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">
            R$ {totais.receitaRifa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1.5">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{totais.totalCotasPagas} cotas confirmadas</span>
          </div>
        </div>

        {/* Card 2: Receita Loja Oficial */}
        <div className="p-4 rounded-2xl glass-card border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium text-slate-300">Receita da Loja</span>
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
              <ShoppingBag className="w-3.5 h-3.5 text-[#FF007F]" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">
            R$ {totais.receitaLoja.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-[#FF007F] mt-1.5">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{totais.totalItensLoja} itens vendidos</span>
          </div>
        </div>

        {/* Card 3: Receita Bruta Total */}
        <div className="p-4 rounded-2xl glass-card border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium text-slate-300">Receita Bruta Total</span>
            <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
              <TrendingUp className="w-3.5 h-3.5 text-[#D4AF37]" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">
            R$ {totais.receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Cotas Rifa + Produtos Loja
          </p>
        </div>

        {/* Card 4: Despesas Lançadas */}
        <div className="p-4 rounded-2xl glass-card border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium text-slate-300">Despesas Totais</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-rose-300">
            - R$ {totais.totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-rose-400 mt-1.5">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>{despesas.length} despesas lançadas</span>
          </div>
        </div>

        {/* Card 5: Saldo Líquido em Caixa (Super Destaque) */}
        <div className={`p-4 rounded-2xl glass-card border relative overflow-hidden group ${
          totais.saldoLiquido >= 0 
            ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-transparent' 
            : 'border-rose-500/40 bg-gradient-to-b from-rose-500/10 to-transparent'
        }`}>
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-bold text-white">Saldo Líquido em Caixa</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
              totais.saldoLiquido >= 0
                ? 'bg-emerald-500/20 border-emerald-500/30'
                : 'bg-rose-500/20 border-rose-500/30'
            }`}>
              <DollarSign className={`w-3.5 h-3.5 ${totais.saldoLiquido >= 0 ? 'text-[#00FF88]' : 'text-rose-400'}`} />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-black ${
            totais.saldoLiquido >= 0 ? 'text-[#00FF88]' : 'text-rose-400'
          }`}>
            R$ {totais.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-300 mt-1.5 font-medium">
            {totais.saldoLiquido >= 0 ? '✓ Superávit Disponível' : '⚠ Atenção: Déficit Operacional'}
          </p>
        </div>
      </div>

      {/* Navegação Secundária: Sub-Abas do Módulo Financeiro */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubAba('extrato')}
            className={`py-2 px-3.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              subAba === 'extrato'
                ? 'bg-[#00FF88]/15 text-[#00FF88] border border-[#00FF88]/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>Fluxo de Caixa & Extrato ({transacoesFluxo.length})</span>
          </button>

          <button
            onClick={() => setSubAba('despesas')}
            className={`py-2 px-3.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              subAba === 'despesas'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Despesas Avulsas ({despesas.length})</span>
          </button>

          <button
            onClick={() => setSubAba('demonstrativo')}
            className={`py-2 px-3.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              subAba === 'demonstrativo'
                ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Demonstrativo por Categoria</span>
          </button>
        </div>

        {atualizandoRealtime && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#00FF88] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#00FF88]"></span>
            <span>Sincronizando em tempo real</span>
          </div>
        )}
      </div>

      {/* SUB-ABA 1: FLUXO DE CAIXA / EXTRATO UNIFICADO */}
      {subAba === 'extrato' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="p-4 rounded-xl glass-card border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por pagador, produto, despesa, responsável ou ID..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88] transition-colors"
              />
              {busca && (
                <button
                  onClick={() => setBusca('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center flex-wrap gap-2 text-xs">
              {/* Filtro por Tipo */}
              <select
                value={filtroTipoFluxo}
                onChange={(e) => setFiltroTipoFluxo(e.target.value as any)}
                className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-[#00FF88] cursor-pointer"
              >
                <option value="todos">Todos os Tipos (Entradas & Saídas)</option>
                <option value="entradas">Apenas Entradas (Receitas)</option>
                <option value="saidas">Apenas Saídas (Despesas)</option>
              </select>

              {/* Filtro por Período */}
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value as any)}
                className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-[#00FF88] cursor-pointer"
              >
                <option value="todos">Todo o Período</option>
                <option value="mes_atual">Mês Atual</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="7dias">Últimos 7 dias</option>
              </select>
            </div>
          </div>

          {/* Tabela do Extrato */}
          <div className="p-5 rounded-2xl glass-card border border-white/10 overflow-hidden">
            {carregando ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 text-[#00FF88] animate-spin" />
                <p className="text-xs">Carregando fluxo de caixa consolidado...</p>
              </div>
            ) : transacoesFiltradas.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">Nenhum lançamento encontrado</p>
                <p className="text-xs mt-1">Ajuste os filtros de busca ou lance uma nova despesa avulsa.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="py-3 px-3">Data / Hora</th>
                      <th className="py-3 px-3">Tipo / Origem</th>
                      <th className="py-3 px-3">Categoria</th>
                      <th className="py-3 px-3">Descrição / Detalhes</th>
                      <th className="py-3 px-3">Origem / Responsável</th>
                      <th className="py-3 px-3 text-right">Valor</th>
                      <th className="py-3 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {transacoesFiltradas.map((t) => {
                      const isSaida = t.tipo === 'saida_despesa';
                      const dataFormatada = new Date(t.data).toLocaleDateString('pt-BR');
                      const horaFormatada = new Date(t.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                      return (
                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-medium text-slate-200">{dataFormatada}</div>
                            <div className="text-[10px] text-slate-500">{horaFormatada}</div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            {t.tipo === 'entrada_cota' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-[#00FF88] border border-emerald-500/20">
                                <Ticket className="w-3 h-3" />
                                <span>Cota Rifa</span>
                              </span>
                            )}
                            {t.tipo === 'entrada_loja' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-pink-500/10 text-[#FF007F] border border-pink-500/20">
                                <ShoppingBag className="w-3 h-3" />
                                <span>Loja Oficial</span>
                              </span>
                            )}
                            {t.tipo === 'saida_despesa' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                <TrendingDown className="w-3 h-3" />
                                <span>Despesa</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-slate-300 font-medium">{t.categoria}</span>
                          </td>

                          <td className="py-3 px-3 max-w-xs">
                            <div className="font-semibold text-white truncate">{t.titulo}</div>
                            {t.descricao && (
                              <div className="text-[11px] text-slate-400 truncate">{t.descricao}</div>
                            )}
                            {t.comprovante_url && (
                              <button
                                onClick={() => setComprovanteVisualizar({ url: t.comprovante_url!, titulo: t.titulo })}
                                className="inline-flex items-center gap-1 text-[10px] text-[#00FF88] hover:underline mt-0.5 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Ver Comprovante</span>
                              </button>
                            )}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="text-slate-200">{t.origem}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <UserCheck className="w-2.5 h-2.5" />
                              <span>{t.responsavel || 'Sistema'}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <span className={`font-bold text-sm ${
                              isSaida ? 'text-rose-400' : 'text-[#00FF88]'
                            }`}>
                              {isSaida ? '- ' : '+ '}
                              R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isSaida && t.despesaRef ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => abrirEditarDespesa(t.despesaRef!)}
                                  className="px-2.5 py-1 rounded-lg bg-[#D4AF37]/10 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/30 transition-all cursor-pointer font-medium text-[11px] flex items-center gap-1 shadow-sm active:scale-95"
                                  title="Editar esta despesa"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  onClick={() => abrirModalExclusao(t.despesaRef!)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-all cursor-pointer font-medium text-[11px] flex items-center gap-1 shadow-sm active:scale-95"
                                  title="Excluir esta despesa"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Excluir</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
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

      {/* SUB-ABA 2: GESTÃO DE DESPESAS AVULSAS */}
      {subAba === 'despesas' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca de Despesas */}
          <div className="p-4 rounded-xl glass-card border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar despesas por título, descrição ou responsável..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88] transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-[#00FF88] cursor-pointer"
              >
                <option value="todas">Todas as Categorias</option>
                {CATEGORIAS_DESPESA.map((c) => (
                  <option key={c.valor} value={c.valor}>{c.label}</option>
                ))}
              </select>

              <button
                onClick={abrirNovaDespesa}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Despesa</span>
              </button>
            </div>
          </div>

          {/* Lista de Despesas (Responsivo: Cards no Mobile, Tabela no Desktop) */}
          <div className="p-5 rounded-2xl glass-card border border-white/10 overflow-hidden">
            {despesasFiltradas.length === 0 ? (
              <div className="py-14 flex flex-col items-center justify-center text-center text-slate-400 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3">
                  <Receipt className="w-8 h-8 text-rose-400" />
                </div>
                <p className="text-base font-bold text-white">Nenhuma despesa cadastrada</p>
                <p className="text-xs text-slate-400 mt-1 mb-5">
                  Lance despesas eventuais ou de produção (figurinos, viagens, materiais, taxas) para controle automático do saldo líquido em caixa.
                </p>
                <button
                  onClick={abrirNovaDespesa}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold text-xs transition-all shadow-lg shadow-rose-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Lançar Primeira Despesa</span>
                </button>
              </div>
            ) : (
              <>
                {/* Visualização em Cards no Mobile */}
                <div className="block md:hidden space-y-3">
                  {despesasFiltradas.map((d) => {
                    const dataFormatada = d.data_despesa
                      ? new Date(d.data_despesa + 'T12:00:00').toLocaleDateString('pt-BR')
                      : new Date(d.created_at).toLocaleDateString('pt-BR');

                    const catConfig = CATEGORIAS_DESPESA.find((c) => c.valor === d.categoria) || {
                      cor: 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                    };

                    return (
                      <div
                        key={`card-${d.id}`}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${catConfig.cor}`}>
                              {d.categoria}
                            </span>
                            <h4 className="font-semibold text-sm text-white mt-1.5">{d.titulo}</h4>
                          </div>
                          <span className="font-bold text-base text-rose-400 whitespace-nowrap">
                            - R$ {Number(d.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {d.descricao && (
                          <p className="text-xs text-slate-400 line-clamp-2">{d.descricao}</p>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span className="font-medium text-slate-300">Data: {dataFormatada}</span>
                          <div className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-[#00FF88]" />
                            <span>{d.criado_por || 'Admin'}</span>
                          </div>
                        </div>

                        {d.comprovante_url && (
                          <button
                            onClick={() => setComprovanteVisualizar({ url: d.comprovante_url!, titulo: d.titulo })}
                            className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#00FF88] border border-white/10 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Comprovante Anexo</span>
                          </button>
                        )}

                        {/* Botões de Ação no Mobile com Texto e Ícone Bem Claros */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                          <button
                            onClick={() => abrirEditarDespesa(d)}
                            className="py-2 px-3 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => abrirModalExclusao(d)}
                            className="py-2 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Visualização em Tabela no Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="py-3 px-3">Data</th>
                        <th className="py-3 px-3">Título & Detalhes</th>
                        <th className="py-3 px-3">Categoria</th>
                        <th className="py-3 px-3">Registrado por</th>
                        <th className="py-3 px-3">Comprovante</th>
                        <th className="py-3 px-3 text-right">Valor</th>
                        <th className="py-3 px-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {despesasFiltradas.map((d) => {
                        const dataFormatada = d.data_despesa
                          ? new Date(d.data_despesa + 'T12:00:00').toLocaleDateString('pt-BR')
                          : new Date(d.created_at).toLocaleDateString('pt-BR');

                        const catConfig = CATEGORIAS_DESPESA.find((c) => c.valor === d.categoria) || {
                          cor: 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                        };

                        return (
                          <tr key={d.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-3 whitespace-nowrap text-slate-300 font-medium">
                              {dataFormatada}
                            </td>

                            <td className="py-3 px-3 max-w-sm">
                              <div className="font-semibold text-white">{d.titulo}</div>
                              {d.descricao && (
                                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                                  {d.descricao}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${catConfig.cor}`}>
                                {d.categoria}
                              </span>
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <UserCheck className="w-3 h-3 text-[#00FF88]" />
                                <span>{d.criado_por || 'Admin'}</span>
                              </div>
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              {d.comprovante_url ? (
                                <button
                                  onClick={() => setComprovanteVisualizar({ url: d.comprovante_url!, titulo: d.titulo })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#00FF88] border border-white/10 text-[11px] transition-all cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Ver Anexo</span>
                                </button>
                              ) : (
                                <span className="text-slate-500 text-[11px] italic">Sem anexo</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <span className="font-bold text-sm text-rose-400">
                                - R$ {Number(d.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => abrirEditarDespesa(d)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#D4AF37]/10 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/30 hover:border-[#D4AF37]/60 transition-all cursor-pointer font-semibold text-xs flex items-center gap-1.5 shadow-sm active:scale-95"
                                  title="Editar Informações da Despesa"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  onClick={() => abrirModalExclusao(d)}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 hover:border-rose-500/60 transition-all cursor-pointer font-semibold text-xs flex items-center gap-1.5 shadow-sm active:scale-95"
                                  title="Excluir Lançamento de Despesa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Excluir</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Relação de Despesas Excluídas & Histórico de Auditoria */}
          <div className="p-5 sm:p-6 rounded-2xl glass-card border border-rose-500/20 bg-gradient-to-b from-rose-950/10 to-transparent space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                    <span>Histórico de Despesas Excluídas & Auditoria</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {despesasExcluidas.length}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Registro de auditoria com data/hora, identificação do responsável pela exclusão, motivo e possibilidade de restauração.
                  </p>
                </div>
              </div>
            </div>

            {despesasExcluidas.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                Nenhuma despesa foi excluída até o momento.
              </div>
            ) : (
              <>
                {/* Cards Mobile de Excluídas */}
                <div className="block md:hidden space-y-3">
                  {despesasExcluidas.map((d) => {
                    const dataExclusaoFormatada = new Date(d.excluido_em).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    });
                    const dataOriginalFormatada = d.data_despesa
                      ? new Date(d.data_despesa + 'T12:00:00').toLocaleDateString('pt-BR')
                      : new Date(d.created_at).toLocaleDateString('pt-BR');

                    return (
                      <div
                        key={`excluida-card-${d.id}`}
                        className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                              {d.categoria}
                            </span>
                            <h5 className="font-semibold text-sm text-white mt-1 line-through opacity-80">{d.titulo}</h5>
                          </div>
                          <span className="font-bold text-sm text-rose-400 line-through">
                            - R$ {Number(d.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="space-y-1 text-[11px] text-slate-300 bg-black/30 p-2.5 rounded-lg border border-white/5">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Excluído em:</span>
                            <span className="font-mono text-rose-300">{dataExclusaoFormatada}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Excluído por:</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-white">
                              <User className="w-3 h-3 text-[#00FF88]" />
                              {d.excluido_por}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Data original:</span>
                            <span>{dataOriginalFormatada}</span>
                          </div>
                          {d.motivo_exclusao && (
                            <div className="pt-1 border-t border-white/5 text-slate-400 italic">
                              Motivo: &quot;{d.motivo_exclusao}&quot;
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleRestaurarDespesa(d)}
                            className="py-1.5 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-[#00FF88] border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            title="Restaurar Despesa para o Caixa"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restaurar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoverRegistroHistorico(d)}
                            className="py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-300 border border-white/10 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            title="Remover apenas o registro de log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Limpar Log</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tabela Desktop de Excluídas */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-black/40 text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Despesa / Título</th>
                        <th className="px-4 py-3 font-semibold">Categoria</th>
                        <th className="px-4 py-3 font-semibold">Valor Removido</th>
                        <th className="px-4 py-3 font-semibold">Data Original</th>
                        <th className="px-4 py-3 font-semibold">Data/Hora Exclusão</th>
                        <th className="px-4 py-3 font-semibold">Excluído Por</th>
                        <th className="px-4 py-3 font-semibold">Motivo / Justificativa</th>
                        <th className="px-4 py-3 text-right font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {despesasExcluidas.map((d) => {
                        const dataExclusaoFormatada = new Date(d.excluido_em).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        });
                        const dataOriginalFormatada = d.data_despesa
                          ? new Date(d.data_despesa + 'T12:00:00').toLocaleDateString('pt-BR')
                          : new Date(d.created_at).toLocaleDateString('pt-BR');

                        return (
                          <tr key={d.id} className="hover:bg-rose-500/[0.04] transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-white line-through opacity-80">{d.titulo}</p>
                              {d.descricao && (
                                <p className="text-[11px] text-slate-500 line-clamp-1">{d.descricao}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                {d.categoria}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-rose-400 whitespace-nowrap line-through">
                              - R$ {Number(d.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                              {dataOriginalFormatada}
                            </td>
                            <td className="px-4 py-3 font-mono text-rose-300 text-[11px] whitespace-nowrap">
                              {dataExclusaoFormatada}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/10 text-slate-200 border border-white/15">
                                <User className="w-3 h-3 text-[#00FF88]" />
                                <span>{d.excluido_por}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-[11px] italic max-w-xs truncate">
                              {d.motivo_exclusao || 'Ajuste / Cancelamento'}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {d.comprovante_url && (
                                  <button
                                    type="button"
                                    onClick={() => setComprovanteVisualizar({ url: d.comprovante_url!, titulo: d.titulo })}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#00FF88] border border-white/10 transition-colors inline-flex items-center cursor-pointer"
                                    title="Ver Comprovante Anexo"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRestaurarDespesa(d)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00FF88] border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Restaurar Despesa para o Caixa Ativo"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Restaurar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoverRegistroHistorico(d)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors inline-flex items-center cursor-pointer"
                                  title="Remover do Histórico Definitivamente"
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
              </>
            )}
          </div>
        </div>
      )}

      {/* SUB-ABA 3: DEMONSTRATIVO POR CATEGORIA */}
      {subAba === 'demonstrativo' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Origem das Receitas */}
            <div className="p-6 rounded-2xl glass-card border border-white/10">
              <h3 className="font-cinzel text-base font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00FF88]" />
                Composição da Receita Bruta
              </h3>

              <div className="space-y-4">
                {/* Rifa */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-200 flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5 text-[#00FF88]" />
                      Cotas da Rifa Wicked
                    </span>
                    <span className="text-white font-bold">
                      R$ {totais.receitaRifa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      <span className="text-slate-400 font-normal ml-1">
                        ({totais.receitaBruta > 0 ? ((totais.receitaRifa / totais.receitaBruta) * 100).toFixed(1) : 0}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-[#00FF88] rounded-full transition-all duration-700"
                      style={{
                        width: `${totais.receitaBruta > 0 ? (totais.receitaRifa / totais.receitaBruta) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>

                {/* Loja */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-200 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-[#FF007F]" />
                      Loja Oficial de Produtos
                    </span>
                    <span className="text-white font-bold">
                      R$ {totais.receitaLoja.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      <span className="text-slate-400 font-normal ml-1">
                        ({totais.receitaBruta > 0 ? ((totais.receitaLoja / totais.receitaBruta) * 100).toFixed(1) : 0}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-[#FF007F] rounded-full transition-all duration-700"
                      style={{
                        width: `${totais.receitaBruta > 0 ? (totais.receitaLoja / totais.receitaBruta) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider">Total de Entradas</span>
                  <span className="text-[#00FF88] font-bold text-sm">
                    R$ {totais.receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Distribuição de Despesas por Categoria */}
            <div className="p-6 rounded-2xl glass-card border border-white/10">
              <h3 className="font-cinzel text-base font-bold text-white mb-4 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                Destinação das Despesas
              </h3>

              {demonstrativoCategorias.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">
                  Nenhuma despesa lançada até o momento.
                </p>
              ) : (
                <div className="space-y-3.5">
                  {demonstrativoCategorias.map((item) => {
                    return (
                      <div key={item.categoria} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-200">
                            {item.categoria} <span className="text-slate-400 text-[10px]">({item.quantidade}x)</span>
                          </span>
                          <span className="text-rose-300 font-bold">
                            R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            <span className="text-slate-400 font-normal ml-1">
                              ({item.percentual.toFixed(1)}%)
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-700"
                            style={{ width: `${item.percentual}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider">Total de Saídas</span>
                    <span className="text-rose-400 font-bold text-sm">
                      - R$ {totais.totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LANÇAMENTO / EDIÇÃO DE DESPESA */}
      <Modal
        isOpen={modalDespesaAberto}
        onClose={() => !salvandoDespesa && setModalDespesaAberto(false)}
        title={despesaEmEdicao ? 'Editar Despesa Lançada' : 'Lançar Nova Despesa Avulsa'}
      >
        <form onSubmit={handleSalvarDespesa} className="space-y-4">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Este lançamento será abatido automaticamente do saldo líquido total em caixa e registrado no extrato contábil.
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Identificação / Título da Despesa *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Tecidos figurino Glinda, Impressão de flyers, Aluguel van..."
              value={formTitulo}
              onChange={(e) => setFormTitulo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Categoria de Custo *
              </label>
              <select
                value={formCategoria}
                onChange={(e) => setFormCategoria(e.target.value as CategoriaDespesa)}
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00FF88] cursor-pointer"
              >
                {CATEGORIAS_DESPESA.map((c) => (
                  <option key={c.valor} value={c.valor}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Valor da Despesa (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-400">R$</span>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={formValor}
                  onChange={(e) => setFormValor(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Data do Pagamento / Ocorrência *
              </label>
              <input
                type="date"
                required
                value={formData}
                onChange={(e) => setFormData(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00FF88]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Registrado por (Responsável)
              </label>
              <input
                type="text"
                value={adminNome}
                disabled
                className="w-full px-3.5 py-2.5 bg-black/20 border border-white/5 rounded-xl text-xs text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Observações / Detalhes Adicionais (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Descreva fornecedor, forma de pagamento, detalhes do item ou observações para prestação de contas..."
              value={formDescricao}
              onChange={(e) => setFormDescricao(e.target.value)}
              className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88]"
            />
          </div>

          {/* Anexo de Comprovante */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Comprovante / Recibo Digital (Foto ou Imagem)
            </label>
            
            {formComprovanteUrl ? (
              <div className="relative p-2 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={formComprovanteUrl} alt="Comprovante" className="w-12 h-12 object-cover rounded-lg border border-white/10" />
                  <span className="text-xs text-emerald-400 font-medium">Comprovante anexado (WebP)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormComprovanteUrl('')}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                  title="Remover anexo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-white/15 hover:border-[#00FF88]/50 rounded-xl p-4 text-center block cursor-pointer transition-colors bg-black/20">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadComprovante}
                  disabled={comprimindoFoto}
                  className="hidden"
                />
                {comprimindoFoto ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-[#00FF88]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Otimizando imagem...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <Upload className="w-5 h-5 text-slate-300" />
                    <span className="text-xs font-medium text-slate-300">Clique para anexar foto do comprovante</span>
                    <span className="text-[10px] text-slate-500">JPG, PNG ou WebP comprimido automaticamente</span>
                  </div>
                )}
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              disabled={salvandoDespesa}
              onClick={() => setModalDespesaAberto(false)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvandoDespesa}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              {salvandoDespesa && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{despesaEmEdicao ? 'Salvar Alterações' : 'Lançar Despesa'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE DESPESA COM AUDITORIA */}
      {despesaParaExcluir && (
        <Modal
          isOpen={!!despesaParaExcluir}
          onClose={() => !excluindoDespesa && setDespesaParaExcluir(null)}
          title="Confirmar Exclusão de Despesa"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-rose-200 leading-relaxed">
                <strong className="text-white block font-semibold mb-0.5">Atenção: Remoção do Saldo em Caixa</strong>
                Ao confirmar, o valor desta despesa deixará de ser abatido do caixa e o registro será arquivado no <strong className="text-white">Histórico de Exclusões</strong> abaixo com registro de auditoria.
              </div>
            </div>

            {/* Resumo da Despesa */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Identificação / Título:</span>
                <span className="font-bold text-white text-sm">{despesaParaExcluir.titulo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Categoria:</span>
                <span className="font-medium text-slate-200">{despesaParaExcluir.categoria}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Valor a Ser Estornado:</span>
                <span className="font-bold text-rose-400 text-sm">
                  - R$ {Number(despesaParaExcluir.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Data de Ocorrência:</span>
                <span className="text-slate-300">
                  {despesaParaExcluir.data_despesa
                    ? new Date(despesaParaExcluir.data_despesa + 'T12:00:00').toLocaleDateString('pt-BR')
                    : new Date(despesaParaExcluir.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Lançado Originalmente Por:</span>
                <span className="text-slate-300">{despesaParaExcluir.criado_por || 'Admin'}</span>
              </div>
            </div>

            {/* Identificação de quem está excluindo */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Nome do Usuário Responsável pela Exclusão: <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={adminResponsavelExclusao}
                onChange={(e) => setAdminResponsavelExclusao(e.target.value)}
                placeholder="Ex: Administrador"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-400"
              />
            </div>

            {/* Motivo da exclusão */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Motivo / Justificativa da Exclusão:
              </label>
              <input
                type="text"
                value={motivoExclusao}
                onChange={(e) => setMotivoExclusao(e.target.value)}
                placeholder="Ex: Lançamento em duplicidade / Cancelado pelo fornecedor / Ajuste contábil"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
              <button
                type="button"
                disabled={excluindoDespesa}
                onClick={() => setDespesaParaExcluir(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluindoDespesa}
                onClick={confirmarExclusaoDespesa}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {excluindoDespesa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{excluindoDespesa ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL DE VISUALIZAÇÃO DE COMPROVANTE */}
      {comprovanteVisualizar && (
        <Modal
          isOpen={true}
          onClose={() => setComprovanteVisualizar(null)}
          title={`Comprovante: ${comprovanteVisualizar.titulo}`}
        >
          <div className="space-y-4">
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-black/60 rounded-xl p-2 border border-white/10">
              <img
                src={comprovanteVisualizar.url}
                alt={comprovanteVisualizar.titulo}
                className="max-w-full max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setComprovanteVisualizar(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
