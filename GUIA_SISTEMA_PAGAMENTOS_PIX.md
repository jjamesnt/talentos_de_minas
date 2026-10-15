# ⚡ Guia de Implementação: Sistema de Pagamentos Pix Automático e Gestão no Painel Administrativo

Este documento é focado **estritamente no ecossistema de pagamentos**:
1. **Pix Automático (Mercado Pago + Supabase Edge Functions + Realtime)** no fluxo do cliente.
2. **Gestão e Auditoria de Pagamentos no Painel de Controle (Admin)** com consulta direta à API do gateway, sincronização de status, ações manuais e rastreamento de auditoria.

> **Sem dependência de rifas ou produtos específicos**: esta arquitetura pode ser plugada em e-commerce, venda de ingressos, assinaturas, doações ou qualquer checkout.

---

## 📑 Sumário
1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Modelagem de Dados para Pagamentos (PostgreSQL / Supabase)](#2-modelagem-de-dados-para-pagamentos-postgresql--supabase)
3. [Edge Functions do Gateway (Mercado Pago)](#3-edge-functions-do-gateway-mercado-pago)
   - 3.1 [`create-mercado-pago-payment`](#31-create-mercado-pago-payment) (Criação do Pix)
   - 3.2 [`mercado-pago-webhook`](#32-mercado-pago-webhook) (Confirmação Server-to-Server)
   - 3.3 [`check-mercado-pago-payment`](#33-check-mercado-pago-payment) (Consulta Ativa & Sincronização)
4. [Configuração de Credenciais e Webhook](#4-configuração-de-credenciais-e-webhook)
5. [Frontend do Cliente: Modal de Pagamento Pix com Realtime](#5-frontend-do-cliente-modal-de-pagamento-pix-com-realtime)
6. [Painel Administrativo: Gestão Completa de Pagamentos](#6-painel-administrativo-gestão-completa-de-pagamentos)
   - 6.1 Lista de Pedidos com Ações Rápidas (`OrderRow.tsx`)
   - 6.2 Modal de Auditoria Técnica do Mercado Pago (`MercadoPagoDetailsModal.tsx`)
   - 6.3 Sincronização em Tempo Real e Confirmação Manual
7. [Checklist de Implantação no Novo Projeto](#7-checklist-de-implantação-no-novo-projeto)

---

## 1. Visão Geral da Arquitetura

O sistema opera com garantia de **tolerância a falhas e confirmação imediata**:

```
+-----------------------------------------------------------------------------------+
|                                 FLUXO DO CLIENTE                                  |
|                                                                                   |
|  [Cliente fecha pedido] ---> [create-mercado-pago-payment] ---> [Mercado Pago API]  |
|                                         |                              |          |
|                                         v                              v          |
|                             Exibe QR Code + Copia-e-Cola       Gera Pix Dinâmico  |
|                                         |                                         |
|         +-------------------------------+-------------------------------+         |
|         |                                                               |         |
|         v (Camada 1: Push)                                              v (Camada 2: Fallback)|
|  [Supabase Realtime WebSocket] <----+                        [Polling Ativo 2s]   |
|         ^                           |                                   |         |
|         |                           |                                   v         |
|  [Status = 'paid']        [mercado-pago-webhook] <--------- [check-mercado-pago]  |
|         |                           ^                                             |
|         v                           |                                             |
|  Tela de Sucesso Instantânea        +--- [Mercado Pago notifica pagamento aprovado]
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        PAINEL ADMINISTRATIVO (GESTÃO)                             |
|                                                                                   |
|  - Listagem com Status em tempo real (Pendente, Pago, Cancelado, Não Confirmado)  |
|  - Origem da Transação: 'mercadopago' (automático) vs 'manual' (admin/balcão)     |
|  - Botão "Consultar MP": Consulta a API oficial do Mercado Pago sob demanda       |
|  - Modal de Auditoria: Status técnico, datas, ID de transação, motivo de recusa   |
|  - Ação Manual: Aprovar pagamento, cancelar ou alterar com log de quem executou   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Modelagem de Dados para Pagamentos (PostgreSQL / Supabase)

Execute o script SQL abaixo no **SQL Editor** do Supabase. Ele cria a tabela de pedidos com campos de auditoria e habilita o **Supabase Realtime**:

```sql
-- 1. Tabela Principal de Pedidos / Transações
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  total_price NUMERIC(10, 2) NOT NULL,
  
  -- Controle de Status de Pagamento
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'cancelled', 'unconfirmed'
  payment_method TEXT DEFAULT 'pix',      -- 'pix', 'credit_card', 'cash'
  payment_origin TEXT DEFAULT 'mercadopago', -- 'mercadopago', 'manual'
  mp_payment_id TEXT,                    -- ID retornado pelo Mercado Pago (ex: "161756166274")
  
  -- Auditoria Administrativa
  status_updated_by TEXT,                -- E-mail do administrador ou 'Sistema'
  status_updated_at TIMESTAMPTZ,         -- Data/hora da última alteração de status
  reason TEXT,                           -- Justificativa para cancelamento ou observação
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices para buscas instantâneas
CREATE INDEX IF NOT EXISTS idx_orders_mp_payment_id ON public.orders(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 3. Habilita o Realtime para atualizações push automáticas no frontend e admin
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- 4. Políticas de Segurança (Row Level Security - RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Inserção de novos pedidos
CREATE POLICY "Permitir inserção de pedidos"
ON public.orders FOR INSERT
WITH CHECK (true);

-- Leitura de pedidos
CREATE POLICY "Permitir leitura de pedidos"
ON public.orders FOR SELECT
USING (true);

-- Atualização: Service Role (Edge Functions) tem controle total
CREATE POLICY "Service Role tem permissão total de update"
ON public.orders FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Atualização para Admin Autenticado
CREATE POLICY "Admins autenticados podem atualizar pedidos"
ON public.orders FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
```

---

## 3. Edge Functions do Gateway (Mercado Pago)

As 3 funções TypeScript rodam no Deno (Supabase Edge Functions).

### 3.1 `create-mercado-pago-payment`
**Caminho:** `supabase/functions/create-mercado-pago-payment/index.ts`

Gera o Pix dinâmico no Mercado Pago com idempotência (`X-Idempotency-Key` com o `order_id`), armazena o `mp_payment_id` e devolve o QR Code:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
const MP_WEBHOOK_URL = Deno.env.get('MP_WEBHOOK_URL')

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      order_id, 
      total_price, 
      customer_name, 
      customer_email, 
      customer_phone,
      description 
    } = await req.json()

    if (!order_id || !total_price) {
      return new Response(JSON.stringify({ error: 'order_id e total_price são obrigatórios' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      })
    }

    if (!MP_ACCESS_TOKEN) {
      throw new Error("MP_ACCESS_TOKEN não configurado no Supabase.");
    }

    const nameParts = (customer_name || "Cliente").trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || "Pagador";

    const payload = {
      transaction_amount: Number(total_price),
      description: description || `Pedido #${String(order_id).substring(0, 8)}`,
      payment_method_id: "pix",
      payer: {
        email: customer_email || "cliente@email.com",
        first_name: firstName,
        last_name: lastName
      },
      external_reference: String(order_id),
      notification_url: MP_WEBHOOK_URL || `${SUPABASE_URL}/functions/v1/mercado-pago-webhook`
    }

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'X-Idempotency-Key': String(order_id) // Previne cobranças duplicadas
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(`[MercadoPago] Erro ao criar pagamento:`, data)
      return new Response(JSON.stringify({ error: 'Erro ao gerar Pix no gateway', details: data }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // Salva o ID do Mercado Pago no pedido
    await supabase
      .from('orders')
      .update({ mp_payment_id: String(data.id), updated_at: new Date().toISOString() })
      .eq('id', order_id);

    const transactionData = data.point_of_interaction?.transaction_data;

    return new Response(JSON.stringify({ 
      success: true, 
      payment_id: data.id,
      qr_code: transactionData?.qr_code,              // Chave / Linha Copia e Cola
      qr_code_base64: transactionData?.qr_code_base64, // Imagem PNG em Base64
      ticket_url: transactionData?.ticket_url,
      order_id: order_id
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 500
    })
  }
})
```

---

### 3.2 `mercado-pago-webhook`
**Caminho:** `supabase/functions/mercado-pago-webhook/index.ts`

Recebe a notificação assíncrona do Mercado Pago quando o cliente conclui o pagamento:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '')

serve(async (req) => {
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'alive' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const rawBody = await req.text();
    let body: any = {};
    if (rawBody) {
      try { body = JSON.parse(rawBody); } catch(e) {}
    }

    const topic = body.topic || url.searchParams.get('topic') || body.type || url.searchParams.get('type');
    const paymentId = body.resource ? body.resource.split('/').pop() : (body.data?.id || url.searchParams.get('data.id') || body.id);

    if (topic !== 'payment' || !paymentId) {
      return new Response(JSON.stringify({ message: 'Ignorado. Não é evento de pagamento.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Consulta oficial do pagamento usando o Token seguro do servidor
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
    });

    if (!mpRes.ok) {
      return new Response(JSON.stringify({ error: 'Falha ao buscar dados do MP' }), { headers: corsHeaders, status: 500 });
    }

    const paymentInfo = await mpRes.json();
    const status = paymentInfo.status;
    const orderId = paymentInfo.external_reference;

    if (status !== 'approved') {
      return new Response(JSON.stringify({ success: true, message: `Status é ${status}.` }), { headers: corsHeaders, status: 200 });
    }

    if (!orderId) {
      return new Response(JSON.stringify({ warning: 'Sem external_reference' }), { headers: corsHeaders, status: 200 });
    }

    // Busca o pedido no banco
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();

    if (order) {
      // Se já estava pago, finaliza com 200 (idempotente)
      if (order.status === 'paid') {
        return new Response(JSON.stringify({ success: true, message: 'Já pago' }), { headers: corsHeaders, status: 200 });
      }

      // Atualiza para PAGO
      await supabase
        .from('orders')
        .update({ 
          status: 'paid', 
          payment_origin: 'mercadopago', 
          mp_payment_id: String(paymentId), 
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);

      console.log(`[Webhook MP] Pedido ${orderId} atualizado para PAID com sucesso!`);
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders, status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { headers: corsHeaders, status: 500 });
  }
})
```

---

### 3.3 `check-mercado-pago-payment`
**Caminho:** `supabase/functions/check-mercado-pago-payment/index.ts`

Usada tanto pelo **polling do frontend** quanto pelo botão **"Consultar MP" no Painel Administrativo**:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { payment_id, order_id } = await req.json()

    if (!payment_id || !order_id) {
      return new Response(JSON.stringify({ error: 'payment_id e order_id são obrigatórios' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      })
    }

    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
    })

    if (!mpRes.ok) {
      const errorText = await mpRes.text()
      return new Response(JSON.stringify({ error: 'Erro ao consultar MP', details: errorText }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      })
    }

    const mpData = await mpRes.json()

    // Se estiver aprovado no Mercado Pago, sincroniza o banco imediatamente
    if (mpData.status === 'approved') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const { data: order } = await supabase.from('orders').select('id, status').eq('id', order_id).maybeSingle()

      if (order && order.status !== 'paid') {
        await supabase
          .from('orders')
          .update({ 
            status: 'paid', 
            payment_origin: 'mercadopago', 
            mp_payment_id: String(payment_id), 
            updated_at: new Date().toISOString() 
          })
          .eq('id', order_id)

        console.log(`[Check MP] Pedido ${order_id} sincronizado com sucesso para PAID.`);
      }
    }

    return new Response(JSON.stringify({ 
      status: mpData.status,
      status_detail: mpData.status_detail,
      payment_method_id: mpData.payment_method_id,
      date_created: mpData.date_created,
      date_approved: mpData.date_approved,
      transaction_amount: mpData.transaction_amount
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 500 
    })
  }
})
```

---

## 4. Configuração de Credenciais e Webhook

### Comandos de Deploy:
```bash
# 1. Definir os secrets no Supabase
supabase secrets set MP_ACCESS_TOKEN="APP_USR-xxxxxx-xxxxxx-xxxxxx"
supabase secrets set MP_WEBHOOK_URL="https://<SEU_PROJETO>.supabase.co/functions/v1/mercado-pago-webhook"

# 2. Fazer o deploy das funções
supabase functions deploy create-mercado-pago-payment --no-verify-jwt
supabase functions deploy mercado-pago-webhook --no-verify-jwt
supabase functions deploy check-mercado-pago-payment --no-verify-jwt
```

### Configurar Webhook no Mercado Pago:
1. Abra o [Painel Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel) > Sua Aplicação.
2. Acesse **Webhooks / Notificações**.
3. Adicione a URL: `https://<SEU_PROJETO>.supabase.co/functions/v1/mercado-pago-webhook`
4. Selecione o evento: **Pagamentos (`payment`)**.

---

## 5. Frontend do Cliente: Modal de Pagamento Pix com Realtime

Componente que exibe o QR Code dinâmico, copia e cola, e escuta o push do WebSocket para aprovação instantânea:

```tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Clock, ShieldCheck, CheckCircle2, Loader2, QrCode } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PixCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  totalPrice: number;
  qrCodeText: string;
  qrCodeBase64?: string;
  paymentId: string | number;
  onSuccess?: () => void;
}

export function PixCheckoutModal({
  isOpen,
  onClose,
  orderId,
  totalPrice,
  qrCodeText,
  qrCodeBase64,
  paymentId,
  onSuccess
}: PixCheckoutModalProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos
  const [isPaid, setIsPaid] = useState(false);

  const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPrice);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrCodeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSuccess = () => {
    if (isPaid) return;
    setIsPaid(true);
    if (onSuccess) onSuccess();
  };

  // 1. Supabase Realtime (WebSocket Push do servidor)
  useEffect(() => {
    if (!isOpen || !orderId || isPaid) return;

    const channel = supabase
      .channel(`order_status:${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      }, (payload) => {
        if (payload.new && payload.new.status === 'paid') {
          handleSuccess();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, orderId, isPaid]);

  // 2. Active Polling de Segurança (1s no banco e 2s na API do MP)
  useEffect(() => {
    if (!isOpen || !orderId || isPaid) return;

    let finished = false;

    const checkDb = async () => {
      if (finished) return;
      const { data } = await supabase.from('orders').select('status').eq('id', orderId).maybeSingle();
      if (data?.status === 'paid') {
        finished = true;
        handleSuccess();
      }
    };

    const checkGateway = async () => {
      if (finished || !paymentId) return;
      const { data } = await supabase.functions.invoke('check-mercado-pago-payment', {
        body: { payment_id: paymentId, order_id: orderId }
      });
      if (data?.status === 'approved') {
        finished = true;
        handleSuccess();
      }
    };

    const intervalDb = setInterval(checkDb, 1000);
    const intervalGateway = setInterval(checkGateway, 2000);

    return () => {
      clearInterval(intervalDb);
      clearInterval(intervalGateway);
    };
  }, [isOpen, orderId, paymentId, isPaid]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-[#111] text-white border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl"
        >
          <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10">
            <X className="w-4 h-4 text-white/50" />
          </button>

          {isPaid ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold mb-1">Pagamento Confirmado!</h3>
              <p className="text-sm text-white/60 mb-6">Recebemos a confirmação instantânea do seu Pix.</p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-emerald-500 text-black font-bold rounded-xl"
              >
                Concluir
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Pix Automático Oficial</span>
              </div>
              <h3 className="text-xl font-bold mb-1">Efetue o Pagamento</h3>
              <p className="text-sm text-white/60 mb-5">Valor: <strong className="text-white">{formattedPrice}</strong></p>

              {/* QR Code */}
              <div className="p-3 bg-white rounded-2xl mb-4">
                {qrCodeBase64 ? (
                  <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code Pix" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-black/50">
                    <QrCode className="w-12 h-12" />
                  </div>
                )}
              </div>

              {/* Botão Copia e Cola */}
              <button
                onClick={handleCopy}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm mb-4 flex items-center justify-center gap-2 ${
                  copied ? 'bg-emerald-500 text-black' : 'bg-white text-black hover:bg-white/90'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Código Pix Copiado!' : 'Copiar Código Pix (Copia e Cola)'}
              </button>

              <div className="flex items-center gap-2 text-xs text-white/40">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Aguardando transferência no app do banco...</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
```

---

## 6. Painel Administrativo: Gestão Completa de Pagamentos

No painel de controle administrativo, a equipe precisa:
1. Ver o status de cada transação.
2. Identificar a origem (**Mercado Pago Pix** vs **Manual**).
3. **Clicar em "Consultar MP"**: faz uma chamada ao vivo na API do Mercado Pago para sincronizar se o cliente alegar que já pagou.
4. **Abrir a Auditoria Técnica**: inspecionar detalhes (data de aprovação, motivo de recusa do cartão/pix, ID de transação).
5. **Marcar Manualmente como Pago**: caso o cliente transfira via chave Pix física ou dinheiro no balcão.

### 6.1 Linha de Pedido no Admin (`OrderRow.tsx`)

```tsx
import React, { useState } from 'react';
import { Loader2, CheckCircle2, Search, AlertCircle, Ban } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { MercadoPagoDetailsModal } from './MercadoPagoDetailsModal';

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  total_price: number;
  status: 'pending' | 'paid' | 'cancelled' | 'unconfirmed';
  payment_origin?: string;
  mp_payment_id?: string;
  created_at: string;
}

interface OrderRowProps {
  order: Order;
  onRefresh: () => void;
  onAlert: (title: string, message: string, variant: 'info' | 'danger') => void;
}

export function OrderRow({ order, onRefresh, onAlert }: OrderRowProps) {
  const [checkingMP, setCheckingMP] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [mpDetails, setMpDetails] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // 1. Consulta Ativa no Mercado Pago sob Demanda (Admin)
  const handleCheckMercadoPago = async () => {
    if (!order.mp_payment_id) {
      onAlert('Atenção', 'Este pedido não possui um ID de transação do Mercado Pago vinculado.', 'danger');
      return;
    }

    setCheckingMP(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-mercado-pago-payment', {
        body: { payment_id: order.mp_payment_id, order_id: order.id }
      });

      if (error || !data) throw error || new Error('Sem resposta da consulta.');

      if (data.status === 'approved') {
        onAlert('Pagamento Confirmado!', 'O pagamento foi confirmado pelo Mercado Pago e o pedido atualizado para PAGO.', 'info');
        onRefresh();
      } else {
        // Abre o modal com os detalhes detalhados (ex: pendente, rejeitado, cancelado)
        setMpDetails(data);
        setIsDetailsOpen(true);
      }
    } catch (err: any) {
      onAlert('Erro na Consulta', err.message || 'Falha ao consultar gateway.', 'danger');
    } finally {
      setCheckingMP(false);
    }
  };

  // 2. Confirmação Manual de Pagamento (Dinheiro / Pix Manual)
  const handleManualConfirm = async () => {
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updatedBy = user?.email || 'Admin';

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_origin: 'manual',
          status_updated_by: updatedBy,
          status_updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;
      onAlert('Sucesso', 'Pedido marcado como PAGO manualmente.', 'info');
      onRefresh();
    } catch (err: any) {
      onAlert('Erro', err.message, 'danger');
    } finally {
      setUpdating(false);
    }
  };

  // 3. Cancelamento Manual
  const handleCancelOrder = async () => {
    if (!window.confirm('Deseja realmente cancelar este pedido?')) return;
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          status_updated_by: user?.email || 'Admin',
          status_updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;
      onAlert('Cancelado', 'Pedido cancelado com sucesso.', 'info');
      onRefresh();
    } catch (err: any) {
      onAlert('Erro', err.message, 'danger');
    } finally {
      setUpdating(false);
    }
  };

  const statusBadge = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    paid: 'bg-green-500/10 text-green-500 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
    unconfirmed: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  }[order.status] || 'bg-white/5 text-white/50 border-white/10';

  return (
    <>
      <tr className="border-b border-white/5 hover:bg-white/[0.02] text-sm">
        {/* Identificação */}
        <td className="py-4 px-4 font-mono text-xs text-white/60">
          #{order.id.substring(0, 8)}
        </td>

        {/* Cliente */}
        <td className="py-4 px-4">
          <div className="font-semibold text-white">{order.customer_name}</div>
          <div className="text-xs text-white/40">{order.customer_email}</div>
        </td>

        {/* Valor */}
        <td className="py-4 px-4 font-semibold text-white">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_price)}
        </td>

        {/* Status */}
        <td className="py-4 px-4">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge}`}>
            {order.status.toUpperCase()}
          </span>
          <div className="text-[10px] text-white/40 mt-1 uppercase">
            Origem: {order.payment_origin || 'mercadopago'}
          </div>
        </td>

        {/* Ações Administrativas */}
        <td className="py-4 px-4 text-right space-x-2">
          {/* Botão Consultar MP se houver ID de pagamento */}
          {order.mp_payment_id && (
            <button
              onClick={handleCheckMercadoPago}
              disabled={checkingMP}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium transition-colors"
              title="Consultar status em tempo real no Mercado Pago"
            >
              {checkingMP ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Consultar MP
            </button>
          )}

          {/* Marcar como Pago Manualmente */}
          {order.status === 'pending' && (
            <button
              onClick={handleManualConfirm}
              disabled={updating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium transition-colors"
              title="Aprovar manualmente (Pix manual ou balcão)"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Aprovar
            </button>
          )}

          {/* Cancelar Pedido */}
          {order.status === 'pending' && (
            <button
              onClick={handleCancelOrder}
              disabled={updating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors"
              title="Cancelar pedido"
            >
              <Ban className="w-3.5 h-3.5" />
              Cancelar
            </button>
          )}
        </td>
      </tr>

      {/* Modal com detalhes técnicos retornado pela API do MP */}
      {isDetailsOpen && (
        <MercadoPagoDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          details={mpDetails}
          paymentId={order.mp_payment_id || ''}
        />
      )}
    </>
  );
}
```

---

### 6.2 Modal de Auditoria Técnica do Mercado Pago (`MercadoPagoDetailsModal.tsx`)

Renderiza todos os dados de depuração da API do gateway:

```tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, ShieldAlert, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface MercadoPagoDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: {
    status: string;
    status_detail?: string;
    payment_method_id?: string;
    date_created?: string;
    date_approved?: string;
    transaction_amount?: number;
  } | null;
  paymentId: string;
}

export function MercadoPagoDetailsModal({ isOpen, onClose, details, paymentId }: MercadoPagoDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !details) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mapStatus: Record<string, string> = {
    pending: 'Pendente (Aguardando pagamento no banco)',
    approved: 'Aprovado (Creditado com sucesso)',
    authorized: 'Autorizado (Sob análise)',
    in_process: 'Em análise de segurança',
    rejected: 'Rejeitado / Recusado',
    cancelled: 'Cancelado ou expirado',
    refunded: 'Reembolsado / Estornado'
  };

  const mapDetail: Record<string, string> = {
    accredited: 'O valor foi creditado instantaneamente na conta.',
    pending_waiting_payment: 'O código Pix foi gerado, mas o cliente ainda não pagou.',
    pending_contingency: 'Em análise preventiva de risco pelo Mercado Pago.',
    cc_rejected_insufficient_amount: 'Saldo ou limite insuficiente.',
    cc_rejected_high_risk: 'Recusado pelo sistema antifraude.'
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-[#16161a] border border-white/10 w-full max-w-lg rounded-3xl p-6 sm:p-8 text-white shadow-2xl"
        >
          <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10">
            <X className="w-4 h-4 text-white/50" />
          </button>

          <h3 className="text-xl font-bold mb-1">Auditoria Mercado Pago</h3>
          <p className="text-xs text-white/40 mb-6">Dados em tempo real extraídos via API oficial.</p>

          <div className="space-y-3 mb-6">
            {/* ID da Transação */}
            <div className="bg-white/5 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">ID Gateway (Payment ID)</p>
                <p className="font-mono text-sm font-semibold">{paymentId}</p>
              </div>
              <button onClick={handleCopy} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/60" />}
              </button>
            </div>

            {/* Status Oficial */}
            <div className="bg-white/5 p-4 rounded-2xl">
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-2">Status Oficial</p>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                  details.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                }`}>
                  {mapStatus[details.status] || details.status}
                </span>
                {details.status_detail && (
                  <span className="text-[11px] font-mono text-white/50 bg-black/40 px-2 py-0.5 rounded">
                    {details.status_detail}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/60 italic">
                {mapDetail[details.status_detail || ''] || details.status_detail || 'Sem observações adicionais.'}
              </p>
            </div>

            {/* Grid com Valores e Datas */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/5 p-3.5 rounded-2xl">
                <span className="text-white/40 block mb-1">Valor Registrado</span>
                <span className="text-base font-bold text-emerald-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(details.transaction_amount || 0)}
                </span>
              </div>
              <div className="bg-white/5 p-3.5 rounded-2xl">
                <span className="text-white/40 block mb-1">Método de Pagamento</span>
                <span className="text-base font-bold uppercase">{details.payment_method_id || 'Pix'}</span>
              </div>
              <div className="bg-white/5 p-3.5 rounded-2xl">
                <span className="text-white/40 block mb-1">Criado em</span>
                <span className="font-mono text-white/80">
                  {details.date_created ? new Date(details.date_created).toLocaleString('pt-BR') : 'N/A'}
                </span>
              </div>
              <div className="bg-white/5 p-3.5 rounded-2xl">
                <span className="text-white/40 block mb-1">Aprovado em</span>
                <span className="font-mono text-white/80">
                  {details.date_approved ? new Date(details.date_approved).toLocaleString('pt-BR') : 'Aguardando'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-colors"
          >
            Fechar Auditoria
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
```

---

## 7. Checklist de Implantação no Novo Projeto

- [ ] **1. Banco:** Executar o script da [Seção 2](#2-modelagem-de-dados-para-pagamentos-postgresql--supabase) no Supabase SQL Editor.
- [ ] **2. Credenciais:** Adicionar o `MP_ACCESS_TOKEN` nas secrets do Supabase via `supabase secrets set`.
- [ ] **3. Deploy das Functions:** Realizar deploy das 3 funções com `--no-verify-jwt`.
- [ ] **4. Webhook:** Cadastrar a URL da função `mercado-pago-webhook` no painel do Mercado Pago Developers (evento: `payment`).
- [ ] **5. Interface do Cliente:** Adicionar o modal `PixCheckoutModal.tsx` ao finalizar pedidos.
- [ ] **6. Painel Admin:** Incluir `OrderRow.tsx` e `MercadoPagoDetailsModal.tsx` na listagem de pedidos para permitir consulta ao vivo, auditoria e aprovação manual.
