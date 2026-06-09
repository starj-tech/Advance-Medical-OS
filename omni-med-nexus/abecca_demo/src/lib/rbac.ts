/**
 * Abecca RBAC catalogue — role tiers and the hospital sub-role (job-title)
 * taxonomy that drives access control across the Abecca apps.
 *
 * Model: a user has one **tier** (breadth of access) and one **sub-role**
 * (specific hospital job title → department context + granular permissions).
 * The catalogue is intentionally data-driven so a hospital with hundreds of
 * differently-titled staff maps cleanly, and new titles are added by appending
 * one entry here — no code changes elsewhere.
 *
 * Tiers (decided with product):
 *   1. executive — strategic, organisation-wide (Direksi & pimpinan puncak)
 *   2. manager   — departmental / operational (Kepala Instalasi/Bidang, Manajer)
 *   3. doctor    — clinical / care providers, front-line (dokter + nakes lain)
 *   4. staff     — non-clinical support & administrative workforce
 *
 * See omni-med-nexus/docs/abecca-saas-roadmap.md for the surrounding design.
 */

export type RoleTier = "executive" | "manager" | "doctor" | "staff";

/** Higher rank = broader default access. Used for coarse gating. */
export const TIER_RANK: Record<RoleTier, number> = {
  executive: 4,
  manager: 3,
  doctor: 2,
  staff: 1,
};

export interface RoleTierMeta {
  tier: RoleTier;
  label: string; // Indonesian
  labelEn: string;
  description: string;
}

export const ROLE_TIERS: RoleTierMeta[] = [
  {
    tier: "executive",
    label: "Eksekutif",
    labelEn: "Executive",
    description:
      "Direksi & pimpinan puncak. Akses strategis lintas organisasi: dashboard eksekutif, keuangan, seluruh departemen.",
  },
  {
    tier: "manager",
    label: "Manajer",
    labelEn: "Manager",
    description:
      "Kepala instalasi/bidang/ruang & manajer fungsional. Akses operasional terbatas pada departemen yang dikelola.",
  },
  {
    tier: "doctor",
    label: "Dokter / Klinis",
    labelEn: "Doctor / Clinical",
    description:
      "Tenaga medis & klinis garis depan (dokter dan tenaga kesehatan lain). Akses pelayanan pasien sesuai penugasan.",
  },
  {
    tier: "staff",
    label: "Staf",
    labelEn: "Staff",
    description:
      "Tenaga non-klinis: administrasi, front office, penunjang umum. Akses tugas administratif/operasional non-medis.",
  },
];

export interface SubRole {
  /** Stable identifier stored on the user record. */
  slug: string;
  tier: RoleTier;
  /** Indonesian job title. */
  label: string;
  /** English title for international tenants / UI toggle. */
  labelEn: string;
  /** Grouping for catalogue UI (e.g. "Direksi", "Dokter Spesialis"). */
  group: string;
}

/**
 * The sub-role catalogue. Comprehensive but not exhaustive — extend by adding
 * rows. Slugs are stable; labels may be edited freely.
 */
export const SUB_ROLES: SubRole[] = [
  /* ----------------------------- Tier: Executive ---------------------------- */
  { slug: "dir-utama", tier: "executive", group: "Direksi", label: "Direktur Utama", labelEn: "President Director (CEO)" },
  { slug: "dir-medik", tier: "executive", group: "Direksi", label: "Direktur Pelayanan Medis", labelEn: "Chief Medical Officer" },
  { slug: "dir-keperawatan", tier: "executive", group: "Direksi", label: "Direktur Keperawatan", labelEn: "Chief Nursing Officer" },
  { slug: "dir-keuangan", tier: "executive", group: "Direksi", label: "Direktur Keuangan", labelEn: "Chief Financial Officer" },
  { slug: "dir-operasional", tier: "executive", group: "Direksi", label: "Direktur Operasional", labelEn: "Chief Operating Officer" },
  { slug: "dir-sdm-umum", tier: "executive", group: "Direksi", label: "Direktur SDM & Umum", labelEn: "Chief HR Officer" },
  { slug: "dir-penunjang-medik", tier: "executive", group: "Direksi", label: "Direktur Penunjang Medik", labelEn: "Director of Medical Support" },
  { slug: "cio", tier: "executive", group: "Direksi", label: "Direktur Teknologi Informasi", labelEn: "Chief Information Officer" },
  { slug: "komisaris", tier: "executive", group: "Dewan", label: "Komisaris / Dewan Pengawas", labelEn: "Board / Supervisory" },
  { slug: "ka-spi", tier: "executive", group: "Dewan", label: "Kepala Satuan Pemeriksaan Internal", labelEn: "Head of Internal Audit" },

  /* ------------------------------ Tier: Manager ----------------------------- */
  // Clinical / department heads
  { slug: "ka-igd", tier: "manager", group: "Kepala Instalasi", label: "Kepala Instalasi Gawat Darurat", labelEn: "Head of ER" },
  { slug: "ka-rawat-inap", tier: "manager", group: "Kepala Instalasi", label: "Kepala Instalasi Rawat Inap", labelEn: "Head of Inpatient" },
  { slug: "ka-rawat-jalan", tier: "manager", group: "Kepala Instalasi", label: "Kepala Instalasi Rawat Jalan", labelEn: "Head of Outpatient" },
  { slug: "ka-bedah-sentral", tier: "manager", group: "Kepala Instalasi", label: "Kepala Instalasi Bedah Sentral", labelEn: "Head of Surgery (OR)" },
  { slug: "ka-icu", tier: "manager", group: "Kepala Instalasi", label: "Kepala Instalasi Perawatan Intensif (ICU)", labelEn: "Head of ICU" },
  { slug: "ka-farmasi", tier: "manager", group: "Kepala Instalasi", label: "Kepala Instalasi Farmasi", labelEn: "Head of Pharmacy" },
  { slug: "ka-laboratorium", tier: "manager", group: "Kepala Instalasi", label: "Kepala Instalasi Laboratorium", labelEn: "Head of Laboratory" },
  { slug: "ka-radiologi", tier: "manager", group: "Kepala Instalasi", label: "Kepala Instalasi Radiologi", labelEn: "Head of Radiology" },
  { slug: "ka-gizi", tier: "manager", group: "Kepala Instalasi", label: "Kepala Instalasi Gizi", labelEn: "Head of Nutrition" },
  { slug: "ka-rekam-medis", tier: "manager", group: "Kepala Instalasi", label: "Kepala Instalasi Rekam Medis", labelEn: "Head of Medical Records" },
  { slug: "ka-bidang-keperawatan", tier: "manager", group: "Kepala Bidang", label: "Kepala Bidang Keperawatan", labelEn: "Head of Nursing" },
  { slug: "ka-ruang", tier: "manager", group: "Kepala Bidang", label: "Kepala Ruang (Karu)", labelEn: "Ward Head" },
  // Functional / back-office managers
  { slug: "mgr-keuangan", tier: "manager", group: "Manajer Fungsional", label: "Manajer Keuangan & Akuntansi", labelEn: "Finance & Accounting Manager" },
  { slug: "mgr-penagihan", tier: "manager", group: "Manajer Fungsional", label: "Manajer Penagihan / Revenue Cycle", labelEn: "Billing / Revenue Cycle Manager" },
  { slug: "mgr-sdm", tier: "manager", group: "Manajer Fungsional", label: "Manajer SDM", labelEn: "HR Manager" },
  { slug: "mgr-umum", tier: "manager", group: "Manajer Fungsional", label: "Manajer Umum & Rumah Tangga", labelEn: "General Affairs Manager" },
  { slug: "mgr-pengadaan", tier: "manager", group: "Manajer Fungsional", label: "Manajer Pengadaan & Logistik", labelEn: "Procurement / Supply Chain Manager" },
  { slug: "mgr-mutu-pmkp", tier: "manager", group: "Manajer Fungsional", label: "Manajer Mutu & Keselamatan Pasien (PMKP)", labelEn: "Quality & Patient Safety Manager" },
  { slug: "mgr-ti", tier: "manager", group: "Manajer Fungsional", label: "Manajer Teknologi Informasi", labelEn: "IT Manager" },
  { slug: "mgr-hukum-kepatuhan", tier: "manager", group: "Manajer Fungsional", label: "Manajer Hukum & Kepatuhan", labelEn: "Legal & Compliance Manager" },
  { slug: "mgr-humas-pemasaran", tier: "manager", group: "Manajer Fungsional", label: "Manajer Humas & Pemasaran", labelEn: "PR & Marketing Manager" },
  { slug: "case-manager-mpp", tier: "manager", group: "Manajer Fungsional", label: "Manajer Pelayanan Pasien (Case Manager)", labelEn: "Patient Care / Case Manager" },

  /* --------------------------- Tier: Doctor / Clinical ---------------------- */
  // General & dental
  { slug: "dokter-umum", tier: "doctor", group: "Dokter Umum & Gigi", label: "Dokter Umum", labelEn: "General Practitioner" },
  { slug: "dokter-gigi", tier: "doctor", group: "Dokter Umum & Gigi", label: "Dokter Gigi", labelEn: "Dentist" },
  { slug: "dokter-gigi-spesialis", tier: "doctor", group: "Dokter Umum & Gigi", label: "Dokter Gigi Spesialis", labelEn: "Dental Specialist" },
  { slug: "dokter-residen", tier: "doctor", group: "Dokter Umum & Gigi", label: "Dokter Residen (PPDS)", labelEn: "Resident Physician" },
  { slug: "dokter-internship", tier: "doctor", group: "Dokter Umum & Gigi", label: "Dokter Internship", labelEn: "Internship Doctor" },
  // Specialists
  { slug: "sp-penyakit-dalam", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Penyakit Dalam", labelEn: "Internal Medicine" },
  { slug: "sp-bedah", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Bedah", labelEn: "Surgeon" },
  { slug: "sp-anak", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Anak", labelEn: "Pediatrician" },
  { slug: "sp-obgyn", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Obstetri & Ginekologi", labelEn: "OB/GYN" },
  { slug: "sp-jantung", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Jantung & Pembuluh Darah", labelEn: "Cardiologist" },
  { slug: "sp-saraf", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Saraf (Neurologi)", labelEn: "Neurologist" },
  { slug: "sp-paru", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Paru (Pulmonologi)", labelEn: "Pulmonologist" },
  { slug: "sp-anestesi", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Anestesiologi", labelEn: "Anesthesiologist" },
  { slug: "sp-radiologi", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Radiologi", labelEn: "Radiologist" },
  { slug: "sp-patologi-klinik", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Patologi Klinik", labelEn: "Clinical Pathologist" },
  { slug: "sp-patologi-anatomi", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Patologi Anatomi", labelEn: "Anatomical Pathologist" },
  { slug: "sp-mata", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Mata", labelEn: "Ophthalmologist" },
  { slug: "sp-tht-kl", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis THT-KL", labelEn: "ENT Specialist" },
  { slug: "sp-kulit-kelamin", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Kulit & Kelamin", labelEn: "Dermatologist" },
  { slug: "sp-jiwa", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Kedokteran Jiwa", labelEn: "Psychiatrist" },
  { slug: "sp-orthopedi", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Orthopedi & Traumatologi", labelEn: "Orthopedic Surgeon" },
  { slug: "sp-urologi", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Urologi", labelEn: "Urologist" },
  { slug: "sp-bedah-saraf", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Bedah Saraf", labelEn: "Neurosurgeon" },
  { slug: "sp-onkologi", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Onkologi", labelEn: "Oncologist" },
  { slug: "sp-rehab-medik", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Rehabilitasi Medik", labelEn: "Physical Medicine & Rehab" },
  { slug: "sp-mikrobiologi-klinik", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Mikrobiologi Klinik", labelEn: "Clinical Microbiologist" },
  { slug: "sp-forensik", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Kedokteran Forensik", labelEn: "Forensic Medicine" },
  { slug: "sp-emergensi", tier: "doctor", group: "Dokter Spesialis", label: "Spesialis Emergensi", labelEn: "Emergency Medicine" },
  { slug: "konsultan", tier: "doctor", group: "Sub-spesialis / Konsultan", label: "Dokter Sub-spesialis / Konsultan", labelEn: "Subspecialist / Consultant" },
  // Allied health (nakes lain)
  { slug: "perawat-pelaksana", tier: "doctor", group: "Tenaga Kesehatan Lain", label: "Perawat Pelaksana", labelEn: "Staff Nurse" },
  { slug: "perawat-primer", tier: "doctor", group: "Tenaga Kesehatan Lain", label: "Perawat Primer / Penanggung Jawab", labelEn: "Primary / Charge Nurse" },
  { slug: "perawat-spesialis", tier: "doctor", group: "Tenaga Kesehatan Lain", label: "Perawat Spesialis (ICU/OK/Anestesi)", labelEn: "Specialist Nurse" },
  { slug: "bidan", tier: "doctor", group: "Tenaga Kesehatan Lain", label: "Bidan", labelEn: "Midwife" },
  { slug: "apoteker", tier: "doctor", group: "Tenaga Kesehatan Lain", label: "Apoteker", labelEn: "Pharmacist" },
  { slug: "ttk", tier: "doctor", group: "Tenaga Kesehatan Lain", label: "Tenaga Teknis Kefarmasian", labelEn: "Pharmacy Technician" },
  { slug: "analis-lab-atlm", tier: "doctor", group: "Tenaga Kesehatan Lain", label: "Analis Laboratorium (ATLM)", labelEn: "Lab Technologist" },
  { slug: "radiografer", tier: "doctor", group: "Tenaga Kesehatan Lain", label: "Radiografer", labelEn: "Radiographer" },
  { slug: "ahli-gizi", tier: "doctor", group: "Tenaga Kesehatan Lain", label: "Ahli Gizi (Dietisien)", labelEn: "Dietitian" },
  { slug: "fisioterapis", tier: "doctor", group: "Tenaga Kesehatan Lain", label: "Fisioterapis", labelEn: "Physiotherapist" },
  { slug: "okupasi-terapis", tier: "doctor", group: "Tenaga Kesehatan Lain", label: "Okupasi Terapis", labelEn: "Occupational Therapist" },
  { slug: "terapis-wicara", tier: "doctor", group: "Tenaga Kesehatan Lain", label: "Terapis Wicara", labelEn: "Speech Therapist" },
  { slug: "perekam-medis", tier: "doctor", group: "Tenaga Kesehatan Lain", label: "Perekam Medis", labelEn: "Medical Recorder" },

  /* ------------------------------- Tier: Staff ------------------------------ */
  { slug: "staf-administrasi", tier: "staff", group: "Administrasi & Front Office", label: "Staf Administrasi", labelEn: "Administrative Staff" },
  { slug: "staf-pendaftaran", tier: "staff", group: "Administrasi & Front Office", label: "Staf Pendaftaran", labelEn: "Registration Clerk" },
  { slug: "kasir", tier: "staff", group: "Administrasi & Front Office", label: "Kasir", labelEn: "Cashier" },
  { slug: "customer-service", tier: "staff", group: "Administrasi & Front Office", label: "Customer Service", labelEn: "Customer Service" },
  { slug: "resepsionis", tier: "staff", group: "Administrasi & Front Office", label: "Resepsionis / Front Office", labelEn: "Receptionist" },
  { slug: "staf-keuangan", tier: "staff", group: "Back Office", label: "Staf Keuangan & Akuntansi", labelEn: "Finance Staff" },
  { slug: "staf-sdm", tier: "staff", group: "Back Office", label: "Staf SDM", labelEn: "HR Staff" },
  { slug: "staf-pengadaan", tier: "staff", group: "Back Office", label: "Staf Pengadaan", labelEn: "Procurement Staff" },
  { slug: "staf-gudang", tier: "staff", group: "Back Office", label: "Staf Gudang / Logistik", labelEn: "Warehouse Staff" },
  { slug: "it-support", tier: "staff", group: "Back Office", label: "IT Support / Helpdesk", labelEn: "IT Support" },
  { slug: "keamanan", tier: "staff", group: "Penunjang Non-Klinis", label: "Keamanan (Satpam)", labelEn: "Security" },
  { slug: "kebersihan", tier: "staff", group: "Penunjang Non-Klinis", label: "Kebersihan / Housekeeping", labelEn: "Housekeeping" },
  { slug: "teknisi-ipsrs", tier: "staff", group: "Penunjang Non-Klinis", label: "Teknisi Sarana (IPSRS)", labelEn: "Facility / Biomedical Technician" },
  { slug: "sopir", tier: "staff", group: "Penunjang Non-Klinis", label: "Sopir / Driver Ambulans", labelEn: "Driver / Ambulance Driver" },
  { slug: "staf-dapur-gizi", tier: "staff", group: "Penunjang Non-Klinis", label: "Staf Dapur / Gizi", labelEn: "Kitchen Staff" },
  { slug: "laundry", tier: "staff", group: "Penunjang Non-Klinis", label: "Staf Laundry", labelEn: "Laundry Staff" },
];

/* --------------------------------- helpers -------------------------------- */

const SUB_ROLE_BY_SLUG: Map<string, SubRole> = new Map(
  SUB_ROLES.map((r) => [r.slug, r]),
);

export function subRoleBySlug(slug: string): SubRole | undefined {
  return SUB_ROLE_BY_SLUG.get(slug);
}

export function isValidSubRole(slug: string): boolean {
  return SUB_ROLE_BY_SLUG.has(slug);
}

export function tierOfSubRole(slug: string): RoleTier | undefined {
  return SUB_ROLE_BY_SLUG.get(slug)?.tier;
}

export function subRolesByTier(tier: RoleTier): SubRole[] {
  return SUB_ROLES.filter((r) => r.tier === tier);
}

/** Sub-roles grouped by their `group` label, in catalogue order. */
export function subRolesGrouped(tier: RoleTier): { group: string; roles: SubRole[] }[] {
  const out: { group: string; roles: SubRole[] }[] = [];
  for (const r of subRolesByTier(tier)) {
    let bucket = out.find((b) => b.group === r.group);
    if (!bucket) {
      bucket = { group: r.group, roles: [] };
      out.push(bucket);
    }
    bucket.roles.push(r);
  }
  return out;
}

/** True if `tier` is at least as broad as `min` (coarse hierarchy check). */
export function tierAtLeast(tier: RoleTier, min: RoleTier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[min];
}
