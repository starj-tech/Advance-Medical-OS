"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Stethoscope } from "lucide-react";
import type { Encounter, Diagnosis, EncounterType } from "@/server/clinical/encounters";
import { icd10 } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const TYPE_LABEL: Record<EncounterType, string> = {
  outpatient: "Rawat Jalan",
  inpatient: "Rawat Inap",
  ed: "IGD",
  odc: "ODC",
};

const ICD_CODES = Object.keys(icd10);

export function EncountersPanel({ patientId }: { patientId: string }) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [diagnoses, setDiagnoses] = useState<Record<string, Diagnosis[]>>({});
  const [newType, setNewType] = useState<EncounterType>("outpatient");
  const [dxCode, setDxCode] = useState(ICD_CODES[0]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/encounters?patientId=${encodeURIComponent(patientId)}`);
    const data: Encounter[] = res.ok ? await res.json() : [];
    setEncounters(data);
    setLoading(false);
  }, [patientId]);
  useEffect(() => {
    // Async data load: state is set after `await`, not synchronously, so the
    // set-state-in-effect rule is a false positive here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const loadDiagnoses = async (encounterId: string) => {
    const res = await fetch(`/api/encounters/${encounterId}/diagnoses`);
    if (!res.ok) return;
    const data: Diagnosis[] = await res.json();
    setDiagnoses((m) => ({ ...m, [encounterId]: data }));
  };

  const toggle = (id: string) => {
    const next = open === id ? null : id;
    setOpen(next);
    if (next && !diagnoses[next]) void loadDiagnoses(next);
  };

  const createEncounter = async () => {
    const res = await fetch("/api/encounters", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patientId, type: newType }),
    });
    if (res.ok) await refresh();
  };

  const addDiagnosis = async (encounterId: string) => {
    const res = await fetch(`/api/encounters/${encounterId}/diagnoses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: dxCode, description: icd10[dxCode], rank: "secondary" }),
    });
    if (res.ok) await loadDiagnoses(encounterId);
  };

  const finish = async (encounterId: string) => {
    const res = await fetch(`/api/encounters/${encounterId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "finished" }),
    });
    if (res.ok) await refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="size-4 text-primary" />
          Encounters
        </CardTitle>
        <Can permission="encounter:write">
          <div className="flex items-center gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as EncounterType)}
              className={inputCls}
              aria-label="Encounter type"
            >
              {(Object.keys(TYPE_LABEL) as EncounterType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
            <Button size="sm" onClick={createEncounter}>
              <Plus className="size-4" /> Encounter
            </Button>
          </div>
        </Can>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="px-5 py-6 text-center text-sm text-muted-foreground">Memuat…</p>
        ) : encounters.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-muted-foreground">
            Belum ada encounter untuk pasien ini.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {encounters.map((e) => {
              const isOpen = open === e.id;
              const dx = diagnoses[e.id] ?? [];
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => toggle(e.id)}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-foreground/[0.02]"
                  >
                    {isOpen ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">{TYPE_LABEL[e.type]}</span>
                    <Badge variant={e.status === "in_progress" ? "success" : "muted"}>
                      {e.status.replace("_", " ")}
                    </Badge>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDate(e.startedAt)}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="space-y-3 bg-foreground/[0.015] px-5 py-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Diagnosis (ICD-10)
                        </span>
                        {e.status === "in_progress" && (
                          <Can permission="encounter:write">
                            <Button size="sm" variant="ghost" onClick={() => finish(e.id)}>
                              Selesaikan
                            </Button>
                          </Can>
                        )}
                      </div>
                      {dx.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Belum ada diagnosis.</p>
                      ) : (
                        <ul className="flex flex-col gap-1.5">
                          {dx.map((d) => (
                            <li key={d.id} className="flex items-center gap-3 text-sm">
                              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                                {d.code}
                              </span>
                              <span className="min-w-0 flex-1">{d.description}</span>
                              <Badge variant="muted">{d.rank}</Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                      {e.status === "in_progress" && (
                        <Can permission="diagnosis:write">
                          <div className="flex items-center gap-2">
                            <select
                              value={dxCode}
                              onChange={(ev) => setDxCode(ev.target.value)}
                              className={`${inputCls} flex-1`}
                              aria-label="ICD-10 code"
                            >
                              {ICD_CODES.map((c) => (
                                <option key={c} value={c}>{c} — {icd10[c]}</option>
                              ))}
                            </select>
                            <Button size="sm" onClick={() => addDiagnosis(e.id)}>
                              <Plus className="size-4" /> Diagnosis
                            </Button>
                          </div>
                        </Can>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
