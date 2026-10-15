import React, { useState, useRef } from 'react';
import { useCampanha } from '../../hooks/useCampanha';
import { useToast } from '../../hooks/useToast';
import { ConfirmModal } from '../common/ConfirmModal';
import { UserPlus, Edit2, CheckCircle2, XCircle, Upload, Image, Trash2, Camera, Loader2, Sparkles } from 'lucide-react';
import type { Bailarino } from '../../types';
import { otimizarFotoBailarino, AVATAR_PADRAO_BAILARINO } from '../../utils/imageOptimizer';

export const AdminBailarinos: React.FC = () => {
  const { bailarinos, adicionarBailarino, editarBailarino } = useCampanha();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const [nome, setNome] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [meta, setMeta] = useState('100');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [isOtimizando, setIsOtimizando] = useState(false);

  // Modal de confirmação para inativar/ativar
  const [bailarinoStatusToggle, setBailarinoStatusToggle] = useState<Bailarino | null>(null);

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({
        type: 'warning',
        title: 'Formato Inválido',
        message: 'Por favor, selecione um arquivo de imagem.',
      });
      return;
    }

    try {
      setIsOtimizando(true);
      // Converte e comprime para WebP ultraleve (max 400x400) no próprio navegador
      const webpDataUrl = await otimizarFotoBailarino(file, 400, 0.82);
      setFotoUrl(webpDataUrl);
      showToast({
        type: 'success',
        title: 'Foto Otimizada',
        message: 'Imagem convertida para WebP ultraleve com sucesso.',
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Erro na Otimização',
        message: 'Não foi possível processar a imagem.',
      });
    } finally {
      setIsOtimizando(false);
    }
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      showToast({ type: 'warning', title: 'Campo Obrigatório', message: 'Informe o nome do bailarino.' });
      return;
    }

    const metaNum = parseInt(meta, 10) || 100;
    const fotoFinal = fotoUrl.trim() || AVATAR_PADRAO_BAILARINO;

    if (editandoId) {
      editarBailarino(editandoId, { nome, fotoUrl: fotoFinal, meta: metaNum });
      showToast({ type: 'success', title: 'Perfil Atualizado', message: `Dados e foto de ${nome} salvos com sucesso.` });
      setEditandoId(null);
    } else {
      adicionarBailarino({ nome, fotoUrl: fotoFinal, meta: metaNum });
      showToast({ type: 'success', title: 'Bailarino Cadastrado', message: `${nome} adicionado(a) à campanha.` });
    }

    setNome('');
    setFotoUrl('');
    setMeta('100');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const iniciarEdicao = (b: Bailarino) => {
    setEditandoId(b.id);
    setNome(b.nome);
    setFotoUrl(b.fotoUrl);
    setMeta(b.meta.toString());

    // Rola suavemente até o formulário de edição
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNome('');
    setFotoUrl('');
    setMeta('100');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-8">
      {/* Formulário de Cadastro / Edição Completo */}
      <div
        ref={formRef}
        className={`p-5 sm:p-6 rounded-2xl border transition-all duration-300 ${
          editandoId
            ? 'bg-[#0F3D2A]/30 border-[#00FF88]/60 shadow-2xl ring-1 ring-[#00FF88]/40'
            : 'glass-card border-white/10'
        }`}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${editandoId ? 'bg-[#00FF88] text-black' : 'bg-white/5 text-[#00FF88]'}`}>
              {editandoId ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-cinzel text-base sm:text-lg font-bold text-white">
                {editandoId ? `Editando Perfil de ${nome || 'Bailarino'}` : 'Cadastrar Novo Bailarino'}
              </h3>
              <p className="text-xs text-slate-400">
                {editandoId ? 'Altere a foto, o nome ou a meta individual do participante.' : 'A lista é dinâmica e pode ser gerenciada a qualquer momento.'}
              </p>
            </div>
          </div>

          {editandoId && (
            <span className="hidden sm:inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 animate-pulse">
              Modo Edição Ativo
            </span>
          )}
        </div>

        <form onSubmit={handleSalvar} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bloco 1: Gestão Visual da Foto / Avatar com Upload Otimizado */}
            <div className="flex flex-col items-center sm:items-start gap-3 p-4 rounded-xl bg-black/40 border border-white/10">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#00FF88]" />
                <span>Foto de Perfil do Artista</span>
              </label>

              {/* Preview da Foto */}
              <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-white/20 bg-slate-800 shadow-lg">
                {isOtimizando ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-black/80 text-[#00FF88] gap-1.5 p-2 text-center">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-[10px] font-semibold">Otimizando...</span>
                  </div>
                ) : fotoUrl ? (
                  <img src={fotoUrl} alt="Prévia" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-1 p-2 text-center">
                    <Image className="w-6 h-6" />
                    <span className="text-[10px]">Sem foto</span>
                  </div>
                )}

                {/* Overlay rápido para troca ao passar o mouse */}
                {!isOtimizando && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] gap-1 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-[#00FF88]" />
                    <span>Trocar</span>
                  </button>
                )}
              </div>

              {/* Ações de Upload do Dispositivo com Otimização Automática */}
              <div className="w-full flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFotoUpload}
                  disabled={isOtimizando}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isOtimizando}
                  className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px] disabled:opacity-50"
                >
                  {isOtimizando ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00FF88]" />
                      <span>Comprimindo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-[#00FF88]" />
                      <span>Carregar do Dispositivo</span>
                    </>
                  )}
                </button>

                {fotoUrl && !isOtimizando && (
                  <button
                    type="button"
                    onClick={() => {
                      setFotoUrl('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="w-full py-1.5 text-[11px] text-rose-400 hover:text-rose-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remover foto</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bloco 2: Dados Cadastrais */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome Completo do Bailarino *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo do bailarino"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88]"
                />
              </div>

              {/* Informação do Padrão de Imagens Otimizadas */}
              <div className="p-3 rounded-xl bg-[#0F3D2A]/30 border border-[#00FF88]/30 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#00FF88] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-[#00FF88]">Padrão de Otimização Ativo</p>
                  <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    Fotos de perfil são convertidas localmente em formato WebP ultraleve (máx. 400x400px), sem uso de URLs externas.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Meta Individual (cotas)</label>
                <input
                  type="number"
                  min="1"
                  value={meta}
                  onChange={(e) => setMeta(e.target.value)}
                  className="w-full sm:w-48 px-4 py-2.5 rounded-xl text-sm bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#00FF88]"
                />
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-white/10">
            {editandoId && (
              <button
                type="button"
                onClick={cancelarEdicao}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar Edição
              </button>
            )}
            <button
              type="submit"
              className="w-full sm:w-auto px-7 py-3 rounded-xl font-cinzel text-xs font-bold text-black bg-[#00FF88] hover:bg-[#33ff9f] glow-oz transition-all cursor-pointer min-h-[44px]"
            >
              {editandoId ? 'Salvar Alterações do Bailarino' : 'Cadastrar na Campanha'}
            </button>
          </div>
        </form>
      </div>

      {/* Tabela de Bailarinos Cadastrados com Ações Completas */}
      <div className="rounded-2xl glass-card border border-white/10 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="font-semibold text-white text-sm">Bailarinos Cadastrados ({bailarinos.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-black/40 text-slate-400 uppercase tracking-wider text-[11px] border-b border-white/5">
              <tr>
                <th className="px-4 sm:px-6 py-3">Bailarino</th>
                <th className="px-4 sm:px-6 py-3">Meta</th>
                <th className="px-4 sm:px-6 py-3">Vendas</th>
                <th className="px-4 sm:px-6 py-3">Status</th>
                <th className="px-4 sm:px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bailarinos.length > 0 ? (
                bailarinos.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 sm:px-6 py-3.5 flex items-center gap-3">
                      <img src={b.fotoUrl} alt={b.nome} className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-sm" />
                      <div>
                        <span className="font-medium text-white block">{b.nome}</span>
                        <span className="text-[10px] text-slate-400 sm:hidden">{b.meta} cotas</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 hidden sm:table-cell">{b.meta} cotas</td>
                    <td className="px-4 sm:px-6 py-3.5 font-bold text-[#00FF88]">{b.totalVendido} cotas</td>
                    <td className="px-4 sm:px-6 py-3.5">
                      <button
                        onClick={() => setBailarinoStatusToggle(b)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                          b.ativo
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {b.ativo ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {b.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-right">
                      <button
                        onClick={() => iniciarEdicao(b)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-[#00FF88]/20 text-slate-300 hover:text-[#00FF88] border border-white/10 transition-colors cursor-pointer"
                        title="Editar dados e foto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-slate-400 italic">
                    Nenhum bailarino cadastrado ainda. Use o formulário acima para cadastrar os participantes oficiais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação para Alteração de Status */}
      <ConfirmModal
        isOpen={bailarinoStatusToggle !== null}
        onClose={() => setBailarinoStatusToggle(null)}
        onConfirm={() => {
          if (bailarinoStatusToggle) {
            editarBailarino(bailarinoStatusToggle.id, { ativo: !bailarinoStatusToggle.ativo });
            showToast({
              type: 'info',
              title: 'Status Alterado',
              message: `${bailarinoStatusToggle.nome} foi ${bailarinoStatusToggle.ativo ? 'inativado(a)' : 'reativado(a)'}.`,
            });
            setBailarinoStatusToggle(null);
          }
        }}
        title="Alterar Status do Participante"
        message={`Deseja realmente ${bailarinoStatusToggle?.ativo ? 'inativar' : 'reativar'} o participante "${bailarinoStatusToggle?.nome}"? ${bailarinoStatusToggle?.ativo ? 'Ele deixará de aparecer para novas compras na página pública.' : 'Ele voltará a receber apoios no ranking público.'}`}
        confirmLabel={bailarinoStatusToggle?.ativo ? 'Inativar' : 'Reativar'}
        isDestructive={bailarinoStatusToggle?.ativo}
      />
    </div>
  );
};
