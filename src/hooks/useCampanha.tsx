import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Bailarino, CotaRifa, PedidoCheckout } from '../types';
import { BAILARINOS_INICIAIS, inicializarCotas, PRECO_POR_COTA } from '../services/mockData';
import { AVATAR_PADRAO_BAILARINO } from '../utils/imageOptimizer';

interface CampanhaContextData {
  cotas: CotaRifa[];
  bailarinos: Bailarino[];
  cotasSelecionadas: number[];
  bailarinoSelecionadoId: string | null;
  totalArrecadado: number;
  totalCotasVendidas: number;
  toggleSelecionarCota: (numero: number) => void;
  selecionarAleatorios: (quantidade: number) => void;
  selecionarCotasEmLote: (numeros: number[]) => void;
  limparSelecao: () => void;
  setBailarinoSelecionadoId: (id: string | null) => void;
  concluirPedido: (dados: { nome: string; email: string; whatsapp: string; bailarinoId: string }) => PedidoCheckout;
  adicionarBailarino: (dados: { nome: string; fotoUrl: string; meta: number }) => void;
  editarBailarino: (id: string, dados: Partial<Bailarino>) => void;
  baixaManualCota: (numero: number, dados: { compradorNome: string; compradorEmail?: string; compradorWhatsapp?: string; bailarinoId: string }) => void;
  liberarCota: (numero: number) => void;
}

const CampanhaContext = createContext<CampanhaContextData | null>(null);

export const CampanhaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cotas, setCotas] = useState<CotaRifa[]>(() => inicializarCotas());
  const [bailarinos, setBailarinos] = useState<Bailarino[]>(() => {
    const salvos = localStorage.getItem('talentos_bailarinos');
    if (salvos) {
      try {
        const parsed: Bailarino[] = JSON.parse(salvos);
        // Migra fotos antigas que usavam URLs externas (ex: Unsplash) para os WebP locais otimizados
        return parsed.map((b, idx) => {
          if (!b.fotoUrl || b.fotoUrl.includes('unsplash.com')) {
            const fallbackLocal = BAILARINOS_INICIAIS[idx]?.fotoUrl || AVATAR_PADRAO_BAILARINO;
            return { ...b, fotoUrl: fallbackLocal };
          }
          return b;
        });
      } catch {
        return BAILARINOS_INICIAIS;
      }
    }
    return BAILARINOS_INICIAIS;
  });
  const [cotasSelecionadas, setCotasSelecionadas] = useState<number[]>([]);
  const [bailarinoSelecionadoId, setBailarinoSelecionadoId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('talentos_cotas_1200', JSON.stringify(cotas));
  }, [cotas]);

  useEffect(() => {
    localStorage.setItem('talentos_bailarinos', JSON.stringify(bailarinos));
  }, [bailarinos]);

  const totalCotasVendidas = cotas.filter((c) => c.status === 'pago').length;
  const totalArrecadado = totalCotasVendidas * PRECO_POR_COTA;

  const toggleSelecionarCota = (numero: number) => {
    const cota = cotas.find((c) => c.numero === numero);
    if (!cota || cota.status === 'pago') return;

    setCotasSelecionadas((prev) =>
      prev.includes(numero) ? prev.filter((n) => n !== numero) : [...prev, numero]
    );
  };

  const selecionarAleatorios = (quantidade: number) => {
    const disponiveis = cotas
      .filter((c) => c.status === 'disponivel' && !cotasSelecionadas.includes(c.numero))
      .map((c) => c.numero);

    if (disponiveis.length === 0) return;

    // Embaralha e seleciona a quantidade
    const sorteados = [...disponiveis].sort(() => 0.5 - Math.random()).slice(0, quantidade);
    setCotasSelecionadas((prev) => [...prev, ...sorteados]);
  };

  const selecionarCotasEmLote = (numeros: number[]) => {
    const validos = numeros.filter((num) => {
      const c = cotas.find((item) => item.numero === num);
      return c && c.status === 'disponivel';
    });
    setCotasSelecionadas(validos);
  };

  const limparSelecao = () => {
    setCotasSelecionadas([]);
  };

  const concluirPedido = (dados: { nome: string; email: string; whatsapp: string; bailarinoId: string }): PedidoCheckout => {
    const hoje = new Date().toISOString().split('T')[0];
    const valorTotal = cotasSelecionadas.length * PRECO_POR_COTA;

    // Atualiza status das cotas para pago
    setCotas((prev) =>
      prev.map((cota) => {
        if (cotasSelecionadas.includes(cota.numero)) {
          return {
            ...cota,
            status: 'pago',
            compradorNome: dados.nome,
            compradorEmail: dados.email,
            compradorWhatsapp: dados.whatsapp,
            bailarinoId: dados.bailarinoId,
            dataCompra: hoje,
          };
        }
        return cota;
      })
    );

    // Atualiza estatísticas do bailarino
    setBailarinos((prev) =>
      prev.map((b) => {
        if (b.id === dados.bailarinoId) {
          return {
            ...b,
            totalVendido: b.totalVendido + cotasSelecionadas.length,
            totalApoios: b.totalApoios + cotasSelecionadas.length,
          };
        }
        return b;
      })
    );

    const novoPedido: PedidoCheckout = {
      id: `ped-${Date.now()}`,
      compradorNome: dados.nome,
      compradorEmail: dados.email,
      compradorWhatsapp: dados.whatsapp,
      bailarinoId: dados.bailarinoId,
      numeros: [...cotasSelecionadas].sort((a, b) => a - b),
      valorTotal,
      dataCriacao: hoje,
      status: 'pago',
      codigoPix: `00020126580014BR.GOV.BCB.PIX0136talentosdeminasballet@gmail.com520400005303986540${valorTotal}.005802BR5920TALENTOS DE MINAS6009BELO HORIZONTE62070503***6304E8A2`,
    };

    setCotasSelecionadas([]);
    return novoPedido;
  };

  const adicionarBailarino = (dados: { nome: string; fotoUrl: string; meta: number }) => {
    const novo: Bailarino = {
      id: `b-${Date.now()}`,
      nome: dados.nome,
      fotoUrl: dados.fotoUrl || AVATAR_PADRAO_BAILARINO,
      meta: dados.meta || 100,
      totalVendido: 0,
      totalApoios: 0,
      ativo: true,
    };
    setBailarinos((prev) => [novo, ...prev]);
  };

  const editarBailarino = (id: string, dados: Partial<Bailarino>) => {
    setBailarinos((prev) => prev.map((b) => (b.id === id ? { ...b, ...dados } : b)));
  };

  const baixaManualCota = (
    numero: number,
    dados: { compradorNome: string; compradorEmail?: string; compradorWhatsapp?: string; bailarinoId: string }
  ) => {
    const hoje = new Date().toISOString().split('T')[0];
    setCotas((prev) =>
      prev.map((c) =>
        c.numero === numero
          ? {
              ...c,
              status: 'pago',
              compradorNome: dados.compradorNome,
              compradorEmail: dados.compradorEmail,
              compradorWhatsapp: dados.compradorWhatsapp,
              bailarinoId: dados.bailarinoId,
              dataCompra: hoje,
            }
          : c
      )
    );

    setBailarinos((prev) =>
      prev.map((b) =>
        b.id === dados.bailarinoId
          ? { ...b, totalVendido: b.totalVendido + 1, totalApoios: b.totalApoios + 1 }
          : b
      )
    );
  };

  const liberarCota = (numero: number) => {
    setCotas((prev) =>
      prev.map((c) =>
        c.numero === numero
          ? {
              numero,
              status: 'disponivel',
              compradorNome: undefined,
              compradorEmail: undefined,
              compradorWhatsapp: undefined,
              bailarinoId: undefined,
              dataCompra: undefined,
            }
          : c
      )
    );
  };

  return (
    <CampanhaContext.Provider
      value={{
        cotas,
        bailarinos,
        cotasSelecionadas,
        bailarinoSelecionadoId,
        totalArrecadado,
        totalCotasVendidas,
        toggleSelecionarCota,
        selecionarAleatorios,
        selecionarCotasEmLote,
        limparSelecao,
        setBailarinoSelecionadoId,
        concluirPedido,
        adicionarBailarino,
        editarBailarino,
        baixaManualCota,
        liberarCota,
      }}
    >
      {children}
    </CampanhaContext.Provider>
  );
};

export const useCampanha = (): CampanhaContextData => {
  const context = useContext(CampanhaContext);
  if (!context) {
    throw new Error('useCampanha deve ser utilizado dentro de um CampanhaProvider');
  }
  return context;
};
