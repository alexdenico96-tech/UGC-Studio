import { createClient, type Session, type User } from '@supabase/supabase-js';
import type { Campana, Finanza, Guion, Perfil } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// ===== Mock Auth (fallback when no Supabase credentials) =====

const MOCK_USER_KEY = 'ugc_mock_user';
const MOCK_DATA_KEY = 'ugc_mock_data';

interface MockData {
  perfil: Perfil;
  campanas: Campana[];
  guiones: Guion[];
  finanzas: Finanza[];
}

function mockId(): string {
  return crypto.randomUUID();
}

function loadMockData(): MockData {
  const raw = localStorage.getItem(MOCK_DATA_KEY);
  if (raw) return JSON.parse(raw);
  const seed: MockData = {
    perfil: { id: 'mock-user', nombre: 'Creador Demo', avatar_url: null },
    campanas: [
      { id: mockId(), user_id: 'mock-user', marca: 'GlowUp Skincare', tipo_contenido: 'TikTok', presupuesto: 450, estado_kanban: 'grabando', fecha_entrega: addDays(2), created_at: new Date().toISOString() },
      { id: mockId(), user_id: 'mock-user', marca: 'FitFuel', tipo_contenido: 'Instagram', presupuesto: 300, estado_kanban: 'contacto', fecha_entrega: addDays(10), created_at: new Date().toISOString() },
      { id: mockId(), user_id: 'mock-user', marca: 'NovaTech', tipo_contenido: 'TikTok', presupuesto: 600, estado_kanban: 'guion', fecha_entrega: addDays(5), created_at: new Date().toISOString() },
      { id: mockId(), user_id: 'mock-user', marca: 'Bloom Cosmetics', tipo_contenido: 'Instagram', presupuesto: 350, estado_kanban: 'completado', fecha_entrega: addDays(-3), created_at: new Date().toISOString() },
      { id: mockId(), user_id: 'mock-user', marca: 'ZenWell', tipo_contenido: 'TikTok', presupuesto: 500, estado_kanban: 'aprobacion', fecha_entrega: addDays(1), created_at: new Date().toISOString() },
      { id: mockId(), user_id: 'mock-user', marca: 'PulseAudio', tipo_contenido: 'YouTube', presupuesto: 800, estado_kanban: 'contrato', fecha_entrega: addDays(14), created_at: new Date().toISOString() },
    ],
    guiones: [],
    finanzas: [],
  };
  // seed finanzas linked to campanas
  seed.campanas.forEach((c) => {
    seed.finanzas.push({
      id: mockId(),
      campana_id: c.id,
      user_id: 'mock-user',
      monto: c.presupuesto,
      estado_pago: c.estado_kanban === 'completado' ? 'pagado' : c.estado_kanban === 'aprobacion' ? 'pendiente' : 'pendiente',
      fecha_emision: new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    });
  });
  saveMockData(seed);
  return seed;
}

function saveMockData(data: MockData) {
  localStorage.setItem(MOCK_DATA_KEY, JSON.stringify(data));
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
}

// ===== Auth API (unified for real + mock) =====

export const authApi = {
  async getSession(): Promise<Session | null> {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async onAuthChange(cb: (user: AuthUser | null) => void): Promise<() => void> {
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        (async () => {
          if (session?.user) {
            const user = await this.getProfile(session.user);
            cb(user);
          } else {
            cb(null);
          }
        })();
      });
      return () => data.subscription.unsubscribe();
    }
    // mock
    const check = () => {
      const raw = localStorage.getItem(MOCK_USER_KEY);
      cb(raw ? JSON.parse(raw) : null);
    };
    check();
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  },

  async getProfile(user: User): Promise<AuthUser> {
    if (supabase) {
      const { data } = await supabase.from('perfiles').select('nombre').eq('id', user.id).maybeSingle();
      return { id: user.id, email: user.email ?? '', nombre: data?.nombre ?? user.email?.split('@')[0] ?? 'Creador' };
    }
    return { id: user.id, email: user.email ?? '', nombre: 'Creador Demo' };
  },

  async signIn(email: string, password: string): Promise<{ error: string | null }> {
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    }
    // mock
    const user: AuthUser = { id: 'mock-user', email, nombre: email.split('@')[0] };
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('storage'));
    return { error: null };
  },

  async signUp(email: string, password: string, nombre: string): Promise<{ error: string | null }> {
    if (supabase) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre } },
      });
      return { error: error?.message ?? null };
    }
    const user: AuthUser = { id: 'mock-user', email, nombre };
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('storage'));
    return { error: null };
  },

  async signOut(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut();
      return;
    }
    localStorage.removeItem(MOCK_USER_KEY);
    window.dispatchEvent(new Event('storage'));
  },
};

// ===== Data API (unified) =====

export const db = {
  // ---- Campanas ----
  async getCampanas(): Promise<Campana[]> {
    if (supabase) {
      const { data, error } = await supabase.from('campanas').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Campana[];
    }
    return loadMockData().campanas;
  },

  async createCampana(c: Partial<Campana>): Promise<Campana> {
    if (supabase) {
      const { data, error } = await supabase.from('campanas').insert(c).select().single();
      if (error) throw error;
      return data as Campana;
    }
    const d = loadMockData();
    const nueva: Campana = {
      id: mockId(),
      user_id: 'mock-user',
      marca: c.marca ?? '',
      tipo_contenido: c.tipo_contenido ?? 'TikTok',
      presupuesto: c.presupuesto ?? 0,
      estado_kanban: c.estado_kanban ?? 'contacto',
      fecha_entrega: c.fecha_entrega ?? null,
      created_at: new Date().toISOString(),
    };
    d.campanas.unshift(nueva);
    saveMockData(d);
    return nueva;
  },

  async updateCampana(id: string, patch: Partial<Campana>): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('campanas').update(patch).eq('id', id);
      if (error) throw error;
      return;
    }
    const d = loadMockData();
    const idx = d.campanas.findIndex((c) => c.id === id);
    if (idx >= 0) {
      d.campanas[idx] = { ...d.campanas[idx], ...patch };
      saveMockData(d);
    }
  },

  async deleteCampana(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('campanas').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const d = loadMockData();
    d.campanas = d.campanas.filter((c) => c.id !== id);
    d.guiones = d.guiones.filter((g) => g.campana_id !== id);
    d.finanzas = d.finanzas.filter((f) => f.campana_id !== id);
    saveMockData(d);
  },

  // ---- Guiones ----
  async getGuiones(): Promise<Guion[]> {
    if (supabase) {
      const { data, error } = await supabase.from('guiones').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Guion[];
    }
    return loadMockData().guiones;
  },

  async getGuionByCampana(campanaId: string): Promise<Guion | null> {
    if (supabase) {
      const { data, error } = await supabase.from('guiones').select('*').eq('campana_id', campanaId).maybeSingle();
      if (error) throw error;
      return data as Guion | null;
    }
    return loadMockData().guiones.find((g) => g.campana_id === campanaId) ?? null;
  },

  async upsertGuion(g: Partial<Guion> & { campana_id: string }): Promise<Guion> {
    if (supabase) {
      const existing = await this.getGuionByCampana(g.campana_id);
      if (existing) {
        const { data, error } = await supabase.from('guiones').update({ hook: g.hook, body: g.body, cta: g.cta }).eq('id', existing.id).select().single();
        if (error) throw error;
        return data as Guion;
      }
      const { data, error } = await supabase.from('guiones').insert(g).select().single();
      if (error) throw error;
      return data as Guion;
    }
    const d = loadMockData();
    const idx = d.guiones.findIndex((x) => x.campana_id === g.campana_id);
    if (idx >= 0) {
      d.guiones[idx] = { ...d.guiones[idx], hook: g.hook ?? '', body: g.body ?? '', cta: g.cta ?? '' };
      saveMockData(d);
      return d.guiones[idx];
    }
    const nueva: Guion = {
      id: mockId(),
      campana_id: g.campana_id,
      user_id: 'mock-user',
      hook: g.hook ?? '',
      body: g.body ?? '',
      cta: g.cta ?? '',
      created_at: new Date().toISOString(),
    };
    d.guiones.unshift(nueva);
    saveMockData(d);
    return nueva;
  },

  // ---- Finanzas ----
  async getFinanzas(): Promise<Finanza[]> {
    if (supabase) {
      const { data, error } = await supabase.from('finanzas').select('*').order('fecha_emision', { ascending: false });
      if (error) throw error;
      return data as Finanza[];
    }
    return loadMockData().finanzas;
  },

  async createFinanza(f: Partial<Finanza> & { campana_id: string }): Promise<Finanza> {
    if (supabase) {
      const { data, error } = await supabase.from('finanzas').insert(f).select().single();
      if (error) throw error;
      return data as Finanza;
    }
    const d = loadMockData();
    const nueva: Finanza = {
      id: mockId(),
      campana_id: f.campana_id,
      user_id: 'mock-user',
      monto: f.monto ?? 0,
      estado_pago: f.estado_pago ?? 'pendiente',
      fecha_emision: f.fecha_emision ?? new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    };
    d.finanzas.unshift(nueva);
    saveMockData(d);
    return nueva;
  },

  async updateFinanza(id: string, patch: Partial<Finanza>): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('finanzas').update(patch).eq('id', id);
      if (error) throw error;
      return;
    }
    const d = loadMockData();
    const idx = d.finanzas.findIndex((f) => f.id === id);
    if (idx >= 0) {
      d.finanzas[idx] = { ...d.finanzas[idx], ...patch };
      saveMockData(d);
    }
  },

  async deleteFinanza(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('finanzas').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const d = loadMockData();
    d.finanzas = d.finanzas.filter((f) => f.id !== id);
    saveMockData(d);
  },
};
