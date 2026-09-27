import { useEffect, useMemo, useState } from 'react';
import { DollarSign, Briefcase, CalendarClock, CheckCircle2, TrendingUp, ArrowUpRight, Clock, Video } from 'lucide-react';
import { db } from '@/lib/supabase';
import type { Campana, Finanza } from '@/types';
import { ESTADO_LABELS, ESTADO_COLORS } from '@/types';
import { formatCurrency, getInitials, getDaysUntil } from '@/lib/utils';

export default function Dashboard() {
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [finanzas, setFinanzas] = useState<Finanza[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, f] = await Promise.all([db.getCampanas(), db.getFinanzas()]);
        setCampanas(c);
        setFinanzas(f);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const kpis = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ingresosMes = finanzas
      .filter((f) => f.estado_pago === 'pagado' && f.fecha_emision && new Date(f.fecha_emision) >= monthStart)
      .reduce((sum, f) => sum + Number(f.monto), 0);

    const activas = campanas.filter((c) => c.estado_kanban !== 'completado' && c.estado_kanban !== 'contacto').length;

    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const pendientesSemana = campanas.filter((c) => {
      if (!c.fecha_entrega) return false;
      const d = new Date(c.fecha_entrega);
      return d >= now && d <= weekEnd && c.estado_kanban !== 'completado';
    }).length;

    const totalFinalizadas = campanas.filter((c) => c.estado_kanban === 'completado').length;
    const totalConResultado = campanas.length;
    const tasaAprobacion = totalConResultado > 0 ? Math.round((totalFinalizadas / totalConResultado) * 100) : 0;

    return { ingresosMes, activas, pendientesSemana, tasaAprobacion };
  }, [campanas, finanzas]);

  const upcoming = useMemo(() => {
    return campanas
      .filter((c) => c.fecha_entrega && c.estado_kanban !== 'completado')
      .sort((a, b) => new Date(a.fecha_entrega!).getTime() - new Date(b.fecha_entrega!).getTime())
      .slice(0, 5);
  }, [campanas]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Resumen general de tu actividad como creador UGC</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        <KpiCard
          icon={DollarSign}
          label="Ingresos del mes"
          value={formatCurrency(kpis.ingresosMes)}
          accent="from-emerald-500 to-teal-500"
          trend="+12%"
        />
        <KpiCard
          icon={Briefcase}
          label="Campañas activas"
          value={String(kpis.activas)}
          accent="from-violet-500 to-fuchsia-500"
        />
        <KpiCard
          icon={CalendarClock}
          label="Entregas esta semana"
          value={String(kpis.pendientesSemana)}
          accent="from-amber-500 to-orange-500"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Tasa de aprobación"
          value={`${kpis.tasaAprobacion}%`}
          accent="from-sky-500 to-blue-500"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* revenue chart (simple bars) */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-400" />
              Ingresos por mes
            </h2>
          </div>
          <RevenueChart finanzas={finanzas} />
        </div>

        {/* upcoming deliveries */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Próximas entregas
            </h2>
          </div>
          {upcoming.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <Video className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No hay entregas próximas
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((c) => {
                const days = getDaysUntil(c.fecha_entrega);
                const colors = ESTADO_COLORS[c.estado_kanban];
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center text-violet-300 text-xs font-bold shrink-0">
                      {getInitials(c.marca)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{c.marca}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>{ESTADO_LABELS[c.estado_kanban]}</span>
                        <span className="text-slate-500 text-xs">{c.tipo_contenido}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-medium ${days <= 2 ? 'text-rose-400' : days <= 5 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {days === 0 ? 'Hoy' : days < 0 ? `${Math.abs(days)}d tarde` : `${days}d`}
                      </p>
                      <p className="text-slate-600 text-[10px]">{formatCurrency(c.presupuesto)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
  trend,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  accent: string;
  trend?: string;
}) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 md:p-5 relative overflow-hidden group hover:border-slate-700 transition-colors">
      <div className={`absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br ${accent} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${accent} mb-3 shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-xl md:text-2xl font-bold text-white">{value}</p>
        {trend && (
          <span className="text-emerald-400 text-xs font-medium flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function RevenueChart({ finanzas }: { finanzas: Finanza[] }) {
  const months = useMemo(() => {
    const now = new Date();
    const arr: { label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('es-ES', { month: 'short' });
      const total = finanzas
        .filter((f) => {
          if (f.estado_pago !== 'pagado' || !f.fecha_emision) return false;
          const fd = new Date(f.fecha_emision);
          return fd.getFullYear() === d.getFullYear() && fd.getMonth() === d.getMonth();
        })
        .reduce((sum, f) => sum + Number(f.monto), 0);
      arr.push({ label, total });
    }
    return arr;
  }, [finanzas]);

  const maxVal = Math.max(...months.map((m) => m.total), 1);

  return (
    <div className="flex items-end justify-between gap-2 md:gap-4 h-40">
      {months.map((m, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full flex-1 flex items-end">
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-fuchsia-500 transition-all hover:from-violet-500 hover:to-fuchsia-400 relative group"
              style={{ height: `${Math.max((m.total / maxVal) * 100, 4)}%` }}
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-10">
                {formatCurrency(m.total)}
              </div>
            </div>
          </div>
          <span className="text-slate-500 text-[10px] md:text-xs capitalize">{m.label}</span>
        </div>
      ))}
    </div>
  );
}
