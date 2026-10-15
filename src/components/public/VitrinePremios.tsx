import React from 'react';
import { Tv, Sparkles, Gift, Flame, Ticket, Info } from 'lucide-react';
import { PREMIOS_OFICIAIS } from '../../constants/campanha';

const iconesPremios: Record<number, React.ReactNode> = {
  1: <Tv className="w-6 h-6 text-[#00FF88]" />,
  2: <Sparkles className="w-6 h-6 text-[#D4AF37]" />,
  3: <Gift className="w-6 h-6 text-[#FF007F]" />,
  4: <Flame className="w-6 h-6 text-amber-400" />,
  5: <Ticket className="w-6 h-6 text-[#00FF88]" />,
};

export const VitrinePremios: React.FC = () => {
  return (
    <section id="secao-premios" className="py-12 sm:py-16 border-b border-white/5 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] sm:text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-3">
            <Gift className="w-3.5 h-3.5 text-[#00FF88]" />
            <span>5 Prêmios Oficiais</span>
          </div>
          <h2 className="font-cinzel text-xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            Prêmios da Ação Entre Amigos
          </h2>
          <p className="mt-2 sm:mt-3 text-slate-400 text-xs sm:text-sm">
            Concorra a prêmios imperdíveis adquirindo seu número da sorte na rifa oficial dos bailarinos!
          </p>
        </div>

        {/* Grade de Prêmios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {PREMIOS_OFICIAIS.map((premio) => (
            <div
              key={premio.posicao}
              className={`relative rounded-2xl p-6 border transition-all duration-300 flex flex-col justify-between ${
                premio.destaque
                  ? 'bg-gradient-to-b from-[#0F3D2A]/60 to-slate-900/80 border-[#00FF88]/40 shadow-xl shadow-[#00FF88]/5 ring-1 ring-[#00FF88]/30'
                  : 'glass-card border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                    {iconesPremios[premio.posicao]}
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-[#D4AF37] border border-[#D4AF37]/30">
                    {premio.posicao}º Prêmio
                  </span>
                </div>

                <h3 className="font-cinzel text-lg font-bold text-white mb-2">{premio.titulo}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{premio.subtitulo}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span>Rifa Oficial Wicked 2026</span>
                <span className="text-[#00FF88] font-medium">1.200 Bilhetes</span>
              </div>
            </div>
          ))}

          {/* Card de Transparência do Sorteio */}
          <div className="rounded-2xl p-6 border border-[#00FF88]/30 bg-gradient-to-br from-[#0F3D2A]/80 via-black to-[#0A0A0A] flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 bg-[#00FF88]/10 blur-2xl rounded-full pointer-events-none" />
            <div>
              <div className="flex items-center gap-2 text-[#00FF88] font-bold text-xs uppercase tracking-wider mb-3">
                <Info className="w-4 h-4" />
                <span>Transparência Total</span>
              </div>
              <h3 className="font-cinzel text-lg font-bold text-white mb-2">
                Sorteio Ao Vivo no Instagram
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                O sorteio será realizado ao vivo no perfil oficial{' '}
                <strong className="text-white">@talentosdeminasballet</strong> por meio de um{' '}
                <span className="text-[#00FF88] font-semibold">sorteador online gratuito</span> assim que todos os 1.200 números forem comercializados.
              </p>
            </div>

            <a
              href="https://instagram.com/talentosdeminasballet"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#FF007F] hover:bg-[#ff1a8c] text-white transition-all glow-glinda"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Seguir @talentosdeminasballet
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
