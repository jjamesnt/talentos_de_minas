import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
    const { order_id, total_price, customer_name, customer_email, description } = await req.json()

    if (!order_id || !total_price) {
      return new Response(JSON.stringify({ error: 'order_id e total_price são obrigatórios' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      })
    }

    if (!MP_ACCESS_TOKEN) {
      throw new Error("MP_ACCESS_TOKEN não configurado nas variáveis de ambiente.")
    }

    const nameParts = (customer_name || "Apoiador").trim().split(/\s+/)
    const firstName = nameParts[0] || "Apoiador"
    const lastName = nameParts.slice(1).join(' ') || "Talentos de Minas"

    const notificationUrl = MP_WEBHOOK_URL || `${SUPABASE_URL}/functions/v1/mercado-pago-webhook`

    const payload = {
      transaction_amount: Number(total_price),
      description: description || `Talentos de Minas - Pedido #${String(order_id).substring(0, 8)}`,
      payment_method_id: "pix",
      payer: {
        email: customer_email || "contato@talentosdeminas.com.br",
        first_name: firstName,
        last_name: lastName
      },
      external_reference: String(order_id),
      notification_url: notificationUrl
    }

    // Chamada à API Oficial do Mercado Pago com Idempotência Estrita
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'X-Idempotency-Key': String(order_id)
      },
      body: JSON.stringify(payload)
    })

    const data = await mpResponse.json()

    if (!mpResponse.ok) {
      console.error('Erro na resposta do Mercado Pago:', data)
      throw new Error(data.message || JSON.stringify(data))
    }

    const transactionData = data.point_of_interaction?.transaction_data
    const qrCode = transactionData?.qr_code
    const qrCodeBase64 = transactionData?.qr_code_base64

    // Atualiza o pedido no banco de dados com os dados retornados pelo gateway
    await supabase.from('raffle_orders').update({ 
      mp_payment_id: String(data.id),
      codigo_pix: qrCode,
      qr_code_base64: qrCodeBase64,
      updated_at: new Date().toISOString() 
    }).eq('id', order_id)

    return new Response(JSON.stringify({ 
      success: true, 
      payment_id: data.id,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      order_id: order_id
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })

  } catch (err: any) {
    console.error('Erro no create-mercado-pago-payment:', err)
    return new Response(JSON.stringify({ error: err.message || 'Erro interno no servidor' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 500 
    })
  }
})
