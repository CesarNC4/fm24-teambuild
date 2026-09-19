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
- `allowBuilds` — decisión explícita por cada paquete con scripts de
  instalación; todos a `false` (bloqueados). pnpm 12 falla la instalación si
  aparece un paquete nuevo con scripts sin decisión: entonces se revisa y se
  añade a la lista (normalmente `false`).
- Sin *hoisting*: solo se puede importar lo declarado en `package.json`.

## Estructura

- `src/lib/fm/attributes.ts` – catálogo de atributos y alias de cabecera (EN/ES)
- `src/lib/fm/parser.ts` – parser de la tabla HTML exportada
- `src/lib/fm/roles.ts` – roles/deberes con atributos clave y preferibles
- `src/lib/fm/scoring.ts` – puntuación 0-100 por rol
- `src/lib/store.ts` – estado persistente (zustand + IndexedDB)
- `src/lib/fm/formations.ts`, `tactics.ts`, `instructions.ts` – formaciones, mejor XI (húngaro), avisos e instrucciones con encaje
- `src/lib/fm/advice.ts` – consejos contextuales de instrucciones (anchura, líneas, presión, portero, centros…)
- `src/lib/fm/playerInstructions.ts` – instrucciones individuales y sugerencias por titular
- `src/lib/fm/traits.ts` – catálogo de rasgos, compatibilidad por rol y sugerencias
- `src/lib/fm/training.ts` – foco individual, calendario semanal y tutorías
- `src/app/*` – páginas (Importar, Plantilla, Roles, Táctica, Rasgos, Entrenamiento)

## Fuentes

Las reglas de roles, rasgos, instrucciones y atributos siguen las guías de
[Passion4FM](https://www.passion4fm.com/) (rasgos, atributos, instrucciones de
jugador, parejas de roles, estilos de juego y presets), la guía "Roles and Combinations" de Magicomonta
(rol × estilo, bandas con uno o dos jugadores, rombo) y una guía comunitaria de
instrucciones de equipo y mentalidad. El entrenamiento sigue la guía de
jonasmorais (FM Scout) y el megapack de Passion4FM (carga semanal, rotación,
semanas por objetivo); las personalidades y el trato con la prensa, la guía de
personalidades de FM Scout (rangos de atributos ocultos). Son consejos, no
reglas del motor.

`refs/` (ignorado por git) contiene repositorios de la comunidad usados como
referencia: FM24-Player-Analyzer (GPL-3), pyscoutfm (MIT), fm_player_ranking.
