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
  id?: string;
  posicao: number;
  titulo: string;
  subtitulo: string;
  fotoUrl?: string;
  destaque?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProdutoLoja {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  fotoUrl?: string;
  estoque?: number;
  tamanhosDisponiveis?: string[];
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PedidoLoja {
  id: string;
  produto_id?: string;
  produto_nome: string;
  quantidade: number;
  tamanho?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_price: number;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  payment_method?: string;
  payment_origin?: string;
  mp_payment_id?: string;
  codigo_pix?: string;
  qr_code_base64?: string;
  status_updated_by?: string;
  status_updated_at?: string;
  reason?: string;
  retirado?: boolean;
  retirado_em?: string;
  email_sent?: boolean;
  email_status?: string;
  created_at: string;
  updated_at?: string;
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
  qrCodeBase64?: string;
  mpPaymentId?: string;
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

export type CategoriaDespesa = 
  | 'Produção Wicked'
  | 'Figurinos & Adereços'
  | 'Produtos/Loja'
  | 'Marketing & Divulgação'
  | 'Taxas Bancárias & Gateway'
  | 'Transporte & Logística'
  | 'Alimentação'
  | 'Espaço & Locação'
  | 'Outros';

export interface DespesaFinanceira {
  id: string;
  titulo: string;
  descricao?: string;
  categoria: CategoriaDespesa | string;
  valor: number;
  data_despesa: string;
  comprovante_url?: string;
  criado_por: string;
  created_at: string;
  updated_at?: string;
}

