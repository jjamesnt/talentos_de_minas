import React from 'react';
import { Award, Heart, Check, Users } from 'lucide-react';
import { useCampanha } from '../../hooks/useCampanha';

interface RankingBailarinosProps {
  onApoiarBailarino?: (bailarinoId: string) => void;
}

export const RankingBailarinos: React.FC<RankingBailarinosProps> = ({ onApoiarBailarino }) => {
  const { bailarinos, bailarinoSelecionadoId, setBailarinoSelecionadoId } = useCampanha();

  // Ordena por volume de vendas/apoios
  const bailarinosOrdenados = [...bailarinos]
    .filter((b) => b.ativo)
    .sort((a, b) => b.totalVendido - a.totalVendido);

  const selecionarBailarino = (id: string) => {
    setBailarinoSelecionadoId(id);
    if (onApoiarBailarino) {
      onApoiarBailarino(id);
    } else {
      const rifaSec = document.getElementById('secao-rifa');
      if (rifaSec) {
        rifaSec.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section id="secao-bailarinos" className="py-12 sm:py-20 border-b border-white/5 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] sm:text-xs font-semibold text-[#00FF88] uppercase tracking-wider mb-3">
            <Users className="w-3.5 h-3.5" />
            <span>Nossos Artistas</span>
          </div>
          <h2 className="font-cinzel text-xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            Ranking de Apoio aos Bailarinos
          </h2>
          <p className="mt-2 sm:mt-3 text-slate-400 text-xs sm:text-sm">
            Cada cota adquirida acumula pontos diretamente para o bailarino de sua escolha. Escolha quem você deseja apoiar!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {bailarinosOrdenados.map((bailarino, index) => {
            const isSelecionado = bailarinoSelecionadoId === bailarino.id;
            const posicao = index + 1;

            return (
              <div
                key={bailarino.id}
                className={`group relative rounded-2xl p-4 sm:p-5 border transition-all duration-300 flex flex-col justify-between ${
                  isSelecionado
                    ? 'bg-[#0F3D2A]/40 border-[#00FF88] shadow-lg shadow-[#00FF88]/10 ring-1 ring-[#00FF88]'
                    : 'glass-card border-white/10 hover:border-white/20 hover:bg-slate-900/60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-3.5 sm:gap-4">
                    {/* Foto com moldura */}
                    <div className="relative shrink-0">
                      <img
                        src={bailarino.fotoUrl}
                        alt={bailarino.nome}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white/10 group-hover:border-[#00FF88]/50 transition-colors"
                      />
                      <span
                        className={`absolute -top-1.5 -left-1.5 sm:-top-2 sm:-left-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-xs font-bold flex items-center justify-center border ${
                          posicao === 1
                            ? 'bg-[#D4AF37] text-black border-amber-300'
                            : posicao === 2
                            ? 'bg-slate-300 text-black border-white'
                            : posicao === 3
                            ? 'bg-amber-700 text-white border-amber-600'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {posicao}º
                      </span>
                    </div>

                    {/* Detalhes */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm sm:text-base truncate group-hover:text-[#00FF88] transition-colors">
                        {bailarino.nome}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Award className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                        <span className="truncate">{bailarino.totalVendido} cotas vendidas</span>
                      </p>
                    </div>
                  </div>

                  {/* Barra da meta individual */}
                  <div className="mt-3.5 sm:mt-4 pt-3 sm:pt-4 border-t border-white/5">
                    <div className="flex justify-between text-[11px] sm:text-xs text-slate-400 mb-1.5">
                      <span>Meta individual</span>
                      <span className="font-medium text-slate-200">
                        {bailarino.totalVendido} / {bailarino.meta} cotas
                      </span>
                    </div>
                    <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#00FF88] to-[#FF007F] rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.round((bailarino.totalVendido / bailarino.meta) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Botão de Apoio Touch-Friendly */}
                <button
                  onClick={() => selecionarBailarino(bailarino.id)}
                  className={`mt-4 sm:mt-5 w-full py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px] ${
                    isSelecionado
                      ? 'bg-[#00FF88] text-black font-bold glow-oz'
                      : 'bg-white/5 hover:bg-[#00FF88]/20 text-white hover:text-[#00FF88] border border-white/10 hover:border-[#00FF88]/40 active:scale-98'
                  }`}
                >
                  {isSelecionado ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      Bailarino Selecionado
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 text-[#FF007F]" />
                      Apoiar {bailarino.nome.split(' ')[0]}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
