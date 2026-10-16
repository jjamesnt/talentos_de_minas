import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '')

serve(async (req) => {
  // Liveness check
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'alive', service: 'mercado-pago-webhook' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const rawBody = await req.text()
    let body: any = {}
    if (rawBody) {
      try { body = JSON.parse(rawBody) } catch (_) {}
    }

    // Mercado Pago pode enviar dados via query params ou body JSON
    const topic = body.topic || url.searchParams.get('topic') || body.type || url.searchParams.get('type')
    const paymentId = body.resource 
      ? body.resource.split('/').pop() 
      : (body.data?.id || url.searchParams.get('data.id') || body.id)

    // Se o evento não for de pagamento ou não tiver ID, respondemos 200 para liberar o gateway
    if (topic !== 'payment' || !paymentId) {
      return new Response(JSON.stringify({ message: 'Evento ignorado (não é payment)', topic, paymentId }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      })
    }

    if (!MP_ACCESS_TOKEN) {
      console.error('MP_ACCESS_TOKEN ausente nas variáveis de ambiente')
      return new Response(JSON.stringify({ error: 'Configuração incompleta' }), { 
        headers: corsHeaders, 
        status: 500 
      })
    }

    // 1. Validação Ativa na API do Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
    })

    if (!mpRes.ok) {
      const errText = await mpRes.text()
      console.error(`Falha ao consultar pagamento ${paymentId} no Mercado Pago:`, errText)
      return new Response(JSON.stringify({ error: 'Erro ao validar com Mercado Pago' }), { 
        headers: corsHeaders, 
        status: 500 
      })
    }

    const paymentInfo = await mpRes.json()
    console.log(`Pagamento MP ${paymentId} consultado com status: ${paymentInfo.status}`)

    // Se ainda não estiver aprovado, apenas respondemos 200 para aguardar o próximo aviso
    if (paymentInfo.status !== 'approved') {
      return new Response(JSON.stringify({ 
        success: true, 
        status: paymentInfo.status, 
        message: 'Status intermediário registrado' 
      }), { 
        headers: corsHeaders, 
        status: 200 
      })
    }

    // 2. Extração da Chave do Pedido (external_reference)
    const orderId = paymentInfo.external_reference
    if (!orderId) {
      console.warn(`Pagamento ${paymentId} aprovado mas sem external_reference`)
      return new Response(JSON.stringify({ warning: 'Sem external_reference' }), { 
        headers: corsHeaders, 
        status: 200 
      })
    }

    // 3. Busca no banco de dados
    const { data: order, error: orderErr } = await supabase
      .from('raffle_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr) {
      console.error(`Erro ao consultar pedido ${orderId}:`, orderErr)
      return new Response(JSON.stringify({ error: 'Erro de banco de dados' }), { 
        headers: corsHeaders, 
        status: 500 
      })
    }

    if (order) {
      // 4. Idempotência Estrita: Se já estiver marcado como pago, não reprocessa
      if (order.status === 'paid') {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Pedido já confirmado anteriormente (Idempotente)' 
        }), { 
          headers: corsHeaders, 
          status: 200 
        })
      }

      // 5. Atualização atômica do status para 'paid'
      const { error: updateErr } = await supabase
        .from('raffle_orders')
        .update({ 
          status: 'paid', 
          payment_origin: 'mercadopago', 
          payment_method: 'pix',
          mp_payment_id: String(paymentId), 
          status_updated_by: 'webhook_mercadopago',
          status_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId)

      if (updateErr) {
        console.error(`Erro ao atualizar pedido ${orderId} para paid:`, updateErr)
        return new Response(JSON.stringify({ error: 'Falha ao atualizar status do pedido' }), { 
          headers: corsHeaders, 
          status: 500 
        })
      }

      console.log(`Pedido ${orderId} atualizado para 'paid' com sucesso via Webhook!`)

      // 6. Disparo assíncrono do recibo por e-mail via Brevo
      try {
        fetch(`${SUPABASE_URL}/functions/v1/send-receipt-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ order_id: orderId })
        }).catch((e) => console.error('Falha ao acionar envio de recibo Brevo:', e));
      } catch (errEmail) {
        console.error('Exceção ao disparar e-mail no webhook:', errEmail);
      }
    } else {
      // Verifica se o pedido pertence à loja
      const { data: lojaOrder } = await supabase
        .from('loja_orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle()

      if (lojaOrder) {
        if (lojaOrder.status !== 'paid') {
          await supabase
            .from('loja_orders')
            .update({ 
              status: 'paid', 
              payment_origin: 'mercadopago', 
              payment_method: 'pix',
              mp_payment_id: String(paymentId), 
              status_updated_by: 'webhook_mercadopago',
              status_updated_at: new Date().toISOString(),
              updated_at: new Date().toISOString() 
            })
            .eq('id', orderId)
          console.log(`Pedido da Loja ${orderId} aprovado com sucesso via webhook!`)
        }
      } else {
        console.warn(`Pedido ${orderId} não encontrado em raffle_orders nem loja_orders`)
      }
    }

    return new Response(JSON.stringify({ success: true, order_id: orderId, status: 'paid' }), { 
      headers: corsHeaders, 
      status: 200 
    })

  } catch (err: any) {
    console.error('Exceção no webhook do Mercado Pago:', err)
    return new Response(JSON.stringify({ error: err.message }), { 
      headers: corsHeaders, 
      status: 500 
    })
  }
})
