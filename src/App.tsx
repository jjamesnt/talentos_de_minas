import React, { useState } from 'react';
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

// Área Administrativa
import { AdminAuthModal } from './components/admin/AdminAuthModal';
import { AdminDashboard } from './components/admin/AdminDashboard';

export const MainApp: React.FC = () => {
  const [isAdminView, setIsAdminView] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isApoioModalOpen, setIsApoioModalOpen] = useState(false);
  const [bailarinoPreSelecionadoId, setBailarinoPreSelecionadoId] = useState<string | null>(null);

  const abrirAdmin = () => {
    if (isAdminView) {
      setIsAdminView(false);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const abrirApoio = (bailarinoId?: string) => {
    setBailarinoPreSelecionadoId(bailarinoId || null);
    setIsApoioModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-100 flex flex-col font-sans selection:bg-[#00FF88] selection:text-black">
      {isAdminView ? (
        <AdminDashboard onVoltarAoSite={() => setIsAdminView(false)} />
      ) : (
        <>
          <Navbar
            onAbrirAdmin={abrirAdmin}
            onAbrirApoio={() => abrirApoio()}
          />

          <main className="flex-1 pt-18">
            <Hero onAbrirApoio={() => abrirApoio()} />
            <VitrinePremios />
            <SeletorRifa onAbrirApoio={() => abrirApoio()} />
            <LojaSazonal />
          </main>

          <Footer onAbrirAdmin={abrirAdmin} />

          <ModalFluxoApoio
            isOpen={isApoioModalOpen}
            onClose={() => setIsApoioModalOpen(false)}
            bailarinoPreSelecionadoId={bailarinoPreSelecionadoId}
          />

          <CheckoutModal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
          />

          <AdminAuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onAutenticado={() => setIsAdminView(true)}
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
