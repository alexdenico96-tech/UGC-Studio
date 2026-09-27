import { useEffect, useMemo, useState } from 'react';
import { Plus, X, Trash2, GripVertical, Calendar, DollarSign, MoreVertical } from 'lucide-react';
import { db } from '@/lib/supabase';
import type { Campana, EstadoKanban } from '@/types';
import { ESTADOS_KANBAN, ESTADO_LABELS, ESTADO_COLORS } from '@/types';
import { formatCurrency, getInitials, getDaysUntil, formatDate } from '@/lib/utils';

export default function Pipeline() {
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampana, setEditingCampana] = useState<Campana | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<EstadoKanban | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await db.getCampanas();
      setCampanas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDragStart(id: string) {
    setDraggingId(id);
  }

  async function handleDragOver(e: React.DragEvent, col: EstadoKanban) {
    e.preventDefault();
    setDragOverCol(col);
  }

  async function handleDrop(col: EstadoKanban) {
    if (!draggingId) return;
    setDragOverCol(null);
    setDraggingId(null);
    const campana = campanas.find((c) => c.id === draggingId);
    if (!campana || campana.estado_kanban === col) return;
    // optimistic
    setCampanas((prev) => prev.map((c) => (c.id === draggingId ? { ...c, estado_kanban: col } : c)));
    try {
      await db.updateCampana(draggingId, { estado_kanban: col });
    } catch (err) {
      console.error(err);
      load();
    }
  }

  async function handleDelete(id: string) {
    setCampanas((prev) => prev.filter((c) => c.id !== id));
    try {
      await db.deleteCampana(id);
    } catch (err) {
      console.error(err);
      load();
    }
  }

  const columns = useMemo(() => {
    return ESTADOS_KANBAN.map((estado) => ({
      estado,
      items: campanas.filter((c) => c.estado_kanban === estado),
    }));
  }, [campanas]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Pipeline</h1>
          <p className="text-slate-400 text-sm mt-1">Arrastra las tarjetas entre columnas para actualizar el estado</p>
        </div>
        <button
          onClick={() => { setEditingCampana(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-violet-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva Campaña</span>
        </button>
      </div>

      {/* kanban board */}
      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 snap-x">
        {columns.map((col) => {
          const colors = ESTADO_COLORS[col.estado];
          return (
            <div
              key={col.estado}
              onDragOver={(e) => handleDragOver(e, col.estado)}
              onDrop={() => handleDrop(col.estado)}
              className={`w-[280px] md:w-[260px] shrink-0 snap-start rounded-2xl border transition-colors ${
                dragOverCol === col.estado ? 'border-violet-500/50 bg-violet-500/5' : 'border-slate-800 bg-slate-900/40'
              }`}
            >
              <div className="p-3 md:p-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                  <h3 className="text-white font-semibold text-sm">{ESTADO_LABELS[col.estado]}</h3>
                  <span className="ml-auto text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full">{col.items.length}</span>
                </div>
              </div>

              <div className="p-2 md:p-3 space-y-2 min-h-[120px] max-h-[calc(100vh-220px)] overflow-y-auto">
                {col.items.map((c) => (
                  <CampaignCard
                    key={c.id}
                    campana={c}
                    onDragStart={() => handleDragStart(c.id)}
                    onClick={() => { setEditingCampana(c); setModalOpen(true); }}
                    onDelete={() => handleDelete(c.id)}
                  />
                ))}
                {col.items.length === 0 && (
                  <div className="text-center py-6 text-slate-600 text-xs">Suelta aquí</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <CampaignModal
          campana={editingCampana}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function CampaignCard({
  campana,
  onDragStart,
  onClick,
  onDelete,
}: {
  campana: Campana;
  onDragStart: () => void;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const days = getDaysUntil(campana.fecha_entrega);
  const colors = ESTADO_COLORS[campana.estado_kanban];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="group relative bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 cursor-pointer hover:border-violet-500/40 transition-all active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-slate-600 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center text-xs font-bold ${colors.text}`}>
              {getInitials(campana.marca)}
            </div>
            <p className="text-white text-sm font-medium truncate flex-1">{campana.marca}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/50 text-slate-300">{campana.tipo_contenido}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 flex items-center gap-0.5">
              <DollarSign className="w-2.5 h-2.5" />
              {formatCurrency(campana.presupuesto)}
            </span>
          </div>

          {campana.fecha_entrega && (
            <div className="flex items-center gap-1 mt-2 text-xs">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span className={`font-medium ${days <= 2 ? 'text-rose-400' : days <= 5 ? 'text-amber-400' : 'text-slate-400'}`}>
                {days === 0 ? 'Hoy' : days < 0 ? `${Math.abs(days)}d atrasado` : `${days}d restantes`}
              </span>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-7 z-10 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-32"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CampaignModal({
  campana,
  onClose,
  onSaved,
}: {
  campana: Campana | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [marca, setMarca] = useState(campana?.marca ?? '');
  const [tipoContenido, setTipoContenido] = useState(campana?.tipo_contenido ?? 'TikTok');
  const [presupuesto, setPresupuesto] = useState(String(campana?.presupuesto ?? ''));
  const [estadoKanban, setEstadoKanban] = useState<EstadoKanban>(campana?.estado_kanban ?? 'contacto');
  const [fechaEntrega, setFechaEntrega] = useState(campana?.fecha_entrega ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!marca.trim()) {
      setError('El nombre de la marca es obligatorio');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = {
        marca: marca.trim(),
        tipo_contenido: tipoContenido,
        presupuesto: Number(presupuesto) || 0,
        estado_kanban: estadoKanban,
        fecha_entrega: fechaEntrega || null,
      };
      if (campana) {
        await db.updateCampana(campana.id, data);
      } else {
        await db.createCampana(data);
      }
      onSaved();
    } catch (err) {
      console.error(err);
      setError('Error al guardar la campaña');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full md:max-w-lg bg-slate-900 border border-slate-800 rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-white font-semibold text-lg">{campana ? 'Editar Campaña' : 'Nueva Campaña'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Marca *</label>
            <input
              type="text"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="Nombre de la marca"
              className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Red social</label>
              <select
                value={tipoContenido}
                onChange={(e) => setTipoContenido(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors text-sm"
              >
                <option>TikTok</option>
                <option>Instagram</option>
                <option>YouTube</option>
                <option>Facebook</option>
                <option>Twitter/X</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Presupuesto ($)</label>
              <input
                type="number"
                value={presupuesto}
                onChange={(e) => setPresupuesto(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Estado del pipeline</label>
            <div className="grid grid-cols-3 gap-2">
              {ESTADOS_KANBAN.map((e) => {
                const colors = ESTADO_COLORS[e];
                return (
                  <button
                    key={e}
                    onClick={() => setEstadoKanban(e)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                      estadoKanban === e
                        ? `${colors.bg} ${colors.text} ${colors.border}`
                        : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    {ESTADO_LABELS[e]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Fecha de entrega</label>
            <input
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors text-sm"
            />
            {campana?.fecha_entrega && (
              <p className="text-slate-500 text-xs mt-1">Actual: {formatDate(campana.fecha_entrega)}</p>
            )}
          </div>

          {error && <p className="text-rose-400 text-xs">{error}</p>}
        </div>

        <div className="p-5 border-t border-slate-800 flex gap-3 sticky bottom-0 bg-slate-900">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-violet-600/30 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
