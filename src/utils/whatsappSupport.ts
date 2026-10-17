export const WHATSAPP_SUPORTE_NUMERO = '5531984211906';
export const WHATSAPP_SUPORTE_FORMATADO = '(31) 98421-1906';

/**
 * Gera a URL oficial de atendimento via WhatsApp
 * Mensagem padrão requerida: "Necessito suporte para compra no site e o nome de quem pede"
 */
export function gerarLinkSuporteWhatsApp(nome?: string): string {
  const nomeLimpo = nome ? nome.trim() : '';
  const mensagem = nomeLimpo
    ? `Olá! Necessito suporte para compra no site. Meu nome é ${nomeLimpo}.`
    : 'Olá! Necessito suporte para compra no site. Meu nome é: ';

  return `https://api.whatsapp.com/send?phone=${WHATSAPP_SUPORTE_NUMERO}&text=${encodeURIComponent(mensagem)}`;
}
