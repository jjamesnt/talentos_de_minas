/**
 * Utilitário de Otimização e Compressão de Imagens no Cliente (Navegador)
 * Converte qualquer imagem enviada pelo usuário para WebP leve (max 400x400px para avatares),
 * garantindo carga ultra-rápida e eliminando qualquer uso de URLs externas.
 */

// Avatar vetorial padrão temático Wicked (Esmeralda com silhueta clássica de balé)
export const AVATAR_PADRAO_BAILARINO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="ozGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F3D2A" />
      <stop offset="100%" stop-color="#051911" />
    </linearGradient>
    <linearGradient id="goldGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00FF88" />
      <stop offset="100%" stop-color="#D4AF37" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#ozGrad)" />
  <circle cx="100" cy="100" r="88" stroke="url(#goldGlow)" stroke-width="2" fill="none" opacity="0.4" />
  <!-- Silhueta estilizada da bailarina / artista -->
  <g fill="url(#goldGlow)" opacity="0.85">
    <circle cx="100" cy="65" r="24" />
    <path d="M100 98 C72 98, 52 118, 52 144 L148 144 C148 118, 128 98, 100 98 Z" />
    <path d="M68 144 C68 162, 82 178, 100 178 C118 178, 132 162, 132 144 Z" opacity="0.5" />
  </g>
</svg>
`)}`;

/**
 * Redimensiona e comprime uma foto de bailarino para WebP com no máximo 400x400px.
 * Mantém peso médio entre 10KB e 30KB.
 */
export async function otimizarFotoBailarino(file: File, dimensao = 400, qualidade = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler arquivo da imagem.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Erro ao processar imagem.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensiona proporcionalmente mantendo alta nitidez
        if (width > height) {
          if (width > dimensao) {
            height = Math.round((height * dimensao) / width);
            width = dimensao;
          }
        } else {
          if (height > dimensao) {
            width = Math.round((width * dimensao) / height);
            height = dimensao;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas indisponível'));
          return;
        }

        // Configuração de interpolação de alta qualidade
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Exporta diretamente em formato WebP otimizado
        const webpDataUrl = canvas.toDataURL('image/webp', qualidade);
        resolve(webpDataUrl);
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

