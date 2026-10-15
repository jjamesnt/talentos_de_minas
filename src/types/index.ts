export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export interface Bailarino {
  id: string;
  nome: string;
  fotoUrl: string;
  meta: number;
  totalVendido: number;
  totalApoios: number;
  ativo: boolean;
}

export type StatusCota = 'disponivel' | 'selecionado' | 'pago' | 'pendente' | 'reservado';

export interface CotaRifa {
  numero: number; // 1 a 1200
  status: StatusCota;
  compradorNome?: string;
  compradorEmail?: string;
  compradorWhatsapp?: string;
  bailarinoId?: string;
  dataCompra?: string;
}

export interface Premio {
  posicao: number;
  titulo: string;
  subtitulo: string;
  destaque?: boolean;
}

export interface PedidoCheckout {
  id: string;
  compradorNome: string;
  compradorEmail: string;
  compradorWhatsapp: string;
  bailarinoId: string;
  numeros: number[];
  valorTotal: number;
  dataCriacao: string;
  status: 'pago' | 'pendente';
  codigoPix: string;
}

export type CargoUsuario = 'Administrador' | 'Coordenação' | 'Operador' | 'Financeiro';

export interface AdminUser {
  id: string;
  nome: string;
  email: string;
  cargo: CargoUsuario;
  telefone?: string;
  ativo: boolean;
  ultimoAcesso?: string;
  createdAt?: string;
  senha?: string;
}
