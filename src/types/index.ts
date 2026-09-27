export type EstadoKanban =
  | 'contacto'
  | 'contrato'
  | 'guion'
  | 'grabando'
  | 'aprobacion'
  | 'completado';

export type EstadoPago = 'pendiente' | 'pagado' | 'atrasado';

export interface Perfil {
  id: string;
  nombre: string;
  avatar_url: string | null;
}

export interface Campana {
  id: string;
  user_id: string;
  marca: string;
  tipo_contenido: string;
  presupuesto: number;
  estado_kanban: EstadoKanban;
  fecha_entrega: string | null;
  created_at: string;
}

export interface Guion {
  id: string;
  campana_id: string;
  user_id: string;
  hook: string;
  body: string;
  cta: string;
  created_at: string;
}

export interface Finanza {
  id: string;
  campana_id: string;
  user_id: string;
  monto: number;
  estado_pago: EstadoPago;
  fecha_emision: string | null;
  created_at: string;
}

export const ESTADOS_KANBAN: EstadoKanban[] = [
  'contacto',
  'contrato',
  'guion',
  'grabando',
  'aprobacion',
  'completado',
];

export const ESTADOS_PAGO: EstadoPago[] = ['pendiente', 'pagado', 'atrasado'];

export const ESTADO_LABELS: Record<EstadoKanban, string> = {
  contacto: 'Contacto',
  contrato: 'Contrato',
  guion: 'Guion',
  grabando: 'Grabando',
  aprobacion: 'Aprobación',
  completado: 'Completado',
};

export const ESTADO_PAGO_LABELS: Record<EstadoPago, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  atrasado: 'Atrasado',
};

export const ESTADO_COLORS: Record<EstadoKanban, { dot: string; bg: string; text: string; border: string }> = {
  contacto: { dot: 'bg-slate-400', bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/30' },
  contrato: { dot: 'bg-sky-400', bg: 'bg-sky-500/10', text: 'text-sky-300', border: 'border-sky-500/30' },
  guion: { dot: 'bg-violet-400', bg: 'bg-violet-500/10', text: 'text-violet-300', border: 'border-violet-500/30' },
  grabando: { dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' },
  aprobacion: { dot: 'bg-fuchsia-400', bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-300', border: 'border-fuchsia-500/30' },
  completado: { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' },
};

export const PAGO_COLORS: Record<EstadoPago, { bg: string; text: string; dot: string }> = {
  pendiente: { bg: 'bg-amber-500/10', text: 'text-amber-300', dot: 'bg-amber-400' },
  pagado: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  atrasado: { bg: 'bg-rose-500/10', text: 'text-rose-300', dot: 'bg-rose-400' },
};
