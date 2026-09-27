import { useEffect, useMemo, useState } from 'react';
import { Wallet, Plus, Trash2, TrendingUp, Clock, AlertTriangle, CheckCircle2, X, DollarSign } from 'lucide-react';
import { db } from '@/lib/supabase';
import type { Campana, Finanza, EstadoPago } from '@/types';
import { ESTADOS_PAGO, ESTADO_PAGO_LABELS, PAGO_COLORS } from '@/types';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';

export default function Finanzas() {
  const [finanzas, setFinanzas] = useState<Finanza[]>([]);
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EstadoPago | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [f, c] = await Promise.all([db.getFinanzas(), db.getCampanas()]);
        setFinanzas(f);
        setCampanas(c);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function load() {
    const [f, c] = await Promise.all([db.getFinanzas(), db.getCampanas()]);
    setFinanzas(f);
    setCampanas(c);
  }

  const campanaMap = useMemo(() => {
    const map: Record<string, Campana> = {};
    campanas.forEach((c) => { map[c.id] = c; });
    return map;
  }, [campanas]);

  const stats = useMemo(() => {
    const pagado = finanzas.filter((f) => f.estado_pago === 'pagado').reduce((s, f) => s + Number(f.monto), 0);
    const pendiente = finanzas.filter((f) => f.estado_pago === 'pendiente').reduce((s, f) => s + Number(f.monto), 0);
    const atrasado = finanzas.filter((f) => f.estado_pago === 'atrasado').reduce((s, f) => s + Number(f.monto), 0);
    const total = pagado + pendiente + atrasado;
    return { pagado, pendiente, atrasado, total };
  }, [finanzas]);

  const filtered = useMemo(() => {
    if (filter === 'all') return finanzas;
    return finanzas.filter((f) => f.estado_pago === filter);
  }, [finanzas, filter]);

  async function handleStatusChange(id: string, estado: EstadoPago) {
    setFinanzas((prev) => prev.map((f) => (f.id === id ? { ...f, estado_pago: estado } : f)));
    try {
      await db.updateFinanza(id, { estado_pago: estado });
    } catch (err) {
      console.error(err);
      load();
    }
  }

  async function handleDelete(id: string) {
    setFinanzas((prev) => prev.filter((f) => f.id !== id));
    try {
      await db.deleteFinanza(id);
    } catch (err) {
      console.error(err);
      load();
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Finanzas</h1>
          <p className="text-slate-400 text-sm mt-1">Control de ingresos y cuentas por cobrar</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-violet-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo registro</span>
        </button>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <FinanceStat
          icon={DollarSign}
          label="Total facturado"
          value={formatCurrency(stats.total)}
          accent="from-violet-500 to-fuchsia-500"
        />
        <FinanceStat
          icon={CheckCircle2}
          label="Cobrado"
          value={formatCurrency(stats.pagado)}
          accent="from-emerald-500 to-teal-500"
        />
        <FinanceStat
          icon={Clock}
          label="Pendiente"
          value={formatCurrency(stats.pendiente)}
          accent="from-amber-500 to-orange-500"
        />
        <FinanceStat
          icon={AlertTriangle}
          label="Atrasado"
          value={formatCurrency(stats.atrasado)}
          accent="from-rose-500 to-red-500"
        />
      </div>

      {/* filters */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <FilterChip label="Todos" active={filter === 'all'} onClick={() => setFilter('all')} count={finanzas.length} />
        {ESTADOS_PAGO.map((e) => {
          const colors = PAGO_COLORS[e];
          return (
            <FilterChip
              key={e}
              label={ESTADO_PAGO_LABELS[e]}
              active={filter === e}
              onClick={() => setFilter(e)}
              count={finanzas.filter((f) => f.estado_pago === e).length}
              dot={colors.dot}
            />
          );
        })}
      </div>

      {/* table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-slate-900/30 border border-slate-800 rounded-2xl">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay registros financieros</p>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          {/* desktop table */}
          <table className="hidden md:table w-full">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs">
                <th className="text-left font-medium px-5 py-3">Marca</th>
                <th className="text-left font-medium px-5 py-3">Fecha emisión</th>
                <th className="text-right font-medium px-5 py-3">Monto</th>
                <th className="text-left font-medium px-5 py-3">Estado</th>
                <th className="text-right font-medium px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const campana = campanaMap[f.campana_id];
                const colors = PAGO_COLORS[f.estado_pago];
                return (
                  <tr key={f.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center text-xs font-bold text-violet-300">
                          {getInitials(campana?.marca ?? '??')}
                        </div>
                        <span className="text-white text-sm font-medium">{campana?.marca ?? 'Campaña eliminada'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-sm">{formatDate(f.fecha_emision)}</td>
                    <td className="px-5 py-3 text-right text-white font-semibold text-sm">{formatCurrency(Number(f.monto))}</td>
                    <td className="px-5 py-3">
                      <select
                        value={f.estado_pago}
                        onChange={(e) => handleStatusChange(f.id, e.target.value as EstadoPago)}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border-0 cursor-pointer ${colors.bg} ${colors.text} focus:outline-none focus:ring-1 focus:ring-violet-500`}
                      >
                        {ESTADOS_PAGO.map((e) => (
                          <option key={e} value={e} className="bg-slate-800 text-white">{ESTADO_PAGO_LABELS[e]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* mobile cards */}
          <div className="md:hidden divide-y divide-slate-800/50">
            {filtered.map((f) => {
              const campana = campanaMap[f.campana_id];
              const colors = PAGO_COLORS[f.estado_pago];
              return (
                <div key={f.id} className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center text-xs font-bold text-violet-300">
                      {getInitials(campana?.marca ?? '??')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{campana?.marca ?? 'Campaña eliminada'}</p>
                      <p className="text-slate-500 text-xs">{formatDate(f.fecha_emision)}</p>
                    </div>
                    <p className="text-white font-semibold text-sm">{formatCurrency(Number(f.monto))}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={f.estado_pago}
                      onChange={(e) => handleStatusChange(f.id, e.target.value as EstadoPago)}
                      className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border-0 cursor-pointer ${colors.bg} ${colors.text} focus:outline-none`}
                    >
                      {ESTADOS_PAGO.map((e) => (
                        <option key={e} value={e} className="bg-slate-800 text-white">{ESTADO_PAGO_LABELS[e]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="ml-auto text-slate-500 hover:text-rose-400 p-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modalOpen && (
        <FinanceModal campanas={campanas} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load(); }} />
      )}
    </div>
  );
}

function FinanceStat({ icon: Icon, label, value, accent }: { icon: typeof Wallet; label: string; value: string; accent: string }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
      <div className={`absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br ${accent} opacity-10 rounded-full blur-2xl`} />
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br ${accent} mb-2.5`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-slate-400 text-xs mb-0.5">{label}</p>
      <p className="text-lg md:text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function FilterChip({ label, active, onClick, count, dot }: { label: string; active: boolean; onClick: () => void; count: number; dot?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
        active ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30' : 'bg-slate-800/40 text-slate-400 border border-slate-700/50 hover:text-white'
      }`}
    >
      {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
      {label}
      <span className="opacity-60">{count}</span>
    </button>
  );
}

function FinanceModal({ campanas, onClose, onSaved }: { campanas: Campana[]; onClose: () => void; onSaved: () => void }) {
  const [campanaId, setCampanaId] = useState(campanas[0]?.id ?? '');
  const [monto, setMonto] = useState('');
  const [estadoPago, setEstadoPago] = useState<EstadoPago>('pendiente');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!campanaId) { setError('Selecciona una campaña'); return; }
    if (!monto || Number(monto) <= 0) { setError('Ingresa un monto válido'); return; }
    setSaving(true);
    setError(null);
    try {
      await db.createFinanza({
        campana_id: campanaId,
        monto: Number(monto),
        estado_pago: estadoPago,
        fecha_emision: fechaEmision,
      });
      onSaved();
    } catch (err) {
      console.error(err);
      setError('Error al guardar el registro');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-slate-900 border border-slate-800 rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-white font-semibold text-lg">Nuevo registro financiero</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {campanas.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">No hay campañas. Crea una en el Pipeline primero.</p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Campaña</label>
                <select
                  value={campanaId}
                  onChange={(e) => setCampanaId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500 text-sm"
                >
                  {campanas.map((c) => (
                    <option key={c.id} value={c.id}>{c.marca}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Monto ($)</label>
                  <input
                    type="number"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Fecha emisión</label>
                  <input
                    type="date"
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Estado del pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {ESTADOS_PAGO.map((e) => {
                    const colors = PAGO_COLORS[e];
                    return (
                      <button
                        key={e}
                        onClick={() => setEstadoPago(e)}
                        className={`px-2 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                          estadoPago === e
                            ? `${colors.bg} ${colors.text} border-current`
                            : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:border-slate-600'
                        }`}
                      >
                        {ESTADO_PAGO_LABELS[e]}
                      </button>
                    );
                  })}
                </div>
              </div>
              {error && <p className="text-rose-400 text-xs">{error}</p>}
            </>
          )}
        </div>
        <div className="p-5 border-t border-slate-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || campanas.length === 0}
            className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-violet-600/30 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
