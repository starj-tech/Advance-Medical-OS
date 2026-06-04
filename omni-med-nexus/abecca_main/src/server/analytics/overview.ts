/**
 * Executive analytics — real-time hospital KPIs aggregated from the existing
 * transactional stores (encounters, beds, diagnoses, billing, IKP). A read-only
 * roll-up: no new tables, it just composes data already captured per slice and
 * is tenant-scoped by company_id. This is the data behind the executive
 * dashboard (domain L of the roadmap).
 */
import {
  listAllDiagnoses,
  listAllEncounters,
  type EncounterStatus,
  type EncounterType,
} from "../clinical/encounters";
import { boardSummary } from "../facility/beds";
import { revenueSummary } from "../billing/charges";
import { type Grading, type IncidentType, listReports } from "../safety/ikp";

export interface AnalyticsOverview {
  generatedAt: string;
  encounters: {
    total: number;
    active: number;
    byType: Record<EncounterType, number>;
    byStatus: Record<EncounterStatus, number>;
  };
  occupancy: {
    totalBeds: number;
    occupied: number;
    available: number;
    /** Overall Bed Occupancy Rate across all wards, 0–100. */
    bor: number;
    wards: { id: string; name: string; total: number; occupied: number; bor: number }[];
  };
  topDiagnoses: { code: string; description: string; count: number }[];
  revenue: {
    totalCharges: number;
    totalPaid: number;
    outstanding: number;
    /** Paid ÷ charged, 0–100. */
    collectionRate: number;
  };
  safety: {
    total: number;
    open: number;
    byType: Record<IncidentType, number>;
    byGrading: Record<Grading, number>;
  };
}

const ENC_TYPES: EncounterType[] = ["outpatient", "inpatient", "ed", "odc"];
const ENC_STATUSES: EncounterStatus[] = ["planned", "in_progress", "finished", "cancelled"];
const INC_TYPES: IncidentType[] = ["KPC", "KNC", "KTC", "KTD", "sentinel"];
const GRADINGS: Grading[] = ["biru", "hijau", "kuning", "merah"];

function zeroed<K extends string>(keys: K[]): Record<K, number> {
  const acc = {} as Record<K, number>;
  for (const k of keys) acc[k] = 0;
  return acc;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export async function buildOverview(companyId: string): Promise<AnalyticsOverview> {
  const [encounters, diagnoses, board, revenue, reports] = await Promise.all([
    listAllEncounters(companyId),
    listAllDiagnoses(companyId),
    boardSummary(companyId),
    revenueSummary(companyId),
    listReports(companyId),
  ]);

  // Encounters by type & status.
  const byType = zeroed(ENC_TYPES);
  const byStatus = zeroed(ENC_STATUSES);
  for (const e of encounters) {
    byType[e.type] += 1;
    byStatus[e.status] += 1;
  }

  // Occupancy roll-up across wards.
  const totalBeds = board.reduce((s, w) => s + w.total, 0);
  const occupied = board.reduce((s, w) => s + w.occupied, 0);
  const available = board.reduce((s, w) => s + w.available, 0);
  const bor = totalBeds ? round1((occupied / totalBeds) * 100) : 0;

  // Top diagnoses by ICD-10 code (most frequent first).
  const dxMap = new Map<string, { code: string; description: string; count: number }>();
  for (const d of diagnoses) {
    const entry = dxMap.get(d.code) ?? { code: d.code, description: d.description, count: 0 };
    entry.count += 1;
    dxMap.set(d.code, entry);
  }
  const topDiagnoses = [...dxMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  // Patient-safety register.
  const incByType = zeroed(INC_TYPES);
  const incByGrading = zeroed(GRADINGS);
  let open = 0;
  for (const r of reports) {
    incByType[r.incidentType] += 1;
    if (r.grading) incByGrading[r.grading] += 1;
    if (r.status !== "closed") open += 1;
  }

  const collectionRate = revenue.totalCharges
    ? round1((revenue.totalPaid / revenue.totalCharges) * 100)
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    encounters: {
      total: encounters.length,
      active: byStatus.in_progress,
      byType,
      byStatus,
    },
    occupancy: {
      totalBeds,
      occupied,
      available,
      bor,
      wards: board.map((w) => ({
        id: w.id,
        name: w.name,
        total: w.total,
        occupied: w.occupied,
        bor: w.bor,
      })),
    },
    topDiagnoses,
    revenue: {
      totalCharges: revenue.totalCharges,
      totalPaid: revenue.totalPaid,
      outstanding: revenue.outstanding,
      collectionRate,
    },
    safety: {
      total: reports.length,
      open,
      byType: incByType,
      byGrading: incByGrading,
    },
  };
}
