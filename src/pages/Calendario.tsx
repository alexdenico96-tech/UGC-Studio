import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Video, Clock } from 'lucide-react';
import { db } from '@/lib/supabase';
import type { Campana } from '@/types';
import { ESTADO_COLORS, ESTADO_LABELS } from '@/types';
import { getInitials, getDaysUntil } from '@/lib/utils';

export default function Calendario() {
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    (async () => {
      try {
        const data = await db.getCampanas();
        setCampanas(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();

    // Build grid: leading blanks + days
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // trailing blanks to fill the last week
    while (cells.length % 7 !== 0) cells.push(null);

    // Map deliveries by date
    const deliveriesByDay: Record<number, Campana[]> = {};
    campanas.forEach((c) => {
      if (!c.fecha_entrega) return;
      const d = new Date(c.fecha_entrega + 'T00:00:00');
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!deliveriesByDay[day]) deliveriesByDay[day] = [];
        deliveriesByDay[day].push(c);
      }
    });

    return { cells, deliveriesByDay };
  }, [campanas, currentDate]);

  const monthLabel = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth();

  // Upcoming deliveries list
  const upcoming = useMemo(() => {
    return campanas
      .filter((c) => c.fecha_entrega && c.estado_kanban !== 'completado')
      .sort((a, b) => new Date(a.fecha_entrega!).getTime() - new Date(b.fecha_entrega!).getTime())
      .slice(0, 6);
  }, [campanas]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Calendario</h1>
        <p className="text-slate-400 text-sm mt-1">Fechas de entrega de borradores y publicaciones</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* calendar */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg capitalize">{monthLabel}</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                Hoy
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekdays.map((d) => (
              <div key={d} className="text-center text-[10px] md:text-xs font-medium text-slate-500 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarData.cells.map((day, i) => {
              if (day === null) return <div key={i} className="aspect-square" />;
              const deliveries = calendarData.deliveriesByDay[day] ?? [];
              const isToday = isCurrentMonth && day === today.getDate();
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-lg border p-1 md:p-1.5 flex flex-col items-center transition-colors ${
                    isToday
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : deliveries.length > 0
                      ? 'border-slate-700 bg-slate-800/40'
                      : 'border-slate-800/50 bg-slate-900/30'
                  }`}
                >
                  <span className={`text-[10px] md:text-xs font-medium ${isToday ? 'text-violet-300' : 'text-slate-400'}`}>
                    {day}
                  </span>
                  {deliveries.length > 0 && (
                    <div className="flex-1 flex flex-col justify-end items-center gap-0.5 w-full">
                      {deliveries.slice(0, 2).map((c) => {
                        const colors = ESTADO_COLORS[c.estado_kanban];
                        return (
                          <div
                            key={c.id}
                            className={`w-full h-1.5 rounded-full ${colors.dot} opacity-80`}
                            title={`${c.marca} — ${ESTADO_LABELS[c.estado_kanban]}`}
                          />
                        );
                      })}
                      {deliveries.length > 2 && (
                        <span className="text-[8px] text-slate-500">+{deliveries.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* legend */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-3">
            {Object.entries(ESTADO_COLORS).map(([key, colors]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                <span className="text-slate-400 text-[10px]">{ESTADO_LABELS[key as keyof typeof ESTADO_LABELS]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* upcoming deliveries sidebar */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Próximas entregas
          </h2>
          {upcoming.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No hay entregas próximas
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((c) => {
                const days = getDaysUntil(c.fecha_entrega);
                const colors = ESTADO_COLORS[c.estado_kanban];
                return (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40">
                    <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center text-[10px] font-bold ${colors.text} shrink-0`}>
                      {getInitials(c.marca)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{c.marca}</p>
                      <p className="text-slate-500 text-xs flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        {c.tipo_contenido}
                      </p>
                    </div>
                    <span className={`text-xs font-medium shrink-0 ${days <= 2 ? 'text-rose-400' : days <= 5 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {days === 0 ? 'Hoy' : days < 0 ? `${Math.abs(days)}d` : `${days}d`}
                    </span>
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
