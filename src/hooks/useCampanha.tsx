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
  concluirPedido: (dados: { nome: string; email: string; whatsapp: string; bailarinoId: string; cotasCustom?: number[] }) => Promise<PedidoCheckout>;
  adicionarBailarino: (dados: { nome: string; fotoUrl: string; meta: number }) => Promise<void>;
  editarBailarino: (id: string, dados: Partial<Bailarino>) => Promise<void>;
  baixaManualCota: (numero: number, dados: { compradorNome: string; compradorEmail?: string; compradorWhatsapp?: string; bailarinoId: string }) => Promise<void>;
  liberarCota: (numero: number) => Promise<void>;
  precoPorCota: number;
  atualizarPrecoPorCota: (novoPreco: number) => Promise<void>;
  carregarDadosReais: () => Promise<void>;
  confirmarPedidoManual: (orderId: string) => Promise<void>;
  cancelarPedido: (orderId: string) => Promise<void>;
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
  const [precoPorCota, setPrecoPorCota] = useState<number>(PRECO_POR_COTA);

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

      // 2. Carrega configurações globais da campanha (Preço da Cota, etc.)
      const { data: configData } = await supabase
        .from('campanha_config')
        .select('*');

      if (configData) {
        const precoRow = configData.find((c: any) => c.chave === 'preco_por_cota');
        if (precoRow && !isNaN(Number(precoRow.valor)) && Number(precoRow.valor) > 0) {
          setPrecoPorCota(Number(precoRow.valor));
        }
      }

      // 3. Carrega slots atômicos e pedidos para proteger cotas pagas/reservadas
      const { data: slotsData } = await supabase
        .from('cota_slots')
        .select('*');

      const { data: oData, error: oError } = await supabase
        .from('raffle_orders')
        .select('*');

      const novasCotas = criarCotasVazias();

      // Aplica dados da tabela de proteção atômica
      if (slotsData) {
        slotsData.forEach((slot: any) => {
          const cotaIdx = slot.numero - 1;
          if (novasCotas[cotaIdx]) {
            const isReservaAtiva = slot.status === 'reserved' && slot.reserved_until && new Date(slot.reserved_until) > new Date();
            if (slot.status === 'paid' || isReservaAtiva) {
              novasCotas[cotaIdx] = {
                numero: slot.numero,
                status: slot.status === 'paid' ? 'pago' : 'reservado',
                compradorNome: slot.comprador_nome,
                compradorEmail: slot.comprador_email,
                compradorWhatsapp: slot.comprador_whatsapp,
                bailarinoId: slot.bailarino_id,
                dataCompra: slot.paid_at || slot.created_at,
              };
            }
          }
        });
      }

      // Garante sincronização com pedidos concluídos
      if (!oError && oData) {
        oData.forEach((order: any) => {
          if (Array.isArray(order.selected_numbers) && order.status === 'paid') {
            order.selected_numbers.forEach((num: number) => {
              const cotaIdx = num - 1;
              if (novasCotas[cotaIdx]) {
                novasCotas[cotaIdx] = {
                  numero: num,
                  status: 'pago',
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
        { event: '*', schema: 'public', table: 'cota_slots' },
        () => carregarDadosReais()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bailarinos' },
        () => carregarDadosReais()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campanha_config' },
        () => carregarDadosReais()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregarDadosReais]);

  const totalCotasVendidas = cotas.filter((c) => c.status === 'pago').length;
  const totalArrecadado = totalCotasVendidas * precoPorCota;

  const atualizarPrecoPorCota = async (novoPreco: number) => {
    if (novoPreco <= 0 || isNaN(novoPreco)) {
      throw new Error('Informe um valor de cota válido e maior que zero.');
    }

    setPrecoPorCota(novoPreco);

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('campanha_config')
        .upsert({
          chave: 'preco_por_cota',
          valor: String(novoPreco),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Erro ao atualizar preco_por_cota no banco:', error);
        throw error;
      }
    }
  };

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

  // Conclusão real do pedido com inserção no Supabase e Edge Function Mercado Pago
  const concluirPedido = async (dados: { 
    nome: string; 
    email: string; 
    whatsapp: string; 
    bailarinoId: string;
    cotasCustom?: number[];
  }): Promise<PedidoCheckout> => {
    const hoje = new Date().toISOString().split('T')[0];
    const cotasParaSalvar = (dados.cotasCustom && dados.cotasCustom.length > 0)
      ? dados.cotasCustom
      : cotasSelecionadas;
    const valorTotal = cotasParaSalvar.length * precoPorCota;
    const novoOrderId = crypto.randomUUID();

    let codigoPix = '';
    let qrCodeBase64: string | undefined = undefined;
    let mpPaymentId: string | undefined = undefined;

    if (isSupabaseConfigured) {
      // 0. REGRA INQUEBRÁVEL: Reserva atômica no banco de dados com bloqueio de concorrência
      const { data: reservaRes, error: rpcErr } = await supabase.rpc('reservar_cotas_pedido', {
        p_order_id: novoOrderId,
        p_numeros: cotasParaSalvar,
        p_nome: dados.nome,
        p_email: dados.email,
        p_whatsapp: dados.whatsapp,
        p_bailarino_id: dados.bailarinoId,
      });

      if (rpcErr || (reservaRes && !reservaRes.success)) {
        const msg = reservaRes?.message || 'Um ou mais números escolhidos já foram adquiridos por outro apoiador! Por favor, escolha outros números.';
        throw new Error(msg);
      }

      // 1. Persiste o pedido com status 'pending'
      const { error: insertErr } = await supabase
        .from('raffle_orders')
        .insert([
          {
            id: novoOrderId,
            customer_name: dados.nome,
            customer_email: dados.email,
            customer_phone: dados.whatsapp,
            bailarino_id: dados.bailarinoId,
            selected_numbers: [...cotasParaSalvar],
            total_price: valorTotal,
            status: 'pending',
            payment_method: 'pix',
            payment_origin: 'mercadopago',
          },
        ]);

      if (insertErr) {
        console.error('Erro ao registrar pedido no Supabase:', insertErr);
        throw new Error('Falha ao registrar pedido no sistema: ' + insertErr.message);
      }

      // 2. Invoca a Edge Function oficial do Mercado Pago com idempotência
      try {
        const { data: mpData, error: fnErr } = await supabase.functions.invoke('create-mercado-pago-payment', {
          body: {
            order_id: novoOrderId,
            total_price: valorTotal,
            customer_name: dados.nome,
            customer_email: dados.email,
            description: `Talentos de Minas - ${cotasParaSalvar.length} cota(s) rifa Wicked 2026`,
          },
        });

        if (fnErr) {
          console.error('Erro ao invocar Edge Function create-mercado-pago-payment:', fnErr);
          throw new Error('Erro no gateway Mercado Pago: ' + fnErr.message);
        } else if (mpData?.success) {
          codigoPix = mpData.qr_code || '';
          qrCodeBase64 = mpData.qr_code_base64;
          mpPaymentId = mpData.payment_id ? String(mpData.payment_id) : undefined;
        } else if (mpData?.error) {
          throw new Error('Mercado Pago: ' + mpData.error);
        }
      } catch (callErr: any) {
        console.error('Exceção ao gerar Pix no Mercado Pago:', callErr);
        throw new Error(callErr.message || 'Falha na comunicação com o Mercado Pago.');
      }
    }

    if (!codigoPix) {
      throw new Error('Não foi possível obter o QR Code Pix do Mercado Pago. Por favor, tente novamente.');
    }

    const novoPedido: PedidoCheckout = {
      id: novoOrderId,
      compradorNome: dados.nome,
      compradorEmail: dados.email,
      compradorWhatsapp: dados.whatsapp,
      bailarinoId: dados.bailarinoId,
      numeros: [...cotasParaSalvar].sort((a, b) => a - b),
      valorTotal,
      dataCriacao: hoje,
      status: 'pendente',
      codigoPix,
      qrCodeBase64,
      mpPaymentId,
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

  const confirmarPedidoManual = async (orderId: string) => {
    if (isSupabaseConfigured) {
      await supabase
        .from('raffle_orders')
        .update({
          status: 'paid',
          payment_origin: 'manual',
          status_updated_by: 'admin_painel',
          status_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
      await carregarDadosReais();
    }
  };

  const cancelarPedido = async (orderId: string) => {
    if (isSupabaseConfigured) {
      await supabase
        .from('raffle_orders')
        .update({
          status: 'cancelled',
          status_updated_by: 'admin_painel',
          status_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
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
        precoPorCota,
        atualizarPrecoPorCota,
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
        confirmarPedidoManual,
        cancelarPedido,
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
