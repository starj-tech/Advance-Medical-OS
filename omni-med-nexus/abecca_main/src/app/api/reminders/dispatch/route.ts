import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guard";
import { listDueFollowUps, setFollowUpStatus } from "@/server/clinical/follow-ups";
import { notify } from "@/server/notify/center";
import { sendWhatsApp } from "@/server/notify/channels";

export const dynamic = "force-dynamic";

const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * Dispatch the day's due recall reminders. Each fans out to the DPJP (in-app,
 * + WhatsApp if a patient phone is on file) and/or the patient (WhatsApp), then
 * is marked sent. Idempotent per reminder: once sent it leaves the due set.
 */
export async function POST() {
  const guard = await requirePermission("registration:write");
  if (guard.error) return guard.error;
  const companyId = guard.session.company.id;

  const due = await listDueFollowUps(companyId, today());
  for (const fu of due) {
    const title = "Pengingat kontrol ulang";
    const body = `Pasien ${fu.patientId} dijadwalkan kontrol ulang (${fu.dueDate}): ${fu.reason}`;
    if (fu.notifyUserId) {
      await notify({
        companyId,
        userId: fu.notifyUserId,
        title,
        body,
        type: "clinical",
        channels: fu.patientPhone ? ["inapp", "whatsapp"] : ["inapp"],
        phone: fu.patientPhone ?? undefined,
      });
    } else if (fu.patientPhone) {
      await sendWhatsApp(fu.patientPhone, `${title}\n${body}`);
    }
    await setFollowUpStatus(companyId, fu.id, "sent");
  }
  return NextResponse.json({ dispatched: due.length });
}
