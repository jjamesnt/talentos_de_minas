import type { Premio, ComboPromocional } from '../types';

export const PRECO_POR_COTA = 30; // R$ 30,00 por cota da campanha (valor padrão)
export const TOTAL_COTAS_PADRAO = 1200; // Total padrão de cotas
export const TOTAL_COTAS = TOTAL_COTAS_PADRAO; // Mantido para compatibilidade retroativa

export const COMBOS_PADRAO: ComboPromocional[] = [
  { id: 'combo-1', quantidade: 1, precoTotal: 30, ativo: true },
  { id: 'combo-3', quantidade: 3, precoTotal: 80, badge: 'Mais Escolhido', destaque: false, ativo: true },
  { id: 'combo-5', quantidade: 5, precoTotal: 130, badge: 'Super Desconto', destaque: true, ativo: true },
  { id: 'combo-10', quantidade: 10, precoTotal: 250, badge: 'Apoiador Master', destaque: false, ativo: true },
];

export const PREMIOS_OFICIAIS: Premio[] = [
  {
    posicao: 1,
    titulo: 'Smart TV 50" 4K',
    subtitulo: 'Imagem ultra HD e tecnologia cinema em casa',
    destaque: true,
  },
  {
    posicao: 2,
    titulo: 'Pulseira Rommanel',
    subtitulo: 'Joia folheada com acabamento nobre exclusivo',
  },
  {
    posicao: 3,
    titulo: 'Kit Tupperware 7 Peças',
    subtitulo: 'Coleção completa de utilidades premium',
  },
  {
    posicao: 4,
    titulo: 'Fritadeira Airfryer Digital',
    subtitulo: 'Praticidade, potência e alta capacidade para o dia a dia',
  },
  {
    posicao: 5,
    titulo: '01 Par de Ingressos Wicked 2026',
    subtitulo: 'Assista de perto a magia dos nossos bailarinos no festival',
    destaque: true,
  },
];
