import React, { useState } from 'react';
import { ShoppingBag, Clock, BellRing, Check } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

interface ItemPrevia {
  id: string;
  nome: string;
  descricao: string;
  precoEstimado: string;
  imagemUrl: string;
}

const SVG_CAMISETA = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F3D2A" />
      <stop offset="100%" stop-color="#051911" />
    </linearGradient>
    <linearGradient id="ozGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00FF88" />
      <stop offset="100%" stop-color="#D4AF37" />
    </linearGradient>
  </defs>
  <rect width="300" height="300" fill="url(#bgGrad)" rx="16" />
  <circle cx="150" cy="150" r="110" stroke="url(#ozGold)" stroke-width="1.5" stroke-dasharray="6,6" fill="none" opacity="0.4" />
  <path d="M100 80 L130 95 C142 85 158 85 170 95 L200 80 L230 115 L205 135 L205 230 L95 230 L95 135 L70 115 Z" fill="#141E18" stroke="url(#ozGold)" stroke-width="2" />
  <text x="150" y="165" font-family="Cinzel, serif" font-size="14" font-weight="bold" fill="#00FF88" text-anchor="middle" letter-spacing="3">WICKED</text>
  <text x="150" y="185" font-family="Cinzel, serif" font-size="10" fill="#D4AF37" text-anchor="middle" letter-spacing="2">2026</text>
</svg>
`)}`;

const SVG_ECOBAG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <defs>
    <linearGradient id="bgGradBag" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F3D2A" />
      <stop offset="100%" stop-color="#051911" />
    </linearGradient>
    <linearGradient id="pinkGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD1DC" />
      <stop offset="100%" stop-color="#00FF88" />
    </linearGradient>
  </defs>
  <rect width="300" height="300" fill="url(#bgGradBag)" rx="16" />
  <circle cx="150" cy="150" r="110" stroke="url(#pinkGold)" stroke-width="1.5" stroke-dasharray="6,6" fill="none" opacity="0.4" />
  <!-- Alça -->
  <path d="M120 120 C120 70, 180 70, 180 120" stroke="url(#pinkGold)" stroke-width="4" fill="none" />
  <!-- Corpo da ecobag -->
  <rect x="90" y="115" width="120" height="130" rx="8" fill="#141E18" stroke="url(#pinkGold)" stroke-width="2" />
  <circle cx="150" cy="175" r="24" stroke="#D4AF37" stroke-width="1.5" fill="none" opacity="0.6" />
  <text x="150" y="180" font-family="Cinzel, serif" font-size="16" fill="#00FF88" text-anchor="middle">OZ</text>
</svg>
`)}`;

const SVG_GARRAFA = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <defs>
    <linearGradient id="bgGradBottle" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F3D2A" />
      <stop offset="100%" stop-color="#051911" />
    </linearGradient>
    <linearGradient id="goldPure" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCEBA7" />
      <stop offset="100%" stop-color="#D4AF37" />
    </linearGradient>
  </defs>
  <rect width="300" height="300" fill="url(#bgGradBottle)" rx="16" />
  <circle cx="150" cy="150" r="110" stroke="url(#goldPure)" stroke-width="1.5" stroke-dasharray="6,6" fill="none" opacity="0.4" />
  <!-- Tampa -->
  <rect x="138" y="70" width="24" height="20" rx="4" fill="url(#goldPure)" />
  <!-- Gargalo -->
  <rect x="142" y="90" width="16" height="15" fill="#D4AF37" opacity="0.8" />
  <!-- Corpo da garrafa térmica -->
  <rect x="120" y="105" width="60" height="140" rx="14" fill="#141E18" stroke="url(#goldPure)" stroke-width="2" />
  <line x1="120" y1="180" x2="180" y2="180" stroke="url(#goldPure)" stroke-width="1" opacity="0.4" />
  <text x="150" y="200" font-family="Cinzel, serif" font-size="9" fill="#00FF88" text-anchor="middle" letter-spacing="1">TALENTOS</text>
</svg>
`)}`;

const ITENS_PREVIA: ItemPrevia[] = [
  {
    id: 'prod-1',
    nome: 'Camiseta Oficial Wicked 2026',
    descricao: 'Algodão egípcio com estampa em foil metálico esmeralda e dourado.',
    precoEstimado: 'R$ 79,90',
    imagemUrl: SVG_CAMISETA,
  },
  {
    id: 'prod-2',
    nome: 'Ecobag Bordada Oz & Ballet',
    descricao: 'Tecido sustentável reforçado com bordado temático de alta precisão.',
    precoEstimado: 'R$ 49,90',
    imagemUrl: SVG_ECOBAG,
  },
  {
    id: 'prod-3',
    nome: 'Garrafa Térmica Dourada 600ml',
    descricao: 'Inox com isolamento a vácuo e gravação a laser personalizada.',
    precoEstimado: 'R$ 69,90',
    imagemUrl: SVG_GARRAFA,
  },
];

export const LojaSazonal: React.FC = () => {
  const { showToast } = useToast();
  const [notificados, setNotificados] = useState<string[]>([]);

  const handleNotificar = (nome: string, id: string) => {
    if (notificados.includes(id)) return;
    setNotificados((prev) => [...prev, id]);
    showToast({
      type: 'success',
      title: 'Interesse Registrado!',
      message: `Você receberá prioridade no lançamento de "${nome}".`,
    });
  };

  return (
    <section id="secao-loja" className="py-12 sm:py-20 border-b border-white/5 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] sm:text-xs font-semibold text-[#FF007F] uppercase tracking-wider mb-3">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Módulo Sazonal • Em Breve</span>
          </div>
          <h2 className="font-cinzel text-xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            Coleção Oficial Wicked 2026
          </h2>
          <p className="mt-2 sm:mt-3 text-slate-400 text-xs sm:text-sm">
            Itens e lembranças temáticas exclusivas da campanha de dança em apoio aos nossos talentos.
          </p>
        </div>

        {/* Grade de Prévia dos Produtos com Ação Completa */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {ITENS_PREVIA.map((item) => {
            const jaNotificado = notificados.includes(item.id);

            return (
              <div
                key={item.id}
                className="group rounded-2xl glass-card border border-white/10 p-5 flex flex-col justify-between hover:border-[#FF007F]/40 transition-all shadow-xl"
              >
                <div>
                  <div className="relative rounded-xl overflow-hidden aspect-video mb-4 bg-slate-900 border border-white/10">
                    <img
                      src={item.imagemUrl}
                      alt={item.nome}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      loading="lazy"
                    />
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[10px] font-bold text-[#FFD1DC] border border-[#FF007F]/30 uppercase tracking-wider">
                      Pré-Lançamento
                    </span>
                  </div>

                  <h3 className="font-semibold text-white text-base group-hover:text-[#FFD1DC] transition-colors">
                    {item.nome}
                  </h3>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">{item.descricao}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-[#00FF88] font-mono">{item.precoEstimado}</span>

                  <button
                    onClick={() => handleNotificar(item.nome, item.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      jaNotificado
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white/5 hover:bg-[#FF007F]/20 text-white hover:text-[#FFD1DC] border border-white/10'
                    }`}
                  >
                    {jaNotificado ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Aviso Ativado</span>
                      </>
                    ) : (
                      <>
                        <BellRing className="w-3.5 h-3.5 text-[#FF007F]" />
                        <span>Avise-me</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Banner Informativo da Próxima Fase */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-slate-400">
          <Clock className="w-4 h-4 text-[#FF007F] shrink-0" />
          <span>
            A integração completa do checkout da loja será liberada em conjunto com o catálogo físico do festival.
          </span>
        </div>
      </div>
    </section>
  );
};
