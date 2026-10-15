import React from 'react';
import { motion, useAnimation } from 'framer-motion';
import roletaCompletaPerfeita from '../../assets/roleta_completa_perfeita.webp';

export interface FatiaConfig {
  numero: number;
  cor: string;
  corTexto: string;
}

interface RoletaWickedProps {
  controls: ReturnType<typeof useAnimation>;
  isSpinning: boolean;
  onGirarClick: () => void;
}

export const RoletaWicked: React.FC<RoletaWickedProps> = ({
  controls,
  isSpinning,
  onGirarClick,
}) => {
  return (
    <div className="relative w-full max-w-[340px] sm:max-w-[420px] md:max-w-[460px] mx-auto select-none pt-12 sm:pt-14">
      {/* Identificação Superior Oficial: "DE MINAS BALLET" */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 z-30 pointer-events-none text-center w-full">
        <span className="font-cinzel text-[11px] sm:text-xs text-[#E5C158] tracking-[0.4em] font-extrabold drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
          DE MINAS BALLET
        </span>
      </div>

      {/* Caixa Quadrada Exata da Roleta (Garante Concentricidade 100% Matemática entre Roda e Botão) */}
      <div className="relative w-full aspect-square flex items-center justify-center">
        {/* Halo de Brilho Teatral Esmeralda e Dourado ao Fundo */}
        <div
          className={`absolute inset-4 rounded-full transition-all duration-1000 pointer-events-none ${
            isSpinning
              ? 'bg-gradient-to-r from-[#00FF88]/25 via-[#D4AF37]/35 to-[#9D00FF]/25 blur-[45px] scale-105'
              : 'bg-[#00FF88]/15 blur-[35px] scale-95'
          }`}
        />

        {/* Partículas douradas mágicas ao redor */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full opacity-60">
          <div className="absolute top-8 left-12 w-1.5 h-1.5 bg-[#D4AF37] rounded-full blur-[0.5px] animate-ping" />
          <div className="absolute top-16 right-10 w-2 h-2 bg-[#00FF88] rounded-full blur-[0.5px] animate-pulse" />
          <div className="absolute bottom-12 left-12 w-1.5 h-1.5 bg-[#FFD1DC] rounded-full blur-[0.5px] animate-pulse" />
          <div className="absolute bottom-8 right-16 w-2 h-2 bg-[#D4AF37] rounded-full blur-[0.5px] animate-ping" />
        </div>

        {/* A Roda Giratória Oficial Completa (10 Fatias + Números Perfeitamente Preservados) */}
        <motion.div
          animate={controls}
          initial={{ rotate: 18 }}
          style={{ transformOrigin: 'center center' }}
          onClick={onGirarClick}
          className={`relative z-10 w-full h-full rounded-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.95)] cursor-pointer transition-transform ${
            isSpinning ? 'brightness-105' : 'hover:scale-[1.008]'
          }`}
        >
          <img
            src={roletaCompletaPerfeita}
            alt="Roleta da Sorte Wicked Oficial"
            className="w-full h-full object-contain pointer-events-none select-none rounded-full"
          />
        </motion.div>

        {/* Botão Central Fixo com Base Circular Dourada - 100% Concêntrico com a Roda */}
        <button
          type="button"
          disabled={isSpinning}
          onClick={onGirarClick}
          title="Girar Roleta da Sorte"
          className={`absolute z-25 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[31%] aspect-square rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 p-1.5 ${
            isSpinning
              ? 'scale-95 opacity-90 cursor-not-allowed'
              : 'hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(212,175,55,0.7)]'
          }`}
          style={{
            background: 'radial-gradient(circle, #594305 0%, #997819 40%, #D4AF37 70%, #FBE89D 90%, #785A14 100%)',
            boxShadow: '0 8px 25px rgba(0,0,0,0.9), inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -4px 8px rgba(0,0,0,0.8)',
            border: '3px solid #785A14',
          }}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center shadow-inner"
            style={{
              background: 'radial-gradient(circle, #FBE89D 0%, #D4AF37 55%, #997819 85%, #594305 100%)',
              border: '2px solid rgba(255, 235, 140, 0.6)',
            }}
          >
            <span
              className="font-cinzel text-xs sm:text-sm md:text-base font-black tracking-wider uppercase select-none text-[#3A2800] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
              style={{
                textShadow: '0 1px 0 rgba(255,255,255,0.7), 0 -1px 0 rgba(0,0,0,0.5)',
              }}
            >
              GIRAR!
            </span>
          </div>
        </button>

        {/* Marcador Superior 3D de Alta Definição (100% Íntegro, Simétrico e Reluzente com Estrela de 4 Pontas) */}
        <div className="absolute -top-6 sm:-top-7 left-1/2 -translate-x-1/2 z-30 pointer-events-none w-11 sm:w-12 md:w-13 drop-shadow-[0_10px_20px_rgba(0,0,0,0.95)]">
          <svg viewBox="0 0 54 66" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <defs>
              <linearGradient id="badgeGoldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF2B2" />
                <stop offset="40%" stopColor="#E5C158" />
                <stop offset="80%" stopColor="#8C6914" />
                <stop offset="100%" stopColor="#FFF5C0" />
              </linearGradient>
              <linearGradient id="badgeGoldInner" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7A560F" />
                <stop offset="50%" stopColor="#523906" />
                <stop offset="100%" stopColor="#382502" />
              </linearGradient>
              <linearGradient id="arrowGoldLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFF6C2" />
                <stop offset="100%" stopColor="#D4AF37" />
              </linearGradient>
              <linearGradient id="arrowGoldRight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#9E7514" />
                <stop offset="100%" stopColor="#5E4306" />
              </linearGradient>
              <filter id="badgeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.8" />
              </filter>
            </defs>

            <g filter="url(#badgeGlow)">
              {/* Suporte Superior Retangular Chanfrado */}
              <rect x="7" y="2" width="40" height="32" rx="4" fill="url(#badgeGoldBorder)" stroke="#4A3405" strokeWidth="1.2" />
              <rect x="10" y="5" width="34" height="26" rx="2" fill="url(#badgeGoldInner)" stroke="#D4AF37" strokeWidth="0.8" />

              {/* Estrela Reluzente de 4 Pontas */}
              <path
                d="M27 8 L29 15.5 L36.5 18 L29 20.5 L27 28 L25 20.5 L17.5 18 L25 15.5 Z"
                fill="#FFFFFF"
                opacity="0.95"
              />
              <circle cx="27" cy="18" r="1.5" fill="#FFEAA7" />

              {/* Rebites nos 4 cantos do badge */}
              <circle cx="12" cy="7" r="1" fill="#FFEAA7" />
              <circle cx="42" cy="7" r="1" fill="#FFEAA7" />
              <circle cx="12" cy="29" r="1" fill="#FFEAA7" />
              <circle cx="42" cy="29" r="1" fill="#FFEAA7" />

              {/* Seta Indicadora Triangular 3D */}
              {/* Metade Esquerda Iluminada */}
              <path d="M11 33 L27 62 L27 33 Z" fill="url(#arrowGoldLeft)" stroke="#382502" strokeWidth="0.5" />
              {/* Metade Direita Sombreada */}
              <path d="M27 33 L43 33 L27 62 Z" fill="url(#arrowGoldRight)" stroke="#382502" strokeWidth="0.5" />

              {/* Crista Central e Contorno Dourado Reluzente */}
              <line x1="27" y1="33" x2="27" y2="62" stroke="#FFF2B2" strokeWidth="1" />
              <path d="M11 33 L27 62 L43 33" fill="none" stroke="#FFEAA7" strokeWidth="1.2" strokeLinejoin="round" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};




