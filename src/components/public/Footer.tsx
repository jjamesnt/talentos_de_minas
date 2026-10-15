import React from 'react';
import { Mail, Lock, Heart } from 'lucide-react';
import logoTalentos from '../../assets/logo_talentos.webp';

export const Footer: React.FC<{ onAbrirAdmin: () => void }> = ({ onAbrirAdmin }) => {
  return (
    <footer className="bg-black border-t border-white/5 py-10 sm:py-12 text-slate-400 text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Marca & Descrição */}
        <div className="text-center md:text-left flex flex-col items-center md:items-start">
          <img
            src={logoTalentos}
            alt="Talentos de Minas"
            className="h-8 w-auto object-contain mb-2 opacity-90 hover:opacity-100 transition-opacity"
            width={140}
            height={32}
            loading="lazy"
            decoding="async"
          />
          <p className="text-slate-400 max-w-sm text-center md:text-left">
            Campanha oficial de arrecadação para viabilizar a participação dos nossos bailarinos no Festival Wicked 2026.
          </p>
        </div>

        {/* Canais de Contato Oficiais */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <a
            href="mailto:talentosdeminasballet@gmail.com"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <Mail className="w-4 h-4 text-[#D4AF37]" />
            <span>talentosdeminasballet@gmail.com</span>
          </a>

          <a
            href="https://instagram.com/talentosdeminasballet"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-[#FF007F] transition-colors"
          >
            <svg className="w-4 h-4 fill-current text-[#FF007F]" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <span>@talentosdeminasballet</span>
          </a>
        </div>

        {/* Atalho Discreto para Painel Administrativo */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-400">
            Feito com <Heart className="w-3.5 h-3.5 text-[#FF007F] fill-current" /> para a arte
          </span>
          <a
            href="/admin"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onAbrirAdmin?.()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-[#00FF88] border border-white/10 transition-colors cursor-pointer"
            title="Acesso Administrativo Restrito (Abrir em nova aba)"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Admin</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
