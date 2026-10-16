import React, { useState } from 'react';
import { Ticket, Lock, Menu, X, Share2 } from 'lucide-react';
import logoTalentos from '../../assets/logo_talentos.webp';

export const Navbar: React.FC<{
  onAbrirAdmin?: () => void;
  onAbrirApoio?: () => void;
  onAbrirCompartilhar?: () => void;
}> = ({
  onAbrirApoio,
  onAbrirCompartilhar,
}) => {
  const [menuAberto, setMenuAberto] = useState(false);

  const scrollPara = (id: string) => {
    setMenuAberto(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
        {/* Marca Oficial Talentos de Minas */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 sm:gap-3 text-left cursor-pointer group shrink-0"
        >
          <img
            src={logoTalentos}
            alt="Talentos de Minas Ballet"
            className="h-8 sm:h-9 md:h-10 w-auto object-contain transition-transform group-hover:scale-102"
            width={180}
            height={41}
            fetchPriority="high"
            decoding="async"
          />
          <span className="hidden xs:inline-block px-2 py-0.5 rounded-md bg-white/5 border border-[#D4AF37]/50 text-[#D4AF37] text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider">
            Wicked 2026
          </span>
        </button>

        {/* Links Desktop */}
        <div className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <button onClick={() => scrollPara('secao-premios')} className="hover:text-[#00FF88] transition-colors cursor-pointer py-2">
            Prêmios
          </button>
          <button onClick={() => scrollPara('secao-loja')} className="hover:text-[#FF007F] transition-colors cursor-pointer py-2">
            Produtos Sazonais
          </button>
        </div>

        {/* Ações Mobile & Desktop */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onAbrirApoio}
            className="px-3.5 sm:px-5 py-2 rounded-xl text-xs font-bold font-cinzel uppercase tracking-wider bg-[#00FF88] text-black hover:bg-[#33ff9f] flex items-center gap-1.5 glow-oz transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Apoiar</span>
          </button>

          {onAbrirCompartilhar && (
            <button
              onClick={onAbrirCompartilhar}
              className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-[#00FF88] border border-white/10 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Compartilhar Rifa de Apoio"
              aria-label="Compartilhar Rifa"
            >
              <Share2 className="w-4 h-4 text-[#00FF88]" />
            </button>
          )}

          <a
            href="/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-[#00FF88] border border-white/10 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            title="Acesso Administrativo (Abrir em nova aba)"
            aria-label="Acesso Administrativo"
          >
            <Lock className="w-4 h-4" />
          </a>

          {/* Botão Menu Hambúrguer para Mobile */}
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="md:hidden p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white border border-white/10 min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Menu de Navegação"
          >
            {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Dropdown Mobile Suave */}
      {menuAberto && (
        <div className="md:hidden bg-[#0A0A0A]/95 backdrop-blur-2xl border-b border-white/10 px-6 py-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
          {onAbrirCompartilhar && (
            <button
              onClick={() => {
                setMenuAberto(false);
                onAbrirCompartilhar();
              }}
              className="text-left text-sm font-medium text-[#00FF88] py-2 flex items-center gap-2 border-b border-white/5 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartilhar Rifa</span>
            </button>
          )}
          <button
            onClick={() => scrollPara('secao-premios')}
            className="text-left text-sm font-medium text-slate-200 hover:text-[#00FF88] py-2 border-b border-white/5"
          >
            Prêmios Oficiais
          </button>
          <button
            onClick={() => scrollPara('secao-loja')}
            className="text-left text-sm font-medium text-slate-200 hover:text-[#FF007F] py-2"
          >
            Produtos Sazonais
          </button>
        </div>
      )}
    </nav>
  );
};
