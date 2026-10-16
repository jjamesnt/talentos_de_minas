import React, { useState, useRef } from 'react';
import { useCampanha } from '../../hooks/useCampanha';
import { useToast } from '../../hooks/useToast';
import { otimizarFotoPremio, obterTamanhoKB } from '../../utils/imageOptimizer';
import { ConfirmModal } from '../common/ConfirmModal';
import type { Premio } from '../../types';
import { 
  Gift, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  Plus, 
  X, 
  Trophy, 
  Loader2, 
  CheckCircle2
} from 'lucide-react';

export const AdminPremios: React.FC = () => {
  const { premios, adicionarPremio, editarPremio, excluirPremio, reordenarPremios } = useCampanha();
  const { showToast } = useToast();

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [posicao, setPosicao] = useState<number>(premios.length + 1);
  const [titulo, setTitulo] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [destaque, setDestaque] = useState(false);

  const [isOtimizando, setIsOtimizando] = useState(false);
  const [isSalvando, setIsSalvando] = useState(false);
  const [premioParaExcluir, setPremioParaExcluir] = useState<Premio | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Manipula upload com compressão e conversão no cliente para WebP
  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({
        type: 'warning',
        title: 'Formato Inválido',
        message: 'Por favor, selecione um arquivo de imagem (PNG, JPG, WEBP).',
      });
      return;
    }

    try {
      setIsOtimizando(true);
      // Converte e redimensiona para WebP no canvas do navegador (max 800px)
      const webpDataUrl = await otimizarFotoPremio(file, 800, 0.85);
      const kb = obterTamanhoKB(webpDataUrl);
      setFotoUrl(webpDataUrl);
      showToast({
        type: 'success',
        title: 'Foto Otimizada!',
        message: `Imagem convertida para WebP ultraleve (~${kb} KB) sem links externos.`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro na Otimização',
        message: err?.message || 'Não foi possível processar a foto.',
      });
    } finally {
      setIsOtimizando(false);
    }
  };

  const handleRemoverFoto = () => {
    setFotoUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleIniciarEdicao = (p: Premio) => {
    setEditandoId(p.id || null);
    setPosicao(p.posicao);
    setTitulo(p.titulo);
    setSubtitulo(p.subtitulo || '');
    setFotoUrl(p.fotoUrl || '');
    setDestaque(p.destaque ?? false);

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelarEdicao = () => {
    setEditandoId(null);
    setPosicao(premios.length + 1);
    setTitulo('');
    setSubtitulo('');
    setFotoUrl('');
    setDestaque(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim()) {
      showToast({
        type: 'warning',
        title: 'Campo Obrigatório',
        message: 'Informe o título do prêmio.',
      });
      return;
    }

    if (!posicao || posicao <= 0) {
      showToast({
        type: 'warning',
        title: 'Posição Inválida',
        message: 'A posição do prêmio deve ser um número maior que zero (1, 2, 3...).',
      });
      return;
    }

    try {
      setIsSalvando(true);

      if (editandoId) {
        await editarPremio(editandoId, {
          posicao: Number(posicao),
          titulo: titulo.trim(),
          subtitulo: subtitulo.trim(),
          fotoUrl: fotoUrl.trim() || undefined,
          destaque,
        });

        showToast({
          type: 'success',
          title: 'Prêmio Atualizado',
          message: `As alterações no ${posicao}º Prêmio foram salvas com sucesso.`,
        });
      } else {
        await adicionarPremio({
          posicao: Number(posicao),
          titulo: titulo.trim(),
          subtitulo: subtitulo.trim(),
          fotoUrl: fotoUrl.trim() || undefined,
          destaque,
        });

        showToast({
          type: 'success',
          title: 'Prêmio Cadastrado',
          message: `${titulo} adicionado como ${posicao}º prêmio da vitrine.`,
        });
      }

      handleCancelarEdicao();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao Salvar',
        message: err?.message || 'Falha ao salvar prêmio no banco de dados.',
      });
    } finally {
      setIsSalvando(false);
    }
  };

  const handleConfirmarExclusao = async () => {
    if (!premioParaExcluir?.id) return;
    try {
      await excluirPremio(premioParaExcluir.id);
      showToast({
        type: 'success',
        title: 'Prêmio Removido',
        message: `O prêmio "${premioParaExcluir.titulo}" foi removido da vitrine.`,
      });
      if (editandoId === premioParaExcluir.id) {
        handleCancelarEdicao();
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao Excluir',
        message: err?.message || 'Não foi possível excluir o prêmio.',
      });
    } finally {
      setPremioParaExcluir(null);
    }
  };

  const handleMoverPosicao = async (index: number, direcao: 'cima' | 'baixo') => {
    const novoIndex = direcao === 'cima' ? index - 1 : index + 1;
    if (novoIndex < 0 || novoIndex >= premios.length) return;

    const lista = [...premios];
    const itemMovido = lista[index];
    lista[index] = lista[novoIndex];
    lista[novoIndex] = itemMovido;

    try {
      await reordenarPremios(lista);
      showToast({
        type: 'info',
        title: 'Ordem Atualizada',
        message: 'A ordem dos prêmios foi sincronizada na vitrine pública.',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao Reordenar',
        message: err?.message || 'Não foi possível salvar a nova ordem.',
      });
    }
  };

  const premiosComFoto = premios.filter((p) => Boolean(p.fotoUrl)).length;
  const premioPrincipal = premios.find((p) => p.posicao === 1);

  return (
    <div className="space-y-8">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20">
              <Gift className="w-4 h-4" />
            </span>
            <h2 className="font-cinzel text-lg sm:text-xl font-bold text-white tracking-wide">
              Vitrine de Prêmios Oficiais
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Cadastre os prêmios com detalhes e fotos otimizadas (WebP leve). Todos os dados e posições são atualizados em tempo real no site público.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            handleCancelarEdicao();
            if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00FF88] hover:bg-[#33ff9f] text-black text-xs font-bold font-cinzel uppercase tracking-wider glow-oz transition-all cursor-pointer shadow-lg shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Prêmio</span>
        </button>
      </div>

      {/* Cards de Métricas da Vitrine */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Total de Prêmios</span>
            <Gift className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <p className="text-2xl font-cinzel font-bold text-white">{premios.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Exibidos na vitrine da campanha</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Fotos Otimizadas</span>
            <ImageIcon className="w-4 h-4 text-[#00FF88]" />
          </div>
          <p className="text-2xl font-cinzel font-bold text-[#00FF88]">
            {premiosComFoto} <span className="text-xs font-sans text-slate-400">/ {premios.length}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Convertidas para WebP ultra-rápido</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">1º Prêmio Oficial</span>
            <Trophy className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <p className="text-base font-cinzel font-bold text-white truncate">
            {premioPrincipal?.titulo || 'Não cadastrado'}
          </p>
          <p className="text-[11px] text-[#D4AF37] mt-1">Prêmio de maior destaque da campanha</p>
        </div>
      </div>

      {/* Formulário de Cadastro / Edição */}
      <div
        ref={formRef}
        className={`rounded-3xl p-5 sm:p-6 border transition-all duration-300 ${
          editandoId
            ? 'bg-[#0F1D15] border-[#00FF88]/40 shadow-xl shadow-[#00FF88]/5 ring-1 ring-[#00FF88]/20'
            : 'bg-[#0F1412] border-white/10'
        }`}
      >
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            {editandoId ? (
              <Edit3 className="w-4 h-4 text-[#00FF88]" />
            ) : (
              <Plus className="w-4 h-4 text-[#00FF88]" />
            )}
            <h3 className="font-cinzel text-sm sm:text-base font-bold text-white">
              {editandoId ? `Editando ${posicao}º Prêmio` : 'Cadastrar Novo Prêmio'}
            </h3>
          </div>

          {editandoId && (
            <button
              type="button"
              onClick={handleCancelarEdicao}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancelar Edição</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSalvar} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Posição do Prêmio */}
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Posição do Sorteio <span className="text-[#00FF88]">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={posicao}
                  onChange={(e) => setPosicao(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-mono font-bold focus:outline-none focus:border-[#00FF88]"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-[#D4AF37] font-bold">
                  º Prêmio
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Ex: 1 para 1º Prêmio, 2 para 2º...</p>
            </div>

            {/* Título do Prêmio */}
            <div className="sm:col-span-9">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Título do Prêmio <span className="text-[#00FF88]">*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={'Ex: Smart TV 50" 4K / Pulseira Rommanel / Airfryer'}
                className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-medium focus:outline-none focus:border-[#00FF88]"
                required
              />
            </div>
          </div>

          {/* Subtítulo / Detalhes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Detalhes / Descrição Curta
            </label>
            <input
              type="text"
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
              placeholder="Ex: Imagem ultra HD e tecnologia cinema em casa / Joia folheada com acabamento nobre exclusivo"
              className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-[#00FF88]"
            />
          </div>

          {/* Upload de Foto com Algoritmo de Otimização */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Foto do Prêmio (Upload Direto Otimizado)</span>
              <span className="text-[10px] text-[#00FF88] font-normal flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Conversão Automática para WebP no Navegador</span>
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              {/* Dropzone / Botão de Seleção */}
              <div className="sm:col-span-8">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/jpg"
                  onChange={handleUploadFoto}
                  className="hidden"
                  id="upload-foto-premio"
                />

                <label
                  htmlFor="upload-foto-premio"
                  className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isOtimizando
                      ? 'border-[#00FF88] bg-[#00FF88]/5 opacity-70'
                      : 'border-white/15 hover:border-[#00FF88]/50 bg-black/30 hover:bg-black/50'
                  }`}
                >
                  {isOtimizando ? (
                    <div className="py-2 flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 text-[#00FF88] animate-spin" />
                      <p className="text-xs text-[#00FF88] font-semibold">
                        Otimizando imagem para WebP...
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 text-[#00FF88] flex items-center justify-center mb-2">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-white">
                        Clique para selecionar uma foto do seu computador ou celular
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        PNG, JPG ou WEBP • Redimensionado e comprimido instantaneamente
                      </p>
                    </>
                  )}
                </label>
              </div>

              {/* Preview da Imagem Otimizada */}
              <div className="sm:col-span-4">
                {fotoUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-[#00FF88]/40 bg-black/60 group">
                    <img
                      src={fotoUrl}
                      alt="Prévia do Prêmio"
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/80 backdrop-blur-md text-black text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>WebP ~{obterTamanhoKB(fotoUrl)} KB</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoverFoto}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                      title="Remover foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="absolute bottom-2 left-2 right-2 text-left">
                      <p className="text-[11px] font-bold text-white truncate">
                        {titulo || 'Sem título'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-32 rounded-2xl border border-white/10 bg-black/20 flex flex-col items-center justify-center text-slate-500 text-xs text-center p-3">
                    <ImageIcon className="w-7 h-7 mb-1 text-slate-600" />
                    <span>Nenhuma foto anexada</span>
                    <span className="text-[10px] text-slate-600 mt-0.5">
                      (Exibirá ícone padrão temático)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Destaque Visual */}
          <div className="pt-1 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={destaque}
                onChange={(e) => setDestaque(e.target.checked)}
                className="w-4 h-4 rounded text-[#00FF88] focus:ring-[#00FF88] bg-black/60 border-white/20"
              />
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00FF88]" />
                <span>Destacar este prêmio com moldura esmeralda e iluminação especial</span>
              </span>
            </label>
          </div>

          {/* Botões do Formulário */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            {editandoId && (
              <button
                type="button"
                onClick={handleCancelarEdicao}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={isSalvando || isOtimizando}
              className="px-6 py-2.5 rounded-xl bg-[#00FF88] hover:bg-[#33ff9f] text-black text-xs font-bold font-cinzel uppercase tracking-wider glow-oz transition-all cursor-pointer shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {isSalvando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editandoId ? 'Salvar Alterações' : 'Cadastrar Prêmio'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Relação dos Prêmios Cadastrados */}
      <div className="rounded-3xl bg-[#0F1412] border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
              <span>Lista de Prêmios Ativos</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#00FF88]/15 text-[#00FF88] border border-[#00FF88]/30">
                {premios.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Você pode alterar a posição de cada prêmio usando os botões de subir/descer ou editando diretamente.
            </p>
          </div>
        </div>

        {premios.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Nenhum prêmio cadastrado. Utilize o formulário acima para adicionar o primeiro prêmio.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {premios.map((premio, index) => {
              const isPrimeiro = index === 0;
              const isUltimo = index === premios.length - 1;

              return (
                <div
                  key={premio.id || premio.posicao}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    editandoId === premio.id
                      ? 'bg-[#00FF88]/5 border-l-4 border-l-[#00FF88]'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Foto e Informações */}
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Thumbnail */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-black/60 border border-white/10 shrink-0 flex items-center justify-center">
                      {premio.fotoUrl ? (
                        <img
                          src={premio.fotoUrl}
                          alt={premio.titulo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="p-2 rounded-xl bg-white/5 text-[#00FF88]">
                          <Trophy className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Textos e Badges */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-white/10 text-[#D4AF37] border border-[#D4AF37]/30">
                          {premio.posicao}º Prêmio
                        </span>

                        {premio.destaque && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#00FF88]/15 text-[#00FF88] border border-[#00FF88]/30 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Destaque</span>
                          </span>
                        )}

                        {premio.fotoUrl && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10">
                            WebP ~{obterTamanhoKB(premio.fotoUrl)} KB
                          </span>
                        )}
                      </div>

                      <h4 className="font-cinzel text-sm sm:text-base font-bold text-white truncate">
                        {premio.titulo}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {premio.subtitulo || 'Sem detalhes informados'}
                      </p>
                    </div>
                  </div>

                  {/* Ações: Reordenar, Editar, Excluir */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {/* Botões de Mover Posição */}
                    <div className="flex items-center rounded-xl bg-black/40 border border-white/10 p-1">
                      <button
                        type="button"
                        disabled={isPrimeiro}
                        onClick={() => handleMoverPosicao(index, 'cima')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        title="Subir posição (aproximar do 1º lugar)"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isUltimo}
                        onClick={() => handleMoverPosicao(index, 'baixo')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        title="Descer posição"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Editar */}
                    <button
                      type="button"
                      onClick={() => handleIniciarEdicao(premio)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                      title="Editar detalhes e foto"
                    >
                      <Edit3 className="w-4 h-4 text-[#00FF88]" />
                    </button>

                    {/* Excluir */}
                    <button
                      type="button"
                      onClick={() => setPremioParaExcluir(premio)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                      title="Excluir prêmio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {premioParaExcluir && (
        <ConfirmModal
          isOpen={!!premioParaExcluir}
          onClose={() => setPremioParaExcluir(null)}
          onConfirm={handleConfirmarExclusao}
          title="Excluir Prêmio"
          message={`Tem certeza que deseja remover "${premioParaExcluir.titulo}" (${premioParaExcluir.posicao}º Prêmio) da vitrine oficial da campanha?`}
          confirmLabel="Sim, Excluir Prêmio"
          cancelLabel="Cancelar"
          isDestructive={true}
        />
      )}
    </div>
  );
};
