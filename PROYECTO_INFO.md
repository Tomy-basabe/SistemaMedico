# 🏥 Sistema Médico — Información del Proyecto

> ⚠️ IMPORTANTE: Leer antes de hacer cualquier cambio en la DB o variables de entorno.

## Base de Datos (Supabase)

- **Nombre del proyecto:** CarinaSistrema
- **Cuenta Supabase:** basabetomas09@gmail.com
- **Project Ref:** `cvevqbnrhfreygjdyswa`
- **URL:** `https://cvevqbnrhfreygjdyswa.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2ZXZxYm5yaGZyZXlnamR5c3dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTM1MzMsImV4cCI6MjA5Nzg4OTUzM30.BPiLTS3MRCDY0_x1C82Lnf0AO6JZbC92MaZt_BdlZdo`
- **Service Role Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2ZXZxYm5yaGZyZXlnamR5c3dhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMxMzUzMywiZXhwIjoyMDk3ODg5NTMzfQ.tZPF3S5vsmLWplbSI3nLfxUE2vt-uaIIEslWMMWMq6k`

> ⚠️ El MCP de Supabase está conectado a OTRA cuenta (basabetomas09 no es la cuenta MCP).
> Para ejecutar SQL en esta DB, usar la API REST con la service role key directamente,
> o ejecutar desde el dashboard en supabase.com/dashboard/project/cvevqbnrhfreygjdyswa

## Repositorio GitHub

- **Repo:** `Tomy-basabe/SistemaMedico`
- **Branch:** `main`
- **Deploy:** Vercel (conectado al repo)

## Variables de Entorno (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://cvevqbnrhfreygjdyswa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2ZXZxYm5yaGZyZXlnamR5c3dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTM1MzMsImV4cCI6MjA5Nzg4OTUzM30.BPiLTS3MRCDY0_x1C82Lnf0AO6JZbC92MaZt_BdlZdo
```

> ⚠️ NO cambiar estas claves. Si Vercel no muestra cambios, verificar que las env vars
> en Vercel dashboard apunten a la misma URL (cvevqbnrhfreygjdyswa).

## Usuarios del Sistema

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | carina@medicenter.com | Admin123! |
| Secretaria | laura@medicenter.com | Secretaria123! |
| Médico | roberto@medicenter.com | Medico123! |

## Roles en la App

- **admin** → `/admin/*`
- **secretaria** → `/secretaria/*`
- **medico** → `/medico/*`
