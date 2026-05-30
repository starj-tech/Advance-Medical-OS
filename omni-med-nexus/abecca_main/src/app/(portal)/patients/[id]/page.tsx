import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Activity,
  ChevronRight,
  Droplet,
  Heart,
  Lock,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  Wind,
} from "lucide-react";
import { getAuditChain, getPatient, getPatients } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AcuityBadge } from "@/components/ui/acuity-badge";
import { EwsGauge } from "@/components/ui/ews-gauge";
import {
  cn,
  formatDate,
  formatDateTime,
  initials,
  shortHash,
  timeAgo,
} from "@/lib/utils";

export async function generateStaticParams() {
  const patients = await getPatients();
  return patients.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const patient = await getPatient(id);
  return { title: patient ? `${patient.name} · ${patient.id}` : "Patient" };
}

const vitalCards = (v: Awaited<ReturnType<typeof getPatient>>) => {
  if (!v) return [];
  const { vitals } = v;
  return [
    { icon: Heart, label: "Heart Rate", value: `${vitals.heartRate}`, unit: "bpm" },
    { icon: Activity, label: "Systolic BP", value: `${vitals.systolicBp}`, unit: "mmHg" },
    { icon: Wind, label: "Resp. Rate", value: `${vitals.respiratoryRate}`, unit: "/min" },
    { icon: Thermometer, label: "Temp", value: `${vitals.temperature}`, unit: "°C" },
    { icon: Droplet, label: "SpO₂", value: `${vitals.spo2}`, unit: "%" },
  ];
};

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [patient, chain] = await Promise.all([getPatient(id), getAuditChain()]);
  if (!patient) notFound();

  const patientAudit = chain
    .filter((b) => b.patientId === patient.id)
    .reverse();

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
              Updated {timeAgo(patient.vitals.recordedAt)}
            </span>
          </div>
        </CardContent>
      </Card>

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Diagnoses + allergies */}
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
              <ul className="divide-y divide-border">
                {patient.diagnoses.map((d) => (
                  <li
                    key={d.code}
                    className="flex items-center gap-4 px-5 py-3.5"
                  >
                    <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-semibold text-primary">
                      {d.code}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      {d.description}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(d.diagnosedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Audit slice */}
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
                      {timeAgo(b.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Side column: security + allergies */}
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
                <span className="text-sm text-muted-foreground">
                  Medical history
                </span>
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
    </div>
  );
}
