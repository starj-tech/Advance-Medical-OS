"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Stethoscope } from "lucide-react";
import type { Encounter, Diagnosis, EncounterType } from "@/server/clinical/encounters";
import type { ClinicalNote } from "@/server/clinical/notes";
import { icd10 } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";
import { VitalsPanel } from "@/components/clinical/vitals-panel";
import { PrescribePanel } from "@/components/clinical/prescribe-panel";
import { MarPanel } from "@/components/clinical/mar-panel";
import { DiagnosticsPanel } from "@/components/clinical/diagnostics-panel";
import { BillingPanel } from "@/components/clinical/billing-panel";
import { SatusehatPanel } from "@/components/clinical/satusehat-panel";

const inputCls =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";
const textareaCls =
  "min-h-[60px] rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const EMPTY_DRAFT = { subjective: "", objective: "", assessment: "", plan: "" };

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
  const [notes, setNotes] = useState<Record<string, ClinicalNote[]>>({});
  const [draft, setDraft] = useState(EMPTY_DRAFT);

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

  const loadNotes = async (encounterId: string) => {
    const res = await fetch(`/api/encounters/${encounterId}/notes`);
    if (!res.ok) return;
    const data: ClinicalNote[] = await res.json();
    setNotes((m) => ({ ...m, [encounterId]: data }));
  };

  const toggle = (id: string) => {
    const next = open === id ? null : id;
    setOpen(next);
    if (next) {
      if (!diagnoses[next]) void loadDiagnoses(next);
      if (!notes[next]) void loadNotes(next);
    }
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

  const addNote = async (encounterId: string) => {
    const res = await fetch(`/api/encounters/${encounterId}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...draft, noteType: "cppt" }),
    });
    if (res.ok) {
      setDraft(EMPTY_DRAFT);
      await loadNotes(encounterId);
    }
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
              const nt = notes[e.id] ?? [];
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

                      <div className="space-y-2 border-t border-border pt-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          CPPT — Catatan Terintegrasi
                        </span>
                        {nt.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Belum ada catatan.</p>
                        ) : (
                          <ul className="flex flex-col gap-2">
                            {nt.map((n) => (
                              <li
                                key={n.id}
                                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                              >
                                <div className="mb-1 flex items-center gap-2">
                                  <Badge variant="muted">{n.authorRole ?? "PPA"}</Badge>
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {formatDate(n.createdAt)}
                                  </span>
                                </div>
                                {n.subjective && (
                                  <p><span className="font-semibold">S:</span> {n.subjective}</p>
                                )}
                                {n.objective && (
                                  <p><span className="font-semibold">O:</span> {n.objective}</p>
                                )}
                                {n.assessment && (
                                  <p><span className="font-semibold">A:</span> {n.assessment}</p>
                                )}
                                {n.plan && (
                                  <p><span className="font-semibold">P:</span> {n.plan}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        {e.status === "in_progress" && (
                          <Can permission="note:write">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <textarea
                                value={draft.subjective}
                                onChange={(ev) =>
                                  setDraft((d) => ({ ...d, subjective: ev.target.value }))
                                }
                                placeholder="S — Subjektif"
                                className={textareaCls}
                                aria-label="Subjektif"
                              />
                              <textarea
                                value={draft.objective}
                                onChange={(ev) =>
                                  setDraft((d) => ({ ...d, objective: ev.target.value }))
                                }
                                placeholder="O — Objektif"
                                className={textareaCls}
                                aria-label="Objektif"
                              />
                              <textarea
                                value={draft.assessment}
                                onChange={(ev) =>
                                  setDraft((d) => ({ ...d, assessment: ev.target.value }))
                                }
                                placeholder="A — Asesmen"
                                className={textareaCls}
                                aria-label="Asesmen"
                              />
                              <textarea
                                value={draft.plan}
                                onChange={(ev) =>
                                  setDraft((d) => ({ ...d, plan: ev.target.value }))
                                }
                                placeholder="P — Plan"
                                className={textareaCls}
                                aria-label="Plan"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addNote(e.id)}
                              disabled={
                                !draft.subjective.trim() &&
                                !draft.objective.trim() &&
                                !draft.assessment.trim() &&
                                !draft.plan.trim()
                              }
                            >
                              <Plus className="size-4" /> Tambah Catatan
                            </Button>
                          </Can>
                        )}
                      </div>

                      <VitalsPanel encounterId={e.id} active={e.status === "in_progress"} />

                      <PrescribePanel encounterId={e.id} active={e.status === "in_progress"} />

                      <MarPanel encounterId={e.id} active={e.status === "in_progress"} />

                      <DiagnosticsPanel encounterId={e.id} active={e.status === "in_progress"} />

                      <BillingPanel encounterId={e.id} />

                      <SatusehatPanel encounterId={e.id} />
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
