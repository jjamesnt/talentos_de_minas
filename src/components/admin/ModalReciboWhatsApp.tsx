import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useToast } from '../../hooks/useToast';
import { Copy, Check, MessageCircle, ExternalLink, Receipt, Phone } from 'lucide-react';
import type { PedidoLoja } from '../../types';

export interface ModalReciboWhatsAppProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: 'cota' | 'loja';
  pedidoCota?: {
    id: string;
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    selected_numbers?: number[];
    dancer_id?: string;
    dancer_name?: string;
    total_price: number;
    status: string;
    created_at: string;
    payment_origin?: string;
  } | null;
  pedidoLoja?: PedidoLoja | null;
}

export const ModalReciboWhatsApp: React.FC<ModalReciboWhatsAppProps> = ({
  isOpen,
  onClose,
  tipo,
  pedidoCota,
  pedidoLoja
}) => {
  const { showToast } = useToast();
  const [mensagem, setMensagem] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Gera o texto detalhado do recibo ao abrir ou alternar pedido
  useEffect(() => {
    if (!isOpen) return;

    if (tipo === 'cota' && pedidoCota) {
      const dataFormatada = new Date(pedidoCota.created_at || Date.now()).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const numerosStr = Array.isArray(pedidoCota.selected_numbers) && pedidoCota.selected_numbers.length > 0
        ? pedidoCota.selected_numbers.map(n => `#${String(n).padStart(4, '0')}`).join(', ')
        : 'Nenhum número registrado';

      const qtdCotas = Array.isArray(pedidoCota.selected_numbers) ? pedidoCota.selected_numbers.length : 1;
      const isPago = pedidoCota.status === 'paid';
      const statusLabel = isPago ? '✅ PAGO / CONFIRMADO' : '⏳ AGUARDANDO PAGAMENTO';

      const texto = `🎭 *TALENTOS DE MINAS BALLET • WICKED 2026*
🎟️ *COMPROVANTE OFICIAL DE PARTICIPAÇÃO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Olá, *${pedidoCota.customer_name}*! Agradecemos imensamente por apoiar nosso espetáculo cultural!

📄 *DADOS DA PARTICIPAÇÃO:*
• *Comprador:* ${pedidoCota.customer_name}
• *Telefone:* ${pedidoCota.customer_phone || 'Não informado'}
${pedidoCota.dancer_name ? `• *Bailarino(a) Apoiado(a):* ${pedidoCota.dancer_name}\n` : ''}• *Cotas / Números da Sorte:* ${numerosStr}
• *Quantidade de Cotas:* ${qtdCotas} cota(s)
• *Valor Total:* R$ ${Number(pedidoCota.total_price || 0).toLocaleString('pt-BR')},00
• *Forma de Pagamento:* Pix Instantâneo
• *Status:* ${statusLabel}
• *Código do Pedido:* #${pedidoCota.id.slice(0, 8).toUpperCase()}
• *Data da Compra:* ${dataFormatada}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ *INFORMAÇÕES DO SORTEIO:*
O sorteio de 5 super prêmios será realizado ao vivo no perfil oficial do Instagram *@talentosdeminasballet* por meio de sorteador online, assim que todas as cotas forem preenchidas.

Muito obrigado por fazer parte desse sonho e boa sorte! 🍀💚`;

      setMensagem(texto);
    } else if (tipo === 'loja' && pedidoLoja) {
      const dataFormatada = new Date(pedidoLoja.created_at || Date.now()).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const isPago = pedidoLoja.status === 'paid';
      const statusLabel = isPago ? '✅ PAGO / CONFIRMADO' : '⏳ AGUARDANDO PAGAMENTO';
      const retiradaStatus = pedidoLoja.retirado 
        ? `✅ RETIRADO NA ESCOLA (em ${pedidoLoja.retirado_em ? new Date(pedidoLoja.retirado_em).toLocaleDateString('pt-BR') : 'data confirmada'})`
        : '📦 AGUARDANDO RETIRADA NA ESCOLA';

      const texto = `🛍️ *TALENTOS DE MINAS BALLET • LOJA OFICIAL*
📦 *COMPROVANTE OFICIAL DO PEDIDO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Olá, *${pedidoLoja.customer_name}*! Confirmamos o registro do seu pedido na loja do Festival Wicked 2026!

📄 *DETALHES DO PEDIDO:*
• *Comprador:* ${pedidoLoja.customer_name}
• *Telefone:* ${pedidoLoja.customer_phone || 'Não informado'}
• *Produto:* ${pedidoLoja.produto_nome}
${pedidoLoja.tamanho ? `• *Tamanho:* ${pedidoLoja.tamanho}\n` : ''}• *Quantidade:* ${pedidoLoja.quantidade} unidade(s)
• *Valor Total:* R$ ${Number(pedidoLoja.total_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• *Forma de Pagamento:* Pix Instantâneo
• *Status do Pagamento:* ${statusLabel}
• *Código do Pedido:* #${pedidoLoja.id.slice(0, 8).toUpperCase()}
• *Data da Compra:* ${dataFormatada}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 *RETIRADA EXCLUSIVA NA ESCOLA:*
Todos os produtos adquiridos na loja oficial devem ser retirados presencialmente na sede do *Talentos de Minas Ballet*.
Quaisquer despesas com deslocamento ou frete são por conta do comprador.

• *Situação:* ${retiradaStatus}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Muito obrigado por apoiar nossos talentos e a realização desse espetáculo! 💚✨`;

      setMensagem(texto);
    }
    setCopiado(false);
  }, [isOpen, tipo, pedidoCota, pedidoLoja]);

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
      showToast({
        type: 'success',
        title: 'Recibo Copiado!',
        message: 'A mensagem do recibo foi copiada para sua área de transferência.'
      });
      setTimeout(() => setCopiado(false), 2500);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Erro ao Copiar',
        message: 'Não foi possível copiar automaticamente. Selecione o texto e use Ctrl+C / Cmd+C.'
      });
    }
  };

  const telefoneDestino = tipo === 'cota' 
    ? pedidoCota?.customer_phone?.replace(/\D/g, '') || ''
    : pedidoLoja?.customer_phone?.replace(/\D/g, '') || '';

  const nomeDestino = tipo === 'cota'
    ? pedidoCota?.customer_name || 'Cliente'
    : pedidoLoja?.customer_name || 'Cliente';

  const valorTotal = tipo === 'cota'
    ? pedidoCota?.total_price || 0
    : pedidoLoja?.total_price || 0;

  const isPago = tipo === 'cota'
    ? pedidoCota?.status === 'paid'
    : pedidoLoja?.status === 'paid';

  const handleAbrirWhatsApp = () => {
    if (!telefoneDestino) {
      showToast({
        type: 'warning',
        title: 'Telefone Ausente',
        message: 'Este pedido não possui um número de WhatsApp cadastrado.'
      });
      return;
    }
    const url = `https://wa.me/55${telefoneDestino}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recibo & Mensagem para WhatsApp"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Resumo do Pedido no Topo */}
        <div className="p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white text-sm flex items-center gap-1.5">
                <span>{nomeDestino}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isPago 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {isPago ? 'Pago' : 'Pendente'}
                </span>
              </p>
              <p className="text-slate-400 text-[11px] flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  {telefoneDestino || 'Sem telefone'}
                </span>
                <span>•</span>
                <span className="font-bold text-white">
                  R$ {Number(valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20">
              {tipo === 'cota' ? '🎟️ Cota Festival Wicked' : '🛍️ Loja Oficial'}
            </span>
          </div>
        </div>

        {/* Informação explicativa */}
        <p className="text-xs text-slate-300">
          Você pode revisar o texto abaixo, copiar diretamente para a área de transferência ou enviar direto para o WhatsApp do comprador com um clique:
        </p>

        {/* Textarea editável com a mensagem formatada */}
        <div className="relative">
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={14}
            className="w-full rounded-xl bg-slate-950/80 border border-white/10 p-3 sm:p-4 text-xs sm:text-[13px] font-mono text-slate-200 leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-y scrollbar-thin"
            placeholder="Carregando mensagem do recibo..."
          />
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer text-center order-3 sm:order-1"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2 order-1 sm:order-2 flex-1 sm:flex-initial justify-end">
            {/* Botão Copiar Mensagem */}
            <button
              type="button"
              onClick={handleCopiar}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg ${
                copiado
                  ? 'bg-emerald-600 text-white shadow-emerald-950/50'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
              }`}
            >
              {copiado ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#00FF88]" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </button>

            {/* Botão Abrir no WhatsApp */}
            <button
              type="button"
              onClick={handleAbrirWhatsApp}
              disabled={!telefoneDestino}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg ${
                telefoneDestino
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                  : 'bg-emerald-900/30 text-emerald-400/40 border border-emerald-900/30 cursor-not-allowed'
              }`}
              title={telefoneDestino ? 'Abrir conversa no WhatsApp com o recibo preenchido' : 'Telefone não disponível'}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Abrir no WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
