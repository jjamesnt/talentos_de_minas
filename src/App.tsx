import React, { useState, useEffect } from 'react';
import { CampanhaProvider } from './hooks/useCampanha';
import { ToastProvider } from './hooks/useToast';
import { ToastContainer } from './components/common/ToastContainer';

// Hotsite Público
import { Navbar } from './components/public/Navbar';
import { Hero } from './components/public/Hero';
import { VitrinePremios } from './components/public/VitrinePremios';
import { SeletorRifa } from './components/public/SeletorRifa';
import { LojaSazonal } from './components/public/LojaSazonal';
import { Footer } from './components/public/Footer';
import { CheckoutModal } from './components/public/CheckoutModal';
import { ModalFluxoApoio } from './components/public/ModalFluxoApoio';
import { ModalCompartilharRifa } from './components/public/ModalCompartilharRifa';

// Área Administrativa
import { AdminAuthModal } from './components/admin/AdminAuthModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { FloatingWhatsAppSupport } from './components/common/FloatingWhatsAppSupport';

export const MainApp: React.FC = () => {
  const isDirectAdmin = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/admin') || 
    window.location.search.includes('admin=true')
  );

  const [isAdminView, setIsAdminView] = useState(() => {
    if (isDirectAdmin) {
      return sessionStorage.getItem('talentos_admin_authenticated') === 'true';
    }
    return false;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => {
    if (isDirectAdmin) {
      return sessionStorage.getItem('talentos_admin_authenticated') !== 'true';
    }
    return false;
  });

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isApoioModalOpen, setIsApoioModalOpen] = useState(false);
  const [bailarinoPreSelecionadoId, setBailarinoPreSelecionadoId] = useState<string | null>(null);

  // Modal de Compartilhamento da Rifa
  const [isCompartilharModalOpen, setIsCompartilharModalOpen] = useState(false);
  const [bailarinoParaCompartilharId, setBailarinoParaCompartilharId] = useState<string | null>(null);

  const abrirAdmin = () => {
    window.open('/admin', '_blank');
  };

  const abrirApoio = (bailarinoId?: string) => {
    setBailarinoPreSelecionadoId(bailarinoId || null);
    setIsApoioModalOpen(true);
  };

  const abrirCompartilhar = (bailarinoId?: string) => {
    setBailarinoParaCompartilharId(bailarinoId || null);
    setIsCompartilharModalOpen(true);
  };

  // Detecta parâmetro de compartilhamento na URL (?apoiar=ID ou ?bailarino=ID)
  // Abre diretamente o modal de apoio na etapa de cotas com o bailarino selecionado!
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const bailarinoParam = params.get('apoiar') || params.get('bailarino') || params.get('b');
      if (bailarinoParam) {
        setBailarinoPreSelecionadoId(bailarinoParam);
        setIsApoioModalOpen(true);
      }
    }
  }, []);

  const handleAutenticado = () => {
    sessionStorage.setItem('talentos_admin_authenticated', 'true');
    setIsAdminView(true);
    setIsAuthModalOpen(false);
  };

  const handleVoltarAoSite = () => {
    if (isDirectAdmin) {
      window.location.href = '/';
    } else {
      setIsAdminView(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('talentos_admin_authenticated');
    localStorage.removeItem('admin_usuario_atual');
    setIsAdminView(false);
    if (isDirectAdmin) {
      setIsAuthModalOpen(true);
    }
  };

  // Se estiver na rota direta /admin em nova aba
  if (isDirectAdmin) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-slate-100 flex flex-col font-sans selection:bg-[#00FF88] selection:text-black">
        {isAdminView ? (
          <AdminDashboard 
            onVoltarAoSite={handleVoltarAoSite} 
            onLogout={handleLogout}
          />
        ) : (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#00FF88]/5 rounded-full blur-[140px] pointer-events-none" />

            <div className="w-full max-w-md p-8 rounded-3xl bg-[#0F1412] border border-white/10 text-center relative z-10 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center mx-auto text-[#00FF88] mb-5">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>

              <h1 className="font-cinzel text-xl font-bold text-white mb-2">Painel Administrativo</h1>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Área restrita à coordenação e colaboradores do Talentos de Minas.
              </p>

              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full py-3.5 rounded-xl text-xs font-bold font-cinzel uppercase tracking-wider bg-[#00FF88] text-black hover:bg-[#33ff9f] glow-oz transition-all cursor-pointer shadow-lg mb-4"
              >
                Entrar com E-mail e Senha
              </button>

              <a
                href="/"
                className="block text-xs text-slate-400 hover:text-[#00FF88] transition-colors"
              >
                ← Voltar para a Página Principal
              </a>
            </div>

            <AdminAuthModal
              isOpen={isAuthModalOpen}
              onClose={() => setIsAuthModalOpen(false)}
              onAutenticado={handleAutenticado}
            />
          </div>
        )}

        <ToastContainer />
      </div>
    );
  }

  // Página pública principal
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-100 flex flex-col font-sans selection:bg-[#00FF88] selection:text-black">
      {isAdminView ? (
        <AdminDashboard 
          onVoltarAoSite={handleVoltarAoSite} 
          onLogout={handleLogout}
        />
      ) : (
        <>
          <Navbar
            onAbrirAdmin={abrirAdmin}
            onAbrirApoio={() => abrirApoio()}
            onAbrirCompartilhar={() => abrirCompartilhar()}
          />

          <main className="flex-1 pt-18">
            <Hero 
              onAbrirApoio={() => abrirApoio()} 
              onAbrirCompartilhar={() => abrirCompartilhar()}
            />
            <VitrinePremios />
            <SeletorRifa 
              onAbrirApoio={() => abrirApoio()} 
              onAbrirCompartilhar={() => abrirCompartilhar()}
            />
            <LojaSazonal />
          </main>

          <Footer onAbrirAdmin={abrirAdmin} />

          <FloatingWhatsAppSupport />

          <ModalFluxoApoio
            isOpen={isApoioModalOpen}
            onClose={() => {
              setIsApoioModalOpen(false);
              setBailarinoPreSelecionadoId(null);
            }}
            bailarinoPreSelecionadoId={bailarinoPreSelecionadoId}
            onAbrirCompartilharComBailarino={(id) => abrirCompartilhar(id)}
          />

          <ModalCompartilharRifa
            isOpen={isCompartilharModalOpen}
            onClose={() => setIsCompartilharModalOpen(false)}
            bailarinoInicialId={bailarinoParaCompartilharId}
          />

          <CheckoutModal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
          />

          <AdminAuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onAutenticado={handleAutenticado}
          />
        </>
      )}

      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <CampanhaProvider>
        <MainApp />
      </CampanhaProvider>
    </ToastProvider>
  );
}
