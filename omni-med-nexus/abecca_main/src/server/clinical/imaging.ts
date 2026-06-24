/**
 * Imaging study registry ("PACS-lite") — links a radiology diagnostic order to
 * its viewable images. No DICOM binaries are stored: each image is a URL
 * reference (a hospital's WADO-RS /rendered endpoint, VNA, cloud storage, or a
 * data: URI), which is the standard pattern when fronting an external archive.
 * Tenant-scoped by company_id; env-gated (Supabase or in-memory).
 */
import { getSupabase } from "../supabase";

export interface ImagingImage {
  url: string;
  label?: string;
}

export interface ImagingStudy {
  id: string;
  companyId: string;
  /** Source radiology order, when registered from the worklist. */
  orderId: string | null;
  patientId: string;
  accession: string | null;
  modality: string;
  description: string;
  images: ImagingImage[];
  createdBy: string | null;
  createdAt: string;
}

const g = globalThis as unknown as { __abeccaImaging?: ImagingStudy[] };
const mem = g.__abeccaImaging ?? (g.__abeccaImaging = []);

type Row = {
  id: string; company_id: string; order_id: string | null; patient_id: string;
  accession: string | null; modality: string; description: string;
  images: ImagingImage[]; created_by: string | null; created_at: string;
};
const toStudy = (r: Row): ImagingStudy => ({
  id: r.id, companyId: r.company_id, orderId: r.order_id, patientId: r.patient_id,
  accession: r.accession, modality: r.modality, description: r.description,
  images: r.images, createdBy: r.created_by, createdAt: r.created_at,
});

/** Only render-safe schemes — these end up in <img src>. */
const URL_RE = /^(https?:\/\/|data:image\/)/;

/** Normalise the raw image list, or explain why it is invalid. */
export function normalizeImages(raw: unknown): { images: ImagingImage[] } | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { error: "Minimal satu citra" };
  const images: ImagingImage[] = [];
  for (const item of raw) {
    const src = (item ?? {}) as Record<string, unknown>;
    const url = typeof src.url === "string" ? src.url.trim() : "";
    if (!URL_RE.test(url)) {
      return { error: "URL citra harus http(s) atau data:image" };
    }
    const label = typeof src.label === "string" && src.label.trim() ? src.label.trim() : undefined;
    images.push(label ? { url, label } : { url });
  }
  return { images };
}

export async function createImagingStudy(
  companyId: string,
  input: {
    orderId?: string | null;
    patientId: string;
    accession?: string | null;
    modality: string;
    description: string;
    images: unknown;
    createdBy?: string | null;
  },
): Promise<ImagingStudy | { error: string }> {
  const patientId = input.patientId.trim();
  const modality = input.modality.trim();
  const description = input.description.trim();
  if (!patientId || !modality || !description) {
    return { error: "patientId, modality dan deskripsi wajib diisi" };
  }
  const norm = normalizeImages(input.images);
  if ("error" in norm) return norm;

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("imaging_studies")
      .insert({
        company_id: companyId,
        order_id: input.orderId ?? null,
        patient_id: patientId,
        accession: input.accession ?? null,
        modality,
        description,
        images: norm.images,
        created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create imaging study failed");
    return toStudy(data as Row);
  }
  const study: ImagingStudy = {
    id: crypto.randomUUID(),
    companyId,
    orderId: input.orderId ?? null,
    patientId,
    accession: input.accession ?? null,
    modality,
    description,
    images: norm.images,
    createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(study);
  return study;
}

export async function listImagingStudies(
  companyId: string,
  opts?: { patientId?: string; orderId?: string },
): Promise<ImagingStudy[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("imaging_studies").select("*").eq("company_id", companyId);
    if (opts?.patientId) q = q.eq("patient_id", opts.patientId);
    if (opts?.orderId) q = q.eq("order_id", opts.orderId);
    const { data } = await q.order("created_at", { ascending: false });
    return (data ?? []).map((r) => toStudy(r as Row));
  }
  return mem
    .filter(
      (s) =>
        s.companyId === companyId &&
        (!opts?.patientId || s.patientId === opts.patientId) &&
        (!opts?.orderId || s.orderId === opts.orderId),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getImagingStudy(
  companyId: string,
  id: string,
): Promise<ImagingStudy | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("imaging_studies").select("*").eq("company_id", companyId).eq("id", id).maybeSingle();
    return data ? toStudy(data as Row) : undefined;
  }
  return mem.find((s) => s.companyId === companyId && s.id === id);
}
