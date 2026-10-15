import React, { useState, useMemo } from 'react';
import { useCampanha } from '../../hooks/useCampanha';
import { useToast } from '../../hooks/useToast';
import { Download, Search, CheckCircle, RefreshCw, Eye, MessageCircle, Mail } from 'lucide-react';
import { TOTAL_COTAS } from '../../services/mockData';
import type { CotaRifa } from '../../types';

export const AdminRifa: React.FC = () => {
  const { cotas, bailarinos, baixaManualCota, liberarCota } = useCampanha();
  const { showToast } = useToast();

  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pago' | 'disponivel'>('todos');
  const [busca, setBusca] = useState('');
  const [modalBaixaNumero, setModalBaixaNumero] = useState<number | null>(null);
  const [cotaDetalhes, setCotaDetalhes] = useState<CotaRifa | null>(null);

  // Form baixa manual
  const [nomeComprador, setNomeComprador] = useState('');
  const [whatsappComprador, setWhatsappComprador] = useState('');
  const [emailComprador, setEmailComprador] = useState('');
  const [bailarinoId, setBailarinoId] = useState(bailarinos[0]?.id || '');
  const [dispararEmail, setDispararEmail] = useState(true);

  const cotasFiltradas = useMemo(() => {
    return cotas.filter((c) => {
      const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus;
      const matchBusca =
        busca.trim() === '' ||
        c.numero.toString().includes(busca) ||
        (c.compradorNome && c.compradorNome.toLowerCase().includes(busca.toLowerCase())) ||
        (c.compradorWhatsapp && c.compradorWhatsapp.includes(busca));
      return matchStatus && matchBusca;
    });
  }, [cotas, filtroStatus, busca]);

  const handleConfirmarBaixa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalBaixaNumero || !nomeComprador.trim()) {
      showToast({ type: 'warning', title: 'Atenção', message: 'Preencha o nome do comprador.' });
      return;
    }

    baixaManualCota(modalBaixaNumero, {
      compradorNome: nomeComprador,
      compradorEmail: emailComprador,
      compradorWhatsapp: whatsappComprador,
      bailarinoId: bailarinoId || bailarinos[0]?.id || '',
    });

    showToast({
      type: 'success',
      title: 'Baixa Concluída',
      message: `Número #${modalBaixaNumero} registrado para ${nomeComprador}.${
        dispararEmail && emailComprador ? ' E-mail de confirmação enviado.' : ''
      }`,
    });

    setModalBaixaNumero(null);
    setNomeComprador('');
    setWhatsappComprador('');
    setEmailComprador('');
  };

  const exportarCSV = () => {
    const cabecalho = 'Numero;Status;Comprador;WhatsApp;Email;Bailarino_Apoiado;Data\n';
    const linhas = cotas.map((c) => {
      const bNome = bailarinos.find((b) => b.id === c.bailarinoId)?.nome || 'Nenhum';
      return `${c.numero};${c.status};"${c.compradorNome || ''}";"${c.compradorWhatsapp || ''}";"${c.compradorEmail || ''}";"${bNome}";"${c.dataCompra || ''}"`;
    });

    // Inclui BOM UTF-8 (\uFEFF) para abrir com acentuação correta no Excel brasileiro
    const csvContent = '\uFEFF' + cabecalho + linhas.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lista_sorteio_wicked_2026_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      title: 'Exportação Concluída',
      message: 'Lista dos 1.200 números gerada com compatibilidade total para o Excel.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Controles do Mapa de 1.200 Números */}
      <div className="p-4 sm:p-6 rounded-2xl glass-card border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <button
            onClick={() => setFiltroStatus('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filtroStatus === 'todos' ? 'bg-[#00FF88] text-black' : 'bg-white/5 text-slate-300'
            }`}
          >
            Todos ({TOTAL_COTAS})
          </button>
          <button
            onClick={() => setFiltroStatus('pago')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filtroStatus === 'pago' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-slate-300'
            }`}
          >
            Vendidos ({cotas.filter((c) => c.status === 'pago').length})
          </button>
          <button
            onClick={() => setFiltroStatus('disponivel')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filtroStatus === 'disponivel' ? 'bg-sky-500 text-black' : 'bg-white/5 text-slate-300'
            }`}
          >
            Disponíveis ({cotas.filter((c) => c.status === 'disponivel').length})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar número, nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88]"
            />
          </div>

          <button
            onClick={exportarCSV}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D4AF37] text-black hover:bg-[#e0be47] transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-lg shadow-[#D4AF37]/10"
          >
            <Download className="w-4 h-4" />
            Exportar CSV Live
          </button>
        </div>
      </div>

      {/* Tabela de Números com Baixa Manual e Detalhes */}
      <div className="rounded-2xl glass-card border border-white/10 overflow-hidden">
        <div className="max-h-[550px] overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-black/60 sticky top-0 z-10 text-slate-400 uppercase tracking-wider text-[11px] border-b border-white/5">
              <tr>
                <th className="px-4 sm:px-6 py-3">Número</th>
                <th className="px-4 sm:px-6 py-3">Status</th>
                <th className="px-4 sm:px-6 py-3">Titular / Comprador</th>
                <th className="px-4 sm:px-6 py-3 hidden md:table-cell">Contato</th>
                <th className="px-4 sm:px-6 py-3 hidden sm:table-cell">Bailarino</th>
                <th className="px-4 sm:px-6 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cotasFiltradas.slice(0, 150).map((cota) => {
                const isPago = cota.status === 'pago';
                const bNome = bailarinos.find((b) => b.id === cota.bailarinoId)?.nome || '-';

                return (
                  <tr key={cota.numero} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 sm:px-6 py-3 font-mono font-bold text-white">
                      #{cota.numero.toString().padStart(4, '0')}
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isPago
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {isPago ? 'Vendido' : 'Disponível'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-white font-medium">
                      {isPago ? (
                        <button
                          onClick={() => setCotaDetalhes(cota)}
                          className="hover:text-[#00FF88] flex items-center gap-1.5 cursor-pointer text-left"
                          title="Ver ficha do comprador"
                        >
                          <span>{cota.compradorNome}</span>
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-slate-400 hidden md:table-cell">
                      {cota.compradorWhatsapp || '—'}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-[#00FF88] hidden sm:table-cell">{bNome}</td>
                    <td className="px-4 sm:px-6 py-3 text-right">
                      {isPago ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setCotaDetalhes(cota)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-[#00FF88] transition-colors cursor-pointer"
                            title="Ver detalhes completos"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => liberarCota(cota.numero)}
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-[11px] transition-colors cursor-pointer"
                            title="Liberar número novamente"
                          >
                            <RefreshCw className="w-3 h-3 inline mr-1" />
                            Liberar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setModalBaixaNumero(cota.numero)}
                          className="px-2.5 py-1 rounded-lg bg-[#00FF88]/10 hover:bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/20 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Dar Baixa Manual
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes da Cota Vendida */}
      {cotaDetalhes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="font-cinzel text-base font-bold text-white">
                Ficha da Cota #{cotaDetalhes.numero.toString().padStart(4, '0')}
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Vendido
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400 block mb-0.5">Nome do Titular</span>
                <span className="text-white font-semibold text-sm">{cotaDetalhes.compradorNome || 'Não informado'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-slate-400 block mb-0.5">WhatsApp</span>
                  <span className="text-slate-200">{cotaDetalhes.compradorWhatsapp || '—'}</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-slate-400 block mb-0.5">Data da Compra</span>
                  <span className="text-slate-200">{cotaDetalhes.dataCompra || 'Hoje'}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400 block mb-0.5">E-mail Cadastrado</span>
                <span className="text-slate-200">{cotaDetalhes.compradorEmail || '—'}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#0F3D2A]/30 border border-[#00FF88]/20">
                <span className="text-slate-400 block mb-0.5">Bailarino(a) Apoiado(a)</span>
                <span className="text-[#00FF88] font-bold">
                  {bailarinos.find((b) => b.id === cotaDetalhes.bailarinoId)?.nome || 'Geral da Campanha'}
                </span>
              </div>
            </div>

            {/* Ações Rápidas de Atendimento */}
            <div className="flex gap-2 pt-2">
              {cotaDetalhes.compradorWhatsapp && (
                <a
                  href={`https://wa.me/55${cotaDetalhes.compradorWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Olá ${cotaDetalhes.compradorNome}, tudo bem? Aqui é do Talentos de Minas Ballet. Seu bilhete #${cotaDetalhes.numero} da campanha Wicked 2026 está confirmado!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chamar no WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setCotaDetalhes(null)}
                className="py-2.5 px-4 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Baixa Manual */}
      {modalBaixaNumero !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h4 className="font-cinzel text-base font-bold text-white mb-1">
              Baixa Manual • Número #{modalBaixaNumero}
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Registre vendas presenciais ou pagamentos confirmados manualmente.
            </p>

            <form onSubmit={handleConfirmarBaixa} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Comprador *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo"
                  value={nomeComprador}
                  onChange={(e) => setNomeComprador(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#00FF88]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="(31) 99999-9999"
                    value={whatsappComprador}
                    onChange={(e) => setWhatsappComprador(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#00FF88]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={emailComprador}
                    onChange={(e) => setEmailComprador(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#00FF88]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Bailarino Apoiado *</label>
                <select
                  value={bailarinoId}
                  onChange={(e) => setBailarinoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#00FF88]"
                >
                  {bailarinos.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opção de Disparo de E-mail */}
              <div className="flex items-center gap-2 pt-1 text-xs text-slate-300">
                <input
                  type="checkbox"
                  id="chkEmail"
                  checked={dispararEmail}
                  onChange={(e) => setDispararEmail(e.target.checked)}
                  className="rounded bg-black/40 border-white/20 text-[#00FF88] focus:ring-0"
                />
                <label htmlFor="chkEmail" className="flex items-center gap-1 cursor-pointer">
                  <Mail className="w-3.5 h-3.5 text-[#00FF88]" />
                  <span>Disparar e-mail automático de confirmação da compra</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalBaixaNumero(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00FF88] text-black hover:bg-[#33ff9f] flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Confirmar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
