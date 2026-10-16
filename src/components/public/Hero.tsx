import React from 'react';
import { Sparkles, Ticket, ShoppingBag, Share2 } from 'lucide-react';
import heroBg from '../../assets/hero-wicked-bg.webp';

interface HeroProps {
  onAbrirApoio?: () => void;
  onAbrirCompartilhar?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onAbrirApoio, onAbrirCompartilhar }) => {

  const scrollPara = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleApoiarClick = () => {
    if (onAbrirApoio) {
      onAbrirApoio();
    } else {
      scrollPara('secao-rifa');
    }
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-24 md:py-28 border-b border-white/5">
      {/* Imagem de Fundo Abstrata do Tema Wicked / Ballet */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={heroBg}
          alt="Cenário abstrato teatral Wicked"
          className="w-full h-full object-cover object-center scale-105 opacity-80"
        />
        {/* Vinheta suave: escurece topo para a navbar e base para transição fluida */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/85 via-black/35 to-[#0A0A0A]" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center relative z-10">
        {/* Badge Oficial */}
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-[#D4AF37]/60 text-[#D4AF37] text-[11px] sm:text-xs font-semibold tracking-wider uppercase mb-5 sm:mb-6 shadow-xl">
          <Sparkles className="w-3.5 h-3.5 text-[#00FF88] shrink-0" />
          <span className="truncate">Talentos de Minas Ballet • Festival Wicked 2026</span>
        </div>

        {/* Título Teatral Cinematográfico */}
        <h1 className="font-cinzel text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight max-w-4xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
          A Magia Ganha Vida na Dança: <br />
          <span className="bg-gradient-to-r from-[#D4AF37] via-[#00FF88] to-[#FF007F] bg-clip-text text-transparent">
            Faça Parte da Jornada para o Wicked 2026!
          </span>
        </h1>

        {/* Subtítulo */}
        <p className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg text-slate-100 max-w-2xl font-normal leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] px-2">
          A magia do palco começa nos bastidores com o seu apoio. Escolha seu bailarino favorito,
          concorra a prêmios imperdíveis e ajude a transformar esse sonho em arte.
        </p>

        {/* Botões de Ação Rápida (CTAs) Mobile-First */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-8 sm:mt-10 w-full max-w-md sm:max-w-none">
          <button
            onClick={handleApoiarClick}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-cinzel text-sm font-bold text-black bg-[#00FF88] hover:bg-[#33ff9f] glow-oz transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer shadow-xl shadow-[#00FF88]/25 min-h-[48px]"
          >
            <Ticket className="w-4 h-4 shrink-0" />
            <span>Apoiar</span>
          </button>

          {onAbrirCompartilhar && (
            <button
              onClick={onAbrirCompartilhar}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-cinzel text-sm font-semibold text-white bg-white/5 hover:bg-white/10 backdrop-blur-md border border-[#00FF88]/40 hover:border-[#00FF88] transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-lg min-h-[48px]"
            >
              <Share2 className="w-4 h-4 text-[#00FF88] shrink-0" />
              <span>Compartilhar Rifa</span>
            </button>
          )}

          <button
            onClick={() => scrollPara('secao-loja')}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-cinzel text-sm font-semibold text-white bg-black/70 hover:bg-black/90 backdrop-blur-md border border-[#FF007F]/60 hover:border-[#FF007F] transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer shadow-lg min-h-[48px]"
          >
            <ShoppingBag className="w-4 h-4 text-[#FF007F] shrink-0" />
            <span>Ver Produtos Sazonais</span>
          </button>
        </div>
      </div>
    </section>
  );
};
