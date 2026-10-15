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
  CheckCircle2 
} from 'lucide-react';
import { z } from 'zod';
import { useCampanha } from '../../hooks/useCampanha';
import { useToast } from '../../hooks/useToast';
import { PRECO_POR_COTA } from '../../constants/campanha';
import { RoletaWicked } from '../sorteio/RoletaWicked';
import { BilhetesFixaveis } from '../sorteio/BilhetesFixaveis';
import type { PedidoCheckout } from '../../types';

// 10 Números Oficiais das fatias da Roleta Wicked
const NUMEROS_ROLETA = [1192, 23, 856, 78, 312, 66, 815, 1044, 12, 407];

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
}

export const ModalFluxoApoio: React.FC<ModalFluxoApoioProps> = ({
  isOpen,
  onClose,
  bailarinoPreSelecionadoId,
}) => {
  const { 
    bailarinos, 
    cotas, 
    bailarinoSelecionadoId, 
    setBailarinoSelecionadoId, 
    selecionarCotasEmLote,
    concluirPedido,
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

  // Sincroniza abertura do modal e pré-seleção
  useEffect(() => {
    if (isOpen) {
      if (bailarinoPreSelecionadoId) {
        setBailarinoIdEscolhido(bailarinoPreSelecionadoId);
        setBailarinoSelecionadoId(bailarinoPreSelecionadoId);
      } else if (bailarinoSelecionadoId) {
        setBailarinoIdEscolhido(bailarinoSelecionadoId);
      } else {
        setBailarinoIdEscolhido(null);
      }
      setEtapa('bailarino');
      setHasSpunOnce(false);
      setNumerosSorteados([]);
      setIndicesFixados([]);
      setPedidoConcluido(null);
      setErros({});
    }
  }, [isOpen, bailarinoPreSelecionadoId]);

  const bailarinoAtivo = bailarinoIdEscolhido === 'campanha-geral'
    ? {
        id: 'campanha-geral',
        nome: 'Campanha Geral (Talentos de Minas)',
        fotoUrl: '/logo_talentos.webp',
        meta: 1200,
        totalVendido: 0,
        totalApoios: 0,
        ativo: true,
      }
    : bailarinos.find((b) => b.id === bailarinoIdEscolhido);
  const valorTotal = quantidadeCotas * PRECO_POR_COTA;

  // Lista de cotas disponíveis
  const disponiveis = cotas.filter((c) => c.status === 'disponivel').map((c) => c.numero);

  // Executa o sorteio com parada no ponteiro superior
  const girarRoleta = useCallback(async () => {
    if (isSpinning || disponiveis.length === 0) return;

    try {
      setIsSpinning(true);

      const indiceFatiaSorteada = Math.floor(Math.random() * 10);
      const numeroDaFatia = NUMEROS_ROLETA[indiceFatiaSorteada];
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

      if (!hasSpunOnce) {
        const piscinaRestante = disponiveis.filter((n) => n !== numeroDaFatia);
        const aleatoriosExtras = piscinaRestante
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.max(0, quantidadeCotas - 1));

        const novosNumeros = [numeroDaFatia, ...aleatoriosExtras].slice(0, quantidadeCotas);
        setNumerosSorteados(novosNumeros);
        setHasSpunOnce(true);
      } else {
        const piscina = disponiveis.filter((n) => !numerosSorteados.includes(n));
        const novosAleatorios = piscina.sort(() => 0.5 - Math.random());
        let ponteiro = 0;

        const atualizados = [...numerosSorteados];
        for (let i = 0; i < quantidadeCotas; i++) {
          if (!indicesFixados.includes(i)) {
            atualizados[i] = novosAleatorios[ponteiro++] || atualizados[i];
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

  const handleFinalizarCheckout = (e: React.FormEvent) => {
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

    const pedido = concluirPedido({
      nome,
      email,
      whatsapp,
      bailarinoId: bailarinoIdEscolhido,
    });

    setPedidoConcluido(pedido);
    setEtapa('sucesso_pix');

    showToast({
      type: 'success',
      title: 'Apoio Registrado com Sucesso!',
      message: 'Efetue o pagamento Pix para confirmar suas cotas.',
      duration: 6000,
    });
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

              {/* Miniatura do Bailarino Escolhido */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={bailarinoAtivo?.fotoUrl}
                    alt={bailarinoAtivo?.nome}
                    className="w-9 h-9 rounded-lg object-cover border border-white/10"
                  />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Apoiando:</span>
                    <span className="text-xs font-bold text-white">{bailarinoAtivo?.nome}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEtapa('bailarino')}
                  className="text-[11px] text-[#00FF88] hover:underline cursor-pointer"
                >
                  Trocar
                </button>
              </div>

              {/* Seletor Rápido de Cotas */}
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 5, 10].map((qtd) => (
                  <button
                    key={qtd}
                    type="button"
                    onClick={() => {
                      setQuantidadeCotas(qtd);
                      setHasSpunOnce(false);
                      setNumerosSorteados([]);
                      setIndicesFixados([]);
                    }}
                    className={`py-3 px-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer border ${
                      quantidadeCotas === qtd
                        ? 'bg-[#00FF88] text-black border-[#00FF88] shadow-[0_0_12px_rgba(0,255,136,0.5)]'
                        : 'bg-black/30 border-white/10 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div className="text-base font-extrabold">{qtd}</div>
                    <div className="text-[10px] uppercase font-semibold">{qtd === 1 ? 'Cota' : 'Cotas'}</div>
                  </button>
                ))}
              </div>

              {/* Stepper Manual Personalizado */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Outra quantidade:</span>
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
                    onClick={() => setQuantidadeCotas((q) => Math.min(50, q + 1))}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Valor Total */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37]/10 to-[#00FF88]/10 border border-[#D4AF37]/30 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold">Valor Total:</span>
                <span className="font-mono text-xl font-black text-[#D4AF37]">
                  R$ {valorTotal.toFixed(2).replace('.', ',')}
                </span>
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
                  <span className="text-slate-400 uppercase tracking-wider font-semibold">Total a Pagar:</span>
                  <span className="font-mono text-base font-bold text-[#D4AF37]">
                    R$ {valorTotal.toFixed(2).replace('.', ',')}
                  </span>
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
                  className="w-full mt-2 py-3.5 rounded-xl font-cinzel text-xs font-bold uppercase tracking-wider bg-[#00FF88] hover:bg-[#33ff9f] text-black glow-oz transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl min-h-[46px]"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Gerar Pix de R$ {valorTotal.toFixed(2).replace('.', ',')}</span>
                </button>
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
              <div className="w-12 h-12 rounded-full bg-[#00FF88]/20 border border-[#00FF88] text-[#00FF88] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-cinzel text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Reserva Gerada com Sucesso!
                </h3>
                <p className="mt-1 text-slate-300 text-xs sm:text-sm">
                  Pague via Pix em até 15 minutos para garantir seus números da sorte.
                </p>
              </div>

              {/* QR Code Simulado e Chave Copia e Cola */}
              <div className="p-4 rounded-2xl bg-white text-black max-w-xs mx-auto shadow-2xl space-y-3">
                <div className="w-40 h-40 mx-auto bg-slate-100 rounded-xl flex items-center justify-center border border-slate-300 p-2">
                  <QrCode className="w-36 h-36 text-slate-900" />
                </div>
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Escaneie com o app do seu banco
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
                    className="px-3 py-1.5 rounded-lg bg-[#00FF88] text-black text-xs font-bold hover:bg-[#33ff9f] flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{pixCopiado ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Concluir e Fechar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
