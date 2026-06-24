/**
 * Pending registrations — bridge the gap between "checkout started" and the
 * Stripe webhook that confirms payment. The registration payload is parked here
 * keyed by an opaque token; the token travels in the Checkout Session metadata
 * and the webhook consumes it to provision the tenant.
 *
 * Env-gated (Supabase `pending_registrations` when configured, else in-memory).
 * On serverless, only the Supabase backend survives across the
 * checkout→webhook invocations, so production must have Supabase configured.
 */
import { getSupabase } from "../supabase";
import { generateSessionToken } from "../auth/codes";
import type { RegisterInput } from "../auth/store";

export interface Pending {
  token: string;
  plan: string;
  registration: RegisterInput;
}

const g = globalThis as unknown as { __abeccaPending?: Map<string, Pending> };
const mem = g.__abeccaPending ?? (g.__abeccaPending = new Map());

export async function savePending(
  plan: string,
  registration: RegisterInput,
): Promise<string> {
  const token = generateSessionToken();
  const sb = getSupabase();
  if (sb) {
    await sb.from("pending_registrations").insert({ token, plan, payload: registration });
  } else {
    mem.set(token, { token, plan, registration });
  }
  return token;
}

/** Atomically fetch-and-remove a pending registration (idempotent on re-delivery). */
export async function takePending(token: string): Promise<Pending | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("pending_registrations")
      .select("plan, payload")
      .eq("token", token)
      .maybeSingle();
    if (!data) return undefined;
    await sb.from("pending_registrations").delete().eq("token", token);
    return { token, plan: data.plan, registration: data.payload as RegisterInput };
  }
  const p = mem.get(token);
  if (p) mem.delete(token);
  return p;
}
