"use client";

import { useMemo } from "react";
import { ATTR_BY_KEY, type AttrKey } from "@/lib/fm/attributes";
import { SPECIALIST_GROUP_LABEL, rankSpecialists, specialistBreakdown, type SpecialistDef, type SpecialistGroup } from "@/lib/fm/specialists";
import type { Player } from "@/lib/fm/types";
import { attrColor } from "./AttrCell";

const weightLabel = (k: string) => (k === "height" ? "Altura" : k === "punInv" ? "20 − Puños" : ATTR_BY_KEY[k as AttrKey]?.es ?? k);
const weightsText = (def: SpecialistDef) => def.weights.map(([k, w]) => `${weightLabel(k)} ${w}`).join(" · ");

/** Ranking «quién es el mejor de la plantilla en…» con los índices del Excel. */
export function SpecialistsPanel({ players, groups, highlight, highlightLabel = "XI", n = 3 }: {
  players: Player[];
  groups: SpecialistGroup[];
  /** Uids a marcar (por ejemplo, los titulares). */
  highlight?: Set<string>;
  highlightLabel?: string;
  n?: number;
}) {
  const ranks = useMemo(() => groups.map((g) => ({ g, list: rankSpecialists(players, n, g) })), [players, groups, n]);
  return (
    <div className="space-y-3">
      {ranks.map(({ g, list }) => (
        <div key={g}>
          {groups.length > 1 && <h3 className="text-sm font-medium mb-1">{SPECIALIST_GROUP_LABEL[g]}</h3>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {list.map(({ def, top }) => (
              <div key={def.id} className="bg-surface border border-border rounded-md p-2 text-xs">
                <div className="font-medium mb-0.5 cursor-help" title={`Pesos: ${weightsText(def)}`}>{def.es}</div>
                {top.length === 0 && <p className="text-muted">Nadie con los atributos necesarios.</p>}
                {top.map((t, i) => (
                  <div key={t.player.uid} className="flex justify-between gap-2" title={specialistBreakdown(t.player, def.id, 4).map((b) => `${weightLabel(b.label)} ${b.value == null ? "?" : Math.round(b.value)}`).join(", ")}>
                    <span className="truncate">
                      {i + 1}. {t.player.name}
                      {highlight?.has(t.player.uid) && <span className="text-muted"> · {highlightLabel}</span>}
                    </span>
                    <span className={attrColor(t.value)}>{t.value.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
