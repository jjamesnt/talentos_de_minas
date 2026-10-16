import React from 'react';
import { Ticket, Heart, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useCampanha } from '../../hooks/useCampanha';
import { TOTAL_COTAS } from '../../constants/campanha';

interface SeletorRifaProps {
  onAbrirApoio: () => void;
}

export const SeletorRifa: React.FC<SeletorRifaProps> = ({ onAbrirApoio }) => {
  const { totalCotasVendidas, bailarinos, precoPorCota } = useCampanha();
  const cotasRestantes = TOTAL_COTAS - totalCotasVendidas;

  return (
    <section id="secao-rifa" className="py-12 sm:py-20 border-b border-white/5 relative overflow-hidden">
      {/* Luz ambiente de fundo tema Wicked */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-[#00FF88]/10 via-[#D4AF37]/10 to-[#FF007F]/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="rounded-3xl p-6 sm:p-10 md:p-12 glass-card border border-white/10 bg-gradient-to-b from-[#0F3D2A]/30 via-black/80 to-black/95 shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-center flex flex-col items-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-[#00FF88]/40 text-[11px] sm:text-xs font-semibold text-[#00FF88] uppercase tracking-wider mb-4 shadow-lg">
            <Ticket className="w-3.5 h-3.5" />
            <span>Campanha Oficial • 1.200 Cotas da Sorte</span>
          </div>

          {/* Título Principal */}
          <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight max-w-2xl leading-tight">
            Apoie Nossos Artistas e <br />
            <span className="bg-gradient-to-r from-[#D4AF37] via-[#00FF88] to-[#FF007F] bg-clip-text text-transparent">
              Concorra a Prêmios Incríveis
            </span>
          </h2>

          {/* Descrição */}
          <p className="mt-3 sm:mt-4 text-slate-300 text-xs sm:text-sm md:text-base max-w-xl leading-relaxed">
            Por apenas <strong className="text-white font-bold">R$ {precoPorCota},00</strong> por cota, você concorre a 5 prêmios incríveis e ainda ajuda a tornar real o sonho da sua bailarina favorita de participar do Festival Wicked 2026! Ao adquirir sua cota, você apoia diretamente os custos dessa jornada.
          </p>

          {/* Destaques Rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 my-6 sm:my-8 w-full max-w-lg">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400">Preço por cota</span>
              <span className="font-mono text-base sm:text-lg font-bold text-[#D4AF37] mt-0.5">R$ {precoPorCota},00</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400">Disponíveis</span>
              <span className="font-mono text-base sm:text-lg font-bold text-[#00FF88] mt-0.5">{cotasRestantes} cotas</span>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400">Segurança</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00FF88]" />
                Pix Imediato
              </span>
            </div>
          </div>

          {/* Botão de Destaque 'Apoiar' */}
          <button
            type="button"
            onClick={onAbrirApoio}
            className="w-full sm:w-auto px-10 py-4 rounded-2xl font-cinzel text-sm sm:text-base font-black uppercase tracking-wider bg-[#00FF88] hover:bg-[#33ff9f] text-black glow-oz transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 cursor-pointer shadow-2xl shadow-[#00FF88]/30 min-h-[52px]"
          >
            <Heart className="w-5 h-5 text-black fill-current" />
            <span>Apoiar</span>
            <ArrowRight className="w-4 h-4 text-black stroke-[3]" />
          </button>

          {/* Mini Avatares dos Bailarinos */}
          {bailarinos.length > 0 ? (
            <div className="flex items-center gap-2 mt-6 text-slate-400 text-xs">
              <div className="flex -space-x-2">
                {bailarinos.slice(0, 5).map((b) => (
                  <img
                    key={b.id}
                    src={b.fotoUrl}
                    alt={b.nome}
                    className="w-7 h-7 rounded-full object-cover border-2 border-black"
                  />
                ))}
              </div>
              <span>Junte-se à torcida dos nossos bailarinos</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mt-6 text-slate-400 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#00FF88]" />
              <span>Campanha Oficial • Jornada Wicked 2026</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
