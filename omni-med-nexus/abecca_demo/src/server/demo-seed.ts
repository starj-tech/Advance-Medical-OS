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
import { pushAntrean } from "./bpjs/client";
import { saveAntrol } from "./bpjs/antrol";
import { bookAppointment, checkInAppointment } from "./scheduling/appointment-flow";
import { logEvent } from "./observability/log";
import { issueApiKey } from "./integrations/api-keys";
import { registerWebhook } from "./integrations/webhooks";
import { createEdVisit, markSeen } from "./ed/triage";
import { createCredential } from "./hr/credentials";
import { recordCase, recordDenominator } from "./ppi/surveillance";
import {
  collectSpecimen,
  createDiagnosticOrder,
  setDiagnosticResult,
  setRadiologyReport,
} from "./clinical/diagnostic-orders";
import { createIcuAssessment } from "./clinical/icu";
import { createHdMachine, scheduleHdSession } from "./clinical/hemodialysis";
import { createChemoCourse, recordChemoCycle } from "./clinical/chemo";
import { createFormTemplate, createFormSubmission } from "./clinical/forms";
import { createImagingStudy } from "./clinical/imaging";
import { createTeleSession, setTeleStatus } from "./clinical/telemedicine";

/** A tiny self-contained "film" frame as an SVG data URI (no binary assets). */
function mockFilm(tag: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420'>` +
    `<rect width='420' height='420' fill='#0a0a0a'/>` +
    `<ellipse cx='150' cy='220' rx='78' ry='128' fill='#363636'/>` +
    `<ellipse cx='272' cy='220' rx='78' ry='128' fill='#363636'/>` +
    `<rect x='200' y='80' width='22' height='280' rx='6' fill='#8a8a8a'/>` +
    `<path d='M120 120 Q211 70 302 120' stroke='#9a9a9a' stroke-width='10' fill='none'/>` +
    `<text x='14' y='34' fill='#7fb3d5' font-family='monospace' font-size='18'>${tag}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

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
      // PACS-lite: a viewable study (two synthetic frames) for the read X-ray.
      await createImagingStudy(DEMO_COMPANY_ID, {
        orderId: xr.id,
        patientId: firstEnc.patientId,
        accession: xr.accession,
        modality: "X-Ray",
        description: "Rontgen Thorax PA/Lateral",
        images: [{ url: mockFilm("PA · 0001"), label: "PA" }, { url: mockFilm("LAT · 0002"), label: "Lateral" }],
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

    // Form builder — a ready-made screening template with one filled submission.
    const tpl = await createFormTemplate(DEMO_COMPANY_ID, {
      name: "Skrining Risiko Jatuh (Morse)",
      category: "Keperawatan",
      fields: [
        { label: "Riwayat jatuh", type: "select", options: ["Tidak", "Ya"], required: true },
        { label: "Diagnosis sekunder", type: "select", options: ["Tidak", "Ya"] },
        { label: "Skor total", type: "number", unit: "poin", required: true },
        { label: "Pakai alat bantu jalan", type: "checkbox" },
        { label: "Catatan", type: "textarea" },
      ],
    });
    if (!("error" in tpl)) {
      await createFormSubmission(DEMO_COMPANY_ID, tpl.id, {
        patientId: PATIENTS[0],
        answers: {
          "riwayat-jatuh": "Ya",
          "diagnosis-sekunder": "Ya",
          "skor-total": "55",
          "pakai-alat-bantu-jalan": true,
          catatan: "Risiko tinggi — pasang gelang kuning & edukasi keluarga.",
        },
      });
    }

    // Telemedicine — one session already in the waiting room (join button live),
    // one scheduled for later today.
    const tele = await createTeleSession(DEMO_COMPANY_ID, {
      patientId: PATIENTS[1],
      scheduledAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      note: "Kontrol hipertensi — konsultasi jarak jauh",
    });
    await setTeleStatus(DEMO_COMPANY_ID, tele.id, "waiting");
    await createTeleSession(DEMO_COMPANY_ID, {
      patientId: PATIENTS[4],
      scheduledAt: new Date(Date.now() + 3 * 3600_000).toISOString(),
      note: "Tindak lanjut hasil lab",
    });

    // A couple of outpatient queue tickets for the registration board; the
    // first is already registered to BPJS Antrean Online (mock booking).
    const tkt = await createTicket(DEMO_COMPANY_ID, { patientId: PATIENTS[1], polyclinic: "Penyakit Dalam" });
    await createTicket(DEMO_COMPANY_ID, { patientId: PATIENTS[3], polyclinic: "Anak" });
    const antrean = await pushAntrean({
      noKartu: "0001234567890",
      kodePoli: tkt.polyclinic,
      tanggalPeriksa: tkt.queueDate,
      noAntrean: tkt.queueNumber,
    });
    await saveAntrol(DEMO_COMPANY_ID, tkt.id, tkt.patientId, {
      noKartu: "0001234567890",
      kodeBooking: antrean.kodeBooking,
      poli: tkt.polyclinic,
      isMock: antrean.mock,
    });

    // Appointments board — an in-person booking plus two telemedicine visits:
    // one still scheduled (shows check-in → ruang tunggu) and one already admitted
    // to the virtual waiting room (live "Gabung video" link backed by a session).
    await bookAppointment(DEMO_COMPANY_ID, {
      patientId: PATIENTS[2], polyclinic: "Penyakit Dalam", modality: "in_person",
      scheduledAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
      practitioner: "dr. Sari, Sp.PD",
    });
    await bookAppointment(DEMO_COMPANY_ID, {
      patientId: PATIENTS[4], polyclinic: "Anak", modality: "telemedicine",
      scheduledAt: new Date(Date.now() + 2 * 3600_000).toISOString(),
      practitioner: "dr. Andi, Sp.A", notes: "Konsultasi demam",
    });
    const teleAppt = await bookAppointment(DEMO_COMPANY_ID, {
      patientId: PATIENTS[0], polyclinic: "Jantung", modality: "telemedicine",
      scheduledAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      practitioner: "dr. Rina, Sp.JP", notes: "Kontrol pasca rawat",
    });
    await checkInAppointment(DEMO_COMPANY_ID, teleAppt.id);

    // Observability — a spread of synthetic structured events so the dashboard
    // shows real-looking auth/authz/integration traffic (sensitive keys masked).
    await logEvent({ level: "info", scope: "auth", message: "Login berhasil", companyId: DEMO_COMPANY_ID, fields: { email: "dirut@abecca.demo", mfa: false } });
    await logEvent({ level: "warn", scope: "auth", message: "Login gagal — kredensial tidak valid", companyId: DEMO_COMPANY_ID, fields: { email: "tidak.dikenal@x.id", reason: "invalid_credentials" } });
    await logEvent({ level: "warn", scope: "authz", message: "Akses ditolak (billing:manage)", companyId: DEMO_COMPANY_ID, fields: { permission: "billing:manage", subRole: "perawat-pelaksana" } });
    await logEvent({ level: "info", scope: "integration", message: "SATUSEHAT — kirim bundle (mock)", companyId: DEMO_COMPANY_ID, fields: { resource: "Encounter", mock: true } });
    await logEvent({ level: "error", scope: "integration", message: "Pengingat WhatsApp gagal terkirim (mock)", companyId: DEMO_COMPANY_ID, fields: { channel: "whatsapp", mock: true } });

    // A sample API key + webhook so the Integrations page is populated. The
    // webhook URL uses a non-routable .test host so any later delivery fails
    // fast without a real outbound call.
    await issueApiKey(DEMO_COMPANY_ID, "Integrasi SIMRS (contoh)", null);
    await registerWebhook(DEMO_COMPANY_ID, {
      url: "https://webhook.example.test/abecca",
      events: ["appointment.created", "diagnostic.critical"],
    });

    // IGD tracking board — a spread of acuities; the emergent case already seen.
    const edEmergent = await createEdVisit(DEMO_COMPANY_ID, {
      patientId: PATIENTS[4], complaint: "Nyeri dada hebat, sesak",
      esi: { lifeSaving: false, highRisk: true, resources: 3, dangerVitals: true },
    });
    await markSeen(DEMO_COMPANY_ID, edEmergent.id);
    await createEdVisit(DEMO_COMPANY_ID, {
      patientId: PATIENTS[2], complaint: "Demam tinggi & muntah",
      esi: { lifeSaving: false, highRisk: false, resources: 2, dangerVitals: false },
    });
    await createEdVisit(DEMO_COMPANY_ID, {
      patientId: PATIENTS[5], complaint: "Luka lecet ringan",
      esi: { lifeSaving: false, highRisk: false, resources: 0, dangerVitals: false },
    });

    // Kredensial nakes — campuran berlaku, segera kedaluwarsa, dan kedaluwarsa.
    const cdays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
    await createCredential(DEMO_COMPANY_ID, { staffName: "dr. Andi Pratama", profession: "Dokter Umum", credentialType: "SIP", number: "SIP/2024/0451", issuedDate: cdays(-700), expiryDate: cdays(300) });
    await createCredential(DEMO_COMPANY_ID, { staffName: "apt. Sri Wahyuni, S.Farm", profession: "Apoteker", credentialType: "SIPA", number: "SIPA/2023/0118", issuedDate: cdays(-1000), expiryDate: cdays(45) });
    await createCredential(DEMO_COMPANY_ID, { staffName: "Ns. Maya Sari", profession: "Perawat", credentialType: "SIPP", number: "SIPP/2022/0772", issuedDate: cdays(-1200), expiryDate: cdays(-20) });
    await createCredential(DEMO_COMPANY_ID, { staffName: "Bd. Rina Lestari", profession: "Bidan", credentialType: "SIPB", number: "SIPB/2024/0339", issuedDate: cdays(-400), expiryDate: cdays(420) });

    // PPI — surveilans HAIs bulan ini: beberapa kasus + denominator hari-alat.
    const pm = new Date().toISOString().slice(0, 7);
    const pday = (d: number) => `${pm}-${String(d).padStart(2, "0")}`;
    await recordCase(DEMO_COMPANY_ID, { patientId: PATIENTS[0], haiType: "VAP", unit: "ICU", onsetDate: pday(8), note: "Onset hari ke-5 ventilasi mekanik" });
    await recordCase(DEMO_COMPANY_ID, { patientId: PATIENTS[4], haiType: "ISK", unit: "Rawat Inap Melati", onsetDate: pday(14) });
    await recordDenominator(DEMO_COMPANY_ID, { period: pm, haiType: "VAP", unit: "ICU", deviceDays: 320 });
    await recordDenominator(DEMO_COMPANY_ID, { period: pm, haiType: "IAD", unit: "ICU", deviceDays: 280 });
    await recordDenominator(DEMO_COMPANY_ID, { period: pm, haiType: "ISK", unit: "Rawat Inap Melati", deviceDays: 540 });
  } catch (err) {
    console.error("[demo-seed] best-effort seed failed", err);
  }
}
