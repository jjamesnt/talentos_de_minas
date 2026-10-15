import { useState, useEffect, useCallback } from 'react';
import type { AdminUser, CargoUsuario } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useAdminUsuarios() {
  const [usuarios, setUsuarios] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarUsuarios = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar usuarios:', error);
      } else if (data) {
        const mapeados: AdminUser[] = data.map((u: any) => ({
          id: u.id,
          nome: u.nome,
          email: u.email,
          cargo: u.cargo as CargoUsuario,
          telefone: u.telefone || '',
          ativo: u.ativo ?? true,
          ultimoAcesso: u.ultimo_acesso,
          createdAt: u.created_at,
          senha: u.senha || 'wicked2026',
        }));
        setUsuarios(mapeados);
      }
    } catch (err) {
      console.error('Falha ao conectar com tabela admin_users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Assinatura Realtime com canal isolado por instancia
  useEffect(() => {
    carregarUsuarios();

    if (!isSupabaseConfigured) return;

    const canalId = `admin_users_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const canal = supabase
      .channel(canalId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_users' },
        () => carregarUsuarios()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregarUsuarios]);

  const adicionarUsuario = async (dados: {
    nome: string;
    email: string;
    cargo: CargoUsuario;
    telefone?: string;
    senha?: string;
  }) => {
    if (!isSupabaseConfigured) return;

    const { error } = await supabase.from('admin_users').insert([
      {
        nome: dados.nome.trim(),
        email: dados.email.trim().toLowerCase(),
        cargo: dados.cargo,
        telefone: dados.telefone?.trim() || null,
        senha: dados.senha?.trim() || 'wicked2026',
        ativo: true,
      },
    ]);

    if (error) {
      throw error;
    }

    await carregarUsuarios();
  };

  const editarUsuario = async (id: string, dados: Partial<AdminUser>) => {
    if (!isSupabaseConfigured) return;

    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (dados.nome !== undefined) payload.nome = dados.nome.trim();
    if (dados.email !== undefined) payload.email = dados.email.trim().toLowerCase();
    if (dados.cargo !== undefined) payload.cargo = dados.cargo;
    if (dados.telefone !== undefined) payload.telefone = dados.telefone.trim() || null;
    if (dados.senha !== undefined && dados.senha.trim() !== '') payload.senha = dados.senha.trim();
    if (dados.ativo !== undefined) payload.ativo = dados.ativo;

    const { error } = await supabase
      .from('admin_users')
      .update(payload)
      .eq('id', id);

    if (error) {
      throw error;
    }

    await carregarUsuarios();
  };

  const redefinirSenha = async (id: string, novaSenha: string) => {
    await editarUsuario(id, { senha: novaSenha });
  };

  const excluirUsuario = async (id: string) => {
    if (!isSupabaseConfigured) return;

    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    await carregarUsuarios();
  };

  const alternarStatus = async (id: string, ativoAtual: boolean) => {
    await editarUsuario(id, { ativo: !ativoAtual });
  };

  return {
    usuarios,
    loading,
    carregarUsuarios,
    adicionarUsuario,
    editarUsuario,
    redefinirSenha,
    excluirUsuario,
    alternarStatus,
  };
}
