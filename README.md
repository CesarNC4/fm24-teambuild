# FM24 Asistente

Herramienta web para gestionar tu club en **Football Manager 2024**: importa las
exportaciones HTML del juego y analiza plantilla, roles, táctica, rasgos y
entrenamiento. Todo el procesamiento ocurre en el navegador; los datos se guardan
en IndexedDB y nunca salen de tu máquina. Desplegable en Vercel sin backend.

## Uso

1. En FM24, abre la vista de plantilla (o de ojeados) con una vista que incluya
   todos los atributos, posición, edad, personalidad, sueldo, valor y fin de
   contrato.
2. `Ctrl+P` → *Página web* y guarda el `.html`.
3. Súbelo en la pestaña **Importar**, revisa las columnas detectadas y guarda.

El parser reconoce cabeceras en español e inglés y permite corregir a mano las
que no identifique; la corrección se recuerda para importaciones posteriores.

## Desarrollo

Se usa **pnpm**, fijado por versión en `package.json` (`packageManager`) y
gestionado por Corepack (incluido en Node). Una sola vez, en una terminal de
administrador: `corepack enable`. Después:

```bash
pnpm install
pnpm dev         # http://localhost:3000
pnpm build
pnpm lint
```

Si no quieres habilitar Corepack, antepón `corepack` a cada comando
(`corepack pnpm install`).

### Política de dependencias (`pnpm-workspace.yaml`)

- `minimumReleaseAge: 10080` — no se instala ninguna versión publicada hace
  menos de 7 días; la mayoría de paquetes comprometidos se retiran antes.
- `onlyBuiltDependencies: []` — ningún paquete ejecuta scripts de instalación.
  Si alguno lo necesita, se añade a la lista de forma explícita.
- Sin *hoisting*: solo se puede importar lo declarado en `package.json`.

## Estructura

- `src/lib/fm/attributes.ts` – catálogo de atributos y alias de cabecera (EN/ES)
- `src/lib/fm/parser.ts` – parser de la tabla HTML exportada
- `src/lib/fm/roles.ts` – roles/deberes con atributos clave y preferibles
- `src/lib/fm/scoring.ts` – puntuación 0-100 por rol
- `src/lib/store.ts` – estado persistente (zustand + IndexedDB)
- `src/app/*` – páginas (Importar, Plantilla, Roles…)

`refs/` (ignorado por git) contiene repositorios de la comunidad usados como
referencia: FM24-Player-Analyzer (GPL-3), pyscoutfm (MIT), fm_player_ranking.
