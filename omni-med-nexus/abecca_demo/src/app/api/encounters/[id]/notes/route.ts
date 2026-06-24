import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { addNote, listNotes, type NoteType } from "@/server/clinical/notes";
import { getEncounter } from "@/server/clinical/encounters";
import { notify } from "@/server/notify/center";

export const dynamic = "force-dynamic";

const TYPES: NoteType[] = ["cppt", "soap", "progress", "nursing"];
const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("note:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  return NextResponse.json(await listNotes(guard.session.company.id, id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("note:write");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;
  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const body = await request.json();
  const subjective = str(body?.subjective);
  const objective = str(body?.objective);
  const assessment = str(body?.assessment);
  const plan = str(body?.plan);
  if (!subjective && !objective && !assessment && !plan) {
    return NextResponse.json(
      { error: "At least one SOAP field (subjective/objective/assessment/plan) is required" },
      { status: 400 },
    );
  }

  const note = await addNote(companyId, id, {
    patientId: encounter.patientId,
    authorId: guard.session.user.id,
    authorRole: guard.session.user.subRole ?? null,
    noteType: TYPES.includes(body?.noteType) ? body.noteType : "cppt",
    subjective, objective, assessment, plan,
  });

  // Notify the DPJP when a *different* PPA documents on their encounter.
  if (encounter.dpjpUserId && encounter.dpjpUserId !== guard.session.user.id) {
    await notify({
      companyId,
      userId: encounter.dpjpUserId,
      title: "Catatan CPPT baru",
      body: `${guard.session.user.fullName} menambahkan catatan pada pasien ${encounter.patientId}`,
      type: "clinical",
    });
  }
  return NextResponse.json(note, { status: 201 });
}
