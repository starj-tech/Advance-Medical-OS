/**
 * Integrated clinical progress notes (CPPT / SOAP) — one note per author per
 * encounter, in Subjective/Objective/Assessment/Plan form. This is the legal
 * narrative record and a KARS accreditation requirement. Tenant-scoped by
 * company_id; env-gated (Supabase when configured, else in-memory singleton).
 */
import { getSupabase } from "../supabase";

export type NoteType = "cppt" | "soap" | "progress" | "nursing";

export interface ClinicalNote {
  id: string;
  companyId: string;
  encounterId: string;
  patientId: string;
  authorId: string | null;
  authorRole: string | null;
  noteType: NoteType;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  createdAt: string;
}

export interface AddNoteInput {
  patientId: string;
  authorId?: string | null;
  authorRole?: string | null;
  noteType?: NoteType;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
}

const g = globalThis as unknown as { __abeccaNotes?: ClinicalNote[] };
const mem = g.__abeccaNotes ?? (g.__abeccaNotes = []);

type Row = {
  id: string; company_id: string; encounter_id: string; patient_id: string;
  author_id: string | null; author_role: string | null; note_type: NoteType;
  subjective: string | null; objective: string | null; assessment: string | null;
  plan: string | null; created_at: string;
};
const toNote = (r: Row): ClinicalNote => ({
  id: r.id, companyId: r.company_id, encounterId: r.encounter_id, patientId: r.patient_id,
  authorId: r.author_id, authorRole: r.author_role, noteType: r.note_type,
  subjective: r.subjective, objective: r.objective, assessment: r.assessment,
  plan: r.plan, createdAt: r.created_at,
});

const NOTE_TYPES: NoteType[] = ["cppt", "soap", "progress", "nursing"];
const normType = (t?: NoteType): NoteType => (t && NOTE_TYPES.includes(t) ? t : "cppt");

export async function addNote(
  companyId: string,
  encounterId: string,
  input: AddNoteInput,
): Promise<ClinicalNote> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("clinical_notes")
      .insert({
        company_id: companyId,
        encounter_id: encounterId,
        patient_id: input.patientId,
        author_id: input.authorId ?? null,
        author_role: input.authorRole ?? null,
        note_type: normType(input.noteType),
        subjective: input.subjective ?? null,
        objective: input.objective ?? null,
        assessment: input.assessment ?? null,
        plan: input.plan ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "add note failed");
    return toNote(data as Row);
  }
  const note: ClinicalNote = {
    id: crypto.randomUUID(),
    companyId,
    encounterId,
    patientId: input.patientId,
    authorId: input.authorId ?? null,
    authorRole: input.authorRole ?? null,
    noteType: normType(input.noteType),
    subjective: input.subjective ?? null,
    objective: input.objective ?? null,
    assessment: input.assessment ?? null,
    plan: input.plan ?? null,
    createdAt: new Date().toISOString(),
  };
  mem.push(note);
  return note;
}

export async function listNotes(companyId: string, encounterId: string): Promise<ClinicalNote[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("clinical_notes")
      .select("*")
      .eq("company_id", companyId)
      .eq("encounter_id", encounterId)
      .order("created_at", { ascending: true });
    return (data ?? []).map((r) => toNote(r as Row));
  }
  return mem
    .filter((n) => n.companyId === companyId && n.encounterId === encounterId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
