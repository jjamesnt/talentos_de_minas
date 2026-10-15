import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Bailarino, CotaRifa, PedidoCheckout } from '../types';
import { PRECO_POR_COTA, TOTAL_COTAS } from '../constants/campanha';
import { AVATAR_PADRAO_BAILARINO } from '../utils/imageOptimizer';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
  adicionarBailarino: (dados: { nome: string; fotoUrl: string; meta: number }) => Promise<void>;
  editarBailarino: (id: string, dados: Partial<Bailarino>) => Promise<void>;
  baixaManualCota: (numero: number, dados: { compradorNome: string; compradorEmail?: string; compradorWhatsapp?: string; bailarinoId: string }) => Promise<void>;
  liberarCota: (numero: number) => Promise<void>;
  carregarDadosReais: () => Promise<void>;
}

const CampanhaContext = createContext<CampanhaContextData | null>(null);

// Inicializa a grade de 1 a 1200 disponível
function criarCotasVazias(): CotaRifa[] {
  const lista: CotaRifa[] = [];
  for (let i = 1; i <= TOTAL_COTAS; i++) {
    lista.push({
      numero: i,
      status: 'disponivel',
    });
  }
  return lista;
}

export const CampanhaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cotas, setCotas] = useState<CotaRifa[]>(() => criarCotasVazias());
  const [bailarinos, setBailarinos] = useState<Bailarino[]>([]);
  const [cotasSelecionadas, setCotasSelecionadas] = useState<number[]>([]);
  const [bailarinoSelecionadoId, setBailarinoSelecionadoId] = useState<string | null>(null);

  // Limpeza de resíduos mockados antigos do LocalStorage
  useEffect(() => {
    localStorage.removeItem('talentos_cotas_1200');
    localStorage.removeItem('talentos_bailarinos');
  }, []);

  // Carrega os dados reais do Supabase
  const carregarDadosReais = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    try {
      // 1. Carrega bailarinos reais
      const { data: bData, error: bError } = await supabase
        .from('bailarinos')
        .select('*')
        .order('nome', { ascending: true });

      if (!bError && bData) {
        const mapeados: Bailarino[] = bData.map((b: any) => ({
          id: b.id,
          nome: b.nome,
          fotoUrl: b.foto_url || AVATAR_PADRAO_BAILARINO,
          meta: b.meta || 100,
          totalVendido: b.total_vendido || 0,
          totalApoios: b.total_apoios || 0,
          ativo: b.ativo ?? true,
        }));
        setBailarinos(mapeados);
      }

      // 2. Carrega pedidos existentes para marcar cotas pagas/reservadas
      const { data: oData, error: oError } = await supabase
        .from('raffle_orders')
        .select('*');

      const novasCotas = criarCotasVazias();

      if (!oError && oData) {
        oData.forEach((order: any) => {
          if (Array.isArray(order.selected_numbers)) {
            order.selected_numbers.forEach((num: number) => {
              const cotaIdx = num - 1;
              if (novasCotas[cotaIdx]) {
                novasCotas[cotaIdx] = {
                  numero: num,
                  status: order.status === 'paid' ? 'pago' : 'reservado',
                  compradorNome: order.customer_name,
                  compradorEmail: order.customer_email,
                  compradorWhatsapp: order.customer_phone,
                  bailarinoId: order.bailarino_id,
                  dataCompra: order.created_at,
                };
              }
            });
          }
        });
      }

      setCotas(novasCotas);
    } catch (err) {
      console.error('Erro ao conectar ao Supabase:', err);
    }
  }, []);

  // Assinatura Realtime para atualizações instantâneas no hotsite e painel
  useEffect(() => {
    carregarDadosReais();

    if (!isSupabaseConfigured) return;

    const canal = supabase
      .channel('realtime_talentos_campanha')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'raffle_orders' },
        () => carregarDadosReais()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bailarinos' },
        () => carregarDadosReais()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregarDadosReais]);

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

  // Conclusão real do pedido com inserção no Supabase
  const concluirPedido = (dados: { nome: string; email: string; whatsapp: string; bailarinoId: string }): PedidoCheckout => {
    const hoje = new Date().toISOString().split('T')[0];
    const valorTotal = cotasSelecionadas.length * PRECO_POR_COTA;
    const novoOrderId = crypto.randomUUID();
    const codigoPix = `00020126580014BR.GOV.BCB.PIX0136pix-talentos-${Date.now()}520400005303986540${valorTotal}.005802BR5925Talentos de Minas Ballet6009Belo Horizonte62070503***6304`;

    // Persiste no Supabase em segundo plano
    if (isSupabaseConfigured) {
      supabase
        .from('raffle_orders')
        .insert([
          {
            id: novoOrderId,
            customer_name: dados.nome,
            customer_email: dados.email,
            customer_phone: dados.whatsapp,
            bailarino_id: dados.bailarinoId,
            selected_numbers: [...cotasSelecionadas],
            total_price: valorTotal,
            status: 'pending',
            codigo_pix: codigoPix,
          },
        ])
        .then(({ error }) => {
          if (error) console.error('Erro ao registrar pedido no Supabase:', error);
          else carregarDadosReais();
        });
    }

    const novoPedido: PedidoCheckout = {
      id: novoOrderId,
      compradorNome: dados.nome,
      compradorEmail: dados.email,
      compradorWhatsapp: dados.whatsapp,
      bailarinoId: dados.bailarinoId,
      numeros: [...cotasSelecionadas].sort((a, b) => a - b),
      valorTotal,
      dataCriacao: hoje,
      status: 'pendente',
      codigoPix,
    };

    // Limpa a seleção após concluir
    setCotasSelecionadas([]);
    return novoPedido;
  };

  // Gestão Administrativa integrada com Supabase
  const adicionarBailarino = async (dados: { nome: string; fotoUrl: string; meta: number }) => {
    const id = `b-${Date.now()}`;
    if (isSupabaseConfigured) {
      await supabase.from('bailarinos').insert([
        {
          id,
          nome: dados.nome,
          foto_url: dados.fotoUrl,
          meta: dados.meta,
          total_vendido: 0,
          total_apoios: 0,
          ativo: true,
        },
      ]);
      await carregarDadosReais();
    }
  };

  const editarBailarino = async (id: string, dados: Partial<Bailarino>) => {
    if (isSupabaseConfigured) {
      await supabase
        .from('bailarinos')
        .update({
          nome: dados.nome,
          foto_url: dados.fotoUrl,
          meta: dados.meta,
          ativo: dados.ativo,
        })
        .eq('id', id);
      await carregarDadosReais();
    }
  };

  const baixaManualCota = async (
    numero: number,
    dados: { compradorNome: string; compradorEmail?: string; compradorWhatsapp?: string; bailarinoId: string }
  ) => {
    if (isSupabaseConfigured) {
      await supabase.from('raffle_orders').insert([
        {
          customer_name: dados.compradorNome,
          customer_email: dados.compradorEmail || 'secretaria@talentosdeminas.com.br',
          customer_phone: dados.compradorWhatsapp || '31999999999',
          bailarino_id: dados.bailarinoId,
          selected_numbers: [numero],
          total_price: PRECO_POR_COTA,
          status: 'paid', // Baixa manual administrativa já entra como paga
        },
      ]);
      await carregarDadosReais();
    }
  };

  const liberarCota = async (numero: number) => {
    if (isSupabaseConfigured) {
      // Deleta pedidos ou remove o número da lista
      const { data } = await supabase.from('raffle_orders').select('*');
      if (data) {
        for (const order of data) {
          if (Array.isArray(order.selected_numbers) && order.selected_numbers.includes(numero)) {
            const restantes = order.selected_numbers.filter((n: number) => n !== numero);
            if (restantes.length === 0) {
              await supabase.from('raffle_orders').delete().eq('id', order.id);
            } else {
              await supabase.from('raffle_orders').update({ selected_numbers: restantes }).eq('id', order.id);
            }
          }
        }
      }
      await carregarDadosReais();
    }
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
        carregarDadosReais,
      }}
    >
      {children}
    </CampanhaContext.Provider>
  );
};

export const useCampanha = () => {
  const context = useContext(CampanhaContext);
  if (!context) {
    throw new Error('useCampanha deve ser usado dentro de um CampanhaProvider');
  }
  return context;
};
