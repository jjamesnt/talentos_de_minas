import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Check, Copy, Sparkles, X, Search, Heart, ExternalLink, MessageCircle } from 'lucide-react';
import { useCampanha } from '../../hooks/useCampanha';
import { useToast } from '../../hooks/useToast';

interface ModalCompartilharRifaProps {
  isOpen: boolean;
  onClose: () => void;
  bailarinoInicialId?: string | null;
}

export const ModalCompartilharRifa: React.FC<ModalCompartilharRifaProps> = ({
  isOpen,
  onClose,
  bailarinoInicialId,
}) => {
  const { bailarinos } = useCampanha();
  const { showToast } = useToast();

  const [busca, setBusca] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [bailarinoSelecionadoId, setBailarinoSelecionadoId] = useState<string>(() => {
    return bailarinoInicialId || 'campanha-geral';
  });

  // Atualiza se mudar a prop inicial
  React.useEffect(() => {
    if (bailarinoInicialId) {
      setBailarinoSelecionadoId(bailarinoInicialId);
    }
  }, [bailarinoInicialId]);

  // Lista de bailarinos ativos filtrados pela busca
  const bailarinosAtivos = useMemo(() => {
    return bailarinos.filter((b) => b.ativo);
  }, [bailarinos]);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return bailarinosAtivos;
    const termo = busca.toLowerCase();
    return bailarinosAtivos.filter((b) => b.nome.toLowerCase().includes(termo));
  }, [bailarinosAtivos, busca]);

  // Bailarino atualmente escolhido
  const bailarinoEscolhido = useMemo(() => {
    if (bailarinoSelecionadoId === 'campanha-geral') {
      return {
        id: 'campanha-geral',
        nome: 'Campanha Geral (Talentos de Minas)',
        fotoUrl: '/logo_talentos.webp',
      };
    }
    return bailarinos.find((b) => b.id === bailarinoSelecionadoId) || {
      id: 'campanha-geral',
      nome: 'Campanha Geral (Talentos de Minas)',
      fotoUrl: '/logo_talentos.webp',
    };
  }, [bailarinoSelecionadoId, bailarinos]);

  // URL gerada para compartilhamento direto na etapa de seleção de cotas
  const linkGerado = useMemo(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://talentosdeminas.art.br';
    return `${baseUrl}/?apoiar=${encodeURIComponent(bailarinoSelecionadoId)}`;
  }, [bailarinoSelecionadoId]);

  // Texto formatado para o WhatsApp
  const textoWhatsApp = useMemo(() => {
    const primeiroNome = bailarinoEscolhido.nome.split(' ')[0];
    if (bailarinoSelecionadoId === 'campanha-geral') {
      return `🩰 *Apoie o Ballet Talentos de Minas no Festival Wicked 2026!*\n\nOlá! Estou participando da campanha de arrecadação do espetáculo Wicked 2026. Garanta suas cotas da sorte na campanha oficial e concorra a 5 prêmios incríveis!\n\n👉 *Escolha suas cotas diretamente aqui:*\n${linkGerado}`;
    }
    return `🩰 *Torcida Oficial para ${bailarinoEscolhido.nome} • Wicked 2026!*\n\nOlá! Estou apoiando a jornada de ${primeiroNome} no Festival Wicked 2026 do Talentos de Minas. Cada cota da campanha ajuda diretamente nos custos e concorre a 5 prêmios incríveis!\n\n👉 *Apoie e escolha suas cotas diretamente aqui:*\n${linkGerado}`;
  }, [bailarinoEscolhido, bailarinoSelecionadoId, linkGerado]);

  const handleCopiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkGerado);
      setCopiado(true);
      showToast({
        type: 'success',
        title: 'Link Copiado!',
        message: 'Link direto para a seleção de cotas copiado para sua área de transferência.',
      });
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      showToast({
        type: 'error',
        title: 'Não foi possível copiar',
        message: 'Por favor, selecione e copie o link manualmente.',
      });
    }
  };

  const handleCompartilharWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoWhatsApp)}`;
    window.open(url, '_blank');
  };

  const handleCompartilharNativo = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Apoie ${bailarinoEscolhido.nome} • Talentos de Minas`,
          text: textoWhatsApp,
          url: linkGerado,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopiarLink();
        }
      }
    } else {
      handleCopiarLink();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop com blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        />

        {/* Modal Card Mobile-First */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-[#0F1412] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00FF88]/10 border border-[#00FF88]/30 flex items-center justify-center text-[#00FF88] shadow-[0_0_15px_rgba(0,255,136,0.2)]">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-cinzel text-base sm:text-lg font-bold text-white">
                  Compartilhar Campanha de Apoio
                </h3>
                <p className="text-[11px] text-slate-400">
                  Gere um link direto para a torcida do bailarino
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo com Scroll */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar">
            {/* Bloco 1: Selecione o Bailarino */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-[#FF007F] fill-current" />
                  <span>1. Escolha quem você está divulgando</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {bailarinosAtivos.length} participantes
                </span>
              </div>

              {/* Busca de Bailarino se houver mais de 5 */}
              {bailarinosAtivos.length > 5 && (
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar participante por nome..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88]"
                  />
                  {busca && (
                    <button
                      onClick={() => setBusca('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}

              {/* Lista Selecionável Compacta Mobile First */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                {/* Opção Campanha Geral */}
                <button
                  type="button"
                  onClick={() => setBailarinoSelecionadoId('campanha-geral')}
                  className={`w-full p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    bailarinoSelecionadoId === 'campanha-geral'
                      ? 'bg-[#00FF88]/15 border-[#00FF88] shadow-[0_0_15px_rgba(0,255,136,0.2)] ring-1 ring-[#00FF88]'
                      : 'bg-black/30 border-white/5 hover:border-white/15 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#00FF88]/20 border border-white/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-[#00FF88]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                        Campanha Geral (Talentos de Minas)
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                        Apoio compartilhado para todos os artistas
                      </p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                    bailarinoSelecionadoId === 'campanha-geral'
                      ? 'bg-[#00FF88] border-[#00FF88] text-black'
                      : 'border-white/20'
                  }`}>
                    {bailarinoSelecionadoId === 'campanha-geral' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>

                {/* Lista de Bailarinos */}
                {filtrados.map((b) => {
                  const isSel = bailarinoSelecionadoId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBailarinoSelecionadoId(b.id)}
                      className={`w-full p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSel
                          ? 'bg-[#00FF88]/15 border-[#00FF88] shadow-[0_0_15px_rgba(0,255,136,0.2)] ring-1 ring-[#00FF88]'
                          : 'bg-black/30 border-white/5 hover:border-white/15 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={b.fotoUrl}
                          alt={b.nome}
                          className={`w-10 h-10 rounded-xl object-cover shrink-0 border ${
                            isSel ? 'border-[#00FF88]' : 'border-white/10'
                          }`}
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {b.nome}
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span className="text-[#00FF88] font-semibold">{b.totalVendido} cotas</span>
                            <span>•</span>
                            <span>Meta: {b.meta}</span>
                          </p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                        isSel
                          ? 'bg-[#00FF88] border-[#00FF88] text-black'
                          : 'border-white/20'
                      }`}>
                        {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}

                {filtrados.length === 0 && (
                  <p className="text-center text-xs text-slate-500 py-4 italic">
                    Nenhum bailarino encontrado com esse nome.
                  </p>
                )}
              </div>
            </div>

            {/* Bloco 2: Preview do Destinatário & Link Gerado */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  2. Link de Acesso Direto às Cotas
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20">
                  Etapa 2 Automática
                </span>
              </div>

              {/* Card Destaque do Bailarino Escolhido */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <img
                  src={bailarinoEscolhido.fotoUrl}
                  alt={bailarinoEscolhido.nome}
                  className="w-12 h-12 rounded-xl object-cover border border-[#00FF88]/50 shadow-md shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-[#00FF88] font-bold uppercase tracking-wider block">
                    Apoiando:
                  </span>
                  <p className="text-sm font-bold text-white truncate">
                    {bailarinoEscolhido.nome}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Quem abrir cairá na seleção de cotas com a foto dele em destaque.
                  </p>
                </div>
              </div>

              {/* Caixa de Texto do Link com Botão Copiar */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={linkGerado}
                  className="flex-1 px-3.5 py-2.5 rounded-xl text-xs bg-black/60 border border-white/10 text-slate-300 font-mono truncate select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopiarLink}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    copiado
                      ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  }`}
                  title="Copiar link para área de transferência"
                >
                  {copiado ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiado ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Bloco 3: Botões de Ação de Compartilhamento Mobile First */}
            <div className="space-y-2.5 pt-1">
              {/* Botão WhatsApp */}
              <button
                type="button"
                onClick={handleCompartilharWhatsApp}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#25D366] hover:bg-[#20ba59] text-black font-cinzel transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-[#25D366]/20 cursor-pointer min-h-[46px] active:scale-98"
              >
                <MessageCircle className="w-4 h-4 fill-black text-black" />
                <span>Compartilhar no WhatsApp</span>
              </button>

              {/* Botão Nativo / Outras Redes */}
              <button
                type="button"
                onClick={handleCompartilharNativo}
                className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[42px] active:scale-98"
              >
                <ExternalLink className="w-4 h-4 text-[#00FF88]" />
                <span>Mais Opções de Compartilhar</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
