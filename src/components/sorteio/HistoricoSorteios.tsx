import React from 'react';
import { History } from 'lucide-react';

interface HistoricoSorteiosProps {
  ultimoNumeroSorteado: number | null;
  historico: Array<{ numero: number; nome: string }>;
}

export const HistoricoSorteios: React.FC<HistoricoSorteiosProps> = ({
  ultimoNumeroSorteado,
  historico,
}) => {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-4">
      {/* Bloco Esquerdo: ÚLTIMO NÚMERO SORTEADO (exatamente como no modelo) */}
      <div className="flex flex-col items-center md:items-start justify-center">
        <span className="font-sans text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-2 drop-shadow">
          ÚLTIMO NÚMERO SORTEADO
        </span>

        {/* Caixa Preta com Borda Verde Neon Glow */}
        <div className="w-full max-w-[240px] py-3.5 px-6 rounded-2xl bg-black/90 border-2 border-[#00FF88] shadow-[0_0_25px_rgba(0,255,136,0.45)] flex items-center justify-center">
          <span className="font-mono text-4xl sm:text-5xl font-black text-white tracking-widest drop-shadow-[0_2px_12px_rgba(0,255,136,0.9)]">
            {ultimoNumeroSorteado !== null ? ultimoNumeroSorteado.toString().padStart(3, '0') : '856'}
          </span>
        </div>
      </div>

      {/* Bloco Direito: HISTÓRICO DE SORTEIOS (exatamente como no modelo) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-black/80 border border-[#D4AF37]/30 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
          <span className="font-sans text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-[#D4AF37]" />
            HISTÓRICO DE SORTEIOS
          </span>
          <span className="text-[10px] text-[#00FF88] font-mono font-bold tracking-wider">AO VIVO</span>
        </div>

        <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1 scrollbar-thin font-mono text-xs">
          {historico.length > 0 ? (
            historico.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white/5 border border-white/5 hover:border-[#00FF88]/30 transition-colors"
              >
                <span className="font-bold text-[#00FF88]">
                  {item.numero.toString().padStart(4, '0')}
                </span>
                <span className="text-slate-300 text-xs truncate max-w-[150px]">
                  - {item.nome}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 italic py-2 text-center">
              Nenhum sorteio registrado ainda.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
