/**
 * Patient-portal read model — aggregates the slices of a patient's record that
 * are appropriate for them to see themselves: their appointments (including any
 * telemedicine join link), validated diagnostic results only, their running
 * billing balance, and discharge summaries (resume medis). Everything is fetched
 * tenant-scoped by (companyId, patientId) — the portal session authorises exactly
 * that pair — and trimmed so no internal/staff-only fields leak to the patient.
 */
import { getPatient } from "../db";
import { listAppointments } from "../scheduling/appointments";
import { listAppointmentsWithTele, type AppointmentWithTele } from "../scheduling/appointment-flow";
import { listAllDiagnosticOrders } from "../clinical/diagnostic-orders";
import { patientBalance } from "../billing/charges";
import { listDischargeSummariesForPatient } from "../clinical/discharge";

export interface PortalPatient {
  id: string;
  name: string;
  age: number | null;
  sex: string | null;
}
export interface PortalResult {
  id: string;
  testName: string;
  category: string;
  resultValue: string | null;
  resultFlag: string | null;
  impression: string | null;
  verifiedAt: string | null;
}
export interface PortalResume {
  id: string;
  condition: string;
  clinicalSummary: string;
  treatment: string | null;
  followUp: string | null;
  dischargeMeds: string | null;
  createdAt: string;
}
export interface PortalSummary {
  patient: PortalPatient;
  appointments: AppointmentWithTele[];
  results: PortalResult[];
  billing: { totalCharges: number; totalPaid: number; balance: number };
  resumes: PortalResume[];
}

export async function getPortalSummary(
  companyId: string,
  patientId: string,
): Promise<PortalSummary> {
  const [profile, appts, allResults, billing, resumes] = await Promise.all([
    getPatient(patientId),
    listAppointments(companyId).then((a) => listAppointmentsWithTele(companyId, a)),
    listAllDiagnosticOrders(companyId, { status: "verified" }),
    patientBalance(companyId, patientId),
    listDischargeSummariesForPatient(companyId, patientId),
  ]);

  const patient: PortalPatient = {
    id: patientId,
    name: profile?.name ?? patientId,
    age: profile?.age ?? null,
    sex: profile?.sex ?? null,
  };

  // Appointments for this patient, soonest first.
  const appointments = appts
    .filter((a) => a.patientId === patientId)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  // Only validated (verified) results are surfaced to the patient.
  const results: PortalResult[] = allResults
    .filter((o) => o.patientId === patientId)
    .sort((a, b) => (b.verifiedAt ?? "").localeCompare(a.verifiedAt ?? ""))
    .map((o) => ({
      id: o.id,
      testName: o.testName,
      category: o.category,
      resultValue: o.resultValue,
      resultFlag: o.resultFlag,
      impression: o.reportImpression,
      verifiedAt: o.verifiedAt,
    }));

  return {
    patient,
    appointments,
    results,
    billing,
    resumes: resumes.map((r) => ({
      id: r.id,
      condition: r.condition,
      clinicalSummary: r.clinicalSummary,
      treatment: r.treatment,
      followUp: r.followUp,
      dischargeMeds: r.dischargeMeds,
      createdAt: r.createdAt,
    })),
  };
}
