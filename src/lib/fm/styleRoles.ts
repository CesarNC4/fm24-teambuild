/**
 * Roles recomendados por estilo y hueco: no un rol fijo, sino las opciones
 * que cada estilo admite en cada posición, con el porqué, ordenadas de más a
 * menos habitual. Se combinan con la plantilla (puntuación del titular y del
 * mejor candidato en cada opción) para que la recomendación sea concreta.
 *
 * Los ids son roles con deber («MEZ-S») o códigos sin deber («MEZ», vale
 * cualquier deber disponible en el hueco). Cada estilo puede redefinir solo
 * algunos grupos de huecos; el resto lo hereda de su familia.
 */

import { ROLE_BY_ID, ROLES, rolesForPosition, type RoleDef } from "./roles";
import { scoreRole } from "./scoring";
import { STYLE_BY_ID, type StyleFamily, type StylePreset } from "./stylePresets";
import { familiarity, type LineupResult } from "./tactics";
import type { Player, PositionSlot } from "./types";

export interface RoleOption {
  /** Id con deber («DM-S») o código («DM»). */
  role: string;
  why: string;
}

export interface RoleOptionGroup {
  slots: PositionSlot[];
  options: RoleOption[];
  /** Cómo elegir entre las opciones. */
  note?: string;
}

const GK: PositionSlot[] = ["GK"];
const DC: PositionSlot[] = ["DC"];
const FB: PositionSlot[] = ["DL", "DR"];
const WB: PositionSlot[] = ["WBL", "WBR"];
const DM: PositionSlot[] = ["DM"];
const MC: PositionSlot[] = ["MC"];
const MRL: PositionSlot[] = ["ML", "MR"];
const AMC: PositionSlot[] = ["AMC"];
const AMRL: PositionSlot[] = ["AML", "AMR"];
const ST: PositionSlot[] = ["ST"];

const o = (role: string, why: string): RoleOption => ({ role, why });
const g = (slots: PositionSlot[], options: RoleOption[], note?: string): RoleOptionGroup => ({ slots, options, note });

// ---------------------------------------------------------------------------
// Por familia (lo que hereda un estilo si no dice otra cosa)
// ---------------------------------------------------------------------------

const FAMILY_OPTIONS: Record<StyleFamily, RoleOptionGroup[]> = {
  posesion: [
    g(GK, [o("SK-S", "sale y participa en la salida"), o("SK-D", "si no tiene pie: participa menos pero sigue alto"), o("GK-D", "solo si el portero es malo con el pie y la línea no es alta")]),
    g(DC, [o("BPD-D", "inicia el juego con el pase"), o("CD-D", "el compañero del Defensa con toque: no arriesga"), o("CD-Co", "en Cubrir si la línea es alta y el otro sube a robar")], "uno con toque y otro práctico: dos con salida buscan el pase arriesgado a la vez"),
    g(FB, [o("IWB-S", "se mete al medio y da superioridad en la salida"), o("FB-S", "anchura desde atrás sin desordenar"), o("WB-S", "más alto: si el extremo de su lado entra por dentro"), o("IFB-D", "tercer central en la salida")]),
    g(WB, [o("CWB-S", "toda la banda cuando el extremo entra"), o("WB-S", "equilibrio"), o("IWB-S", "si hace falta un pivote más en la salida")]),
    g(DM, [o("DLP-D", "organizador retrasado que dicta el ritmo"), o("DM-S", "pivote sobrio que no roba espacio a los interiores"), o("REG-S", "si es un pasador de élite y hay otro pivote que cubra"), o("HB-D", "baja entre centrales: salida 3-2 con laterales que suben")]),
    g(MC, [o("MEZ-S", "interior que aparece en el medio espacio"), o("CM-S", "enlace que no rompe la forma"), o("AP-S", "el creador entre líneas si no hay mediapunta"), o("B2B-S", "piernas si el otro interior es organizador"), o("DLP-S", "organizador adelantado si el pivote es de contención")]),
    g(MRL, [o("WM-S", "interior que combina y cubre"), o("W-S", "extremo que da la anchura"), o("WP-S", "organizador en banda si el lateral dobla")]),
    g(AMC, [o("AP-S", "organizador adelantado: el balón pasa por él"), o("AM-S", "mediapunta que combina y llega"), o("SS-A", "delantero sorpresa si el punta baja")]),
    g(AMRL, [o("IW-S", "entra con balón y libera al lateral"), o("IF-S", "entra sin balón a rematar"), o("W-S", "anchura pura que clava al lateral"), o("IF-A", "rematador desde banda con lateral que dobla")], "a pierna cambiada por dentro, a pierna natural por fuera"),
    g(ST, [o("F9-S", "baja y arrastra a los centrales"), o("CF-S", "hace de todo: aguanta, baja y remata"), o("DLF-S", "enlaza con los interiores"), o("AF-A", "en ligas menores: clava a los centrales (Exeter)")]),
  ],
  presion: [
    g(GK, [o("SK-S", "sale a cubrir la espalda de la línea alta"), o("SK-D", "si no es rápido de reflejos: sale menos")]),
    g(DC, [o("BPD-D", "salida con criterio tras robar"), o("CD-D", "el sobrio junto al de salida"), o("BPD-St", "sale a robar por el lado de la presión"), o("CD-Co", "en Cubrir contra puntas rápidos")]),
    g(FB, [o("FB-S", "sube sin desordenar"), o("WB-S", "más alto para cerrar la banda en la presión"), o("IWB-S", "pivote extra al robar"), o("FB-A", "si el extremo de su lado entra por dentro")]),
    g(WB, [o("CWB-A", "toda la banda arriba"), o("WB-S", "equilibrio"), o("WB-A", "corredor por fuera")]),
    g(DM, [o("BWM-D", "recuperador: muerde y cubre"), o("DM-D", "contención sobria"), o("DM-S", "pivote que apoya la salida"), o("HB-D", "si los dos laterales suben")]),
    g(MC, [o("B2B-S", "piernas de área a área"), o("BWM-S", "presión constante"), o("CM-S", "enlace"), o("MEZ-A", "llegada al área"), o("CAR-S", "si es un rombo o falta anchura")]),
    g(MRL, [o("WM-S", "presiona y cubre al lateral"), o("DW-S", "extremo defensivo que trabaja"), o("W-A", "corredor por fuera al robar")]),
    g(AMC, [o("AM-A", "llega al área en la transición"), o("AM-S", "conecta la presión y la salida"), o("SS-A", "segundo punta que presiona")]),
    g(AMRL, [o("IF-A", "remata las transiciones"), o("IW-S", "entra con balón y combina"), o("W-A", "corre por fuera"), o("RMD-A", "solo si el otro lado da anchura")]),
    g(ST, [o("PF-S", "presiona y descarga"), o("PF-A", "presiona y remata"), o("AF-A", "ataca el espacio tras el robo"), o("DLF-S", "enlace si hay dos puntas")]),
  ],
  contra: [
    g(GK, [o("GK-D", "clásico: sin salidas lejos del área"), o("SK-D", "si la línea es media y el portero rápido")]),
    g(DC, [o("CD-D", "sobrio, sin riesgo"), o("BPD-D", "inicia la contra con el primer pase (mejor que el Central práctico)"), o("NCB-D", "solo en ligas bajas o con centrales de pie malo"), o("CD-Co", "en Cubrir contra puntas rápidos")]),
    g(FB, [o("FB-D", "no se aventura: ligas menores"), o("FB-S", "sube con criterio"), o("WB-S", "salida de la contra por fuera"), o("NFB-D", "si el lateral es muy flojo con balón")]),
    g(WB, [o("WB-S", "sube al contra y vuelve"), o("CWB-A", "élite: salida y fuente de centros"), o("WB-D", "bloque bajo: solo defiende")]),
    g(DM, [o("BWM-S", "destructor que mantiene posición"), o("DM-D", "ancla móvil"), o("A-D", "solo cubre"), o("DLP-D", "si la salida es con pase largo desde la base"), o("REG-S", "variante con un pasador de élite")]),
    g(MC, [o("B2B-S", "enlace entre defensa y ataque"), o("CM-A", "llega desde atrás"), o("CM-D", "el compañero que se queda"), o("BWM-S", "muerde en el medio"), o("CAR-S", "en un rombo o 4-4-2 estrecho")]),
    g(MRL, [o("WM-S", "interior que se mete y cubre"), o("W-S", "estira al contra"), o("DW-D", "bloque bajo: trabaja y no sube"), o("WM-D", "defiende la banda")]),
    g(AMC, [o("AM-A", "el 10 que conecta la transición"), o("SS-A", "segundo punta"), o("AM-S", "más apoyo que llegada")]),
    g(AMRL, [o("IF-S", "entra rápido y con tiro"), o("IW-S", "entra con balón"), o("W-A", "corre por fuera al espacio"), o("IF-A", "rematador si el lateral dobla")]),
    g(ST, [o("PF-S", "acosa a los centrales y facilita robar (DarkHorse)"), o("AF-A", "corre al espacio"), o("DLF-S", "baja a enlazar con dos puntas"), o("P-A", "solo remata: si el segundo punta hace el resto"), o("TF-S", "referencia para saltar líneas")]),
  ],
  directo: [
    g(GK, [o("GK-D", "clásico que chuta en largo"), o("SK-D", "si tiene pie y la línea no es baja")]),
    g(DC, [o("CD-D", "sobrio"), o("NCB-D", "despeja y ya"), o("BPD-D", "si un central tiene pase largo: el lanzador"), o("WCB-S", "central lateral que conduce (Conte)")]),
    g(FB, [o("FB-S", "sube y centra"), o("FB-A", "dobla por fuera"), o("WB-S", "más alto"), o("NFB-D", "solo defiende")]),
    g(WB, [o("CWB-A", "toda la banda y centros"), o("WB-A", "corre y centra"), o("WB-S", "equilibrio")]),
    g(DM, [o("DM-D", "cubre a los laterales que suben"), o("A-D", "ancla"), o("DLP-D", "pase largo desde la base"), o("BWM-D", "muerde")]),
    g(MC, [o("CM-S", "enlace sin florituras"), o("B2B-S", "llega a por segundas jugadas"), o("CM-D", "se queda"), o("MEZ-S", "llegada desde el medio a la banda"), o("BWM-S", "presiona")]),
    g(MRL, [o("W-S", "centra desde banda"), o("W-A", "llega a la línea de fondo"), o("WM-S", "interior que cubre"), o("DW-S", "trabaja la banda")]),
    g(AMC, [o("AM-A", "remata segundas jugadas"), o("SS-A", "segundo punta"), o("TQ-A", "solo con referencia que le libere")]),
    g(AMRL, [o("W-A", "desborda y centra"), o("W-S", "centra y cubre"), o("IF-A", "remata los centros del otro lado")]),
    g(ST, [o("TF-S", "referencia que aguanta y descarga"), o("TF-A", "referencia que remata"), o("AF-A", "corre al segundo balón"), o("DLF-S", "el móvil junto al referencia"), o("CF-A", "grande y completo")]),
  ],
};

// ---------------------------------------------------------------------------
// Por estilo (solo lo que difiere de su familia)
// ---------------------------------------------------------------------------

const STYLE_OPTIONS: Record<string, RoleOptionGroup[]> = {
  "juego-posicion": [
    g(GK, [o("SK-S", "portero de cierre: 04texag y Exeter"), o("SK-D", "si no es bueno con el pie")]),
    g(DC, [o("BPD-St", "Tapón por el lado de la sobrecarga: roba pronto"), o("BPD-Co", "Cubrir por el lado débil: recupera"), o("CD-D", "contra dos puntas: los dos en defender y sin Adelantarse (Exeter: central puro con pase corto)"), o("BPD-D", "salida sin subir la línea")], "uno en Tapón y otro en Cubrir; contra dos puntas, los dos en defender"),
    g(FB, [o("IFB-D", "el más estable para la cuña: tercer central"), o("FB-S", "en apoyo con «Mantener posición» + «Cerrarse»: canaliza por un lado sin empujar al pivote"), o("IWB-S", "fluidez, pero en FM24 empuja al pivote y escora el medio (dos invertidos equilibran)"), o("CWB-S", "el lado de la anchura si el extremo de ese lado entra (Exeter: el «Alves»)")], "uno cierra, el otro puede dar la anchura"),
    g(WB, [o("CWB-S", "da la anchura en la línea de tres"), o("IWB-S", "salida 3-2 desde el carril")]),
    g(DM, [o("DM-S", "mejor que el organizador retrasado: no roba espacio al Mezzala"), o("HB-D", "salida 3-2 si los laterales suben (04texag 3 box 3)"), o("DLP-D", "Exeter: con «Mantener posición»"), o("BWM-D", "04texag en su 4-3-3 final: muerde delante de la defensa")]),
    g(MC, [o("MEZ-S", "el foco: crea desde el medio espacio"), o("MEZ-A", "el foco: llega al área"), o("RPM-S", "04texag: organizador móvil junto al Mezzala (nunca en la base)"), o("CM-S", "el sobrio que sostiene la forma"), o("AP-S", "creador entre líneas")], "un Mezzala como foco y un compañero que sostenga la estructura"),
    g(MRL, [o("W-S", "muy abierto con «Recortar hacia dentro»: clava al lateral"), o("WM-S", "si el lateral de ese lado da la anchura")]),
    g(AMC, [o("AM-S", "área de ayuda mutua: «Variar la posición» + «Moverse entre líneas»"), o("AP-S", "si el balón debe pasar por él"), o("AM-A", "más llegada que creación")]),
    g(AMRL, [o("W-S", "extremo puro muy abierto con «Recortar hacia dentro»"), o("W-A", "el mismo, con más llegada"), o("IF-S", "Exeter: delantero interior en apoyo por un lado"), o("IW-S", "si el lateral de ese lado dobla por fuera")], "al menos un extremo puro que aguante abierto"),
    g(ST, [o("AF-A", "clava a los centrales para que no compriman (Exeter lo prefirió al Falso nueve)"), o("DLF-A", "04texag: segundo delantero en ataque"), o("DLF-S", "baja a enlazar"), o("F9-S", "solo con dos extremos que ataquen el hueco que deja")]),
  ],
  "cebar-presion": [
    g(GK, [o("SK-S", "tercer central en la salida: el cebo empieza en él"), o("SK-D", "si la Serenidad no llega a 14")]),
    g(DC, [o("BPD-D", "salida con criterio bajo presión"), o("CD-D", "el compañero: pase corto y seguro")]),
    g(FB, [o("FB-S", "abierto para dar la salida 4+2"), o("WB-S", "más alto cuando el rival salta")]),
    g(DM, [o("DLP-D", "organizador retrasado que provoca el salto"), o("DM-S", "el segundo pivote con pase corto"), o("HB-D", "baja entre centrales para hacer la línea de tres")]),
    g(MC, [o("DLP-S", "organizador en el doble pivote"), o("CM-S", "pase corto y apoyo"), o("B2B-S", "el corredor cuando se rompe la presión")]),
    g(AMC, [o("AM-S", "libre, con «Variar la posición»: rompe la presión por dentro"), o("AP-S", "si el balón pasa por él tras el cebo")]),
    g(AMRL, [o("W-S", "abiertos: estiran al rival cuando salta"), o("IW-S", "entra con balón en el espacio que deja la presión"), o("IF-A", "remata la transición")]),
    g(ST, [o("PF-S", "fija a los centrales y presiona al perder"), o("DLF-S", "baja a enlazar"), o("AF-A", "corre al espacio cuando la presión se rompe")]),
  ],
  relacionismo: [
    g(GK, [o("SK-S", "con Excentricidad: inicia contraataques"), o("SK-A", "si es muy bueno con el pie")]),
    g(DC, [o("BPD-D", "saca el balón jugado"), o("CD-D", "el sobrio con Serenidad y Decisiones")]),
    g(FB, [o("CWB-S", "carrilero completo con «Regatear más»: inclina el campo"), o("WB-S", "carrilero en apoyo con presión alta"), o("FB-A", "sube en cuanto puede")]),
    g(WB, [o("CWB-S", "conduce y combina"), o("WB-S", "apoyo cercano al portador")]),
    g(DM, [o("RPM-S", "organizador móvil: proximidad al balón"), o("REG-S", "regista"), o("DLP-S", "si hace falta alguien que dicte el ritmo")]),
    g(MC, [o("B2B-S", "todoterreno que pasa y corre"), o("RPM-S", "organizador móvil"), o("MEZ-S", "interior que se acerca al balón"), o("CAR-S", "en rombo")]),
    g(MRL, [o("WM-S", "interior con «Variar la posición»"), o("WP-S", "organizador en banda: la pared")]),
    g(AMC, [o("AM-S", "se mete en los canales, corre con balón"), o("AP-S", "creador cercano"), o("SS-A", "segundo punta que rota con el nueve")]),
    g(AMRL, [o("IF-S", "corre hacia el centro"), o("IW-S", "conduce hacia dentro"), o("W-S", "estira cuando el campo se inclina al otro lado")]),
    g(ST, [o("CF-S", "hace de todo y rota"), o("F9-S", "baja y libera"), o("DLF-S", "enlaza")]),
  ],
  "futbol-total": [
    g(GK, [o("SK-A", "portero de cierre en ataque"), o("SK-S", "si no es rápido")]),
    g(DC, [o("L-S", "líbero en apoyo entre dos centrales en Cubrir"), o("CD-Co", "los de Cubrir"), o("BPD-Co", "en Cubrir con toque")], "un líbero y dos coberturas"),
    g(FB, [o("CWB-A", "el lateral es un extremo más"), o("WB-A", "sube toda la banda"), o("IWB-S", "si el central sube: cierra por dentro")]),
    g(WB, [o("CWB-A", "extremo desde atrás"), o("WB-S", "equilibrio")]),
    g(DM, [o("DLP-D", "organizador retrasado en defender: el ancla del rombo"), o("RPM-S", "móvil si hay otro pivote")]),
    g(MC, [o("MEZ-S", "rota con los extremos"), o("B2B-S", "área a área"), o("AP-S", "creador"), o("CM-S", "el que sostiene")]),
    g(AMC, [o("AP-A", "organizador adelantado"), o("EG-S", "enganche"), o("AM-A", "llega")]),
    g(AMRL, [o("W-A", "extremos en ataque que rotan"), o("IW-A", "entra con balón"), o("IF-A", "entra a rematar")]),
    g(ST, [o("F9-S", "falso nueve: todos ocupan su espacio"), o("CF-S", "completo que baja y rota")]),
  ],
  "presion-hombre": [
    g(GK, [o("SK-S", "cubre la espalda de la línea muy alta"), o("SK-A", "si es muy rápido")]),
    g(DC, [o("BPD-D", "Defensa con toque que se abre"), o("CD-D", "el que marca al hombre"), o("CD-St", "sale a por su par")]),
    g(FB, [o("FB-A", "por dentro, hace de interior (Bielsa)"), o("WB-S", "el otro lado: carrilero"), o("IWB-S", "se mete al medio")], "un lateral por dentro y un carrilero por el otro lado"),
    g(WB, [o("WB-S", "carrilero que marca y sube"), o("CWB-A", "toda la banda")]),
    g(DM, [o("HB-D", "medio cierre: forma la línea de tres"), o("DM-D", "si no hay medio cierre"), o("A-D", "solo cubre el +1")]),
    g(MC, [o("B2B-S", "todoterreno en apoyo"), o("CM-A", "tercer hombre que llega"), o("BWM-S", "muerde a su par"), o("MEZ-A", "llega al área")]),
    g(MRL, [o("WM-S", "interior que marca a su par"), o("DW-S", "extremo defensivo")]),
    g(AMC, [o("AM-A", "el enganche que llega"), o("SS-A", "segundo punta"), o("AP-S", "creador")]),
    g(AMRL, [o("IF-A", "extremos interiores que rotan"), o("IW-S", "entra con balón"), o("W-A", "por fuera")]),
    g(ST, [o("PF-S", "presiona y descarga"), o("PF-A", "presiona y remata"), o("AF-A", "corre al espacio")]),
  ],
  "gegenpress-vertical": [
    g(GK, [o("SK-S", "cubre la línea muy alta"), o("SK-D", "si la línea baja un punto")]),
    g(DC, [o("BPD-D", "salida vertical"), o("CD-D", "sobrio"), o("CD-Co", "en Cubrir contra puntas rápidos")]),
    g(FB, [o("CWB-A", "toda la anchura: no hay extremos"), o("WB-A", "corre la banda"), o("FB-A", "si la Resistencia no llega")], "sin extremos, los laterales son la única anchura"),
    g(WB, [o("CWB-A", "toda la banda"), o("WB-A", "corredor")]),
    g(DM, [o("BWM-S", "recuperador que muerde"), o("REG-S", "regista con «Entrar más duro»"), o("DLP-D", "si hace falta un pasador"), o("DM-D", "contención")], "un recuperador y un regista"),
    g(MC, [o("BWM-S", "recuperador"), o("B2B-S", "piernas"), o("AP-S", "interior por dentro (4-2-2-2)"), o("CM-A", "llega desde atrás")]),
    g(MRL, [o("WM-S", "interior estrecho que presiona"), o("WP-S", "organizador por dentro")]),
    g(AMC, [o("AM-A", "llega al área"), o("SS-A", "segundo punta"), o("AP-A", "creador que remata")]),
    g(AMRL, [o("IW-S", "interior estrecho con balón"), o("IF-A", "remata"), o("AP-S", "los «10» del 4-2-2-2")]),
    g(ST, [o("PF-A", "presionante que remata"), o("PF-S", "presionante que descarga"), o("AF-A", "corre al espacio")], "dos puntas presionantes: uno en apoyo y otro en ataque"),
  ],
  "presion-dos-mediapuntas": [
    g(GK, [o("SK-S", "salida por el centro"), o("SK-D", "si no tiene pie")]),
    g(DC, [o("BPD-D", "el del medio: inicia el 3+2"), o("WCB-S", "los laterales de la línea de tres: se abren y conducen"), o("CD-D", "sobrio"), o("CD-Co", "en Cubrir si hay un punta rápido")], "central con salida en el medio y dos que se abren"),
    g(WB, [o("CWB-A", "carrilero que hace de extremo (con «Centrar menos» uno de ellos)"), o("WB-S", "el otro lado, más contenido"), o("CWB-S", "combina por dentro")], "uno en ataque y otro en apoyo"),
    g(FB, [o("WB-S", "carrilero desde la línea de cuatro"), o("CWB-A", "extremo desde atrás")]),
    g(DM, [o("DLP-D", "organizador retrasado en la base del 3+2"), o("DM-D", "contención"), o("HB-D", "forma la línea de tres si juegas con cuatro")]),
    g(MC, [o("B2B-S", "el que llega junto al organizador"), o("DLP-D", "organizador en el doble pivote"), o("CM-S", "enlace"), o("BWM-S", "muerde")]),
    g(AMC, [o("AM-S", "mediapunta con «Variar la posición»"), o("AM-A", "el que llega al área"), o("AP-S", "creador"), o("SS-A", "segundo punta")], "dos mediapuntas: uno en apoyo y otro en ataque"),
    g(AMRL, [o("AP-S", "los 10 en los medios espacios (si son extremos)"), o("IF-S", "entra al medio espacio"), o("IW-S", "conduce hacia dentro")]),
    g(ST, [o("CF-S", "completo que enlaza con los dos 10"), o("DLF-S", "baja a enlazar"), o("PF-S", "presiona"), o("AF-A", "corre si los 10 crean")]),
  ],
  "control-directo": [
    g(GK, [o("SK-S", "sale y participa"), o("SK-D", "si no tiene pie")]),
    g(DC, [o("CD-D", "con «Pases más directos»: licencia para el pase largo"), o("BPD-D", "el de salida corta"), o("CD-Co", "en Cubrir")], "uno con pase directo y otro con salida"),
    g(FB, [o("FB-D", "en defender con «Abrirse a banda»: línea de cuatro muy abierta"), o("FB-S", "algo más alto si el extremo de su lado entra"), o("IWB-D", "si hace falta un pivote más")]),
    g(DM, [o("DM-S", "pivote con pase corto"), o("REG-S", "regista con «Regatear más»: conduce"), o("DLP-S", "organizador"), o("DM-D", "contención")], "uno corto y otro que conduce"),
    g(MC, [o("DLP-S", "organizador"), o("MEZ-S", "interior que conduce hacia dentro"), o("B2B-S", "piernas"), o("CM-S", "enlace")]),
    g(AMC, [o("AM-S", "al medio espacio derecho"), o("AP-S", "creador"), o("AM-A", "llega")]),
    g(AMRL, [o("W-A", "extremo puro hasta la línea de fondo"), o("IF-S", "el otro lado por dentro"), o("IW-S", "conduce hacia dentro")], "un extremo puro y un interior"),
    g(ST, [o("PF-A", "presionante en ataque"), o("AF-A", "corre al espacio"), o("CF-A", "completo")]),
  ],
  "rombo-pragmatico": [
    g(GK, [o("GK-D", "clásico"), o("SK-D", "si tiene pie")]),
    g(DC, [o("CD-D", "sobrio"), o("BPD-D", "salida"), o("CD-Co", "en Cubrir")]),
    g(FB, [o("WB-S", "los laterales son la anchura"), o("WB-A", "el lado que dobla más"), o("FB-A", "sube y dobla"), o("FB-S", "el más contenido")], "sin extremos, los laterales dan la anchura"),
    g(WB, [o("WB-A", "toda la banda"), o("WB-S", "equilibrio")]),
    g(DM, [o("DLP-D", "organizador en la base del rombo"), o("REG-S", "regista"), o("A-D", "si el enganche no ayuda atrás")]),
    g(MC, [o("CAR-S", "interior mixto: da anchura desde el rombo"), o("MEZ-S", "interior que se abre"), o("B2B-S", "piernas"), o("CM-S", "enlace")], "un interior mixto y un mezzala"),
    g(AMC, [o("AM-A", "el enganche que llega"), o("EG-S", "enganche puro"), o("SS-A", "delantero sorpresa"), o("AP-A", "creador que remata")]),
    g(ST, [o("AF-A", "corre al espacio"), o("DLF-S", "baja a enlazar"), o("CF-S", "completo"), o("P-A", "rematador si el otro hace el resto")], "uno que corre y otro que enlaza"),
  ],
  cholismo: [
    g(GK, [o("GK-D", "clásico: distribuye a los laterales"), o("SK-D", "si tiene pie")]),
    g(DC, [o("CD-D", "los dos en defender"), o("NCB-D", "si el pie es muy malo"), o("BPD-D", "solo si uno tiene pase largo")], "dos centrales en defender"),
    g(FB, [o("WB-S", "carrilero en apoyo que desdobla"), o("FB-S", "lateral que sube con criterio"), o("FB-D", "contra extremos de élite")]),
    g(WB, [o("WB-S", "desdobla"), o("WB-D", "bloque bajo")]),
    g(DM, [o("DM-D", "mediocentro en defender"), o("BWM-D", "muerde"), o("A-D", "ancla")]),
    g(MC, [o("CM-D", "mediocentro en defender"), o("B2B-S", "todoterreno"), o("BWM-S", "recuperador"), o("CM-S", "enlace")], "uno en defender y un todoterreno"),
    g(MRL, [o("WM-S", "interior en apoyo por dentro: el «hack» del 4-4-2"), o("WM-D", "contra extremos peligrosos"), o("DW-S", "extremo defensivo"), o("W-S", "si el lateral no desdobla")]),
    g(AMC, [o("SS-A", "segundo punta"), o("AM-S", "mediapunta que apoya"), o("AM-A", "el Griezmann del 5-2-1-2")]),
    g(AMRL, [o("IF-S", "por dentro, deja la banda al lateral"), o("IW-S", "conduce hacia dentro"), o("IW-A", "conduce y remata")]),
    g(ST, [o("DLF-S", "segundo delantero que enlaza"), o("AF-A", "el rápido"), o("P-A", "ariete"), o("PF-S", "presiona a los centrales")], "un retrasado y un rápido"),
  ],
  "contra-directo": [
    g(GK, [o("GK-D", "distribuye con rapidez"), o("SK-D", "si la línea es media")]),
    g(DC, [o("CD-D", "central en defender"), o("BPD-D", "con toque: mejor que el Central práctico, no devuelve el balón precipitadamente"), o("CD-Co", "en Cubrir contra puntas rápidos")], "un central puro y uno con salida"),
    g(FB, [o("FB-D", "ligas menores: no se aventura"), o("CWB-A", "élite: salida y fuente de centros"), o("WB-S", "término medio"), o("FB-S", "sube con criterio")], "en defender en ligas menores; completos en la élite"),
    g(WB, [o("CWB-A", "salida y centros"), o("WB-S", "equilibrio"), o("WB-D", "bloque bajo")]),
    g(DM, [o("BWM-S", "recuperador como destructor que mantiene posición"), o("DM-D", "un MCD de calidad (4-2-3-1)"), o("SV-S", "segundo volante como enlace desde el pivote"), o("REG-S", "variante con un pasador"), o("A-D", "ancla en el 4-1-4-1")]),
    g(MC, [o("B2B-S", "enlace"), o("CM-A", "el que llega desde atrás"), o("BWM-S", "muerde"), o("CM-D", "el que se queda")]),
    g(MRL, [o("WM-S", "cerca de los laterales: bloque central impenetrable (4-1-4-1)"), o("W-S", "estira al contra"), o("WM-D", "trabaja")]),
    g(AMC, [o("AM-A", "el mediapunta tipo Griezmann"), o("SS-A", "segundo punta"), o("AM-S", "apoyo")]),
    g(AMRL, [o("W-A", "extremos altos y abiertos (4-3-3 directo)"), o("IF-A", "remata"), o("IW-S", "entra con balón")]),
    g(ST, [o("PF-S", "presionante: acosa a la defensa y facilita robar en zona media"), o("PF-A", "presionante que remata"), o("AF-A", "corre al espacio"), o("DLF-S", "el segundo punta que enlaza")], "el presionante por delante del avanzado"),
  ],
  reactivo: [
    g(GK, [o("GK-D", "clásico"), o("SK-D", "si el bloque sube contra rivales inferiores")]),
    g(DC, [o("CD-D", "con pase corto y «Tomar menos riesgos»"), o("BPD-D", "solo si el pie es muy bueno"), o("CD-Co", "en Cubrir")]),
    g(FB, [o("FB-S", "sube con criterio"), o("FB-D", "contra grandes: no se aventura"), o("WB-S", "contra inferiores")]),
    g(DM, [o("DM-D", "doble pivote de contención"), o("DLP-D", "el que saca el balón del doble pivote"), o("A-D", "ancla"), o("HB-D", "medio cierre")], "dos que no dejan espacio a la espalda"),
    g(MC, [o("CM-D", "en defender"), o("DLP-D", "organizador en defender"), o("BWM-D", "recuperador"), o("B2B-S", "solo contra inferiores")]),
    g(AMC, [o("AM-A", "el 10 (Sneijder): «Tomar más riesgos», «Regatear más», canales"), o("AP-A", "si es más pasador que llegador"), o("SS-A", "segundo punta")]),
    g(AMRL, [o("IF-S", "los dos rápidos: «Disparar más», «Subir más», «Marcajes más férreos»"), o("IW-S", "entra con balón"), o("W-A", "por fuera si el lateral no sube")], "dos extremos interiores rápidos"),
    g(ST, [o("AF-A", "corre al espacio"), o("DLF-S", "aguanta y enlaza con el 10"), o("PF-S", "presiona"), o("TF-S", "referencia contra grandes")]),
  ],
  "carrileros-directos": [
    g(GK, [o("GK-D", "clásico"), o("SK-D", "si tiene pie")]),
    g(DC, [o("WCB-S", "central lateral que conduce y saca el balón"), o("BPD-D", "el del medio: inicia"), o("CD-D", "sobrio"), o("CD-Co", "en Cubrir en el medio")], "el del medio sobrio o con salida; los de fuera, abiertos"),
    g(WB, [o("CWB-A", "dos carrileros completos: toda la anchura"), o("WB-A", "corre y centra"), o("CWB-S", "el lado más contenido")], "los carrileros son extremos y laterales a la vez"),
    g(FB, [o("CWB-A", "toda la banda"), o("WB-A", "corre y centra")]),
    g(DM, [o("DLP-D", "organizador en la base"), o("DM-D", "contención"), o("REG-S", "regista")]),
    g(MC, [o("CM-S", "enlace"), o("MEZ-S", "interior que llega al hueco tras el carrilero"), o("B2B-S", "piernas"), o("CM-D", "el que se queda")]),
    g(AMC, [o("SS-A", "segundo punta tras el referencia"), o("AM-A", "interior que llega"), o("AM-S", "apoyo")]),
    g(ST, [o("TF-S", "referencia que aguanta"), o("DLF-S", "el móvil junto a la referencia"), o("AF-A", "corre"), o("CF-A", "completo")], "referencia + móvil"),
  ],
  "tiki-vertical": [
    g(DM, [o("DLP-D", "organizador retrasado en defender: todo pasa por él"), o("REG-S", "regista"), o("DM-S", "si hay otro organizador")]),
    g(FB, [o("FB-S", "en apoyo con «Abrirse a banda»: da la anchura"), o("WB-S", "más alto"), o("FB-A", "si los extremos entran")]),
    g(MC, [o("MEZ-S", "interior"), o("B2B-S", "piernas"), o("CM-S", "enlace")]),
    g(AMRL, [o("IF-A", "delantero interior en ataque: entra a rematar"), o("IW-S", "conduce hacia dentro"), o("IF-S", "entra y combina")]),
    g(ST, [o("CF-S", "completo en apoyo"), o("F9-S", "falso nueve"), o("DLF-S", "enlaza")]),
  ],
  "tiki-taka": [
    g(DM, [o("RPM-S", "organizador móvil"), o("DLP-D", "organizador retrasado"), o("REG-S", "regista")]),
    g(ST, [o("F9-S", "falso nueve"), o("CF-S", "completo en apoyo"), o("DLF-S", "enlaza")]),
  ],
  posesion: [
    g(ST, [o("AF-A", "Exeter: clava a los centrales, mejor que el Falso nueve en ligas menores"), o("DLF-S", "enlaza"), o("CF-S", "completo"), o("F9-S", "en la élite")]),
  ],
  gegenpress: [
    g(ST, [o("PF-A", "presionante en ataque"), o("PF-S", "presionante en apoyo"), o("AF-A", "corre al espacio")]),
    g(DM, [o("BWM-D", "recuperador"), o("DM-D", "contención"), o("DLP-D", "solo uno: máximo un organizador")]),
  ],
  catenaccio: [
    g(DC, [o("L-D", "líbero detrás de la línea"), o("NCB-D", "marcadores"), o("CD-D", "marcador"), o("WCB-D", "abierto en defensa de tres")], "un líbero y marcadores"),
    g(WB, [o("WB-S", "carrilero que sube al contra"), o("CWB-A", "si hay tres centrales")]),
  ],
  autobus: [
    g(DM, [o("A-D", "ancla"), o("DM-D", "contención"), o("HB-D", "entre centrales")]),
    g(MRL, [o("DW-D", "extremo defensivo"), o("WM-D", "trabaja")]),
    g(ST, [o("PF-D", "presionante en defender: la primera línea del bloque"), o("DLF-S", "aguanta"), o("TF-S", "referencia para respirar")]),
  ],
  "route-one": [
    g(ST, [o("TF-S", "referencia que descarga"), o("TF-A", "referencia que remata"), o("AF-A", "el rápido a por el segundo balón"), o("PF-S", "presiona la salida rival y descarga")], "referencia obligatoria"),
  ],
  "bloque-bajo": [
    g(ST, [o("AF-A", "corre al espacio"), o("P-A", "ariete"), o("DLF-S", "aguanta"), o("TF-S", "referencia")]),
  ],
};

// ---------------------------------------------------------------------------
// Resolución contra la táctica y la plantilla
// ---------------------------------------------------------------------------

export interface RoleRecommendation {
  slotId: string;
  slot: PositionSlot;
  note?: string;
  current: RoleDef;
  /** true si el rol actual está entre las opciones del estilo. */
  currentOk: boolean;
  options: {
    role: RoleDef;
    why: string;
    /** Puntuación del titular actual del hueco en ese rol. */
    starter: number | null;
    /** Mejor jugador de la plantilla para ese rol en ese hueco. */
    best: { player: Player; score: number } | null;
  }[];
}

/** Grupos de opciones que aplican a un estilo (propios + heredados de la familia). */
export function roleOptionsFor(style: StylePreset): RoleOptionGroup[] {
  const own = STYLE_OPTIONS[style.id] ?? [];
  const covered = new Set(own.flatMap((x) => x.slots));
  return [...own, ...FAMILY_OPTIONS[style.family].filter((x) => !x.slots.some((s) => covered.has(s)))];
}

function expand(opt: RoleOption, slot: PositionSlot): { role: RoleDef; why: string }[] {
  if (ROLE_BY_ID[opt.role]) {
    const r = ROLE_BY_ID[opt.role];
    return r.positions.includes(slot) ? [{ role: r, why: opt.why }] : [];
  }
  return ROLES.filter((r) => r.code === opt.role && r.positions.includes(slot)).map((r) => ({ role: r, why: opt.why }));
}

/**
 * Roles recomendados por el estilo para cada hueco de la táctica, con la
 * puntuación del titular y del mejor candidato de la plantilla en cada opción.
 */
export function recommendRoles(styleId: string | null | undefined, lineup: LineupResult, pool: Player[]): RoleRecommendation[] {
  const style = STYLE_BY_ID[styleId ?? ""];
  if (!style) return [];
  const groups = roleOptionsFor(style);
  return lineup.slots.map((s) => {
    const slot = s.slot.slot;
    const grp = groups.find((x) => x.slots.includes(slot));
    const seen = new Set<string>();
    const opts = (grp?.options ?? []).flatMap((opt) => expand(opt, slot)).filter((x) => (seen.has(x.role.id) ? false : (seen.add(x.role.id), true)));
    const options = opts.map(({ role, why }) => {
      const starter = s.starter ? scoreRole(s.starter.player, role).score * s.starter.familiarity : null;
      let best: { player: Player; score: number } | null = null;
      for (const p of pool) {
        const fam = familiarity(p, slot);
        if (fam < 0.85 || p.isGoalkeeper !== (slot === "GK")) continue;
        const sc = scoreRole(p, role).score * fam;
        if (!best || sc > best.score) best = { player: p, score: sc };
      }
      return { role, why, starter, best };
    });
    return {
      slotId: s.slot.id,
      slot,
      note: grp?.note,
      current: s.role,
      currentOk: options.some((o) => o.role.id === s.role.id) || rolesForPosition(slot).length === 0,
      options,
    };
  });
}

/** Ids de rol recomendados por el estilo para un hueco (para marcar el desplegable). */
export function recommendedRoleIds(styleId: string | null | undefined, slot: PositionSlot): Set<string> {
  const style = STYLE_BY_ID[styleId ?? ""];
  if (!style) return new Set();
  const grp = roleOptionsFor(style).find((x) => x.slots.includes(slot));
  return new Set((grp?.options ?? []).flatMap((opt) => expand(opt, slot)).map((x) => x.role.id));
}
