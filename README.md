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

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

## Estructura

- `src/lib/fm/attributes.ts` – catálogo de atributos y alias de cabecera (EN/ES)
- `src/lib/fm/parser.ts` – parser de la tabla HTML exportada
- `src/lib/fm/roles.ts` – roles/deberes con atributos clave y preferibles
- `src/lib/fm/scoring.ts` – puntuación 0-100 por rol
- `src/lib/store.ts` – estado persistente (zustand + IndexedDB)
- `src/app/*` – páginas (Importar, Plantilla, Roles…)

`refs/` (ignorado por git) contiene repositorios de la comunidad usados como
referencia: FM24-Player-Analyzer (GPL-3), pyscoutfm (MIT), fm_player_ranking.
