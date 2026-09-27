-- ============================================================
-- UGC STUDIO — Script SQL para Supabase
-- ============================================================
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase.
-- Crea todas las tablas, índices, triggers y políticas de seguridad (RLS).
-- ============================================================

-- ============ perfiles ============
CREATE TABLE IF NOT EXISTS perfiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_perfil" ON perfiles;
CREATE POLICY "select_own_perfil" ON perfiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_perfil" ON perfiles;
CREATE POLICY "insert_own_perfil" ON perfiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_perfil" ON perfiles;
CREATE POLICY "update_own_perfil" ON perfiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_perfil" ON perfiles;
CREATE POLICY "delete_own_perfil" ON perfiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- Auto-crear perfil al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ campanas ============
CREATE TABLE IF NOT EXISTS campanas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  marca text NOT NULL,
  tipo_contenido text DEFAULT 'TikTok',
  presupuesto numeric(10,2) DEFAULT 0,
  estado_kanban text NOT NULL DEFAULT 'contacto',
  fecha_entrega date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campanas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_campanas" ON campanas;
CREATE POLICY "select_own_campanas" ON campanas FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_campanas" ON campanas;
CREATE POLICY "insert_own_campanas" ON campanas FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_campanas" ON campanas;
CREATE POLICY "update_own_campanas" ON campanas FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_campanas" ON campanas;
CREATE POLICY "delete_own_campanas" ON campanas FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_campanas_user_id ON campanas(user_id);

-- ============ guiones ============
CREATE TABLE IF NOT EXISTS guiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id uuid NOT NULL REFERENCES campanas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  hook text DEFAULT '',
  body text DEFAULT '',
  cta text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guiones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_guiones" ON guiones;
CREATE POLICY "select_own_guiones" ON guiones FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_guiones" ON guiones;
CREATE POLICY "insert_own_guiones" ON guiones FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_guiones" ON guiones;
CREATE POLICY "update_own_guiones" ON guiones FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_guiones" ON guiones;
CREATE POLICY "delete_own_guiones" ON guiones FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_guiones_campana_id ON guiones(campana_id);
CREATE INDEX IF NOT EXISTS idx_guiones_user_id ON guiones(user_id);

-- ============ finanzas ============
CREATE TABLE IF NOT EXISTS finanzas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id uuid NOT NULL REFERENCES campanas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  monto numeric(10,2) NOT NULL DEFAULT 0,
  estado_pago text NOT NULL DEFAULT 'pendiente',
  fecha_emision date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE finanzas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_finanzas" ON finanzas;
CREATE POLICY "select_own_finanzas" ON finanzas FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_finanzas" ON finanzas;
CREATE POLICY "insert_own_finanzas" ON finanzas FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_finanzas" ON finanzas;
CREATE POLICY "update_own_finanzas" ON finanzas FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_finanzas" ON finanzas;
CREATE POLICY "delete_own_finanzas" ON finanzas FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_finanzas_campana_id ON finanzas(campana_id);
CREATE INDEX IF NOT EXISTS idx_finanzas_user_id ON finanzas(user_id);
