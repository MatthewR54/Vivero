# Respaldo automático de la base de datos (Supabase)

**Responsable:** Juan Felipe Muñoz — Despliegue del proyecto

## Qué se hizo

El plan gratuito de Supabase no incluye copias de seguridad que se puedan descargar o restaurar. Para cumplir con [RNF-25](requisitos.md) ("el sistema deberá realizar copias de seguridad periódicas"), el workflow [`.github/workflows/supabase-backup.yml`](../.github/workflows/supabase-backup.yml) genera un respaldo diario con `pg_dump`.

| | |
| :--- | :--- |
| **Cuándo** | Todos los días a las 3:17 AM (hora Colombia), o a mano desde GitHub |
| **Qué guarda** | El esquema `public` completo: tablas, datos, funciones (`process_sale_transaction`, etc.), triggers, políticas RLS, permisos y secuencias (consecutivo `VTA-XXXX`) |
| **Dónde** | Como *artifact* del workflow en GitHub Actions (pestaña **Actions → Supabase Backup**) |
| **Cuánto tiempo** | 30 días (variable `RETENTION_DAYS` del workflow, máximo 90) |
| **Formato** | `vivero_respaldo_AAAA-MM-DD_HHMM.sql.gz.gpg`: SQL comprimido y **cifrado con AES-256** |
| **Costo** | $0 |

> [!IMPORTANT]
> El repositorio es público y los respaldos contienen datos de clientes (nombres, documentos, teléfonos). Por eso cada respaldo se cifra con una clave que solo conoce el equipo antes de subirlo a GitHub. Sin esa clave, el archivo no sirve para nada.

No incluye los esquemas internos de Supabase (`auth`, `storage`, etc.). Cuando se agregue inicio de sesión, los usuarios quedan en Supabase Auth y no en este respaldo.

## Configuración (una sola vez)

En GitHub: **Settings → Secrets and variables → Actions → New repository secret**.

1. **`SUPABASE_DB_URL`**: cadena de conexión a Postgres.
   - En Supabase: botón **Connect** (arriba en el panel del proyecto) → pestaña **Connection String** → **Session pooler**.
   - Copiar la URI, que tiene esta forma, y reemplazar `[YOUR-PASSWORD]` por la contraseña de la base de datos:
     ```
     postgresql://postgres.uudljqkqazvgnsulpinm:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres
     ```
   - Usar **Session pooler** y no "Direct connection": la conexión directa solo funciona por IPv6 y los servidores de GitHub Actions no tienen IPv6.
   - Si nadie recuerda la contraseña: **Project Settings → Database → Reset database password** (la app no la usa, así que cambiarla no la afecta).
2. **`BACKUP_PASSPHRASE`**: una clave larga inventada por el equipo para cifrar los respaldos (por ejemplo, cinco palabras al azar).
   - **Guardarla en un lugar seguro fuera de GitHub** (gestor de contraseñas). Si se pierde, los respaldos no se pueden abrir.

Después: **Actions → Supabase Backup → Run workflow** y comprobar que termina en verde y que en el resumen del run aparece el artifact.

Si el workflow falla con `server version mismatch`, la versión de Postgres de Supabase es más nueva que el `pg_dump` del workflow: revisar la versión en **Project Settings → Infrastructure** y subir `PG_MAJOR` en el workflow.

## Cómo restaurar un respaldo

Requiere `gpg` y `psql` (cliente de PostgreSQL) instalados.

1. Descargar el artifact desde **Actions → Supabase Backup → (el run del día que se quiere) → Artifacts**. Llega como `.zip`; descomprimirlo.
2. Descifrar y descomprimir (pide la clave `BACKUP_PASSPHRASE`):
   ```bash
   gpg --decrypt vivero_respaldo_2026-10-22_0317.sql.gz.gpg | gunzip > respaldo.sql
   ```
3. Cargarlo en un **proyecto nuevo o vacío** de Supabase (con la cadena de conexión *Session pooler* de ese proyecto):
   ```bash
   psql "postgresql://postgres.<proyecto>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres" \
     -v ON_ERROR_STOP=1 -c 'DROP SCHEMA IF EXISTS public CASCADE' -f respaldo.sql
   ```
   > [!WARNING]
   > `DROP SCHEMA public CASCADE` borra todo lo que haya en el esquema `public` de esa base. Nunca correrlo contra la base de producción sin haber descargado antes un respaldo reciente.
4. Si es un proyecto nuevo, actualizar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Cloudflare Pages y en `.env.local`, y los secrets del keep-alive y del respaldo en GitHub.

## Pruebas realizadas

- Esquema + datos semilla + `migration_01` cargados en PostgreSQL local; luego los mismos pasos del workflow (`pg_dump`, verificación, `gzip`, cifrado con `gpg`).
- Respaldo descifrado y restaurado en una base vacía: las 14 tablas con las mismas filas, las 14 políticas RLS, las 3 funciones, los 4 triggers, los permisos de `anon` y el consecutivo de ventas (`VTA-1049`) quedaron iguales al original.
- Con una clave incorrecta, el respaldo no se puede descifrar.
