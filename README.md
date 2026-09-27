# UGC Studio — Instrucciones para ejecutar localmente

Esta guía te explica paso a paso cómo instalar y ejecutar el proyecto en tu computadora con Visual Studio Code.

---

## 1. Requisitos previos

Antes de empezar, asegúrate de tener instalado:

- **Node.js** (versión 18 o superior): descárgalo desde https://nodejs.org
- **Visual Studio Code**: descárgalo desde https://code.visualstudio.com
- Una cuenta gratuita en **Supabase** (https://supabase.com) si quieres usar la base de datos real.

---

## 2. Descargar el proyecto

Descarga o clona los archivos del proyecto en una carpeta de tu computadora y ábrela con Visual Studio Code.

---

## 3. Instalar dependencias

Abre la terminal integrada de VS Code (`Terminal > New Terminal`) y ejecuta:

```bash
npm install
```

Esto instalará automáticamente todas las dependencias necesarias del proyecto (React, Vite, Tailwind CSS, Supabase, React Router y Lucide React).

> No necesitas instalar paquetes adicionales de forma manual. El comando `npm install` se encarga de todo.

---

## 4. Configurar Supabase (archivo `.env.local`)

### 4.1. Crear un proyecto en Supabase

1. Ve a https://supabase.com y crea una cuenta (o inicia sesión).
2. Haz clic en **New Project**.
3. Completa el nombre del proyecto, la contraseña de la base de datos y selecciona la región más cercana.
4. Espera a que el proyecto se termine de aprovisionar (1–2 minutos).

### 4.2. Ejecutar el script SQL

1. En el panel de Supabase, ve a **SQL Editor** (en el menú lateral izquierdo).
2. Haz clic en **New query**.
3. Copia y pega el contenido del archivo `supabase_schema.sql` (incluido en la raíz de este proyecto).
4. Haz clic en **Run** para crear todas las tablas y las políticas de seguridad.

### 4.3. Obtener las credenciales

1. En el panel de Supabase, ve a **Settings > API**.
2. Copia los siguientes dos valores:
   - **Project URL** (URL del proyecto)
   - **anon public key** (clave pública anónima)

### 4.4. Crear el archivo `.env.local`

En la raíz del proyecto, crea un archivo llamado `.env.local` (junto al `package.json`) con el siguiente contenido:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJ...tu-clave-anon-aqui...
```

Reemplaza los valores con tus credenciales reales de Supabase.

> **Importante:** Si no configuras este archivo, la aplicación funcionará en **modo demo** con datos locales en tu navegador. Podrás navegar todas las pantallas, pero los datos no se sincronizarán con Supabase.

---

## 5. Ejecutar el proyecto

En la misma terminal de VS Code, ejecuta:

```bash
npm run dev
```

Verás un mensaje similar a:

```
  VITE vX.X.X  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

Abre esa URL (`http://localhost:5173`) en tu navegador para ver la aplicación.

---

## 6. Crear tu cuenta de usuario

1. Al abrir la aplicación, verás la pantalla de inicio de sesión.
2. Haz clic en **Registrarse**.
3. Ingresa tu nombre, email y una contraseña (mínimo 6 caracteres).
4. Haz clic en **Crear Cuenta**.

Tu cuenta se creará automáticamente en Supabase Auth y un perfil se generará en la tabla `perfiles`.

> También puedes usar el botón **"Probar con cuenta demo"** para entrar sin registro (modo demo local).

---

## 7. Compilar para producción (opcional)

Si quieres generar la versión optimizada para producción:

```bash
npm run build
```

Los archivos generados estarán en la carpeta `dist/`.

Para previsualizar la build:

```bash
npm run preview
```

---

## 8. Estructura del proyecto

```
├── src/
│   ├── components/     → Componentes reutilizables (layout, navegación)
│   ├── context/        → Contexto de autenticación (AuthContext)
│   ├── lib/            → Cliente de Supabase, utilidades y mock auth
│   ├── pages/          → Páginas principales (Dashboard, Pipeline, Guiones, Calendario, Finanzas)
│   ├── types/          → Definiciones de tipos TypeScript
│   ├── App.tsx         → Configuración de rutas
│   └── main.tsx        → Punto de entrada de la aplicación
├── supabase_schema.sql → Script SQL para crear la base de datos
├── .env.local          → Variables de entorno (tú lo creas)
└── package.json        → Dependencias y scripts
```

---

## 9. Solución de problemas

| Problema | Solución |
|---|---|
| La app no carga datos | Verifica que las credenciales de `.env.local` sean correctas y que hayas ejecutado el script SQL |
| Error "Invalid API key" | Revisa que `VITE_SUPABASE_ANON_KEY` sea la clave **anon**, no la `service_role` |
| No puedo registrarme | Asegúrate de que el email tenga formato válido y la contraseña tenga al menos 6 caracteres |
| Los cambios no se ven | Reinicia el servidor con `Ctrl+C` y vuelve a ejecutar `npm run dev` |
| Puerto en uso | Vite usará automáticamente otro puerto (5174, 5175…) si el 5173 está ocupado |

## 10. Aplicación en producción:

https://ugc-studio-cdwk.onrender.com/#/login
