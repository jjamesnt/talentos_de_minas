import React, { useState } from 'react';
import { z } from 'zod';
import { Modal } from '../common/Modal';
import { useCampanha } from '../../hooks/useCampanha';
import { useToast } from '../../hooks/useToast';
import { PRECO_POR_COTA } from '../../constants/campanha';
import { QrCode, Copy, CheckCircle, Heart, ArrowRight, MessageCircle } from 'lucide-react';
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
  const { cotasSelecionadas, bailarinos, bailarinoSelecionadoId, concluirPedido } = useCampanha();
  const { showToast } = useToast();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [bailarinoIdManual, setBailarinoIdManual] = useState<string | null>(null);
  const [pedidoConcluido, setPedidoConcluido] = useState<PedidoCheckout | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [pixCopiado, setPixCopiado] = useState(false);

  const bailarinoId = bailarinoIdManual ?? bailarinoSelecionadoId ?? bailarinos[0]?.id ?? '';

  const valorTotal = cotasSelecionadas.length * PRECO_POR_COTA;

  const handleFinalizar = (e: React.FormEvent) => {
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

    // Processa o pedido
    const pedido = concluirPedido({ nome, email, whatsapp, bailarinoId });
    setPedidoConcluido(pedido);

    showToast({
      type: 'success',
      title: 'Pedido Gerado com Sucesso!',
      message: `E-mail de confirmação enviado para ${email}. Efetue o Pix para validar.`,
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

  const handleFecharTudo = () => {
    setPedidoConcluido(null);
    setNome('');
    setEmail('');
    setWhatsapp('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleFecharTudo}
      title={pedidoConcluido ? 'Pagamento Pix & Confirmação' : 'Finalizar Apoio na Rifa Digital'}
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
              <p className="text-base font-bold text-white">R$ {valorTotal.toLocaleString('pt-BR')},00</p>
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
            className="w-full mt-4 py-3 rounded-xl font-cinzel text-sm font-bold text-black bg-[#00FF88] hover:bg-[#33ff9f] glow-oz transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Gerar Pagamento Pix</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        /* Tela Pós-Compra com QR Code e Resumo */
        <div className="text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-[#00FF88]/20 border border-[#00FF88]/40 flex items-center justify-center mx-auto text-[#00FF88]">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div>
            <h4 className="font-cinzel text-xl font-bold text-white">Quase lá, {pedidoConcluido.compradorNome}!</h4>
            <p className="text-xs text-slate-300 mt-1">
              Escaneie o QR Code abaixo ou copie o código Pix para efetivar seu apoio.
            </p>
          </div>

          {/* QR Code Simulado com SVG Moderno */}
          <div className="p-4 bg-white rounded-2xl w-48 h-48 mx-auto flex flex-col items-center justify-center shadow-lg">
            <QrCode className="w-36 h-36 text-black" />
            <span className="text-[10px] text-gray-700 font-bold mt-1">PIX INSTANTÂNEO</span>
          </div>

          {/* Botão Copiar Código */}
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <input
              readOnly
              value={pedidoConcluido.codigoPix}
              className="flex-1 px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/10 text-slate-400 font-mono truncate"
            />
            <button
              onClick={copiarPix}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00FF88] text-black hover:bg-[#33ff9f] flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5" />
              {pixCopiado ? 'Copiado!' : 'Copiar Pix'}
            </button>
          </div>

          {/* Relação dos Números e Aviso de E-mail */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 text-left text-xs space-y-2">
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
            <p className="text-slate-400">
              Resumo e confirmação registrados para: <span className="text-white">{pedidoConcluido.compradorEmail}</span>
            </p>
            <p className="text-[#D4AF37] font-medium pt-1">
              Acompanhe o sorteio ao vivo no Instagram @talentosdeminasballet!
            </p>
          </div>

          {/* Botão Enviar Comprovante no WhatsApp */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <a
              href={`https://wa.me/5531998765432?text=${encodeURIComponent(
                `Olá! Sou ${pedidoConcluido.compradorNome} e acabei de adquirir o(s) número(s) ${pedidoConcluido.numeros
                  .map((n) => `#${n}`)
                  .join(', ')} na campanha Wicked 2026.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar Comprovante via WhatsApp</span>
            </a>

            <button
              onClick={handleFecharTudo}
              className="py-3 px-5 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
            >
              Concluir e Fechar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
