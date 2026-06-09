/**
 * Idempotent demo data seed for the company-scoped clinical stores, so the
 * dashboard, analytics and bed board look alive on first visit. The shared
 * stores (patients, formulary, tariffs, audit, devices) already seed themselves
 * in-memory (server/db.ts); this only adds the per-tenant encounters, beds and
 * queue that those globals don't cover. Best-effort: any failure is swallowed so
 * a page never breaks because of seeding. In-memory only (no Supabase in demo).
 */
import { DEMO_COMPANY_ID } from "./auth/demo-session";
import {
  addDiagnosis,
  createEncounter,
  listAllEncounters,
  setEncounterStatus,
  type EncounterType,
} from "./clinical/encounters";
import { createBed, createWard, listWards, setBedStatus } from "./facility/beds";
import { createTicket } from "./registration/queue";

const g = globalThis as unknown as { __abeccaDemoSeeded?: boolean };

const PATIENTS = ["PAT-123", "PAT-204", "PAT-310", "PAT-318", "PAT-402", "PAT-415"];
const DX: [string, string][] = [
  ["E11.9", "Diabetes melitus tipe 2"],
  ["I10", "Hipertensi esensial (primer)"],
  ["J18.9", "Pneumonia, organisme tidak dispesifikkan"],
  ["A09", "Gastroenteritis & kolitis infeksi"],
  ["I21.9", "Infark miokard akut"],
  ["N39.0", "Infeksi saluran kemih"],
];
const TYPES: EncounterType[] = ["inpatient", "outpatient", "ed", "inpatient", "outpatient", "ed"];

export async function ensureDemoSeed(): Promise<void> {
  if (g.__abeccaDemoSeeded) return;
  g.__abeccaDemoSeeded = true;
  try {
    // Don't double-seed if a previous render already populated this tenant.
    if ((await listWards(DEMO_COMPANY_ID)).length > 0) return;
    if ((await listAllEncounters(DEMO_COMPANY_ID)).length > 0) return;

    // Wards + beds with realistic occupancy → drives BOR on dashboard/analytics.
    const wards = [
      { ward: await createWard(DEMO_COMPANY_ID, { name: "Rawat Inap Melati", wardClass: "2" }), beds: 8, occupied: 5, prefix: "Melati" },
      { ward: await createWard(DEMO_COMPANY_ID, { name: "ICU", wardClass: "1" }), beds: 4, occupied: 2, prefix: "ICU" },
      { ward: await createWard(DEMO_COMPANY_ID, { name: "Rawat Inap Anggrek", wardClass: "3" }), beds: 10, occupied: 6, prefix: "Anggrek" },
    ];
    let p = 0;
    for (const w of wards) {
      for (let i = 1; i <= w.beds; i++) {
        const bed = await createBed(DEMO_COMPANY_ID, { wardId: w.ward.id, label: `${w.prefix}-${i}` });
        if (i <= w.occupied) {
          await setBedStatus(DEMO_COMPANY_ID, bed.id, "occupied", {
            patientId: PATIENTS[p % PATIENTS.length],
          });
          p += 1;
        }
      }
    }

    // Encounters + a primary diagnosis each; finish about half so the analytics
    // by-status mix isn't all "in progress".
    for (let i = 0; i < DX.length; i++) {
      const e = await createEncounter(DEMO_COMPANY_ID, {
        patientId: PATIENTS[i % PATIENTS.length],
        type: TYPES[i],
      });
      await addDiagnosis(DEMO_COMPANY_ID, e.id, {
        code: DX[i][0],
        description: DX[i][1],
        rank: "primary",
      });
      if (i % 2 === 0) await setEncounterStatus(DEMO_COMPANY_ID, e.id, "finished");
    }

    // A couple of outpatient queue tickets for the registration board.
    await createTicket(DEMO_COMPANY_ID, { patientId: PATIENTS[1], polyclinic: "Penyakit Dalam" });
    await createTicket(DEMO_COMPANY_ID, { patientId: PATIENTS[3], polyclinic: "Anak" });
  } catch (err) {
    console.error("[demo-seed] best-effort seed failed", err);
  }
}
