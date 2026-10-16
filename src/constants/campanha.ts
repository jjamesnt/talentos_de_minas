import type { Premio } from '../types';

export const PRECO_POR_COTA = 30; // R$ 30,00 por cota da campanha
export const TOTAL_COTAS = 1200;

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
