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
import {
  collectSpecimen,
  createDiagnosticOrder,
  setDiagnosticResult,
  setRadiologyReport,
} from "./clinical/diagnostic-orders";
import { createIcuAssessment } from "./clinical/icu";
import { createHdMachine, scheduleHdSession } from "./clinical/hemodialysis";
import { createChemoCourse, recordChemoCycle } from "./clinical/chemo";

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
    let firstEnc: { id: string; patientId: string } | null = null;
    for (let i = 0; i < DX.length; i++) {
      const e = await createEncounter(DEMO_COMPANY_ID, {
        patientId: PATIENTS[i % PATIENTS.length],
        type: TYPES[i],
      });
      if (i === 0) firstEnc = { id: e.id, patientId: e.patientId };
      await addDiagnosis(DEMO_COMPANY_ID, e.id, {
        code: DX[i][0],
        description: DX[i][1],
        rank: "primary",
      });
      if (i % 2 === 0) await setEncounterStatus(DEMO_COMPANY_ID, e.id, "finished");
    }

    // Diagnostics worklist across the LIS lifecycle: one critical resulted (await
    // validation), one collected (await result), one freshly ordered.
    if (firstEnc) {
      const crit = await createDiagnosticOrder(DEMO_COMPANY_ID, firstEnc.id, firstEnc.patientId, {
        category: "lab", testCode: "GDS", testName: "Gula Darah Sewaktu", priority: "stat",
      });
      await collectSpecimen(DEMO_COMPANY_ID, crit.id, {});
      await setDiagnosticResult(DEMO_COMPANY_ID, crit.id, { value: "450" }); // → critical
      const hb = await createDiagnosticOrder(DEMO_COMPANY_ID, firstEnc.id, firstEnc.patientId, {
        category: "lab", testCode: "HB", testName: "Hemoglobin",
      });
      await collectSpecimen(DEMO_COMPANY_ID, hb.id, {});
      // Radiology (RIS): one study already read & awaiting a radiologist's
      // validation, plus a fresh CT order — shows the reporting lifecycle.
      const xr = await createDiagnosticOrder(DEMO_COMPANY_ID, firstEnc.id, firstEnc.patientId, {
        category: "radiology", testCode: "XRTHX", testName: "Rontgen Thorax PA", priority: "urgent",
      });
      await collectSpecimen(DEMO_COMPANY_ID, xr.id, {});
      await setRadiologyReport(DEMO_COMPANY_ID, xr.id, {
        findings: "Corakan bronkovaskular normal. Tak tampak infiltrat maupun efusi pleura.",
        impression: "Foto thorax dalam batas normal.",
        recommendation: "Tidak diperlukan tindak lanjut radiologis.",
      });
      await createDiagnosticOrder(DEMO_COMPANY_ID, firstEnc.id, firstEnc.patientId, {
        category: "radiology", testCode: "CTHEAD", testName: "CT Scan Kepala",
      });
    }

    // Unit khusus — one critical + one moderate APACHE II on the ICU board,
    // an HD machine pair with today's slots, and a mid-course chemo regimen.
    await createIcuAssessment(DEMO_COMPANY_ID, {
      patientId: PATIENTS[4],
      inputs: {
        temperatureC: 39.8, meanArterialPressure: 48, heartRate: 145, respiratoryRate: 38,
        pao2: 52, arterialPh: 7.18, sodium: 156, potassium: 6.1, creatinineMgDl: 2.4,
        acuteRenalFailure: true, hematocrit: 24, wbc: 21, gcs: 6, age: 76,
        chronicHealth: "nonop_or_emergency_postop",
      },
    });
    await createIcuAssessment(DEMO_COMPANY_ID, {
      patientId: PATIENTS[2],
      inputs: {
        temperatureC: 38.7, meanArterialPressure: 65, heartRate: 115, respiratoryRate: 28,
        pao2: 68, arterialPh: 7.3, sodium: 148, potassium: 3.2, creatinineMgDl: 1.6,
        acuteRenalFailure: false, hematocrit: 33, wbc: 13, gcs: 13, age: 68,
        chronicHealth: "none",
      },
    });
    const hd1 = await createHdMachine(DEMO_COMPANY_ID, "HD-01");
    const hd2 = await createHdMachine(DEMO_COMPANY_ID, "HD-02");
    const todayDate = new Date().toISOString().slice(0, 10);
    await scheduleHdSession(DEMO_COMPANY_ID, {
      patientId: PATIENTS[0], machineId: hd1.id, machineName: hd1.name,
      date: todayDate, shift: "pagi",
    });
    await scheduleHdSession(DEMO_COMPANY_ID, {
      patientId: PATIENTS[5], machineId: hd2.id, machineName: hd2.name,
      date: todayDate, shift: "siang",
    });
    const folfox = await createChemoCourse(DEMO_COMPANY_ID, {
      patientId: PATIENTS[3], regimenCode: "FOLFOX",
    });
    if (folfox) {
      for (let i = 0; i < 3; i++) await recordChemoCycle(DEMO_COMPANY_ID, folfox.id);
    }

    // A couple of outpatient queue tickets for the registration board.
    await createTicket(DEMO_COMPANY_ID, { patientId: PATIENTS[1], polyclinic: "Penyakit Dalam" });
    await createTicket(DEMO_COMPANY_ID, { patientId: PATIENTS[3], polyclinic: "Anak" });
  } catch (err) {
    console.error("[demo-seed] best-effort seed failed", err);
  }
}
