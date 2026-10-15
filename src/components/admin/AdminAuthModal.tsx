import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Lock, Mail, KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export const AdminAuthModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAutenticado: () => void;
}> = ({ isOpen, onClose, onAutenticado }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailLimpo = email.trim().toLowerCase();
    const senhaLimpa = senha.trim();

    if (!emailLimpo || !senhaLimpa) {
      showToast({
        type: 'warning',
        title: 'Campos Obrigatórios',
        message: 'Informe seu e-mail e sua senha de acesso.',
      });
      return;
    }

    try {
      setLoading(true);

      // 1. Fallback master de emergência para coordenação
      if (
        (emailLimpo === 'admin@talentosdeminas.com.br' || emailLimpo === 'talentosdeminasballet@gmail.com') &&
        senhaLimpa === 'wicked2026'
      ) {
        onAutenticado();
        showToast({
          type: 'success',
          title: 'Acesso Master Liberado',
          message: 'Bem-vindo ao Painel Administrativo Geral.',
        });
        onClose();
        return;
      }

      // 2. Consulta usuário no banco Supabase
      if (isSupabaseConfigured) {
        const { data: usuario, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', emailLimpo)
          .maybeSingle();

        if (error) {
          console.error('Erro na consulta de autenticacao:', error);
        }

        if (usuario) {
          // Checa se o usuário está ativo
          if (!usuario.ativo) {
            showToast({
              type: 'warning',
              title: 'Acesso Inativo',
              message: 'Este usuário está inativo no momento. Fale com a administração.',
            });
            return;
          }

          // Checa a senha cadastrada
          const senhaEsperada = usuario.senha || 'wicked2026';
          if (senhaLimpa === senhaEsperada) {
            // Atualiza último acesso
            supabase
              .from('admin_users')
              .update({ ultimo_acesso: new Date().toISOString() })
              .eq('id', usuario.id)
              .then(() => {});

            onAutenticado();
            showToast({
              type: 'success',
              title: `Olá, ${usuario.nome}!`,
              message: `Acesso liberado como ${usuario.cargo}.`,
            });
            onClose();
            return;
          } else {
            showToast({
              type: 'error',
              title: 'Senha Incorreta',
              message: 'A senha informada não confere com o cadastro.',
            });
            return;
          }
        }
      }

      // 3. Caso não encontre no banco
      showToast({
        type: 'error',
        title: 'Usuário não Localizado',
        message: 'Nenhum usuário cadastrado com este e-mail. Verifique a digitação ou solicite acesso à coordenação.',
      });
    } catch (err) {
      console.error('Erro ao autenticar:', err);
      showToast({
        type: 'error',
        title: 'Erro de Conexão',
        message: 'Não foi possível validar as credenciais. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Acesso Administrativo" maxWidth="sm">
      <form onSubmit={handleLogin} className="space-y-4 py-2">
        <div className="w-12 h-12 rounded-2xl bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center mx-auto text-[#00FF88] mb-4">
          <Lock className="w-6 h-6" />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">E-mail Cadastrado</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              disabled={loading}
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Senha de Acesso</label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={mostrarSenha ? 'text' : 'password'}
              required
              disabled={loading}
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88]"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Senha padrão inicial da equipe: <code className="text-[#00FF88]">wicked2026</code>
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 py-3 rounded-xl font-cinzel text-xs font-bold text-black bg-[#00FF88] hover:bg-[#33ff9f] glow-oz transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Validando...</span>
            </>
          ) : (
            <span>Entrar no Painel</span>
          )}
        </button>
      </form>
    </Modal>
  );
};
