import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import type { ProdutoLoja } from '../../types';
import { 
  ShoppingBag, 
  Clock, 
  Copy, 
  Check, 
  Building2, 
  CheckCircle2, 
  Loader2, 
  QrCode
} from 'lucide-react';

interface CheckoutModalLojaProps {
  isOpen: boolean;
  onClose: () => void;
  produto: ProdutoLoja | null;
}

export const CheckoutModalLoja: React.FC<CheckoutModalLojaProps> = ({
  isOpen,
  onClose,
  produto,
}) => {
  const { showToast } = useToast();

  const [tamanho, setTamanho] = useState<string>('');
  const [quantidade, setQuantidade] = useState(1);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const [etapa, setEtapa] = useState<'formulario' | 'pix' | 'concluido'>('formulario');
  const [processando, setProcessando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [codigoPix, setCodigoPix] = useState<string>('');
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [tempoRestante, setTempoRestante] = useState(20 * 60); // 20 minutos

  // Define tamanho padrão inicial quando o produto abre
  useEffect(() => {
    if (produto?.tamanhosDisponiveis && produto.tamanhosDisponiveis.length > 0) {
      setTamanho(produto.tamanhosDisponiveis[0]);
    } else {
      setTamanho('Único');
    }
    setQuantidade(1);
    setEtapa('formulario');
    setCodigoPix('');
    setQrCodeBase64(null);
    setOrderId(null);
    setTempoRestante(20 * 60);
  }, [produto, isOpen]);

  // Timer de Expiração do Pix (20 minutos)
  useEffect(() => {
    if (etapa !== 'pix' || tempoRestante <= 0) return;

    const timer = setInterval(() => {
      setTempoRestante((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [etapa, tempoRestante]);

  // Escuta em tempo real a confirmação do pagamento no Supabase
  useEffect(() => {
    if (!orderId || etapa !== 'pix') return;

    const canal = supabase
      .channel(`loja_order_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'loja_orders',
          filter: `id=eq.${orderId}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.status === 'paid') {
            setEtapa('concluido');
            showToast({
              type: 'success',
              title: 'Pagamento Confirmado!',
              message: 'Seu pedido da loja foi aprovado. Apresente este comprovante na escola.',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [orderId, etapa, showToast]);

  if (!produto) return null;

  const total = Number(produto.preco) * quantidade;

  const handleCopiarPix = async () => {
    if (!codigoPix) return;
    try {
      await navigator.clipboard.writeText(codigoPix);
      setCopiado(true);
      showToast({
        type: 'success',
        title: 'Copiado!',
        message: 'Código Pix Copia-e-Cola copiado com sucesso.',
      });
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      showToast({
        type: 'error',
        title: 'Erro ao Copiar',
        message: 'Selecione o código manualmente e copie.',
      });
    }
  };

  const handleFinalizarPedido = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      showToast({ type: 'warning', title: 'Campo Obrigatório', message: 'Informe seu nome completo.' });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast({ type: 'warning', title: 'E-mail Inválido', message: 'Informe um e-mail válido para envio do recibo.' });
      return;
    }
    const cleanPhone = whatsapp.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      showToast({ type: 'warning', title: 'WhatsApp Inválido', message: 'Informe seu WhatsApp com DDD (ex: 31988887777).' });
      return;
    }

    try {
      setProcessando(true);
      const novoId = crypto.randomUUID();

      // 1. Cria pedido com status pending
      const { error: insertErr } = await supabase.from('loja_orders').insert([
        {
          id: novoId,
          produto_id: produto.id,
          produto_nome: produto.nome,
          quantidade,
          tamanho,
          customer_name: nome.trim(),
          customer_email: email.trim().toLowerCase(),
          customer_phone: cleanPhone,
          total_price: total,
          status: 'pending',
          payment_method: 'pix',
          payment_origin: 'mercadopago',
        },
      ]);

      if (insertErr) {
        throw new Error('Falha ao registrar pedido: ' + insertErr.message);
      }

      setOrderId(novoId);

      // 2. Invoca o Mercado Pago via Edge Function oficial
      const { data: mpData, error: fnErr } = await supabase.functions.invoke('create-mercado-pago-payment', {
        body: {
          order_id: novoId,
          total_price: total,
          customer_name: nome.trim(),
          customer_email: email.trim().toLowerCase(),
          description: `Talentos de Minas - ${quantidade}x ${produto.nome}${tamanho ? ` (Tam: ${tamanho})` : ''}`,
          order_type: 'loja',
        },
      });

      if (fnErr || !mpData?.success) {
        throw new Error(mpData?.error || fnErr?.message || 'Erro ao gerar Pix no Mercado Pago');
      }

      setCodigoPix(mpData.qr_code || '');
      setQrCodeBase64(mpData.qr_code_base64 || null);
      setEtapa('pix');
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro no Pagamento',
        message: err?.message || 'Não foi possível gerar a cobrança Pix.',
      });
    } finally {
      setProcessando(false);
    }
  };

  const formatarTempo = (segundos: number) => {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        etapa === 'concluido'
          ? 'Pedido Confirmado!'
          : etapa === 'pix'
          ? 'Pagamento via Pix'
          : 'Finalizar Pedido na Loja'
      }
      maxWidth="md"
    >
      <div className="space-y-5 text-slate-200">
        {/* RESUMO DO PRODUTO */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0 flex items-center justify-center">
            {produto.fotoUrl ? (
              <img src={produto.fotoUrl} alt={produto.nome} className="w-full h-full object-cover" />
            ) : (
              <ShoppingBag className="w-6 h-6 text-[#FF007F]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-cinzel text-sm sm:text-base font-bold text-white truncate">
              {produto.nome}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Unitário: <strong className="text-white">R$ {Number(produto.preco).toFixed(2).replace('.', ',')}</strong>
            </p>
            <p className="text-[11px] text-[#00FF88] font-bold font-mono mt-0.5">
              Total ({quantidade}x): R$ {total.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>

        {/* ALERTA OBRIGATÓRIO DE RETIRADA NA ESCOLA */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3">
          <Building2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="text-white block font-semibold mb-0.5">
              Retirada Presencial na Escola
            </strong>
            Todos os produtos adquiridos na loja devem ser <strong>retirados na recepção da escola Talentos de Minas</strong> após confirmação. Eventuais despesas de frete ou deslocamento são por conta exclusiva do comprador.
          </div>
        </div>

        {/* ETAPA 1: FORMULÁRIO */}
        {etapa === 'formulario' && (
          <form onSubmit={handleFinalizarPedido} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tamanho */}
              {produto.tamanhosDisponiveis && produto.tamanhosDisponiveis.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Tamanho / Variação:
                  </label>
                  <select
                    value={tamanho}
                    onChange={(e) => setTamanho(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-[#00FF88]"
                  >
                    {produto.tamanhosDisponiveis.map((tam) => (
                      <option key={tam} value={tam} className="bg-slate-900 text-white">
                        {tam}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantidade */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Quantidade:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-base flex items-center justify-center border border-white/10 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-mono font-bold text-sm text-white">
                    {quantidade}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantidade((q) => Math.min(10, q + 1))}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-base flex items-center justify-center border border-white/10 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Dados do Comprador */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Seu Nome Completo:
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Maria Clara Souza"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-[#00FF88]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Seu E-mail (para o recibo):
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-[#00FF88]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  WhatsApp com DDD:
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(31) 98888-7777"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-[#00FF88]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={processando}
              className="w-full py-3.5 rounded-xl font-cinzel text-xs font-bold uppercase tracking-wider bg-[#00FF88] text-black hover:bg-[#33ff9f] glow-oz transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 mt-2"
            >
              {processando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando Cobrança Pix...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Pagar R$ {total.toFixed(2).replace('.', ',')} via Pix</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ETAPA 2: COBRANÇA PIX COM QR CODE */}
        {etapa === 'pix' && (
          <div className="space-y-4 text-center">
            <div className="p-3 rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/30 flex items-center justify-center gap-2 text-xs font-mono font-bold text-[#00FF88]">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>Tempo para pagamento: {formatarTempo(tempoRestante)}</span>
            </div>

            {/* QR Code */}
            <div className="p-4 bg-white rounded-2xl w-56 h-56 mx-auto flex items-center justify-center shadow-xl">
              {qrCodeBase64 ? (
                <img
                  src={`data:image/png;base64,${qrCodeBase64}`}
                  alt="QR Code Pix"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-800 text-xs text-center p-2">
                  <QrCode className="w-12 h-12 mb-2 text-slate-800" />
                  <span>Abra seu app do banco e escaneie ou copie a chave abaixo</span>
                </div>
              )}
            </div>

            {/* Chave Pix Copia e Cola */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                Código Pix Copia e Cola:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={codigoPix}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-slate-300 font-mono text-[11px] select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopiarPix}
                  className="px-4 py-2.5 rounded-xl bg-[#00FF88] text-black font-bold text-xs hover:bg-[#33ff9f] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiado ? 'Copiado!' : 'Copiar Pix'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-2">
              Assim que o pagamento for concluído no seu banco, esta tela atualizará automaticamente.
            </p>
          </div>
        )}

        {/* ETAPA 3: CONCLUÍDO */}
        {etapa === 'concluido' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-[#00FF88] border border-emerald-500/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="font-cinzel text-lg font-bold text-white">
              Pagamento Aprovado com Sucesso!
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
              Seu pedido de <strong>{quantidade}x {produto.nome}</strong> foi confirmado no sistema.
            </p>

            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Titular:</span>
                <span className="font-bold text-white">{nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Produto:</span>
                <span className="text-white">{produto.nome} ({tamanho})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Local de Retirada:</span>
                <span className="font-semibold text-amber-300">Secretaria Talentos de Minas</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
