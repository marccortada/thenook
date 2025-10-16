# Modales en The Nook

Este proyecto usa dos formas de modales, según la necesidad:

- `Dialog` (Radix UI): modal accesible con manejo de foco, `DialogTrigger`, y animaciones.
- `AppModal` (custom): wrapper ligero, centrado y responsive unificado, con API simple.

## Cuándo usar cada uno

- Usa `Dialog` cuando:
  - Quieras la ergonomía completa de Radix (focus‑trap, accesibilidad integrada, `DialogTrigger`).
  - Ya existe un flujo basado en Radix en esa pantalla y quieres mantener consistencia.

- Usa `AppModal` cuando:
  - Necesites centrar y dimensionar de forma consistente sin wiring adicional.
  - Quieras respetar un “diámetro” concreto por modal (p. ej., 448, 500, 520, 1000 px) con clamp a viewport.
  - Estés migrando modales manuales (overlay + `position: fixed`) para unificar el comportamiento.

## Guía rápida de tamaños

- Desktop `maxWidth` típicos:
  - 448: edición de reserva compacta
  - 500: mayoría de modales estándar
  - 520: calendarios/flows con más contenido
  - 1000: formularios anchos (admin)
- Mobile `mobileMaxWidth`: 350–360 según contenido.
- Altura: normalmente `maxHeight` 600–720, clamp a `viewport - 80px`.

## Ejemplos

### AppModal (recomendado para nuevos modales)

```tsx
import AppModal from '@/components/ui/app-modal'

<AppModal
  open={open}
  onClose={() => setOpen(false)}
  maxWidth={500}
  mobileMaxWidth={350}
  maxHeight={600}
>
  <div className="p-6">
    {/* contenido */}
  </div>
  {/* Cierra al pulsar overlay o Escape */}
</AppModal>
```

### Dialog (Radix)

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
    </DialogHeader>
    {/* contenido */}
  </DialogContent>
</Dialog>
```

Notas:
- Por defecto `DialogContent` usa `max-w-[500px]` y `max-h:[calc(100vh-80px)]` (centrado), puedes sobreescribir con `className` por caso.

## Migración de modales manuales

Sustituye el patrón:

```tsx
{open && (
  <>
    <div className="fixed inset-0 bg-black/50" onClick={onClose} />
    <div className="fixed ..." style={{ top, left, width, maxHeight }}> ... </div>
  </>
)}
```

por:

```tsx
<AppModal open={open} onClose={onClose} maxWidth={500} mobileMaxWidth={350} maxHeight={600}>
  {/* contenido */}
</AppModal>
```

## Accesibilidad

- `Dialog` provee manejo de foco ARIA y atajos; `AppModal` incluye cierre por Escape y overlay, pero delega contenido accesible al consumidor (usa roles/labels si aplica).

## Consejos

- Mantén el “diámetro” del modal estable entre pantallas para consistencia visual.
- Si necesitas anclar dentro de otro modal, considera `Dialog` o abre un issue para extender `AppModal` con `anchorRef`.

