import React from 'react';
import { Tv, Sparkles, Gift, Flame, Ticket, Info, Trophy } from 'lucide-react';
import { useCampanha } from '../../hooks/useCampanha';

const iconesPremios: Record<number, React.ReactNode> = {
  1: <Tv className="w-4 h-4 text-[#00FF88]" />,
  2: <Sparkles className="w-4 h-4 text-[#D4AF37]" />,
  3: <Gift className="w-4 h-4 text-[#FF007F]" />,
  4: <Flame className="w-4 h-4 text-amber-400" />,
  5: <Ticket className="w-4 h-4 text-[#00FF88]" />,
};

// Ilustrações temáticas em vetor otimizado para exibição caso o painel ainda não tenha foto personalizada
const ilustracoesPadrao: Record<number, string> = {
  // 1º Prêmio: Smart TV 50" 4K
  1: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width="100%" height="100%">
      <defs>
        <linearGradient id="tvBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#091F14" />
          <stop offset="100%" stop-color="#020805" />
        </linearGradient>
        <radialGradient id="tvGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#00FF88" stop-opacity="0.35" />
          <stop offset="70%" stop-color="#091F14" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="260" fill="url(#tvBg)" />
      <circle cx="200" cy="120" r="120" fill="url(#tvGlow)" />
      <!-- Moldura TV -->
      <rect x="55" y="32" width="290" height="168" rx="8" fill="#0D1520" stroke="#1E293B" stroke-width="2.5" />
      <rect x="63" y="40" width="274" height="152" rx="4" fill="#03080F" />
      <!-- Base da TV -->
      <rect x="182" y="200" width="36" height="18" fill="#1E293B" />
      <path d="M145 218 L255 218 L245 223 L155 223 Z" fill="#334155" />
      <!-- Ondas / Conteúdo no Display -->
      <path d="M90 145 Q160 85 230 135 T310 95" stroke="#00FF88" stroke-width="2.5" fill="none" opacity="0.85" />
      <path d="M80 160 Q150 110 220 155 T320 120" stroke="#D4AF37" stroke-width="2" fill="none" opacity="0.6" />
      <text x="200" y="112" font-family="-apple-system, sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="2">SMART TV 50" 4K</text>
      <text x="200" y="132" font-family="-apple-system, sans-serif" font-size="10" fill="#00FF88" text-anchor="middle" letter-spacing="1">CINEMA EM CASA • ULTRA HD</text>
    </svg>
  `)}`,

  // 2º Prêmio: Pulseira Rommanel
  2: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width="100%" height="100%">
      <defs>
        <linearGradient id="jewelBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1C1405" />
          <stop offset="100%" stop-color="#080502" />
        </linearGradient>
        <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#D4AF37" stop-opacity="0.38" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="260" fill="url(#jewelBg)" />
      <circle cx="200" cy="125" r="115" fill="url(#goldGlow)" />
      <!-- Elos da Pulseira -->
      <ellipse cx="200" cy="120" rx="90" ry="52" fill="none" stroke="#D4AF37" stroke-width="4.5" stroke-dasharray="9,6" />
      <ellipse cx="200" cy="120" rx="78" ry="42" fill="none" stroke="#FDE047" stroke-width="1.8" opacity="0.7" />
      <!-- Pingente / Medalha -->
      <circle cx="200" cy="172" r="18" fill="#D4AF37" stroke="#FFFBEB" stroke-width="2.5" />
      <polygon points="200,161 204,170 213,172 206,178 208,187 200,182 192,187 194,178 187,172 196,170" fill="#ffffff" />
      <text x="200" y="65" font-family="-apple-system, sans-serif" font-size="13" font-weight="bold" fill="#D4AF37" text-anchor="middle" letter-spacing="2">PULSEIRA ROMMANEL</text>
      <text x="200" y="85" font-family="-apple-system, sans-serif" font-size="10" fill="#E2E8F0" text-anchor="middle" letter-spacing="1">JOALHERIA EXCLUSIVA FOLHEADA</text>
    </svg>
  `)}`,

  // 3º Prêmio: Kit Tupperware 7 Peças
  3: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width="100%" height="100%">
      <defs>
        <linearGradient id="tupBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1A0714" />
          <stop offset="100%" stop-color="#080206" />
        </linearGradient>
        <radialGradient id="tupGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FF007F" stop-opacity="0.32" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="260" fill="url(#tupBg)" />
      <circle cx="200" cy="130" r="115" fill="url(#tupGlow)" />
      <!-- Potes Empilhados -->
      <path d="M115 178 L285 178 L265 212 L135 212 Z" fill="#FF007F" opacity="0.9" />
      <rect x="105" y="170" width="190" height="10" rx="5" fill="#FF66B2" />
      <path d="M135 138 L265 138 L250 168 L150 168 Z" fill="#00FF88" opacity="0.9" />
      <rect x="127" y="130" width="146" height="10" rx="5" fill="#80FFCC" />
      <path d="M158 103 L242 103 L232 128 L168 128 Z" fill="#D4AF37" opacity="0.9" />
      <rect x="152" y="96" width="96" height="9" rx="4.5" fill="#FDE047" />
      <text x="200" y="52" font-family="-apple-system, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="2">KIT TUPPERWARE</text>
      <text x="200" y="70" font-family="-apple-system, sans-serif" font-size="10" fill="#FF007F" text-anchor="middle" letter-spacing="1">7 PEÇAS PREMIUM</text>
    </svg>
  `)}`,

  // 4º Prêmio: Fritadeira Airfryer Digital
  4: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width="100%" height="100%">
      <defs>
        <linearGradient id="fryBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1A1005" />
          <stop offset="100%" stop-color="#080502" />
        </radialGradient>
        <radialGradient id="fryGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.38" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="260" fill="url(#fryBg)" />
      <circle cx="200" cy="130" r="115" fill="url(#fryGlow)" />
      <!-- Corpo da Fritadeira -->
      <path d="M140 55 Q200 40 260 55 L275 190 Q200 205 125 190 Z" fill="#1E293B" stroke="#334155" stroke-width="2.5" />
      <!-- Painel Digital -->
      <rect x="165" y="72" width="70" height="34" rx="6" fill="#0A0F1D" stroke="#00FF88" stroke-width="1.5" />
      <text x="200" y="94" font-family="monospace" font-size="14" font-weight="bold" fill="#00FF88" text-anchor="middle">200°C</text>
      <!-- Alça do Cesto -->
      <rect x="185" y="125" width="30" height="42" rx="6" fill="#0F172A" stroke="#475569" stroke-width="2" />
      <path d="M135 120 L265 120" stroke="#334155" stroke-width="2" />
      <text x="200" y="230" font-family="-apple-system, sans-serif" font-size="13" font-weight="bold" fill="#F59E0B" text-anchor="middle" letter-spacing="2">AIRFRYER DIGITAL</text>
    </svg>
  `)}`,

  // 5º Prêmio: 01 Par de Ingressos Wicked 2026
  5: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width="100%" height="100%">
      <defs>
        <linearGradient id="tktBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#092418" />
          <stop offset="100%" stop-color="#020805" />
        </linearGradient>
        <radialGradient id="ozGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#00FF88" stop-opacity="0.38" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="260" fill="url(#tktBg)" />
      <circle cx="200" cy="130" r="115" fill="url(#ozGlow)" />
      <!-- Ingresso 1 -->
      <g transform="rotate(-6 200 130)">
        <rect x="100" y="70" width="190" height="100" rx="10" fill="#0D281E" stroke="#00FF88" stroke-width="2" />
        <circle cx="100" cy="120" r="10" fill="#092418" />
        <circle cx="290" cy="120" r="10" fill="#092418" />
        <line x1="160" y1="75" x2="160" y2="165" stroke="#00FF88" stroke-width="1.5" stroke-dasharray="4,4" />
        <text x="130" y="125" font-family="serif" font-size="12" font-weight="bold" fill="#D4AF37" text-anchor="middle">VIP</text>
        <text x="225" y="110" font-family="serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">WICKED 2026</text>
        <text x="225" y="130" font-family="-apple-system, sans-serif" font-size="9" fill="#00FF88" text-anchor="middle">FESTIVAL OFICIAL</text>
      </g>
      <!-- Ingresso 2 -->
      <g transform="rotate(5 210 145)">
        <rect x="120" y="85" width="190" height="100" rx="10" fill="#153628" stroke="#D4AF37" stroke-width="2" />
        <circle cx="120" cy="135" r="10" fill="#092418" />
        <circle cx="310" cy="135" r="10" fill="#092418" />
        <line x1="180" y1="90" x2="180" y2="180" stroke="#D4AF37" stroke-width="1.5" stroke-dasharray="4,4" />
        <text x="150" y="140" font-family="serif" font-size="12" font-weight="bold" fill="#00FF88" text-anchor="middle">PAR</text>
        <text x="245" y="125" font-family="serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">WICKED 2026</text>
        <text x="245" y="145" font-family="-apple-system, sans-serif" font-size="9" fill="#D4AF37" text-anchor="middle">PLATEIA NOBRE</text>
      </g>
    </svg>
  `)}`,
};

export const VitrinePremios: React.FC = () => {
  const { premios } = useCampanha();

  return (
    <section id="secao-premios" className="py-12 sm:py-16 border-b border-white/5 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] sm:text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-3">
            <Gift className="w-3.5 h-3.5 text-[#00FF88]" />
            <span>{premios.length} Prêmios Oficiais</span>
          </div>
          <h2 className="font-cinzel text-xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            Prêmios da Ação Entre Amigos
          </h2>
          <p className="mt-2 sm:mt-3 text-slate-400 text-xs sm:text-sm">
            Concorra a prêmios imperdíveis garantindo seu número da sorte na campanha oficial dos bailarinos!
          </p>
        </div>

        {/* Grade de Prêmios Dinâmica com Foto Otimizada */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {premios.map((premio) => {
            // Imagem vinda do painel de controle (otimizada para WebP) ou ilustração temática padrão
            const imagemExibida = premio.fotoUrl || ilustracoesPadrao[premio.posicao] || ilustracoesPadrao[1];

            return (
              <div
                key={premio.id || premio.posicao}
                className={`relative rounded-2xl p-5 sm:p-6 border transition-all duration-300 flex flex-col justify-between group ${
                  premio.destaque
                    ? 'bg-gradient-to-b from-[#0F3D2A]/60 to-slate-900/80 border-[#00FF88]/40 shadow-xl shadow-[#00FF88]/5 ring-1 ring-[#00FF88]/30'
                    : 'glass-card border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  {/* Container Padronizado para Foto do Produto / Ilustração */}
                  <div className="relative w-full h-48 sm:h-52 mb-4 rounded-xl overflow-hidden bg-slate-950/80 border border-white/10 group-hover:border-[#00FF88]/30 transition-all flex items-center justify-center">
                    <img
                      src={imagemExibida}
                      alt={premio.titulo}
                      className={`w-full h-full ${premio.fotoUrl ? 'object-cover' : 'object-contain'} group-hover:scale-105 transition-transform duration-500`}
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                    {/* Ícone no Canto Superior Esquerdo */}
                    <div className="absolute top-3 left-3 p-2 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 shadow-lg">
                      {iconesPremios[premio.posicao] || <Trophy className="w-4 h-4 text-[#00FF88]" />}
                    </div>

                    {/* Tag da Posição do Prêmio */}
                    <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/80 backdrop-blur-md text-[#D4AF37] border border-[#D4AF37]/40 shadow-lg">
                      {premio.posicao}º Prêmio
                    </span>
                  </div>

                  {/* Título e Subtítulo */}
                  <h3 className="font-cinzel text-lg font-bold text-white mb-2 group-hover:text-[#00FF88] transition-colors">
                    {premio.titulo}
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {premio.subtitulo}
                  </p>
                </div>

                {/* Rodapé Padronizado da Campanha */}
                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <span>Campanha Oficial Wicked 2026</span>
                  <span className="text-[#00FF88] font-bold font-mono">1.200 Cotas</span>
                </div>
              </div>
            );
          })}

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
                <span className="text-[#00FF88] font-semibold">sorteador online gratuito</span>, assim que todos os 1.200 números forem comercializados. Será sorteado um prêmio por vez, em ordem decrescente, iniciando do 5º até o 1º prêmio.
              </p>
            </div>

            <a
              href="https://instagram.com/talentosdeminasballet"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#FF007F] hover:bg-[#ff1a8c] text-white transition-all glow-glinda cursor-pointer"
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
