import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { Modal } from '../common/Modal';
import { useCampanha } from '../../hooks/useCampanha';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import { 
  QrCode, 
  Copy, 
  Heart, 
  ArrowRight, 
  MessageCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  RefreshCw,
  Check,
  AlertTriangle,
  Clock,
  RotateCw,
  Mail
} from 'lucide-react';
import { gerarLinkSuporteWhatsApp } from '../../utils/whatsappSupport';
import type { PedidoCheckout } from '../../types';

const checkoutSchema = z.object({
  nome: z.string().min(3, 'Por favor, informe seu nome completo (mínimo 3 caracteres)'),
  email: z.string().email('Por favor, informe um endereço de e-mail válido'),
  whatsapp: z.string().min(10, 'Informe um WhatsApp com DDD válido (ex: 31 99999-9999)'),
  bailarinoId: z.string().min(1, 'Por favor, selecione o bailarino que você deseja apoiar'),
});

export const CheckoutModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { cotasSelecionadas, bailarinos, bailarinoSelecionadoId, concluirPedido, precoPorCota, carregarDadosReais, calcularValorCotas } = useCampanha();
  const { showToast } = useToast();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [bailarinoIdManual, setBailarinoIdManual] = useState<string | null>(null);
  const [pedidoConcluido, setPedidoConcluido] = useState<PedidoCheckout | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [pixCopiado, setPixCopiado] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [pedidoPago, setPedidoPago] = useState(false);
  const [verificandoManual, setVerificandoManual] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(1200);
  const [pedidoExpirado, setPedidoExpirado] = useState(false);

  const bailarinoId = bailarinoIdManual ?? bailarinoSelecionadoId ?? bailarinos[0]?.id ?? '';

  const { valorTotal, comboAplicado, economia } = calcularValorCotas(cotasSelecionadas.length);

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
              message: 'Seu Pix foi validado instantaneamente pelo Mercado Pago!',
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

  const handleFinalizar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErros({});

    const validacao = checkoutSchema.safeParse({ nome, email, whatsapp, bailarinoId });
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
      // Processa o pedido e gera o Pix oficial via Edge Function
      const pedido = await concluirPedido({ nome, email, whatsapp, bailarinoId });
      setPedidoConcluido(pedido);

      showToast({
        type: 'success',
        title: 'Pix Oficial Gerado!',
        message: `Escaneie o QR Code ou copie o código Pix para validar suas cotas.`,
        duration: 6000,
      });
    } catch (err: any) {
      console.error('Erro ao gerar pedido Pix:', err);
      showToast({
        type: 'error',
        title: 'Erro ao gerar Pix',
        message: err?.message || 'Falha ao conectar com o gateway do Mercado Pago.',
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

  const handleFecharTudo = () => {
    setPedidoConcluido(null);
    setPedidoPago(false);
    setPedidoExpirado(false);
    setSegundosRestantes(1200);
    setIsGeneratingPix(false);
    setNome('');
    setEmail('');
    setWhatsapp('');
    onClose();
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
    carregarDadosReais();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleFecharTudo}
      title={pedidoConcluido ? 'Pagamento Pix & Confirmação' : 'Finalizar Apoio na Campanha Digital'}
      maxWidth="lg"
    >
      {!pedidoConcluido ? (
        <form onSubmit={handleFinalizar} className="space-y-4">
          {/* Resumo do Pedido */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Cotas Escolhidas</span>
              <p className="text-sm font-mono text-[#00FF88] font-bold mt-0.5">
                {cotasSelecionadas.map((n) => `#${n}`).join(', ')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Total a pagar</span>
              {economia > 0 && (
                <span className="block text-[11px] text-slate-500 line-through font-mono">
                  R$ {(cotasSelecionadas.length * precoPorCota).toFixed(2).replace('.', ',')}
                </span>
              )}
              <p className="text-base font-bold text-white">R$ {valorTotal.toLocaleString('pt-BR')},00</p>
              {economia > 0 && (
                <span className="block text-[10px] text-[#00FF88] font-bold">
                  Economia de R$ {economia},00 ({comboAplicado?.badge || 'Combo'})
                </span>
              )}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Nome Completo *</label>
            <input
              type="text"
              placeholder="Digite seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-4 py-3 sm:py-2.5 rounded-xl text-base sm:text-sm bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88]"
            />
            {erros.nome && <p className="text-xs text-rose-400 mt-1">{erros.nome}</p>}
          </div>

          {/* E-mail & WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">E-mail para Confirmação *</label>
              <input
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 sm:py-2.5 rounded-xl text-base sm:text-sm bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88]"
              />
              {erros.email && <p className="text-xs text-rose-400 mt-1">{erros.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">WhatsApp *</label>
              <input
                type="tel"
                placeholder="(31) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-4 py-3 sm:py-2.5 rounded-xl text-base sm:text-sm bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88]"
              />
              {erros.whatsapp && <p className="text-xs text-rose-400 mt-1">{erros.whatsapp}</p>}
            </div>
          </div>

          {/* Bailarino Apoiado */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[#FF007F]" />
              <span>Bailarino(a) Apoiado(a) *</span>
            </label>
            <select
              value={bailarinoId}
              onChange={(e) => setBailarinoIdManual(e.target.value)}
              className="w-full px-4 py-3 sm:py-2.5 rounded-xl text-base sm:text-sm bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#00FF88]"
            >
              <option value="">Selecione um bailarino...</option>
              {bailarinos
                .filter((b) => b.ativo)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
            </select>
            {erros.bailarinoId && <p className="text-xs text-rose-400 mt-1">{erros.bailarinoId}</p>}
          </div>

          <button
            type="submit"
            disabled={isGeneratingPix}
            className="w-full mt-4 py-3 rounded-xl font-cinzel text-sm font-bold text-black bg-[#00FF88] hover:bg-[#33ff9f] disabled:bg-[#00FF88]/50 disabled:cursor-not-allowed glow-oz transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            {isGeneratingPix ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Gerando Pix Oficial Mercado Pago...</span>
              </>
            ) : (
              <>
                <span>Gerar Pagamento Pix</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        /* Tela Pós-Compra com QR Code Oficial e Confirmação em Tempo Real */
        <div className="text-center space-y-4">
          {pedidoPago ? (
            /* CELEBRAÇÃO: PAGAMENTO APROVADO */
            <div className="py-2 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Pagamento Aprovado Instantaneamente</span>
                </div>
                <h4 className="font-cinzel text-2xl font-bold text-white">Parabéns, {pedidoConcluido.compradorNome}!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Recebemos a confirmação oficial do seu Pix. Seus números já estão registrados e concorrendo no sorteio!
                </p>
              </div>

              {/* Relação dos Números Confirmados */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-left text-xs space-y-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Seus Números Garantidos:
                </span>
                <p className="text-sm font-mono font-bold text-[#00FF88] break-words">
                  {pedidoConcluido.numeros.map((n) => `#${n}`).join(', ')}
                </p>
                <p className="text-slate-400 pt-1 border-t border-white/5">
                  Comprovante registrado para <strong className="text-white">{pedidoConcluido.compradorEmail}</strong>
                </p>
              </div>

              {/* Aviso de Recibo enviado por e-mail */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-left flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#00FF88] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Recibo enviado para seu e-mail</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    O comprovante com seus números da sorte e instruções do sorteio foi encaminhado para <strong className="text-emerald-400">{pedidoConcluido.compradorEmail}</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleFecharTudo}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black font-bold text-xs hover:opacity-95 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Concluir</span>
                </button>
              </div>
            </div>
          ) : pedidoExpirado ? (
            /* TELA DE PEDIDO EXPIRADO */
            <div className="space-y-4 py-2 text-center">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-cinzel text-xl font-bold text-white">Tempo de Pagamento Esgotado</h4>
                <p className="text-xs text-slate-300 mt-1">
                  O Pix não foi concluído dentro do prazo limite de 20 minutos.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/50 border border-rose-500/30 text-left space-y-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Cotas Liberadas:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Para não prender números da campanha, as cotas (<strong className="text-white">{pedidoConcluido.numeros.map((n) => `#${n}`).join(', ')}</strong>) voltaram a ficar livres para todos os apoiadores.
                </p>
                <p className="text-[11px] text-amber-300/90 pt-1 border-t border-white/5">
                  Por favor, gere um novo pedido para escolher seus números e concluir o apoio.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReiniciarNovoPedido}
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black font-bold text-xs hover:opacity-95 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Fazer Novo Pedido</span>
                </button>
                <button
                  type="button"
                  onClick={handleFecharTudo}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            /* AGUARDANDO PAGAMENTO */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#00FF88] text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Pix Automático Oficial Mercado Pago</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span>Expira em: <strong>{formatarTempo(segundosRestantes)}</strong></span>
                </div>
              </div>

              <div>
                <h4 className="font-cinzel text-xl font-bold text-white">Quase lá, {pedidoConcluido.compradorNome}!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Valor a pagar: <strong className="text-[#00FF88]">R$ {pedidoConcluido.valorTotal.toLocaleString('pt-BR')},00</strong>
                </p>
              </div>

              {/* QR Code Oficial em Base64 ou fallback */}
              <div className="p-4 bg-white rounded-2xl w-48 h-48 mx-auto flex flex-col items-center justify-center shadow-lg">
                {pedidoConcluido.qrCodeBase64 ? (
                  <img
                    src={`data:image/png;base64,${pedidoConcluido.qrCodeBase64}`}
                    alt="QR Code Pix Mercado Pago"
                    className="w-40 h-40 object-contain rounded-lg"
                  />
                ) : (
                  <QrCode className="w-36 h-36 text-black" />
                )}
                <span className="text-[10px] text-gray-700 font-bold mt-1">PIX OFICIAL</span>
              </div>

              {/* Botão Copiar Código Pix Copia e Cola */}
              <div className="flex items-center gap-2 max-w-md mx-auto">
                <input
                  readOnly
                  value={pedidoConcluido.codigoPix}
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/10 text-slate-400 font-mono truncate select-all"
                />
                <button
                  type="button"
                  onClick={copiarPix}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    pixCopiado ? 'bg-emerald-400 text-black' : 'bg-[#00FF88] text-black hover:bg-[#33ff9f]'
                  }`}
                >
                  {pixCopiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{pixCopiado ? 'Copiado!' : 'Copiar Pix'}</span>
                </button>
              </div>

              {/* Status em Tempo Real via WebSocket */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00FF88]" />
                <span>Aguardando confirmação bancária em tempo real...</span>
              </div>

              {/* Relação dos Números e Botão de Verificação Manual */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 text-left text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-slate-300">
                    <strong className="text-white">Seus Números:</strong>{' '}
                    <span className="text-[#00FF88] font-mono font-bold">
                      {pedidoConcluido.numeros.map((n) => `#${n}`).join(', ')}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(pedidoConcluido.numeros.map((n) => `#${n}`).join(', '));
                      showToast({ type: 'info', title: 'Números Copiados', message: 'Lista copiada para sua área de transferência.' });
                    }}
                    className="text-[11px] text-[#00FF88] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    Copiar
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-slate-400">Não atualizou automaticamente?</span>
                  <button
                    type="button"
                    onClick={verificarStatusManual}
                    disabled={verificandoManual}
                    className="text-[#00FF88] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${verificandoManual ? 'animate-spin' : ''}`} />
                    <span>{verificandoManual ? 'Checando...' : 'Verificar status'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <a
                  href={gerarLinkSuporteWhatsApp(pedidoConcluido.compradorNome)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Dúvidas no WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={handleFecharTudo}
                  className="py-2.5 px-5 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
                >
                  Pagar depois
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
