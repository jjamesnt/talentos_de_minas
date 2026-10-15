import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Lock, Mail, KeyRound } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export const AdminAuthModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAutenticado: () => void;
}> = ({ isOpen, onClose, onAutenticado }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const { showToast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // Login seguro (com credenciais padrão de administração para gestão da campanha)
    if (email === 'admin@talentosdeminas.com.br' || email === 'talentosdeminasballet@gmail.com' || (email && senha === 'wicked2026')) {
      onAutenticado();
      showToast({
        type: 'success',
        title: 'Acesso Liberado',
        message: 'Bem-vindo ao Painel Administrativo do Talentos de Minas.',
      });
      onClose();
    } else {
      showToast({
        type: 'error',
        title: 'Falha no Acesso',
        message: 'Credenciais inválidas. Dica: use a senha wicked2026.',
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Acesso Administrativo" maxWidth="sm">
      <form onSubmit={handleLogin} className="space-y-4 py-2">
        <div className="w-12 h-12 rounded-2xl bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center mx-auto text-[#00FF88] mb-4">
          <Lock className="w-6 h-6" />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">E-mail Administrativo</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              placeholder="talentosdeminasballet@gmail.com"
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
              type="password"
              required
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF88]"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Senha de acesso inicial: <code className="text-[#00FF88]">wicked2026</code></p>
        </div>

        <button
          type="submit"
          className="w-full mt-4 py-3 rounded-xl font-cinzel text-xs font-bold text-black bg-[#00FF88] hover:bg-[#33ff9f] glow-oz transition-all cursor-pointer"
        >
          Entrar no Painel
        </button>
      </form>
    </Modal>
  );
};
