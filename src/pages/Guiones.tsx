import { useEffect, useMemo, useState } from 'react';
import { FileText, Save, Sparkles, Clock, Type, Video, ArrowLeft, Check } from 'lucide-react';
import { db } from '@/lib/supabase';
import type { Campana, Guion } from '@/types';
import { ESTADO_COLORS, ESTADO_LABELS } from '@/types';
import { getInitials, countWords, estimateDuration } from '@/lib/utils';

export default function Guiones() {
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [guiones, setGuiones] = useState<Guion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampanaId, setSelectedCampanaId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, g] = await Promise.all([db.getCampanas(), db.getGuiones()]);
        setCampanas(c);
        setGuiones(g);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedCampana = campanas.find((c) => c.id === selectedCampanaId) ?? null;
  const existingGuion = guiones.find((g) => g.campana_id === selectedCampanaId) ?? null;

  async function handleGuionSaved(updated: Guion) {
    setGuiones((prev) => {
      const idx = prev.findIndex((g) => g.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [updated, ...prev];
    });
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  // If a campaign is selected, show the editor
  if (selectedCampana && existingGuion !== undefined) {
    return (
      <ScriptEditor
        campana={selectedCampana}
        guion={existingGuion}
        onBack={() => setSelectedCampanaId(null)}
        onSaved={handleGuionSaved}
      />
    );
  }

  // If a campaign is selected but no guion yet, we still pass null and editor creates one
  if (selectedCampana) {
    return (
      <ScriptEditor
        campana={selectedCampana}
        guion={null}
        onBack={() => setSelectedCampanaId(null)}
        onSaved={handleGuionSaved}
      />
    );
  }

  // Campaign list view
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Guiones</h1>
        <p className="text-slate-400 text-sm mt-1">Selecciona una campaña para escribir o editar su guion</p>
      </div>

      {campanas.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay campañas. Crea una en el Pipeline primero.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {campanas.map((c) => {
            const colors = ESTADO_COLORS[c.estado_kanban];
            const hasGuion = guiones.some((g) => g.campana_id === c.id);
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCampanaId(c.id)}
                className="text-left bg-slate-900/50 border border-slate-800 hover:border-violet-500/40 rounded-2xl p-4 transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center text-sm font-bold ${colors.text}`}>
                    {getInitials(c.marca)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{c.marca}</p>
                    <p className="text-slate-500 text-xs">{c.tipo_contenido}</p>
                  </div>
                  {hasGuion && (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" />
                      Guion
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} ${colors.border} border`}>
                    {ESTADO_LABELS[c.estado_kanban]}
                  </span>
                  <FileText className="w-4 h-4 text-slate-600 group-hover:text-violet-400 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScriptEditor({
  campana,
  guion,
  onBack,
  onSaved,
}: {
  campana: Campana;
  guion: Guion | null;
  onBack: () => void;
  onSaved: (g: Guion) => void;
}) {
  const [hook, setHook] = useState(guion?.hook ?? '');
  const [body, setBody] = useState(guion?.body ?? '');
  const [cta, setCta] = useState(guion?.cta ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fullText = `${hook} ${body} ${cta}`;
  const totalWords = useMemo(() => countWords(fullText), [fullText]);
  const totalSeconds = useMemo(() => estimateDuration(fullText), [fullText]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await db.upsertGuion({
        campana_id: campana.id,
        hook,
        body,
        cta,
      });
      onSaved(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const sections = [
    {
      key: 'hook',
      label: 'Hook (Gancho)',
      placeholder: 'Escribe el gancho que captará la atención en los primeros 3 segundos…',
      value: hook,
      onChange: setHook,
      accent: 'violet',
      hint: 'Los primeros 3 segundos son clave para detener el scroll',
    },
    {
      key: 'body',
      label: 'Body (Cuerpo)',
      placeholder: 'Desarrolla el contenido principal: presenta el producto, beneficio y storytelling…',
      value: body,
      onChange: setBody,
      accent: 'fuchsia',
      hint: 'Mantén el mensaje claro y enfocado en el beneficio',
    },
    {
      key: 'cta',
      label: 'CTA (Llamado a la acción)',
      placeholder: 'Termina con un llamado claro: "Compra ahora", "Sígueme para más", etc.…',
      value: cta,
      onChange: setCta,
      accent: 'sky',
      hint: 'Dile exactamente qué hacer después de ver el video',
    },
  ] as const;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* header */}
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Volver a guiones
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center text-violet-300 font-bold">
          {getInitials(campana.marca)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-white truncate">{campana.marca}</h1>
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <Video className="w-3.5 h-3.5" />
            {campana.tipo_contenido}
          </p>
        </div>
      </div>

      {/* metrics bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5">
          <Type className="w-4 h-4 text-violet-400" />
          <span className="text-white text-sm font-medium">{totalWords}</span>
          <span className="text-slate-500 text-xs">palabras</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5">
          <Clock className="w-4 h-4 text-fuchsia-400" />
          <span className="text-white text-sm font-medium">{totalSeconds}s</span>
          <span className="text-slate-500 text-xs">estimado</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Guardado' : saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {/* editor sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const words = countWords(section.value);
          const seconds = estimateDuration(section.value);
          const accentClasses: Record<string, { border: string; bg: string; text: string; label: string }> = {
            violet: { border: 'border-violet-500/30', bg: 'bg-violet-500/5', text: 'text-violet-300', label: 'bg-violet-500' },
            fuchsia: { border: 'border-fuchsia-500/30', bg: 'bg-fuchsia-500/5', text: 'text-fuchsia-300', label: 'bg-fuchsia-500' },
            sky: { border: 'border-sky-500/30', bg: 'bg-sky-500/5', text: 'text-sky-300', label: 'bg-sky-500' },
          };
          const ac = accentClasses[section.accent];
          return (
            <div key={section.key} className={`border ${ac.border} ${ac.bg} rounded-2xl p-4 md:p-5`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-6 rounded-full ${ac.label}`} />
                  <h3 className={`font-semibold ${ac.text}`}>{section.label}</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{words} palabras</span>
                  <span>·</span>
                  <span>{seconds}s</span>
                </div>
              </div>
              <textarea
                value={section.value}
                onChange={(e) => section.onChange(e.target.value)}
                placeholder={section.placeholder}
                rows={section.key === 'body' ? 6 : 3}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors text-sm resize-y min-h-[80px]"
              />
              <p className="text-slate-500 text-xs mt-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                {section.hint}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
