import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  X, 
  ArrowLeft, 
  ChevronRight, 
  RotateCw, 
  Check, 
  Sparkles, 
  Heart, 
  Ticket, 
  QrCode, 
  Copy, 
  CheckCircle2,
  Loader2,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Clock,
  Mail,
  Share2,
  MessageCircle
} from 'lucide-react';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { useCampanha } from '../../hooks/useCampanha';
import { useToast } from '../../hooks/useToast';
import { RoletaWicked } from '../sorteio/RoletaWicked';
import { BilhetesFixaveis } from '../sorteio/BilhetesFixaveis';
import { gerarLinkSuporteWhatsApp } from '../../utils/whatsappSupport';
import type { PedidoCheckout } from '../../types';


const checkoutSchema = z.object({
  nome: z.string().min(3, 'Por favor, informe seu nome completo (mínimo 3 caracteres)'),
  email: z.string().email('Por favor, informe um endereço de e-mail válido'),
  whatsapp: z.string().min(10, 'Informe um WhatsApp com DDD válido (ex: 31 99999-9999)'),
});

type EtapaApoio = 'bailarino' | 'cotas' | 'roleta' | 'checkout' | 'sucesso_pix';

interface ModalFluxoApoioProps {
  isOpen: boolean;
  onClose: () => void;
  bailarinoPreSelecionadoId?: string | null;
  onAbrirCompartilharComBailarino?: (bailarinoId?: string) => void;
}

export const ModalFluxoApoio: React.FC<ModalFluxoApoioProps> = ({
  isOpen,
  onClose,
  bailarinoPreSelecionadoId,
  onAbrirCompartilharComBailarino,
}) => {
  const { 
    bailarinos, 
    cotas, 
    bailarinoSelecionadoId, 
    setBailarinoSelecionadoId, 
    selecionarCotasEmLote,
    concluirPedido,
    precoPorCota,
    carregarDadosReais,
    totalCotas,
    combosPromocionais,
    calcularValorCotas,
  } = useCampanha();
  const { showToast } = useToast();

  const [etapa, setEtapa] = useState<EtapaApoio>('bailarino');
  const [bailarinoIdEscolhido, setBailarinoIdEscolhido] = useState<string | null>(null);
  const [quantidadeCotas, setQuantidadeCotas] = useState<number>(1);

  // Estados da Roleta Gamificada
  const controls = useAnimation();
  const [isSpinning, setIsSpinning] = useState(false);
  const [numerosSorteados, setNumerosSorteados] = useState<number[]>([]);
  const [indicesFixados, setIndicesFixados] = useState<number[]>([]);
  const [hasSpunOnce, setHasSpunOnce] = useState(false);
  const rotationRef = useRef(18);

  // Estados do Checkout
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [pedidoConcluido, setPedidoConcluido] = useState<PedidoCheckout | null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [pedidoPago, setPedidoPago] = useState(false);
  const [verificandoManual, setVerificandoManual] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(1200); // 20 minutos
  const [pedidoExpirado, setPedidoExpirado] = useState(false);

  // Sincroniza abertura do modal e pré-seleção
  useEffect(() => {
    if (isOpen) {
      if (bailarinoPreSelecionadoId) {
        setBailarinoIdEscolhido(bailarinoPreSelecionadoId);
        setBailarinoSelecionadoId(bailarinoPreSelecionadoId);
        setEtapa('cotas'); // Acesso direto à seleção de cotas com o bailarino já selecionado!
      } else if (bailarinoSelecionadoId) {
        setBailarinoIdEscolhido(bailarinoSelecionadoId);
        setEtapa('bailarino');
      } else {
        setBailarinoIdEscolhido(null);
        setEtapa('bailarino');
      }
      setHasSpunOnce(false);
      setNumerosSorteados([]);
      setIndicesFixados([]);
      setPedidoConcluido(null);
      setPedidoPago(false);
      setPedidoExpirado(false);
      setSegundosRestantes(1200);
      setIsGeneratingPix(false);
      setErros({});
    }
  }, [isOpen, bailarinoPreSelecionadoId]);

  // Timer de 20 minutos para expiração do Pix
  useEffect(() => {
    if (!pedidoConcluido?.id || pedidoPago || pedidoExpirado) return;

    const interval = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPedidoExpirado(true);
          supabase
            .from('raffle_orders')
            .update({
              status: 'expired',
              status_updated_by: 'cliente_timeout',
              status_updated_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', pedidoConcluido.id);
          carregarDadosReais();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pedidoConcluido?.id, pedidoPago, pedidoExpirado, carregarDadosReais]);

  // Monitoramento em tempo real via WebSocket do Supabase Realtime
  useEffect(() => {
    if (!pedidoConcluido?.id || pedidoPago) return;

    const channel = supabase
      .channel(`order_status:${pedidoConcluido.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'raffle_orders',
          filter: `id=eq.${pedidoConcluido.id}`,
        },
        (payload) => {
          if (payload.new && payload.new.status === 'paid') {
            setPedidoPago(true);
            carregarDadosReais();
            showToast({
              type: 'success',
              title: 'Pagamento Confirmado!',
              message: 'Seu Pix foi aprovado em tempo real pelo Mercado Pago. Suas cotas estão garantidas!',
              duration: 8000,
            });
          } else if (payload.new && (payload.new.status === 'expired' || payload.new.status === 'cancelled')) {
            setPedidoExpirado(true);
            carregarDadosReais();
            showToast({
              type: 'warning',
              title: 'Tempo Esgotado',
              message: 'O Pix não foi concluído dentro do prazo e as cotas voltaram a ficar disponíveis.',
              duration: 7000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pedidoConcluido?.id, pedidoPago, carregarDadosReais, showToast]);

  const verificarStatusManual = async () => {
    if (!pedidoConcluido?.id) return;
    setVerificandoManual(true);
    try {
      const { data, error } = await supabase
        .from('raffle_orders')
        .select('status')
        .eq('id', pedidoConcluido.id)
        .single();

      if (!error && data?.status === 'paid') {
        setPedidoPago(true);
        carregarDadosReais();
        showToast({
          type: 'success',
          title: 'Pagamento Confirmado!',
          message: 'Seu Pix já consta como aprovado no sistema.',
        });
      } else if (!error && (data?.status === 'expired' || data?.status === 'cancelled')) {
        setPedidoExpirado(true);
        carregarDadosReais();
        showToast({
          type: 'warning',
          title: 'Tempo Esgotado',
          message: 'Este pedido foi expirado e as cotas voltaram a ficar disponíveis.',
        });
      } else {
        showToast({
          type: 'info',
          title: 'Aguardando compensação',
          message: 'O Pix ainda não foi compensado pelo banco. Se acabou de pagar, aguarde alguns segundos.',
        });
      }
    } catch (_) {
    } finally {
      setVerificandoManual(false);
    }
  };

  const formatarTempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleReiniciarNovoPedido = () => {
    setPedidoConcluido(null);
    setPedidoPago(false);
    setPedidoExpirado(false);
    setSegundosRestantes(1200);
    setEtapa('roleta');
    setNumerosSorteados([]);
    setIndicesFixados([]);
    setHasSpunOnce(false);
    carregarDadosReais();
  };

  const bailarinoAtivo = bailarinoIdEscolhido === 'campanha-geral'
    ? {
        id: 'campanha-geral',
        nome: 'Campanha Geral (Talentos de Minas)',
        fotoUrl: '/logo_talentos.webp',
        meta: totalCotas,
        totalVendido: 0,
        totalApoios: 0,
        ativo: true,
      }
    : bailarinos.find((b) => b.id === bailarinoIdEscolhido);
  const { valorTotal, comboAplicado, economia } = calcularValorCotas(quantidadeCotas);

  // Lista de cotas disponíveis
  const disponiveis = cotas.filter((c) => c.status === 'disponivel').map((c) => c.numero);

  // Executa o sorteio com parada no ponteiro superior
  const girarRoleta = useCallback(async () => {
    if (isSpinning || disponiveis.length === 0) return;

    try {
      setIsSpinning(true);

      // Escolhe aleatoriamente uma das 10 fatias visuais da roleta
      const indiceFatiaSorteada = Math.floor(Math.random() * 10);
      const voltasCompletas = 6 + Math.floor(Math.random() * 3);

      const anguloCentroFatia = (18 + indiceFatiaSorteada * 36) % 360;
      const anguloAlvo = (360 - anguloCentroFatia) % 360;

      const restoAtual = ((rotationRef.current % 360) + 360) % 360;
      let delta = (anguloAlvo - restoAtual) % 360;
      if (delta < 0) delta += 360;
      if (delta === 0) delta = 360;

      const rotacaoFinal = rotationRef.current + (voltasCompletas * 360) + delta;
      rotationRef.current = rotacaoFinal;

      await controls.start({
        rotate: rotacaoFinal,
        transition: { duration: 4, ease: [0.15, 0, 0.1, 1] },
      });

      // GARANTIA TOTAL: Sorteia números estritamente a partir das cotas DISPONÍVEIS da campanha
      if (!hasSpunOnce) {
        const embaralhadas = [...disponiveis].sort(() => 0.5 - Math.random());
        const novosNumeros = embaralhadas.slice(0, quantidadeCotas);
        setNumerosSorteados(novosNumeros);
        setHasSpunOnce(true);
      } else {
        // Mantém as cotas fixadas pelo usuário que continuem disponíveis
        const fixadasValidas = numerosSorteados.filter(
          (n, idx) => indicesFixados.includes(idx) && disponiveis.includes(n)
        );
        const piscinaRestante = disponiveis
          .filter((n) => !fixadasValidas.includes(n))
          .sort(() => 0.5 - Math.random());

        let ponteiro = 0;
        const atualizados = [...numerosSorteados];
        for (let i = 0; i < quantidadeCotas; i++) {
          if (!indicesFixados.includes(i) || !disponiveis.includes(atualizados[i])) {
            atualizados[i] = piscinaRestante[ponteiro++] || atualizados[i];
          }
        }
        setNumerosSorteados(atualizados);
      }
    } catch (err) {
      console.error('Erro na rotação da roleta:', err);
    } finally {
      setIsSpinning(false);
    }
  }, [isSpinning, disponiveis, controls, hasSpunOnce, quantidadeCotas, numerosSorteados, indicesFixados]);

  const toggleFixar = (idx: number) => {
    setIndicesFixados((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleConfirmarNumeros = () => {
    if (numerosSorteados.length > 0) {
      selecionarCotasEmLote(numerosSorteados);
      setEtapa('checkout');
    }
  };

  const handleFinalizarCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErros({});

    if (!bailarinoIdEscolhido) {
      showToast({
        type: 'warning',
        title: 'Bailarino não selecionado',
        message: 'Por favor, volte e escolha quem você deseja apoiar.',
      });
      return;
    }

    const validacao = checkoutSchema.safeParse({ nome, email, whatsapp });
    if (!validacao.success) {
      const novosErros: Record<string, string> = {};
      validacao.error.issues.forEach((issue) => {
        const campo = issue.path[0] as string;
        novosErros[campo] = issue.message;
      });
      setErros(novosErros);
      showToast({
        type: 'warning',
        title: 'Verifique os dados',
        message: 'Preencha os campos obrigatórios corretamente antes de prosseguir.',
      });
      return;
    }

    setIsGeneratingPix(true);
    try {
      // 1. Verificação preventiva: garante que nenhuma cota sorteada foi vendida enquanto preenchia
      const indisponiveis = numerosSorteados.filter((num) => {
        const c = cotas.find((item) => item.numero === num);
        return !c || c.status !== 'disponivel';
      });

      let cotasParaCheckout = [...numerosSorteados];

      if (indisponiveis.length > 0) {
        await carregarDadosReais();
        const livresFrescas = cotas
          .filter((c) => c.status === 'disponivel' && !numerosSorteados.includes(c.numero))
          .map((c) => c.numero)
          .sort(() => 0.5 - Math.random());

        cotasParaCheckout = numerosSorteados.map((num) => {
          if (indisponiveis.includes(num)) {
            return livresFrescas.shift() || num;
          }
          return num;
        });

        setNumerosSorteados(cotasParaCheckout);

        showToast({
          type: 'warning',
          title: 'Cota atualizada!',
          message: `A cota #${indisponiveis.join(', #')} já havia sido adquirida. Atualizamos automaticamente para novo número da sorte livre!`,
          duration: 6000,
        });
      }

      const pedido = await concluirPedido({
        nome,
        email,
        whatsapp,
        bailarinoId: bailarinoIdEscolhido,
        cotasCustom: cotasParaCheckout,
      });

      setPedidoConcluido(pedido);
      setEtapa('sucesso_pix');

      showToast({
        type: 'success',
        title: 'Pix Oficial Gerado!',
        message: 'Efetue o pagamento Pix para confirmar suas cotas.',
        duration: 6000,
      });
    } catch (err: any) {
      console.error('Erro ao gerar pedido Pix:', err);
      const msg = err?.message || '';

      // Se o banco Supabase acusar que a cota foi adquirida por outro apoiador
      if (msg.includes('outro apoiador') || msg.includes('adquirid') || msg.includes('já foram')) {
        await carregarDadosReais();
        const livres = cotas
          .filter((c) => c.status === 'disponivel')
          .map((c) => c.numero)
          .sort(() => 0.5 - Math.random());

        if (livres.length >= quantidadeCotas) {
          const novos = livres.slice(0, quantidadeCotas);
          setNumerosSorteados(novos);
          showToast({
            type: 'warning',
            title: 'Cota substituída com sucesso!',
            message: 'A cota anterior já havia sido adquirida. Sorteamos novo(s) número(s) livre(s) para você. Basta clicar em Gerar Pix novamente!',
            duration: 8000,
          });
          return;
        }
      }

      showToast({
        type: 'error',
        title: 'Falha ao gerar Pix',
        message: err?.message || 'Não foi possível gerar a cobrança Pix. Tente novamente.',
      });
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const copiarPix = () => {
    if (!pedidoConcluido) return;
    navigator.clipboard.writeText(pedidoConcluido.codigoPix);
    setPixCopiado(true);
    showToast({
      type: 'info',
      title: 'Código Pix Copiado',
      message: 'Cole no aplicativo do seu banco para pagar.',
    });
    setTimeout(() => setPixCopiado(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-lg bg-[#0F1410] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Topo do Modal com Navegação e Fechamento */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            {etapa !== 'bailarino' && etapa !== 'sucesso_pix' && (
              <button
                type="button"
                onClick={() => {
                  if (etapa === 'cotas') setEtapa('bailarino');
                  if (etapa === 'roleta') setEtapa('cotas');
                  if (etapa === 'checkout') setEtapa('roleta');
                }}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Voltar etapa anterior"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#00FF88] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                {etapa === 'bailarino' && 'Etapa 1 de 4 • Seleção do Artista'}
                {etapa === 'cotas' && 'Etapa 2 de 4 • Quantidade de Cotas'}
                {etapa === 'roleta' && 'Etapa 3 de 4 • Roleta da Sorte'}
                {etapa === 'checkout' && 'Etapa 4 de 4 • Identificação'}
                {etapa === 'sucesso_pix' && 'Apoio Quase Lá • Pagamento Pix'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ETAPA 1: Seleção de Bailarino (Cards Compactos Mobile First) */}
          {etapa === 'bailarino' && (
            <motion.div
              key="step-bailarino"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="text-center">
                <h3 className="font-cinzel text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Quem você deseja apoiar?
                </h3>
                <p className="mt-1 text-slate-400 text-xs sm:text-sm">
                  Selecione o bailarino da Jornada Wicked 2026 para receber sua pontuação.
                </p>
              </div>

              {/* Lista Compacta de Bailarinos (Mobile First) */}
              <div className="space-y-2 max-h-[320px] sm:max-h-[360px] overflow-y-auto pr-1">
                {/* Opção Global: Apoiar a Campanha Geral (Todos os Bailarinos) */}
                <button
                  type="button"
                  onClick={() => {
                    setBailarinoIdEscolhido('campanha-geral');
                    setBailarinoSelecionadoId(null);
                  }}
                  className={`w-full p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    bailarinoIdEscolhido === 'campanha-geral'
                      ? 'bg-[#00FF88]/15 border-[#00FF88] shadow-[0_0_15px_rgba(0,255,136,0.25)] ring-1 ring-[#00FF88]'
                      : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#00FF88]/20 border border-white/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-[#00FF88]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">
                        Apoiar Campanha Geral
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Apoio compartilhado para todos os artistas do Wicked 2026
                      </p>
                    </div>
                  </div>

                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                    bailarinoIdEscolhido === 'campanha-geral'
                      ? 'bg-[#00FF88] border-[#00FF88] text-black shadow-[0_0_8px_rgba(0,255,136,0.6)]'
                      : 'border-white/20 bg-white/5'
                  }`}>
                    {bailarinoIdEscolhido === 'campanha-geral' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>

                {/* Bailarinos cadastrados no Supabase */}
                {bailarinos
                  .filter((b) => b.ativo)
                  .map((bailarino) => {
                    const selecionado = bailarinoIdEscolhido === bailarino.id;

                    return (
                      <button
                        key={bailarino.id}
                        type="button"
                        onClick={() => {
                          setBailarinoIdEscolhido(bailarino.id);
                          setBailarinoSelecionadoId(bailarino.id);
                        }}
                        className={`w-full p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          selecionado
                            ? 'bg-[#00FF88]/15 border-[#00FF88] shadow-[0_0_15px_rgba(0,255,136,0.25)] ring-1 ring-[#00FF88]'
                            : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={bailarino.fotoUrl}
                            alt={bailarino.nome}
                            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover shrink-0 border ${
                              selecionado ? 'border-[#00FF88]' : 'border-white/10'
                            }`}
                          />
                          <div className="min-w-0">
                            <h4 className={`text-sm font-bold truncate ${
                              selecionado ? 'text-white' : 'text-slate-200'
                            }`}>
                              {bailarino.nome}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <span className="text-[#D4AF37] font-semibold">{bailarino.totalVendido} cotas</span>
                              <span>•</span>
                              <span>Meta: {bailarino.meta}</span>
                            </p>
                          </div>
                        </div>

                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                          selecionado
                            ? 'bg-[#00FF88] border-[#00FF88] text-black shadow-[0_0_8px_rgba(0,255,136,0.6)]'
                            : 'border-white/20 bg-white/5'
                        }`}>
                          {selecionado && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* Botão de confirmação: SÓ APARECE quando o bailarino estiver selecionado */}
              {bailarinoIdEscolhido && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-2"
                >
                  <button
                    type="button"
                    onClick={() => setEtapa('cotas')}
                    className="w-full py-3.5 rounded-xl font-cinzel text-xs font-bold uppercase tracking-wider bg-[#00FF88] hover:bg-[#33ff9f] text-black glow-oz transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl min-h-[46px]"
                  >
                    <span>Confirmar {bailarinoAtivo?.nome.split(' ')[0]} e Avançar</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ETAPA 2: Quantidade de Cotas */}
          {etapa === 'cotas' && (
            <motion.div
              key="step-cotas"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-5"
            >
              <div className="text-center">
                <h3 className="font-cinzel text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Quantas cotas você quer?
                </h3>
                <p className="mt-1 text-slate-400 text-xs sm:text-sm">
                  Apoiando <strong className="text-[#00FF88]">{bailarinoAtivo?.nome}</strong> na Jornada Wicked.
                </p>
              </div>

              {/* Card Destaque do Bailarino Apoiado - Foto Maior e Mobile-First */}
              <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-black/90 via-[#0F3D2A]/35 to-black/90 border border-[#00FF88]/30 shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={bailarinoAtivo?.fotoUrl}
                      alt={bailarinoAtivo?.nome}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#00FF88] shadow-[0_0_15px_rgba(0,255,136,0.25)] ring-1 ring-white/10"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#00FF88] border-2 border-black flex items-center justify-center text-black shadow-md">
                      <Sparkles className="w-2.5 h-2.5 stroke-[2.5]" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#00FF88]/15 border border-[#00FF88]/30 text-[10px] font-bold text-[#00FF88] uppercase tracking-wider mb-1">
                      <Heart className="w-2.5 h-2.5 fill-current text-[#FF007F]" />
                      Você está apoiando
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-white truncate font-cinzel">
                      {bailarinoAtivo?.nome}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {bailarinoAtivo?.id === 'campanha-geral'
                        ? 'Todos os artistas do Festival Wicked 2026'
                        : `Festival Wicked 2026 • ${bailarinoAtivo?.totalVendido || 0} cotas vendidas`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEtapa('bailarino')}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#00FF88] border border-[#00FF88]/30 hover:border-[#00FF88] transition-all active:scale-95 cursor-pointer shadow-sm"
                    title="Escolher outro participante"
                  >
                    Trocar
                  </button>
                  {onAbrirCompartilharComBailarino && (
                    <button
                      type="button"
                      onClick={() => onAbrirCompartilharComBailarino(bailarinoAtivo?.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                      title="Compartilhar link de apoio deste bailarino"
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#00FF88]" />
                      <span className="hidden sm:inline text-slate-400 hover:text-white">Divulgar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Seletor Rápido de Cotas com Combos Promocionais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {combosPromocionais.filter(c => c.ativo).map((combo) => {
                  const qtd = combo.quantidade;
                  const isSelected = quantidadeCotas === qtd;
                  const economiaCombo = Math.max(0, (qtd * precoPorCota) - combo.precoTotal);

                  return (
                    <button
                      key={combo.id || qtd}
                      type="button"
                      onClick={() => {
                        setQuantidadeCotas(qtd);
                        setHasSpunOnce(false);
                        setNumerosSorteados([]);
                        setIndicesFixados([]);
                      }}
                      className={`relative py-3 px-2 rounded-2xl text-xs font-bold text-center transition-all cursor-pointer border flex flex-col items-center justify-between min-h-[78px] ${
                        isSelected
                          ? 'bg-[#00FF88] text-black border-[#00FF88] shadow-[0_0_15px_rgba(0,255,136,0.5)] ring-1 ring-[#00FF88]'
                          : combo.destaque
                            ? 'bg-[#0F3D2A]/40 border-[#00FF88]/40 hover:border-[#00FF88] text-slate-200'
                            : 'bg-black/40 border-white/10 hover:border-white/20 text-slate-300'
                      }`}
                    >
                      {/* Badge do Combo se houver */}
                      {combo.badge && (
                        <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-tight whitespace-nowrap shadow-md ${
                          isSelected
                            ? 'bg-black text-[#00FF88] border border-black'
                            : 'bg-[#D4AF37] text-black'
                        }`}>
                          {combo.badge}
                        </span>
                      )}

                      <div className="w-full flex items-baseline justify-center gap-1 mt-1">
                        <span className="text-lg font-black">{qtd}</span>
                        <span className="text-[10px] uppercase font-bold opacity-80">{qtd === 1 ? 'Cota' : 'Cotas'}</span>
                      </div>

                      <div className="w-full mt-1">
                        <span className={`font-mono text-xs font-bold block ${
                          isSelected ? 'text-black' : 'text-[#D4AF37]'
                        }`}>
                          R$ {combo.precoTotal},00
                        </span>
                        {economiaCombo > 0 && (
                          <span className={`text-[9px] block font-semibold leading-tight ${
                            isSelected ? 'text-emerald-950 font-black' : 'text-[#00FF88]'
                          }`}>
                            Poupe R$ {economiaCombo}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Stepper Manual Personalizado */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-300 font-medium block">Outra quantidade:</span>
                  <span className="text-[10px] text-slate-500">De 1 a {Math.min(100, disponiveis.length || 100)} cotas</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantidadeCotas((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-base font-mono font-bold text-white min-w-[28px] text-center">
                    {quantidadeCotas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantidadeCotas((q) => Math.min(100, q + 1))}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Valor Total com Destaque de Economia */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37]/10 to-[#00FF88]/10 border border-[#D4AF37]/30 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold block">Valor Total:</span>
                  {economia > 0 && (
                    <span className="text-[11px] text-[#00FF88] font-bold flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                      Você economiza R$ {economia},00 no combo!
                    </span>
                  )}
                </div>
                <div className="text-right">
                  {economia > 0 && (
                    <span className="text-xs text-slate-400 line-through font-mono block">
                      R$ {(quantidadeCotas * precoPorCota).toFixed(2).replace('.', ',')}
                    </span>
                  )}
                  <span className="font-mono text-xl font-black text-[#D4AF37]">
                    R$ {valorTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* Botão de Avanço para a Roleta */}
              <button
                type="button"
                onClick={() => setEtapa('roleta')}
                className="w-full py-3.5 rounded-xl font-cinzel text-xs font-bold uppercase tracking-wider bg-[#00FF88] hover:bg-[#33ff9f] text-black glow-oz transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl min-h-[46px]"
              >
                <span>Ir para a Roleta da Sorte</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ETAPA 3: Roleta Gamificada */}
          {etapa === 'roleta' && (
            <motion.div
              key="step-roleta"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="space-y-4 flex flex-col items-center"
            >
              <div className="text-center">
                <h3 className="font-cinzel text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Gire a Roleta da Sorte!
                </h3>
                <p className="mt-0.5 text-slate-400 text-xs">
                  {quantidadeCotas === 1 
                    ? 'Sorteando 1 cota da sorte para você' 
                    : `Sorteando ${quantidadeCotas} cotas da sorte para você`}
                </p>
              </div>

              {/* Indicador de Meta do Bailarino em Tempo Real na Roleta */}
              {bailarinoAtivo && (
                <div className="w-full p-2.5 sm:p-3 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md shadow-md">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={bailarinoAtivo.fotoUrl}
                        alt={bailarinoAtivo.nome}
                        className="w-6 h-6 rounded-full object-cover border border-[#00FF88] shrink-0"
                      />
                      <span className="font-semibold text-white truncate text-[11px] sm:text-xs">
                        Meta de {bailarinoAtivo.nome.split(' ')[0]}:
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[#D4AF37] text-[11px] sm:text-xs shrink-0">
                      {bailarinoAtivo.totalVendido || 0} / {bailarinoAtivo.meta || totalCotas} cotas ({Math.min(100, Math.round(((bailarinoAtivo.totalVendido || 0) / (bailarinoAtivo.meta || totalCotas || 1)) * 100))}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-black/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#00FF88] via-[#D4AF37] to-[#FF007F] rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round(((bailarinoAtivo.totalVendido || 0) / (bailarinoAtivo.meta || totalCotas || 1)) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Componente Roleta Wicked Oficial Concêntrica */}
              <div className="w-full max-w-[280px] sm:max-w-[320px]">
                <RoletaWicked
                  controls={controls}
                  isSpinning={isSpinning}
                  onGirarClick={girarRoleta}
                />
              </div>

              {/* Bilhetes Sorteados e Fixáveis */}
              <div className="w-full">
                <BilhetesFixaveis
                  numerosSorteados={numerosSorteados}
                  indicesFixados={indicesFixados}
                  onToggleFix={toggleFixar}
                  isSpinning={isSpinning}
                />
              </div>

              {/* Botões de Ação da Roleta */}
              <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={girarRoleta}
                  disabled={isSpinning}
                  className={`flex-1 py-3 px-4 rounded-xl font-cinzel text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                    hasSpunOnce
                      ? 'bg-transparent border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10'
                      : 'bg-gradient-to-r from-[#D4AF37] via-[#00FF88] to-[#D4AF37] text-black hover:brightness-110 shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                  }`}
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
                  <span>{isSpinning ? 'Girando...' : hasSpunOnce ? 'Girar Restantes' : 'Girar Roleta'}</span>
                </button>

                {hasSpunOnce && !isSpinning && (
                  <button
                    type="button"
                    onClick={handleConfirmarNumeros}
                    className="flex-1 py-3 px-4 rounded-xl font-cinzel text-xs font-bold uppercase tracking-wider bg-[#00FF88] hover:bg-[#00E575] text-black shadow-[0_0_15px_rgba(0,255,136,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirmar Números</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ETAPA 4: Checkout e Identificação */}
          {etapa === 'checkout' && (
            <motion.div
              key="step-checkout"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="text-center">
                <h3 className="font-cinzel text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Dados do Apoiador
                </h3>
                <p className="mt-0.5 text-slate-400 text-xs">
                  Preencha para registrar suas cotas em seu nome e gerar o Pix.
                </p>
              </div>

              {/* Resumo Consolidado do Pedido */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                  <span className="text-slate-400">Bailarino apoiado:</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-[#FF007F] fill-current" />
                    {bailarinoAtivo?.nome}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                  <span className="text-slate-400">Números da sorte ({numerosSorteados.length}):</span>
                  <span className="font-mono font-bold text-[#00FF88]">
                    {numerosSorteados.map((n) => `#${n}`).join(', ')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider font-semibold">Total a Pagar:</span>
                    {economia > 0 && (
                      <span className="block text-[10px] text-[#00FF88] font-bold">
                        🎉 Economia de R$ {economia},00 ({comboAplicado?.badge || 'Combo Promocional'})
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {economia > 0 && (
                      <span className="block text-[11px] text-slate-500 line-through font-mono">
                        R$ {(quantidadeCotas * precoPorCota).toFixed(2).replace('.', ',')}
                      </span>
                    )}
                    <span className="font-mono text-base font-bold text-[#D4AF37]">
                      R$ {valorTotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Formulário de Identificação */}
              <form onSubmit={handleFinalizarCheckout} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Seu nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-[#00FF88] transition-colors"
                  />
                  {erros.nome && <p className="text-[11px] text-rose-400 mt-1">{erros.nome}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-[#00FF88] transition-colors"
                    />
                    {erros.email && <p className="text-[11px] text-rose-400 mt-1">{erros.email}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      WhatsApp com DDD *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="(31) 99999-9999"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-[#00FF88] transition-colors"
                    />
                    {erros.whatsapp && <p className="text-[11px] text-rose-400 mt-1">{erros.whatsapp}</p>}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isGeneratingPix}
                  className="w-full mt-2 py-3.5 rounded-xl font-cinzel text-xs font-bold uppercase tracking-wider bg-[#00FF88] hover:bg-[#33ff9f] disabled:bg-[#00FF88]/50 disabled:cursor-not-allowed text-black glow-oz transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl min-h-[46px]"
                >
                  {isGeneratingPix ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Gerando Pix Oficial Mercado Pago...</span>
                    </>
                  ) : (
                    <>
                      <Ticket className="w-4 h-4" />
                      <span>Gerar Pix de R$ {valorTotal.toFixed(2).replace('.', ',')}</span>
                    </>
                  )}
                </button>

                <div className="pt-1 text-center">
                  <a
                    href={gerarLinkSuporteWhatsApp(nome)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#00FF88] transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#00FF88]" />
                    <span>Dúvidas para apoiar? Fale com nosso suporte no WhatsApp</span>
                  </a>
                </div>
              </form>
            </motion.div>
          )}

          {/* ETAPA 5: Sucesso e Pagamento Pix */}
          {etapa === 'sucesso_pix' && pedidoConcluido && (
            <motion.div
              key="step-sucesso"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 text-center"
            >
              {pedidoPago ? (
                /* TELA DE CELEBRAÇÃO: PAGAMENTO CONFIRMADO EM TEMPO REAL */
                <div className="py-2 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Pagamento Aprovado Instantaneamente</span>
                    </div>
                    <h3 className="font-cinzel text-2xl font-bold text-white tracking-tight">
                      Parabéns, {pedidoConcluido.compradorNome}!
                    </h3>
                    <p className="mt-1 text-slate-300 text-xs sm:text-sm">
                      Recebemos a confirmação do seu Pix via Mercado Pago. Suas cotas foram registradas com sucesso!
                    </p>
                  </div>

                  {/* Relação das Cotas Garantidas */}
                  <div className="p-4 rounded-2xl bg-black/50 border border-emerald-500/30 text-left space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                      Seus Números da Sorte:
                    </span>
                    <p className="text-base font-mono font-bold text-[#00FF88] break-words">
                      {pedidoConcluido.numeros.map((n) => `#${n}`).join(', ')}
                    </p>
                    <p className="text-[11px] text-slate-400 pt-1 border-t border-white/5">
                      Comprovante registrado para <strong className="text-white">{pedidoConcluido.compradorEmail}</strong>
                    </p>
                  </div>

                  {/* Aviso de Recibo enviado por e-mail */}
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[#00FF88] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Recibo enviado para seu e-mail</h4>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                        O comprovante detalhado com seus números da sorte e instruções do sorteio foi encaminhado para <strong className="text-emerald-400">{pedidoConcluido.compradorEmail}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black font-bold text-sm hover:opacity-95 transition-all shadow-lg shadow-[#00FF88]/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Concluir</span>
                    </button>
                  </div>
                </div>
              ) : pedidoExpirado ? (
                /* TELA DE PEDIDO EXPIRADO COM COTAS LIBERADAS */
                <div className="space-y-4 py-2">
                  <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                    <AlertTriangle className="w-8 h-8" />
                  </div>

                  <div>
                    <h3 className="font-cinzel text-xl sm:text-2xl font-bold text-white tracking-tight">
                      Tempo de Pagamento Esgotado
                    </h3>
                    <p className="mt-1 text-slate-300 text-xs sm:text-sm">
                      O Pix não foi identificado dentro do prazo limite de 20 minutos.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/50 border border-rose-500/30 text-left space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                      Aviso sobre os números:
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Para garantir a justiça da campanha e não prender cotas, os números reservados (<strong className="text-white">{pedidoConcluido.numeros.map((n) => `#${n}`).join(', ')}</strong>) voltaram a ficar disponíveis para todos os apoiadores.
                    </p>
                    <p className="text-[11px] text-amber-300/90 pt-1 border-t border-white/5">
                      Se você ainda deseja participar, por favor inicie um novo pedido para gerar um novo código Pix.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleReiniciarNovoPedido}
                      className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black font-bold text-sm hover:opacity-95 transition-all shadow-lg shadow-[#00FF88]/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Fazer Novo Pedido</span>
                    </button>
                    <a
                      href={gerarLinkSuporteWhatsApp(pedidoConcluido.compradorNome)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Dúvidas com o Pix? Falar no WhatsApp</span>
                    </a>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              ) : (
                /* TELA DE PAGAMENTO PIX AGUARDANDO CONFIRMAÇÃO */
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#00FF88] text-xs font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Pix Oficial Mercado Pago</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      <span>Expira em: <strong>{formatarTempo(segundosRestantes)}</strong></span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-cinzel text-xl sm:text-2xl font-bold text-white tracking-tight">
                      Efetue o Pagamento Pix
                    </h3>
                    <p className="mt-1 text-slate-300 text-xs sm:text-sm">
                      Valor total: <strong className="text-[#00FF88]">R$ {pedidoConcluido.valorTotal.toFixed(2).replace('.', ',')}</strong>
                    </p>
                  </div>

                  {/* QR Code Oficial em Base64 ou Fallback */}
                  <div className="p-4 rounded-2xl bg-white text-black max-w-xs mx-auto shadow-2xl space-y-2">
                    <div className="w-44 h-44 mx-auto bg-white rounded-xl flex items-center justify-center p-1">
                      {pedidoConcluido.qrCodeBase64 ? (
                        <img 
                          src={`data:image/png;base64,${pedidoConcluido.qrCodeBase64}`}
                          alt="QR Code Pix Mercado Pago"
                          className="w-40 h-40 object-contain rounded-lg"
                        />
                      ) : (
                        <QrCode className="w-36 h-36 text-slate-900" />
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Escaneie com o aplicativo do seu banco
                    </div>
                  </div>

                  {/* Código Pix Copia e Cola */}
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-left space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                      Pix Copia e Cola:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={pedidoConcluido.codigoPix}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 select-all"
                      />
                      <button
                        type="button"
                        onClick={copiarPix}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                          pixCopiado ? 'bg-emerald-400 text-black' : 'bg-[#00FF88] text-black hover:bg-[#33ff9f]'
                        }`}
                      >
                        {pixCopiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{pixCopiado ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Indicador de Espera Realtime */}
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00FF88]" />
                    <span>Aguardando confirmação bancária em tempo real...</span>
                  </div>

                  {/* Botão de Verificação Manual */}
                  <div className="flex items-center justify-center gap-4 text-xs pt-1">
                    <button
                      type="button"
                      onClick={verificarStatusManual}
                      disabled={verificandoManual}
                      className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
                    >
                      <RefreshCw className={`w-3 h-3 ${verificandoManual ? 'animate-spin text-[#00FF88]' : ''}`} />
                      <span>{verificandoManual ? 'Consultando...' : 'Já paguei, verificar agora'}</span>
                    </button>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <a
                      href={gerarLinkSuporteWhatsApp(pedidoConcluido.compradorNome)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Suporte WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Fechar e pagar depois
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
