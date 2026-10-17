import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, QrCode, Building2, MessageCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { CheckoutModalLoja } from './CheckoutModalLoja';
import type { ProdutoLoja } from '../../types';
import { gerarLinkSuporteWhatsApp, WHATSAPP_SUPORTE_FORMATADO } from '../../utils/whatsappSupport';

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
      <stop offset="0%" stop-color="#00FF88" />
    </linearGradient>
  </defs>
  <rect width="300" height="300" fill="url(#bgGradBag)" rx="16" />
  <circle cx="150" cy="150" r="110" stroke="url(#pinkGold)" stroke-width="1.5" stroke-dasharray="6,6" fill="none" opacity="0.4" />
  <path d="M120 120 C120 70, 180 70, 180 120" stroke="url(#pinkGold)" stroke-width="4" fill="none" />
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
  <rect x="138" y="70" width="24" height="20" rx="4" fill="url(#goldPure)" />
  <rect x="142" y="90" width="16" height="15" fill="#D4AF37" opacity="0.8" />
  <rect x="120" y="105" width="60" height="140" rx="14" fill="#141E18" stroke="url(#goldPure)" stroke-width="2" />
  <line x1="120" y1="180" x2="180" y2="180" stroke="url(#goldPure)" stroke-width="1" opacity="0.4" />
  <text x="150" y="200" font-family="Cinzel, serif" font-size="9" fill="#00FF88" text-anchor="middle" letter-spacing="1">TALENTOS</text>
</svg>
`)}`;

const PRODUTOS_FALLBACK: ProdutoLoja[] = [
  {
    id: 'prod-1',
    nome: 'Camiseta Oficial Wicked 2026',
    descricao: 'Algodão egípcio com estampa em foil metálico esmeralda e dourado.',
    preco: 79.90,
    fotoUrl: SVG_CAMISETA,
    tamanhosDisponiveis: ['P', 'M', 'G', 'GG'],
    ativo: true,
  },
  {
    id: 'prod-2',
    nome: 'Ecobag Bordada Oz & Ballet',
    descricao: 'Tecido sustentável reforçado com bordado temático de alta precisão.',
    preco: 49.90,
    fotoUrl: SVG_ECOBAG,
    tamanhosDisponiveis: ['Único'],
    ativo: true,
  },
  {
    id: 'prod-3',
    nome: 'Garrafa Térmica Dourada 600ml',
    descricao: 'Inox com isolamento a vácuo e gravação a laser personalizada.',
    preco: 69.90,
    fotoUrl: SVG_GARRAFA,
    tamanhosDisponiveis: ['Único'],
    ativo: true,
  },
];

export const LojaSazonal: React.FC = () => {
  const [produtos, setProdutos] = useState<ProdutoLoja[]>(PRODUTOS_FALLBACK);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoLoja | null>(null);

  const carregarProdutos = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    try {
      const { data, error } = await supabase
        .from('produtos_loja')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapeados: ProdutoLoja[] = data.map((p: any) => {
          let fallbackImg = SVG_CAMISETA;
          if (p.nome.toLowerCase().includes('ecobag')) fallbackImg = SVG_ECOBAG;
          if (p.nome.toLowerCase().includes('garrafa')) fallbackImg = SVG_GARRAFA;

          return {
            id: p.id,
            nome: p.nome,
            descricao: p.descricao || '',
            preco: Number(p.preco),
            fotoUrl: p.foto_url || fallbackImg,
            estoque: p.estoque ?? 100,
            tamanhosDisponiveis: Array.isArray(p.tamanhos_disponiveis) && p.tamanhos_disponiveis.length > 0 
              ? p.tamanhos_disponiveis 
              : ['Único'],
            ativo: p.ativo ?? true,
          };
        });

        setProdutos(mapeados);
      }
    } catch (err) {
      console.error('Erro ao carregar produtos da loja:', err);
    }
  }, []);

  useEffect(() => {
    carregarProdutos();

    const canal = supabase
      .channel('loja_produtos_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'produtos_loja' },
        () => carregarProdutos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregarProdutos]);

  return (
    <section id="secao-loja" className="py-12 sm:py-20 border-b border-white/5 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] sm:text-xs font-semibold text-[#FF007F] uppercase tracking-wider mb-3">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Coleção Oficial • Pagamento Pix Imediato</span>
          </div>
          <h2 className="font-cinzel text-xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            Coleção Oficial Wicked 2026
          </h2>
          <p className="mt-2 sm:mt-3 text-slate-400 text-xs sm:text-sm">
            Itens e lembranças temáticas exclusivas da campanha de dança em apoio aos nossos talentos.
          </p>
        </div>

        {/* ALERTA VISÍVEL DE RETIRADA NA ESCOLA */}
        <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row items-center sm:items-start gap-3.5 shadow-lg max-w-3xl mx-auto">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="text-xs text-center sm:text-left leading-relaxed">
            <strong className="text-white block font-semibold text-sm mb-0.5">
              Aviso Importante: Retirada Presencial na Escola
            </strong>
            Todos os produtos adquiridos na loja online devem ser <strong>retirados presencialmente na recepção do Núcleo de Dança Tatiana Figueiredo</strong> após a confirmação do pagamento. Eventuais despesas de frete, envio ou transporte são de inteira responsabilidade do comprador.
            <div className="mt-2 text-[11px] text-amber-300 flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
              <span>Dúvidas sobre produtos ou entrega?</span>
              <a
                href={gerarLinkSuporteWhatsApp()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline font-semibold hover:text-white text-[#25D366]"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                WhatsApp {WHATSAPP_SUPORTE_FORMATADO}
              </a>
            </div>
          </div>
        </div>

        {/* Grade de Produtos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {produtos.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl glass-card border border-white/10 p-5 flex flex-col justify-between hover:border-[#00FF88]/40 transition-all shadow-xl"
            >
              <div>
                <div className="relative rounded-xl overflow-hidden aspect-video mb-4 bg-slate-900 border border-white/10">
                  <img
                    src={item.fotoUrl}
                    alt={item.nome}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[10px] font-bold text-[#00FF88] border border-[#00FF88]/30 uppercase tracking-wider">
                    Disponível
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {item.tamanhosDisponiveis?.map((tam) => (
                    <span
                      key={tam}
                      className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300"
                    >
                      {tam}
                    </span>
                  ))}
                </div>

                <h3 className="font-semibold text-white text-base group-hover:text-[#00FF88] transition-colors">
                  {item.nome}
                </h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">{item.descricao}</p>
              </div>

              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 block">Preço Oficial</span>
                  <span className="text-base font-bold text-white font-mono">
                    R$ {Number(item.preco).toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setProdutoSelecionado(item)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold font-cinzel uppercase tracking-wider bg-[#00FF88] hover:bg-[#33ff9f] text-black transition-all flex items-center gap-1.5 glow-oz cursor-pointer shadow-lg active:scale-95"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Comprar Pix</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Checkout da Loja */}
      <CheckoutModalLoja
        isOpen={!!produtoSelecionado}
        onClose={() => setProdutoSelecionado(null)}
        produto={produtoSelecionado}
      />
    </section>
  );
};
