import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { WHATSAPP_SUPORTE_FORMATADO, gerarLinkSuporteWhatsApp } from '../../utils/whatsappSupport';

export const FloatingWhatsAppSupport: React.FC = () => {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    if (aberto) {
      document.addEventListener('mousedown', handleClickFora);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
    };
  }, [aberto]);

  const handleEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    const link = gerarLinkSuporteWhatsApp(nome);
    window.open(link, '_blank');
    setAberto(false);
  };

  return (
    <div ref={popoverRef} className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end">
      {/* Popover / Balão Interativo de Suporte */}
      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ duration: 0.2 }}
            className="mb-3 w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl bg-[#0F1412] border border-white/10 shadow-2xl overflow-hidden text-left"
          >
            {/* Header com Status Online */}
            <div className="p-4 bg-gradient-to-r from-[#128C7E] to-[#25D366] text-black flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-black/10 border border-black/10 flex items-center justify-center text-black shrink-0">
                  <MessageCircle className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight text-black">
                    Suporte Talentos de Minas
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-semibold text-black/80">
                    <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                    <span>Atendimento {WHATSAPP_SUPORTE_FORMATADO}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAberto(false)}
                className="p-1 rounded-lg hover:bg-black/10 text-black transition-colors cursor-pointer"
                aria-label="Fechar suporte"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo */}
            <form onSubmit={handleEnviar} className="p-4 sm:p-5 space-y-3.5 bg-black/60">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#00FF88] shrink-0 mt-0.5" />
                <p>
                  Olá! Tem dúvidas sobre cotas, pedidos da loja ou precisa de suporte para concluir sua compra?
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Qual é o seu nome?
                </label>
                <input
                  type="text"
                  required
                  placeholder="Digite seu nome completo..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-black/50 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88]"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#25D366] hover:bg-[#20ba59] text-black font-cinzel transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 cursor-pointer active:scale-98 min-h-[44px]"
              >
                <Send className="w-3.5 h-3.5 fill-black" />
                <span>Conversar no WhatsApp</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão Flutuante Principal */}
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="group relative flex items-center gap-2.5 p-3.5 sm:px-4 sm:py-3.5 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-black shadow-2xl shadow-[#25D366]/40 hover:shadow-[#25D366]/60 transition-all duration-300 cursor-pointer active:scale-95"
        title="Fale Conosco pelo WhatsApp"
        aria-label="Abrir suporte WhatsApp"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-950 opacity-60" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-black" />
        </span>
        <MessageCircle className="w-6 h-6 fill-black text-black" />
        <span className="hidden sm:inline font-bold text-xs font-cinzel tracking-wider uppercase">
          Suporte
        </span>
      </button>
    </div>
  );
};
