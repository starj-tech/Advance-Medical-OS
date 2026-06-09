import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { getEncounter, listDiagnoses } from "@/server/clinical/encounters";
import { checkPeserta, issueSep } from "@/server/bpjs/client";
import { latestSep, saveSep } from "@/server/bpjs/sep";

export const dynamic = "force-dynamic";

const today = () => new Date().toISOString().slice(0, 10);

async function primaryDiagnosis(companyId: string, encounterId: string) {
  const dx = await listDiagnoses(companyId, encounterId);
  if (dx.length === 0) return null;
  const d = dx.find((x) => x.rank === "primary") ?? dx[0];
  return { code: d.code, description: d.description };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("billing:read");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;
  const [sep, dx] = await Promise.all([
    latestSep(companyId, id),
    primaryDiagnosis(companyId, id),
  ]);
  return NextResponse.json({ sep: sep ?? null, primaryDiagnosis: dx });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("billing:manage");
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const companyId = guard.session.company.id;
  const encounter = await getEncounter(companyId, id);
  if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

  const body = await request.json();
  const noKartu = typeof body?.noKartu === "string" ? body.noKartu.replace(/\s/g, "") : "";
  if (!/^\d{10,16}$/.test(noKartu)) {
    return NextResponse.json({ error: "noKartu (10–16 digit) wajib diisi" }, { status: 400 });
  }
  const poli = typeof body?.poli === "string" && body.poli.trim() ? body.poli.trim() : (encounter.ward ?? "Umum");
  const tglSep = today();
  const dx = await primaryDiagnosis(companyId, id);

  // Eligibility check then SEP issuance (mock when BPJS_* unset).
  const peserta = await checkPeserta(noKartu, tglSep);
  const sep = await issueSep({ noKartu, tglSep, diagnosis: dx?.code ?? "", poli });

  const record = await saveSep(companyId, id, encounter.patientId, {
    noKartu,
    sepNumber: sep.sepNumber,
    diagnosis: dx ? `${dx.code} — ${dx.description}` : null,
    poli,
    pesertaNama: peserta.nama,
    pesertaKelas: peserta.kelas,
    pesertaStatus: peserta.status,
    isMock: sep.mock,
    createdBy: guard.session.user.id,
  });
  return NextResponse.json(record, { status: 201 });
}
