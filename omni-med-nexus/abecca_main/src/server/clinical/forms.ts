/**
 * Dynamic clinical form templates + submissions ("form builder"). Tenant-scoped
 * by company_id; env-gated (Supabase or in-memory). The field schema and the
 * submission validator live in lib/form-builder (client-safe); this persists the
 * designed templates and the filled answers. Field lists are stored as JSON.
 */
import { getSupabase } from "../supabase";
import {
  normalizeFields,
  validateSubmission,
  type FormAnswers,
  type FormField,
} from "@/lib/form-builder";

export type FormStatus = "active" | "archived";

export interface FormTemplate {
  id: string;
  companyId: string;
  name: string;
  category: string;
  fields: FormField[];
  status: FormStatus;
  createdBy: string | null;
  createdAt: string;
}

export interface FormSubmission {
  id: string;
  companyId: string;
  templateId: string;
  templateName: string;
  patientId: string;
  encounterId: string | null;
  answers: FormAnswers;
  submittedBy: string | null;
  createdAt: string;
}

const g = globalThis as unknown as {
  __abeccaFormTemplates?: FormTemplate[];
  __abeccaFormSubmissions?: FormSubmission[];
};
const memTemplates = g.__abeccaFormTemplates ?? (g.__abeccaFormTemplates = []);
const memSubmissions = g.__abeccaFormSubmissions ?? (g.__abeccaFormSubmissions = []);

type TemplateRow = {
  id: string; company_id: string; name: string; category: string;
  fields: FormField[]; status: FormStatus; created_by: string | null; created_at: string;
};
const toTemplate = (r: TemplateRow): FormTemplate => ({
  id: r.id, companyId: r.company_id, name: r.name, category: r.category,
  fields: r.fields, status: r.status, createdBy: r.created_by, createdAt: r.created_at,
});

type SubmissionRow = {
  id: string; company_id: string; template_id: string; template_name: string;
  patient_id: string; encounter_id: string | null; answers: FormAnswers;
  submitted_by: string | null; created_at: string;
};
const toSubmission = (r: SubmissionRow): FormSubmission => ({
  id: r.id, companyId: r.company_id, templateId: r.template_id, templateName: r.template_name,
  patientId: r.patient_id, encounterId: r.encounter_id, answers: r.answers,
  submittedBy: r.submitted_by, createdAt: r.created_at,
});

/* ------------------------------- templates -------------------------------- */

/** Design a template; validates the field list via the shared normaliser. */
export async function createFormTemplate(
  companyId: string,
  input: { name: string; category?: string; fields: unknown; createdBy?: string | null },
): Promise<FormTemplate | { error: string }> {
  const name = input.name.trim();
  if (!name) return { error: "Nama form wajib diisi" };
  const norm = normalizeFields(input.fields);
  if ("error" in norm) return norm;
  const category = (input.category ?? "").trim() || "Umum";

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("form_templates")
      .insert({
        company_id: companyId,
        name,
        category,
        fields: norm.fields,
        status: "active",
        created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create form template failed");
    return toTemplate(data as TemplateRow);
  }
  const template: FormTemplate = {
    id: crypto.randomUUID(),
    companyId,
    name,
    category,
    fields: norm.fields,
    status: "active",
    createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
  };
  memTemplates.push(template);
  return template;
}

export async function listFormTemplates(
  companyId: string,
  opts?: { includeArchived?: boolean },
): Promise<FormTemplate[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("form_templates").select("*").eq("company_id", companyId);
    if (!opts?.includeArchived) q = q.eq("status", "active");
    const { data } = await q.order("created_at", { ascending: false });
    return (data ?? []).map((r) => toTemplate(r as TemplateRow));
  }
  return memTemplates
    .filter((t) => t.companyId === companyId && (opts?.includeArchived || t.status === "active"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getFormTemplate(
  companyId: string,
  id: string,
): Promise<FormTemplate | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("form_templates").select("*").eq("company_id", companyId).eq("id", id).maybeSingle();
    return data ? toTemplate(data as TemplateRow) : undefined;
  }
  return memTemplates.find((t) => t.companyId === companyId && t.id === id);
}

export async function setFormTemplateStatus(
  companyId: string,
  id: string,
  status: FormStatus,
): Promise<FormTemplate | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("form_templates")
      .update({ status })
      .eq("company_id", companyId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? toTemplate(data as TemplateRow) : undefined;
  }
  const t = memTemplates.find((x) => x.companyId === companyId && x.id === id);
  if (!t) return undefined;
  t.status = status;
  return t;
}

/* ------------------------------ submissions ------------------------------- */

/** Fill a template; validates answers against the template's own fields. */
export async function createFormSubmission(
  companyId: string,
  templateId: string,
  input: {
    patientId: string;
    encounterId?: string | null;
    answers: FormAnswers;
    submittedBy?: string | null;
  },
): Promise<FormSubmission | { error: string }> {
  const template = await getFormTemplate(companyId, templateId);
  if (!template) return { error: "Template tidak ditemukan" };
  const patientId = input.patientId.trim();
  if (!patientId) return { error: "ID pasien wajib diisi" };
  const { ok } = validateSubmission(template.fields, input.answers);
  if (!ok) return { error: "Jawaban tidak lengkap atau tidak valid" };

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("form_submissions")
      .insert({
        company_id: companyId,
        template_id: template.id,
        template_name: template.name,
        patient_id: patientId,
        encounter_id: input.encounterId ?? null,
        answers: input.answers,
        submitted_by: input.submittedBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "create form submission failed");
    return toSubmission(data as SubmissionRow);
  }
  const submission: FormSubmission = {
    id: crypto.randomUUID(),
    companyId,
    templateId: template.id,
    templateName: template.name,
    patientId,
    encounterId: input.encounterId ?? null,
    answers: input.answers,
    submittedBy: input.submittedBy ?? null,
    createdAt: new Date().toISOString(),
  };
  memSubmissions.push(submission);
  return submission;
}

export async function listFormSubmissions(
  companyId: string,
  opts?: { templateId?: string; patientId?: string },
): Promise<FormSubmission[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("form_submissions").select("*").eq("company_id", companyId);
    if (opts?.templateId) q = q.eq("template_id", opts.templateId);
    if (opts?.patientId) q = q.eq("patient_id", opts.patientId);
    const { data } = await q.order("created_at", { ascending: false });
    return (data ?? []).map((r) => toSubmission(r as SubmissionRow));
  }
  return memSubmissions
    .filter(
      (s) =>
        s.companyId === companyId &&
        (!opts?.templateId || s.templateId === opts.templateId) &&
        (!opts?.patientId || s.patientId === opts.patientId),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
