# 🤝 Guía de Contribución y Desarrollo en Equipo — Vivero Colibrí

¡Gracias por formar parte del desarrollo de **Vivero Colibrí**! Este proyecto apoya una iniciativa de labor social, por lo que mantener el repositorio ordenado, con código limpio y bien documentado es fundamental para asegurar el éxito de la entrega al cliente el próximo mes.

---

## 🌿 1. Flujo de Ramas en Git (Git Flow Simplificado)

Para evitar conflictos y mantener la estabilidad del código en producción:

```text
main (Producción estable)
  │
  └── develop (Integración de sprints)
        ├── feature/autenticacion-supabase
        ├── feature/modulo-compras
        ├── feature/arqueo-conciliacion
        └── fix/calculo-stock-minimo
```

- **`main`**: Rama protegida que contiene únicamente código probado y listo para despliegue.
- **`develop`**: Rama base para el trabajo diario de los sprints.
- **`feature/<nombre-tarea>`**: Ramas de funcionalidades creadas a partir de `develop` (ejemplo: `feature/modulo-proveedores`, `feature/produccion-lotes`).
- **`fix/<nombre-correccion>`**: Ramas para resolver errores o bugs específicos (ejemplo: `fix/formato-moneda-cop`).

---

## 💬 2. Convención de Mensajes de Commit (Conventional Commits)

Utilizamos el estándar de *Conventional Commits* para mantener un historial de cambios legible y auditable:

```text
<tipo>(<módulo>): <descripción breve en presente o infinitivo>
```

### Tipos Permitidos:
- **`feat:`** Nueva funcionalidad (ejemplo: `feat(compras): agregar formulario para registrar compra a proveedor`).
- **`fix:`** Corrección de un fallo (ejemplo: `fix(ventas): corregir validación de stock al agregar producto al carrito`).
- **`docs:`** Cambios o adiciones a la documentación (ejemplo: `docs(techstack): documentar modelo relacional de postgres`).
- **`style:`** Ajustes de formato, espaciado o CSS sin alterar lógica (ejemplo: `style(dashboard): ajustar espaciado responsive en tarjetas kpi`).
- **`refactor:`** Reestructuración de código sin alterar comportamiento (ejemplo: `refactor(context): desacoplar lógica de formateo de moneda`).
- **`test:`** Adición o corrección de pruebas unitarias o de integración.
- **`chore:`** Actualización de dependencias o configuración del empaquetador (ejemplo: `chore(vite): actualizar configuración de build`).

---

## 🛠️ 3. Estándares de Código y Calidad

1. **Mantener la Integridad del Código y Comentarios:** No elimines comentarios o docstrings existentes a menos que la lógica subyacente haya cambiado por completo.
2. **Nombres Semánticos en Español para el Dominio de Negocio:**
   - Términos de negocio en español para consistencia con los requisitos: `producto`, `venta`, `loteProduccion`, `medioPago`, `conciliacion`.
   - Variables de infraestructura y utilidades en inglés estándar: `isLoading`, `useAppData`, `fetchProducts`.
3. **Validación Temprana:** Siempre valida datos en el frontend antes de enviar solicitudes al servidor (campos obligatorios, números negativos, formato de correo).
4. **Manejo de Errores con Notificaciones:** Utiliza el sistema de toasts unificado (`showToast('Mensaje descriptivo', 'error' | 'success')`) en lugar de `alert()` o `console.log()` en vistas de usuario.

---

## 🧪 4. Verificaciones Previas a Enviar Cambios (Pre-Push Checklist)

Antes de realizar `git push` o abrir un Pull Request, ejecuta obligatoriamente en tu consola:

```bash
# 1. Verificar calidad de código y ausencia de advertencias críticas
npm run lint

# 2. Verificar que el empaquetado para producción compile exitosamente
npm run build
```

Si alguno de estos comandos falla, corrígelo antes de solicitar revisión a tus compañeros.

---

## 📋 5. Plantilla para Pull Requests (PR)

Al abrir un PR hacia `develop`, incluye la siguiente información en la descripción:

```markdown
### 📝 Descripción del Cambio
Breve resumen de qué se implementó o corrigió.

### 🔗 Requisitos Abordados
- [ ] RF-XX: (Nombre del requisito funcional según docs/requisitos.md)
- [ ] RNF-XX: (Nombre del requisito no funcional)

### 📱 Pruebas Realizadas
- [ ] Probado localmente en navegador de escritorio.
- [ ] Probado en vista de pantalla móvil/tablet (DevTools).
- [ ] `npm run lint` pasa sin errores.
- [ ] `npm run build` genera la carpeta dist sin fallos.
```

---

## ⚙️ 6. Variables de Entorno

Copia el archivo `.env.example` a `.env.local` antes de iniciar el proyecto:

```bash
cp .env.example .env.local
```

Nunca subas archivos `.env` o `.env.local` al repositorio. Están explícitamente ignorados en `.gitignore` para proteger las credenciales del proyecto.
