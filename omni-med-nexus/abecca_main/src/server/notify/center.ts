/**
 * Notification center — one entry point (`notify`) that persists an in-app
 * notification and optionally fans out to email / WhatsApp. Tenant-scoped by
 * company_id; env-gated (Supabase `notifications` table or in-memory).
 */
import { getSupabase } from "../supabase";
import { sendEmail } from "../email/send";
import { sendWhatsApp } from "./channels";

export type NotificationType = "info" | "clinical" | "billing" | "system";
export type NotificationChannel = "inapp" | "email" | "whatsapp";

export interface Notification {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  readAt: string | null;
  createdAt: string;
}

const g = globalThis as unknown as { __abeccaNotifications?: Notification[] };
const mem = g.__abeccaNotifications ?? (g.__abeccaNotifications = []);

type Row = {
  id: string; company_id: string; user_id: string; title: string; body: string;
  type: NotificationType; read_at: string | null; created_at: string;
};
const toNotification = (r: Row): Notification => ({
  id: r.id, companyId: r.company_id, userId: r.user_id, title: r.title, body: r.body,
  type: r.type, readAt: r.read_at, createdAt: r.created_at,
});

async function createInApp(
  companyId: string, userId: string, title: string, body: string, type: NotificationType,
): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await sb.from("notifications").insert({ company_id: companyId, user_id: userId, title, body, type });
    return;
  }
  mem.push({
    id: crypto.randomUUID(), companyId, userId, title, body, type,
    readAt: null, createdAt: new Date().toISOString(),
  });
}

export async function listNotifications(companyId: string, userId: string): Promise<Notification[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("notifications")
      .select("*")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data ?? []).map((r) => toNotification(r as Row));
  }
  return mem
    .filter((n) => n.companyId === companyId && n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);
}

export async function markRead(
  companyId: string, userId: string, id?: string,
): Promise<void> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("notifications").update({ read_at: now })
      .eq("company_id", companyId).eq("user_id", userId).is("read_at", null);
    if (id) q = q.eq("id", id);
    await q;
    return;
  }
  for (const n of mem) {
    if (n.companyId === companyId && n.userId === userId && !n.readAt && (!id || n.id === id)) {
      n.readAt = now;
    }
  }
}

export interface NotifyInput {
  companyId: string;
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
  channels?: NotificationChannel[];
  email?: string;
  phone?: string;
}

/** Persist an in-app notification and fan out to any requested channels. */
export async function notify(input: NotifyInput): Promise<void> {
  const channels = input.channels ?? ["inapp"];
  await createInApp(input.companyId, input.userId, input.title, input.body, input.type ?? "info");
  if (channels.includes("email") && input.email) {
    await sendEmail({
      to: input.email,
      subject: input.title,
      html: `<p>${input.body}</p>`,
      text: input.body,
    });
  }
  if (channels.includes("whatsapp") && input.phone) {
    await sendWhatsApp(input.phone, `${input.title}\n${input.body}`);
  }
}
