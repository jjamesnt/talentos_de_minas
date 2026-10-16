import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
const BREVO_SENDER_EMAIL = Deno.env.get('BREVO_SENDER_EMAIL') || 'contato@talentosdeminas.com.br'
const BREVO_SENDER_NAME = Deno.env.get('BREVO_SENDER_NAME') || 'Talentos de Minas - Campanha Wicked 2026'

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { order_id } = await req.json()

    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id é obrigatório' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // 1. Busca os dados do pedido no Supabase
    const { data: order, error: orderErr } = await supabase
      .from('raffle_orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Pedido não encontrado no banco' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      })
    }

    if (!order.customer_email) {
      return new Response(JSON.stringify({ error: 'Pedido sem e-mail de destinatário cadastrado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // 2. Validação da chave Brevo
    if (!BREVO_API_KEY) {
      const msg = 'Chave BREVO_API_KEY não configurada nos secrets do Supabase.'
      console.warn(msg)
      await supabase.from('raffle_orders').update({
        email_status: 'pending_configuration',
        email_error: msg
      }).eq('id', order_id)

      return new Response(JSON.stringify({ 
        success: false, 
        error: msg,
        hint: 'Configure o secret BREVO_API_KEY no painel do Supabase em Project Settings > Edge Functions.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const numerosList = Array.isArray(order.selected_numbers) 
      ? order.selected_numbers.map((n: number) => `#${n}`).join(', ') 
      : 'Cotas confirmadas'

    const valorFormatado = Number(order.total_price || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })

    const dataFormatada = new Date(order.created_at || Date.now()).toLocaleString('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short'
    })

    // 3. Monta o e-mail em HTML responsivo e elegante
    const htmlEmail = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comprovante Oficial - Talentos de Minas</title>
</head>
<body style="margin: 0; padding: 0; background-color: #07090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #07090e; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0d121f; border-radius: 20px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Topo Temático Wicked -->
          <tr>
            <td style="padding: 35px 30px 20px 30px; text-align: center; background: linear-gradient(180deg, rgba(0,255,136,0.1) 0%, rgba(13,18,31,0) 100%);">
              <span style="font-size: 11px; font-weight: 700; color: #00FF88; letter-spacing: 2px; text-transform: uppercase; background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.25); padding: 5px 14px; rounded-full: 9999px; border-radius: 20px; display: inline-block;">
                Comprovante Oficial de Participação
              </span>
              <h1 style="margin: 15px 0 5px 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                Talentos de Minas
              </h1>
              <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                Campanha Cultural • Espetáculo Wicked 2026
              </p>
            </td>
          </tr>

          <!-- Mensagem de Boas-Vindas -->
          <tr>
            <td style="padding: 10px 30px 20px 30px;">
              <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin: 0 0 15px 0;">
                Olá, <strong style="color: #ffffff;">${order.customer_name}</strong>!
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0;">
                Recebemos a confirmação do seu pagamento Pix via <strong style="color: #ffffff;">Mercado Pago</strong>. Suas cotas foram registradas com sucesso e você já está oficialmente concorrendo!
              </p>
            </td>
          </tr>

          <!-- Caixa dos Números da Sorte -->
          <tr>
            <td style="padding: 0 30px 25px 30px;">
              <div style="background-color: #060911; border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 16px; padding: 22px; text-align: center;">
                <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 700; display: block; margin-bottom: 8px;">
                  Seus Números da Sorte
                </span>
                <p style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 28px; font-weight: 800; color: #00FF88; letter-spacing: 1px;">
                  ${numerosList}
                </p>
              </div>
            </td>
          </tr>

          <!-- Resumo da Transação -->
          <tr>
            <td style="padding: 0 30px 25px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #111827; border-radius: 14px; padding: 15px 20px; font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Valor Total Pago:</td>
                  <td style="padding: 6px 0; color: #ffffff; font-weight: 700; text-align: right;">${valorFormatado}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Método de Pagamento:</td>
                  <td style="padding: 6px 0; color: #00FF88; font-weight: 600; text-align: right;">Pix Instantâneo</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Código do Pedido:</td>
                  <td style="padding: 6px 0; color: #cbd5e1; font-family: monospace; text-align: right;">#${order.id.slice(0, 8)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Data de Confirmação:</td>
                  <td style="padding: 6px 0; color: #cbd5e1; text-align: right;">${dataFormatada}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Rodapé com Informações de Segurança -->
          <tr>
            <td style="padding: 20px 30px 30px 30px; border-top: 1px solid #1e293b; text-align: center;">
              <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 10px 0;">
                Este e-mail é o seu comprovante legal de aquisição de cotas para a campanha beneficente Wicked 2026.
              </p>
              <p style="font-size: 11px; color: #475569; margin: 0;">
                Talentos de Minas • Centro de Dança e Artes Cênicas • Belo Horizonte / MG
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    // 4. Chamada oficial à API REST do Brevo
    const brevoPayload = {
      sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
      to: [{ email: order.customer_email, name: order.customer_name }],
      subject: `Comprovante Oficial - Suas Cotas na Campanha Wicked 2026 (${numerosList})`,
      htmlContent: htmlEmail
    }

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(brevoPayload)
    })

    const brevoData = await brevoResponse.json().catch(() => ({}))

    if (!brevoResponse.ok) {
      const errDetail = JSON.stringify(brevoData)
      console.error(`Erro ao enviar e-mail via Brevo para ${order.customer_email}:`, errDetail)

      await supabase.from('raffle_orders').update({
        email_sent: false,
        email_status: 'failed',
        email_error: errDetail,
        updated_at: new Date().toISOString()
      }).eq('id', order_id)

      return new Response(JSON.stringify({ 
        success: false, 
        error: `Falha na API Brevo: ${brevoData.message || errDetail}` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // 5. Sucesso: atualiza o status do pedido no Supabase
    await supabase.from('raffle_orders').update({
      email_sent: true,
      email_sent_at: new Date().toISOString(),
      email_status: 'sent',
      email_error: null,
      updated_at: new Date().toISOString()
    }).eq('id', order_id)

    console.log(`Recibo Brevo enviado com sucesso para ${order.customer_email}! Message ID: ${brevoData.messageId || 'ok'}`)

    return new Response(JSON.stringify({ 
      success: true, 
      message_id: brevoData.messageId, 
      recipient: order.customer_email 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err: any) {
    console.error('Exceção ao disparar e-mail:', err)
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
