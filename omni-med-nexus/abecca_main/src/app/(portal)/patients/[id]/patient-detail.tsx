"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRightLeft,
  ChevronRight,
  Droplet,
  Heart,
  LogOut,
  Lock,
  NotebookPen,
  Pill,
  Plus,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  Wind,
} from "lucide-react";
import type { Patient } from "@/lib/types";
import {
  addDiagnosis,
  addNote,
  dischargePatient,
  useAuditChain,
  usePatient,
} from "@/lib/store";
import { icd10 } from "@/lib/data";
import { cn, formatDate, formatDateTime, initials, shortHash } from "@/lib/utils";
import { TimeAgo } from "@/components/ui/time-ago";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AcuityBadge } from "@/components/ui/acuity-badge";
import { EwsGauge } from "@/components/ui/ews-gauge";
import { VitalsTrend } from "@/components/ui/vitals-trend";
import { RecordVitalsDialog } from "@/components/clinical/record-vitals-dialog";
import { DispenseDialog } from "@/components/clinical/dispense-dialog";
import { TransferDialog } from "@/components/clinical/transfer-dialog";
import { EncountersPanel } from "@/components/clinical/encounters-panel";

function vitalCards(p: Patient) {
  const { vitals } = p;
  return [
    { icon: Heart, label: "Heart Rate", value: `${vitals.heartRate}`, unit: "bpm" },
    { icon: Activity, label: "Systolic BP", value: `${vitals.systolicBp}`, unit: "mmHg" },
    { icon: Wind, label: "Resp. Rate", value: `${vitals.respiratoryRate}`, unit: "/min" },
    { icon: Thermometer, label: "Temp", value: `${vitals.temperature}`, unit: "°C" },
    { icon: Droplet, label: "SpO₂", value: `${vitals.spo2}`, unit: "%" },
  ];
}

export function PatientDetail({ id }: { id: string }) {
  const patient = usePatient(id);
  const chain = useAuditChain();
  const router = useRouter();
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [dispenseOpen, setDispenseOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [dxOpen, setDxOpen] = useState(false);
  const [dxCode, setDxCode] = useState(Object.keys(icd10)[0]);
  const [noteText, setNoteText] = useState("");

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">
          Patient record not found in the current session.
        </p>
        <Link
          href="/patients"
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to patients
        </Link>
      </div>
    );
  }

  const patientAudit = chain
    .filter((b) => b.patientId === patient.id)
    .slice()
    .reverse();
  const availableDx = Object.keys(icd10).filter(
    (c) => !patient.diagnoses.some((d) => d.code === c),
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/patients" className="hover:text-foreground">
          Patients
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{patient.name}</span>
      </nav>

      {/* Header card */}
      <Card>
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary">
            {initials(patient.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">
                {patient.name}
              </h2>
              <AcuityBadge level={patient.acuity} />
              {patient.dischargedAt && <Badge variant="muted">Discharged</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {patient.id} · {patient.age}y ·{" "}
              {patient.sex === "male" ? "Male" : "Female"} · {patient.ward} · Bed{" "}
              {patient.bed}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Admitted {formatDate(patient.admittedAt)} · Attending{" "}
              {patient.attendingDoctorId}
            </p>
          </div>
          <div className="flex items-center gap-4 sm:flex-col sm:items-end">
            <EwsGauge score={patient.vitals.ews} className="scale-110" />
            <span className="text-xs text-muted-foreground">
              Updated <TimeAgo iso={patient.vitals.recordedAt} />
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setVitalsOpen(true)}>
          <Activity className="size-4" />
          Record vitals
        </Button>
        <Button
          variant="outline"
          onClick={() => setDxOpen((o) => !o)}
          disabled={availableDx.length === 0}
        >
          <Plus className="size-4" />
          Add diagnosis
        </Button>
        <Button variant="outline" onClick={() => setDispenseOpen(true)}>
          <Pill className="size-4" />
          Dispense med
        </Button>
        <Button variant="outline" onClick={() => setTransferOpen(true)}>
          <ArrowRightLeft className="size-4" />
          Transfer
        </Button>
        {!patient.dischargedAt && (
          <Button
            variant="ghost"
            className="ml-auto text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
            onClick={() => {
              dischargePatient(patient.id);
              router.push("/patients");
            }}
          >
            <LogOut className="size-4" />
            Discharge
          </Button>
        )}
      </div>

      {/* Inline add-diagnosis */}
      {dxOpen && availableDx.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                ICD-10 diagnosis
              </span>
              <select
                value={dxCode}
                onChange={(e) => setDxCode(e.target.value)}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                {availableDx.map((c) => (
                  <option key={c} value={c}>
                    {c} — {icd10[c]}
                  </option>
                ))}
              </select>
            </label>
            <Button
              onClick={() => {
                addDiagnosis(patient.id, dxCode);
                setDxOpen(false);
                setDxCode(availableDx.find((c) => c !== dxCode) ?? availableDx[0]);
              }}
            >
              Add
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Structured encounters + ICD-10 diagnoses (tenant-scoped, via guarded API) */}
      <EncountersPanel patientId={patient.id} />

      {/* Vitals */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {vitalCards(patient).map((vc) => {
          const Icon = vc.icon;
          return (
            <Card key={vc.label} className="p-4">
              <Icon className="size-4 text-primary" />
              <p className="mt-3 text-2xl font-semibold tabular-nums">
                {vc.value}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {vc.unit}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{vc.label}</p>
            </Card>
          );
        })}
      </section>

      {/* Trends */}
      {patient.vitalsHistory.length > 1 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold tracking-tight">
            Trends{" "}
            <span className="font-normal text-muted-foreground">
              · last {patient.vitalsHistory.length} readings
            </span>
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <VitalsTrend history={patient.vitalsHistory} metric="ews" />
            <VitalsTrend history={patient.vitalsHistory} metric="heartRate" />
            <VitalsTrend history={patient.vitalsHistory} metric="spo2" />
            <VitalsTrend history={patient.vitalsHistory} metric="systolicBp" />
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Diagnoses + audit */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="size-4 text-primary" />
                Active Diagnoses
              </CardTitle>
              <Badge variant="muted">ICD-10</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {patient.diagnoses.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                  No diagnoses recorded yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {patient.diagnoses.map((d) => (
                    <li key={d.code} className="flex items-center gap-4 px-5 py-3.5">
                      <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-semibold text-primary">
                        {d.code}
                      </span>
                      <span className="min-w-0 flex-1 text-sm">{d.description}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(d.diagnosedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <NotebookPen className="size-4 text-primary" />
                Clinical Notes
              </CardTitle>
              <Badge variant="muted">{patient.notes.length}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {patient.notes.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {[...patient.notes].reverse().map((n) => (
                    <li
                      key={n.id}
                      className="rounded-lg border border-border bg-foreground/[0.02] p-3"
                    >
                      <p className="text-sm">{n.text}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {n.author} · <TimeAgo iso={n.createdAt} />
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-col gap-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a clinical note…"
                  rows={2}
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      addNote(patient.id, noteText);
                      setNoteText("");
                    }}
                    disabled={noteText.trim().length === 0}
                  >
                    <Plus className="size-4" />
                    Add note
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Access & Change History</CardTitle>
              <Link
                href="/audit"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Full ledger <ChevronRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {patientAudit.map((b) => (
                  <li key={b.hash} className="flex items-center gap-3 px-5 py-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <ShieldCheck className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="capitalize">
                        {b.action.replaceAll("_", " ").toLowerCase()}
                        <span className="text-muted-foreground"> · {b.doctorId}</span>
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        #{b.index} · {shortHash(b.hash)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      <TimeAgo iso={new Date(b.timestamp * 1000).toISOString()} />
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Security + allergies */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-4 text-primary" />
                Protected Data
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">National ID</span>
                <span className="font-mono text-sm">{patient.maskedSsn}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Medical history</span>
                <Badge variant="success">
                  <Lock className="size-3" /> Encrypted
                </Badge>
              </div>
              <div className="rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
                PII is sealed with{" "}
                <span className="font-medium text-foreground">AES-256-GCM</span>{" "}
                in the core engine. The portal never receives the ciphertext or
                the key.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Allergies</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.allergies.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No known allergies recorded.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((a) => (
                    <span
                      key={a}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300",
                      )}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Last vitals recorded {formatDateTime(patient.vitals.recordedAt)}
      </p>

      <RecordVitalsDialog
        patient={patient}
        open={vitalsOpen}
        onClose={() => setVitalsOpen(false)}
      />
      <DispenseDialog
        patientId={patient.id}
        patientName={patient.name}
        open={dispenseOpen}
        onClose={() => setDispenseOpen(false)}
      />
      <TransferDialog
        patient={patient}
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
      />
    </div>
  );
}
