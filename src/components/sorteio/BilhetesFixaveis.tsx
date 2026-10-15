import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Sparkles, Pin } from 'lucide-react';

interface BilhetesFixaveisProps {
  numerosSorteados: number[];
  indicesFixados: number[];
  onToggleFix: (indice: number) => void;
  isSpinning: boolean;
}

export const BilhetesFixaveis: React.FC<BilhetesFixaveisProps> = ({
  numerosSorteados,
  indicesFixados,
  onToggleFix,
  isSpinning,
}) => {
  if (numerosSorteados.length === 0 || isSpinning) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full max-w-xl mx-auto p-4 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md space-y-3"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-cinzel font-bold text-[#D4AF37]">
            <Sparkles className="w-3.5 h-3.5 text-[#00FF88]" />
            <span>Bilhetes Sorteados na Roleta</span>
          </div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Pin className="w-3 h-3 text-[#00FF88]" />
            Clique para fixar favoritos
          </span>
        </div>

        {/* Lista de Bilhetes com Mecânica Lock / Pin */}
        <div className="flex flex-wrap justify-center gap-3 py-1">
          {numerosSorteados.map((num, idx) => {
            const isFixed = indicesFixados.includes(idx);
            return (
              <button
                key={`${idx}-${num}`}
                type="button"
                onClick={() => onToggleFix(idx)}
                className={`group relative px-4 py-2.5 rounded-xl flex items-center gap-2.5 transition-all duration-200 border cursor-pointer ${
                  isFixed
                    ? 'bg-[#0F3D2A] border-[#00FF88] shadow-[0_0_15px_rgba(0,255,136,0.35)] scale-105 text-white'
                    : 'bg-white/5 border-white/15 hover:border-[#D4AF37]/50 text-slate-200 hover:text-white'
                }`}
              >
                <span className="font-mono text-base sm:text-lg font-black tracking-wider">
                  #{num.toString().padStart(4, '0')}
                </span>

                <div
                  className={`p-1 rounded-md transition-colors ${
                    isFixed
                      ? 'bg-[#00FF88] text-black shadow-[0_0_6px_#00FF88]'
                      : 'bg-white/10 text-slate-400 group-hover:text-white'
                  }`}
                >
                  {isFixed ? <Lock size={12} strokeWidth={3} /> : <Unlock size={12} strokeWidth={2} />}
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
