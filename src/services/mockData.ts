import type { Bailarino, CotaRifa, Premio } from '../types';
import b1 from '../assets/bailarinos/b1.webp';
import b2 from '../assets/bailarinos/b2.webp';
import b3 from '../assets/bailarinos/b3.webp';
import b4 from '../assets/bailarinos/b4.webp';
import b5 from '../assets/bailarinos/b5.webp';

export const PRECO_POR_COTA = 25; // R$ 25,00 por bilhete da rifa
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

export const BAILARINOS_INICIAIS: Bailarino[] = [
  {
    id: 'b-1',
    nome: 'Helena Duarte',
    fotoUrl: b1,
    meta: 120,
    totalVendido: 68,
    totalApoios: 68,
    ativo: true,
  },
  {
    id: 'b-2',
    nome: 'Lucas Silveira',
    fotoUrl: b2,
    meta: 120,
    totalVendido: 54,
    totalApoios: 54,
    ativo: true,
  },
  {
    id: 'b-3',
    nome: 'Mariana Vasconcelos',
    fotoUrl: b3,
    meta: 100,
    totalVendido: 46,
    totalApoios: 46,
    ativo: true,
  },
  {
    id: 'b-4',
    nome: 'Gabriel Moreira',
    fotoUrl: b4,
    meta: 100,
    totalVendido: 39,
    totalApoios: 39,
    ativo: true,
  },
  {
    id: 'b-5',
    nome: 'Camila Peixoto',
    fotoUrl: b5,
    meta: 100,
    totalVendido: 31,
    totalApoios: 31,
    ativo: true,
  },
];

/**
 * Gera os 1.200 números inteiros únicos (de 1 a 1200) com persistência no LocalStorage
 */
export function inicializarCotas(): CotaRifa[] {
  const cotasSalvas = localStorage.getItem('talentos_cotas_1200');
  if (cotasSalvas) {
    try {
      return JSON.parse(cotasSalvas);
    } catch {
      // continua para gerar novas
    }
  }

  // Preenche algumas já vendidas inicialmente para simular histórico
  const cotas: CotaRifa[] = Array.from({ length: TOTAL_COTAS }, (_, index) => {
    const num = index + 1;
    // Marca ~15% como vendidas inicialmente para teste dinâmico
    const vendida = num <= 238;
    return {
      numero: num,
      status: vendida ? 'pago' : 'disponivel',
      compradorNome: vendida ? `Apoiador #${num}` : undefined,
      compradorEmail: vendida ? `apoiador${num}@email.com` : undefined,
      compradorWhatsapp: vendida ? '(31) 99876-5432' : undefined,
      bailarinoId: vendida ? BAILARINOS_INICIAIS[num % BAILARINOS_INICIAIS.length].id : undefined,
      dataCompra: vendida ? '2026-03-20' : undefined,
    };
  });

  localStorage.setItem('talentos_cotas_1200', JSON.stringify(cotas));
  return cotas;
}
