export type ExcursaoStatus = 'aberta' | 'encerrada';
export type ParcelaStatus = 'pendente' | 'paga';
export type InscricaoStatus = 'ativa' | 'cancelada';
export type TipoVeiculo = 'onibus' | 'van';
export type MetodoPagamento = 'dinheiro' | 'pix';
export type UsuarioRole = 'admin' | 'tesoureiro';

export interface Excursao {
  id: string;
  nome: string;
  destino: string;
  dataIda: string;
  dataVolta?: string | null;
  valor: number;
  numParcelas: number;
  tipoVeiculo: TipoVeiculo;
  totalAssentos: number;
  status: ExcursaoStatus;
  criadoEm: string;
  inscritos?: number;
}

export interface Participante {
  id: string;
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  criadoEm: string;
}

export interface Parcela {
  id: string;
  inscricaoId: string;
  numero: number;
  status: ParcelaStatus;
  pagamentos?: Pagamento[];
}

export interface Inscricao {
  id: string;
  excursaoId: string;
  participanteId: string;
  numeroAssento: number | null;
  status: InscricaoStatus;
  criadoEm: string;
  participante?: Participante;
  excursao?: Excursao;
  parcelas?: Parcela[];
  quitado?: boolean;
}

export interface Pagamento {
  id: string;
  parcelaId: string;
  usuarioId: string;
  valorPago: number;
  dataPagamento: string;
  criadoEm: string;
  metodo: MetodoPagamento;
  referencia?: string | null;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: UsuarioRole;
  criadoEm: string;
}

export interface ApiError {
  error?: {
    message?: string;
    statusCode?: number;
  };
  message?: string;
}
