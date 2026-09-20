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

La misma vista sirve para el primer equipo, los filiales (Sub-21, Sub-18,
equipo B: se añaden en Importar con su edad máxima), las búsquedas de
ojeados, toda la liga y la plantilla del próximo rival (se añade con
«+ rival»; la pestaña **Rival** estima su XI, amenazas, debilidades,
instrucciones de oposición y ajustes a tu táctica). Además de los atributos, la vista recomendada incluye fecha de
nacimiento, tipo de contrato, cláusula, situación de fichaje/cesión, informe
del cuerpo técnico (Idoneidad/Potencial), partidos, minutos, goles,
asistencias, moral y condición: alimentan Juveniles, las charlas y las alertas
de contrato. Las columnas de estrellas (Calidad/Potencial) se exportan vacías.

La exportación de la liga (búsqueda de jugadores con todos los de la
competición) solo incluye las filas que el juego ha llegado a cargar en
pantalla. Baja hasta el final de la lista antes de imprimir y, si aun así
faltan, exporta por trozos (filtrando por posición o por club) y marca
«añadir a los ya guardados» en Importar: los repetidos se fusionan por UID.
Con la liga completa, Radiografía muestra el percentil de cada titular y la
comparación de equipos por atributo (la pantalla «Comparación» del juego, que
no se puede exportar).

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
- `src/lib/fm/formations.ts`, `tactics.ts`, `instructions.ts` – formaciones, mejor XI (húngaro), avisos e instrucciones con encaje (nombres reales de FM24; los deslizadores son grupos con nivel -2…2)
- `src/lib/fm/styleRoles.ts` – roles que admite cada estilo por hueco (varias opciones con el porqué, heredadas por familia), puntuados contra el titular y la plantilla
- `src/lib/fm/stylePresets.ts`, `styles.ts` – catálogo de estilos por familia con estilo padre, roles-firma, principios, palancas, rendimiento en el motor y requisitos de evolución; encaje y «qué te falta» contra el XI
- `src/lib/fm/advice.ts` – consejos contextuales de instrucciones (anchura, líneas, presión, portero, centros, gatillo × físico, roles con presión cableada, defensa preventiva y cuña, matriz de DarkHorse)
- `src/lib/fm/playerInstructions.ts` – instrucciones individuales y sugerencias por titular
- `src/lib/fm/traits.ts` – catálogo de rasgos, compatibilidad por rol y sugerencias
- `src/lib/fm/training.ts` – foco individual, calendario semanal y tutorías
- `src/lib/fm/youth.ts`, `scouting.ts`, `history.ts`, `league.ts`, `radiography.ts`, `setpieces.ts` – juveniles, ojeados, evolución, liga, radiografía y balón parado
- `src/lib/fm/rival.ts` – análisis del rival: XI probable, amenazas, debilidades, instrucciones de oposición (con el Marcaje de nuestros marcadores), bloque y gatillo según su serenidad, córners contra su defensa, estilos contra él
- `src/app/*` – páginas (Importar, Plantilla, Roles, Táctica, Rasgos, Entrenamiento, Juveniles, Ojeados, Balón parado, Rival, Radiografía, Comparar)

## Estilos de juego

Además de los presets del juego hay estilos «reales» que evolucionan de
ellos (juego de posición 2-3-5, cebar la presión, relacionismo, fútbol
total, presión hombre a hombre, gegenpress vertical, doble mediapunta,
control directo, rombo pragmático, cholismo, contraataque directo, reactivo
de transición y carrileros directos), agrupados por familia. Cada uno lleva
sus instrucciones con los nombres reales del creador de tácticas de FM24 en
español, la mentalidad, los roles-firma, sus principios, las palancas en
partido y una nota de cómo rinde en el motor. Táctica dice qué falta para
jugarlo (roles en el XI, atributos por línea, polivalencia) y a qué puede
evolucionar; Radiografía lo resume para todos los estilos. Al cambiar
instrucciones el estilo se conserva como base («ajustado»). Las tácticas
guardadas con instrucciones que ya no existen en FM24 (trampa del fuera de
juego → Adelantarse más; anchura defensiva → Evitar/Permitir centros;
marcaje estricto de equipo → «Marcajes más férreos» por jugador) se migran al
cargar.

## Fuentes

Las reglas de roles, rasgos, instrucciones y atributos siguen las guías de
[Passion4FM](https://www.passion4fm.com/) (rasgos, atributos, instrucciones de
jugador, parejas de roles, estilos de juego y presets), la guía "Roles and Combinations" de Magicomonta
(rol × estilo, bandas con uno o dos jugadores, rombo) y una guía comunitaria de
instrucciones de equipo y mentalidad. El entrenamiento sigue la guía de
jonasmorais (FM Scout) y el megapack de Passion4FM (carga semanal, rotación,
semanas por objetivo); las personalidades y el trato con la prensa, la guía de
personalidades de FM Scout (rangos de atributos ocultos); el módulo de
juveniles, las guías de desarrollo juvenil de Passion4FM y FM Scout; el de
ojeados, las guías de scouting y de fichajes de Passion4FM; las instrucciones
de oposición, las reglas habituales de la comunidad (presión al que se atasca,
nunca al rápido; marcaje al desmarcador, nunca al referencia; entradas duras
al blando; conducir al pie malo). Los estilos evolucionados y los ejes
transversales (defensa preventiva, palancas, córners) salen de los hilos de
04texag en la comunidad de SI (juego de posición FM20/21 y FM24), de los
resúmenes de DarkHorse Tactics (contraataque con mentalidad Ofensiva, matriz
de interdependencias, metodología), del hilo del Exeter (posesión en League
One), de FM Scout (cholismo) y FM Base (relacionismo), y de las guías de
instrucciones de jugador, defensa preventiva y balón parado. Son consejos,
no reglas del motor.

`refs/` (ignorado por git) contiene repositorios de la comunidad usados como
referencia: FM24-Player-Analyzer (GPL-3), pyscoutfm (MIT), fm_player_ranking.
Ideas tomadas de otros proyectos: evolución entre exportaciones (fm-dash
"Progression", FM24-Player-Analyzer), explorador de formaciones y radiografía
de plantilla (FM24-Player-Analyzer), gangas, seguimiento de objetivos y
comparación de jugadores (fm-dash). La fuente «Liga» (exportación de todos los
jugadores de la competición) da percentiles por familia de posición.
